import logging
from supabase import Client, create_client
from app.config import settings

logger = logging.getLogger(__name__)
_client: Client | None = None

if settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY:
    try:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
    except Exception:
        logger.exception("Could not initialize Supabase client.")
else:
    logger.warning("Supabase is not configured; database routes will be unavailable.")


def get_supabase() -> Client:
    if _client is None:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY."
        )
    return _client
