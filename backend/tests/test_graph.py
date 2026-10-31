import pytest
from app.utils.graph import validate_and_normalize_graph, GraphValidationError


def test_valid_graph_is_normalized():
    payload = {
        "phases": [
            {"steps": [
                {"step_key": "01.1", "type": "setup", "title": "Init",
                 "explanation": "Initialize", "requirement_keys": ["REQ-01"],
                 "prerequisites": []}
            ]},
            {"steps": [
                {"step_key": "02.1", "type": "backend", "title": "API",
                 "explanation": "Build API", "requirement_keys": ["REQ-02"],
                 "prerequisites": ["01.1"]}
            ]}
        ]
    }
    nodes, edges = validate_and_normalize_graph(payload, {"REQ-01", "REQ-02"})
    assert len(nodes) == 2
    assert edges == [{"source_key": "01.1", "target_key": "02.1"}]


def test_cycle_is_rejected():
    payload = {"phases": [
        {"steps": [
            {"step_key": "01", "type": "setup", "title": "A",
             "explanation": "A", "requirement_keys": ["R1"], "prerequisites": ["02"]},
            {"step_key": "02", "type": "backend", "title": "B",
             "explanation": "B", "requirement_keys": ["R2"], "prerequisites": ["01"]}
        ]}
    ]}
    with pytest.raises(GraphValidationError):
        validate_and_normalize_graph(payload, {"R1", "R2"})
