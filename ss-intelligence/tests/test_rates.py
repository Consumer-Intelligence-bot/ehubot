import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from analytics.rates import calc_shopping_rate, calc_switching_rate, calc_retention_rate

def test_shopping_rate(sample_df):
    assert 0.59 <= calc_shopping_rate(sample_df) <= 0.61

def test_retention_equals_one_minus_switching(sample_df):
    sw = calc_switching_rate(sample_df)
    rt = calc_retention_rate(sample_df)
    assert abs((1 - sw) - rt) < 0.001

def test_empty_returns_none(empty_df):
    assert calc_shopping_rate(empty_df) is None
