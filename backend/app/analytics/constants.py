"""IP 39 / Summerson analytical constants."""

import os

HIGH_IMPACT_DIST_M = 20_000
MED_IMPACT_DIST_M = 5_000
LINEAR_IMPACT_DIST_M = 2_000

REMOTENESS_THRESHOLDS_KM = [5, 20, 50]
REMOTENESS_RANK_LABELS = [
    "High",
    "High-Moderate",
    "Moderate",
    "Low-to-zero",
]

ACTIVITY_IMPACT_M = {
    "permanent_station": HIGH_IMPACT_DIST_M,
    "airstrip": 15_000,
    "summer_facility": 15_000,
    "telecomm_dome": 30_000,
    "refuge": MED_IMPACT_DIST_M,
    "aws": MED_IMPACT_DIST_M,
    "traverse": LINEAR_IMPACT_DIST_M,
    "marker": 3_000,
    "visitor_site": MED_IMPACT_DIST_M,
    "planned_infrastructure": HIGH_IMPACT_DIST_M,
    "linear_corridor": LINEAR_IMPACT_DIST_M,
    "building": HIGH_IMPACT_DIST_M,
    "default": MED_IMPACT_DIST_M,
}

LAYER_WEIGHTS = {
    "building_footprints": 1.0,
    "linear_corridors": 0.8,
    "visitor_sites": 0.7,
    "planned_operations": 0.6,
    "deep_field_tourism": 0.5,
    "uploaded": 1.0,
}

DURATION_WEIGHT_PERMANENT = 1.0
DURATION_WEIGHT_TRANSIENT = 0.5

ANTARCTIC_BOUNDS = (-180.0, -90.0, 180.0, -60.0)
EPSG_ANTARCTIC = "EPSG:3031"

# Memory-safe defaults for cloud deploy (override via env on Render)
DEFAULT_GRID_RES_M = float(os.getenv("GRID_RES_M", "15000"))
MAX_GRID_CELLS = int(os.getenv("MAX_GRID_CELLS", "150000"))
MAX_RASTER_DIM = int(os.getenv("MAX_RASTER_DIM", "512"))
EXTENT_PADDING_M = float(os.getenv("EXTENT_PADDING_M", "100000"))
