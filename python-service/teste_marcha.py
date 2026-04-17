"""
Testa o endpoint /processar-marcha.

Uso:
  python teste_marcha.py                      # dados sintéticos
  python teste_marcha.py caminho/para/dado.csv  # CSV real do celular
"""

import sys
import json
import math
import numpy as np
import requests

URL_API = "http://localhost:8001/processar-marcha"


def gerar_dados_sinteticos(duracao_s=125, fs=60, freq_passo=1.0, amplitude_deg_s=120.0):
    """
    Simula ~125s de sinal de giroscópio de um teste de marcha no lugar.
    Gera senóides no eixo X com amplitude suficiente para disparar o detector (>70 deg/s).
    """
    import datetime
    n = int(duracao_s * fs)
    t = np.arange(n) / fs
    # Sinal: passos a ~1 Hz com amplitude 120 deg/s (em rad/s para enviar)
    gx_degs = amplitude_deg_s * np.abs(np.sin(2 * math.pi * freq_passo * t))
    # Pequeno ruído
    rng = np.random.default_rng(42)
    gx_degs += rng.normal(0, 3, size=n)
    gy_degs = 30.0 * np.abs(np.sin(2 * math.pi * freq_passo * t + 0.3)) + rng.normal(0, 2, size=n)
    gz_degs = 25.0 * np.abs(np.sin(2 * math.pi * freq_passo * t + 0.6)) + rng.normal(0, 2, size=n)

    base_ts = datetime.datetime(2025, 1, 1, 0, 0, 0)
    dados = []
    for i in range(n):
        ts = base_ts + datetime.timedelta(seconds=float(t[i]))
        dados.append({
            "timestamp": ts.isoformat(),
            "gyro_x": float(np.deg2rad(gx_degs[i])),
            "gyro_y": float(np.deg2rad(gy_degs[i])),
            "gyro_z": float(np.deg2rad(gz_degs[i])),
        })
    return dados


def carregar_csv(caminho):
    import pandas as pd

    df = pd.read_csv(caminho)

    # Suporta dois formatos:
    # 1) colunas do notebook: gyroTimestamp_sinceReboot(s), gyroRotationX(rad/s)...
    # 2) colunas do app:       timestamp, gyro_x, gyro_y, gyro_z
    col_map = {
        "gyroTimestamp_sinceReboot(s)": "timestamp",
        "gyroRotationX(rad/s)":         "gyro_x",
        "gyroRotationY(rad/s)":         "gyro_y",
        "gyroRotationZ(rad/s)":         "gyro_z",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    required = ["timestamp", "gyro_x"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Coluna obrigatória '{col}' não encontrada. Colunas disponíveis: {list(df.columns)}")

    dados = df[["timestamp", "gyro_x"] + [c for c in ["gyro_y", "gyro_z"] if c in df.columns]].to_dict(orient="records")
    return dados


def imprimir_resultado(resultado):
    g = resultado["metricas_globais"]
    print("\n✅ SUCESSO! RESPOSTA DA API:")
    print("=" * 50)
    print(f"  N° de passos:         {g['n_passos']}")
    print(f"  Estratégia:           {g['estrategia']}")
    print(f"  Cadência (ciclos/min):{g['cadencia_ciclos_min']}")
    print(f"  Vel. média (°/s):     {g['vel_media_deg_s']}")
    print(f"  Vel. DP (°/s):        {g['vel_dp_deg_s']}")
    print(f"  CV velocidade:        {g['cv_vel']:.4f}")
    print(f"  Vel. máx (°/s):       {g['vel_max_deg_s']}")
    print(f"  Vel. mín (°/s):       {g['vel_min_deg_s']}")
    print(f"  Vel. ini 0-20s (°/s): {g['vel_ini_deg_s']}")
    print(f"  Vel. fim 100-120s:    {g['vel_fim_deg_s']}")
    print(f"  Slope (°/s²):         {g['slope_deg_s2']}")
    print(f"  Tempo médio passo(s): {g['tempo_medio_s']}")
    print(f"  CV tempo:             {g['cv_tempo']}")
    print("=" * 50)
    picos = resultado.get("detalhes_picos", [])
    print(f"  Primeiros 5 picos:")
    for p in picos[:5]:
        print(f"    pico {p['pico']:>3}  t={p['t_pico_s']:.2f}s  "
              f"bruto={p['vel_bruta_deg_s']:.1f}°/s  "
              f"calibrado={p['vel_calibrada_deg_s']:.1f}°/s")
    ts = resultado.get("timeseries_processada", [])
    print(f"  Timeseries: {len(ts)} pontos")


def main():
    if len(sys.argv) > 1:
        caminho = sys.argv[1]
        print(f"1. Lendo CSV: {caminho} ...")
        try:
            dados = carregar_csv(caminho)
        except FileNotFoundError:
            print(f"❌ Arquivo não encontrado: {caminho}")
            return
        except ValueError as e:
            print(f"❌ Erro no CSV: {e}")
            return
    else:
        print("1. Gerando dados sintéticos (~125s, 1 Hz, 120 °/s) ...")
        dados = gerar_dados_sinteticos()

    print(f"   {len(dados)} frames preparados.")
    payload = {"sensorData": dados, "corte_s": 0}

    print(f"2. Enviando para {URL_API} ...")
    try:
        response = requests.post(URL_API, json=payload, timeout=60)
        if response.status_code == 200:
            imprimir_resultado(response.json())
        else:
            print(f"\n❌ ERRO NA API ({response.status_code}):")
            print(response.text)
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Não foi possível conectar em {URL_API}")
        print("   Suba o servidor primeiro:")
        print("   cd python-service && uvicorn main:app --reload --port 8001")


if __name__ == "__main__":
    main()
