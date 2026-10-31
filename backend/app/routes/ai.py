from fastapi import APIRouter
from app.services.ai import ai_service

router = APIRouter(prefix="/api/llm", tags=["AI"])


@router.get("/status")
async def llm_status():
    models = ai_service.discover_models()
    return {
        "provider": "Google Gemini",
        "configured": ai_service.is_configured,
        "model": ai_service.active_model or (models[0] if models else "not_configured"),
        "candidates": models,
        "status": "ready" if ai_service.is_configured and models else "not_configured",
    }


@router.post("/status/recheck")
async def llm_recheck():
    models = ai_service.discover_models(force=True)
    return {
        "provider": "Google Gemini",
        "configured": ai_service.is_configured,
        "candidates": models,
        "status": "ready" if models else "unavailable",
    }


@router.post("/test")
async def llm_test():
    result = await ai_service.generate_json('Return JSON only: {"status":"ok"}')
    return {"status": "ready", "result": result, "model": ai_service.active_model}
