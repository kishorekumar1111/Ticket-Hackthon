import csv
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

def train():
    model_path = "/models/model.joblib"
    if os.path.exists(model_path):
        print("Trainer: Model already exists. Skipping training (Stretch Goal).")
        return

    data_path = "/app/data/dataset-tickets-multi-lang-4-20k.csv"
    texts, queues, priorities = [], [], []
    
    with open(data_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = f"{row.get('subject', '')} {row.get('body', '')}"
            texts.append(text)
            queues.append(row.get('queue', 'Unknown'))
            priorities.append(row.get('priority', 'Unknown'))
            
    # Split 80/20 in order (No shuffling)
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
    priority_pipeline.fit(X_train, y_priority_train)
    
    os.makedirs("/models", exist_ok=True)
    joblib.dump({
        'queue_model': queue_pipeline,
        'priority_model': priority_pipeline
    }, model_path)
    print(f"Trainer: Saved model to {model_path}")

if __name__ == "__main__":
    train()
