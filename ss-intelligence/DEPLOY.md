# Server-Side Deployment Instructions

## Prerequisites

- **Git** installed
- **Python 3.11+** (or Docker)
- For Docker: **Docker** installed

---

## Option A: Deploy with Docker (Recommended)

### 1. Clone or pull the repo

```bash
# If first time
git clone https://github.com/YOUR_ORG/ehubot.git
cd ehubot

# If repo already exists, pull latest
cd /path/to/ehubot
git pull origin main
```

### 2. Build and run

```bash
cd ss-intelligence

# Build the image
docker build -t ss-intelligence .

# Run (port 8050)
docker run -d \
  --name ss-intelligence \
  -p 8050:8050 \
  --restart unless-stopped \
  ss-intelligence
```

### 3. Optional: Enable HTTP Basic Auth

Create a `.env` file in `ss-intelligence/` before building, or pass env at runtime:

```bash
docker run -d \
  --name ss-intelligence \
  -p 8050:8050 \
  -e BASIC_AUTH_USERNAME=admin \
  -e BASIC_AUTH_PASSWORD=your-secure-password \
  --restart unless-stopped \
  ss-intelligence
```

### 4. Access

- **URL:** `http://YOUR_SERVER_IP:8050`
- If auth enabled: use the username/password from env

### 5. Update after new commits

```bash
cd /path/to/ehubot
git pull origin main
cd ss-intelligence
docker stop ss-intelligence
docker rm ss-intelligence
docker build -t ss-intelligence .
docker run -d --name ss-intelligence -p 8050:8050 --restart unless-stopped ss-intelligence
```

---

## Option B: Deploy with Python (bare metal)

### 1. Clone or pull the repo

```bash
cd /path/to
git clone https://github.com/YOUR_ORG/ehubot.git
cd ehubot

# Or pull latest
git pull origin main
```

### 2. Create virtual environment and install

```bash
cd ss-intelligence

python3.11 -m venv venv
source venv/bin/activate   # Linux/macOS
# OR: venv\Scripts\activate   # Windows

pip install -r requirements.txt
```

### 3. Data

Data loads automatically from `../public/data/motor_main_data_demo.csv` (in repo). For production CSV:

- Place `MainData_Motor.csv` and/or `MainData_Home.csv` in `ss-intelligence/data/raw/`
- Run refresh: `python -m data.refresh`

### 4. Run with gunicorn (production)

```bash
cd ss-intelligence
source venv/bin/activate
gunicorn app:server -b 0.0.0.0:8050 --workers 4 --timeout 120
```

### 5. Optional: systemd service

Create `/etc/systemd/system/ss-intelligence.service`:

```ini
[Unit]
Description=Shopping & Switching Intelligence
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/ehubot/ss-intelligence
ExecStart=/path/to/ehubot/ss-intelligence/venv/bin/gunicorn app:server -b 0.0.0.0:8050 --workers 4 --timeout 120
Restart=always
RestartSec=5
Environment="PATH=/path/to/ehubot/ss-intelligence/venv/bin"

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ss-intelligence
sudo systemctl start ss-intelligence
sudo systemctl status ss-intelligence
```

### 6. Optional: Auth via .env

Create `ss-intelligence/.env`:

```
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your-secure-password
```

### 7. Update after new commits

```bash
cd /path/to/ehubot
git pull origin main
cd ss-intelligence
source venv/bin/activate
pip install -r requirements.txt   # if deps changed
sudo systemctl restart ss-intelligence   # if using systemd
```

---

## Quick Reference

| Item            | Value                        |
|-----------------|------------------------------|
| Port            | 8050                         |
| App entry       | `app:server` (gunicorn)      |
| Data fallback   | `ehubot/public/data/`        |
| Data refresh    | `python -m data.refresh`     |
