"""Page 4: Channel and PCW Analysis."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go

from shared import DF_MOTOR
from analytics.channels import calc_channel_usage, calc_quote_buy_mismatch
from analytics.demographics import apply_filters
from analytics.suppression import check_suppression
from components.filter_bar import filter_bar
from components.cards import kpi_card
from components.branded_chart import create_branded_figure
import dash

dash.register_page(__name__, path="/channel-pcw", name="Channel & PCW")


def layout():
    return dbc.Container(
        [
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
    [Input("global-insurer", "value"), Input("global-age-band", "value"), Input("global-region", "value"), Input("global-payment-type", "value"), Input("global-product", "value"), Input("global-time-window", "value")],
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
