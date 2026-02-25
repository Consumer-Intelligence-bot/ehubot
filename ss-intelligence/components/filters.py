"""
Filter dropdown components for slicers.
"""
from dash import dcc
import dash_bootstrap_components as dbc


def insurer_dropdown(id: str, options: list[dict], value: str | None = None) -> dcc.Dropdown:
    """Insurer dropdown. options from DimInsurer."""
    return dcc.Dropdown(
        id=id,
        options=[{"label": o["Insurer"], "value": o["Insurer"]} for o in options],
        value=value,
        placeholder="Select insurer",
        clearable=True,
        searchable=True,
        className="mb-2",
    )


def age_band_dropdown(id: str, options: list[dict], value: str | None = None) -> dcc.Dropdown:
    """Age band dropdown. First option 'All Ages' returns None."""
    opts = [{"label": "All Ages", "value": "ALL"}]
    for o in sorted(options, key=lambda x: x.get("SortOrder", 0)):
        opts.append({"label": o["AgeBand"], "value": o["AgeBand"]})
    return dcc.Dropdown(
        id=id,
        options=opts,
        value=value if value else "ALL",
        className="mb-2",
    )


def region_dropdown(id: str, options: list[dict], value: str | None = None) -> dcc.Dropdown:
    """Region dropdown. 'All Regions' returns None."""
    opts = [{"label": "All Regions", "value": "ALL"}]
    for o in sorted(options, key=lambda x: x.get("SortOrder", 0)):
        opts.append({"label": o["Region"], "value": o["Region"]})
    return dcc.Dropdown(
        id=id,
        options=opts,
        value=value if value else "ALL",
        className="mb-2",
    )


def payment_type_dropdown(id: str, options: list[dict], value: str | None = None) -> dcc.Dropdown:
    """Payment type dropdown. 'All Payment Types' returns None."""
    opts = [{"label": "All Payment Types", "value": "ALL"}]
    for o in sorted(options, key=lambda x: x.get("SortOrder", 0)):
        opts.append({"label": o["PaymentType"], "value": o["PaymentType"]})
    return dcc.Dropdown(
        id=id,
        options=opts,
        value=value if value else "ALL",
        className="mb-2",
    )


def product_toggle(id: str, value: str = "Motor") -> dcc.RadioItems:
    """Product toggle Motor/Home."""
    return dcc.RadioItems(
        id=id,
        options=[
            {"label": " Motor", "value": "Motor"},
            {"label": " Home", "value": "Home"},
        ],
        value=value,
        inline=True,
        className="mb-2",
    )


def time_window_dropdown(id: str, value: str = "24 months") -> dcc.Dropdown:
    """Time window dropdown."""
    return dcc.Dropdown(
        id=id,
        options=[
            {"label": "6 months", "value": "6"},
            {"label": "12 months", "value": "12"},
            {"label": "24 months", "value": "24"},
        ],
        value=str(value) if value else "24",
        className="mb-2",
    )
