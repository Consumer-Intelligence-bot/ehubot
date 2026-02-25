"""Page 1: Market Overview - public, no demographics."""
import pandas as pd
from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import DF_MOTOR, DF_ALL, DIMENSIONS
from analytics.rates import calc_shopping_rate, calc_switching_rate, calc_retention_rate
from analytics.demographics import apply_filters
from analytics.reasons import calc_reason_ranking
from analytics.channels import calc_channel_usage, calc_pcw_usage
from components.cards import kpi_card
from components.filters import product_toggle, time_window_dropdown
from components.branded_chart import create_branded_figure

import dash
dash.register_page(__name__, path="/", name="Market Overview")

def layout():
    return dbc.Container(
        [
            dbc.Row(
                [
                    dbc.Col(product_toggle("product-mo", "Motor"), md=2),
                    dbc.Col(time_window_dropdown("time-window-mo", "24"), md=2),
                ],
                className="mb-3",
            ),
            dbc.Row(
                [
                    dbc.Col(html.Div(id="kpi-shop-mo"), md=4),
                    dbc.Col(html.Div(id="kpi-switch-mo"), md=4),
                    dbc.Col(html.Div(id="kpi-retain-mo"), md=4),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(html.Div(id="market-trend-mo"), md=6),
                    dbc.Col(html.Div(id="why-shop-mo"), md=6),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(html.Div(id="channel-usage-mo"), md=6),
                    dbc.Col(html.Div(id="pcw-share-mo"), md=6),
                ],
            ),
        ],
        fluid=True,
    )


@callback(
    [
        Output("kpi-shop-mo", "children"),
        Output("kpi-switch-mo", "children"),
        Output("kpi-retain-mo", "children"),
        Output("market-trend-mo", "children"),
        Output("why-shop-mo", "children"),
        Output("channel-usage-mo", "children"),
        Output("pcw-share-mo", "children"),
    ],
    [Input("product-mo", "value"), Input("time-window-mo", "value")],
)
def update_market_overview(product, time_window):
    product = product or "Motor"
    tw = int(time_window or 24)
    try:
        from app import DF_HOME
        df = DF_MOTOR if product == "Motor" else (DF_HOME if DF_HOME is not None else DF_MOTOR)
    except Exception:
        df = DF_MOTOR
    df_market = apply_filters(df, product=product, time_window_months=tw)

    # Trend: retention by month
    by_month = df_market.groupby("RenewalYearMonth").agg(
        retained=("IsRetained", "sum"),
        total=("UniqueID", "count"),
    ).reset_index()
    by_month["retention"] = by_month["retained"] / by_month["total"]
    fig_trend = go.Figure()
    fig_trend.add_trace(go.Scatter(x=by_month["RenewalYearMonth"].astype(str), y=by_month["retention"], mode="lines+markers"))
    fig_trend = create_branded_figure(fig_trend, title="Market Retention Trend")

    # Why Shop - reason ranking (Q8 if available)
    why = calc_reason_ranking(df_market, "Q8", 5) if "Q8" in df_market.columns else []
    if why:
        why_df = pd.DataFrame(why)
        if "pct" in why_df.columns:
            why_df["pct"] = (why_df["pct"] * 100).round(1).astype(str) + "%"
        why_table = dbc.Table.from_dataframe(why_df[["reason", "pct"]] if "reason" in why_df.columns else why_df, striped=True, size="sm")
    else:
        why_table = html.P("Data not available", className="text-muted")

    # Channel usage
    ch = calc_channel_usage(df_market)
    if ch is not None and len(ch) > 0:
        fig_ch = go.Figure(go.Bar(x=ch.values, y=ch.index, orientation="h"))
        fig_ch = create_branded_figure(fig_ch, title="Channel Usage")
        channel_div = dcc.Graph(figure=fig_ch)
    else:
        channel_div = html.P("Data not available", className="text-muted")

    # PCW share + footer
    pcw = calc_pcw_usage(df_market)
    if pcw is not None and len(pcw) > 0:
        fig_pcw = go.Figure(go.Pie(labels=pcw.index, values=pcw.values, hole=0.4))
        fig_pcw = create_branded_figure(fig_pcw, title="PCW Market Share")
        pcw_content = dcc.Graph(figure=fig_pcw)
    else:
        pcw_content = html.P("Data not available", className="text-muted")

    n = len(df_market)
    max_ym = df_market["RenewalYearMonth"].max() if "RenewalYearMonth" in df_market.columns else ""
    period_str = str(max_ym) if pd.notna(max_ym) and max_ym else "—"
    footer = html.Div(
        f"Data period: {period_str} | n={n:,} | (c) Consumer Intelligence 2026",
        className="text-muted small mt-4",
    )
    pcw_div = html.Div([pcw_content, footer])

    shop = calc_shopping_rate(df_market)
    switch = calc_switching_rate(df_market)
    retain = calc_retention_rate(df_market)
    kpi_shop = kpi_card("Shopping Rate", shop, shop, format_str="{:.0%}")
    kpi_switch = kpi_card("Switching Rate", switch, switch, format_str="{:.0%}")
    kpi_retain = kpi_card("Retention Rate", retain, retain, format_str="{:.0%}")

    return (
        kpi_shop,
        kpi_switch,
        kpi_retain,
        dcc.Graph(figure=fig_trend),
        html.Div([html.H6("Why Customers Shop", className="mb-2"), why_table]),
        channel_div,
        pcw_div,
    )
