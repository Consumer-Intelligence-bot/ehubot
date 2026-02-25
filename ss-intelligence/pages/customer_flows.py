"""Page 6: Customer Flows."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from app import DF_MOTOR, DIMENSIONS
from analytics.flows import calc_net_flow, calc_top_sources, calc_top_destinations
from analytics.demographics import apply_filters
from analytics.suppression import check_suppression
from components.filters import insurer_dropdown, age_band_dropdown, region_dropdown, payment_type_dropdown, product_toggle, time_window_dropdown
from components.filter_bar import filter_bar
from components.cards import kpi_card
from components.branded_chart import create_branded_figure
from auth.access import get_authorized_insurers
import dash
dash.register_page(__name__, path="/customer-flows", name="Customer Flows")

def layout():
    all_insurers = DIMENSIONS["DimInsurer"]["Insurer"].dropna().astype(str).tolist()
    authorized = get_authorized_insurers(all_insurers)
    dim_insurer = [{"Insurer": i, "value": i, "label": i} for i in authorized]
    dim_age = DIMENSIONS["DimAgeBand"].to_dict("records")
    dim_region = DIMENSIONS["DimRegion"].to_dict("records")
    dim_payment = DIMENSIONS["DimPaymentType"].to_dict("records")
    return dbc.Container([
        dbc.Row([
            dbc.Col(insurer_dropdown("insurer-cf", dim_insurer), md=2),
            dbc.Col(age_band_dropdown("age-cf", dim_age), md=2),
            dbc.Col(region_dropdown("region-cf", dim_region), md=2),
            dbc.Col(payment_type_dropdown("payment-cf", dim_payment), md=2),
            dbc.Col(product_toggle("product-cf", "Motor"), md=2),
            dbc.Col(time_window_dropdown("time-cf", "24"), md=2),
        ], className="mb-2"),
        html.Div(id="filter-bar-cf"),
        dbc.Row([dbc.Col(html.Div(id="net-flow-cf"), md=12)], className="mb-4"),
        dbc.Row([dbc.Col(html.Div(id="sources-cf"), md=6), dbc.Col(html.Div(id="destinations-cf"), md=6)], className="mb-4"),
    ], fluid=True)

def _norm(val):
    return None if val in (None, "ALL", "") else val

@callback(
    [Output("filter-bar-cf", "children"), Output("net-flow-cf", "children"), Output("sources-cf", "children"), Output("destinations-cf", "children")],
    [Input("insurer-cf", "value"), Input("age-cf", "value"), Input("region-cf", "value"), Input("payment-cf", "value"), Input("product-cf", "value"), Input("time-cf", "value")],
)
def update_flows(insurer, age_band, region, payment_type, product, time_window):
    product = product or "Motor"
    tw = int(time_window or 24)
    age_band, region, payment_type = _norm(age_band), _norm(region), _norm(payment_type)
    df = apply_filters(DF_MOTOR, insurer=insurer, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
    df_mkt = apply_filters(DF_MOTOR, insurer=None, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
    sup = check_suppression(df, df_mkt)
    filter_bar_el = filter_bar(age_band, region, payment_type)
    if not insurer:
        return filter_bar_el, html.P("Select an insurer", className="text-muted"), html.P("Select an insurer", className="text-muted"), html.P("Select an insurer", className="text-muted")
    if not sup.can_show_insurer:
        return filter_bar_el, html.P(sup.message, className="text-muted"), html.Div(), html.Div()
    nf = calc_net_flow(df_mkt, insurer)
    net_div = dbc.Row([
        dbc.Col(kpi_card("Gained", nf["gained"], nf["gained"], format_str="{:.0f}"), md=4),
        dbc.Col(kpi_card("Lost", nf["lost"], nf["lost"], format_str="{:.0f}"), md=4),
        dbc.Col(kpi_card("Net", nf["net"], nf["net"], format_str="{:.0f}"), md=4),
    ])
    src = calc_top_sources(df_mkt, insurer, 10)
    dst = calc_top_destinations(df_mkt, insurer, 10)
    fig_src = go.Figure(go.Bar(x=src.values, y=src.index, orientation="h")) if len(src) > 0 else go.Figure()
    fig_dst = go.Figure(go.Bar(x=dst.values, y=dst.index, orientation="h")) if len(dst) > 0 else go.Figure()
    fig_src = create_branded_figure(fig_src, title="Gaining From")
    fig_dst = create_branded_figure(fig_dst, title="Losing To")
    return filter_bar_el, net_div, dcc.Graph(figure=fig_src), dcc.Graph(figure=fig_dst)
