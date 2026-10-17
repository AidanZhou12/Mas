"""Weekly waiver availability in Central time."""

from datetime import datetime, time, timedelta
from timezones import APP_TIMEZONE


def waiver_status(now: datetime | None = None) -> dict:
    if now is None:
        now = datetime.now(APP_TIMEZONE)
    elif now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("Waiver timestamps must include a timezone")
    else:
        now = now.astimezone(APP_TIMEZONE)
    locked = now.weekday() >= 4
    next_weekday = 0 if locked else 4
    days = (next_weekday - now.weekday()) % 7
    next_change = datetime.combine(now.date() + timedelta(days=days), time.min, APP_TIMEZONE)
    return {
        "locked": locked,
        "server_time": now.isoformat(),
        "next_change": next_change.isoformat(),
    }
