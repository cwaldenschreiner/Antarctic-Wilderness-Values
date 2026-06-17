"""IP 39 / Summerson analytical constants."""

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
DEFAULT_GRID_RES_M = 1000
