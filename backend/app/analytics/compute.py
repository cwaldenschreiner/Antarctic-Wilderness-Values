"""
ANT-MICI Wilderness Value Analytics
Computes Remoteness, Wildness, and Pristineness indicator rasters.

Grid: EPSG:3031, 50 km resolution, 6000x6000 km extent centred on South Pole.
All distances computed via cKDTree on projected coordinates.
"""
from __future__ import annotations

import base64
import io
import json
from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from PIL import Image
from scipy.ndimage import label as nd_label
from scipy.spatial import cKDTree

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "bundled"

# ── Grid constants ─────────────────────────────────────────────────────────────
RES_M = 50_000
EXTENT_M = 3_000_000
_xs = np.arange(-EXTENT_M, EXTENT_M + RES_M, RES_M, dtype=np.float64)
_ys = np.arange(-EXTENT_M, EXTENT_M + RES_M, RES_M, dtype=np.float64)
_GX, _GY = np.meshgrid(_xs, _ys)
NY, NX = _GX.shape
_GXf, _GYf = _GX.ravel(), _GY.ravel()
_RADIUS = np.sqrt(_GXf**2 + _GYf**2)
CONT_MASK = _RADIUS < 2_800_000
CONT_IDX = np.where(CONT_MASK)[0]
N_CONT = int(CONT_MASK.sum())
CELL_KM2 = (RES_M / 1000) ** 2
GRID_CONT = np.column_stack([_GXf[CONT_IDX], _GYf[CONT_IDX]])

# Image bounds for MapLibre raster overlay (EPSG:4326 corners, south of 60°S)
RASTER_COORDS = [[-180, -55], [180, -55], [180, -85.05], [-180, -85.05]]


# ── Data loading ───────────────────────────────────────────────────────────────

def _load(name: str) -> gpd.GeoDataFrame:
    path = DATA_DIR / f"{name}.geojson"
    if not path.exists():
        return gpd.GeoDataFrame(geometry=[], crs="EPSG:3031")
    gdf = gpd.read_file(str(path))
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    return gdf.to_crs("EPSG:3031")


def _load_precomputed_png(name: str) -> str | None:
    """Return base64-encoded precomputed raster PNG, or None."""
    path = DATA_DIR / f"{name}.png"
    if not path.exists():
        return None
    return base64.b64encode(path.read_bytes()).decode("ascii")


def load_precomputed_stats() -> dict:
    path = DATA_DIR / "precomputed_stats.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


# ── Raster utilities ───────────────────────────────────────────────────────────

def _make_png(
    arr_2d: np.ndarray,
    colors: list[str],
    vmin: float = 0,
    vmax: float = 100,
    *,
    max_alpha: int = 200,
    transparent_below: float | None = None,
    fade_span: float | None = None,
) -> str:
    """Render a float grid to a base64 PNG.

    Values outside the continent mask or NaN are fully transparent.
    When ``transparent_below`` is set, values at or below that threshold are
    also transparent (negligible / zero signal). Alpha then soft-ramps over
    ``fade_span`` up to ``max_alpha``.
    """
    span = max(vmax - vmin, 1e-6)
    norm = np.clip((arr_2d - vmin) / span, 0, 1)
    cmap = LinearSegmentedColormap.from_list("c", colors, N=256)
    # Force colormap RGB only; we own the alpha channel below.
    rgba = (cmap(norm) * 255).astype(np.uint8)

    cont = CONT_MASK.reshape(NY, NX)
    valid = cont & np.isfinite(arr_2d)
    alpha = np.zeros((NY, NX), dtype=np.uint8)

    if transparent_below is None:
        alpha[valid] = max_alpha
    else:
        # Soft fade so negligible values disappear instead of painting the basemap.
        fade = fade_span if fade_span is not None else max(span * 0.05, 1e-6)
        t = np.zeros_like(arr_2d, dtype=np.float64)
        above = valid & (arr_2d > transparent_below)
        t[above] = np.clip(
            (arr_2d[above] - transparent_below) / max(fade, 1e-6),
            0.0,
            1.0,
        )
        alpha[valid] = (t[valid] * max_alpha).astype(np.uint8)

    rgba[:, :, 3] = alpha
    buf = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _full_grid(values: np.ndarray) -> np.ndarray:
    """Expand continent-indexed values to full NY×NX grid (NaN outside)."""
    g = np.full(NY * NX, np.nan, dtype=np.float32)
    g[CONT_IDX] = values
    return g.reshape(NY, NX)


def _hist(values: np.ndarray, bins: int = 20) -> dict:
    counts, edges = np.histogram(values, bins=bins)
    return {"counts": counts.tolist(), "edges": [round(float(e), 1) for e in edges]}


# ── Core analysis ──────────────────────────────────────────────────────────────

