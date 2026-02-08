"""
Utility functions for ulogme tracker.
"""

import time
from datetime import datetime, date, timedelta, timezone
from urllib.parse import urlparse, urlunparse


def get_unix_timestamp() -> int:
    """Get current UNIX timestamp as integer."""
    return int(time.time())


def rewind_to_logical_day(timestamp: int | None = None, boundary_hour: int = 7) -> date:
    """
    Calculate the "logical day" for a given timestamp.

    ulogme day breaks occur at the boundary hour (default 7am), so late night
    sessions before that hour count towards the previous day's activity.
    Uses the system local timezone for consistent day boundaries.

    Args:
        timestamp: UNIX timestamp (uses current time if None)
        boundary_hour: Hour at which the new day starts (0-23)

    Returns:
        The logical date for the given timestamp
    """
    if timestamp is None:
        timestamp = get_unix_timestamp()

    # Use local timezone explicitly for consistent behavior
    local_tz = datetime.now(timezone.utc).astimezone().tzinfo
    dt = datetime.fromtimestamp(timestamp, tz=local_tz)

    if dt.hour >= boundary_hour:
        # It's between boundary hour and midnight - same calendar day
        return dt.date()
    else:
        # It's between midnight and boundary hour - previous calendar day
        return (dt - timedelta(days=1)).date()


def sanitize_url(url: str) -> str:
    """
    Sanitize a URL by stripping query parameters and fragments.
    Keeps only scheme, netloc, and path.
    """
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


def format_duration(seconds: float) -> str:
    """Format a duration in seconds to a human-readable string."""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m"


def remove_non_ascii(s: str | None) -> str | None:
    """Replace non-ASCII characters with spaces."""
    if s is None:
        return None
    return ''.join(c if ord(c) < 128 else ' ' for c in s)


def format_timestamp_for_display(timestamp: int) -> str:
    """Format a UNIX timestamp for human-readable display."""
    dt = datetime.fromtimestamp(timestamp)
    return dt.strftime("%Y-%m-%d %H:%M:%S")

