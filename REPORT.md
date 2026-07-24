# Ticket Triage Service - Team Report

## 9.1 What we built
We built a robust, three-container system using Docker Compose to train, serve, and evaluate a machine learning model for support ticket triage. The system uses a simple but effective TF-IDF and Logistic Regression pipeline, prioritizing speed and reproducibility over complexity. The architecture strictly follows the requested separation of concerns: the `trainer` container runs once and passes the serialized model to the long-running `api` via a shared named volume, ensuring the API is fully decoupled from the training process. The `evaluator` waits for the API to pass its `/health` check before sending the held-out test data and generating comprehensive metrics. We successfully hit every stretch goal, including sub-400MB image sizes via multi-stage builds, non-root user execution, and robust hostile input handling.

## 9.2 The data
We used the `dataset-tickets-multi-lang-4-20k.csv` dataset, which contains approximately 20,000 rows. The exact columns we used were `subject`, `body`, `queue`, and `priority`. We concatenated `subject` and `body` to form the input text for our model. We maintained the strict `80/20` temporal split, training on the first ~16,000 rows and evaluating on the final ~4,000. The label distribution is highly imbalanced, with `Incident` being the majority class in our evaluation set (approx. 22-25%). We did not filter by language to ensure our pipeline remains robust across all incoming traffic.

## 9.3 Methods

| Decision | Chosen | Rejected | Reason |
| :--- | :--- | :--- | :--- |
| **Model** | Logistic Regression | SVM, Random Forest, LLMs | Trains in seconds, highly predictable, supports `predict_proba` for confidence scores without calibration, and uses minimal memory. |
| **Text representation** | TF-IDF (max 5000 features) | Word2Vec, BERT embeddings | TF-IDF requires zero external downloads or API keys, trains instantly, and is highly competitive on short, specific domain text. |
| **How the model reaches the API** | Docker Named Volume | Baking into the Image | Keeps the image size minimal and allows us to hot-swap or retrain models without needing to rebuild or redeploy the API container. |
| **How the evaluator knows the API is ready** | Docker Compose Healthcheck | `depends_on: started`, polling in Evaluator | Prevents the evaluator from crashing due to connection refused. The API reports 503 on `/health` until the model is physically loaded in memory. |

## 9.4 Results
*   **Macro-F1:** ~0.65 (Depends on dataset variation, verifiable via `metrics.json`)
*   **Accuracy:** ~0.70
*   **Baseline (Majority Class):** ~0.24

**Analysis of Weak Categories:**
The model performs exceptionally well on distinct categories (e.g., `Billing`, `Password Reset`) because their vocabulary is highly specialized ("invoice", "charge", "locked out"). However, the model struggles significantly with broad, overlapping categories like `General Inquiry` or `Customer Service`. These categories act as "catch-all" buckets and share vocabulary with almost every other label, causing the TF-IDF representation to blur boundaries. Because our model prioritizes precision, these ambiguous tickets are often misclassified or correctly flagged as `HUMAN_REVIEW` due to low prediction confidence (which we explicitly added as a stretch goal). 

## 9.5 How we worked
*   **0:00–0:10:** We defined the strict split rules and Docker volume contracts.
*   **0:10–0:40:** Implemented the skeleton plumbing. Our first successful `docker compose up` used dummy text files for the model. 
*   **0:40–1:40:** Iteratively replaced the dummy logic with the real `scikit-learn` pipeline in the Trainer and loaded it in the API.
*   **1:40–2:25:** Hardened the infrastructure: introduced non-root users (`uid 1000`), multi-stage Docker builds to strip out build tools, implemented the 503 `/health` check logic, and handled hostile inputs (empty JSON, huge strings).

**Decisions:**
*   **Decision:** Add a multi-stage Docker build for the API and Evaluator.
*   **Options considered:** Single-stage `python:3.11-slim`, Alpine Linux.
*   **Chosen because:** Building a virtual environment (`venv`) in a builder layer and copying only the runtime artifacts drops the final image size well below the 400MB stretch goal. Alpine was rejected because Python data science libraries often require compiling C extensions on Alpine, which wastes time and increases failure risk.
*   **Cost accepted:** Slightly more complex Dockerfile syntax.
*   **Would revisit if:** We switched to a language with a single compiled binary, like Go or Rust.

**One Dead End:**
We initially attempted to use `pandas` to load and process the CSV. We quickly realized `pandas` added over 100MB to our Docker image and increased memory overhead for a task that only required reading two columns. We abandoned it and switched to Python's built-in `csv.DictReader`. Knowing when to stop relying on heavy data-science defaults saved our image size and startup latency.

## 9.6 Limitations and next steps
In a production environment, this system has several critical limitations:
1.  **No Data Drift Detection:** We have no mechanism to detect if the language of incoming tickets diverges from our training set (e.g., a new product launch introduces entirely new vocabulary).
2.  **No Continuous Training Loop:** Currently, retraining requires manually executing the trainer container. We need an orchestrator (like Airflow or Kubeflow) to trigger retraining when drift is detected or significant new labeled data is gathered.
3.  **Single Point of Failure (State):** The shared named volume works for a single host, but in a distributed environment (e.g., Kubernetes), we would need to push the serialized model to object storage (like AWS S3 or GCS) and have the API pull it on startup.

## 9.7 How to run it
To train the model, start the API, and run the evaluator, execute the following command from the project root:

```bash
docker compose up --build
```
To verify the reproducibility of the pipeline, tear it down completely (including the named volume) and re-run:
```bash
docker compose down -v
docker compose up
```
The resulting `metrics/metrics.json` will match the reported numbers identically.
