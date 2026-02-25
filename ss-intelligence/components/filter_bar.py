"""
Active Filter Bar: shows when demographics are applied, with Clear All.
"""
from dash import html
import dash_bootstrap_components as dbc

from config import CI_YELLOW, CI_RED
from analytics.demographics import get_active_filters
from config import MIN_ELIGIBLE_INSURERS_WARNING


def filter_bar(
    age_band,
    region,
    payment_type,
    eligible_count=None,
    id_clear="clear-filters-btn",
):
    """Yellow alert bar when filters active. Hidden when no filters."""
    a = None if age_band in (None, "ALL", "") else age_band
    r = None if region in (None, "ALL", "") else region
    p = None if payment_type in (None, "ALL", "") else payment_type
    active = get_active_filters(a, r, p)
    if not active:
        return html.Div(style={"display": "none"})

    filter_text = " | ".join(f"{k}: {v}" for k, v in active.items())
    children = [
        html.Span("Filtered by: ", className="fw-bold"),
        html.Span(filter_text),
        dbc.Button("Clear All Filters", id=id_clear, color="secondary", size="sm", className="ms-3"),
    ]
    if eligible_count is not None and eligible_count < MIN_ELIGIBLE_INSURERS_WARNING:
        children.append(
            html.Div(
                "Fewer than %d insurers meet threshold with current filters." % MIN_ELIGIBLE_INSURERS_WARNING,
                className="mt-2 small",
                style={"color": CI_RED},
            )
        )

    return dbc.Alert(
        children,
        color="warning",
        style={"backgroundColor": CI_YELLOW, "color": "#333"},
        className="mb-2",
    )
