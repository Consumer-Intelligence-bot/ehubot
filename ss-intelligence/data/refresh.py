"""
Monthly data refresh: validate CSV, transform, build dimensions, save Parquet.
Run: python -m data.refresh
"""
from pathlib import Path

import pandas as pd

from data.loader import RAW_DIR, PROCESSED_DIR, FALLBACK_DIR, load_data
from data.transforms import transform
from data.dimensions import get_all_dimensions


def _normalise_column_name(name: str) -> str:
    """Strip MainData[, RespondentProfile[, etc. prefixes."""
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


def refresh_product(product: str, csv_path: Path | None = None) -> pd.DataFrame:
    """
    Load CSV from path or default location, transform, return DataFrame.
    Does not save Parquet; caller can do that.
    """
    if csv_path and csv_path.exists():
        df = _read_csv(csv_path)
    else:
        # Try default locations
        for fname in (
            ["motor_main_data.csv", "motor_main_data_demo.csv"]
            if product == "Motor"
            else ["home_main_data.csv", "all home data.csv"]
        ):
            for base in (RAW_DIR, FALLBACK_DIR):
                candidate = base / fname
                if candidate.exists():
                    df = _read_csv(candidate)
                    break
            else:
                continue
            break
        else:
            raise FileNotFoundError(f"No CSV found for {product}")

    return transform(df, product)


def run_refresh() -> None:
    """
    Main refresh: load Motor (and Home if available), save Parquet, build dimensions,
    pre-compute Bayesian cache.
    """
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    dfs = {}
    for product in ("Motor", "Home"):
        try:
            df = refresh_product(product)
            dfs[product] = df
            out_path = PROCESSED_DIR / f"{product.lower()}.parquet"
            try:
                df.to_parquet(out_path, index=False)
            except ImportError:
                print(f"Warning: pyarrow not installed. Run: pip install pyarrow")
                print(f"{product}: {len(df)} rows (Parquet not saved)")
            else:
                get_all_dimensions(df)  # validate dimensions build
                print(f"{product}: {len(df)} rows -> {out_path}")
        except FileNotFoundError as e:
            print(f"{product}: skipped - {e}")

    # Bayesian pre-compute
    try:
        from analytics.bayesian_precompute import run_precompute
        df_motor = dfs.get("Motor")
        df_home = dfs.get("Home")
        if df_motor is not None and len(df_motor) > 0:
            path = run_precompute(df_motor, df_home if df_home is not None and len(df_home) > 0 else None)
            if path:
                print(f"Bayesian cache -> {path}")
            else:
                print("Bayesian cache: skipped (pyarrow required)")
    except Exception as e:
        print(f"Bayesian pre-compute: {e}")


if __name__ == "__main__":
    run_refresh()
