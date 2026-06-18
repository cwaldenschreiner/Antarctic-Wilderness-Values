# Antarctic Wilderness Values Dashboard

Interactive geospatial dashboard for **ANT-MICI** WP3 wilderness value analysis: **Remoteness**, **Wildness**, and **Pristineness**.

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=. python scripts/setup_basemap.py
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Docker

```bash
docker-compose up --build
```

## Deploy on Render

One-click deploy via [Render Blueprint](https://render.com/docs/infrastructure-as-code):

1. Push this repo to GitHub.
2. In [Render](https://dashboard.render.com): **New → Blueprint**.
3. Connect the repository and approve `render.yaml`.
4. Wait for both services to deploy:
   - **ant-mici-api** — FastAPI backend (Docker, Starter plan)
   - **ant-mici-dashboard** — React static site

The static site build script (`frontend/scripts/render-build.sh`) sets `VITE_API_URL` automatically from the API service URL.

### Verify deployment

```bash
curl https://ant-mici-api.onrender.com/api/health
# → {"status":"ok"}
```

Open the **ant-mici-dashboard** URL (not the API URL) to use the interactive UI.

The API root (`https://ant-mici-api.onrender.com/`) intentionally returns JSON — that is not the dashboard.

### If `ant-mici-dashboard` is missing on Render

1. In Render → your **Blueprint** → **Manual Sync** (after pulling latest `render.yaml` on `main`).
2. Or create the static site manually:
   - **New → Static Site** → same repo, branch `main`
   - Root Directory: `frontend`
   - Build Command: `chmod +x scripts/render-build.sh && ./scripts/render-build.sh`
   - Publish Directory: `frontend/dist` (relative to repo root)
   - Environment: `API_HOST` = your API URL (e.g. `https://ant-mici-api.onrender.com`)
   - Add redirect/rewrite: `/*` → `/index.html` (SPA routing)

### Verify deployment

```bash
curl https://ant-mici-api.onrender.com/api/health
# → {"status":"ok"}
```

If you prefer creating services by hand, see the same layout in `render.yaml`:

| Service | Type | Root | Build | Notes |
|---------|------|------|-------|-------|
| `ant-mici-api` | Web Service (Docker) | `backend` | `python scripts/setup_basemap.py && python scripts/validate_geospatial.py` | Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| `ant-mici-dashboard` | Static Site | `frontend` | `./scripts/render-build.sh` | Set `API_HOST` to API URL, or `VITE_API_URL=https://<api-host>/api` |

### Render notes

- **Cold starts:** Free/Starter services spin down when idle; first request may be slow.
- **Uploads:** User uploads are stored on ephemeral disk unless you attach a [persistent disk](https://render.com/docs/disks) at `backend/data/uploads`.
- **Memory:** Upgrade the API instance if raster analysis runs out of memory.

## Validation

```bash
cd backend
PYTHONPATH=. python scripts/validate_geospatial.py
```

## Literature Basis

Impact-distance thresholds from Summerson (2012), Summerson & Bishop (2012), and **ATCM XXXVI IP 39 (2013)**:

| Constant | Value | Feature type |
|----------|-------|--------------|
| `HIGH_IMPACT_DIST_M` | ~20 km | Permanent research station |
| `MED_IMPACT_DIST_M` | ~5 km | Small refuge / AWS |
| `LINEAR_IMPACT_DIST_M` | 1–2 km | Traverse routes |
| `REMOTENESS_THRESHOLDS_KM` | [5, 20, 50] | Wilderness rank classes |

## Architecture

- **Backend:** FastAPI + numpy/scipy/geopandas analytics
- **Frontend:** React + MapLibre GL JS + Recharts
- **Tabs:** Home, Remoteness, Wildness, Pristineness, Data Sources

## License

Apache License 2.0
