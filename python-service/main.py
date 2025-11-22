from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from processor import STSProcessor

app = FastAPI()

# Deve bater com o que o NestJS envia no payload
class SensorData(BaseModel):
    accX: float
    accY: float
    accZ: float
    gyroX: float
    gyroY: float
    gyroZ: float
    timestamp: Optional[float] = 0 

class RequestBody(BaseModel):
    dados: List[SensorData]
    peso: float
    altura: float
    idade: int
    sexo: str 

@app.post("/processar")
def processar_sts(body: RequestBody):
    try:
        # converte a lista de objetos Pydantic para lista de dicionários que o pandas entende
        raw_data = [d.dict() for d in body.dados]
        
        # instancia a classe que contém a lógica do Notebook
        processor = STSProcessor(
            data_list=raw_data,
            peso=body.peso,
            altura=body.altura,
            idade=body.idade,
            sexo=body.sexo
        )
        
        # Executa o processamento
        resultado = processor.run()
        
        return resultado
        
    except Exception as e:
        print(f"Erro interno no processamento Python: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# comando pra rodar o serv:
# uvicorn main:app --reload --port 8000