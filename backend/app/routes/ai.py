from fastapi import APIRouter, HTTPException

from app.config import settings
from app.services.ai import AIServiceError, ai_service

router = APIRouter(prefix="/api/llm", tags=["AI"])


def _status_payload() -> dict:
    models = ai_service.discover_models()
    configured = ai_service.is_configured
    model_name = ai_service.active_model or (models[0] if models else "not_configured")
    return {
        "provider": "Google Gemma 4",
        "configured": configured,
        "key_present": configured,
        "test_call_success": ai_service.active_model is not None,
        "model": model_name,
        "model_name": model_name,
        "candidates": models,
        "status": (
            "ready" if ai_service.active_model is not None
            else "configured" if configured
            else "not_configured"
        ),
    }


@router.get("/status")
async def llm_status():
    return _status_payload()


@router.post("/status/recheck")
async def llm_recheck():
    return _status_payload()


@router.post("/test")
async def llm_test():
    try:
        result = await ai_service.generate_json('Return this exact JSON object: {"status":"ok"}')
        return {"status": "ready", "result": result, "model": ai_service.active_model}
    except AIServiceError as exc:
        raise HTTPException(status_code=503, detail=exc.args[0]) from exc
