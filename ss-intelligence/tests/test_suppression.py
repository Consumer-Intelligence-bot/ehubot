"""Tests for suppression."""
import pytest
import pandas as pd
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from analytics.suppression import check_suppression

def test_n49_suppressed():
    df_ins = pd.DataFrame({"x": range(49)})
    df_mkt = pd.DataFrame({"x": range(500)})
    r = check_suppression(df_ins, df_mkt)
    assert r.can_show_insurer is False

def test_n50_shown():
    df_ins = pd.DataFrame({"x": range(50)})
    df_mkt = pd.DataFrame({"x": range(500)})
    r = check_suppression(df_ins, df_mkt)
    assert r.can_show_insurer is True
