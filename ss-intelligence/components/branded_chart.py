"""
Plotly chart wrapper with CI brand standards.
"""
import plotly.graph_objects as go
import plotly.io as pio

from config import (
    CI_MAGENTA,
    CI_GREY,
    CI_GREEN,
    CI_RED,
    CI_BLUE,
    CI_YELLOW,
)


def _create_ci_template():
    """Register CI brand template with Plotly."""
    ci_template = go.layout.Template(
        layout=go.Layout(
            font=dict(family="Segoe UI, Arial, sans-serif", color="#54585A"),
            plot_bgcolor="white",
            paper_bgcolor="white",
            colorway=[CI_MAGENTA, CI_GREY, CI_GREEN, CI_RED, CI_BLUE, CI_YELLOW],
            title_font_size=16,
            title_font_color="#54585A",
        )
    )
    pio.templates["ci_brand"] = ci_template


# Ensure template exists on import and set as default
_create_ci_template()
pio.templates.default = "ci_brand"


def create_branded_figure(
    fig: go.Figure,
    title: str = "",
    show_market_line: bool = False,
    market_value: float | None = None,
) -> go.Figure:
    """
    Apply CI branding to a Plotly figure.
    Optionally add horizontal market reference line.
    """
    fig.update_layout(
        template="ci_brand",
        title=title,
        font=dict(family="Segoe UI, Arial, sans-serif", color="#54585A"),
        margin=dict(l=40, r=20, t=50, b=40),
    )
    if show_market_line and market_value is not None:
        fig.add_hline(
            y=market_value,
            line_dash="dash",
            line_color=CI_GREY,
            annotation_text=f"Market: {market_value:.0%}",
        )
    return fig
