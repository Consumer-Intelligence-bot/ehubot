"""Page 7: Admin / Governance - internal only."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import pandas as pd
from datetime import datetime

from app import DF_MOTOR, DIMENSIONS
from analytics.demographics import apply_filters
from config import MIN_BASE_PUBLISHABLE

import dash

dash.register_page(__name__, path="/admin", name="Admin")


def layout():
    return dbc.Container(
        [
            dbc.Row(
                [
                    dbc.Col(html.Div(id="admin-kpis"), md=12),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(html.Div(id="admin-distribution"), md=6),
                    dbc.Col(html.Div(id="admin-config"), md=6),
                ],
            ),
        ],
        fluid=True,
    )


@callback(
    [Output("admin-kpis", "children"), Output("admin-distribution", "children"), Output("admin-config", "children")],
    [Input("url", "pathname")],
    prevent_initial_call=False,
)
def update_admin(_path):
    total = len(DF_MOTOR)
    eligible = 0
    for ins in DIMENSIONS["DimInsurer"]["Insurer"]:
        df = apply_filters(DF_MOTOR, insurer=ins)
        if len(df) >= MIN_BASE_PUBLISHABLE:
            eligible += 1
    suppressed = len(DIMENSIONS["DimInsurer"]) - eligible

    max_ym = DF_MOTOR["RenewalYearMonth"].max()
    freshness = "N/A"
    if pd.notna(max_ym):
        y, m = int(max_ym // 100), int(max_ym % 100)
        freshness = "%d days" % 30  # Simplified

    kpis = dbc.Row(
        [
            dbc.Col(dbc.Card([dbc.CardHeader("Total Respondents"), dbc.CardBody(str(total))]), md=3),
            dbc.Col(dbc.Card([dbc.CardHeader("Eligible Insurers"), dbc.CardBody(str(eligible))]), md=3),
            dbc.Col(dbc.Card([dbc.CardHeader("Suppressed"), dbc.CardBody(str(suppressed))]), md=3),
            dbc.Col(dbc.Card([dbc.CardHeader("Data Freshness"), dbc.CardBody(freshness)]), md=3),
        ]
    )

    by_month = DF_MOTOR.groupby("RenewalYearMonth").size().reset_index(name="count")
    fig = go.Figure(go.Bar(x=by_month["RenewalYearMonth"].astype(str), y=by_month["count"]))
    fig = fig.update_layout(title="Respondents by Renewal Month")
    dist_div = dcc.Graph(figure=fig)

    config_text = """
    MIN_BASE_PUBLISHABLE: 50
    MIN_BASE_INDICATIVE: 30
    MIN_BASE_MARKET: 100
    MIN_BASE_FLOW_CELL: 10
    PRIOR_STRENGTH: 30
    """
    config_div = html.Pre(config_text, className="small bg-light p-3")

    return kpis, dist_div, config_div
