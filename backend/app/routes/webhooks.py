import hashlib
import hmac
import json
import logging
import re

from fastapi import APIRouter, Header, HTTPException, Request
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhook", tags=["GitHub"])
MAX_PAYLOAD_BYTES = 1_000_000


@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None),
    x_github_event: str | None = Header(default=None),
    x_github_delivery: str | None = Header(default=None),
):
    body = await request.body()
    if len(body) > MAX_PAYLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Webhook payload is too large.")
    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    repository = event.get("repository") or {}
    repo_owner = (repository.get("owner") or {}).get("login", "")
    repo_name = repository.get("name", "")
    if not repo_owner or not repo_name or not x_hub_signature_256:
        raise HTTPException(status_code=401, detail="Webhook authentication failed.")

    db = get_supabase()
    project = (
        db.table("projects").select("id,webhook_secret,default_branch")
        .eq("repository_owner", repo_owner).eq("repository_name", repo_name)
        .maybe_single().execute().data
    )
    if not project or not project.get("webhook_secret"):
        raise HTTPException(status_code=401, detail="Webhook authentication failed.")

    expected = "sha256=" + hmac.new(
        project["webhook_secret"].encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Webhook authentication failed.")

    if x_github_event != "push":
        return {"accepted": True, "ignored": "unsupported_event"}
    if event.get("ref") != f"refs/heads/{project.get('default_branch', 'main')}":
        return {"accepted": True, "ignored": "non_default_branch"}

    matched = 0
    for commit in event.get("commits") or []:
        full_message = commit.get("message") or ""
        message = full_message.splitlines()[0] if full_message.splitlines() else ""
        if not message:
            continue
        step_keys = re.findall(r"\[([A-Za-z0-9._-]+)\]", message)
        for step_key in step_keys:
            node = (
                db.table("nodes").select("id")
                .eq("project_id", project["id"]).eq("step_key", step_key)
                .maybe_single().execute().data
            )
            if not node:
                continue
            record = {
                "project_id": project["id"],
                "node_id": node["id"],
                "commit_sha": commit.get("id"),
                "commit_message": message,
                "commit_url": f"{(repository.get('html_url') or '').rstrip('/')}/commit/{commit.get('id')}",
                "author": (commit.get("author") or {}).get("name"),
                "changed_files": (
                    commit.get("added", [])
                    + commit.get("modified", [])
                    + commit.get("removed", [])
                ),
            }
            db.table("commits").upsert(
                record, on_conflict="project_id,commit_sha"
            ).execute()
            db.table("nodes").update({"status": "Committed"}).eq(
                "id", node["id"]
            ).execute()
            matched += 1

    return {
        "accepted": True,
        "commits_matched": matched,
        "delivery_id": x_github_delivery
    }