def compute_remoteness(
    *,
    facility_decay_km: float = 100.0,
    visitor_decay_km: float = 50.0,
    visitor_weight: float = 0.5,
    uploaded_gdf: gpd.GeoDataFrame | None = None,
    merge_uploaded: bool = True,
) -> dict[str, Any]:
    """
    Remoteness score (0–100, higher = more remote).
    Exponential decay from facilities and visitor sites.
    IP 39 Table 4 rank thresholds: 5, 20, 50 km.
    """
    fac = _load("facilities")
    vis = _load("visitor_sites")

    if uploaded_gdf is not None and not uploaded_gdf.empty:
        uploaded_3031 = uploaded_gdf.to_crs("EPSG:3031") if uploaded_gdf.crs != "EPSG:3031" else uploaded_gdf
        if merge_uploaded:
            import pandas as pd
            fac = gpd.GeoDataFrame(pd.concat([fac, uploaded_3031], ignore_index=True), crs="EPSG:3031")
        else:
            fac = uploaded_3031

    fac_pts = np.column_stack([fac.geometry.x.values, fac.geometry.y.values])
    vis_pts = np.column_stack([vis.geometry.x.values, vis.geometry.y.values])

    fac_km = cKDTree(fac_pts).query(GRID_CONT, k=1)[0] / 1000
    vis_km = cKDTree(vis_pts).query(GRID_CONT, k=1)[0] / 1000
    min_km = np.minimum(fac_km, vis_km)

    impact = np.clip(
        np.exp(-fac_km / facility_decay_km) +
        np.exp(-vis_km / visitor_decay_km) * visitor_weight,
        0, 1
    )
    score = (1.0 - impact) * 100.0

    rank = np.zeros(N_CONT, dtype=int)
    rank[min_km >= 5]  = 1
    rank[min_km >= 20] = 2
    rank[min_km >= 50] = 3
    rank_labels = ["<5 km (Low)", "5–20 km", "20–50 km", ">50 km (High)"]
    rank_pcts = {lbl: round(float((rank == i).sum() / N_CONT * 100), 1)
                 for i, lbl in enumerate(rank_labels)}

    score_png = _make_png(
        _full_grid(score),
        ["#1a0533", "#1565c0", "#0097a7", "#43a047", "#f9fbe7"],
        transparent_below=0.0,
        fade_span=5.0,
    )
    # Rank 0 is a real class (<5 km), so keep all ranks opaque on-continent.
    rank_png = _make_png(
        _full_grid(rank.astype(float)),
        ["#d32f2f", "#f57c00", "#fbc02d", "#388e3c"],
        vmin=0,
        vmax=3,
    )

    return {
        "score_png":        score_png,
        "rank_png":         rank_png,
        "raster_coords":    RASTER_COORDS,
        "rank_pcts":        rank_pcts,
        "mean_score":       round(float(score.mean()), 1),
        "high_remoteness_pct":  round(float((min_km >= 50).sum() / N_CONT * 100), 1),
        "high_remoteness_km2":  int((min_km >= 50).sum() * CELL_KM2),
        "total_continent_km2":  int(N_CONT * CELL_KM2),
        "histogram":        _hist(score),
        "n_facilities":     len(fac),
        "n_visitor_sites":  len(vis),
        "params": {
            "facility_decay_km": facility_decay_km,
            "visitor_decay_km":  visitor_decay_km,
            "visitor_weight":    visitor_weight,
        },
    }


def compute_wildness(
    *,
    facility_sight_km: float = 100.0,
    visitor_sight_km:  float = 50.0,
    uploaded_gdf: gpd.GeoDataFrame | None = None,
    merge_uploaded: bool = True,
) -> dict[str, Any]:
    """
    Wildness score: binary — cells outside sight/sound range of all human infrastructure.
    Facility threshold: 100 km (large complexes, helicopter range).
    Visitor site threshold: 50 km (1 grid cell, transient presence).
    IP 39 §6.
    """
    fac = _load("facilities")
    vis = _load("visitor_sites")

    if uploaded_gdf is not None and not uploaded_gdf.empty:
        uploaded_3031 = uploaded_gdf.to_crs("EPSG:3031") if uploaded_gdf.crs != "EPSG:3031" else uploaded_gdf
        if merge_uploaded:
            import pandas as pd
            fac = gpd.GeoDataFrame(pd.concat([fac, uploaded_3031], ignore_index=True), crs="EPSG:3031")
        else:
            fac = uploaded_3031

    fac_pts = np.column_stack([fac.geometry.x.values, fac.geometry.y.values])
    vis_pts = np.column_stack([vis.geometry.x.values, vis.geometry.y.values])

    fac_km = cKDTree(fac_pts).query(GRID_CONT, k=1)[0] / 1000
    vis_km = cKDTree(vis_pts).query(GRID_CONT, k=1)[0] / 1000

    impacted = (fac_km < facility_sight_km) | (vis_km < visitor_sight_km)
    score = np.where(impacted, 0.0, 100.0)

    wild_pct   = round(float((~impacted).sum() / N_CONT * 100), 1)
    impact_pct = round(100.0 - wild_pct, 1)

    wild_png = _make_png(
        _full_grid(score),
        ["#b71c1c", "#ef9a9a", "#fff9c4", "#66bb6a", "#1b5e20"],
        transparent_below=0.0,
        fade_span=1.0,
    )
    # Binary impact mask: only impacted cells are visible.
    viewshed_png = _make_png(
        _full_grid(impacted.astype(float) * 100),
        ["#ef9a9a", "#b71c1c"],
        transparent_below=0.0,
        fade_span=1.0,
    )

    return {
        "wildness_png":         wild_png,
        "viewshed_png":         viewshed_png,
        "raster_coords":        RASTER_COORDS,
        "wild_pct":             wild_pct,
        "visible_impact_pct":   impact_pct,
        "wild_area_km2":        int((~impacted).sum() * CELL_KM2),
        "impacted_area_km2":    int(impacted.sum() * CELL_KM2),
        "total_continent_km2":  int(N_CONT * CELL_KM2),
        "histogram":            _hist(score),
        "n_facilities":         len(fac),
        "n_visitor_sites":      len(vis),
        "params": {
            "facility_sight_km": facility_sight_km,
            "visitor_sight_km":  visitor_sight_km,
        },
    }


