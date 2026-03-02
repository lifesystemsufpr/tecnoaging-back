import numpy as np
import pandas as pd
import joblib
import warnings
from scipy.signal import butter, filtfilt, find_peaks
from scipy.interpolate import CubicSpline
from scipy.stats import skew, kurtosis

warnings.filterwarnings("ignore")

class MarchaProcessor:
    def __init__(self, raw_data_list, sexo, idade, h_estatura, model_path="models/calibrador_global_SP2VC_features_stack.joblib"):
        self.df = pd.DataFrame(raw_data_list)
        self.sexo = sexo
        self.idade = idade
        self.h = h_estatura
        self.model_path = model_path
        self.fs = 60.0
        self.dt = 1/60

    def _lowpass(self, x, fc=4.0, order=4):
        nyq = 0.5 * self.fs
        b, a = butter(order, fc/nyq, "low")
        return filtfilt(b, a, x)

    def _resample_uniform(self, t, y):
        if not np.all(np.diff(t) > 0):
            idx = np.unique(t, return_index=True)[1]
            t, y = t[idx], y[idx]
            srt = np.argsort(t)
            t, y = t[srt], y[srt]
        tn = np.arange(t.min(), t.max(), self.dt)
        return tn, CubicSpline(t, y)(tn)

    def _extract_features(self, seg):
        x = np.asarray(seg).astype(float)
        L = len(x)
        if L < 5: return {}
        
        peak = float(x.max())
        return {
            "f_peak_sp": peak,
            "f_p95_sp": float(np.percentile(x, 95)),
            "f_p98_sp": float(np.percentile(x, 98)),
            "f_mean_sp": float(np.mean(x)),
            "f_std_sp": float(np.std(x)),
            "f_rms_sp": float(np.sqrt(np.mean(x**2))),
            "f_skew_sp": float(skew(x)) if L > 3 else 0.0,
            "f_kurt_sp": float(kurtosis(x)) if L > 3 else 0.0,
            "f_cycle_dur_s": float(L * self.dt),
            "f_area_pos": float(np.sum(x[x > 0]) * self.dt),
            "f_energy": float(np.sum(x**2) * self.dt)
        }

    def run(self):
        t_raw = self.df['timestamp'].values
        x_raw = self.df['gyro_x'].values # O script usa o eixo X para detecção
        
        t_uni, x_uni = self._resample_uniform(t_raw, x_raw)
        xf = self._lowpass(np.rad2deg(x_uni))
        
        peaks_idx, _ = find_peaks(xf, distance=int(0.5 * self.fs), height=70.0)
        
        bundle = joblib.load(self.model_path)
        feat_cols = bundle["feat_cols"]
        
        velocidades_preditas = []
        win_size = int(0.12 * self.fs)
        
        for p_idx in peaks_idx:
            s, e = max(0, p_idx - win_size), min(len(xf), p_idx + win_size + 1)
            seg = xf[s:e]
            if len(seg) < 5: continue
            
            f = self._extract_features(seg)
            f["w_peak_phoneX_deg_s"] = float(np.max(seg))
            
            x_row = np.array([[f.get(c, 0.0) for c in feat_cols]])
            
            pred_lin = bundle["lin"].predict(x_row)
            pred_hgb = bundle["hgb"].predict(x_row)
            meta_in = np.column_stack([pred_lin, pred_hgb])
            final_v = bundle["meta"].predict(meta_in)[0]
            velocidades_preditas.append(final_v)
            
        v_pred = np.array(velocidades_preditas)
        n = len(v_pred)
        if n == 0: return {"status": "error", "message": "Nenhum passo detectado"}

        # Cálculo de estratégia (Slope)
        v_ini = np.mean(v_pred[:int(n*0.2)]) if n > 5 else v_pred[0]
        v_end = np.mean(v_pred[-int(n*0.2):]) if n > 5 else v_pred[-1]
        delta = v_end - v_ini
        
        if delta > 11: strategy = "ascendente"
        elif delta < -11: strategy = "descendente"
        else: strategy = "constante"

        return {
            "status": "success",
            "metricas_marcha": {
                "total_passos": n,
                "cadencia_ppm": round(n / 2.0, 2), # Ciclos por minuto em 120s
                "estrategia": strategy,
                "velocidade_media": round(float(np.mean(v_pred)), 2),
                "velocidade_max": round(float(np.max(v_pred)), 2),
                "velocidade_min": round(float(np.min(v_pred)), 2),
                "variabilidade_vel": round(float(np.std(v_pred) / np.mean(v_pred)), 3)
            }
        }