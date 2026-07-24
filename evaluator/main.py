import time
import urllib.request
import json
import os
import csv
from sklearn.metrics import classification_report, accuracy_score, f1_score, confusion_matrix
from collections import Counter

API_URL = "http://api:8000"

def evaluate():
    print("Evaluator: Waiting for API to be ready...")
    
    import glob
    csv_files = glob.glob("/app/data/*.csv")
    if not csv_files:
        raise FileNotFoundError("No CSV file found in /app/data")
    data_path = csv_files[0]  # Auto-detect any CSV provided by the judge
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
    
    start_time = time.time()
    
    for i, text in enumerate(X_eval):
        if i > 0 and i % 500 == 0:
            print(f"Evaluator: Scored {i}/{len(X_eval)}")
        
        try:
            req = urllib.request.Request(
                f"{API_URL}/predict",
                data=json.dumps({"text": text}).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    resp_data = json.loads(response.read().decode('utf-8'))
                    y_pred.append(resp_data.get("queue", "Unknown"))
                else:
                    y_pred.append("Unknown")
        except Exception:
            y_pred.append("Unknown")
            
    end_time = time.time()
    total_time = end_time - start_time
    # p95 estimate (rough calculation for reporting purposes)
    avg_latency_ms = (total_time / len(X_eval)) * 1000
    
    acc = accuracy_score(y_eval, y_pred)
    macro_f1 = f1_score(y_eval, y_pred, average="macro")
    report = classification_report(y_eval, y_pred, output_dict=True, zero_division=0)
    
    labels = list(c.keys())
    cm = confusion_matrix(y_eval, y_pred, labels=labels)
    
    metrics = {
        "n_eval_rows": len(X_eval),
        "baseline_majority_class": round(baseline_acc, 4),
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "avg_latency_ms": round(avg_latency_ms, 2),
        "per_class": {
            k: {"precision": round(v["precision"], 4), "recall": round(v["recall"], 4), "f1": round(v["f1-score"], 4)}
            for k, v in report.items() if isinstance(v, dict) and k not in ["accuracy", "macro avg", "weighted avg"]
        },
        "confusion_matrix": {
            "labels": labels,
            "matrix": cm.tolist()
        }
    }
    
    os.makedirs("/app/metrics", exist_ok=True)
    with open("/app/metrics/metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)
        
    print(f"Evaluator: Done. Macro-F1: {macro_f1:.4f}")

if __name__ == "__main__":
    evaluate()
