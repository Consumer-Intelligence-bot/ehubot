"""
Shopping & Switching Intelligence - Dash application.
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import dash
from dash import html, dcc
import dash_bootstrap_components as dbc

# Add project root to path
sys_path = Path(__file__).resolve().parent
if str(sys_path) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(sys_path))

from data.loader import load_data
from data.dimensions import get_all_dimensions

# Load data on startup
DF_MOTOR, _ = load_data("Motor")
try:
    DF_HOME, _ = load_data("Home")
except FileNotFoundError:
    DF_HOME = None
DIMENSIONS = get_all_dimensions(DF_MOTOR)

# Full dataset (Motor + Home when available)
import pandas as pd

DF_ALL = DF_MOTOR.copy()
if DF_HOME is not None and len(DF_HOME) > 0:
    DF_ALL = pd.concat([DF_MOTOR, DF_HOME], ignore_index=True)

app = dash.Dash(
    __name__,
    use_pages=True,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    suppress_callback_exceptions=True,
)

app.layout = html.Div(
    [
        dcc.Location(id="url", refresh=False),
        dbc.Navbar(
            dbc.Container(
                [
                    dbc.NavbarBrand("Shopping & Switching Intelligence", href="/", className="fw-bold"),
                    dbc.Nav(
                        [
                            dbc.NavItem(dbc.NavLink("Market Overview", href="/")),
                            dbc.NavItem(dbc.NavLink("Insurer Diagnostic", href="/insurer-diagnostic")),
                            dbc.NavItem(dbc.NavLink("Comparison", href="/insurer-comparison")),
                            dbc.NavItem(dbc.NavLink("Channel & PCW", href="/channel-pcw")),
                            dbc.NavItem(dbc.NavLink("Price Sensitivity", href="/price-sensitivity")),
                            dbc.NavItem(dbc.NavLink("Customer Flows", href="/customer-flows")),
                            dbc.NavItem(dbc.NavLink("Admin", href="/admin")),
                        ],
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
        dbc.Container(dash.page_container, fluid=True, className="mb-5"),
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
