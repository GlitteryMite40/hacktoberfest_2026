from typing import Literal
from pydantic import BaseModel, Field, field_validator


class ProjectCreate(BaseModel):
    idea: str = Field(min_length=10, max_length=20000)

    @field_validator("idea")
    @classmethod
    def idea_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Please describe your project idea.")
        return value.strip()


class RunStageRequest(BaseModel):
    stage: Literal[
        "requirements", "architecture", "decomposition", "acceptance_criteria"
    ] | None = None


class NodeStatusUpdate(BaseModel):
    status: Literal[
        "Not Started", "Ready", "In Progress", "Committed",
        "Completed", "Blocked", "Failed", "Needs Review"
    ]


class RepositoryConnect(BaseModel):
    repository_url: str = Field(min_length=10, max_length=500)
