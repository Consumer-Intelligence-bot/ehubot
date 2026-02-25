"""
Suppression and confidence gating.
"""
from dataclasses import dataclass

from config import (
    MIN_BASE_PUBLISHABLE,
    MIN_BASE_INDICATIVE,
    MIN_BASE_MARKET,
    MIN_ELIGIBLE_INSURERS_WARNING,
)


@dataclass
class SuppressionResult:
    can_show_insurer: bool
    can_show_market: bool
    insurer_n: int
    market_n: int
    message: str | None
    warning: str | None


def check_suppression(
    df_insurer,
    df_market,
    min_base: int = MIN_BASE_PUBLISHABLE,
    active_filters: dict | None = None,
) -> SuppressionResult:
    """
    Check if insurer and market data meet thresholds.
    active_filters used for suppression message and multi-filter warning.
    """
    if active_filters is None:
        active_filters = {}
    insurer_n = len(df_insurer) if df_insurer is not None else 0
    market_n = len(df_market) if df_market is not None else 0
    can_show_insurer = insurer_n >= min_base
    can_show_market = market_n >= MIN_BASE_MARKET

    message = None
    if not can_show_insurer:
        filter_str = ", ".join(f"{k}: {v}" for k, v in active_filters.items())
        message = (
            f"Insufficient data: {insurer_n} responses (minimum {min_base} required). "
            + (f"Active filters: {filter_str}. Try broadening your selection." if filter_str else "Try broadening your selection.")
        )

    warning = None
    # Multi-filter warning when many filters active - could add eligible insurer count
    if len(active_filters) >= 2:
        warning = (
            f"Fewer than {MIN_ELIGIBLE_INSURERS_WARNING} insurers may meet threshold with current filters."
        )

    return SuppressionResult(
        can_show_insurer=can_show_insurer,
        can_show_market=can_show_market,
        insurer_n=insurer_n,
        market_n=market_n,
        message=message,
        warning=warning,
    )


def get_confidence_level(n: int) -> str:
    """Returns publishable, indicative, or suppressed."""
    if n >= MIN_BASE_PUBLISHABLE:
        return "publishable"
    if n >= MIN_BASE_INDICATIVE:
        return "indicative"
    return "suppressed"
