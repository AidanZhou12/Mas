"""Season registration deadline in Chicago time."""

from datetime import datetime

from fastapi import HTTPException
from timezones import APP_TIMEZONE

REGISTRATION_DEADLINE = datetime(2026, 10, 31, tzinfo=APP_TIMEZONE)


def registration_status() -> dict:
    now = datetime.now(APP_TIMEZONE)
    return {
        "closed": now >= REGISTRATION_DEADLINE,
        "deadline": REGISTRATION_DEADLINE.isoformat(),
        "server_time": now.isoformat(),
    }


def require_registration_open() -> None:
    if registration_status()["closed"]:
        raise HTTPException(status_code=403, detail="The Fantasy Season Has Started")


def draft_eligibility(draft_status: str | None) -> dict:
    result = registration_status()
    result["closed"] = result["closed"] and draft_status != "completed"
    return result


def require_draft_eligible(draft_status: str | None) -> None:
    if draft_status != "completed":
        require_registration_open()
