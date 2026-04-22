FROM python:3.11-slim

WORKDIR /app

# pg_dump per i backup automatici del database
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Directory per upload certificati medici e backup DB
RUN mkdir -p /app/uploads/medical_certs /app/uploads/backups

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
