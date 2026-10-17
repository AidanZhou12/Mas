"""CFBD requests that tolerate temporary upstream failures."""

import logging
import time

import requests

logger = logging.getLogger(__name__)


def fetch_box_scores(url, headers, params):
    """Return JSON, or None after a failed request; retry transient errors twice."""
    school = params["team"]
    week = params["week"]
    for attempt in range(3):
        try:
            response = requests.get(url, headers=headers, params=params, timeout=(5, 30))
        except requests.RequestException as error:
            logger.warning("CFBD school=%s week=%s attempt=%s: %s", school, week, attempt + 1, type(error).__name__)
        else:
            if response.status_code == 200:
                try:
                    return response.json()
                except ValueError:
                    logger.error("Skipping CFBD school=%s week=%s: invalid JSON", school, week)
                    return None
            logger.warning("CFBD school=%s week=%s attempt=%s: HTTP %s", school, week, attempt + 1, response.status_code)
            if not 500 <= response.status_code < 600:
                logger.error("Skipping CFBD school=%s week=%s after HTTP %s", school, week, response.status_code)
                return None
        if attempt < 2:
            time.sleep(2 ** attempt)
    logger.error("Skipping CFBD school=%s week=%s after 3 failed attempts; keeping stored box scores", school, week)
    return None
