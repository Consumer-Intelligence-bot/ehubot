"""Page 2: Insurer Diagnostic - single insurer deep-dive."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go

from shared import DF_MOTOR
from analytics.rates import calc_retention_rate
from analytics.bayesian import bayesian_smooth_rate
from analytics.bayesian_precompute import get_cached_rate
from analytics.demographics import apply_filters, get_active_filters
from analytics.suppression import check_suppression
from analytics.flows import calc_net_flow, calc_top_sources, calc_top_destinations
from analytics.reasons import calc_reason_comparison
from components.cards import kpi_card
from components.filter_bar import filter_bar
from components.confidence_banner import confidence_banner
from components.dual_table import dual_table
from components.branded_chart import create_branded_figure
import dash

dash.register_page(__name__, path="/insurer-diagnostic", name="Insurer Diagnostic")


def layout():
    return dbc.Container(
        [
            html.H2("Insurer Diagnostic", className="mb-3 fw-bold"),
            html.Div(id="filter-bar-diag"),
            html.Div(id="confidence-banner-diag"),
            dbc.Row(
                [
                    dbc.Col(html.Div(id="retention-card-diag"), md=4),
                    dbc.Col(html.Div(id="net-flow-diag"), md=8),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(html.Div(id="flows-sources-diag"), md=6),
                    dbc.Col(html.Div(id="flows-dest-diag"), md=6),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(html.Div(id="why-stay-diag"), md=6),
                    dbc.Col(html.Div(id="why-leave-diag"), md=6),
                ],
            ),
        ],
        fluid=True,
    )


def _norm(val):
    if val in (None, "ALL", ""):
        return None
    return val


@callback(
    [
        Output("filter-bar-diag", "children"),
        Output("confidence-banner-diag", "children"),
        Output("retention-card-diag", "children"),
        Output("net-flow-diag", "children"),
        Output("flows-sources-diag", "children"),
        Output("flows-dest-diag", "children"),
        Output("why-stay-diag", "children"),
        Output("why-leave-diag", "children"),
    ],
    [
        Input("global-insurer", "value"),
        Input("global-age-band", "value"),
        Input("global-region", "value"),
        Input("global-payment-type", "value"),
        Input("global-product", "value"),
        Input("global-time-window", "value"),
    ],
)
def update_insurer_diagnostic(insurer, age_band, region, payment_type, product, time_window):
    product = product or "Motor"
    tw = int(time_window or 24)
    age_band = _norm(age_band)
    region = _norm(region)
    payment_type = _norm(payment_type)

    df_ins = apply_filters(DF_MOTOR, insurer=insurer, age_band=age_band, region=region, payment_type=payment_type, product=product, time_window_months=tw)
    df_mkt = apply_filters(DF_MOTOR, insurer=None, age_band=age_band, region=region, payment_type=payment_type, product=product, time_window_months=tw)

    sup = check_suppression(df_ins, df_mkt, active_filters=get_active_filters(age_band, region, payment_type))
    filter_bar_el = filter_bar(age_band, region, payment_type)
    tw_str = "%d months" % tw
    conf_banner = confidence_banner(df_ins.shape[0], tw_str, age_band, region, payment_type, suppression_message=sup.message)

    # Retention card
    if sup.can_show_insurer and insurer:
        market_ret = calc_retention_rate(df_mkt)
        # Use cache only when no demographic filters (cache is insurer × product × time_window only)
        cached = get_cached_rate(insurer, product, tw) if not (age_band or region or payment_type) else None
        if cached:
            bay = cached
        else:
            retained = (df_ins["IsRetained"] & ~df_ins["IsNewToMarket"]).sum()
            total = len(df_ins[~df_ins["IsNewToMarket"]])
            bay = bayesian_smooth_rate(int(retained), total, market_ret) if total > 0 else {"posterior_mean": market_ret, "ci_lower": market_ret, "ci_upper": market_ret}
        ret_card = kpi_card("Your Retention", bay["posterior_mean"], market_ret, ci_lower=bay.get("ci_lower"), ci_upper=bay.get("ci_upper"))
    else:
        ret_card = kpi_card("Your Retention", None, calc_retention_rate(df_mkt), suppression_message=sup.message)

    # Net flow (use filtered df for demographic consistency)
    if insurer and sup.can_show_insurer:
        nf = calc_net_flow(df_mkt, insurer)
        net_div = dbc.Row([
            dbc.Col(kpi_card("Gained", nf["gained"], nf["gained"], format_str="{:.0f}"), md=4),
            dbc.Col(kpi_card("Lost", nf["lost"], nf["lost"], format_str="{:.0f}"), md=4),
            dbc.Col(kpi_card("Net", nf["net"], nf["net"], format_str="{:.0f}"), md=4),
        ])
    else:
        net_div = html.P("Select an insurer", className="text-muted")

    # Top sources / destinations (use filtered df for demographic consistency)
    if insurer and sup.can_show_insurer:
        src = calc_top_sources(df_mkt, insurer, 10)
        dst = calc_top_destinations(df_mkt, insurer, 10)
        # Sort ascending so largest appears at top (Plotly renders first y at bottom)
        src = src.sort_values(ascending=True) if len(src) > 0 else src
        dst = dst.sort_values(ascending=True) if len(dst) > 0 else dst
        fig_src = go.Figure(go.Bar(x=src.values, y=src.index, orientation="h")) if len(src) > 0 else go.Figure()
        fig_dst = go.Figure(go.Bar(x=dst.values, y=dst.index, orientation="h")) if len(dst) > 0 else go.Figure()
        fig_src = create_branded_figure(fig_src, title="Top Sources")
        fig_dst = create_branded_figure(fig_dst, title="Top Destinations")
        src_div = dcc.Graph(figure=fig_src)
        dst_div = dcc.Graph(figure=fig_dst)
    else:
        src_div = html.P("Select an insurer", className="text-muted")
        dst_div = html.P("Select an insurer", className="text-muted")

    # Why Stay (Q18), Why Leave (Q31)
    cmp_stay = calc_reason_comparison(df_ins, df_mkt, "Q18", 5) if "Q18" in DF_MOTOR.columns else {"insurer": [], "market": []}
    cmp_leave = calc_reason_comparison(df_ins, df_mkt, "Q31", 5) if "Q31" in DF_MOTOR.columns else {"insurer": [], "market": []}
    stay_tbl = dual_table(cmp_stay.get("insurer"), cmp_stay.get("market"), "Why Customers Stay", "Market", "stay") if cmp_stay else html.P("Data not available")
    leave_tbl = dual_table(cmp_leave.get("insurer"), cmp_leave.get("market"), "Why Customers Leave", "Market", "leave") if cmp_leave else html.P("Data not available")

    return filter_bar_el, conf_banner, ret_card, net_div, src_div, dst_div, stay_tbl, leave_tbl
