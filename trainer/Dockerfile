FROM python:3.11.8-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11.8-slim
RUN groupadd -g 1000 appuser && useradd -r -u 1000 -g appuser appuser
RUN mkdir -p /models && chown appuser:appuser /models
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY . .
RUN chown -R appuser:appuser /app
USER appuser
CMD ["python", "main.py"]
