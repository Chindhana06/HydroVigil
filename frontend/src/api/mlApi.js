const DEFAULT_API_BASE = "http://127.0.0.1:8000";
const ML_API_BASE = import.meta.env.VITE_ML_API_URL ?? DEFAULT_API_BASE;

export async function runMlPrediction(sensorWindow) {
  const response = await fetch(`${ML_API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sensor_data: sensorWindow }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`ML API request failed (${response.status}): ${details || "no details"}`);
  }

  const data = await response.json();
  if (!data || typeof data !== "object") {
    throw new Error("ML API returned an invalid JSON payload.");
  }

  return data;
}
