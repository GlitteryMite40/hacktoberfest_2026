import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Gemma 4 is the production provider. Keep GEMINI_API_KEY as a temporary
    # compatibility alias so an existing Google AI Studio key can be migrated
    # without breaking local development.
    GEMMA_API_KEY = os.getenv("GEMMA_API_KEY") or os.getenv("GEMINI_API_KEY", "")
    GEMMA_MODEL = os.getenv("GEMMA_MODEL") or "gemma-4-26b-a4b-it"
    GEMMA_FALLBACK_MODEL = os.getenv("GEMMA_FALLBACK_MODEL") or "gemma-4-31b-it"

    # Backward-compatible aliases for older modules.
    GEMINI_API_KEY = GEMMA_API_KEY
    GEMINI_MODEL = GEMMA_MODEL

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SECRET_KEY = (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    APP_ENV = os.getenv("APP_ENV", "development")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    OWNER_COOKIE_NAME = os.getenv("OWNER_COOKIE_NAME", "kalp_owner")
    OWNER_COOKIE_SECURE = os.getenv("OWNER_COOKIE_SECURE", "false").lower() == "true"
    DAILY_GENERATION_LIMIT = int(os.getenv("DAILY_GENERATION_LIMIT", "3"))
    GITHUB_API_BASE = os.getenv("GITHUB_API_BASE", "https://api.github.com")


settings = Settings()
