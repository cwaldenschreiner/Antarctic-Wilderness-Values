"""Raster and vector utilities for wilderness analytics."""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np
from pyproj import Transformer
from shapely.geometry import Point, box, mapping, shape
from shapely.ops import unary_union

from app.analytics.constants import ANTARCTIC_BOUNDS, DEFAULT_GRID_RES_M, EPSG_ANTARCTIC

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def load_bundled_geojson(name: str) -> gpd.GeoDataFrame:
    path = DATA_DIR / "bundled" / f"{name}.geojson"
    if not path.exists():
        return gpd.GeoDataFrame(geometry=[], crs=EPSG_ANTARCTIC)
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    return gdf.to_crs(EPSG_ANTARCTIC)


def parse_upload(content: bytes, filename: str) -> gpd.GeoDataFrame:
    """Parse uploaded geospatial file."""
    lower = filename.lower()
    if lower.endswith(".geojson") or lower.endswith(".json"):
        gdf = gpd.read_file(io.BytesIO(content))
    elif lower.endswith(".zip"):
        gdf = gpd.read_file(io.BytesIO(content))
    elif lower.endswith(".gpkg"):
        gdf = gpd.read_file(io.BytesIO(content))
    else:
        raise ValueError(f"Unsupported format: {filename}")
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    return gdf.to_crs(EPSG_ANTARCTIC)


def get_analysis_extent(gdfs: list[gpd.GeoDataFrame], padding_m: float = 50_000) -> tuple[float, float, float, float]:
    """Return bounds in EPSG:3031."""
    valid = [g for g in gdfs if g is not None and not g.empty]
    if not valid:
        # Default Antarctic Peninsula demo extent
        return (-2_500_000, -1_500_000, 2_500_000, -500_000)
    merged = pd_concat_geoms(valid)
    minx, miny, maxx, maxy = merged.total_bounds
    return (minx - padding_m, miny - padding_m, maxx + padding_m, maxy + padding_m)


def pd_concat_geoms(gdfs: list[gpd.GeoDataFrame]) -> gpd.GeoDataFrame:
    import pandas as pd

    return gpd.GeoDataFrame(pd.concat(gdfs, ignore_index=True), crs=gdfs[0].crs)


def make_grid(bounds: tuple[float, float, float, float], res_m: float = DEFAULT_GRID_RES_M):
    minx, miny, maxx, maxy = bounds
    xs = np.arange(minx, maxx + res_m, res_m)
    ys = np.arange(miny, maxy + res_m, res_m)
    return xs, ys


def distance_raster_from_geoms(
    geoms,
    bounds: tuple[float, float, float, float],
    res_m: float = DEFAULT_GRID_RES_M,
    max_dist_m: float | None = None,
) -> tuple[np.ndarray, dict[str, Any]]:
    """Compute minimum Euclidean distance raster from geometries."""
    xs, ys = make_grid(bounds, res_m)
    ny, nx = len(ys), len(xs)
    xx, yy = np.meshgrid(xs, ys, indexing="ij")
    points = np.column_stack([xx.ravel(), yy.ravel()])

    if not geoms:
        dist = np.full((ny, nx), max_dist_m or 500_000.0, dtype=np.float32)
        return dist, _meta(bounds, res_m, xs, ys)

    union = unary_union(geoms)
    if union.is_empty:
        dist = np.full((ny, nx), max_dist_m or 500_000.0, dtype=np.float32)
        return dist, _meta(bounds, res_m, xs, ys)

  # Sample-based distance for performance on moderate grids
    from scipy.spatial import cKDTree

    if union.geom_type in ("Point", "MultiPoint"):
        coords = _extract_coords(union)
    elif union.geom_type in ("LineString", "MultiLineString"):
        coords = _line_sample_coords(union, step_m=res_m)
    else:
        coords = _polygon_boundary_coords(union, step_m=res_m)

    if len(coords) == 0:
        dist = np.full((ny, nx), max_dist_m or 500_000.0, dtype=np.float32)
        return dist, _meta(bounds, res_m, xs, ys)

    tree = cKDTree(np.array(coords))
    d, _ = tree.query(points, k=1)
    dist = d.reshape(ny, nx).astype(np.float32)
    if max_dist_m:
        dist = np.minimum(dist, max_dist_m)
    return dist, _meta(bounds, res_m, xs, ys)


def _meta(bounds, res_m, xs, ys):
    return {
        "bounds": bounds,
        "res_m": res_m,
        "width": len(xs),
        "height": len(ys),
        "origin_x": float(xs[0]),
        "origin_y": float(ys[0]),
    }


def _extract_coords(geom) -> list[tuple[float, float]]:
    if geom.geom_type == "Point":
        return [(geom.x, geom.y)]
    return [(g.x, g.y) for g in geom.geoms]


