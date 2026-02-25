"""Page 3: Insurer Comparison."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import pandas as pd
from shared import DF_MOTOR, DIMENSIONS
from analytics.rates import calc_retention_rate
from analytics.bayesian import bayesian_smooth_rate
from analytics.demographics import apply_filters
from config import MIN_BASE_PUBLISHABLE
from components.filter_bar import filter_bar
from components.branded_chart import create_branded_figure
from auth.access import get_authorized_insurers
import dash
dash.register_page(__name__, path="/insurer-comparison", name="Insurer Comparison")

def layout():
    return dbc.Container([
        html.Div(id="filter-bar-comp"),
        dbc.Row([dbc.Col(html.Div(id="retention-chart-comp"), md=12)], className="mb-4"),
        dbc.Row([dbc.Col(html.Div(id="metrics-table-comp"), md=12)]),
    ], fluid=True)

def _norm(val):
    return None if val in (None, "ALL", "") else val

@callback(
    [Output("filter-bar-comp", "children"), Output("retention-chart-comp", "children"), Output("metrics-table-comp", "children")],
    [Input("global-age-band", "value"), Input("global-region", "value"), Input("global-payment-type", "value"), Input("global-product", "value"), Input("global-time-window", "value")],
)
def update_comparison(age_band, region, payment_type, product, time_window):
    product = product or "Motor"
    tw = int(time_window or 24)
    age_band, region, payment_type = _norm(age_band), _norm(region), _norm(payment_type)
    df_mkt = apply_filters(DF_MOTOR, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
    market_ret = calc_retention_rate(df_mkt)
    all_insurers = DIMENSIONS["DimInsurer"]["Insurer"].dropna().astype(str).tolist()
    insurers = get_authorized_insurers(all_insurers)
    rows = []
    for ins in insurers:
        df_ins = apply_filters(DF_MOTOR, insurer=ins, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
        if len(df_ins) < MIN_BASE_PUBLISHABLE:
            continue
        retained = (df_ins["IsRetained"] & ~df_ins["IsNewToMarket"]).sum()
        total = len(df_ins[~df_ins["IsNewToMarket"]])
        bay = bayesian_smooth_rate(int(retained), total, market_ret)
        rows.append({"Insurer": ins, "n": total, "Retention": "%.1f%%" % (bay["posterior_mean"] * 100)})
    df_tbl = pd.DataFrame(rows)
    eligible = len(df_tbl)
    filter_bar_el = filter_bar(age_band, region, payment_type, eligible_count=eligible)
    if len(df_tbl) > 0:
        df_tbl["_ret_num"] = df_tbl["Retention"].str.rstrip("%").astype(float)
        df_tbl = df_tbl.sort_values("_ret_num", ascending=False).drop(columns=["_ret_num"])
        ret_vals = df_tbl["Retention"].str.rstrip("%").astype(float)
        fig = go.Figure(go.Bar(x=ret_vals, y=df_tbl["Insurer"], orientation="h"))
        fig = create_branded_figure(fig, title="Retention by Insurer", show_market_line=True, market_value=market_ret)
        chart = dcc.Graph(figure=fig)
        tbl = dbc.Table.from_dataframe(df_tbl, striped=True, size="sm")
    else:
        chart = html.P("No insurers meet threshold", className="text-muted")
        tbl = html.P("No data", className="text-muted")
    return filter_bar_el, chart, tbl
