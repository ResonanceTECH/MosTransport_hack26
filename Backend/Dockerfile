FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY Backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY common /tmp/common
RUN pip install --no-cache-dir /tmp/common && rm -rf /tmp/common

COPY Backend/app ./app

RUN useradd --create-home --uid 10002 backend && chown -R backend:backend /app
USER backend

EXPOSE 1000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:1000/health/live', timeout=3).status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "1000"]
