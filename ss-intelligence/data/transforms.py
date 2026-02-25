"""
Derived fields, cleaning, and mapping.
Mirrors logic from src/utils/deriveFields.js and normaliseColumns.js.
"""
import pandas as pd


def _derive_price_direction(row: pd.Series) -> str | None:
    """Map renewal premium change to PriceDirection (Up, Down, Unchanged, New)."""
    change = row.get("Renewal premium change combined") or row.get("Renewal premium change") or ""
    s = str(change).lower().strip()
    if not s or s == "nan":
        return None
    if "higher" in s or s == "up":
        return "Higher"
    if "lower" in s or s == "down":
        return "Lower"
    if "unchanged" in s:
        return "Unchanged"
    if "didn't have" in s or "new" in s or "purchase" in s:
        return "New"
    return None


def _derive_age_band(age_group: str) -> str | None:
    """Map Age Group to AgeBand (spec format: 17-24, 25-34, 35-44, 45-54, 55-64, 65+)."""
    if pd.isna(age_group) or not str(age_group).strip():
        return None
    s = str(age_group).strip()
    # Already in spec format
    if s in ("17-24", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"):
        return "18-24" if s == "18-24" else s  # Normalise 18-24 to match common format
    # Map 18-24 -> 17-24 for spec alignment if needed; keep 18-24 as valid
    return s


def _derive_used_pcw(row: pd.Series) -> bool:
    """Did you use a PCW for shopping -> UsedPCW boolean."""
    val = row.get("Did you use a PCW for shopping")
    return val in ("Yes", "1", True, "yes", "true")


def transform(df: pd.DataFrame, product: str = "Motor") -> pd.DataFrame:
    """
    Clean and derive fields. Returns DataFrame with:
    - Product, CurrentCompany, PreRenewalCompany, PreviousCompany
    - RenewalYearMonth, AgeBand, Region, PaymentType
    - IsShopper, IsSwitcher, IsNewToMarket
    - PriceDirection, UsedPCW
    """
    if df is None or len(df) == 0:
        return df

    out = df.copy()

    # Product
    out["Product"] = product

    # Column aliases (some analytics use PreRenewalCompany, flows use PreviousCompany)
    if "PreRenewalCompany" in out.columns and "PreviousCompany" not in out.columns:
        out["PreviousCompany"] = out["PreRenewalCompany"]

    # RenewalYearMonth as numeric
    if "RenewalYearMonth" in out.columns:
        out["RenewalYearMonth"] = pd.to_numeric(out["RenewalYearMonth"], errors="coerce")

    # UniqueID
    if "UniqueID" in out.columns:
        out["UniqueID"] = out["UniqueID"].astype(str)

    # Shoppers -> IsShopper
    if "Shoppers" in out.columns:
        out["IsShopper"] = out["Shoppers"].astype(str).str.strip().str.lower() == "shoppers"
    else:
        out["IsShopper"] = False

    # Switchers -> IsSwitcher, IsNewToMarket, IsRetained
    if "Switchers" in out.columns:
        sw = out["Switchers"].astype(str).str.strip()
        out["IsSwitcher"] = sw.str.lower() == "switcher"
        out["IsNewToMarket"] = sw.str.lower().str.contains("new-to-market", na=False)
        out["IsRetained"] = sw.str.lower().isin(("retained", "non-switcher"))
    else:
        out["IsSwitcher"] = False
        out["IsNewToMarket"] = False
        out["IsRetained"] = ~out["IsSwitcher"]

    # AgeBand from Age Group
    if "Age Group" in out.columns:
        out["AgeBand"] = out["Age Group"].apply(_derive_age_band)
    elif "AgeBand" not in out.columns:
        out["AgeBand"] = None

    # Region
    if "Region" not in out.columns:
        out["Region"] = None

    # PaymentType (Q43 maps to payment; demo data often lacks it)
    if "PaymentType" not in out.columns and "Q43" in out.columns:
        out["PaymentType"] = out["Q43"].astype(str)
    elif "PaymentType" not in out.columns:
        out["PaymentType"] = "All"

    # PriceDirection
    out["PriceDirection"] = out.apply(_derive_price_direction, axis=1)

    # UsedPCW
    out["UsedPCW"] = out.apply(_derive_used_pcw, axis=1)

    return out
