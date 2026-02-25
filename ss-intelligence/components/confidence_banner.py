"""
Confidence banner: data reliability, n, filters, time window.
"""
from dash import html
import dash_bootstrap_components as dbc

from config import CI_GREEN, CI_RED, CI_YELLOW
from analytics.suppression import get_confidence_level
from analytics.demographics import get_active_filters


def _confidence_info(n):
    """Return level, colour, label for n."""
    level = get_confidence_level(n)
    if level == "publishable":
        return {"level": "HIGH", "colour": CI_GREEN, "icon": "OK", "label": "High confidence"}
    if level == "indicative":
        return {"level": "MEDIUM", "colour": CI_YELLOW, "icon": "OK", "label": "Indicative - small sample"}
    return {"level": "INSUFFICIENT", "colour": CI_RED, "icon": "X", "label": "Insufficient data"}


def confidence_banner(
    n,
    time_window,
    age_band=None,
    region=None,
    payment_type=None,
    suppression_message=None,
    id_prefix="",
):
    """Banner showing confidence level, n, active filters, time window."""
    info = _confidence_info(n)
    a = None if age_band in (None, "ALL", "") else age_band
    r = None if region in (None, "ALL", "") else region
    p = None if payment_type in (None, "ALL", "") else payment_type
    active = get_active_filters(a, r, p)
    filter_str = " | ".join(f"{k}: {v}" for k, v in active.items()) if active else "All"

    if info["level"] == "INSUFFICIENT" and suppression_message:
        return dbc.Alert(
            suppression_message,
            color="danger",
            className="mb-2",
        )

    text = "%s %s | Based on %d renewals | %s | %s" % (
        info["icon"],
        info["label"],
        n,
        filter_str,
        time_window,
    )
    return dbc.Alert(
        text,
        color="light",
        className="mb-2 small",
        style={"borderLeft": "4px solid " + info["colour"]},
    )
