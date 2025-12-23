# Arquivo: main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import uvicorn
from processor import STSProcessor

app = FastAPI()

# Modelo de dados (Input)
class SensorData(BaseModel):
    # O timestamp é opcional, se vier o índice (0, 1, 2) o processor ajusta
    timestamp: Optional[float] = 0.0 
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float

class STSRequest(BaseModel):
    dados: List[SensorData]
    peso: float
    altura: float
    idade: int
    sexo: str

@app.post("/processar")
def processar_sts(req: STSRequest):
    try:
        # Converte o modelo Pydantic para lista de dicionários puros
        raw_data = [d.model_dump() for d in req.dados]
        
        # Instancia o processador
        processor = STSProcessor(
            raw_data_list=raw_data,
            peso=req.peso,
            altura=req.altura,
            idade=req.idade,
            sexo=req.sexo
        )
        
        # Roda a mágica
        resultado = processor.run()
        return resultado

    except Exception as e:
        # Mostra o erro no terminal para debug
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)