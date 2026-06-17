#!/usr/bin/env python3
"""Geospatial validation — CRS, analytics, API smoke tests."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import geopandas as gpd
import numpy as np
from fastapi.testclient import TestClient

from app.analytics.constants import EPSG_ANTARCTIC, REMOTENESS_THRESHOLDS_KM
from app.analytics.pristineness import compute_pristineness, default_pristineness_layers
from app.analytics.remoteness import combined_remoteness_score, default_remoteness_layers
from app.analytics.raster_utils import load_bundled_geojson, raster_to_png_bytes
from app.analytics.wildness import compute_viewshed, default_wildness_layers
from app.main import app

DATA = Path(__file__).resolve().parents[1] / "data" / "bundled"


def test_crs_roundtrip():
    gdf = load_bundled_geojson("building_footprints")
    assert not gdf.empty, "building_footprints empty"
    back = gdf.to_crs("EPSG:4326").to_crs(EPSG_ANTARCTIC)
    assert len(back) == len(gdf)
    print("CRS round-trip OK")


def test_demo_coordinates():
    gdf = gpd.read_file(DATA / "building_footprints.geojson")
    for _, row in gdf.iterrows():
        lon, lat = row.geometry.x, row.geometry.y
        assert lat < -60, f"Expected Antarctic latitude, got {lat}"
    print("Demo coordinate order OK")


def test_heatmap_export():
    layers = default_remoteness_layers()
    result = combined_remoteness_score(layers=layers)
    png = raster_to_png_bytes(result["combined_remoteness_score"])
    assert len(png) > 100
    print("Heatmap export OK")


def test_continent_masked_stats():
    layers = default_remoteness_layers()
    result = combined_remoteness_score(layers=layers)
    stats = result["rank_stats"]
    total = sum(stats.values())
    assert 99 < total < 101, f"Rank stats should sum ~100%, got {total}"
    print("Area statistics OK")


def test_remoteness_thresholds():
    assert REMOTENESS_THRESHOLDS_KM == [5, 20, 50]
    print("Remoteness thresholds OK")


def test_wildness():
    infra, visitors = default_wildness_layers()
    result = compute_viewshed(infra, visitor_sites=visitors)
    assert "wildness_index" in result
    print("Wildness analytics OK")


def test_pristineness():
    fp, vis = default_pristineness_layers()
    result = compute_pristineness(human_activity=fp, visitation=vis)
    assert "fragmentation" in result
    print("Pristineness analytics OK")


def test_api_smoke():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    r = client.get("/api/layers/catalog")
    assert r.status_code == 200
    r = client.post("/api/analyze/remoteness", json={})
    assert r.status_code == 200
    r = client.post("/api/analyze/wildness", json={})
    assert r.status_code == 200
    r = client.post("/api/analyze/pristineness", json={})
    assert r.status_code == 200
    print("API smoke tests OK")


def main():
    tests = [
        test_crs_roundtrip,
        test_demo_coordinates,
        test_heatmap_export,
        test_continent_masked_stats,
        test_remoteness_thresholds,
        test_wildness,
        test_pristineness,
        test_api_smoke,
    ]
    for t in tests:
        t()
    print("All validation checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
