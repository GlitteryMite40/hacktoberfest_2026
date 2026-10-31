import logging
from fastapi import APIRouter, HTTPException
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/db", tags=["Database"])


@router.get("/status")
async def database_status():
    try:
        get_supabase().table("projects").select("id").limit(1).execute()
        return {
            "status": "connected",
            "database": "Supabase PostgreSQL",
            "table": "projects",
            "message": "Database connection successful",
        }
    except Exception as exc:
        logger.exception("Database health check failed.")
        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check backend configuration and logs."
        ) from exc
