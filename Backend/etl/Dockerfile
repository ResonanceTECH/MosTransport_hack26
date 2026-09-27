FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY Backend/etl/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY common /tmp/common
RUN pip install --no-cache-dir /tmp/common && rm -rf /tmp/common

COPY Backend/etl/app ./app
COPY data ./data

RUN useradd --create-home --uid 10001 etl && chown -R etl:etl /app
USER etl

EXPOSE 1010
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:1010/health/live', timeout=3).status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "1010"]
