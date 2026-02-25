"""
KPI card component: insurer value, market value, gap.
"""
import dash_bootstrap_components as dbc
from dash import html

from config import (
    CI_MAGENTA,
    CI_GREY,
    CI_GREEN,
    CI_RED,
    NEUTRAL_GAP_THRESHOLD,
)


def _gap_colour(gap, invert_colour):
    """Return colour for gap based on direction and invert."""
    if gap is None:
        return CI_GREY
    if abs(gap) <= NEUTRAL_GAP_THRESHOLD / 100:
        return CI_GREY
    positive_is_good = not invert_colour
    if gap > 0:
        return CI_GREEN if positive_is_good else CI_RED
    return CI_RED if positive_is_good else CI_GREEN


def kpi_card(
    title,
    insurer_value,
    market_value,
    format_str="{:.1%}",
    ci_lower=None,
    ci_upper=None,
    suppression_message=None,
    invert_colour=False,
):
    """
    KPI card showing insurer value, market value, and gap.
    insurer_value=None shows suppression message.
    """
    if insurer_value is not None and market_value is not None:
        gap = insurer_value - market_value
        gap_str = f"{gap:+.1%}"
        gap_col = _gap_colour(gap, invert_colour)
    else:
        gap_str = "-"
        gap_col = CI_GREY

    insurer_display = format_str.format(insurer_value) if insurer_value is not None else "-"
    market_display = format_str.format(market_value) if market_value is not None else "-"

    ci_suffix = ""
    if ci_lower is not None and ci_upper is not None:
        ci_suffix = f" ({format_str.format(ci_lower)} - {format_str.format(ci_upper)})"

    body = []
    if suppression_message and insurer_value is None:
        body.append(html.P(suppression_message, className="text-muted small"))
    else:
        body.append(
            html.Div(
                [
                    html.Div(
                        [html.Span("Your ", className="text-muted"), html.Strong(insurer_display)],
                        style={"color": CI_MAGENTA},
                    ),
                    html.Div(
                        [html.Span("Market: ", className="text-muted"), market_display],
                        style={"color": CI_GREY},
                    ),
                    html.Div(
                        html.Span("Gap: " + gap_str, style={"color": gap_col, "fontWeight": 600}),
                    ),
                    html.Div(ci_suffix, className="small text-muted") if ci_suffix else None,
                ]
            )
        )

    return dbc.Card(
        [
            dbc.CardHeader(title, className="small fw-bold"),
            dbc.CardBody([c for c in body if c is not None]),
        ],
        className="h-100",
    )
