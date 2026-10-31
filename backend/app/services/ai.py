import json
import logging
from json import JSONDecoder

from google import genai

from app.config import settings

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    def __init__(self, message: str, code: str = "AI_ERROR"):
        super().__init__(message)
        self.code = code


def parse_json_object(response_text: str) -> dict:
    """Extract the first valid JSON object from model output.

    Gemma 4 is prompted to return JSON, but the application validates it rather
    than assuming Gemini-only structured-output settings are supported.
    """
    if not response_text or not response_text.strip():
        raise AIServiceError("Gemma 4 returned an empty response.", "AI_EMPTY")

    text = response_text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline >= 0:
            text = text[first_newline + 1 :]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3].rstrip()

    decoder = JSONDecoder()
    for index, char in enumerate(text):
        if char != "{":
            continue
        try:
            value, _ = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value

    raise AIServiceError(
        "Gemma 4 did not return a valid JSON object. Please retry this stage.",
        "AI_INVALID_JSON",
    )


class AIService:
    def __init__(self):
        self.client = (
            genai.Client(api_key=settings.GEMMA_API_KEY)
            if settings.GEMMA_API_KEY
            else None
        )
        self.active_model: str | None = None
        self._models = list(dict.fromkeys([
            settings.GEMMA_MODEL,
            settings.GEMMA_FALLBACK_MODEL,
        ]))

    @property
    def is_configured(self) -> bool:
        return self.client is not None

    def discover_models(self, force: bool = False) -> list[str]:
        """Return configured Gemma 4 candidates without a network model-list call."""
        if not self.client:
            return []
        return self._models.copy()

    async def generate_json(self, prompt: str) -> dict:
        if not self.client:
            raise AIServiceError(
                "Gemma 4 is not configured. Add GEMMA_API_KEY to the backend environment.",
                "AI_NOT_CONFIGURED",
            )

        last_error: Exception | None = None
        invalid_json_seen = False

        for model_name in self.discover_models():
            try:
                # Keep the request compatible with the documented Gemma 4
                # Gemini API generateContent examples. JSON is validated below.
                response = await self.client.aio.models.generate_content(
                    model=model_name,
                    contents=(
                        "Return exactly one valid JSON object. Do not include Markdown, "
                        "code fences, comments, or explanatory text.\n\n"
                        + prompt
                    ),
                )
                result = parse_json_object(response.text or "")
                self.active_model = model_name
                return result
            except AIServiceError as exc:
                if exc.code in {"AI_INVALID_JSON", "AI_EMPTY"}:
                    invalid_json_seen = True
                    last_error = exc
                    logger.warning("Gemma model %s returned no usable JSON.", model_name)
                    continue
                raise
            except Exception as exc:
                last_error = exc
                message = str(exc).lower()
                status_code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
                if status_code in (401, 403) or any(
                    marker in message
                    for marker in ("api key not valid", "invalid api key", "api_key_invalid")
                ):
                    raise AIServiceError(
                        "The Google AI Studio key was rejected. Check GEMMA_API_KEY in the backend environment.",
                        "AI_INVALID_KEY",
                    ) from exc

                # Try the configured fallback model for model availability,
                # quota, transient provider, and request failures.
                logger.warning(
                    "Gemma model %s failed (%s); trying the configured fallback if available.",
                    model_name,
                    type(exc).__name__,
                )

        if invalid_json_seen:
            raise AIServiceError(
                "Gemma 4 returned invalid JSON for this stage. Retry the stage.",
                "AI_INVALID_JSON",
            ) from last_error

        logger.error(
            "All configured Gemma 4 models failed (%s).",
            type(last_error).__name__ if last_error else "unknown",
        )
        raise AIServiceError(
            "Gemma 4 is temporarily unavailable. Check the backend logs and retry.",
            "AI_MODELS_UNAVAILABLE",
        ) from last_error


ai_service = AIService()
