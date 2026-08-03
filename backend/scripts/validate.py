#!/usr/bin/env python3
"""Build-time validation — runs on Render before starting the server."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.analytics.compute import (
    compute_remoteness, compute_wildness, compute_pristineness,
    load_precomputed_stats, DATA_DIR
)
from fastapi.testclient import TestClient
from app.main import app

REQUIRED = [
    "visitor_sites.geojson",
    "facilities.geojson",
    "inviolate_wilderness.geojson",
    "catalog.json",
    "precomputed_stats.json",
    "remoteness_score.png",
    "wildness_index.png",
    "pristineness_index.png",
]

def check_bundled():
    missing = [f for f in REQUIRED if not (DATA_DIR / f).exists()]
    assert not missing, f"Missing bundled data: {missing}"
    print("Bundled data OK")

def check_analytics():
    r = compute_remoteness()
    assert "score_png" in r and len(r["score_png"]) > 100
    assert "rank_pcts" in r
    print(f"Remoteness OK — mean score={r['mean_score']}")

    w = compute_wildness()
    assert "wildness_png" in w
    print(f"Wildness OK — wild={w['wild_pct']}%")

    p = compute_pristineness()
    assert "pristineness_png" in p
    print(f"Pristineness OK — inviolate={p['inviolate_pct']}%")

def check_api():
    client = TestClient(app)
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/layers/catalog").status_code == 200
    assert client.get("/api/precomputed").status_code == 200
    r = client.post("/api/analyze/remoteness", json={})
    assert r.status_code == 200, r.text
    w = client.post("/api/analyze/wildness", json={})
    assert w.status_code == 200, w.text
    p = client.post("/api/analyze/pristineness", json={})
    assert p.status_code == 200, p.text
    print("API smoke tests OK")

if __name__ == "__main__":
    check_bundled()
    check_analytics()
    check_api()
    print("All validation checks passed.")
