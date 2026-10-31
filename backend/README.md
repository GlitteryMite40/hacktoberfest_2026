# Kalp.io backend

This implementation keeps the working FastAPI + Gemini setup for the hackathon. The PRD specifies Next.js API routes and pooled PostgreSQL access; retaining FastAPI is an intentional temporary architecture deviation. The backend implements the PRD's Release 1 workflows as HTTP APIs.

## Setup (Windows PowerShell)

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill `.env` locally. Never commit it. Use the Supabase server-side secret key only.

## Run

```powershell
uvicorn app.main:app --reload
```

Swagger: http://127.0.0.1:8000/docs

## API

- `POST /api/projects` — create a project immediately and set an HTTP-only owner cookie.
- `GET /api/projects` — list projects belonging to the cookie owner.
- `POST /api/projects/{id}/run` — run one generation stage. Body: `{"stage":"requirements"}`, `architecture`, `decomposition`, or `acceptance_criteria`. Omit body to run the next incomplete stage.
- `GET /api/projects/{id}/graph` — return nodes, edges and stage states.
- `DELETE /api/projects/{id}` — delete an owned project.
- `PATCH /api/projects/nodes/{node_id}` — update step status.
- `POST /api/projects/{id}/repo` — validate and connect a public GitHub repository.
- `POST /api/webhook/github` — signed GitHub push webhook.
- `GET /api/llm/status` — Gemini model candidates and status.
- `POST /api/llm/status/recheck` — force model discovery.
- `POST /api/llm/test` — test JSON generation.
- `GET /api/db/status` — database connectivity check.

## Frontend integration

Send requests with `credentials: "include"` so the HTTP-only owner cookie is retained. Set `FRONTEND_ORIGIN` to the exact frontend origin. For production set `OWNER_COOKIE_SECURE=true`.

## Important

1. The Supabase key is server-only. Never put it in a `NEXT_PUBLIC_` variable or frontend code.
2. Keep RLS enabled. The backend currently uses the Supabase server-side client; verify that public Data API exposure is disabled as required by the PRD and that the server credential is permitted to access the schema.
3. Confirm the column names in your existing Supabase schema before running the generation and webhook flows. The schema expected here follows the project tables already created for Kalp.io.
4. The webhook secret is returned once when connecting a repository. Configure GitHub to send push events as JSON to the deployed `/api/webhook/github` URL.
5. This covers the Release 1 plan and tracking foundation. The PRD's learning layer (commit explanation, quiz questions, answers and skip flow) remains planned and is not included.


## Live schema compatibility checked

The implementation was checked against the active `kalp-io` Supabase project.
Its `edges` table stores `project_id`, `source_node_id`, and `target_node_id`
(no source/target key text columns). Its `commits` table uses `commit_message`
and `commit_url`. The code uses those actual names. Child records cascade when
a project is deleted; edge rows cascade when their node is deleted.

## Important implementation boundary

Generation is currently executed during the `/run` HTTP request and can take
longer than a typical request timeout. For production, move stage execution to
a background worker/queue and return a job identifier. The endpoint is staged
and retryable, but it is not yet a durable background job system.
