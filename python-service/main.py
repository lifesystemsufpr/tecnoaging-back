from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import uvicorn
from processor import STSProcessor
from marcha_processor import MarchaProcessor

app = FastAPI()

class SensorData(BaseModel):
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

class MarchaRequest(BaseModel):
    dados: List[SensorData]
    sexo: str
    idade: int
    altura: float

@app.post("/processar")
def processar_sts(req: STSRequest):
    try:
        raw_data = [d.model_dump() for d in req.dados]
        
        processor = STSProcessor(
            raw_data_list=raw_data,
            peso=req.peso,
            altura=req.altura,
            idade=req.idade,
            sexo=req.sexo
        )
        
        resultado = processor.run()
        return resultado

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/processar-marcha")
def processar_marcha(req: MarchaRequest):
    try:
        raw_data = [d.model_dump() for d in req.dados]
        
        processor = MarchaProcessor(
            raw_data_list=raw_data,
            sexo=req.sexo,
            idade=req.idade,
            h_estatura=req.altura
        )
        
        return processor.run()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)