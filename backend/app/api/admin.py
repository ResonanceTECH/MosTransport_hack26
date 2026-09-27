"""Admin API - administrative endpoints."""

from fastapi import APIRouter, Request

router = APIRouter()


@router.post("/admin/recompute")
async def recompute_forecast(request: Request):
    """Trigger forecast recomputation (admin only)."""
    # TODO: Check admin role from JWT
    etl_client = request.app.state.etl_client
    result = await etl_client.precompute(request)
    return {"status": "triggered", "result": result}
