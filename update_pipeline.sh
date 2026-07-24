# Update Trainer
cat << 'TRAINER_REQ' > trainer/requirements.txt
scikit-learn
TRAINER_REQ

cat << 'TRAINER_DOCKER' > trainer/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
TRAINER_DOCKER

cat << 'TRAINER_PY' > trainer/main.py
import csv
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

def train():
    # Use the largest dataset we have available
    data_path = "/app/data/dataset-tickets-multi-lang-4-20k.csv"
    
    texts = []
    queues = []
    priorities = []
    
    # USING BUILT-IN CSV: Avoids 100MB Pandas dependency in the Docker image
    with open(data_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = f"{row.get('subject', '')} {row.get('body', '')}"
            texts.append(text)
            queues.append(row.get('queue', 'Unknown'))
            priorities.append(row.get('priority', 'Unknown'))
            
    # MANDATORY SPLIT RULE: First 80% = Training
    train_size = int(len(texts) * 0.8)
    X_train = texts[:train_size]
    y_queue_train = queues[:train_size]
    y_priority_train = priorities[:train_size]
    
    print(f"Trainer: Training on {len(X_train)} samples...")
    
    queue_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, stop_words='english')),
        ('clf', LogisticRegression(max_iter=1000, random_state=42))
    ])
    
    priority_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, stop_words='english')),
        ('clf', LogisticRegression(max_iter=1000, random_state=42))
    ])
    
    queue_pipeline.fit(X_train, y_queue_train)
    print("Trainer: Queue model trained.")
    
    priority_pipeline.fit(X_train, y_priority_train)
    print("Trainer: Priority model trained.")
    
    os.makedirs("/models", exist_ok=True)
    joblib.dump({
        'queue_model': queue_pipeline,
        'priority_model': priority_pipeline
    }, "/models/model.joblib")
    
    print("Trainer: Saved model to /models/model.joblib")

if __name__ == "__main__":
    train()
TRAINER_PY

# Update API
cat << 'API_REQ' > api/requirements.txt
fastapi
uvicorn
pydantic
scikit-learn
API_REQ

cat << 'API_PY' > api/main.py
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
    # HOSTILE INPUT HANDLING
    if not ticket.text or not ticket.text.strip():
        return {"queue": "Unknown", "priority": "Unknown", "confidence": 0.0}
        
    if not model_data:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
        
    try:
        q_model = model_data['queue_model']
        p_model = model_data['priority_model']
        
        q_pred = q_model.predict([ticket.text])[0]
        p_pred = p_model.predict([ticket.text])[0]
        
        # Get confidence of the queue prediction
        q_probs = q_model.predict_proba([ticket.text])[0]
        conf = max(q_probs)
        
        return {
            "queue": str(q_pred),
            "priority": str(p_pred),
            "confidence": round(float(conf), 4)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health(response: Response):
    # CONTRACT REQUIREMENT: /health reports unhealthy until the model is loaded
    if model_data is not None:
        return {"status": "ok", "model_loaded": True}
    
    response.status_code = 503
    return {"status": "not ok", "model_loaded": False}
API_PY

# Update Evaluator
cat << 'EVAL_REQ' > evaluator/requirements.txt
requests
scikit-learn
EVAL_REQ

cat << 'EVAL_PY' > evaluator/main.py
import time
import requests
import json
import os
import csv
from sklearn.metrics import classification_report, accuracy_score, f1_score
from collections import Counter

API_URL = "http://api:8000"

def evaluate():
    print("Evaluator: Waiting for API to start and load model...")
    max_retries = 30
    for _ in range(max_retries):
        try:
            r = requests.get(f"{API_URL}/health")
            if r.status_code == 200 and r.json().get("model_loaded"):
                print("Evaluator: API is ready!")
                break
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(2)
    else:
        print("Evaluator: API never became ready. Exiting.")
        return

    # MANDATORY SPLIT RULE: Evaluate on the LAST 20% ONLY
    data_path = "/app/data/dataset-tickets-multi-lang-4-20k.csv"
    texts = []
    true_queues = []
    
    with open(data_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = f"{row.get('subject', '')} {row.get('body', '')}"
            texts.append(text)
            true_queues.append(row.get('queue', 'Unknown'))
            
    eval_size = int(len(texts) * 0.2)
    X_eval = texts[-eval_size:]
    y_eval = true_queues[-eval_size:]
    
    c = Counter(y_eval)
    majority_class = c.most_common(1)[0][0]
    baseline_acc = c.most_common(1)[0][1] / len(y_eval)
    
    y_pred = []
    print(f"Evaluator: Scoring {len(X_eval)} tickets...")
    
    for i, text in enumerate(X_eval):
        if i > 0 and i % 500 == 0:
            print(f"Evaluator: Scored {i}/{len(X_eval)}")
        try:
            r = requests.post(f"{API_URL}/predict", json={"text": text})
            if r.status_code == 200:
                y_pred.append(r.json().get("queue", "Unknown"))
            else:
                y_pred.append("Unknown")
        except Exception:
            y_pred.append("Unknown")
            
    acc = accuracy_score(y_eval, y_pred)
    macro_f1 = f1_score(y_eval, y_pred, average="macro")
    report = classification_report(y_eval, y_pred, output_dict=True, zero_division=0)
    
    metrics = {
        "n_eval_rows": len(X_eval),
        "baseline_majority_class": round(baseline_acc, 4),
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": {
            k: {"precision": round(v["precision"], 4), "recall": round(v["recall"], 4), "f1": round(v["f1-score"], 4)}
            for k, v in report.items() if isinstance(v, dict) and k not in ["accuracy", "macro avg", "weighted avg"]
        }
    }
    
    os.makedirs("/app/metrics", exist_ok=True)
    with open("/app/metrics/metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)
        
    print(f"Evaluator: Done. Macro-F1: {macro_f1:.4f}")

if __name__ == "__main__":
    evaluate()
EVAL_PY

# Update Compose for healthchecks
cat << 'COMPOSE_YML' > docker-compose.yml
version: '3.8'

services:
  trainer:
    build: ./trainer
    volumes:
      - ./data:/app/data:ro
      - model_data:/models

  api:
    build: ./api
    ports:
      - "8000:8000"
    volumes:
      - model_data:/models:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 5s
      timeout: 3s
      retries: 5
    depends_on:
      trainer:
        condition: service_completed_successfully

  evaluator:
    build: ./evaluator
    volumes:
      - ./data:/app/data:ro
      - ./metrics:/app/metrics
    depends_on:
      api:
        condition: service_healthy

volumes:
  model_data:
COMPOSE_YML

bash update_pipeline.sh
