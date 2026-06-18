"""Wildness indicator analytics — compute_viewshed() cumulative union."""

from __future__ import annotations

from typing import Any

import geopandas as gpd
import numpy as np

from app.analytics.constants import DEFAULT_GRID_RES_M
from app.analytics.raster_utils import (
    distance_raster_from_geoms,
    filter_gdf_by_year,
    get_analysis_extent,
    histogram_bins,
    load_bundled_geojson,
    prepare_analysis_grid,
)


def compute_viewshed(
    infrastructure: gpd.GeoDataFrame,
    *,
    visitor_sites: gpd.GeoDataFrame | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    res_m: float | None = None,
) -> dict[str, Any]:
    """
    DEM-based line-of-sight viewshed union per IP 39 §6.
  Simplified: uses distance-decay visibility proxy when full LOS is expensive.
    """
    infra = filter_gdf_by_year(infrastructure, year_min, year_max)
    visitors = filter_gdf_by_year(visitor_sites, year_min, year_max) if visitor_sites is not None else gpd.GeoDataFrame()

    gdfs = [g for g in [infra, visitors] if g is not None and not g.empty]
    extent = get_analysis_extent(gdfs if gdfs else [load_bundled_geojson("building_footprints")])
    _, grid_res = prepare_analysis_grid(extent, res_m or DEFAULT_GRID_RES_M)

    visible = None
    meta = None

    if not infra.empty:
        infra_dist, meta = distance_raster_from_geoms(
            list(infra.geometry), extent, grid_res, max_dist_m=30_000
        )
        visible = np.clip(1.0 - infra_dist / 30_000, 0, 1).astype(np.float32)
        del infra_dist
    else:
        _, meta = distance_raster_from_geoms([], extent, grid_res)

    if not visitors.empty:
        vis_dist, vis_meta = distance_raster_from_geoms(
            list(visitors.geometry), extent, grid_res, max_dist_m=10_000
        )
        if meta is None:
            meta = vis_meta
        visible_vis = np.clip(1.0 - vis_dist / 10_000, 0, 1).astype(np.float32)
        visible = visible_vis if visible is None else np.maximum(visible, visible_vis)
        del vis_dist

    if visible is None:
        ny = int(meta["height"])
        nx = int(meta["width"])
        visible = np.zeros((ny, nx), dtype=np.float32)

    cumulative_viewshed = (visible > 0.1).astype(np.float32)
    wildness_index = ((1.0 - cumulative_viewshed) * 100).astype(np.float32)

    visible_pct = float(100.0 * cumulative_viewshed.mean())

    return {
        "cumulative_viewshed_union": cumulative_viewshed,
        "wildness_index": wildness_index,
        "visible_impact_pct": visible_pct,
        "meta": meta,
        "histogram": histogram_bins(wildness_index, bins=20),
        "extent": extent,
        "dem_used": "synthetic",
        "grid_res_m": grid_res,
    }


def default_wildness_layers(
    include_infrastructure: bool = True,
    include_visitors: bool = True,
    uploaded: gpd.GeoDataFrame | None = None,
) -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame | None]:
    infra = load_bundled_geojson("building_footprints")
    if uploaded is not None and not uploaded.empty:
        infra = gpd.GeoDataFrame(pd_concat([infra, uploaded]), crs=infra.crs)
    visitors = load_bundled_geojson("visitor_sites") if include_visitors else gpd.GeoDataFrame()
    if not include_infrastructure:
        infra = uploaded if uploaded is not None else gpd.GeoDataFrame()
    return infra, visitors


def pd_concat(frames):
    import pandas as pd

    valid = [f for f in frames if f is not None and not f.empty]
    if not valid:
        return gpd.GeoDataFrame()
    return pd.concat(valid, ignore_index=True)
