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
    assert get_active_filters("25-34", "London", "Annual") == {
        "Age Band": "25-34",
        "Region": "London",
        "Payment Type": "Annual",
    }


def test_region_filter(demo_df):
    f = apply_filters(demo_df, region="London")
    assert len(f) == 60
    assert (f["Region"] == "London").all()


def test_payment_filter(demo_df):
    f = apply_filters(demo_df, payment_type="Annual (Debit Card)")
    assert len(f) == 70


def test_all_returns_unfiltered(demo_df):
    f = apply_filters(demo_df, age_band=None, region=None, payment_type=None)
    assert len(f) == len(demo_df)


def test_multi_filter_compounds(demo_df):
    f = apply_filters(demo_df, age_band="25-34", region="London")
    assert len(f) <= 50
    assert len(f) <= 60
    assert (f["AgeBand"] == "25-34").all()
    assert (f["Region"] == "London").all()
