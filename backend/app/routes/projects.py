

import logging

import re

import secrets

import uuid

from datetime import date



import httpx

from fastapi import APIRouter, HTTPException, Request, Response



from app.config import settings

from app.database import get_supabase

from app.schemas.projects import (

    NodeStatusUpdate,

    ProjectCreate,

    RepositoryConnect,

    RunStageRequest,

)

from app.services.generation import STAGES



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["Projects"])





def _owner_from_request(request: Request) -> str:

    raw = request.cookies.get(settings.OWNER_COOKIE_NAME)

    try:

        return str(uuid.UUID(raw)) if raw else ""

    except (ValueError, TypeError):

        return ""





def _require_owner(request: Request) -> str:

    owner = _owner_from_request(request)

    if not owner:

        raise HTTPException(

            status_code=401,

            detail="Owner session missing. Create a project first.",

        )

    return owner





def _owned_project(project_id: str, owner_id: str) -> dict:
    result = (
        get_supabase()
        .table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("owner_id", owner_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    project = rows[0] if rows else None
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project





@router.post("")

async def create_project(

    payload: ProjectCreate,

    request: Request,

    response: Response,

):

    owner = _owner_from_request(request) or str(uuid.uuid4())

    db = get_supabase()

    today = date.today().isoformat()



    # Safely retrieve today's usage record.

    usage_result = (

        db.table("usage")

        .select("*")

        .eq("owner_id", owner)

        .eq("usage_date", today)

        .limit(1)

        .execute()

    )



    usage_rows = usage_result.data or []

    usage = usage_rows[0] if usage_rows else None



    count = int((usage or {}).get("generation_count") or 0)



    if count >= settings.DAILY_GENERATION_LIMIT:

        raise HTTPException(

            status_code=429,

            detail=f"Daily project limit reached ({settings.DAILY_GENERATION_LIMIT}).",

        )



    created = (

        db.table("projects")

        .insert({

            "owner_id": owner,

            "idea": payload.idea,

            "status": "generating",

        })

        .execute()

        .data

        or []

    )



    if not created:

        raise HTTPException(

            status_code=500,

            detail="Project creation failed.",

        )



    project = created[0]



    # Update or create the daily usage record.

    if usage:

        (

            db.table("usage")

            .update({"generation_count": count + 1})

            .eq("owner_id", owner)

            .eq("usage_date", today)

            .execute()

        )

    else:

        (

            db.table("usage")

            .insert({

                "owner_id": owner,

                "usage_date": today,

                "generation_count": 1,

            })

            .execute()

        )



    response.set_cookie(

        key=settings.OWNER_COOKIE_NAME,

        value=owner,

        httponly=True,

        secure=settings.OWNER_COOKIE_SECURE,

        samesite="lax",

        max_age=60 * 60 * 24 * 365,

        path="/",

    )



    return {

        "project_id": project["id"],

        "status": "generating",

        "message": "Project created. Enqueue the requirements stage to begin generation.",

    }





@router.get("")

async def list_projects(request: Request):

    owner = _require_owner(request)



    result = (

        get_supabase()

        .table("projects")

        .select("id,name,idea,status,created_at,updated_at")

        .eq("owner_id", owner)

        .order("created_at", desc=True)

        .execute()

    )



    return {"projects": result.data or []}





@router.post("/{project_id}/run", status_code=202)

async def run_project_stage(

    project_id: str,

    request: Request,

    payload: RunStageRequest | None = None,

):

    """Queue a generation stage; a separate worker performs the Gemini call."""



    owner = _require_owner(request)

    _owned_project(project_id, owner)

    db = get_supabase()



    stage_rows = (

        db.table("project_stages")

        .select("stage,status")

        .eq("project_id", project_id)

        .execute()

        .data

        or []

    )



    completed = {

        row["stage"]

        for row in stage_rows

        if row.get("status") == "completed"

    }



    stage = (

        payload.stage

        if payload and payload.stage

        else next(

            (candidate for candidate in STAGES if candidate not in completed),

            None,

        )

    )



    if stage not in STAGES:

        raise HTTPException(

            status_code=409,

            detail="All generation stages are already complete.",

        )



    for prerequisite in STAGES[:STAGES.index(stage)]:

        if prerequisite not in completed:

            raise HTTPException(

                status_code=409,

                detail=f"Complete the {prerequisite} stage before running {stage}.",

            )



    active = (

        db.table("generation_jobs")

        .select("id,status")

        .eq("project_id", project_id)

        .eq("stage", stage)

        .in_("status", ["queued", "running"])

        .limit(1)

        .execute()

        .data

        or []

    )



    if active:

        job = active[0]

        return {

            "job_id": job["id"],

            "project_id": project_id,

            "stage": stage,

            "status": job["status"],

            "message": "A job for this stage is already active.",

        }



    inserted = (

        db.table("generation_jobs")

        .insert({

            "project_id": project_id,

            "owner_id": owner,

            "stage": stage,

            "status": "queued",

            "max_attempts": settings.GENERATION_JOB_MAX_ATTEMPTS,

        })

        .execute()

        .data

        or []

    )



    if not inserted:

        raise HTTPException(

            status_code=500,

            detail="Could not enqueue generation job.",

        )



    db.table("projects").update(

        {"status": "generating"}

    ).eq("id", project_id).execute()



    job = inserted[0]



    return {

        "job_id": job["id"],

        "project_id": project_id,

        "stage": stage,

        "status": "queued",

        "message": "Generation job queued. Poll the job endpoint for progress.",

    }





@router.get("/{project_id}/jobs/{job_id}")

async def get_generation_job(

    project_id: str,

    job_id: str,

    request: Request,

):

    owner = _require_owner(request)

    _owned_project(project_id, owner)



    result = (
        get_supabase()
        .table("generation_jobs")
        .select(
            "id,project_id,stage,status,attempts,max_attempts,error,result,"
            "created_at,updated_at,finished_at"
        )
        .eq("id", job_id)
        .eq("project_id", project_id)
        .eq("owner_id", owner)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    job = rows[0] if rows else None
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Generation job not found.",
        )
    return {"job": job}





@router.get("/{project_id}/graph")

async def get_project_graph(project_id: str, request: Request):

    owner = _require_owner(request)

    _owned_project(project_id, owner)

    db = get_supabase()



    nodes = (

        db.table("nodes")

        .select("*")

        .eq("project_id", project_id)

        .order("phase")

        .execute()

        .data

        or []

    )



    edges = (

        db.table("edges")

        .select("*")

        .eq("project_id", project_id)

        .execute()

        .data

        or []

    )



    stages = (

        db.table("project_stages")

        .select("stage,status,error,updated_at")

        .eq("project_id", project_id)

        .execute()

        .data

        or []

    )



    jobs = (

        db.table("generation_jobs")

        .select(

            "id,stage,status,attempts,max_attempts,error,"

            "created_at,updated_at,finished_at"

        )

        .eq("project_id", project_id)

        .eq("owner_id", owner)

        .order("created_at", desc=True)

        .limit(20)

        .execute()

        .data

        or []

    )



    return {

        "project_id": project_id,

        "nodes": nodes,

        "edges": edges,

        "stages": stages,

        "jobs": jobs,

    }





@router.delete("/{project_id}")

async def delete_project(project_id: str, request: Request):

    owner = _require_owner(request)

    _owned_project(project_id, owner)



    get_supabase().table("projects").delete().eq(

        "id", project_id

    ).eq("owner_id", owner).execute()



    return {

        "deleted": True,

        "project_id": project_id,

    }





@router.patch("/nodes/{node_id}")

async def update_node_status(

    node_id: str,

    payload: NodeStatusUpdate,

    request: Request,

):

    owner = _require_owner(request)

    db = get_supabase()



    node_result = (

        db.table("nodes")

        .select("*")

        .eq("id", node_id)

        .limit(1)

        .execute()

    )



    node_rows = node_result.data or []

    node = node_rows[0] if node_rows else None



    if not node:

        raise HTTPException(

            status_code=404,

            detail="Step not found.",

        )



    _owned_project(node["project_id"], owner)



    if payload.status in {"Ready", "Blocked"}:

        raise HTTPException(

            status_code=400,

            detail="Ready and Blocked are computed from dependency completion.",

        )



    edges = (

        db.table("edges")

        .select("source_node_id")

        .eq("target_node_id", node_id)

        .execute()

        .data

        or []

    )



    prerequisite_ids = [

        edge["source_node_id"] for edge in edges

    ]



    if (

        payload.status in {"In Progress", "Completed", "Committed"}

        and prerequisite_ids

    ):

        prerequisites = (

            db.table("nodes")

            .select("id,status")

            .in_("id", prerequisite_ids)

            .execute()

            .data

            or []

        )



        incomplete = [

            item

            for item in prerequisites

            if item["status"] not in {"Completed", "Committed"}

        ]



        if incomplete:

            raise HTTPException(

                status_code=409,

                detail=(

                    "Complete or commit all prerequisite steps before "

                    "progressing this step."

                ),

            )



    db.table("nodes").update(

        {"status": payload.status}

    ).eq("id", node_id).execute()



    if payload.status in {"Completed", "Committed"}:

        outgoing = (

            db.table("edges")

            .select("target_node_id")

            .eq("source_node_id", node_id)

            .execute()

            .data

            or []

        )



        for edge in outgoing:

            target_id = edge["target_node_id"]



            incoming = (

                db.table("edges")

                .select("source_node_id")

                .eq("target_node_id", target_id)

                .execute()

                .data

                or []

            )



            parent_ids = [

                item["source_node_id"] for item in incoming

            ]



            parent_rows = (

                db.table("nodes")

                .select("id,status")

                .in_("id", parent_ids)

                .execute()

                .data

                or []

            ) if parent_ids else []



            if all(

                item["status"] in {"Completed", "Committed"}

                for item in parent_rows

            ):

                target_result = (

                    db.table("nodes")

                    .select("status")

                    .eq("id", target_id)

                    .limit(1)

                    .execute()

                )



                target_rows = target_result.data or []

                target = target_rows[0] if target_rows else None



                if target and target["status"] in {"Blocked", "Not Started"}:

                    db.table("nodes").update(

                        {"status": "Ready"}

                    ).eq("id", target_id).execute()



    return {

        "node_id": node_id,

        "status": payload.status,

    }





@router.post("/{project_id}/repo")

async def connect_repository(

    project_id: str,

    payload: RepositoryConnect,

    request: Request,

):

    owner = _require_owner(request)

    _owned_project(project_id, owner)



    match = re.fullmatch(
        r"https?://github\\.com/([A-Za-z0-9-]+)/([A-Za-z0-9_.-]+?)(?:\\.git)?/?",
        payload.repository_url.strip(),
    )



    if not match:

        raise HTTPException(

            status_code=400,

            detail=(

                "Enter a public GitHub repository URL, "

                "e.g. https://github.com/owner/repo."

            ),

        )



    repo_owner, repo_name = match.group(1), match.group(2)



    async with httpx.AsyncClient(timeout=12) as client:

        check = await client.get(

            f"{settings.GITHUB_API_BASE}/repos/{repo_owner}/{repo_name}"

        )



    if check.status_code != 200 or check.json().get("private"):

        raise HTTPException(

            status_code=400,

            detail="Repository not found or not public.",

        )



    data = check.json()

    webhook_secret = secrets.token_hex(32)



    get_supabase().table("projects").update({

        "repository_url": data["html_url"],

        "repository_owner": repo_owner,

        "repository_name": repo_name,

        "default_branch": data.get("default_branch", "main"),

        "webhook_secret": webhook_secret,

    }).eq("id", project_id).execute()



    return {

        "repository_url": data["html_url"],

        "default_branch": data.get("default_branch", "main"),

        "webhook_secret": webhook_secret,

        "webhook": {

            "payload_url": "/api/webhook/github",

            "content_type": "application/json",

            "events": ["push"],

        },

    }
