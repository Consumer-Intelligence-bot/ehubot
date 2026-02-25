"""Tests for analytics/bayesian.py."""
import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from analytics.bayesian import bayesian_smooth_rate


def test_large_n_high_weight():
    result = bayesian_smooth_rate(800, 1000, 0.78)
    assert result["weight"] > 0.85


def test_small_n_shrinks_toward_prior():
    result = bayesian_smooth_rate(20, 30, 0.78)
    assert abs(result["posterior_mean"] - 0.78) < abs((20/30) - 0.78)


def test_ci_contains_raw_for_large_n():
    result = bayesian_smooth_rate(800, 1000, 0.78)
    raw = 0.8
    assert result["ci_lower"] <= raw <= result["ci_upper"]


def test_zero_trials_returns_prior():
    result = bayesian_smooth_rate(0, 0, 0.5)
    assert result["posterior_mean"] == 0.5
