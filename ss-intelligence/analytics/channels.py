"""
Channel and PCW analysis.
"""
import pandas as pd


def calc_channel_usage(df: pd.DataFrame) -> pd.Series | None:
    """Percentage of shoppers using each channel (Q9b). Multi-code so can exceed 100%."""
    if df is None or len(df) == 0:
        return None
    shoppers = df[df["IsShopper"]]
    if len(shoppers) == 0:
        return None
    # Q9b_1, Q9b_2, Q9b_3, etc. - columns with channel codes
    channel_cols = [c for c in df.columns if c.startswith("Q9b")]
    if not channel_cols:
        return None
    usage = {}
    for col in channel_cols:
        used = shoppers[col].fillna(0).astype(int).sum()
        usage[col] = used / len(shoppers)
    return pd.Series(usage).sort_values(ascending=False)


def calc_channel_first_used(df: pd.DataFrame) -> pd.Series | None:
    """Percentage who used each channel first (Q13a rank=1)."""
    if df is None or len(df) == 0 or "Q13a" not in df.columns:
        return None
    shoppers = df[df["IsShopper"]]
    if len(shoppers) == 0:
        return None
    # Q13a may contain channel code; value_counts gives distribution
    return shoppers["Q13a"].value_counts(normalize=True)


def calc_pcw_usage(df: pd.DataFrame) -> pd.Series | None:
    """Percentage of PCW users who used each PCW (Q11)."""
    if df is None or len(df) == 0:
        return None
    pcw_users = df[df.get("UsedPCW", False)]
    if len(pcw_users) == 0:
        return None
    pcw_cols = [c for c in df.columns if c.startswith("Q11_")]
    if not pcw_cols:
        return None
    usage = {}
    for col in pcw_cols:
        used = pcw_users[col].fillna(0).astype(int).sum()
        usage[col] = used / len(pcw_users) if len(pcw_users) > 0 else 0
    return pd.Series(usage).sort_values(ascending=False)


def calc_pcw_nps(df: pd.DataFrame, pcw: str) -> float | None:
    """NPS for a specific PCW (Q11d). Base: respondents who used that PCW."""
    if df is None or "Q11d" not in df.columns:
        return None
    pcw_col = f"Q11_{pcw}" if not pcw.startswith("Q11") else pcw
    if pcw_col not in df.columns:
        return None
    users = df[df[pcw_col] == 1]
    if len(users) == 0:
        return None
    nps_vals = pd.to_numeric(users["Q11d"], errors="coerce")
    promoters = (nps_vals >= 9).sum()
    detractors = (nps_vals <= 6).sum()
    return 100 * (promoters - detractors) / len(users)


def calc_pcw_purchase_rate(df: pd.DataFrame, pcw: str) -> float | None:
    """% of PCW shoppers who bought via that PCW (Q36)."""
    if df is None or "Q36" not in df.columns:
        return None
    pcw_col = f"Q11_{pcw}" if not pcw.startswith("Q11") else pcw
    if pcw_col not in df.columns:
        return None
    users = df[df[pcw_col] == 1]
    if len(users) == 0:
        return None
    purchased = users[users["Q36"] == 1]
    return len(purchased) / len(users)


def calc_quote_buy_mismatch(df: pd.DataFrame) -> float | None:
    """Percentage where Q37=2 (quoted via one method, bought via another)."""
    if df is None or "Q37" not in df.columns:
        return None
    valid = df[df["Q37"].notna()]
    if len(valid) == 0:
        return None
    mismatch = (pd.to_numeric(valid["Q37"], errors="coerce") == 2).sum()
    return mismatch / len(valid)


def calc_quote_reach(df: pd.DataFrame, insurer: str) -> int:
    """Count of shoppers who got a quote from this insurer (Q13b)."""
    if df is None or "Q13b" not in df.columns:
        return 0
    shoppers = df[df["IsShopper"]]
    # Q13b may be multi-select; check if insurer in response
    return shoppers["Q13b"].astype(str).str.contains(insurer, case=False, na=False).sum()
