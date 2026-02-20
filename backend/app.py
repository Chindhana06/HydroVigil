from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

# Local ML inference import
from inference import predict

app = FastAPI(title="HydroVigil ML Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    sensor_data: list[list[float]] = Field(..., min_length=1)


@app.get("/")
def home():
    return {"message": "HydroVigil Backend Running"}


@app.post("/predict")
def run_prediction(payload: PredictionRequest):
    """
    Expected JSON payload:
    {
        "sensor_data": [
            [f1, f2, f3, ...],
            [f1, f2, f3, ...],
            ...
        ]
    }
    """

    sensor_data = np.array(payload.sensor_data, dtype=float)
    if sensor_data.ndim != 2:
        raise HTTPException(status_code=422, detail="sensor_data must be a 2D numeric array.")

    if sensor_data.shape[0] < 2:
        raise HTTPException(status_code=422, detail="sensor_data must include at least 2 timesteps.")

    try:
        result = predict(sensor_data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return result
