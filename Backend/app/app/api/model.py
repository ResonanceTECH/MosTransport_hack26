"""Model info API - proxy to ML service."""

import httpx
from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


@router.get("/model/info")
async def get_model_info(request: Request):
    """Get model version, WAPE, and applicability info."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            headers = {}
            request_id = getattr(request.state, "request_id", None)
            if request_id:
                headers["X-Request-ID"] = request_id

            response = await client.get(
                f"{settings.ML_SERVICE_URL}/ml/v1/model/info",
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            data["request_id"] = request_id
            return data
    except Exception:
        # Fallback stub
        return {
            "version": "stub-0.1.0",
            "trained_at": None,
            "wape": {"day": None, "month": None, "year": None},
            "features": [],
            "applicability": "Модель ещё не обучена. Это заглушка.",
            "request_id": getattr(request.state, "request_id", None),
        }
