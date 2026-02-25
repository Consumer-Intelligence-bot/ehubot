"""
Shopping & Switching Intelligence - Dash application.
"""
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import dash
from dash import html, dcc, callback, Input, Output
import dash_bootstrap_components as dbc

# Add project root to path
sys_path = Path(__file__).resolve().parent
if str(sys_path) not in sys.path:
    sys.path.insert(0, str(sys_path))

from shared import DF_MOTOR, DF_HOME, DIMENSIONS, DF_ALL
from auth.access import get_authorized_insurers
from components.global_filters import global_filter_bar

app = dash.Dash(
    __name__,
    use_pages=True,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    suppress_callback_exceptions=True,
)

# Market Overview lives outside Dash Pages to avoid duplicate callback registration for path="/"
from views.market_overview import layout as market_overview_layout, register_callbacks as register_market_overview
register_market_overview(app, DF_MOTOR, DF_HOME)


NAV_ITEMS = [
    ("Market Overview", "/"),
    ("Insurer Diagnostic", "/insurer-diagnostic"),
    ("Comparison", "/insurer-comparison"),
    ("Channel & PCW", "/channel-pcw"),
    ("Price Sensitivity", "/price-sensitivity"),
    ("Customer Flows", "/customer-flows"),
    ("Admin", "/admin"),
]


@callback(
    Output("main-nav", "children"),
    Input("url", "pathname"),
)
def update_nav_active(pathname):
    pathname = pathname or "/"
    return [
        dbc.NavItem(
            dbc.NavLink(label, href=href, active=pathname == href or (href == "/" and pathname == "/"))
        )
        for label, href in NAV_ITEMS
    ]


def _build_global_filter_bar():
    """Build global filter bar with dimensions. Called at layout time."""
    all_insurers = DIMENSIONS["DimInsurer"]["Insurer"].dropna().astype(str).tolist()
    authorized = get_authorized_insurers(all_insurers)
    dim_insurer = [{"Insurer": i, "value": i, "label": i, "SortOrder": idx} for idx, i in enumerate(authorized)]
    dim_age = DIMENSIONS["DimAgeBand"].to_dict("records")
    dim_region = DIMENSIONS["DimRegion"].to_dict("records")
    dim_payment = DIMENSIONS["DimPaymentType"].to_dict("records")
    return global_filter_bar(dim_insurer, dim_age, dim_region, dim_payment)


@callback(
    Output("page-content", "children"),
    Input("url", "pathname"),
)
def display_page(pathname):
    if pathname == "/" or pathname is None:
        return market_overview_layout(DF_MOTOR, DF_HOME)
    return dbc.Container(dash.page_container, fluid=True, className="mb-5")


@callback(
    Output("global-filter-container", "className"),
    Input("url", "pathname"),
)
def toggle_global_filters(pathname):
    """Hide filter bar on Admin page; show on all others."""
    return "d-none" if pathname == "/admin" else "mb-3"


app.layout = html.Div(
    [
        dcc.Location(id="url", refresh=False),
        dbc.Navbar(
            dbc.Container(
                [
                    dbc.NavbarBrand("Shopping & Switching Intelligence", href="/", className="fw-bold"),
                    dbc.Nav(
                        id="main-nav",
                        navbar=True,
                        className="ms-auto",
                    ),
                ],
                fluid=True,
            ),
            color="dark",
            dark=True,
            className="mb-3",
        ),
        html.Div(_build_global_filter_bar(), id="global-filter-container", className="mb-3"),
        html.Div(id="page-content"),
    ]
)


server = app.server

# Basic auth (optional MVP - enable when BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD set)
_auth_user = os.getenv("BASIC_AUTH_USERNAME")
_auth_pass = os.getenv("BASIC_AUTH_PASSWORD")
if _auth_user and _auth_pass:
    from dash_auth import BasicAuth
    BasicAuth(app, {_auth_user: _auth_pass})

if __name__ == "__main__":
    # use_reloader=False prevents duplicate callback registration (reloader runs app twice)
    app.run(debug=True, host="0.0.0.0", port=8050, use_reloader=False)
