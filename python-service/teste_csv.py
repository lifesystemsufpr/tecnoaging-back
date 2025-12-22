import pandas as pd
import requests
import json
import numpy as np

# CONFIGURAÇÕES
ARQUIVO_CSV = "/home/lucca/Downloads/30sSTS_João_Vitor_20251222_191221.csv"
URL_API = "http://localhost:8001/processar"

def enviar_teste():
    print(f"1. Lendo arquivo: {ARQUIVO_CSV}...")
    try:
        df = pd.read_csv(ARQUIVO_CSV)
    except FileNotFoundError:
        print("ERRO: Arquivo CSV não encontrado na pasta!")
        return

    # 2. PREPARAR DADOS PARA O JSON
    # O Pydantic da API espera 'timestamp' como float (segundos), não string ISO
    print("2. Convertendo timestamps e formatando...")
    
    # Converte string ISO para datetime
    df['timestamp_dt'] = pd.to_datetime(df['timestamp'])
    # Calcula segundos relativos ao início (0.0, 0.016, 0.032...)
    start_time = df['timestamp_dt'].iloc[0]
    df['segundos'] = (df['timestamp_dt'] - start_time).dt.total_seconds()

    # Monta a lista de objetos igual o seu frontend faria
    lista_dados = []
    for index, row in df.iterrows():
        lista_dados.append({
            "timestamp": float(row['segundos']),
            "accel_x": float(row['accel_x']),
            "accel_y": float(row['accel_y']),
            "accel_z": float(row['accel_z']),
            "gyro_x": float(row['gyro_x']),
            "gyro_y": float(row['gyro_y']),
            "gyro_z": float(row['gyro_z'])
        })

    # Payload completo
    payload = {
        "peso": 75.0,   # Pode alterar aqui se quiser
        "altura": 1.75,
        "idade": 30,
        "sexo": "M",
        "dados": lista_dados
    }

    # 3. ENVIAR PARA A API
    print(f"3. Enviando {len(lista_dados)} frames para {URL_API}...")
    try:
        response = requests.post(URL_API, json=payload)
        
        if response.status_code == 200:
            resultado = response.json()
            metrics = resultado['metricas_globais']
            print("\n✅ SUCESSO! RESPOSTA DA API:")
            print("="*40)
            print(f"Repetições:      {metrics['repeticoes']}")
            print(f"Potência Média:  {metrics['potencia_media_global']} W")
            print(f"Tempo Total:     {metrics['tempo_total_acumulado']} s")
            print(f"Classificação:   {metrics['classificacao']}")
            print("="*40)
            print(f"Detalhes do Ciclo 1 (Exemplo):")
            if len(resultado['detalhes_ciclos']) > 0:
                print(resultado['detalhes_ciclos'][0])
            else:
                print("Nenhum ciclo detectado.")
        else:
            print(f"\n❌ ERRO NA API ({response.status_code}):")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print(f"\n❌ ERRO: Não foi possível conectar em {URL_API}")
        print("Certifique-se que rodou: 'uvicorn main:app --reload --host 0.0.0.0 --port 8001'")

if __name__ == "__main__":
    enviar_teste()