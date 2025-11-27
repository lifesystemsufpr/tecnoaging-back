import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, find_peaks
from scipy.interpolate import CubicSpline
from ahrs.filters import Madgwick
from ahrs.common.orientation import q2euler

class STSProcessor:
    def __init__(self, data_list, peso, altura, idade, sexo):
        """
        :param data_list: Lista de dicionários vinda do NestJS (JSON).
        :param peso: Peso em kg (float).
        :param altura: Altura em metros (float).
        :param idade: Idade em anos (int).
        :param sexo: 'M' ou 'F'.
        """
        self.raw_data = data_list
        self.body_mass = float(peso)
        self.h = float(altura)
        self.idade = int(idade)
        self.sexo = sexo
        self.fs = 60.0  # Frequência de amostragem padrão (Hz)

    # ==========================================
    # MÉTODOS AUXILIARES (Lógica Biomecânica)
    # ==========================================

    def get_idx_30pc(self, t, y, idx1, idx2):
        """
        Localiza os índices correspondentes a 30% da amplitude central 
        para cálculo de velocidade angular (slope).
        """
        y1, y2 = y[idx1], y[idx2]
        y_med = (y1 + y2) / 2
        delta = 0.3 * abs(y2 - y1)
        y_menos = y_med - delta
        y_mais = y_med + delta

        # Garante range crescente para busca e protege contra índices invertidos
        idx_min, idx_max = min(idx1, idx2), max(idx1, idx2)
        idx_range = np.arange(idx_min, idx_max + 1)
        
        if len(idx_range) == 0:
            return idx1, idx2

        # Encontra o índice mais próximo dos valores de corte
        idx_v1 = idx_range[np.argmin(np.abs(y[idx_range] - y_menos))]
        idx_v2 = idx_range[np.argmin(np.abs(y[idx_range] - y_mais))]

        # Retorna sempre na ordem temporal (inicio, fim) do segmento original
        if idx1 < idx2:
            return min(idx_v1, idx_v2), max(idx_v1, idx_v2)
        else:
            return max(idx_v1, idx_v2), min(idx_v1, idx_v2)

    def calc_vel_segmento(self, t, y, idx_ini, idx_fim):
        """
        Ajusta uma reta (regressão linear) ao trecho e retorna a inclinação (velocidade).
        """
        # Garante índices válidos e ordenados para o slice
        start, end = min(idx_ini, idx_fim), max(idx_ini, idx_fim)
        t_seg = t[start:end + 1]
        y_seg = y[start:end + 1]
        
        if len(t_seg) < 2:
            return 0.0
            
        vel, _ = np.polyfit(t_seg, y_seg, 1)
        return vel

    def classificar_30STS(self, sexo, idade, resultado):
        """Classifica o resultado baseado em tabelas normativas (Rikli & Jones)."""
        if sexo == "F":
            if 60 <= idade <= 64: media, sd = 15.4, 4.3
            elif 65 <= idade <= 69: media, sd = 13.5, 4.3
            elif 70 <= idade <= 74: media, sd = 12.9, 3.7
            elif 75 <= idade <= 79: media, sd = 12.5, 3.9
            elif 80 <= idade <= 84: media, sd = 10.3, 4.0
            elif 85 <= idade <= 89: media, sd = 8.0, 5.1
            elif 90 <= idade <= 94: media, sd = 6.0, 4.0
            else: return "Fora da faixa etária (60-94)"
        else: # Masculino
            if 60 <= idade <= 64: media, sd = 16.4, 3.3
            elif 65 <= idade <= 69: media, sd = 15.2, 4.5
            elif 70 <= idade <= 74: media, sd = 14.5, 4.2
            elif 75 <= idade <= 79: media, sd = 14.0, 4.3
            elif 80 <= idade <= 84: media, sd = 12.4, 3.9
            elif 85 <= idade <= 89: media, sd = 10.3, 4.0
            elif 90 <= idade <= 94: media, sd = 9.7, 6.8
            else: return "Fora da faixa etária (60-94)"

        if resultado < media - sd:
            return "Abaixo da média"
        elif resultado > media + sd:
            return "Acima da média"
        else:
            return "Na média"

    def run(self):
        # ========================================
        # 1. PREPARAÇÃO DE DADOS (JSON -> PANDAS)
        # ========================================
        dados_cel = pd.DataFrame(self.raw_data)

        # Mapeamento para garantir compatibilidade com lógica original
        mapa_colunas = {
            'timestamp': 'loggingSample(N)',
            'accel_x': 'accelerometerAccelerationX(G)',
            'accel_y': 'accelerometerAccelerationY(G)',
            'accel_z': 'accelerometerAccelerationZ(G)',
            'gyro_x': 'gyroRotationX(rad/s)',
            'gyro_y': 'gyroRotationY(rad/s)',
            'gyro_z': 'gyroRotationZ(rad/s)'
        }
        dados_cel = dados_cel.rename(columns=mapa_colunas)
        
        # Cria índice de amostra se não existir
        if 'loggingSample(N)' not in dados_cel.columns:
             dados_cel['loggingSample(N)'] = range(1, len(dados_cel) + 1)

        fs = self.fs 
        frame_cel = dados_cel['loggingSample(N)']
        # Tempo bruto estimado (será re-interpolado)
        tempo_cel = (frame_cel - 1) / fs

        # Extração de vetores e conversão de unidades (G -> m/s²)
        acc = dados_cel[['accelerometerAccelerationX(G)', 'accelerometerAccelerationY(G)', 'accelerometerAccelerationZ(G)']].to_numpy() * 9.81
        gyr = dados_cel[['gyroRotationX(rad/s)', 'gyroRotationY(rad/s)', 'gyroRotationZ(rad/s)']].to_numpy()

        # ========================================
        # 2. INTERPOLAÇÃO (CUBIC SPLINE)
        # ========================================
        dt = 1 / fs

        # --- Aceleração ---
        Time_acc = tempo_cel.values
        Signal_acc = acc
        # Inversão do eixo Z conforme script original
        Signal_acc[:, 2] *= -1 

        New_Time_acc = np.arange(Time_acc.min(), Time_acc.max(), dt)
        Signal_acc_interp = np.zeros((len(New_Time_acc), 3))
        for i in range(3):
            cs = CubicSpline(Time_acc, Signal_acc[:, i])
            Signal_acc_interp[:, i] = cs(New_Time_acc)

        # --- Giroscópio ---
        Time_gyr = tempo_cel.values
        Signal_gyr = gyr
        Signal_gyr[:, 2] *= -1

        New_Time_gyr = np.arange(Time_gyr.min(), Time_gyr.max(), dt)
        Signal_gyr_interp = np.zeros((len(New_Time_gyr), 3))
        for i in range(3):
            cs = CubicSpline(Time_gyr, Signal_gyr[:, i])
            Signal_gyr_interp[:, i] = cs(New_Time_gyr)

        # ========================================
        # 3. FILTRAGEM (BUTTERWORTH)
        # ========================================
        order = 4
        nyq = 0.5 * fs
        
        # Accel: Low-pass 1.3 Hz
        cutoff_acc = 1.3
        normal_cutoff_acc = cutoff_acc / nyq
        b_acc, a_acc = butter(order, normal_cutoff_acc, btype='low', analog=False)

        Signal_acc_filt = np.zeros_like(Signal_acc_interp)
        for i in range(3):
            Signal_acc_filt[:, i] = filtfilt(b_acc, a_acc, Signal_acc_interp[:, i])

        # Gyro: Low-pass 10 Hz
        cutoff_gyr = 10
        normal_cutoff_gyr = cutoff_gyr / nyq
        b_gyr, a_gyr = butter(order, normal_cutoff_gyr, btype='low', analog=False)

        Signal_gyr_filt = np.zeros_like(Signal_gyr_interp)
        for i in range(3):
            Signal_gyr_filt[:, i] = filtfilt(b_gyr, a_gyr, Signal_gyr_interp[:, i])

        # Ajuste de tamanhos após interpolação/filtro
        if Signal_acc_filt.shape[0] != Signal_gyr_filt.shape[0]:
            min_len = min(Signal_acc_filt.shape[0], Signal_gyr_filt.shape[0])
            Signal_acc_filt = Signal_acc_filt[:min_len]
            Signal_gyr_filt = Signal_gyr_filt[:min_len]
            New_Time_acc = New_Time_acc[:min_len]
        
        # ========================================
        # 4. ORIENTAÇÃO (MADGWICK & EULER)
        # ========================================
        comp = Madgwick(acc=Signal_acc_filt, gyr=Signal_gyr_filt, frequency=fs)
        Q = comp.Q  # quaternions
        quaternions = np.nan_to_num(Q)
        
        # Converte para Euler e depois para Graus
        euler_angles = np.array([q2euler(q) for q in quaternions])
        deg_angles = np.degrees(euler_angles)
        
        # Centraliza o sinal no eixo X (movimento principal)
        deg_angles[:, 0] = deg_angles[:, 0] - np.mean(deg_angles[:, 0])

        # ========================================
        # 5. DETECÇÃO DE PICOS E VALES
        # ========================================
        min_distance = 30  # frames
        media_angulo = np.mean(deg_angles[:, 0])

        # Picos (acima da média + 5)
        limite_pico = media_angulo + 5
        peaks, _ = find_peaks(deg_angles[:, 0], distance=min_distance)
        peaks = [p for p in peaks if deg_angles[p, 0] > limite_pico]

        # Vales (abaixo da média - 5)
        limite_vale = media_angulo - 5
        vales, _ = find_peaks(-deg_angles[:, 0], distance=min_distance)
        vales = [v for v in vales if deg_angles[v, 0] < limite_vale]
        vales = [v for v in vales if v < len(deg_angles[:, 0]) - 1]

        # --- Encontrar início do movimento (Padrão: Vale -> Pico -> Vale) ---
        inicio_mov = 0
        for i in range(len(vales) - 2):
            v1 = vales[i]
            for p in peaks:
                if v1 < p < vales[i + 1]:
                    inicio_mov = v1
                    break
            if inicio_mov != 0:
                break
        
        # Definir janela de 30 segundos
        tempo_inicio = New_Time_acc[inicio_mov] if inicio_mov < len(New_Time_acc) else New_Time_acc[0]
        tempo_fim = tempo_inicio + 30.50
        fim_mov = np.argmin(np.abs(New_Time_acc - tempo_fim))
        
        # Filtrar picos/vales dentro da janela
        peaks_mov = [p for p in peaks if inicio_mov <= p <= fim_mov]
        vales_mov = [v for v in vales if inicio_mov <= v <= fim_mov]

        # --- Correção fina de Vales (Vales mínimos locais entre picos) ---
        vales_corrigido = [vales_mov[0]] if len(vales_mov) > 0 else []
        for i in range(len(peaks_mov) - 1):
            start = peaks_mov[i]
            end = peaks_mov[i+1]
            if end > start + 1:
                seq = deg_angles[start:end, 0]
                if len(seq) > 0:
                    idx_min = np.argmin(seq) + start
                    if idx_min != vales_corrigido[-1]:
                        vales_corrigido.append(idx_min)
                        
        # Adicionar o último vale após o último pico
        if len(peaks_mov) > 0 and peaks_mov[-1] + 1 < len(deg_angles[:, 0]):
            seq = deg_angles[peaks_mov[-1]+1:fim_mov+1, 0]
            if len(seq) > 0:
                idx_min_final = np.argmin(seq) + peaks_mov[-1] + 1
                if (idx_min_final < len(deg_angles[:, 0]) - 1 and idx_min_final > 0):
                    vales_corrigido.append(idx_min_final)
        vales_mov = vales_corrigido

        # ========================================
        # 6. SEPARAÇÃO EM CICLOS
        # ========================================
        ciclos_celular = []
        i_vale = 0
        i_pico = 0
        
        peaks_local = peaks_mov
        vales_local = vales_mov

        while True:
            # Precisa de pelo menos 3 vales e 2 picos para fechar um ciclo completo (V-P-V-P-V)
            # Nota: O algoritmo original usa pares de V-P-V, mas o loop busca até V3 para definir ciclo
            if i_vale + 2 >= len(vales_local) or i_pico + 1 >= len(peaks_local):
                break
                
            v1 = vales_local[i_vale]
            
            while i_pico < len(peaks_local) and peaks_local[i_pico] < v1: i_pico += 1
            if i_pico >= len(peaks_local): break
            p1 = peaks_local[i_pico]
            
            i_vale2 = i_vale + 1
            while i_vale2 < len(vales_local) and vales_local[i_vale2] < p1: i_vale2 += 1
            if i_vale2 >= len(vales_local): break
            v2 = vales_local[i_vale2]
            
            i_pico2 = i_pico + 1
            while i_pico2 < len(peaks_local) and peaks_local[i_pico2] < v2: i_pico2 += 1
            if i_pico2 >= len(peaks_local): break
            p2 = peaks_local[i_pico2]
            
            i_vale3 = i_vale2 + 1
            while i_vale3 < len(vales_local) and vales_local[i_vale3] < p2: i_vale3 += 1
            if i_vale3 >= len(vales_local): break
            v3 = vales_local[i_vale3]
            
            ciclos_celular.append({
                'vales': [v1, v2, v3],
                'picos': [p1, p2],
                'inicio': v1,
                'fim': v3
            })
            # Avança índices
            i_vale = i_vale3
            i_pico = i_pico2

        # ========================================
        # 7. CÁLCULO DETALHADO (MÉTRICAS POR CICLO)
        # ========================================
        
        detalhes_ciclos = []
        
        t_global = New_Time_acc
        y_global = deg_angles[:, 0]
        
        # T_aligned serve para tempos relativos (0.0s no inicio da gravação)
        t_aligned = t_global - t_global[0] if len(t_global) > 0 else t_global

        tempo_total_movimento_somado = 0
        
        for i, ciclo in enumerate(ciclos_celular):
            v1, v2, v3 = ciclo['vales']
            p1, p2 = ciclo['picos']

            # --- Tempos ---
            t_inicio = t_aligned[v1]
            t_fim = t_aligned[v3]
            duracao_total = t_fim - t_inicio
            
            # Levantar (Vale 1 -> Vale 2)
            duracao_levantar = t_aligned[v2] - t_aligned[v1]
            # Sentar (Vale 2 -> Vale 3)
            duracao_sentar = t_aligned[v3] - t_aligned[v2]
            
            tempo_total_movimento_somado += duracao_total
            
            # Frequência
            freq_hz = 1 / duracao_total if duracao_total > 0 else 0

            # Transições (Notebook logic)
            transicao_em_pe = t_aligned[p1] - t_aligned[v1]
            transicao_sentado = t_aligned[p2] - t_aligned[v2]

            # --- Velocidades Angulares (Slope 30% central) ---
            # 1. Flexão Levantar
            idx_i, idx_f = self.get_idx_30pc(t_global, y_global, v1, p1)
            vel_flex_lev = self.calc_vel_segmento(t_global, y_global, idx_i, idx_f)
            
            # 2. Extensão Levantar
            idx_i, idx_f = self.get_idx_30pc(t_global, y_global, p1, v2)
            vel_ext_lev = self.calc_vel_segmento(t_global, y_global, idx_i, idx_f)
            
            # 3. Flexão Sentar
            idx_i, idx_f = self.get_idx_30pc(t_global, y_global, v2, p2)
            vel_flex_sen = self.calc_vel_segmento(t_global, y_global, idx_i, idx_f)
            
            # 4. Extensão Sentar
            idx_i, idx_f = self.get_idx_30pc(t_global, y_global, p2, v3)
            vel_ext_sen = self.calc_vel_segmento(t_global, y_global, idx_i, idx_f)

            # --- Amplitudes (Graus absolutos) ---
            amp_flex_lev = abs(y_global[v1] - y_global[p1])
            amp_ext_lev = abs(y_global[p1] - y_global[v2])
            amp_flex_sen = abs(y_global[v2] - y_global[p2])
            amp_ext_sen = abs(y_global[p2] - y_global[v3])
            
            # --- Picos (Valores e Tempos exatos) ---
            tempo_pico_1 = t_aligned[p1]
            valor_pico_1 = y_global[p1]
            tempo_pico_2 = t_aligned[p2]
            valor_pico_2 = y_global[p2]

            # --- Potência deste Ciclo ---
            # Potência = Trabalho / Tempo. Trabalho ~ massa * g * deslocamento
            h_cadeira = 0.53 * self.h
            potencia_ciclo = (self.body_mass * 9.81 * h_cadeira) / duracao_total if duracao_total > 0 else 0

            detalhes_ciclos.append({
                "ciclo_index": i + 1,
                
                # Tempos
                "duracao_total_s": round(float(duracao_total), 2),
                "duracao_levantar_s": round(float(duracao_levantar), 2),
                "duracao_sentar_s": round(float(duracao_sentar), 2),
                "frequencia_hz": round(float(freq_hz), 2),
                "transicao_em_pe_s": round(float(transicao_em_pe), 2),
                "transicao_sentado_s": round(float(transicao_sentado), 2),

                # Velocidades (°/s)
                "vel_flex_levantar": round(float(vel_flex_lev), 2),
                "vel_ext_levantar": round(float(vel_ext_lev), 2),
                "vel_flex_sentar": round(float(vel_flex_sen), 2),
                "vel_ext_sentar": round(float(vel_ext_sen), 2),
                
                # Amplitudes (°)
                "amp_flex_levantar": round(float(amp_flex_lev), 2),
                "amp_ext_levantar": round(float(amp_ext_lev), 2),
                "amp_flex_sentar": round(float(amp_flex_sen), 2),
                "amp_ext_sentar": round(float(amp_ext_sen), 2),

                # Picos (Para gráficos)
                "pico_1_tempo": round(float(tempo_pico_1), 2),
                "pico_1_valor": round(float(valor_pico_1), 2),
                "pico_2_tempo": round(float(tempo_pico_2), 2),
                "pico_2_valor": round(float(valor_pico_2), 2),

                # Potência
                "potencia_media_ciclo_w": round(float(potencia_ciclo), 2)
            })

        # ========================================
        # 8. CÁLCULO DE TOTAIS E CLASSIFICAÇÃO
        # ========================================
        repeticoes = len(ciclos_celular)
        g = 9.81
        h_cadeira = 0.53 * self.h
        
        mean_power = 0
        if tempo_total_movimento_somado > 0:
            mean_power = (self.body_mass * g * h_cadeira * repeticoes) / tempo_total_movimento_somado

        energia_total = self.body_mass * g * h_cadeira * repeticoes
        classificacao = self.classificar_30STS(self.sexo, self.idade, repeticoes)

        # ========================================
        # 9. MONTAGEM DA SÉRIE TEMPORAL PARA RETORNO
        # ========================================
        dados_filtrados_exportacao = []
        for i in range(len(New_Time_acc)):
            dados_filtrados_exportacao.append({
                "time_offset": float(New_Time_acc[i]),
                "accel_x": float(Signal_acc_filt[i, 0]),
                "accel_y": float(Signal_acc_filt[i, 1]),
                "accel_z": float(Signal_acc_filt[i, 2]),
                "gyro_x": float(Signal_gyr_filt[i, 0]),
                "gyro_y": float(Signal_gyr_filt[i, 1]),
                "gyro_z": float(Signal_gyr_filt[i, 2]),
                "angle_x": float(deg_angles[i, 0]) # Importante para plotar o movimento de flexão
            })

        # ========================================
        # 10. RETORNO FINAL
        # ========================================
        return {
            "status": "success",
            "timeseries_filtrada": dados_filtrados_exportacao,
            "metricas": {
                "num_repeticoes": repeticoes,
                "potencia_media_global": round(float(mean_power), 2),
                "energia_total": round(float(energia_total), 2),
                "classificacao": classificacao,
                "tempo_total_movimento": round(float(tempo_total_movimento_somado), 2)
            },
            "ciclos_detalhados": detalhes_ciclos
        }