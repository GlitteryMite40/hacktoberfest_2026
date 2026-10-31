"""Run with: python -m app.worker (from the backend directory)."""

import asyncio
import logging
import os
import socket
import uuid
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.database import get_supabase
from app.services.generation import run_generation_stage

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger("kalp.worker")
WORKER_ID = f"{socket.gethostname()}-{uuid.uuid4()}"


def claim_one():
    """Claim one queued job using the PostgreSQL SKIP LOCKED RPC."""
    result = get_supabase().rpc(
        "claim_generation_job",
        {
            "p_worker_id": WORKER_ID,
            "p_lease_seconds": 900,
        },
    ).execute()

    rows = result.data or []
    return rows[0] if rows else None


def finish_job(
    job_id: str,
    *,
    status: str,
    error: str | None = None,
    result: dict | None = None,
):
    """
    Complete or retry a job.

    Use limit(1) instead of maybe_single(): the Supabase Python response
    may have data=None when a row is absent.
    """
    db = get_supabase()
    lookup = (
        db.table("generation_jobs")
        .select("attempts,max_attempts")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    rows = lookup.data or []
    job = rows[0] if rows else None

    if not job:
        logger.error("Job %s disappeared before completion.", job_id)
        return

    attempts = int(job.get("attempts") or 1)
    max_attempts = int(
        job.get("max_attempts") or settings.GENERATION_JOB_MAX_ATTEMPTS
    )

    if status == "completed":
        next_status = "completed"
    elif attempts < max_attempts:
        next_status = "queued"
    else:
        next_status = "failed"

    delay = (
        min(60, 5 * (2 ** max(0, attempts - 1)))
        if next_status == "queued"
        else 0
    )

    now = datetime.now(timezone.utc)
    payload = {
        "status": next_status,
        "error": error[:1000] if error else None,
        "result": result,
        "worker_id": None,
        "locked_at": None,
        "updated_at": now.isoformat(),
        "available_at": (now + timedelta(seconds=delay)).isoformat(),
        "finished_at": (
            now.isoformat()
            if next_status in {"completed", "failed"}
            else None
        ),
    }

    db.table("generation_jobs").update(payload).eq("id", job_id).execute()

    if next_status == "queued":
        logger.warning(
            "Job %s queued for retry (%s/%s), delay=%ss",
            job_id,
            attempts,
            max_attempts,
            delay,
        )
    elif next_status == "failed":
        logger.error(
            "Job %s exhausted retries (%s/%s)",
            job_id,
            attempts,
            max_attempts,
        )


async def process(job: dict):
    job_id = job["id"]
    logger.info(
        "Starting job=%s stage=%s project=%s attempt=%s",
        job_id,
        job["stage"],
        job["project_id"],
        job.get("attempts"),
    )

    try:
        result = await run_generation_stage(
            job["project_id"],
            job["owner_id"],
            job["stage"],
        )
        finish_job(job_id, status="completed", result=result)
        logger.info("Completed job=%s", job_id)

    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        try:
            finish_job(
                job_id,
                status="failed",
                error=f"{type(exc).__name__}: {exc}",
            )
        except Exception:
            logger.exception("Could not update failed job=%s", job_id)


async def worker_loop():
    """
    Keep ONE asyncio event loop alive for the worker's entire lifetime.

    Do not call asyncio.run(process(job)) for every job. The Google GenAI
    async client owns HTTPX/AnyIO transports tied to an event loop; closing
    and recreating the loop after every job can produce 'Event loop is closed'.
    """
    logger.info("Kalp generation worker started: %s", WORKER_ID)

    poll_seconds = max(1, settings.GENERATION_WORKER_POLL_SECONDS)

    while True:
        try:
            # Supabase client is synchronous; claim is intentionally performed
            # outside an async network client lifecycle.
            job = await asyncio.to_thread(claim_one)

            if job:
                await process(job)
            else:
                await asyncio.sleep(poll_seconds)

        except asyncio.CancelledError:
            logger.info("Worker cancellation received.")
            raise
        except Exception:
            logger.exception("Worker loop error.")
            await asyncio.sleep(max(2, poll_seconds))


def main():
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker stopping.")


if __name__ == "__main__":
    main()
