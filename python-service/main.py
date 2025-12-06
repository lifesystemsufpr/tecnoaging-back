from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from processor import STSProcessor

app = FastAPI()

# Modelo alinhado com o seu Schema Prisma (snake_case)
class SensorData(BaseModel):
    id: Optional[str] = None 
    timestamp: float 
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    # evaluationId e filtered não precisam vir para o python processar

class RequestBody(BaseModel):
    dados: List[SensorData]
    peso: float
    altura: float
    idade: int
    sexo: str 

@app.post("/processar")
def processar_sts(body: RequestBody):
    try:
        # Converte para lista de dicts
        raw_data = [d.dict() for d in body.dados]
        
        processor = STSProcessor(
            data_list=raw_data,
            peso=body.peso,
            altura=body.altura,
            idade=body.idade,
            sexo=body.sexo
        )
        
        resultado = processor.run()
        return resultado
        
    except Exception as e:
        print(f"Erro interno Python: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
