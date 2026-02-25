"""Tests for flows."""
import pytest
import pandas as pd
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from analytics.flows import calc_net_flow

@pytest.fixture
def flow_df():
    return pd.DataFrame({
        "UniqueID": range(1, 101),
        "IsSwitcher": [True] * 20 + [False] * 80,
        "CurrentCompany": ["B"] * 10 + ["C"] * 10 + ["A"] * 80,
        "PreviousCompany": ["A"] * 10 + ["A"] * 10 + [None] * 80,
    })

def test_net_flow(flow_df):
    nf = calc_net_flow(flow_df, "B")
    assert nf["net"] == 10
