"""Tests for data.transforms."""
import pytest
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from data.transforms import transform


def test_transform_adds_isshopper():
    df = pd.DataFrame({
        "Shoppers": ["Shoppers", "Non-shoppers"],
        "Switchers": ["Switcher", "Non-switcher"],
        "CurrentCompany": ["Aviva", "LV"],
        "PreRenewalCompany": ["LV", "Aviva"],
        "Region": ["London", "Scotland"],
        "Age Group": ["25-34", "55-64"],
    })
    out = transform(df, "Motor")
    assert "IsShopper" in out.columns
    assert out["IsShopper"].iloc[0] is True
    assert out["IsShopper"].iloc[1] is False


def test_transform_adds_product():
    df = pd.DataFrame({
        "Shoppers": ["Shoppers"],
        "Switchers": ["Non-switcher"],
        "CurrentCompany": ["Aviva"],
        "PreRenewalCompany": ["LV"],
        "Region": ["London"],
        "Age Group": ["25-34"],
    })
    out = transform(df, "Home")
    assert (out["Product"] == "Home").all()


def test_transform_adds_previous_company():
    df = pd.DataFrame({
        "Shoppers": ["Shoppers"],
        "Switchers": ["Switcher"],
        "CurrentCompany": ["Aviva"],
        "PreRenewalCompany": ["LV"],
        "Region": ["London"],
        "Age Group": ["25-34"],
    })
    out = transform(df, "Motor")
    assert "PreviousCompany" in out.columns
    assert out["PreviousCompany"].iloc[0] == "LV"
