"""Remoteness indicator analytics — combined_remoteness_score()."""

from __future__ import annotations

from typing import Any

import geopandas as gpd
import numpy as np

from app.analytics.constants import (
    ACTIVITY_IMPACT_M,
    DURATION_WEIGHT_PERMANENT,
    DURATION_WEIGHT_TRANSIENT,
    LAYER_WEIGHTS,
    REMOTENESS_RANK_LABELS,
    REMOTENESS_THRESHOLDS_KM,
)
from app.analytics.constants import DEFAULT_GRID_RES_M
from app.analytics.raster_utils import (
    classify_remoteness_ranks,
    compute_area_stats,
    distance_raster_from_geoms,
    filter_gdf_by_year,
    get_analysis_extent,
    histogram_bins,
    load_bundled_geojson,
    prepare_analysis_grid,
)


def _layer_weight(gdf: gpd.GeoDataFrame, layer_key: str) -> float:
    base = LAYER_WEIGHTS.get(layer_key, 1.0)
    if gdf.empty or "duration" not in gdf.columns:
        return base
    transient = (gdf["duration"].astype(str).str.lower() == "transient").mean()
    duration_factor = DURATION_WEIGHT_TRANSIENT if transient > 0.5 else DURATION_WEIGHT_PERMANENT
    return base * duration_factor


def _impact_radius(gdf: gpd.GeoDataFrame) -> float:
    if gdf.empty:
        return ACTIVITY_IMPACT_M["default"]
    if "activity_type" in gdf.columns:
        types = gdf["activity_type"].astype(str).str.lower()
        radii = [ACTIVITY_IMPACT_M.get(t, ACTIVITY_IMPACT_M["default"]) for t in types]
        return float(np.mean(radii))
    return ACTIVITY_IMPACT_M["default"]


def combined_remoteness_score(
    *,
    layers: dict[str, gpd.GeoDataFrame],
    year_min: int | None = None,
    year_max: int | None = None,
    res_m: float | None = None,
) -> dict[str, Any]:
    """
    Weighted combination of distance layers per IP 39 extent dimension.
    Higher score = more remote.
    """
    filtered = {k: filter_gdf_by_year(v, year_min, year_max) for k, v in layers.items()}
    extent = get_analysis_extent(list(filtered.values()))
    _, grid_res = prepare_analysis_grid(extent, res_m or DEFAULT_GRID_RES_M)

    weights: dict[str, float] = {}
    meta = None
    score: np.ndarray | None = None

    for key, gdf in filtered.items():
        if gdf.empty:
            continue
        geoms = list(gdf.geometry)
        max_dist = _impact_radius(gdf) * 5
        dist, meta = distance_raster_from_geoms(geoms, extent, grid_res, max_dist_m=max_dist)
        w = _layer_weight(gdf, key)
        weights[key] = w
        dmax = float(np.max(dist)) or 1.0
        normalized = (dist / dmax) * 100.0
        if score is None:
            score = (w * normalized).astype(np.float32)
        else:
            score += (w * normalized).astype(np.float32)
        del dist

    if score is None:
        ny = nx = 100
        score = np.full((ny, nx), 100.0, dtype=np.float32)
        rank = np.zeros((ny, nx), dtype=np.int8)
        meta = {"bounds": extent, "res_m": grid_res, "width": nx, "height": ny}
    else:
        total_w = sum(weights.values()) or 1.0
        score /= total_w
        dist_km = score / 100.0 * max(REMOTENESS_THRESHOLDS_KM)
        rank = classify_remoteness_ranks(dist_km)

    rank_stats = compute_area_stats(rank, REMOTENESS_RANK_LABELS)

    return {
        "combined_remoteness_score": score,
        "remoteness_rank": rank,
        "meta": meta,
        "rank_stats": rank_stats,
        "histogram": histogram_bins(score, bins=20),
        "extent": extent,
        "grid_res_m": grid_res,
    }


def default_remoteness_layers(
    include_buildings: bool = True,
    include_corridors: bool = True,
    include_visitor_sites: bool = True,
    include_planned: bool = False,
    uploaded: gpd.GeoDataFrame | None = None,
) -> dict[str, gpd.GeoDataFrame]:
    layers: dict[str, gpd.GeoDataFrame] = {}
    if include_buildings:
        layers["building_footprints"] = load_bundled_geojson("building_footprints")
    if include_corridors:
        layers["linear_corridors"] = load_bundled_geojson("linear_corridors")
    if include_visitor_sites:
        layers["visitor_sites"] = load_bundled_geojson("visitor_sites")
    if include_planned:
        layers["planned_operations"] = load_bundled_geojson("planned_operations")
    if uploaded is not None and not uploaded.empty:
        layers["uploaded"] = uploaded
    return layers
