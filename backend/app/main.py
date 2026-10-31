from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.ai import router as ai_router
from app.routes.database import router as database_router
from app.routes.projects import router as projects_router
from app.routes.webhooks import router as webhooks_router

app = FastAPI(
    title="Kalp.io API",
    description="AI-powered guided software development platform",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(database_router)
app.include_router(projects_router)
app.include_router(webhooks_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Kalp.io API",
        "status": "running",
        "version": "0.2.0",
    }


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "kalp-backend"}


@app.get("/api/ping")
async def ping():
    return {"message": "pong", "status": "success"}
