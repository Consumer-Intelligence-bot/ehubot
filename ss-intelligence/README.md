# Shopping & Switching Intelligence

Plotly Dash web dashboard for insurer shopping and switching analytics.

## Setup

Use a virtual environment (required on Linux/macOS to avoid `externally-managed-environment`):

```bash
cd ss-intelligence
python3 -m venv venv
source venv/bin/activate   # Linux/macOS
# OR: venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

If you see `externally-managed-environment` when running `pip install`, create and activate the venv first.

**If `data` module is missing** (e.g. after clone/pull): run `bash scripts/setup-data-package.sh` from the ss-intelligence directory.

**If `git pull` says "no tracking information"**: run `git branch --set-upstream-to=origin/main main` (or your branch name), then `git pull`.

## Data

Place CSV files in `data/raw/` or use the fallback from `../public/data/` (ehubot CSV).

Run data refresh:
```bash
python -m data.refresh
```

## Run

```bash
python app.py
```

Open http://localhost:8050

## Optional Auth

Set in `.env`:
```
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=changeme
```

## Docker

```bash
docker build -t ss-intelligence .
docker run -p 8050:8050 ss-intelligence
```
