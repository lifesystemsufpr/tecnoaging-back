import os
import warnings
import numpy as np
import pandas as pd
import joblib
from scipy.signal import butter, filtfilt, find_peaks
from scipy.interpolate import CubicSpline
from scipy.stats import skew, kurtosis

warnings.filterwarnings("ignore")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "2TMTS", "calibrador_global_SP2VC_features_stack.joblib")

_bundle_cache = None

def _load_bundle():
    global _bundle_cache
    if _bundle_cache is None:
        _bundle_cache = joblib.load(MODEL_PATH)
    return _bundle_cache


class MarchaProcessor:
    """
    Processes 2-minute step test (2TMTS/MARCHA) gyroscope data and predicts
    calibrated angular velocity peaks using the stacked ML model.

    raw_data_list: list of dicts with keys:
        timestamp  – ISO string or seconds (float)
        gyro_x     – rad/s
        gyro_y     – rad/s (optional)
        gyro_z     – rad/s (optional)
    """

    FS = 60.0
    DT = 1.0 / FS

    # Peak detection config (matches notebook defaults)
    PEAK_MODE    = "height"
    PEAK_HEIGHT  = 70.0     # deg/s
    PEAK_PROM    = 0.30
    MIN_DIST_S   = 0.5
    ALIGN_AXIS   = "X"
    WIN_S        = 0.12

    # Summary windows
    INI_T0, INI_T1 = 0.0,   20.0
    END_T0, END_T1 = 100.0, 120.0
    STRATEGY_THRESHOLD = 11.0

    def __init__(self, raw_data_list, corte_s=0.0):
        self.raw_data = raw_data_list
        self.corte_s  = float(corte_s)

    # ------------------------------------------------------------------
    # Signal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _lowpass(x, fs, fc=4.0, order=4):
        b, a = butter(order, fc / (fs / 2.0), "low")
        return filtfilt(b, a, x)

    @staticmethod
    def _resample_uniform(t, y, dt):
        t = np.asarray(t); y = np.asarray(y)
        if not np.all(np.diff(t) > 0):
            idx = np.unique(t, return_index=True)[1]
            t, y = t[idx], y[idx]
            srt = np.argsort(t); t, y = t[srt], y[srt]
        if t.size < 3:
            return np.array([]), np.array([])
        tn = np.arange(t.min(), t.max(), dt)
        if tn.size < 3:
            return np.array([]), np.array([])
        try:
            yn = CubicSpline(t, y)(tn)
        except Exception:
            return np.array([]), np.array([])
        return tn, yn

    @staticmethod
    def _peaks_generic(sig, fs, mode, height, prom, min_dist_s):
        if len(sig) < 10 or np.allclose(np.std(sig), 0.0):
            return np.array([], dtype=int)
        dist = max(1, int(round(min_dist_s * fs)))
        if mode == "prom":
            prominence = max(prom * np.std(sig), 1e-9)
            idx, _ = find_peaks(sig, distance=dist, prominence=prominence)
        else:
            idx, _ = find_peaks(sig, distance=dist, height=float(height))
        return idx

    @staticmethod
    def _parabolic_peak(t, y, i):
        i = int(i)
        if i <= 0 or i >= len(y) - 1:
            return float(t[i]), float(y[i])
        y0, y1, y2 = y[i - 1], y[i], y[i + 1]
        d = y0 - 2 * y1 + y2
        if d == 0:
            return float(t[i]), float(y1)
        delta = 0.5 * (y0 - y2) / d
        tpk = t[i] + delta * (t[i + 1] - t[i])
        ypk = y1 - 0.25 * (y0 - y2) * delta
        return float(tpk), float(ypk)

    @staticmethod
    def _sp_feats(seg, fs):
        x = np.asarray(seg).astype(float)
        L = len(x)
        dt = 1.0 / fs
        keys = [
            "f_peak_sp", "f_p95_sp", "f_p98_sp", "f_mean_sp", "f_std_sp",
            "f_rms_sp", "f_skew_sp", "f_kurt_sp", "f_width80_s", "f_slope_top",
            "f_cycle_dur_s", "f_cycle_freq_hz", "f_area_pos", "f_energy",
            "f_zc", "f_ratio_peak_med",
        ]
        if L < 5:
            return {k: np.nan for k in keys}
        peak = float(x.max())
        idx  = int(np.argmax(x))
        feats = dict(
            f_peak_sp=peak,
            f_p95_sp=float(np.percentile(x, 95)),
            f_p98_sp=float(np.percentile(x, 98)),
            f_mean_sp=float(np.mean(x)),
            f_std_sp=float(np.std(x)),
            f_rms_sp=float(np.sqrt(np.mean(x ** 2))),
            f_skew_sp=float(skew(x, bias=False)) if L > 3 else 0.0,
            f_kurt_sp=float(kurtosis(x, fisher=True, bias=False)) if L > 3 else 0.0,
            f_cycle_dur_s=float(L * dt),
            f_cycle_freq_hz=float(1.0 / (L * dt)) if L > 0 else np.nan,
            f_area_pos=float(np.sum(x[x > 0]) * dt),
            f_energy=float(np.sum(x ** 2) * dt),
            f_zc=int(np.where(np.diff(np.sign(x)) != 0)[0].size),
            f_ratio_peak_med=float(peak / (np.median(x) + 1e-9)),
        )
        thr   = 0.8 * peak
        above = np.where(x >= thr)[0]
        feats["f_width80_s"] = float((above[-1] - above[0]) * dt) if above.size > 1 else 0.0
        half  = int(round(0.04 * fs))
        a, b  = max(0, idx - half), min(L, idx + half + 1)
        t_loc = np.arange(b - a) * dt
        y_loc = x[a:b]
        feats["f_slope_top"] = float(np.polyfit(t_loc, y_loc, 1)[0]) if len(t_loc) > 1 else 0.0
        return feats

    @staticmethod
    def _predict_stack(bundle, Xrow):
        if isinstance(bundle, dict) and all(k in bundle for k in ["lin", "hgb", "meta"]):
            lin, hgb, meta = bundle["lin"], bundle["hgb"], bundle["meta"]
            Z = np.column_stack([
                lin.predict(Xrow).astype(float).ravel(),
                hgb.predict(Xrow).astype(float).ravel(),
            ])
            if bundle.get("target_mode") == "log":
                return np.expm1(meta.predict(Z)).astype(float)
            return meta.predict(Z).astype(float)
        if hasattr(bundle, "predict"):
            return bundle.predict(Xrow).astype(float)
        raise RuntimeError("Calibrador não reconhecido.")

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    def run(self):
        bundle     = _load_bundle()
        feat_cols  = bundle.get("feat_cols") if isinstance(bundle, dict) else None
        expects    = set(feat_cols) if feat_cols else None
        need_Y     = any(c.startswith("fY_") for c in expects) if expects else False
        need_Z     = any(c.startswith("fZ_") for c in expects) if expects else False
        need_XYZ   = (
            (need_Y or need_Z) or
            (expects and (
                "w_peak_phoneY_deg_s" in expects or
                "w_peak_phoneZ_deg_s" in expects
            ))
        ) if expects else False

        # ---- 1) Parse input ----
        df = pd.DataFrame(self.raw_data)

        col_map = {
            "gyroTimestamp_sinceReboot(s)": "ts",
            "timestamp": "ts",
            "gyroRotationX(rad/s)": "gx",
            "gyroRotationY(rad/s)": "gy",
            "gyroRotationZ(rad/s)": "gz",
            "gyro_x": "gx",
            "gyro_y": "gy",
            "gyro_z": "gz",
        }
        df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

        # Convert timestamp to seconds float
        if "ts" not in df.columns:
            raise ValueError("Timestamp column not found in input data.")
        if df["ts"].dtype == object:
            try:
                df["ts"] = pd.to_datetime(df["ts"])
                df["ts"] = (df["ts"] - df["ts"].iloc[0]).dt.total_seconds()
            except Exception:
                df["ts"] = np.arange(len(df)) / self.FS

        t_raw = df["ts"].values.astype(float)
        gx_raw = np.rad2deg(df["gx"].values.astype(float))

        have_Y = "gy" in df.columns
        have_Z = "gz" in df.columns
        gy_raw = np.rad2deg(df["gy"].values.astype(float)) if have_Y else None
        gz_raw = np.rad2deg(df["gz"].values.astype(float)) if have_Z else None

        # ---- 2) Resample to uniform grid ----
        tX, Xu = self._resample_uniform(t_raw, gx_raw, self.DT)
        if tX.size < 10:
            raise ValueError("Gyroscope X signal too short after resampling.")
        Xf = self._lowpass(Xu, self.FS)

        if have_Y and gy_raw is not None:
            tY, Yu = self._resample_uniform(t_raw, gy_raw, self.DT)
            Yf = self._lowpass(Yu, self.FS) if tY.size >= 10 else None
            have_Y = Yf is not None
        else:
            tY, Yf = tX, None

        if have_Z and gz_raw is not None:
            tZ, Zu = self._resample_uniform(t_raw, gz_raw, self.DT)
            Zf = self._lowpass(Zu, self.FS) if tZ.size >= 10 else None
            have_Z = Zf is not None
        else:
            tZ, Zf = tX, None

        # Align all axes to common time grid
        t0 = max(tX.min(), tY.min() if have_Y else tX.min(), tZ.min() if have_Z else tX.min())
        t1 = min(tX.max(), tY.max() if have_Y else tX.max(), tZ.max() if have_Z else tX.max())
        t  = np.arange(t0, t1, self.DT)

        X = np.interp(t, tX, Xf)
        Y = np.interp(t, tY, Yf) if have_Y else None
        Z = np.interp(t, tZ, Zf) if have_Z else None

        # Detection signal
        det_sig = X  # align_axis = X

        # ---- 3) Optional initial trim ----
        if self.corte_s > 0:
            mask = t >= (t[0] + self.corte_s)
            t, X, det_sig = t[mask], X[mask], det_sig[mask]
            if Y is not None: Y = Y[mask]
            if Z is not None: Z = Z[mask]
            if t.size < 10:
                raise ValueError(f"Signal too short after initial trim of {self.corte_s}s.")

        # ---- 4) First-pass peak detection to find time zero ----
        idx_full = self._peaks_generic(
            det_sig, self.FS, self.PEAK_MODE, self.PEAK_HEIGHT, self.PEAK_PROM, self.MIN_DIST_S
        )
        if idx_full.size == 0:
            raise ValueError("No peaks detected in the signal.")

        first_peak = int(idx_full[0])
        pre_win = int(round(2.0 * self.FS))
        a, b = max(0, first_peak - pre_win), first_peak
        local_offset = float(np.mean(det_sig[a:b])) if b > a else float(np.mean(det_sig[:first_peak]))

        zc_sig = det_sig - local_offset
        rising = np.where((zc_sig[:-1] <= 0) & (zc_sig[1:] > 0))[0]
        prev_rising = rising[rising < first_peak]
        if prev_rising.size > 0:
            zero_idx = int(prev_rising[-1] + 1)
        else:
            zero_idx = int(np.argmin(np.abs(zc_sig[:first_peak]))) if first_peak > 0 else 0

        t, X, det_sig = t[zero_idx:], X[zero_idx:], det_sig[zero_idx:]
        if Y is not None: Y = Y[zero_idx:]
        if Z is not None: Z = Z[zero_idx:]

        t_rel = t - t[0]

        # Limit to 120 s (2-minute step test)
        mask_120 = t_rel <= 120.0
        t_rel, X, det_sig = t_rel[mask_120], X[mask_120], det_sig[mask_120]
        if Y is not None: Y = Y[mask_120]
        if Z is not None: Z = Z[mask_120]

        # ---- 5) Final peak detection ----
        idx = self._peaks_generic(
            det_sig, self.FS, self.PEAK_MODE, self.PEAK_HEIGHT, self.PEAK_PROM, self.MIN_DIST_S
        )
        if idx.size == 0:
            raise ValueError("No peaks detected in 0–120 s window.")

        win = int(round(self.WIN_S * self.FS))

        # ---- 6) Per-peak feature extraction + prediction ----
        rows = []
        t_phone_peaks, y_phone_peaks = [], []
        t_pred_peaks,  y_pred_peaks  = [], []

        for k, i_p in enumerate(idx, start=1):
            s = max(i_p - win, 0)
            e = min(i_p + win + 1, len(t_rel))
            t_win = t_rel[s:e]
            Xw = X[s:e].astype(float)
            Yw = Y[s:e].astype(float) if Y is not None else None
            Zw = Z[s:e].astype(float) if Z is not None else None
            if len(Xw) < 5:
                continue

            tpk, ypk = self._parabolic_peak(t_rel, det_sig, i_p)
            t_phone_peaks.append(tpk)
            y_phone_peaks.append(ypk)

            _, ypk_x = self._parabolic_peak(t_win, Xw, int(np.argmax(Xw)))
            ypk_y = self._parabolic_peak(t_win, Yw, int(np.argmax(Yw)))[1] if Yw is not None else np.nan
            ypk_z = self._parabolic_peak(t_win, Zw, int(np.argmax(Zw)))[1] if Zw is not None else np.nan

            fX = {f"fX_{k2}": v for k2, v in self._sp_feats(Xw, self.FS).items()}
            if need_XYZ:
                fY = {f"fY_{k2}": v for k2, v in self._sp_feats(Yw if Yw is not None else np.zeros(3), self.FS).items()}
                fZ = {f"fZ_{k2}": v for k2, v in self._sp_feats(Zw if Zw is not None else np.zeros(3), self.FS).items()}
            else:
                fY, fZ = {}, {}

            feats = {}
            feats.update(fX); feats.update(fY); feats.update(fZ)
            feats["w_peak_phoneX_deg_s"] = float(ypk_x)
            if need_XYZ:
                feats["w_peak_phoneY_deg_s"] = float(ypk_y)
                feats["w_peak_phoneZ_deg_s"] = float(ypk_z)

            if feat_cols is not None:
                Xrow = np.array([[feats.get(c, np.nan) for c in feat_cols]], dtype=float)
            else:
                keys_sorted = sorted(feats.keys())
                Xrow = np.array([[feats[k] for k in keys_sorted]], dtype=float)

            y_pred = float(self._predict_stack(bundle, Xrow)[0])
            t_pred_peaks.append(tpk)
            y_pred_peaks.append(y_pred)

            rows.append({
                "pico": k,
                "t_pico_s": round(tpk, 4),
                "vel_bruta_deg_s": round(float(ypk), 2),
                "vel_phoneX_deg_s": round(float(ypk_x), 2),
                "vel_phoneY_deg_s": round(float(ypk_y), 2) if not np.isnan(ypk_y) else None,
                "vel_phoneZ_deg_s": round(float(ypk_z), 2) if not np.isnan(ypk_z) else None,
                "vel_calibrada_deg_s": round(y_pred, 2),
            })

        if not rows:
            raise ValueError("No valid cycles found after processing.")

        t_pred = np.array(t_pred_peaks)
        v_pred = np.array(y_pred_peaks)

        # ---- 7) Summary statistics ----
        mask_ini = (t_pred >= self.INI_T0) & (t_pred <= self.INI_T1)
        mask_end = (t_pred >= self.END_T0) & (t_pred <= self.END_T1)
        Vm_ini = float(np.mean(v_pred[mask_ini])) if np.any(mask_ini) else float("nan")
        Vm_end = float(np.mean(v_pred[mask_end])) if np.any(mask_end) else float("nan")

        delta_vm = (Vm_end - Vm_ini) if (not np.isnan(Vm_end) and not np.isnan(Vm_ini)) else float("nan")
        if np.isnan(delta_vm):
            strategy = "undefined"
        elif delta_vm > self.STRATEGY_THRESHOLD:
            strategy = "ascending"
        elif delta_vm < -self.STRATEGY_THRESHOLD:
            strategy = "descending"
        else:
            strategy = "constant"

        tA, tB = 10.0, 110.0
        slope = float((Vm_end - Vm_ini) / (tB - tA)) if (not np.isnan(Vm_ini) and not np.isnan(Vm_end)) else float("nan")

        N = int(v_pred.size)
        cadence    = round(N / 2.0, 2)
        Vm_total   = float(np.mean(v_pred))
        std_vel    = float(np.std(v_pred, ddof=0))
        cv_vel     = float(std_vel / (Vm_total + 1e-9))

        if t_pred.size >= 2:
            isi       = np.diff(t_pred)
            time_mean = float(np.mean(isi))
            time_std  = float(np.std(isi, ddof=0))
            cv_time   = float(time_std / (time_mean + 1e-9))
            time_max  = float(np.max(isi))
            time_min  = float(np.min(isi))
        else:
            time_mean = time_std = cv_time = time_max = time_min = float("nan")

        # Timeseries for rendering (detection axis)
        timeseries_out = [
            {"t": round(float(t_rel[j]), 4), "val": round(float(det_sig[j]), 4)}
            for j in range(len(t_rel))
        ]

        return {
            "status": "success",
            "metricas_globais": {
                "n_passos": N,
                "estrategia": strategy,
                "cadencia_ciclos_min": cadence,
                "vel_ini_deg_s": round(Vm_ini, 2) if not np.isnan(Vm_ini) else None,
                "vel_fim_deg_s": round(Vm_end, 2) if not np.isnan(Vm_end) else None,
                "delta_vel_deg_s": round(float(delta_vm), 2) if not np.isnan(delta_vm) else None,
                "slope_deg_s2": round(float(slope), 4) if not np.isnan(slope) else None,
                "vel_media_deg_s": round(Vm_total, 2),
                "vel_dp_deg_s": round(std_vel, 2),
                "cv_vel": round(cv_vel, 4),
                "vel_max_deg_s": round(float(np.max(v_pred)), 2),
                "vel_min_deg_s": round(float(np.min(v_pred)), 2),
                "tempo_medio_s": round(time_mean, 4) if not np.isnan(time_mean) else None,
                "tempo_dp_s": round(time_std, 4) if not np.isnan(time_std) else None,
                "cv_tempo": round(cv_time, 4) if not np.isnan(cv_time) else None,
                "tempo_max_s": round(time_max, 4) if not np.isnan(time_max) else None,
                "tempo_min_s": round(time_min, 4) if not np.isnan(time_min) else None,
            },
            "detalhes_picos": rows,
            "timeseries_processada": timeseries_out,
        }
