import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, find_peaks
from scipy.interpolate import CubicSpline
from ahrs.filters import Madgwick
from ahrs.common.orientation import q2euler

class STSProcessor:
    def __init__(self, data_list, peso, altura, idade, sexo):
        # Recebe os dados da API (NestJS) em vez de ler CSV
        self.raw_data = data_list
        self.body_mass = peso
        self.h = altura
        self.idade = idade
        self.sexo = sexo
        self.fs = 60  # Hz

    def run(self):
        # ==================== #
        # ADAPTAÇÃO DE ENTRADA #
        # ==================== #
        # Transforma a lista de dicts do NestJS no DataFrame esperado pelo script original
        dados_cel = pd.DataFrame(self.raw_data)

        # Mapeia nomes curtos do JSON para os nomes longos do CSV original
        # para não precisar alterar o restante do script
        mapa_colunas = {
            'timestamp': 'loggingSample(N)',
            'accX': 'accelerometerAccelerationX(G)',
            'accY': 'accelerometerAccelerationY(G)',
            'accZ': 'accelerometerAccelerationZ(G)',
            'gyroX': 'gyroRotationX(rad/s)',
            'gyroY': 'gyroRotationY(rad/s)',
            'gyroZ': 'gyroRotationZ(rad/s)'
        }
        dados_cel = dados_cel.rename(columns=mapa_colunas)
        
        # Garante coluna de amostra se não vier do front
        if 'loggingSample(N)' not in dados_cel.columns:
             dados_cel['loggingSample(N)'] = range(1, len(dados_cel) + 1)

        fs = self.fs 

        # --- INICIO DO SCRIPT ORIGINAL (CÓPIA FIEL) ---

        # --- Dados do celular ---
        frame_cel = dados_cel['loggingSample(N)']
        tempo_cel = (frame_cel - 1) / fs

        # Aceleração e giroscópio
        acc = dados_cel[['accelerometerAccelerationX(G)', 'accelerometerAccelerationY(G)', 'accelerometerAccelerationZ(G)']].to_numpy() * 9.81
        gyr = dados_cel[['gyroRotationX(rad/s)', 'gyroRotationY(rad/s)', 'gyroRotationZ(rad/s)']].to_numpy() # removido .to_numpy solto do notebook, ajustado para executar

        # ========================================
        # Interpolação dos dados do celular (acc e gyr)
        # ========================================

        dt = 1 / fs

        # --- Aceleração ---
        # Adaptação: Usamos o vetor tempo calculado acima pois não temos "accelerometerTimestamp_sinceReboot(s)" no JSON padrão
        Time_acc = tempo_cel.values
        Signal_acc = acc
        Signal_acc[:, 2] *= -1

        # Lógica de interpolação original (simplificada pois os dados já vêm ordenados do banco)
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

        # --- Filtro Butterworth e plot comparativo para ACC e GYR (dados já interpolados) ---

        # Parâmetros do filtro
        order = 4
        cutoff = 1.3  # Hz
        nyq = 0.5 * fs
        normal_cutoff = cutoff / nyq
        b, a = butter(order, normal_cutoff, btype='low', analog=False)

        # Filtrar aceleração do CELULAR
        Signal_acc_filt = np.zeros_like(Signal_acc_interp)
        for i in range(3):
            Signal_acc_filt[:, i] = filtfilt(b, a, Signal_acc_interp[:, i])

        cutoff = 10  # Hz
        normal_cutoff = cutoff / nyq
        b, a = butter(order, normal_cutoff, btype='low', analog=False)

        # Filtrar giroscópio do CELULAR
        Signal_gyr_filt = np.zeros_like(Signal_gyr_interp)
        for i in range(3):
            Signal_gyr_filt[:, i] = filtfilt(b, a, Signal_gyr_interp[:, i])

        #================================================================================
        #  Confirmação e ajuste do tamanho dos dados de acc e gyro do celular
        #================================================================================

        # Verifica se os sinais interpolados têm o mesmo tamanho
        if Signal_acc_filt.shape[0] != Signal_gyr_filt.shape[0]:
            # print(f"ATENÇÃO: acc e gyro têm tamanhos diferentes.")
            min_len = min(Signal_acc_filt.shape[0], Signal_gyr_filt.shape[0])
            Signal_acc_filt = Signal_acc_filt[:min_len]
            Signal_gyr_filt = Signal_gyr_filt[:min_len]
            New_Time_acc = New_Time_acc[:min_len]
        
        #================================================================================
        #  Estimar orientação com filtro Madgwick (celular)
        #================================================================================
        comp = Madgwick(acc=Signal_acc_filt, gyr=Signal_gyr_filt, frequency=fs)
        Q = comp.Q  # quaternions

        #================================================================================
        # Transformar quaternions em ângulos em Graus
        #================================================================================
        quaternions = np.nan_to_num(Q)
        euler_angles = np.array([q2euler(q) for q in quaternions])
        deg_angles = np.degrees(euler_angles)
        deg_angles[:, 0] = deg_angles[:, 0] - np.mean(deg_angles[:, 0])

        ######################################################################################
        # --- Detecção de picos, vales, início e fim do movimento (SEM VALES FINAIS FANTASMAS) ---
        ######################################################################################
        min_distance = 30  # frames (ajuste conforme necessário)

        # Calcular a média dos valores do ângulo bruto (X)
        media_angulo = np.mean(deg_angles[:, 0])

        # Detectar picos (acima da média + 5)
        limite_pico = media_angulo + 5
        peaks, _ = find_peaks(deg_angles[:, 0], distance=min_distance)
        peaks = [p for p in peaks if deg_angles[p, 0] > limite_pico]

        # Detectar vales (abaixo da média - 5)
        limite_vale = media_angulo - 5
        vales, _ = find_peaks(-deg_angles[:, 0], distance=min_distance)
        vales = [v for v in vales if deg_angles[v, 0] < limite_vale]
        # Remover vales que estão no último índice do vetor
        vales = [v for v in vales if v < len(deg_angles[:, 0]) - 1]

        # --- Encontrar início do movimento (vale-pico-vale) ---
        inicio_mov = 0
        for i in range(len(vales) - 2):
            v1 = vales[i]
            for p in peaks:
                if v1 < p < vales[i + 1]:
                    inicio_mov = v1
                    # print(f"Início do movimento em: {tempo_cel[inicio_mov]:.2f}s")
                    break
            if inicio_mov != 0:
                break
        
        # Definir fim do movimento (30s após início)
        # Adaptação: Usando New_Time_acc pois tempo_cel pode ter tamanho diferente após interpolação
        tempo_inicio = New_Time_acc[inicio_mov] if inicio_mov < len(New_Time_acc) else New_Time_acc[0]
        tempo_fim = tempo_inicio + 30.50
        fim_mov = np.argmin(np.abs(New_Time_acc - tempo_fim))
        
        # Filtrar picos e vales apenas dentro do intervalo do movimento
        peaks_mov = [p for p in peaks if inicio_mov <= p <= fim_mov]
        vales_mov = [v for v in vales if inicio_mov <= v <= fim_mov]

        # --- Encontrar vales entre picos (sem filtrar pelo valor da média), preservando o primeiro vale ---
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
                if (
                    idx_min_final < len(deg_angles[:, 0]) - 1 and
                    idx_min_final > 0 and
                    deg_angles[idx_min_final, 0] < deg_angles[idx_min_final-1, 0] and
                    deg_angles[idx_min_final, 0] < deg_angles[idx_min_final+1, 0]
                ):
                    vales_corrigido.append(idx_min_final)
        vales_mov = vales_corrigido

        # Corte dos dados do celular
        tempo_cel_corte = New_Time_acc[inicio_mov:fim_mov+1]
        cel_aligned = deg_angles[inicio_mov:fim_mov+1, 0]
        cel_aligned = cel_aligned - np.mean(cel_aligned)
        
        if len(tempo_cel_corte) > 0:
            t_cel_aligned = tempo_cel_corte - tempo_cel_corte[0]
        else:
            t_cel_aligned = []

        # --- Separar o movimento em ciclos: vale-pico-vale-pico-vale para o Celular ---
        ciclos_celular = []
        i_vale = 0
        i_pico = 0
        
        # Usando listas locais para iteração
        peaks_local = peaks_mov
        vales_local = vales_mov

        while True:
            if i_vale + 2 >= len(vales_local) or i_pico + 1 >= len(peaks_local):
                break
            v1 = vales_local[i_vale]
            
            while i_pico < len(peaks_local) and peaks_local[i_pico] < v1:
                i_pico += 1
            if i_pico >= len(peaks_local): break
            p1 = peaks_local[i_pico]
            
            i_vale2 = i_vale + 1
            while i_vale2 < len(vales_local) and vales_local[i_vale2] < p1:
                i_vale2 += 1
            if i_vale2 >= len(vales_local): break
            v2 = vales_local[i_vale2]
            
            i_pico2 = i_pico + 1
            while i_pico2 < len(peaks_local) and peaks_local[i_pico2] < v2:
                i_pico2 += 1
            if i_pico2 >= len(peaks_local): break
            p2 = peaks_local[i_pico2]
            
            i_vale3 = i_vale2 + 1
            while i_vale3 < len(vales_local) and vales_local[i_vale3] < p2:
                i_vale3 += 1
            if i_vale3 >= len(vales_local): break
            v3 = vales_local[i_vale3]
            
            ciclos_celular.append({
                'vales': [v1, v2, v3],
                'picos': [p1, p2],
                'inicio': v1,
                'fim': v3
            })
            i_vale = i_vale3
            i_pico = i_pico2

        # === Potência média (30STS) com variáveis já existentes ===
        body_mass = self.body_mass
        h = self.h
        g = 9.81

        h_cadeira = 0.53 * h
        
        # Tempo total somado dos ciclos (Recalculando com base nos ciclos encontrados)
        tempo_total_ciclos = 0
        for c in ciclos_celular:
            if c['fim'] < len(New_Time_acc) and c['inicio'] < len(New_Time_acc):
                tempo_total_ciclos += (New_Time_acc[c['fim']] - New_Time_acc[c['inicio']])

        repeticoes = len(ciclos_celular)
        
        mean_power = 0
        if tempo_total_ciclos > 0:
            mean_power = (body_mass * g * h_cadeira * repeticoes) / tempo_total_ciclos

        energia_total = body_mass * g * h_cadeira * repeticoes
        
        # Classificação (Chamada da função auxiliar no final)
        classificacao = self.classificar_30STS(self.sexo, self.idade, repeticoes)


        # =================================== #
        # LÓGICA DE SAÍDA - INTEGRAÇÃO NESTJS #
        # =================================== #
        
        # Monta o array de objetos contendo os sinais JÁ INTERPOLADOS E FILTRADOS (Signal_acc_filt / Signal_gyr_filt)
        # Isso permite que o NestJS salve com filtered=true
        
        dados_filtrados_exportacao = []
        for i in range(len(New_Time_acc)):
            dados_filtrados_exportacao.append({
                "time_offset": float(New_Time_acc[i]), # Tempo relativo (0s, 0.016s...)
                "accel_x": float(Signal_acc_filt[i, 0]),
                "accel_y": float(Signal_acc_filt[i, 1]),
                "accel_z": float(Signal_acc_filt[i, 2]),
                "gyro_x": float(Signal_gyr_filt[i, 0]),
                "gyro_y": float(Signal_gyr_filt[i, 1]),
                "gyro_z": float(Signal_gyr_filt[i, 2])
            })

        # Retorna o Dicionário JSON
        return {
            "status": "success",
            # Dados da timeseries limpa para salvar no banco
            "timeseries_filtrada": dados_filtrados_exportacao,
            
            # Métricas calculadas (caso precise exibir no relatório)
            "metricas": {
                "num_repeticoes": repeticoes,
                "potencia_media": round(mean_power, 2),
                "energia_total": round(energia_total, 2),
                "classificacao": classificacao
            }
        }

    def classificar_30STS(self, sexo, idade, resultado):
        # Função de classificação original (Célula final do notebook)
        if sexo == "F":
            if 60 <= idade <= 64: media, sd = 15.4, 4.3
            elif 65 <= idade <= 69: media, sd = 13.5, 4.3
            elif 70 <= idade <= 74: media, sd = 12.9, 3.7
            elif 75 <= idade <= 79: media, sd = 12.5, 3.9
            elif 80 <= idade <= 84: media, sd = 10.3, 4.0
            elif 85 <= idade <= 89: media, sd = 8.0, 5.1
            elif 90 <= idade <= 94: media, sd = 6.0, 4.0
            else: return "Idade fora da faixa da tabela"
        else:
            if 60 <= idade <= 64: media, sd = 16.4, 3.3
            elif 65 <= idade <= 69: media, sd = 15.2, 4.5
            elif 70 <= idade <= 74: media, sd = 14.5, 4.2
            elif 75 <= idade <= 79: media, sd = 14.0, 4.3
            elif 80 <= idade <= 84: media, sd = 12.4, 3.9
            elif 85 <= idade <= 89: media, sd = 10.3, 4.0
            elif 90 <= idade <= 94: media, sd = 9.7, 6.8
            else: return "Idade fora da faixa da tabela"

        if resultado < media - sd:
            return "Abaixo da média"
        elif resultado > media + sd:
            return "Acima da média"
        else:
            return "Na média"