"""Tests for analytics/demographics.py."""
import pytest
import pandas as pd
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from analytics.demographics import apply_filters, get_active_filters


@pytest.fixture
def demo_df():
    return pd.DataFrame({
        "Product": ["Motor"] * 100,
        "AgeBand": ["25-34"] * 50 + ["55-64"] * 50,
        "Region": ["London"] * 60 + ["Scotland"] * 40,
        "PaymentType": ["Annual (Debit Card)"] * 70 + ["Monthly Instalments"] * 30,
        "CurrentCompany": ["Aviva"] * 30 + ["LV"] * 70,
    })


def test_age_filter_filters_both(demo_df):
    f = apply_filters(demo_df, age_band="25-34")
    assert len(f) == 50
    assert (f["AgeBand"] == "25-34").all()


def test_insurer_filter(demo_df):
    f = apply_filters(demo_df, insurer="Aviva")
    assert len(f) == 30


def test_get_active_filters():
    assert get_active_filters("25-34", None, None) == {"Age Band": "25-34"}
    assert get_active_filters(None, None, None) == {}
