"""Page 4: Channel and PCW Analysis."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go

from shared import DF_MOTOR, DIMENSIONS
from analytics.channels import calc_channel_usage, calc_quote_buy_mismatch
from analytics.demographics import apply_filters
from analytics.suppression import check_suppression
from components.filters import insurer_dropdown, age_band_dropdown, region_dropdown, payment_type_dropdown, product_toggle, time_window_dropdown
from components.filter_bar import filter_bar
from components.cards import kpi_card
from components.branded_chart import create_branded_figure
from auth.access import get_authorized_insurers

import dash

dash.register_page(__name__, path="/channel-pcw", name="Channel & PCW")


def layout():
    all_insurers = DIMENSIONS["DimInsurer"]["Insurer"].dropna().astype(str).tolist()
    authorized = get_authorized_insurers(all_insurers)
    dim_insurer = [{"Insurer": i, "value": i, "label": i} for i in authorized]
    dim_age = DIMENSIONS["DimAgeBand"].to_dict("records")
    dim_region = DIMENSIONS["DimRegion"].to_dict("records")
    dim_payment = DIMENSIONS["DimPaymentType"].to_dict("records")

    return dbc.Container(
        [
            dbc.Row(
                [
                    dbc.Col(insurer_dropdown("insurer-ch", dim_insurer), md=2),
                    dbc.Col(age_band_dropdown("age-ch", dim_age), md=2),
                    dbc.Col(region_dropdown("region-ch", dim_region), md=2),
                    dbc.Col(payment_type_dropdown("payment-ch", dim_payment), md=2),
                    dbc.Col(product_toggle("product-ch", "Motor"), md=2),
                    dbc.Col(time_window_dropdown("time-ch", "24"), md=2),
                ],
                className="mb-2",
            ),
            html.Div(id="filter-bar-ch"),
            dbc.Row(
                [dbc.Col(html.Div(id="mismatch-ch"), md=6), dbc.Col(html.Div(id="channel-usage-ch"), md=6)],
                className="mb-4",
            ),
        ],
        fluid=True,
    )


def _norm(val):
    return None if val in (None, "ALL", "") else val


@callback(
    [Output("filter-bar-ch", "children"), Output("mismatch-ch", "children"), Output("channel-usage-ch", "children")],
    [Input("insurer-ch", "value"), Input("age-ch", "value"), Input("region-ch", "value"), Input("payment-ch", "value"), Input("product-ch", "value"), Input("time-ch", "value")],
)
def update_channel(insurer, age_band, region, payment_type, product, time_window):
    product = product or "Motor"
    tw = int(time_window or 24)
    age_band, region, payment_type = _norm(age_band), _norm(region), _norm(payment_type)
    df_ins = apply_filters(DF_MOTOR, insurer=insurer, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
    df_mkt = apply_filters(DF_MOTOR, insurer=None, product=product, time_window_months=tw, age_band=age_band, region=region, payment_type=payment_type)
    sup = check_suppression(df_ins, df_mkt)
    filter_bar_el = filter_bar(age_band, region, payment_type)

    mis_ins = calc_quote_buy_mismatch(df_ins) if insurer and sup.can_show_insurer else None
    mis_mkt = calc_quote_buy_mismatch(df_mkt)
    mismatch_div = kpi_card("Quote-to-Buy Mismatch", mis_ins, mis_mkt) if mis_mkt is not None else html.P("Data not available", className="text-muted")

    ch = calc_channel_usage(df_ins if insurer and sup.can_show_insurer else df_mkt)
    if ch is not None and len(ch) > 0:
        fig = go.Figure(go.Bar(x=ch.values, y=ch.index, orientation="h"))
        fig = create_branded_figure(fig, title="Channel Usage")
        channel_div = dcc.Graph(figure=fig)
    else:
        channel_div = html.P("Data not available", className="text-muted")

    return filter_bar_el, mismatch_div, channel_div
