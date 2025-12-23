import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, find_peaks
from scipy.interpolate import CubicSpline
from ahrs.filters import Madgwick
from ahrs.common.orientation import q2euler
import warnings

# Ignora warnings de divisão por zero em trechos muito curtos
warnings.filterwarnings("ignore")

class STSProcessor:
    def __init__(self, raw_data_list, peso, altura, idade, sexo):
        """
        raw_data_list: Lista de dicionários vinda do JSON/CSV.
        """
        self.raw_data = raw_data_list
        self.body_mass = float(peso)
        self.h = float(altura)
        self.idade = int(idade)
        self.sexo = str(sexo)
        self.fs = 60.0  # Hz fixo do sensor

    # --- Funções Auxiliares (Fidelidade ao Notebook) ---
    def _get_idx_30pc(self, t, y, idx1, idx2):
        y1, y2 = y[idx1], y[idx2]
        y_med = (y1 + y2) / 2
        amplitude = abs(y2 - y1)
        y_mais = y_med + 0.3 * amplitude
        y_menos = y_med - 0.3 * amplitude

        if idx1 < idx2:
            idx_range = np.arange(idx1, idx2 + 1)
        else:
            idx_range = np.arange(idx2, idx1 + 1)
        
        if len(idx_range) == 0: return idx1, idx2

        idx_v1 = idx_range[np.argmin(np.abs(y[idx_range] - y_menos))]
        idx_v2 = idx_range[np.argmin(np.abs(y[idx_range] - y_mais))]

        if idx_v1 > idx_v2:
            idx_v1, idx_v2 = idx_v2, idx_v1
        return idx_v1, idx_v2

    def _calc_vel_segmento(self, t, y, idx_ini, idx_fim):
        t_seg = t[idx_ini:idx_fim + 1]
        y_seg = y[idx_ini:idx_fim + 1]
        if len(t_seg) < 2: return 0.0
        vel, _ = np.polyfit(t_seg, y_seg, 1)
        return vel

    def classificar_30STS(self, sexo, idade, resultado):
        if sexo == "F":
            if 60 <= idade <= 64: media, sd = 15.4, 4.3
            elif 65 <= idade <= 69: media, sd = 13.5, 4.3
            elif 70 <= idade <= 74: media, sd = 12.9, 3.7
            elif 75 <= idade <= 79: media, sd = 12.5, 3.9
            elif 80 <= idade <= 84: media, sd = 10.3, 4.0
            elif 85 <= idade <= 89: media, sd = 8.0, 5.1
            elif 90 <= idade <= 94: media, sd = 6.0, 4.0
            else: return "Idade fora da faixa da tabela"
        else: # M
            if 60 <= idade <= 64: media, sd = 16.4, 3.3
            elif 65 <= idade <= 69: media, sd = 15.2, 4.5
            elif 70 <= idade <= 74: media, sd = 14.5, 4.2
            elif 75 <= idade <= 79: media, sd = 14.0, 4.3
            elif 80 <= idade <= 84: media, sd = 12.4, 3.9
            elif 85 <= idade <= 89: media, sd = 10.3, 4.0
            elif 90 <= idade <= 94: media, sd = 9.7, 6.8
            else: return "Idade fora da faixa da tabela"

        if resultado < media - sd: return "Abaixo da média"
        elif resultado > media + sd: return "Acima da média"
        else: return "Na média"

    def run(self):
        # ==========================================
        # 1. PARSING E AJUSTES AUTOMÁTICOS (CSV)
        # ==========================================
        dados_cel = pd.DataFrame(self.raw_data)
        
        # Mapeamento robusto de colunas
        col_map = {
            'timestamp': 'timestamp', 'time': 'timestamp', 'time_offset': 'timestamp',
            'accel_x': 'accX', 'accel_y': 'accY', 'accel_z': 'accZ',
            'gyro_x': 'gyrX', 'gyro_y': 'gyrY', 'gyro_z': 'gyrZ'
        }
        dados_cel = dados_cel.rename(columns=col_map)
        
        # A. Conversão de Timestamp (ISO String -> Float Segundos)
        if dados_cel['timestamp'].dtype == 'object':
            try:
                dados_cel['timestamp'] = pd.to_datetime(dados_cel['timestamp'])
                start_t = dados_cel['timestamp'].iloc[0]
                dados_cel['timestamp'] = (dados_cel['timestamp'] - start_t).dt.total_seconds()
            except:
                # Fallback se falhar conversão
                dados_cel['timestamp'] = np.arange(len(dados_cel)) / self.fs

        if not np.issubdtype(dados_cel['timestamp'].dtype, np.number):
             dados_cel['timestamp'] = np.arange(len(dados_cel)) / self.fs

        # ==========================================
        # 2. LÓGICA DO NOTEBOOK (Fidelidade Mantida)
        # ==========================================
        dt = 1 / self.fs
        
        # Preparação do Tempo
        Time_acc = dados_cel['timestamp'].values
        # Garante tempo relativo começando em 0
        if len(Time_acc) > 0:
            Time_acc = Time_acc - Time_acc[0]
        
        # Preparação da Aceleração
        acc = dados_cel[['accX', 'accY', 'accZ']].values
        
        # --- AJUSTE CRÍTICO DE UNIDADE ---
        # O notebook original faz `acc * 9.81` assumindo entrada em G.
        # Seu CSV está em m/s² (~9.8). Se multiplicarmos, vira ~96.
        # DIVIDIMOS aqui para que a multiplicação abaixo funcione corretamente.
        media_acc = np.mean(np.linalg.norm(acc, axis=1))
        if media_acc > 4.0: # Se a média vetorial for > 4, assumimos m/s²
            acc = acc / 9.81
            
        # Lógica Original: Converte G para m/s² e inverte Z
        acc = acc * 9.81
        acc[:, 2] *= -1 

        # Ordenação e Unique (Correção de glitches de tempo)
        Time_diff = np.insert(np.diff(Time_acc), 0, 0)
        Time_cumsum = np.cumsum(Time_diff)
        
        if not np.all(np.diff(Time_cumsum) > 0):
            u_idx = np.unique(Time_cumsum, return_index=True)[1]
            Time_cumsum = Time_cumsum[u_idx]
            acc = acc[u_idx]
            if 'gyrX' in dados_cel.columns:
                 gyr_raw = dados_cel[['gyrX', 'gyrY', 'gyrZ']].values
                 gyr_raw[:, 2] *= -1
                 gyr_raw = gyr_raw[u_idx]
            s_idx = np.argsort(Time_cumsum)
            Time_cumsum = Time_cumsum[s_idx]
            acc = acc[s_idx]
            if 'gyrX' in dados_cel.columns:
                gyr_raw = gyr_raw[s_idx]
        else:
             gyr_raw = dados_cel[['gyrX', 'gyrY', 'gyrZ']].values
             gyr_raw[:, 2] *= -1

        # Interpolação CubicSpline
        New_Time = np.arange(Time_cumsum.min(), Time_cumsum.max(), dt)
        acc_interp = np.zeros((len(New_Time), 3))
        gyr_interp = np.zeros((len(New_Time), 3))
        
        for i in range(3):
            acc_interp[:, i] = CubicSpline(Time_cumsum, acc[:, i])(New_Time)
            gyr_interp[:, i] = CubicSpline(Time_cumsum, gyr_raw[:, i])(New_Time)

        # Filtros Butterworth
        nyq = 0.5 * self.fs
        b_acc, a_acc = butter(4, 1.3/nyq, btype='low')
        b_gyr, a_gyr = butter(4, 10/nyq, btype='low')
        
        acc_filt = np.array([filtfilt(b_acc, a_acc, acc_interp[:, i]) for i in range(3)]).T
        gyr_filt = np.array([filtfilt(b_gyr, a_gyr, gyr_interp[:, i]) for i in range(3)]).T

        # Madgwick
        comp = Madgwick(acc=acc_filt, gyr=gyr_filt, frequency=self.fs)
        deg_angles = np.degrees(np.array([q2euler(q) for q in comp.Q]))
        deg_angles[:, 0] = deg_angles[:, 0] - np.mean(deg_angles[:, 0])

        # Detecção de Movimento (Picos/Vales Globais)
        media_ang = np.mean(deg_angles[:, 0])
        peaks, _ = find_peaks(deg_angles[:, 0], distance=30, height=media_ang+5)
        vales, _ = find_peaks(-deg_angles[:, 0], distance=30, height=-(media_ang-5))
        vales = [v for v in vales if v < len(deg_angles)-1]

        # Início (Vale-Pico-Vale)
        inicio_mov = 0
        for i in range(len(vales)-2):
            v1 = vales[i]
            for p in peaks:
                if v1 < p < vales[i+1]:
                    inicio_mov = v1; break
            if inicio_mov != 0: break
            
        tempo_fim = New_Time[inicio_mov] + 30.50
        fim_mov = np.argmin(np.abs(New_Time - tempo_fim))

        # Corte e Alinhamento
        t_corte = New_Time[inicio_mov:fim_mov+1]
        sinal_corte = deg_angles[inicio_mov:fim_mov+1, 0]
        sinal_aligned = sinal_corte - np.mean(sinal_corte)
        t_aligned = t_corte - t_corte[0] if len(t_corte) > 0 else []

        # Re-detecção no sinal cortado
        media_adj = np.mean(sinal_aligned)
        peaks_adj, _ = find_peaks(sinal_aligned, distance=30, height=media_adj+5)
        vales_adj, _ = find_peaks(-sinal_aligned, distance=30, height=-(media_adj-5))

        if len(vales_adj) > 0 and len(peaks_adj) > 0:
            if vales_adj[0] > peaks_adj[0]: vales_adj = np.insert(vales_adj, 0, 0)
            elif peaks_adj[0] < vales_adj[0]: peaks_adj = np.insert(peaks_adj, 0, 0)

        vales_final = [vales_adj[0]] if len(vales_adj) > 0 else []
        for i in range(len(peaks_adj)-1):
            s, e = peaks_adj[i], peaks_adj[i+1]
            if e > s+1:
                seq = sinal_aligned[s:e]
                if len(seq) > 0:
                    idx = np.argmin(seq) + s
                    if idx != vales_final[-1]: vales_final.append(idx)
        
        if len(peaks_adj) > 0 and peaks_adj[-1]+1 < len(sinal_aligned):
            seq = sinal_aligned[peaks_adj[-1]+1:]
            if len(seq) > 0:
                idx = np.argmin(seq) + peaks_adj[-1] + 1
                if 0 < idx < len(sinal_aligned)-1:
                    if sinal_aligned[idx] < sinal_aligned[idx-1] and sinal_aligned[idx] < sinal_aligned[idx+1]:
                        vales_final.append(idx)
        
        # Identificação de Ciclos
        ciclos = []
        iv, ip = 0, 0
        while True:
            if iv+2 >= len(vales_final) or ip+1 >= len(peaks_adj): break
            v1 = vales_final[iv]
            while ip < len(peaks_adj) and peaks_adj[ip] < v1: ip += 1
            if ip >= len(peaks_adj): break
            p1 = peaks_adj[ip]
            iv2 = iv + 1
            while iv2 < len(vales_final) and vales_final[iv2] < p1: iv2 += 1
            if iv2 >= len(vales_final): break
            v2 = vales_final[iv2]
            ip2 = ip + 1
            while ip2 < len(peaks_adj) and peaks_adj[ip2] < v2: ip2 += 1
            if ip2 >= len(peaks_adj): break
            p2 = peaks_adj[ip2]
            iv3 = iv2 + 1
            while iv3 < len(vales_final) and vales_final[iv3] < p2: iv3 += 1
            if iv3 >= len(vales_final): break
            v3 = vales_final[iv3]
            ciclos.append({'vales': [v1,v2,v3], 'picos': [p1,p2], 'ini': v1, 'fim': v3})
            iv = iv3; ip = ip2

        # Cálculo de Métricas (Output Completo)
        h_cad = 0.53 * self.h
        g = 9.81
        m = self.body_mass
        
        dados_excel = []
        tempos_totais = []

        for i, c in enumerate(ciclos):
            v1, p1, v2, p2, v3 = c['vales'][0], c['picos'][0], c['vales'][1], c['picos'][1], c['vales'][2]
            t_total = t_aligned[v3] - t_aligned[v1]
            t_lev = t_aligned[v2] - t_aligned[v1]
            t_sen = t_aligned[v3] - t_aligned[v2]
            tempos_totais.append(t_total)
            
            t_trans_pe = t_aligned[p1] - t_aligned[v1]
            t_trans_sen = t_aligned[p2] - t_aligned[v2]
            
            v_flex_lev = self._calc_vel_segmento(t_aligned, sinal_aligned, *self._get_idx_30pc(t_aligned, sinal_aligned, v1, p1))
            v_ext_lev = self._calc_vel_segmento(t_aligned, sinal_aligned, *self._get_idx_30pc(t_aligned, sinal_aligned, p1, v2))
            v_flex_sen = self._calc_vel_segmento(t_aligned, sinal_aligned, *self._get_idx_30pc(t_aligned, sinal_aligned, v2, p2))
            v_ext_sen = self._calc_vel_segmento(t_aligned, sinal_aligned, *self._get_idx_30pc(t_aligned, sinal_aligned, p2, v3))
            
            energia_ciclo = m * g * h_cad
            pot_ciclo = energia_ciclo / t_total if t_total > 0 else 0
            
            dados_excel.append({
                "Ciclo": i + 1,
                "Tempo total (s)": round(float(t_total), 2),
                "Tempo levantar (s)": round(float(t_lev), 2),
                "Tempo sentar (s)": round(float(t_sen), 2),
                "Frequência (Hz)": round(1/t_total, 2) if t_total > 0 else 0,
                "Transição em pé (s)": round(float(t_trans_pe), 2),
                "Transição sentado (s)": round(float(t_trans_sen), 2),
                "Vel. flexão levantar (°/s)": round(float(v_flex_lev), 2),
                "Vel. extensão levantar (°/s)": round(float(v_ext_lev), 2),
                "Vel. flexão sentar (°/s)": round(float(v_flex_sen), 2),
                "Vel. extensão sentar (°/s)": round(float(v_ext_sen), 2),
                "Tempo Pico 1 (s)": round(float(t_aligned[p1]), 2),
                "Tempo Pico 2 (s)": round(float(t_aligned[p2]), 2),
                "Valor Pico 1 (°)": round(float(sinal_aligned[p1]), 2),
                "Valor Pico 2 (°)": round(float(sinal_aligned[p2]), 2),
                "Potência média ciclo (J/s)": round(float(pot_ciclo), 2)
            })

        total_time_sum = sum(tempos_totais)
        reps = len(ciclos)
        mean_power_global = (m * g * h_cad * reps) / total_time_sum if total_time_sum > 0 else 0
        energia_total_global = m * g * h_cad * reps
        classificacao = self.classificar_30STS(self.sexo, self.idade, reps)

        timeseries_out = []
        for j in range(len(t_aligned)):
            timeseries_out.append({"t": float(t_aligned[j]), "val": float(sinal_aligned[j])})

        return {
            "status": "success",
            "metricas_globais": {
                "repeticoes": reps,
                "potencia_media_global": round(float(mean_power_global), 2),
                "energia_total": round(float(energia_total_global), 2),
                "tempo_total_acumulado": round(float(total_time_sum), 2),
                "classificacao": classificacao
            },
            "detalhes_ciclos": dados_excel,
            "timeseries_processada": timeseries_out
        }