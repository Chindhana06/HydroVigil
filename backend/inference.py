import numpy as np
import joblib
from pathlib import Path

# Required for unpickling the scaler
from sklearn.preprocessing import StandardScaler

MODEL_BUNDLE_PATH = Path(__file__).resolve().parent / "model" / "deployment_bundle.pkl"
bundle = joblib.load(MODEL_BUNDLE_PATH)

scaler = bundle["scaler"]
T1 = bundle["T1"]
T2 = bundle["T2"]

mu = bundle["mahal_mu"]
cov_inv = bundle["mahal_cov_inv"]


def predict(sensor_data: np.ndarray):
    """
    sensor_data shape:
    (time_steps, num_features)
    """

    # Normalize using trained scaler
    X = scaler.transform(sensor_data)

    # Simple score (placeholder for full Transformer logic)
    score = float(np.mean(np.abs(X)))

    # Decision logic
    if score < T1:
        decision = "NORMAL"
        confidence = "LOW"
    elif score < T2:
        decision = "SUSPICIOUS"
        confidence = "MEDIUM"
    else:
        decision = "ATTACK"
        confidence = "HIGH"

    # Return dashboard-friendly output
    return {
        "final_decision": decision,
        "risk_score": int(min(score * 20, 100)),
        "mahal_score": round(score, 4),
        "confidence": confidence,
    }
