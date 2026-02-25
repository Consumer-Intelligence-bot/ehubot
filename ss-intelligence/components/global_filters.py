"""
Global filter bar - shared across all pages for cross-tab context persistence.
"""
from dash import html, dcc
import dash_bootstrap_components as dbc

from components.filters import (
    insurer_dropdown,
    age_band_dropdown,
    region_dropdown,
    payment_type_dropdown,
    product_toggle,
    time_window_dropdown,
)


def global_filter_bar(dim_insurer, dim_age, dim_region, dim_payment):
    """Build the shared filter bar with global IDs. Used in app layout."""
    return dbc.Container(
        dbc.Row(
            [
                dbc.Col(insurer_dropdown("global-insurer", dim_insurer), md=2),
                dbc.Col(age_band_dropdown("global-age-band", dim_age), md=2),
                dbc.Col(region_dropdown("global-region", dim_region), md=2),
                dbc.Col(payment_type_dropdown("global-payment-type", dim_payment), md=2),
                dbc.Col(product_toggle("global-product", "Motor"), md=2),
                dbc.Col(time_window_dropdown("global-time-window", "24"), md=2),
            ],
            className="mb-2",
        ),
        fluid=True,
    )
