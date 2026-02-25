"""Page 5: Price Sensitivity."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from app import DF_MOTOR, DIMENSIONS
from analytics.price import calc_price_direction_dist
from analytics.demographics import apply_filters
from analytics.suppression import check_suppression
from components.filters import insurer_dropdown, age_band_dropdown, region_dropdown, payment_type_dropdown, product_toggle, time_window_dropdown
from components.filter_bar import filter_bar
from components.branded_chart import create_branded_figure
from auth.access import get_authorized_insurers
import dash
dash.register_page(__name__, path="/price-sensitivity", name="Price Sensitivity")

def layout():
    all_insurers = DIMENSIONS["DimInsurer"]["Insurer"].dropna().astype(str).tolist()
    authorized = get_authorized_insurers(all_insurers)
    dim_insurer = [{"Insurer": i, "value": i, "label": i} for i in authorized]
    dim_age = DIMENSIONS["DimAgeBand"].to_dict("records")
    dim_region = DIMENSIONS["DimRegion"].to_dict("records")
    dim_payment = DIMENSIONS["DimPaymentType"].to_dict("records")
    return dbc.Container([
        dbc.Row([
            dbc.Col(insurer_dropdown("insurer-ps", dim_insurer), md=2),
            dbc.Col(age_band_dropdown("age-ps", dim_age), md=2),
            dbc.Col(region_dropdown("region-ps", dim_region), md=2),
            dbc.Col(payment_type_dropdown("payment-ps", dim_payment), md=2),
            dbc.Col(product_toggle("product-ps", "Motor"), md=2),
            dbc.Col(time_window_dropdown("time-ps", "24"), md=2),
        ], className="mb-2"),
        html.Div(id="filter-bar-ps"),
        dbc.Row([dbc.Col(html.Div(id="price-direction-ps"), md=12)], className="mb-4"),
    ], fluid=True)

def _norm(val):
    return None if val in (None, "ALL", "") else val

@callback(
    [Output("filter-bar-ps", "children"), Output("price-direction-ps", "children")],
    [Input("insurer-ps", "value"), Input("age-ps", "value"), Input("region-ps", "value"), Input("payment-ps", "value"), Input("product-ps", "value"), Input("time-ps", "value")],
)
def update_price(insurer, age_band, region, payment_type, product, time_window):
    product = product or "Motor"
    tw = int(time_window or 24)
    age_band, region, payment_type = _norm(age_band), _norm(region), _norm(payment_type)
    df_ins = apply_filters(DF_MOTOR, insurer=insurer, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
    df_mkt = apply_filters(DF_MOTOR, insurer=None, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
    sup = check_suppression(df_ins, df_mkt)
    filter_bar_el = filter_bar(age_band, region, payment_type)
    dist_ins = calc_price_direction_dist(df_ins) if insurer and sup.can_show_insurer else None
    dist_mkt = calc_price_direction_dist(df_mkt)
    if dist_mkt is not None and len(dist_mkt) > 0:
        fig = go.Figure()
        if dist_ins is not None and len(dist_ins) > 0:
            fig.add_trace(go.Bar(name="Your Customers", x=dist_ins.index, y=dist_ins.values, marker_color="#981D97"))
        fig.add_trace(go.Bar(name="Market", x=dist_mkt.index, y=dist_mkt.values, marker_color="#54585A"))
        fig.update_layout(barmode="group")
        fig = create_branded_figure(fig, title="Price Direction Distribution")
        price_div = dcc.Graph(figure=fig)
    else:
        price_div = html.P("Data not available", className="text-muted")
    return filter_bar_el, price_div
