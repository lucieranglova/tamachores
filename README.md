# TamaChores 🥚

A gamified couples chore tracker in Tamagotchi style. Each player has a pixel-art creature that lives happily when chores get done.

## Quick Start (local)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
mkdir -p data
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server on :5173, proxies /api → :8000
```

Open http://localhost:5173 — log in as `player1` / `tamachores1` on one device and `player2` / `tamachores2` on the other.

---

## PWA Icons

The app needs PNG icons before deploying. Generate them from the SVG:

```bash
cd frontend
# Option 1 – use sharp
npx sharp-cli resize 192 192 --fit contain --background "#F5F0E8" \
  -i public/icons/icon.svg -o public/icons/icon-192.png
npx sharp-cli resize 512 512 --fit contain --background "#F5F0E8" \
  -i public/icons/icon.svg -o public/icons/icon-512.png

# Option 2 – use Inkscape
inkscape public/icons/icon.svg -w 192 -h 192 -o public/icons/icon-192.png
inkscape public/icons/icon.svg -w 512 -h 512 -o public/icons/icon-512.png
```

---

## Push Notifications

Generate VAPID keys (one-time setup):

```bash
pip install pywebpush
python - <<'EOF'
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print("PUBLIC:", v.public_key.decode())
print("PRIVATE:", v.private_key.decode())
EOF
```

Put the keys in `.env` (copy from `.env.example`).

---

## Docker Deployment

```bash
cp .env.example .env
# Edit .env with your SECRET_KEY and VAPID keys

docker compose up --build -d
```

App is served on http://localhost:80.

---

## Deploy to Railway

1. Push to GitHub.
2. Create a new Railway project → **Deploy from GitHub repo**.
3. Add two services: `backend` (Dockerfile: `./backend/Dockerfile`) and `frontend` (Dockerfile: `./frontend/Dockerfile`).
4. Set environment variables on the `backend` service:
   - `SECRET_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
5. On the `frontend` service, set the internal hostname of the backend as needed (nginx resolves `backend` via Docker network automatically with docker-compose; for Railway use the internal hostname Railway assigns).
6. Attach a **Volume** to the backend at `/app/data` so the SQLite database persists across deploys.

> **Tip:** For Railway, set the frontend's nginx upstream to the backend's Railway private URL, e.g. `backend.railway.internal:8000`.

---

## Deploy to Fly.io

```bash
# Install flyctl, then:
cd backend
fly launch --name tamachores-api --no-deploy
fly volumes create data --size 1 --region ams
fly secrets set SECRET_KEY=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
fly deploy

cd ../frontend
fly launch --name tamachores-ui --no-deploy
# Update nginx.conf to point backend hostname to tamachores-api.internal:8000
fly deploy
```

---

## Credentials

| User    | Default Password  |
|---------|-------------------|
| player1 | tamachores1       |
| player2 | tamachores2       |

Change passwords in **Settings → Změna hesla** after first login.

---

## Scoring

| Mechanic       | Rule                                        |
|----------------|---------------------------------------------|
| Base points    | Fixed per chore                             |
| Combo x2       | 3+ chores claimed within 5 minutes          |
| Combo x3       | 5+ chores claimed within 5 minutes          |
| Crit (8%)      | Random double-points, flash animation shown |
| Streak bonus   | +20% if all daily chores done yesterday     |

---

## Tech Stack

- **Backend:** FastAPI · SQLAlchemy · SQLite · PyJWT · pywebpush
- **Frontend:** React 18 · Vite · vite-plugin-pwa · Recharts
- **Font:** Press Start 2P (Google Fonts)
- **Deployment:** Docker + docker-compose
