"""FastAPI routes."""

from __future__ import annotations

import base64
import uuid
from pathlib import Path
from typing import Any

import geopandas as gpd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.analytics.pristineness import compute_pristineness, default_pristineness_layers
from app.analytics.raster_utils import gdf_to_geojson_dict, load_bundled_geojson, parse_upload, raster_to_png_bytes
from app.analytics.remoteness import combined_remoteness_score, default_remoteness_layers
from app.analytics.wildness import compute_viewshed, default_wildness_layers
from app.models.schemas import PristinenessRequest, RemotenessRequest, WildnessRequest

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
_uploads: dict[str, gpd.GeoDataFrame] = {}


def _encode_raster(arr, cmap: str = "viridis", vmin=None, vmax=None) -> str:
    png = raster_to_png_bytes(arr, cmap=cmap, vmin=vmin, vmax=vmax)
    return base64.b64encode(png).decode("ascii")


def _result_with_raster(result: dict[str, Any], key: str, cmap: str = "viridis") -> dict[str, Any]:
    out = {k: v for k, v in result.items() if not isinstance(v, type(result.get(key))) or k != key}
    arr = result[key]
    out[key] = {
        "png_base64": _encode_raster(arr, cmap=cmap),
        "meta": result.get("meta"),
    }
    return out


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/layers/catalog")
def layer_catalog():
    data_dir = Path(__file__).resolve().parents[2] / "data" / "bundled"
    catalog_path = data_dir / "catalog.json"
    if catalog_path.exists():
        import json

        return json.loads(catalog_path.read_text())
    return {"layers": []}


@router.get("/layers/{name}")
def get_layer(name: str):
    gdf = load_bundled_geojson(name)
    return gdf_to_geojson_dict(gdf)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    try:
        gdf = parse_upload(content, file.filename or "upload.geojson")
    except Exception as e:
        raise HTTPException(400, f"Failed to parse upload: {e}") from e
    upload_id = str(uuid.uuid4())
    _uploads[upload_id] = gdf
    path = UPLOAD_DIR / f"{upload_id}.geojson"
    gdf.to_file(path, driver="GeoJSON")
    return {
        "upload_id": upload_id,
        "feature_count": len(gdf),
        "geojson": gdf_to_geojson_dict(gdf),
    }


def _get_upload(upload_id: str | None) -> gpd.GeoDataFrame | None:
    if not upload_id:
        return None
    if upload_id in _uploads:
        return _uploads[upload_id]
    path = UPLOAD_DIR / f"{upload_id}.geojson"
    if path.exists():
        return gpd.read_file(path)
    return None


@router.post("/analyze/remoteness")
def analyze_remoteness(req: RemotenessRequest):
    uploaded = _get_upload(req.upload_id)
    layers = default_remoteness_layers(
        include_buildings=req.layers.buildings,
        include_corridors=req.layers.corridors,
        include_visitor_sites=req.layers.visitor_sites,
        include_planned=req.layers.planned,
        uploaded=uploaded,
    )
    result = combined_remoteness_score(layers=layers, year_min=req.year_min, year_max=req.year_max)
    response = {
        "rank_stats": result["rank_stats"],
        "histogram": result["histogram"],
        "extent": result["extent"],
        "combined_remoteness_score": {
            "png_base64": _encode_raster(result["combined_remoteness_score"], cmap="YlGn"),
            "meta": result["meta"],
        },
        "remoteness_rank": {
            "png_base64": _encode_raster(result["remoteness_rank"], cmap="RdYlGn", vmin=0, vmax=3),
            "meta": result["meta"],
        },
        "input_layers": {k: gdf_to_geojson_dict(v) for k, v in layers.items() if not v.empty},
    }
    return response


@router.post("/analyze/wildness")
def analyze_wildness(req: WildnessRequest):
    uploaded = _get_upload(req.upload_id)
    infra, visitors = default_wildness_layers(include_visitors=req.include_visitors, uploaded=uploaded)
    result = compute_viewshed(infra, visitor_sites=visitors, year_min=req.year_min, year_max=req.year_max)
    return {
        "visible_impact_pct": result["visible_impact_pct"],
        "histogram": result["histogram"],
        "extent": result["extent"],
        "dem_used": result["dem_used"],
        "wildness_index": {
            "png_base64": _encode_raster(result["wildness_index"], cmap="Greens"),
            "meta": result["meta"],
        },
        "cumulative_viewshed_union": {
            "png_base64": _encode_raster(result["cumulative_viewshed_union"], cmap="Reds"),
            "meta": result["meta"],
        },
    }


@router.post("/analyze/pristineness")
def analyze_pristineness(req: PristinenessRequest):
    uploaded = _get_upload(req.upload_id)
    footprints, visitation = default_pristineness_layers(uploaded=uploaded)
    result = compute_pristineness(
        human_activity=footprints,
        visitation=visitation,
        year_min=req.year_min,
        year_max=req.year_max,
        impact_threshold_m=req.impact_threshold_m,
    )
    return {
        "fragmentation": result["fragmentation"],
        "histogram": result["histogram"],
        "extent": result["extent"],
        "pollutant_note": result["pollutant_note"],
        "pristineness_index": {
            "png_base64": _encode_raster(result["pristineness_index"], cmap="Blues"),
            "meta": result["meta"],
        },
        "inviolate_mask": {
            "png_base64": _encode_raster(result["inviolate_mask"], cmap="binary"),
            "meta": result["meta"],
        },
    }
