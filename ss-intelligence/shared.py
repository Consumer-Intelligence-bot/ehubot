"""
Shared data and dimensions - imported by app and pages.
Lives in a separate module to avoid circular imports: pages must not import from app,
otherwise app.py is loaded twice (as __main__ and as app) and callbacks register twice.
"""
import pandas as pd

from data.loader import load_data

# Month abbreviations for YYYYMM formatting
_MONTH_ABBR = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def format_year_month(ym) -> str:
    """Convert YYYYMM (e.g. 202401) to readable label (e.g. 'Jan 2024'). Avoids Plotly displaying as '202.4k'."""
    if pd.isna(ym) or ym is None:
        return ""
    ym = int(float(ym))
    y, m = ym // 100, ym % 100
    if 1 <= m <= 12:
        return f"{_MONTH_ABBR[m]} {y}"
    return str(ym)
from data.dimensions import get_all_dimensions

# Load data on startup (single load, reused by app and pages)
DF_MOTOR, _ = load_data("Motor")
try:
    DF_HOME, _ = load_data("Home")
except FileNotFoundError:
    DF_HOME = None
DIMENSIONS = get_all_dimensions(DF_MOTOR)

DF_ALL = DF_MOTOR.copy()
if DF_HOME is not None and len(DF_HOME) > 0:
    # Deduplicate columns before concat (Home/Motor CSVs can have duplicate column names)
    m = DF_MOTOR.loc[:, ~DF_MOTOR.columns.duplicated()]
    h = DF_HOME.loc[:, ~DF_HOME.columns.duplicated()]
    DF_ALL = pd.concat([m, h], ignore_index=True)
