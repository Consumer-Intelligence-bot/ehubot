import pandas as pd
import pytest

@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "UniqueID": range(1, 201),
        "IsShopper": [True] * 120 + [False] * 80,
        "IsSwitcher": [True] * 40 + [False] * 160,
        "IsRetained": [False] * 40 + [True] * 160,
        "IsNewToMarket": [False] * 200,
        "CurrentCompany": ["Aviva"] * 50 + ["LV"] * 50 + ["Admiral"] * 50 + ["Other"] * 50,
        "PreviousCompany": ["LV"] * 20 + ["Admiral"] * 20 + [None] * 160,
        "Product": ["Motor"] * 200,
        "RenewalYearMonth": [202501] * 100 + [202502] * 100,
    })

@pytest.fixture
def empty_df():
    return pd.DataFrame()
