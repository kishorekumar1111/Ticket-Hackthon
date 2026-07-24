from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
import joblib
import os

app = FastAPI()
model_data = None

class Ticket(BaseModel):
    text: str

@app.on_event("startup")
def load_model():
    global model_data
    model_path = "/models/model.joblib"
    if os.path.exists(model_path):
        model_data = joblib.load(model_path)
        print("API: Model loaded successfully.")
    else:
        print("API: WARNING - No model found!")

@app.post("/predict")
def predict(ticket: Ticket):
    if not model_data:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
        
    # Handle hostile inputs
    if not ticket.text or not isinstance(ticket.text, str) or not ticket.text.strip():
        return {"queue": "Unknown", "priority": "Unknown", "confidence": 0.0}
    
    if len(ticket.text) > 50000:
        return {"queue": "Error: Input too large", "priority": "Unknown", "confidence": 0.0}
        
    try:
        q_model = model_data['queue_model']
        p_model = model_data['priority_model']
        
        q_pred = q_model.predict([ticket.text])[0]
        p_pred = p_model.predict([ticket.text])[0]
        
        q_probs = q_model.predict_proba([ticket.text])[0]
        conf = max(q_probs)
        
        # Stretch goal: flag low confidence for human review
        if conf < 0.40:
            return {
                "queue": "HUMAN_REVIEW",
                "priority": "HUMAN_REVIEW",
                "confidence": round(float(conf), 4)
            }
            
        return {
            "queue": str(q_pred),
            "priority": str(p_pred),
            "confidence": round(float(conf), 4)
        }
    except Exception as e:
        return {"queue": "Error", "priority": "Error", "confidence": 0.0}

@app.get("/health")
def health(response: Response):
    if model_data is not None:
        return {"status": "ok", "model_loaded": True}
    response.status_code = 503
    return {"status": "not ok", "model_loaded": False}
