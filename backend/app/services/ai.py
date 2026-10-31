import asyncio
import json
import logging
import time

from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    def __init__(self, message: str, code: str = "AI_ERROR"):
        super().__init__(message)
        self.code = code


class AIService:
    def __init__(self):
        self.client = (
            genai.Client(api_key=settings.GEMINI_API_KEY)
            if settings.GEMINI_API_KEY else None
        )
        self._models: list[str] = []
        self._models_checked_at = 0.0
        self.active_model: str | None = None

    @property
    def is_configured(self) -> bool:
        return self.client is not None

    def discover_models(self, force: bool = False) -> list[str]:
        if not self.client:
            return []
        if self._models and not force and time.time() - self._models_checked_at < 600:
            return self._models

        candidates: list[str] = []
        try:
            for model in self.client.models.list():
                name = (getattr(model, "name", "") or "").removeprefix("models/")
                actions = getattr(model, "supported_actions", None) or []
                if name.startswith("gemini-") and (
                    not actions or "generateContent" in actions
                ):
                    candidates.append(name)
        except Exception:
            logger.warning("Gemini model discovery failed; using configured fallback.")

        def rank(name: str) -> tuple:
            lower = name.lower()
            stable = 0 if ("preview" in lower or "experimental" in lower) else 1
            flash = 1 if "flash" in lower else 0
            return stable, flash, name

        candidates.sort(key=rank, reverse=True)
        if settings.GEMINI_MODEL and settings.GEMINI_MODEL not in candidates:
            candidates.insert(0, settings.GEMINI_MODEL)
        self._models = candidates or ([settings.GEMINI_MODEL] if settings.GEMINI_MODEL else [])
        self._models_checked_at = time.time()
        return self._models

    async def generate_json(self, prompt: str) -> dict:
        if not self.client:
            raise AIServiceError(
                "Gemini is not configured. Add GEMINI_API_KEY on the backend.",
                "AI_NOT_CONFIGURED"
            )

        last_error = None
        for model_name in self.discover_models():
            for attempt in range(2):
                try:
                    response = await self.client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                        ),
                    )
                    if not response.text:
                        raise AIServiceError("Gemini returned an empty response.", "AI_EMPTY")
                    data = json.loads(response.text)
                    if not isinstance(data, dict):
                        raise AIServiceError("Gemini returned an invalid JSON object.", "AI_INVALID_JSON")
                    self.active_model = model_name
                    return data
                except json.JSONDecodeError as exc:
                    raise AIServiceError(
                        "The AI returned invalid JSON. Please retry.", "AI_INVALID_JSON"
                    ) from exc
                except AIServiceError:
                    raise
                except Exception as exc:
                    last_error = exc
                    message = str(exc).lower()
                    if any(x in message for x in ("401", "api key not valid", "invalid api key")):
                        raise AIServiceError(
                            "The Gemini API key was rejected. Check the backend key.",
                            "AI_INVALID_KEY"
                        ) from exc
                    transient = any(x in message for x in ("500", "502", "503", "504", "timeout"))
                    fallback = any(x in message for x in ("403", "404", "429", "500", "502", "503", "504"))
                    if transient and attempt == 0:
                        await asyncio.sleep(1.5)
                        continue
                    if fallback:
                        break
                    raise AIServiceError(
                        "Gemini could not complete this generation. Check backend logs.",
                        "AI_PROVIDER_ERROR"
                    ) from exc

        logger.error(
            "All Gemini models failed: %s",
            type(last_error).__name__ if last_error else "unknown"
        )
        raise AIServiceError(
            "All available Gemini models are currently unavailable. Retry this stage shortly.",
            "AI_MODELS_UNAVAILABLE"
        ) from last_error


ai_service = AIService()
