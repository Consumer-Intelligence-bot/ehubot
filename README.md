# Shopping & Switching Intelligence

Analytics dashboard for insurer shopping and switching data.

## Build and start

### Option A: Python (local development)

**Prerequisites:** Python 3.11+

```bash
cd ss-intelligence

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/macOS)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the app (port 8050)
python app.py
```

Open **http://localhost:8050**

### Option B: Docker

```bash
cd ss-intelligence

# Build the image
docker build -t ss-intelligence .

# Run (port 8050)
docker run -d --name ss-intelligence -p 8050:8050 ss-intelligence
```

Open **http://localhost:8050**

### Option C: Production (gunicorn)

```bash
cd ss-intelligence
source venv/bin/activate   # or venv\Scripts\activate on Windows
gunicorn app:server -b 0.0.0.0:8050 --workers 4 --timeout 120
```

---

## Data

Place Motor and Home CSV files in `ss-intelligence/data/raw/`:

- **Motor:** `motor_main_data.csv`, `motor_main_data_demo.csv`, or `motor all data.csv`
- **Home:** `all home data.csv`, `home_main_data.csv`, or `ff_home.csv`

If `data/raw/` is empty, the app falls back to `public/data/` (includes demo data).

---

## Optional: Basic auth

Set environment variables before starting:

```bash
export BASIC_AUTH_USERNAME=admin
export BASIC_AUTH_PASSWORD=your-password
```

---

For full deployment details, see [ss-intelligence/DEPLOY.md](ss-intelligence/DEPLOY.md).
