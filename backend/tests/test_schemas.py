import pytest
from pydantic import ValidationError
from app.schemas.projects import ProjectCreate


def test_project_idea_minimum_length():
    with pytest.raises(ValidationError):
        ProjectCreate(idea="short")


def test_project_idea_is_trimmed():
    value = ProjectCreate(idea="  Build a useful learning app  ")
    assert value.idea == "Build a useful learning app"
