"""
Reason ranking and percentage calculations.
"""
import pandas as pd


def calc_reason_ranking(
    df: pd.DataFrame, question_col: str, top_n: int = 5
) -> list[dict] | None:
    """
    Top n reasons with percentages. question_col e.g. Q8, Q18, Q19, Q31, Q33.
    """
    if df is None or len(df) == 0 or question_col not in df.columns:
        return None
    base = df[df[question_col].notna() & (df[question_col].astype(str).str.strip() != "")]
    if len(base) == 0:
        return None
    counts = base[question_col].astype(str).value_counts()
    total = counts.sum()
    result = []
    for reason, count in counts.head(top_n).items():
        result.append({"reason": reason, "count": int(count), "pct": count / total})
    return result


def calc_reason_comparison(
    df_insurer: pd.DataFrame, df_market: pd.DataFrame, question_col: str, top_n: int = 5
) -> dict | None:
    """Insurer and market reason rankings for dual table."""
    insurer_rank = calc_reason_ranking(df_insurer, question_col, top_n)
    market_rank = calc_reason_ranking(df_market, question_col, top_n)
    if insurer_rank is None and market_rank is None:
        return None
    return {"insurer": insurer_rank or [], "market": market_rank or []}


def calc_primary_reason(df: pd.DataFrame, question_col: str) -> str | None:
    """Single most common reason."""
    rank = calc_reason_ranking(df, question_col, top_n=1)
    if not rank:
        return None
    return rank[0]["reason"]
