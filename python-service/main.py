from fastapi import FastAPI, HTTPException
from typing import Dict, Any
import uvicorn

app = FastAPI()

@app.post("/processar")
def processar_sts(payload: Dict[str, Any]):
  try:
    # ==============================
    # 🔥 AQUI COMEÇA O SCRIPT ORIGINAL
    # ==============================
    import os
    import json
    import numpy as np
    import pandas as pd
    from scipy.signal import butter, filtfilt, find_peaks
    from scipy.interpolate import CubicSpline
    from ahrs.filters import Madgwick
    from ahrs.common.orientation import q2euler

    # ======================================================================================
    # --- 1. CONFIGURAÇÕES INICIAIS E LEITURA DE DADOS ---
    # ======================================================================================
    output_dir = "F:/projects/ufpr"
    export_file=False
    sujeito = 'TesteApp - Python'
    fs = 60  # Hz
    data = payload

    # Extração automática dos dados do participante do arquivo JSON
    participant_info = data.get('participantInfo', {})
    idade = participant_info.get('age', 0)
    estatura = participant_info.get('height', 0.0)
    peso = participant_info.get('max', 0.0)

    # Converter o sexo para o formato "F" ou "M" esperado pela função de classificação
    sex_raw = participant_info.get('sex', 'MALE').upper()
    sexo = "F" if sex_raw == "FEMALE" else "M"

    dados_cel = pd.DataFrame(data['sensorData'])

    print(f"--- Dados do Participante ---")
    print(f"Idade: {idade} anos | Estatura: {estatura}m | Peso: {peso}kg | Sexo: {sexo}")
    print(f"Quantidade sensorData: {len(dados_cel)}")
    print("-----------------------------\n")

    # Converter timestamp e criar a variável de tempo absoluto em segundos (Time_acc)
    dados_cel['timestamp'] = pd.to_datetime(dados_cel['timestamp'], errors='coerce')
    Time_acc = (dados_cel['timestamp'] - dados_cel['timestamp'].iloc[0]).dt.total_seconds().values
    tempo_cel = Time_acc

    # ======================================================================================
    # --- 2. INTERPOLAÇÃO (CUBIC SPLINE) ---
    # ======================================================================================
    dt = 1 / fs

    # --- Aceleração ---
    # Usamos diretamente o Time_acc calculado acima
    Signal_acc = dados_cel[['accel_x', 'accel_y', 'accel_z']].values

    Time_diff_acc = np.insert(np.diff(Time_acc), 0, 0)
    Time_cumsum_acc = np.cumsum(Time_diff_acc)

    if not np.all(np.diff(Time_cumsum_acc) > 0):
      unique_indices = np.unique(Time_cumsum_acc, return_index=True)[1]
      Time_cumsum_acc = Time_cumsum_acc[unique_indices]
      Signal_acc = Signal_acc[unique_indices]
      sorted_indices = np.argsort(Time_cumsum_acc)
      Time_cumsum_acc = Time_cumsum_acc[sorted_indices]
      Signal_acc = Signal_acc[sorted_indices]

    New_Time_acc = np.arange(Time_cumsum_acc.min(), Time_cumsum_acc.max(), dt)
    Signal_acc_interp = np.zeros((len(New_Time_acc), 3))
    for i in range(3):
      cs = CubicSpline(Time_cumsum_acc, Signal_acc[:, i])
      Signal_acc_interp[:, i] = cs(New_Time_acc)

    # --- Giroscópio ---
    # O Giroscópio usa o mesmo vetor de tempo do JSON (Time_acc)
    Signal_gyr = dados_cel[["gyro_x", "gyro_y", "gyro_z"]].values

    Time_diff_gyr = np.insert(np.diff(Time_acc), 0, 0) # Usa o Time_acc base
    Time_cumsum_gyr = np.cumsum(Time_diff_gyr)

    if not np.all(np.diff(Time_cumsum_gyr) > 0):
      unique_indices = np.unique(Time_cumsum_gyr, return_index=True)[1]
      Time_cumsum_gyr = Time_cumsum_gyr[unique_indices]
      Signal_gyr = Signal_gyr[unique_indices]
      sorted_indices = np.argsort(Time_cumsum_gyr)
      Time_cumsum_gyr = Time_cumsum_gyr[sorted_indices]
      Signal_gyr = Signal_gyr[sorted_indices]

    New_Time_gyr = np.arange(Time_cumsum_gyr.min(), Time_cumsum_gyr.max(), dt)
    Signal_gyr_interp = np.zeros((len(New_Time_gyr), 3))
    for i in range(3):
      cs = CubicSpline(Time_cumsum_gyr, Signal_gyr[:, i])
      Signal_gyr_interp[:, i] = cs(New_Time_gyr)

      # ======================================================================================
      # --- 3. FILTRAGEM (BUTTERWORTH) ---
      # ======================================================================================
      order = 4
      cutoff = 5.0  # Hz
      nyq = 0.5 * fs
      normal_cutoff = cutoff / nyq
      b, a = butter(order, normal_cutoff, btype='low', analog=False)

      Signal_acc_filt = np.zeros_like(Signal_acc_interp)
      Signal_gyr_filt = np.zeros_like(Signal_gyr_interp)

      padlen = 3 * max(len(a), len(b))

      for i in range(3):
        acc_col = Signal_acc_interp[:, i]
        gyr_col = Signal_gyr_interp[:, i]

        if len(acc_col) > padlen:
          Signal_acc_filt[:, i] = filtfilt(b, a, acc_col)
        else:
          Signal_acc_filt[:, i] = acc_col

        if len(gyr_col) > padlen:
          Signal_gyr_filt[:, i] = filtfilt(b, a, gyr_col)
        else:
          Signal_gyr_filt[:, i] = gyr_col

    # ======================================================================================
    # --- 4. FUSÃO SENSORIAL (MADGWICK) ---
    # ======================================================================================
    if Signal_acc_filt.shape[0] != Signal_gyr_filt.shape[0]:
      min_len = min(Signal_acc_filt.shape[0], Signal_gyr_filt.shape[0])
      Signal_acc_filt = Signal_acc_filt[:min_len]
      Signal_gyr_filt = Signal_gyr_filt[:min_len]
      New_Time_acc = New_Time_acc[:min_len]

    comp = Madgwick(acc=Signal_acc_filt, gyr=Signal_gyr_filt, frequency=fs)
    Q = np.nan_to_num(comp.Q)

    valid = np.logical_not(np.all(Q == 0, axis=1))
    Q_valid = Q[valid]

    euler_angles = np.array([q2euler(q) for q in Q_valid])
    deg_angles = np.degrees(euler_angles)

    # Centralizar os sinais (Remoção da média)
    deg_angles[:, 0] -= np.mean(deg_angles[:, 0])
    deg_angles[:, 1] -= np.mean(deg_angles[:, 1])
    deg_angles[:, 2] -= np.mean(deg_angles[:, 2])

    # ======================================================================================
    # --- 5. DETECÇÃO DE PICOS E VALES (Corte de 30 Segundos) ---
    # ======================================================================================
    min_distance = 30
    media_angulo = np.mean(deg_angles[:, 0])

    peaks, _ = find_peaks(deg_angles[:, 0], distance=min_distance)
    peaks = [p for p in peaks if deg_angles[p, 0] > (media_angulo + 5)]

    vales, _ = find_peaks(-deg_angles[:, 0], distance=min_distance)
    vales = [v for v in vales if deg_angles[v, 0] < (media_angulo - 5) and v < len(deg_angles[:, 0]) - 1]

    # Encontrar início do movimento (vale-pico-vale)
    inicio_mov = 0
    for i in range(len(vales) - 2):
      v1 = vales[i]
      for p in peaks:
        if v1 < p < vales[i + 1]:
          inicio_mov = v1
          print(f"Início do movimento em: {tempo_cel[inicio_mov]:.2f}s (Index:{inicio_mov})")
          break
      if inicio_mov != 0:
        break

    # Definir fim do movimento (30s após início)
    tempo_fim = tempo_cel[inicio_mov] + 30.50
    fim_mov = np.argmin(np.abs(tempo_cel - tempo_fim))
    print(f"Fim do movimento em: {tempo_cel[fim_mov]:.2f}s (Index {fim_mov})")

    peaks_mov = [p for p in peaks if inicio_mov <= p <= fim_mov]
    vales_mov = [v for v in vales if inicio_mov <= v <= fim_mov]

    # Preservar o primeiro vale e corrigir vales entre picos
    vales_corrigido = [vales_mov[0]] if len(vales_mov) > 0 else []
    for i in range(len(peaks_mov) - 1):
      start, end = peaks_mov[i], peaks_mov[i+1]
      if end > start + 1:
        seq = deg_angles[start:end, 0]
        if len(seq) > 0:
          idx_min = np.argmin(seq) + start
          if idx_min != vales_corrigido[-1]:
            vales_corrigido.append(idx_min)

    if len(peaks_mov) > 0 and peaks_mov[-1] + 1 < len(deg_angles[:, 0]):
      seq = deg_angles[peaks_mov[-1]+1:fim_mov+1, 0]
      if len(seq) > 0:
        idx_min_final = np.argmin(seq) + peaks_mov[-1] + 1
        if (0 < idx_min_final < len(deg_angles[:, 0]) - 1 and
          deg_angles[idx_min_final, 0] < deg_angles[idx_min_final-1, 0] and
          deg_angles[idx_min_final, 0] < deg_angles[idx_min_final+1, 0]):
          vales_corrigido.append(idx_min_final)

    vales_mov = vales_corrigido

    if export_file == True:
      import plotly.graph_objects as go

      # ======================================================================================
      # --- 6. GRÁFICO (PLOTLY) ---
      # ======================================================================================
      fig = go.Figure()
      fig.add_trace(go.Scatter(x=tempo_cel, y=deg_angles[:, 0], mode='lines', name='Ângulo', line=dict(color='steelblue')))
      fig.add_trace(go.Scatter(x=tempo_cel[peaks_mov], y=deg_angles[peaks_mov, 0], mode='markers', name='Picos', marker=dict(color='red', size=10)))
      fig.add_trace(go.Scatter(x=tempo_cel[vales_mov], y=deg_angles[vales_mov, 0], mode='markers', name='Vales', marker=dict(color='green', size=10, symbol='diamond')))
      fig.add_vline(x=tempo_cel[inicio_mov], line_dash="dash", line_color="orange", annotation_text="Início")
      fig.add_vline(x=tempo_cel[fim_mov], line_dash="dash", line_color="orange", annotation_text="Fim")

      fig.update_layout(title='Análise de Movimento - Picos e Vales', xaxis_title='Tempo (s)', yaxis_title='Ângulo (°)', hovermode='x unified')

      # Vamos garantir que a pasta de destino exista
      os.makedirs(output_dir, exist_ok=True)

      # Salva o gráfico como um arquivo HTML interativo em vez de tentar abrir à força
      caminho_grafico = os.path.join(output_dir, f"grafico_{sujeito}.html")
      fig.write_html(caminho_grafico)
      print(f"Gráfico interativo gerado e salvo em: {caminho_grafico}")

    # ======================================================================================
    # --- 7. AJUSTE DO SINAL E EXTRAÇÃO DOS CICLOS ---
    # ======================================================================================
    tempo_cel_corte = tempo_cel[inicio_mov:fim_mov+1]
    angles_x_cel_corte = deg_angles[inicio_mov:fim_mov+1, 0]
    cel_aligned = angles_x_cel_corte - np.mean(angles_x_cel_corte)
    t_cel_aligned = np.array(tempo_cel_corte) - tempo_cel_corte[0]

    # Refazer picos/vales no sinal alinhado
    media_ajustado = np.mean(cel_aligned)
    peaks_al, _ = find_peaks(cel_aligned, distance=min_distance)
    peaks_al = [p for p in peaks_al if cel_aligned[p] > media_ajustado + 5]

    vales_al, _ = find_peaks(-cel_aligned, distance=min_distance)
    vales_al = [v for v in vales_al if cel_aligned[v] < media_ajustado - 5]

    if len(vales_al) > 0 and len(peaks_al) > 0:
      if vales_al[0] > peaks_al[0]: vales_al = [0] + vales_al
      elif peaks_al[0] < vales_al[0]: peaks_al = [0] + peaks_al

    vales_corrigido_al = [vales_al[0]] if len(vales_al) > 0 else []
    for i in range(len(peaks_al) - 1):
      start, end = peaks_al[i], peaks_al[i+1]
      if end > start + 1:
        seq = cel_aligned[start:end]
        if len(seq) > 0:
          idx_min = np.argmin(seq) + start
          if idx_min != vales_corrigido_al[-1]:
            vales_corrigido_al.append(idx_min)

    if len(peaks_al) > 0 and peaks_al[-1] + 1 < len(cel_aligned):
      seq = cel_aligned[peaks_al[-1]+1:]
      if len(seq) > 0:
        idx_min_final = np.argmin(seq) + peaks_al[-1] + 1
        if (0 < idx_min_final < len(cel_aligned) - 1 and
          cel_aligned[idx_min_final] < cel_aligned[idx_min_final-1] and
          cel_aligned[idx_min_final] < cel_aligned[idx_min_final+1]):
          vales_corrigido_al.append(idx_min_final)
    vales_al = vales_corrigido_al

    # Separar em ciclos (vale-pico-vale-pico-vale)
    ciclos_celular = []
    i_vale, i_pico = 0, 0
    while True:
      if i_vale + 2 >= len(vales_al) or i_pico + 1 >= len(peaks_al): break
      v1 = vales_al[i_vale]
      while i_pico < len(peaks_al) and peaks_al[i_pico] < v1: i_pico += 1
      if i_pico >= len(peaks_al): break
      p1 = peaks_al[i_pico]

      i_vale2 = i_vale + 1
      while i_vale2 < len(vales_al) and vales_al[i_vale2] < p1: i_vale2 += 1
      if i_vale2 >= len(vales_al): break
      v2 = vales_al[i_vale2]

      i_pico2 = i_pico + 1
      while i_pico2 < len(peaks_al) and peaks_al[i_pico2] < v2: i_pico2 += 1
      if i_pico2 >= len(peaks_al): break
      p2 = peaks_al[i_pico2]

      i_vale3 = i_vale2 + 1
      while i_vale3 < len(vales_al) and vales_al[i_vale3] < p2: i_vale3 += 1
      if i_vale3 >= len(vales_al): break
      v3 = vales_al[i_vale3]

      ciclos_celular.append({'vales': [v1, v2, v3], 'picos': [p1, p2], 'inicio': v1, 'fim': v3})
      i_vale, i_pico = i_vale3, i_pico2

    print(f"Total de ciclos Celular encontrados: {len(ciclos_celular)}")

    # ======================================================================================
    # --- 8. CÁLCULO DE MÉTRICAS BIOMECÂNICAS (Tempos, Amplitudes e Velocidades) ---
    # ======================================================================================
    def calcular_tempos_transicao_novo(ciclos, t_aligned):
      tempos_em_pe, tempos_sentado = [], []
      for ciclo in ciclos:
        if len(ciclo['vales']) < 3 or len(ciclo['picos']) < 2: continue
        v1, p1, v2, p2 = ciclo['vales'][0], ciclo['picos'][0], ciclo['vales'][1], ciclo['picos'][1]
        tempos_em_pe.append(t_aligned[p1] - t_aligned[v1])
        tempos_sentado.append(t_aligned[p2] - t_aligned[v2])
      return tempos_em_pe, tempos_sentado

    tempos_em_pe_cel, tempos_sentado_cel = calcular_tempos_transicao_novo(ciclos_celular, t_cel_aligned)

    tempos_ciclo_cel, tempos_levantar_cel, tempos_sentar_cel = [], [], []
    vel_flex_levantar_cel, vel_ext_levantar_cel = [], []
    vel_flex_sentar_cel, vel_ext_sentar_cel = [], []
    cel_pico1_val, cel_pico1_tempo, cel_pico2_val, cel_pico2_tempo = [], [], [], []

    for ciclo in ciclos_celular:
      t_ini, t_fim = t_cel_aligned[ciclo['inicio']], t_cel_aligned[ciclo['fim']]
      t_v1, t_v2, t_v3 = t_cel_aligned[ciclo['vales'][0]], t_cel_aligned[ciclo['vales'][1]], t_cel_aligned[ciclo['vales'][2]]
      tempo_total, tempo_levantar, tempo_sentar = (t_fim - t_ini), (t_v2 - t_v1), (t_v3 - t_v2)

      tempos_ciclo_cel.append(tempo_total)
      tempos_levantar_cel.append(tempo_levantar)
      tempos_sentar_cel.append(tempo_sentar)

      v1, p1, v2, p2, v3 = ciclo['vales'][0], ciclo['picos'][0], ciclo['vales'][1], ciclo['picos'][1], ciclo['vales'][2]
      flex_lev, ext_lev = abs(cel_aligned[v1] - cel_aligned[p1]), abs(cel_aligned[p1] - cel_aligned[v2])
      flex_sen, ext_sen = abs(cel_aligned[v2] - cel_aligned[p2]), abs(cel_aligned[p2] - cel_aligned[v3])

      vel_flex_levantar_cel.append(round(flex_lev / tempo_levantar if tempo_levantar != 0 else 0, 2))
      vel_ext_levantar_cel.append(round(ext_lev / tempo_levantar if tempo_levantar != 0 else 0, 2))
      vel_flex_sentar_cel.append(round(flex_sen / tempo_sentar if tempo_sentar != 0 else 0, 2))
      vel_ext_sentar_cel.append(round(ext_sen / tempo_sentar if tempo_sentar != 0 else 0, 2))

      cel_pico1_val.append(round(cel_aligned[p1], 2))
      cel_pico1_tempo.append(round(t_cel_aligned[p1], 2))
      cel_pico2_val.append(round(cel_aligned[p2], 2))
      cel_pico2_tempo.append(round(t_cel_aligned[p2], 2))

    hz_ciclos_cel = [round(1/t, 2) if t != 0 else 0 for t in tempos_ciclo_cel]

    # ======================================================================================
    # --- 9. POTÊNCIA, FORÇA E ENERGIA ---
    # ======================================================================================
    body_mass = peso      # kg (Variável extraída do JSON)
    h = estatura          # m  (Variável extraída do JSON)
    g = 9.81              # m/s²
    h_cadeira = 0.46      # m

    h_sentado = 0.53 * h
    h_deslocamento = h_sentado - h_cadeira

    tempo_total_ciclos = round(float(sum(tempos_ciclo_cel)), 2)
    repeticoes = len(ciclos_celular)

    if tempo_total_ciclos > 0:
      mean_power = (body_mass * 0.9 * g * h_deslocamento) / tempo_total_ciclos * 0.1
    else:
      mean_power = float('nan')

    forca_media = body_mass * 0.9 * g
    energia_total = body_mass * g * h_deslocamento * repeticoes
    energia_por_ciclo = body_mass * 0.9 * g * h_deslocamento
    potencia_por_ciclo = [energia_por_ciclo / t if t > 0 else float('nan') for t in tempos_ciclo_cel]

    print("\n===== RESULTADOS BIOMECÂNICOS =====")
    print(f"Tempo total somado dos ciclos: {tempo_total_ciclos:.2f} s")
    print(f"Repetições (n ciclos): {repeticoes}")
    print(f"Potência média global: {mean_power:.2f} J/s")
    print(f"Energia total: {energia_total:.2f} J")

    # ======================================================================================
    # --- 10. CLASSIFICAÇÃO E EXPORTAÇÃO JSON ---
    # ======================================================================================
    def classificar_30STS(sexo, idade, resultado):
      media, sd = 0, 0
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

      if resultado < media - sd: return "Abaixo da média"
      elif resultado > media + sd: return "Acima da média"
      else: return "Na média"

    classificacao = classificar_30STS(sexo, idade, repeticoes)
    print(f"Participante: {sexo}, {idade} anos, Resultado: {repeticoes} -> Classificação: {classificacao}")


    df_out = pd.DataFrame({
      "Ciclo": [i + 1 for i in range(repeticoes)],
      "Num ciclos Celular": [repeticoes] * repeticoes,
      "Tempo total Celular": tempos_ciclo_cel,
      "Tempo levantar Celular": tempos_levantar_cel,
      "Tempo sentar Celular": tempos_sentar_cel,
      "Frequência Celular": hz_ciclos_cel,
      "Transição em pé Celular": tempos_em_pe_cel,
      "Transição sentado Celular": tempos_sentado_cel,
      "Vel. flexão levantar Celular": vel_flex_levantar_cel,
      "Vel. extensão levantar Celular": vel_ext_levantar_cel,
      "Vel. flexão sentar Celular": vel_flex_sentar_cel,
      "Vel. extensão sentar Celular": vel_ext_sentar_cel,
      "Tempo Pico 1 Celular": cel_pico1_tempo,
      "Tempo Pico 2 Celular": cel_pico2_tempo,
      "Valor Pico 1 Celular": cel_pico1_val,
      "Valor Pico 2 Celular": cel_pico2_val,
      "Potência média ciclo (J/s)": potencia_por_ciclo,
      "Energia total (J)": [energia_total] * repeticoes,
      "Potência média global (J/s)": [mean_power] * repeticoes
    })


    timeseries_out = [
      {
        "t": float(t),
        "val": float(v)
      }
      for t, v in zip(t_cel_aligned, cel_aligned)
    ]

    media_potencia_por_ciclo = (
      sum(potencia_por_ciclo) / len(potencia_por_ciclo)
      if potencia_por_ciclo else 0
    )

    # ==============================
    # 🔥 RETORNO PADRÃO (TIPADO)
    # ==============================

    return {
      "status": "success",
      "metricas_globais": {
        "repeticoes": repeticoes,
        "potencia_media_global": media_potencia_por_ciclo,
        "energia_total": energia_total,
        "tempo_total_acumulado": float(tempo_cel[fim_mov] - tempo_cel[inicio_mov]),
        "classificacao": ""
      },
      "detalhes_ciclos": df_out.to_dict(orient='records'),
      "timeseries_processada": timeseries_out
    }

  except Exception as e:
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
  uvicorn.run(app, host="0.0.0.0", port=8001)
