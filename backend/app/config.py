import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
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
