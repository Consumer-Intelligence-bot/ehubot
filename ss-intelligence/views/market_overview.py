"""
Market Overview - defined outside Dash Pages to avoid duplicate callback registration.
Rendered when path="/" via app.py routing.
"""
import pandas as pd
from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go

from analytics.rates import calc_shopping_rate, calc_switching_rate, calc_retention_rate
from analytics.demographics import apply_filters
from analytics.reasons import calc_reason_ranking
from analytics.channels import calc_channel_usage, calc_pcw_usage
from components.cards import kpi_card
from components.branded_chart import create_branded_figure
from shared import format_year_month


def layout(DF_MOTOR, DF_HOME):
    """Return Market Overview layout. Uses global filter bar from app layout."""
    return dbc.Container(
        [html.Div(id="market-overview-content-mo")],
        fluid=True,
        className="mb-5",
    )


def register_callbacks(app, DF_MOTOR, DF_HOME):
    """Register Market Overview callbacks. Called from app.py after app creation."""

    @app.callback(
        Output("market-overview-content-mo", "children"),
        [Input("global-product", "value"), Input("global-time-window", "value")],
    )
    def update_market_overview(product, time_window):
        product = product or "Motor"
        tw = int(time_window or 24)
        df = DF_MOTOR if product == "Motor" else (DF_HOME if DF_HOME is not None and len(DF_HOME) > 0 else DF_MOTOR)
        df_market = apply_filters(df, product=product, time_window_months=tw)

        by_month = df_market.groupby("RenewalYearMonth").agg(
            retained=("IsRetained", "sum"),
            total=("UniqueID", "count"),
        ).reset_index()
        by_month["retention"] = by_month["retained"] / by_month["total"]
        by_month["month_label"] = by_month["RenewalYearMonth"].apply(format_year_month)
        fig_trend = go.Figure()
        fig_trend.add_trace(go.Scatter(x=by_month["month_label"], y=by_month["retention"], mode="lines+markers"))
        fig_trend = create_branded_figure(fig_trend, title="Market Retention Trend")

        why = calc_reason_ranking(df_market, "Q8", 5) if "Q8" in df_market.columns else []
        if why:
            why_df = pd.DataFrame(why)
            if "pct" in why_df.columns:
                why_df["pct"] = (why_df["pct"] * 100).round(1).astype(str) + "%"
            why_table = dbc.Table.from_dataframe(why_df[["reason", "pct"]] if "reason" in why_df.columns else why_df, striped=True, size="sm")
        else:
            why_table = html.P("Data not available", className="text-muted")

        ch = calc_channel_usage(df_market)
        if ch is not None and len(ch) > 0:
            fig_ch = go.Figure(go.Bar(x=ch.values, y=ch.index, orientation="h"))
            fig_ch = create_branded_figure(fig_ch, title="Channel Usage")
            channel_div = dcc.Graph(figure=fig_ch)
        else:
            channel_div = html.P("Data not available", className="text-muted")

        pcw = calc_pcw_usage(df_market)
        if pcw is not None and len(pcw) > 0:
            fig_pcw = go.Figure(go.Pie(labels=pcw.index, values=pcw.values, hole=0.4))
            fig_pcw = create_branded_figure(fig_pcw, title="PCW Market Share")
            pcw_content = dcc.Graph(figure=fig_pcw)
        else:
            pcw_content = html.P("Data not available", className="text-muted")

        n = len(df_market)
        max_ym = df_market["RenewalYearMonth"].max() if "RenewalYearMonth" in df_market.columns else ""
        period_str = format_year_month(max_ym) if pd.notna(max_ym) and max_ym else "—"
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

        return dbc.Container(
            [
                dbc.Row(
                    [dbc.Col(kpi_shop, md=4), dbc.Col(kpi_switch, md=4), dbc.Col(kpi_retain, md=4)],
                    className="mb-4",
                ),
                dbc.Row(
                    [
                        dbc.Col(dcc.Graph(figure=fig_trend), md=6),
                        dbc.Col(html.Div([html.H6("Why Customers Shop", className="mb-2"), why_table]), md=6),
                    ],
                    className="mb-4",
                ),
                dbc.Row([dbc.Col(channel_div, md=6), dbc.Col(pcw_div, md=6)]),
            ],
            fluid=True,
        )