def _line_sample_coords(geom, step_m: float) -> list[tuple[float, float]]:
    coords: list[tuple[float, float]] = []
    lines = [geom] if geom.geom_type == "LineString" else geom.geoms
    for line in lines:
        length = line.length
        if length == 0:
            continue
        n = max(2, int(length / step_m) + 1)
        for i in range(n):
            pt = line.interpolate(i / (n - 1), normalized=True)
            coords.append((pt.x, pt.y))
    return coords


def _polygon_boundary_coords(geom, step_m: float) -> list[tuple[float, float]]:
    boundary = geom.boundary if geom.geom_type == "Polygon" else unary_union([g.boundary for g in geom.geoms])
    return _line_sample_coords(boundary, step_m)


def classify_remoteness_ranks(dist_km: np.ndarray) -> np.ndarray:
    """Classify distance into 4 IP 39 rank classes (0=best remoteness)."""
    ranks = np.zeros_like(dist_km, dtype=np.int8)
    ranks[dist_km < 5] = 3
    ranks[(dist_km >= 5) & (dist_km < 20)] = 2
    ranks[(dist_km >= 20) & (dist_km < 50)] = 1
    ranks[dist_km >= 50] = 0
    return ranks


def raster_to_png_bytes(arr: np.ndarray, cmap: str = "viridis", vmin=None, vmax=None) -> bytes:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import cm
    from PIL import Image

    data = np.array(arr, dtype=float)
    if vmin is None:
        vmin = np.nanmin(data) if np.any(np.isfinite(data)) else 0
    if vmax is None:
        vmax = np.nanmax(data) if np.any(np.isfinite(data)) else 1
    norm = plt.Normalize(vmin=vmin, vmax=vmax)
    try:
        colormap = matplotlib.colormaps[cmap]
    except (AttributeError, KeyError):
        colormap = cm.get_cmap(cmap)
    rgba = colormap(norm(data))
    rgba = (rgba[:, :, :3] * 255).astype(np.uint8)
    img = Image.fromarray(rgba)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def compute_area_stats(arr: np.ndarray, labels: list[str] | None = None) -> dict[str, float]:
    flat = arr.ravel()
    total = len(flat)
    if labels:
        stats = {}
        for i, label in enumerate(labels):
            stats[label] = float(100.0 * np.sum(flat == i) / total) if total else 0.0
        return stats
    return {
        "mean": float(np.mean(flat)),
        "min": float(np.min(flat)),
        "max": float(np.max(flat)),
    }


def histogram_bins(arr: np.ndarray, bins: int = 20) -> dict[str, list]:
    flat = arr.ravel()
    counts, edges = np.histogram(flat, bins=bins)
    return {
        "counts": counts.tolist(),
        "edges": edges.tolist(),
    }


def filter_gdf_by_year(gdf: gpd.GeoDataFrame, year_min: int | None, year_max: int | None) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf
    year_col = None
    for col in ("year", "Year", "YEAR", "date", "Date"):
        if col in gdf.columns:
            year_col = col
            break
    if year_col is None or (year_min is None and year_max is None):
        return gdf
    years = gdf[year_col].astype(str).str[:4].astype(int, errors="ignore")
    mask = np.ones(len(gdf), dtype=bool)
    if year_min is not None:
        mask &= years >= year_min
    if year_max is not None:
        mask &= years <= year_max
    return gdf[mask]


def gdf_to_geojson_dict(gdf: gpd.GeoDataFrame) -> dict:
    if gdf.empty:
        return {"type": "FeatureCollection", "features": []}
    gdf4326 = gdf.to_crs("EPSG:4326")
    return json.loads(gdf4326.to_json())


def synthetic_dem(bounds: tuple[float, float, float, float], res_m: float, seed: int = 42) -> np.ndarray:
    xs, ys = make_grid(bounds, res_m)
    ny, nx = len(ys), len(xs)
    rng = np.random.default_rng(seed)
    xx, yy = np.meshgrid(xs, ys, indexing="xy")
    base = 500 + 0.0001 * np.sqrt(xx**2 + yy**2)
    noise = rng.normal(0, 50, (ny, nx))
    return (base + noise).astype(np.float32)


def compute_fragmentation_stats(binary_mask: np.ndarray, res_m: float) -> dict[str, float]:
    """Simple patch statistics on binary inviolate mask."""
    from scipy import ndimage

    labeled, n_patches = ndimage.label(binary_mask)
    if n_patches == 0:
        return {"patch_count": 0, "mean_patch_area_km2": 0.0, "largest_patch_km2": 0.0, "inviolate_pct": 0.0}
    sizes = ndimage.sum(binary_mask, labeled, range(1, n_patches + 1))
    cell_km2 = (res_m / 1000) ** 2
    patch_areas = np.array(sizes) * cell_km2
    inviolate_pct = float(100.0 * binary_mask.sum() / binary_mask.size)
    return {
        "patch_count": int(n_patches),
        "mean_patch_area_km2": float(np.mean(patch_areas)),
        "largest_patch_km2": float(np.max(patch_areas)),
        "inviolate_pct": inviolate_pct,
    }
