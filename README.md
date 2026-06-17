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
