# Shopping & Switching Intelligence

Plotly Dash web dashboard for insurer shopping and switching analytics.

## Setup

```bash
cd ss-intelligence
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

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
