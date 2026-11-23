FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /svc
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY worker.py ./
RUN useradd --create-home app
USER app
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--timeout", "30", "worker:app"]
