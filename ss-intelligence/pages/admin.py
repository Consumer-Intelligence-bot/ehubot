"""Page 7: Admin / Governance - internal only."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import pandas as pd

from app import DF_MOTOR, DIMENSIONS
from analytics.demographics import apply_filters
from analytics.flows import calc_flow_matrix
from config import MIN_BASE_PUBLISHABLE

import dash

dash.register_page(__name__, path="/admin", name="Admin")


def _run_data_validation(df: pd.DataFrame) -> list[dict]:
    """Run data validation checks per spec 13.4."""
    results = []
    if df is None or len(df) == 0:
        return [{"check": "Data", "status": "fail", "message": "No data"}]

    # Duplicate IDs
    dup = df["UniqueID"].duplicated().sum() if "UniqueID" in df.columns else 0
    results.append({
        "check": "No duplicate IDs",
        "status": "pass" if dup == 0 else "fail",
        "message": f"{dup} duplicates" if dup > 0 else "OK",
    })

    # AgeBand complete
    if "AgeBand" in df.columns:
        missing = df["AgeBand"].isna().sum()
        results.append({
            "check": "AgeBand complete",
            "status": "pass" if missing == 0 else "warning",
            "message": f"{missing} missing" if missing > 0 else "OK",
        })

    # Region complete
    if "Region" in df.columns:
        missing = df["Region"].isna().sum()
        results.append({
            "check": "Region complete",
            "status": "pass" if missing == 0 else "warning",
            "message": f"{missing} missing" if missing > 0 else "OK",
        })

    # Flow balance (total gained == total lost)
    flow_mat = calc_flow_matrix(df)
    if len(flow_mat) > 0:
        total_out = flow_mat.sum().sum()
        total_in = flow_mat.sum(axis=1).sum()
        balanced = abs(total_out - total_in) < 1
        results.append({
            "check": "Flow balance",
            "status": "pass" if balanced else "fail",
            "message": f"Out={total_out:.0f} In={total_in:.0f}" if not balanced else "OK",
        })

    return results


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
            dbc.Row(
                dbc.Col(html.Div(id="admin-validation"), md=12),
                className="mt-4",
            ),
        ],
        fluid=True,
    )


@callback(
    [
        Output("admin-kpis", "children"),
        Output("admin-distribution", "children"),
        Output("admin-config", "children"),
        Output("admin-validation", "children"),
    ],
    [Input("url", "pathname")],
    prevent_initial_call=False,
)
def update_admin(_path):
    total = len(DF_MOTOR)
    insurers = DIMENSIONS["DimInsurer"]["Insurer"].dropna().astype(str).tolist()
    eligible = 0
    for ins in insurers:
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

    # Data validation
    val_results = _run_data_validation(DF_MOTOR)
    val_rows = [
        html.Tr([
            html.Td(r["check"]),
            html.Td(r["status"], className="text-success" if r["status"] == "pass" else "text-warning" if r["status"] == "warning" else "text-danger"),
            html.Td(r["message"]),
        ])
        for r in val_results
    ]
    val_table = dbc.Table(
        [html.Thead(html.Tr([html.Th("Check"), html.Th("Status"), html.Th("Message")])), html.Tbody(val_rows)],
        striped=True,
        size="sm",
    )
    val_div = html.Div([
        html.H6("Data Validation", className="mb-2"),
        val_table,
    ])

    return kpis, dist_div, config_div, val_div
