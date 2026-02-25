"""
Load source data from CSV or Parquet.
Reads from DATA_DIR (env), then data/processed/, data/raw/, fallback ../public/data/.
Applies transforms before returning.
"""
import os
from pathlib import Path

import pandas as pd

from data.transforms import transform

# Base paths: ss-intelligence/data/ -> data/raw, data/processed
_DATA_DIR = Path(__file__).resolve().parent
RAW_DIR = _DATA_DIR / "raw"
PROCESSED_DIR = _DATA_DIR / "processed"
FALLBACK_DIR = _DATA_DIR.parent.parent / "public" / "data"

# Primary data directory (e.g. OneDrive) - set via DATA_DIR env, or use default
DATA_DIR = os.getenv("DATA_DIR", r"c:\Users\ianch\OneDrive - CONSUMER INTELLIGENCE LTD")
_DATA_DIR_PATH = Path(DATA_DIR) if DATA_DIR else None


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
    """Read CSV, normalise column names, and deduplicate columns (keep first)."""
    df = pd.read_csv(path, dtype=str, low_memory=False)
    df.columns = [_normalise_column_name(c) for c in df.columns]
    if df.columns.duplicated().any():
        df = df.loc[:, ~df.columns.duplicated()]
    return df


def load_data(product: str) -> tuple[pd.DataFrame, dict]:
    """
    Load data for Motor or Home.
    Tries: DATA_DIR (env), data/processed/, data/raw/, then ../public/data/.
    Returns (DataFrame, metadata dict with keys: source, row_count, product).
    """
    metadata = {"product": product, "source": None, "row_count": 0}

    # 0. Try primary DATA_DIR (e.g. OneDrive) - motor all data.csv, all home data.csv
    primary_files = {
        "Motor": ["motor all data.csv"],
        "Home": ["all home data.csv"],
    }
    if _DATA_DIR_PATH and _DATA_DIR_PATH.exists():
        for fname in primary_files.get(product, []):
            candidate = _DATA_DIR_PATH / fname
            if candidate.exists():
                df = _read_csv(candidate)
                df = transform(df, product)
                metadata["source"] = str(candidate)
                metadata["row_count"] = len(df)
                return df, metadata

    # 1. Try Parquet (processed) - already transformed
    parquet_path = PROCESSED_DIR / f"{product.lower()}.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
        metadata["source"] = "parquet"
        metadata["row_count"] = len(df)
        return df, metadata

    # 2. Try CSV in data/raw/ - apply transforms (canonical location for project data)
    raw_files = {
        "Motor": ["motor all data.csv", "motor_main_data.csv", "motor_main_data_demo.csv", "motor main data.csv", "motor main data demo.csv", "motor.csv"],
        "Home": ["all home data.csv", "home_main_data.csv", "ff_home_updated.csv", "ff_home.csv", "home.csv"],
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
        "Motor": ["motor all data.csv", "motor_main_data.csv", "motor_main_data_demo.csv", "motor main data.csv", "motor main data demo.csv"],
        "Home": ["all home data.csv", "home_main_data.csv", "ff_home_updated.csv", "ff_home.csv"],
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
        f"Tried: DATA_DIR={_DATA_DIR_PATH}, {parquet_path}, {RAW_DIR}, {FALLBACK_DIR}"
    )
