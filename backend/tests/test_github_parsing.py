import re

REPOSITORY_URL = re.compile(
    r"https?://github\.com/([A-Za-z0-9-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?"
)
STEP_KEY = re.compile(r"\[([A-Za-z0-9._-]+)\]")


def test_public_github_url_with_git_suffix():
    match = REPOSITORY_URL.fullmatch("https://github.com/octocat/hello-world.git")
    assert match
    assert match.group(1) == "octocat"
    assert match.group(2) == "hello-world"


def test_extract_step_key_from_commit_subject():
    assert STEP_KEY.findall("[03.5] implement project API") == ["03.5"]


def test_commit_without_step_key_is_ignored():
    assert STEP_KEY.findall("chore: update dependencies") == []
