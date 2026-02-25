"""
Load source data from CSV or Parquet.
Reads from data/raw/ or fallback ../public/data/.
Applies transforms before returning.
"""
from pathlib import Path

import pandas as pd

from data.transforms import transform

# Base paths: ss-intelligence/data/ -> data/raw, data/processed
_DATA_DIR = Path(__file__).resolve().parent
RAW_DIR = _DATA_DIR / "raw"
PROCESSED_DIR = _DATA_DIR / "processed"
FALLBACK_DIR = _DATA_DIR.parent.parent / "public" / "data"


def _normalise_column_name(name: str) -> str:
    """Strip MainData[, RespondentProfile[, etc. prefixes from column names."""
    if not name:
        return name
    name = name.replace("\ufeff", "").strip()
    for prefix in ("MainData_Motor[", "MainData[", "RespondentProfile["):
        if name.startswith(prefix):
            name = name[len(prefix) :]
    if name.endswith("]"):
        name = name[:-1]
    return name.strip()


def _read_csv(path: Path) -> pd.DataFrame:
    """Read CSV and normalise column names."""
    df = pd.read_csv(path, dtype=str, low_memory=False)
    df.columns = [_normalise_column_name(c) for c in df.columns]
    return df


def load_data(product: str) -> tuple[pd.DataFrame, dict]:
    """
    Load data for Motor or Home.
    Tries: data/processed/{product}.parquet, then data/raw/, then ../public/data/.
    Returns (DataFrame, metadata dict with keys: source, row_count, product).
    """
    metadata = {"product": product, "source": None, "row_count": 0}

    # 1. Try Parquet (processed) - already transformed
    parquet_path = PROCESSED_DIR / f"{product.lower()}.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
        metadata["source"] = "parquet"
        metadata["row_count"] = len(df)
        return df, metadata

    # 2. Try CSV in data/raw/ - apply transforms
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

    # 3. Fallback: ../public/data/
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