def compute_pristineness(
    *,
    visit_decay_base_km:  float = 50.0,
    visit_decay_max_km:   float = 250.0,
    uploaded_gdf: gpd.GeoDataFrame | None = None,
    merge_uploaded: bool = True,
) -> dict[str, Any]:
    """
    Pristineness score using Leihy et al. 2020 inviolate wilderness as baseline.
    Inviolate cells: 50–100 (modulated by visit proximity).
    Non-inviolate cells: 0–60 (based on visit proximity).
    """
    vis = _load("visitor_sites")
    inv = _load("inviolate_wilderness")

    extra_footprints = None
    if uploaded_gdf is not None and not uploaded_gdf.empty:
        uploaded_3031 = uploaded_gdf.to_crs("EPSG:3031") if uploaded_gdf.crs != "EPSG:3031" else uploaded_gdf
        extra_footprints = uploaded_3031

    vis_pts = np.column_stack([vis.geometry.x.values, vis.geometry.y.values])
    vis_w   = np.clip(vis["total_visits_5yr"].values.astype(float), 1, None)

    inv_centroids = np.column_stack([inv.geometry.centroid.x, inv.geometry.centroid.y])

    vis_dists, vis_idx = cKDTree(vis_pts).query(GRID_CONT, k=1)
    vis_km = vis_dists / 1000
    inv_dists, _ = cKDTree(inv_centroids).query(GRID_CONT, k=1)
    is_inv = inv_dists < (RES_M * 0.8)

    # Extra uploaded footprints reduce pristineness further
    if extra_footprints is not None and not extra_footprints.empty:
        ext_pts = np.column_stack([extra_footprints.geometry.centroid.x,
                                   extra_footprints.geometry.centroid.y])
        ext_km = cKDTree(ext_pts).query(GRID_CONT, k=1)[0] / 1000
        if merge_uploaded:
            vis_km = np.minimum(vis_km, ext_km)
        else:
            vis_km = ext_km

    nearest_w = vis_w[vis_idx]
    d0 = visit_decay_base_km + visit_decay_max_km * np.log1p(nearest_w / 1000.0)
    visit_impact = np.exp(-vis_km / d0)

    score = np.where(
        is_inv,
        np.clip((1.0 - visit_impact * 0.5) * 100, 50, 100),
        np.clip((1.0 - visit_impact) * 60,          0,  60),
    )

    # Fragmentation stats on inviolate mask
    inv_2d = np.zeros((NY, NX), dtype=bool)
    rows, cols = CONT_IDX // NX, CONT_IDX % NX
    inv_2d[rows[is_inv], cols[is_inv]] = True
    labeled, n_p = nd_label(inv_2d)
    patch_km2 = (np.array([np.sum(labeled == i) for i in range(1, n_p + 1)]) * CELL_KM2
                 if n_p > 0 else np.array([0.0]))

    inv_pct = round(float(is_inv.sum() / N_CONT * 100), 1)

    prist_png = _make_png(
        _full_grid(score),
        ["#37474f", "#0277bd", "#00897b", "#2e7d32", "#f9fbe7"],
        transparent_below=0.0,
        fade_span=5.0,
    )
    # Binary inviolate mask: non-inviolate cells stay fully transparent.
    inv_png = _make_png(
        _full_grid(is_inv.astype(float) * 100),
        ["#66bb6a", "#1b5e20"],
        transparent_below=0.0,
        fade_span=1.0,
    )

    return {
        "pristineness_png":     prist_png,
        "inviolate_png":        inv_png,
        "raster_coords":        RASTER_COORDS,
        "inviolate_pct":        inv_pct,
        "inviolate_area_km2":   int(is_inv.sum() * CELL_KM2),
        "total_continent_km2":  int(N_CONT * CELL_KM2),
        "n_patches":            int(n_p),
        "largest_patch_km2":    int(patch_km2.max()),
        "mean_patch_km2":       round(float(patch_km2.mean()), 0),
        "mean_score":           round(float(score.mean()), 1),
        "histogram":            _hist(score),
        "n_visitor_sites":      len(vis),
        "n_inviolate_polygons": len(inv),
        "params": {
            "visit_decay_base_km": visit_decay_base_km,
            "visit_decay_max_km":  visit_decay_max_km,
        },
    }
