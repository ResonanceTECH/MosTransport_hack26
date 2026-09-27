FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# libgomp1: OpenMP runtime for LightGBM.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY SOLUTION/requirements.txt .
RUN pip install torch==2.14.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

COPY common /tmp/common
RUN pip install --no-cache-dir "/tmp/common[postgres]" && rm -rf /tmp/common

RUN useradd --create-home --uid 1000 app
COPY --chown=app:app SOLUTION/app/ app/
COPY --chown=app:app SOLUTION/model/ model/
USER app

ENV MODEL_PATH=/app/model/model.pkl \
    PORT=1020
EXPOSE 1020

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
    CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:1020/health', timeout=4).status == 200 else 1)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
