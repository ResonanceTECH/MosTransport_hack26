from fastapi import FastAPI

app = FastAPI(title="ML Service Stub")

@app.get("/health/live")
async def health_live():
    return {"status": "ok"}

@app.get("/health/ready")
async def health_ready():
    return {"status": "ready"}

@app.get("/ml/v1/model/info")
async def model_info():
    return {
        "version": "stub-0.1.0",
        "trained_at": None,
        "wape": {"day": None, "month": None, "year": None},
        "features": [],
        "applicability": "Модель ещё не обучена. Это заглушка."
    }
