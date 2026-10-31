import pytest

from app.services.ai import AIServiceError, parse_json_object


def test_parse_plain_json_object():
    assert parse_json_object('{"status":"ok","count":2}') == {
        "status": "ok",
        "count": 2,
    }


def test_parse_json_object_inside_markdown_fence():
    assert parse_json_object('```json\n{"status":"ok"}\n```') == {
        "status": "ok"
    }


def test_parse_json_object_after_short_preamble():
    assert parse_json_object('Result:\n{"items":[1,2,3]}') == {
        "items": [1, 2, 3]
    }


@pytest.mark.parametrize("value", ["", "   ", "no json here", "[1,2,3]"])
def test_reject_non_object_or_empty_output(value):
    with pytest.raises(AIServiceError):
        parse_json_object(value)
