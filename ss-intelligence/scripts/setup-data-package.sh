#!/bin/bash
# Create data package on server when git pull doesn't include it.
# Run from ss-intelligence directory: bash scripts/setup-data-package.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$ROOT/data"
mkdir -p "$DATA_DIR"

cat > "$DATA_DIR/__init__.py" << 'INIT'
"""Data loading, transforms, dimensions, and refresh."""
INIT

cat > "$DATA_DIR/loader.py" << 'LOADER'
"""
Load source data from CSV or Parquet.
Reads from data/raw/ or fallback ../public/data/.
Applies transforms before returning.
"""
from pathlib import Path

import pandas as pd

from data.transforms import transform

_DATA_DIR = Path(__file__).resolve().parent
RAW_DIR = _DATA_DIR / "raw"
PROCESSED_DIR = _DATA_DIR / "processed"
FALLBACK_DIR = _DATA_DIR.parent.parent / "public" / "data"


def _normalise_column_name(name: str) -> str:
    if not name:
        return name
    name = name.replace("\ufeff", "").strip()
    for prefix in ("MainData_Motor[", "MainData[", "RespondentProfile["):
        if name.startswith(prefix):
            name = name[len(prefix):]
    if name.endswith("]"):
        name = name[:-1]
    return name.strip()


def _read_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, low_memory=False)
    df.columns = [_normalise_column_name(c) for c in df.columns]
    return df


def load_data(product: str) -> tuple[pd.DataFrame, dict]:
    metadata = {"product": product, "source": None, "row_count": 0}

    parquet_path = PROCESSED_DIR / f"{product.lower()}.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
        metadata["source"] = "parquet"
        metadata["row_count"] = len(df)
        return df, metadata

    raw_files = {
        "Motor": ["motor_main_data.csv", "motor_main_data_demo.csv", "motor.csv"],
        "Home": ["home_main_data.csv", "all home data.csv", "home.csv"],
    }
    for fname in raw_files.get(product, [f"{product.lower()}.csv"]):
        candidate = RAW_DIR / fname
        if candidate.exists():
            df = _read_csv(candidate)
            df = transform(df, product)
            metadata["source"] = str(candidate)
            metadata["row_count"] = len(df)
            return df, metadata

    fallback_files = {
        "Motor": ["motor_main_data_demo.csv", "motor_main_data.csv"],
        "Home": ["all home data.csv", "home_main_data.csv"],
    }
    for fname in fallback_files.get(product, []):
        candidate = FALLBACK_DIR / fname
        if candidate.exists():
            df = _read_csv(candidate)
            df = transform(df, product)
            metadata["source"] = str(candidate)
            metadata["row_count"] = len(df)
            return df, metadata

    raise FileNotFoundError(
        f"No data file found for {product}. "
        f"Tried: {parquet_path}, {RAW_DIR}, {FALLBACK_DIR}"
    )
LOADER

cat > "$DATA_DIR/transforms.py" << 'TRANSFORMS'
"""
Derived fields, cleaning, and mapping.
"""
import pandas as pd


def _derive_price_direction(row: pd.Series) -> str | None:
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
    if pd.isna(age_group) or not str(age_group).strip():
        return None
    return str(age_group).strip()


def _derive_used_pcw(row: pd.Series) -> bool:
    val = row.get("Did you use a PCW for shopping")
    return val in ("Yes", "1", True, "yes", "true")


def transform(df: pd.DataFrame, product: str = "Motor") -> pd.DataFrame:
    if df is None or len(df) == 0:
        return df

    out = df.copy()
    out["Product"] = product

    if "PreRenewalCompany" in out.columns and "PreviousCompany" not in out.columns:
        out["PreviousCompany"] = out["PreRenewalCompany"]

    if "RenewalYearMonth" in out.columns:
        out["RenewalYearMonth"] = pd.to_numeric(out["RenewalYearMonth"], errors="coerce")

    if "UniqueID" in out.columns:
        out["UniqueID"] = out["UniqueID"].astype(str)

    if "Shoppers" in out.columns:
        out["IsShopper"] = out["Shoppers"].astype(str).str.strip().str.lower() == "shoppers"
    else:
        out["IsShopper"] = False

    if "Switchers" in out.columns:
        sw = out["Switchers"].astype(str).str.strip()
        out["IsSwitcher"] = sw.str.lower() == "switcher"
        out["IsNewToMarket"] = sw.str.lower().str.contains("new-to-market", na=False)
        out["IsRetained"] = sw.str.lower().isin(("retained", "non-switcher"))
    else:
        out["IsSwitcher"] = False
        out["IsNewToMarket"] = False
        out["IsRetained"] = ~out["IsSwitcher"]

    if "Age Group" in out.columns:
        out["AgeBand"] = out["Age Group"].apply(_derive_age_band)
    elif "AgeBand" not in out.columns:
        out["AgeBand"] = None

    if "Region" not in out.columns:
        out["Region"] = None

    if "PaymentType" not in out.columns and "Q43" in out.columns:
        out["PaymentType"] = out["Q43"].astype(str)
    elif "PaymentType" not in out.columns:
        out["PaymentType"] = "All"

    out["PriceDirection"] = out.apply(_derive_price_direction, axis=1)
    out["UsedPCW"] = out.apply(_derive_used_pcw, axis=1)
    return out
