import pytest
from app.utils.graph import GraphValidationError, validate_and_normalize_graph


def test_unknown_requirement_reference_is_rejected():
    payload = {"phases": [{"steps": [{
        "step_key": "01.1", "type": "setup", "title": "Init",
        "explanation": "Initialize", "requirement_keys": ["REQ-UNKNOWN"],
        "prerequisites": []
    }]}]}
    with pytest.raises(GraphValidationError, match="unknown requirements"):
        validate_and_normalize_graph(payload, {"REQ-01"})


def test_non_object_step_is_rejected():
    with pytest.raises(GraphValidationError, match="JSON object"):
        validate_and_normalize_graph({"phases": [{"steps": ["bad"]}]}, set())
