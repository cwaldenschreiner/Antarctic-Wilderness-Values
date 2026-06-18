"""Pristineness indicator analytics — inviolate areas and fragmentation."""

from __future__ import annotations

from typing import Any

import geopandas as gpd
import numpy as np

from app.analytics.constants import DEFAULT_GRID_RES_M
from app.analytics.raster_utils import (
    compute_fragmentation_stats,
    distance_raster_from_geoms,
    filter_gdf_by_year,
    get_analysis_extent,
    histogram_bins,
    load_bundled_geojson,
    prepare_analysis_grid,
)


def compute_pristineness(
    *,
    human_activity: gpd.GeoDataFrame,
    visitation: gpd.GeoDataFrame | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    res_m: float | None = None,
    impact_threshold_m: float = 5000,
) -> dict[str, Any]:
    """
    Inviolate mask: areas beyond human activity footprint.
    Fragmentation stats per Leihy et al. (2020) / Hughes et al. (2011).
    """
    activity = filter_gdf_by_year(human_activity, year_min, year_max)
    visits = filter_gdf_by_year(visitation, year_min, year_max) if visitation is not None else gpd.GeoDataFrame()

    gdfs = [g for g in [activity, visits] if not g.empty]
    extent = get_analysis_extent(gdfs if gdfs else [load_bundled_geojson("human_footprints")])
    _, grid_res = prepare_analysis_grid(extent, res_m or DEFAULT_GRID_RES_M)

    combined_geoms = []
    if not activity.empty:
        combined_geoms.extend(activity.geometry)
    if not visits.empty:
        combined_geoms.extend(visits.geometry)

    if combined_geoms:
        dist, meta = distance_raster_from_geoms(
            combined_geoms, extent, grid_res, max_dist_m=impact_threshold_m * 3
        )
    else:
        dist, meta = distance_raster_from_geoms([], extent, grid_res)

    inviolate_mask = (dist >= impact_threshold_m).astype(np.float32)
    pristineness_index = np.clip((dist / impact_threshold_m) * 100, 0, 100).astype(np.float32)

    frag = compute_fragmentation_stats(inviolate_mask.astype(bool), grid_res)

    return {
        "inviolate_mask": inviolate_mask,
        "pristineness_index": pristineness_index,
        "fragmentation": frag,
        "meta": meta,
        "histogram": histogram_bins(pristineness_index, bins=20),
        "extent": extent,
        "grid_res_m": grid_res,
        "pollutant_note": "Air/water pollutant layers are placeholders (Kennicutt et al. 2010 McMurdo only).",
    }


def default_pristineness_layers(
    include_footprints: bool = True,
    include_visitation: bool = True,
    uploaded: gpd.GeoDataFrame | None = None,
) -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame | None]:
    footprints = load_bundled_geojson("human_footprints") if include_footprints else gpd.GeoDataFrame()
    visitation = load_bundled_geojson("visitation_records") if include_visitation else gpd.GeoDataFrame()
    if uploaded is not None and not uploaded.empty:
        footprints = gpd.GeoDataFrame(
            __import__("pandas").concat([footprints, uploaded], ignore_index=True),
            crs=footprints.crs if not footprints.empty else uploaded.crs,
        )
    return footprints, visitation