TRANSFORMS

cat > "$DATA_DIR/dimensions.py" << 'DIMENSIONS'
"""
Build dimension tables for filter dropdowns.
"""
import pandas as pd

AGE_BAND_ORDER = ["17-24", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
REGION_ORDER = ["uk", "england", "london", "south east", "south west", "midlands", "east anglia", "north west", "north east & yorkshire", "scotland", "wales", "ni"]
PAYMENT_ORDER = ["All", "Annual", "Monthly", "Other"]


def _build_dim(df: pd.DataFrame, col: str, key: str, order: list[str], all_label: str) -> pd.DataFrame:
    if col not in df.columns or df[col].isna().all():
        return pd.DataFrame({key: [None], "value": [None], "label": [all_label], "SortOrder": [0]})
    values = df[col].dropna().astype(str).str.strip().unique()
    values = [v for v in values if v and v.lower() != "nan"]

    def _sort_key(val, order):
        v_lower = val.lower()
        for i, o in enumerate(order):
            if o.lower() in v_lower or v_lower in o.lower():
                return i
        return 999

    rows = []
    for i, v in enumerate(sorted(values, key=lambda x: _sort_key(x, order))):
        rows.append({key: v, "value": v, "label": v, "SortOrder": i + 1})
    rows.insert(0, {key: None, "value": None, "label": all_label, "SortOrder": 0})
    return pd.DataFrame(rows)


def get_dim_age_band(df: pd.DataFrame) -> pd.DataFrame:
    return _build_dim(df, "AgeBand", "AgeBand", AGE_BAND_ORDER, "All Ages")


def get_dim_region(df: pd.DataFrame) -> pd.DataFrame:
    return _build_dim(df, "Region", "Region", REGION_ORDER, "All Regions")


def get_dim_payment_type(df: pd.DataFrame) -> pd.DataFrame:
    return _build_dim(df, "PaymentType", "PaymentType", PAYMENT_ORDER, "All Payment Types")


def get_dim_insurer(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or len(df) == 0 or "CurrentCompany" not in df.columns:
        return pd.DataFrame({"Insurer": [], "value": [], "label": [], "SortOrder": []})
    insurers = df["CurrentCompany"].dropna().astype(str).str.strip().unique()
    insurers = sorted([i for i in insurers if i and i.lower() != "nan"])
    rows = [{"Insurer": i, "value": i, "label": i, "SortOrder": idx} for idx, i in enumerate(insurers)]
    return pd.DataFrame(rows)


def get_all_dimensions(df: pd.DataFrame) -> dict:
    return {
        "DimAgeBand": get_dim_age_band(df),
        "DimRegion": get_dim_region(df),
        "DimPaymentType": get_dim_payment_type(df),
        "DimInsurer": get_dim_insurer(df),
    }
DIMENSIONS

cat > "$DATA_DIR/refresh.py" << 'REFRESH'
"""
Monthly data refresh. Run: python -m data.refresh
"""
from pathlib import Path
import pandas as pd

from data.loader import RAW_DIR, PROCESSED_DIR, FALLBACK_DIR
from data.transforms import transform
from data.dimensions import get_all_dimensions


def _normalise_column_name(name: str) -> str:
    if not name:
        return name
    name = name.replace("\ufeff", "").strip()
    for prefix in ("MainData_Motor[", "MainData[", "RespondentProfile["):
        if name.startswith(prefix):
            name = name[len(prefix):]
    if name.endswith("]"):
        name = name[:-1]
    return name.strip()


def _read_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, low_memory=False)
    df.columns = [_normalise_column_name(c) for c in df.columns]
    return df


def refresh_product(product: str) -> pd.DataFrame:
    for fname in (["motor_main_data.csv", "motor_main_data_demo.csv"] if product == "Motor" else ["home_main_data.csv", "all home data.csv"]):
        for base in (RAW_DIR, FALLBACK_DIR):
            candidate = base / fname
            if candidate.exists():
                return transform(_read_csv(candidate), product)
    raise FileNotFoundError(f"No CSV found for {product}")


def run_refresh() -> None:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    for product in ("Motor", "Home"):
        try:
            df = refresh_product(product)
            out_path = PROCESSED_DIR / f"{product.lower()}.parquet"
            try:
                df.to_parquet(out_path, index=False)
                get_all_dimensions(df)
                print(f"{product}: {len(df)} rows -> {out_path}")
            except ImportError:
                print(f"Warning: pip install pyarrow for Parquet. {product}: {len(df)} rows")
        except FileNotFoundError as e:
            print(f"{product}: skipped - {e}")


if __name__ == "__main__":
    run_refresh()
REFRESH

echo "Created data package at $DATA_DIR"
echo "Run: python -m data.refresh && python app.py"
