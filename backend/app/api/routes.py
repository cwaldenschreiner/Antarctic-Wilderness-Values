"""FastAPI routes for ANT-MICI Dashboard."""
from __future__ import annotations

import gc
import io
import json
import uuid
from pathlib import Path
from typing import Annotated

import geopandas as gpd
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.analytics.compute import (
    DATA_DIR,
    compute_pristineness,
    compute_remoteness,
    compute_wildness,
    load_precomputed_stats,
    _load_precomputed_png,
    RASTER_COORDS,
    RASTER_IMAGE_EXTENT,
)

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
_uploads: dict[str, gpd.GeoDataFrame] = {}


# ── Pydantic models ────────────────────────────────────────────────────────────

class RemotenessParams(BaseModel):
    facility_decay_km: float = Field(100.0, ge=10, le=500)
    visitor_decay_km:  float = Field(50.0,  ge=5,  le=500)
    visitor_weight:    float = Field(0.5,   ge=0,  le=1)
    opacity:           float = Field(0.8,   ge=0,  le=1)
    upload_id:         str | None = None
    merge_uploaded:    bool = True


class WildnessParams(BaseModel):
    facility_sight_km: float = Field(100.0, ge=10, le=500)
    visitor_sight_km:  float = Field(50.0,  ge=5,  le=500)
    opacity:           float = Field(0.8,   ge=0,  le=1)
    upload_id:         str | None = None
    merge_uploaded:    bool = True


class PristinenessParams(BaseModel):
    visit_decay_base_km: float = Field(50.0,  ge=10, le=200)
    visit_decay_max_km:  float = Field(250.0, ge=50, le=1000)
    opacity:             float = Field(0.8,   ge=0,  le=1)
    upload_id:           str | None = None
    merge_uploaded:      bool = True


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_upload(upload_id: str | None) -> gpd.GeoDataFrame | None:
    if not upload_id:
        return None
    if upload_id in _uploads:
        return _uploads[upload_id]
    path = UPLOAD_DIR / f"{upload_id}.geojson"
    return gpd.read_file(str(path)) if path.exists() else None


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@router.get("/layers/catalog")
def catalog():
    path = DATA_DIR / "catalog.json"
    if path.exists():
        return json.loads(path.read_text())
    return {"layers": []}


@router.get("/layers/{name}")
def get_layer(name: str):
    path = DATA_DIR / f"{name}.geojson"
    if not path.exists():
        raise HTTPException(404, f"Layer not found: {name}")
    gdf = gpd.read_file(str(path))
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    return json.loads(gdf.to_crs("EPSG:4326").to_json())


@router.get("/precomputed")
def precomputed():
    """Return precomputed rasters and stats for dashboard cold-load."""
    stats = load_precomputed_stats()
    rasters = {}
    for key in ["remoteness_score", "remoteness_rank",
                "wildness_index", "cumulative_viewshed",
                "pristineness_index", "inviolate_mask"]:
        png = _load_precomputed_png(key)
        if png:
            rasters[key] = png
    grids_path = DATA_DIR / "precomputed_grids.json"
    grids = json.loads(grids_path.read_text()) if grids_path.exists() else {}
    return {
        "rasters": rasters,
        "grids": grids,
        "stats": stats,
        "raster_coords": RASTER_COORDS,
        "raster_extent": RASTER_IMAGE_EXTENT,
    }


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    fname = file.filename or "upload.geojson"
    try:
        gdf = gpd.read_file(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    uid = str(uuid.uuid4())
    _uploads[uid] = gdf
    (UPLOAD_DIR / f"{uid}.geojson").write_text(gdf.to_crs("EPSG:4326").to_json())
    return {
        "upload_id":     uid,
        "feature_count": len(gdf),
        "geometry_types": gdf.geometry.geom_type.value_counts().to_dict(),
        "crs":           str(gdf.crs),
    }


@router.post("/analyze/remoteness")
def analyze_remoteness(req: RemotenessParams):
    uploaded = _get_upload(req.upload_id)
    try:
        result = compute_remoteness(
            facility_decay_km=req.facility_decay_km,
            visitor_decay_km=req.visitor_decay_km,
            visitor_weight=req.visitor_weight,
            uploaded_gdf=uploaded,
            merge_uploaded=req.merge_uploaded,
        )
    except Exception as e:
        raise HTTPException(500, str(e))
    gc.collect()
    return result


@router.post("/analyze/wildness")
def analyze_wildness(req: WildnessParams):
    uploaded = _get_upload(req.upload_id)
    try:
        result = compute_wildness(
            facility_sight_km=req.facility_sight_km,
            visitor_sight_km=req.visitor_sight_km,
            uploaded_gdf=uploaded,
            merge_uploaded=req.merge_uploaded,
        )
    except Exception as e:
        raise HTTPException(500, str(e))
    gc.collect()
    return result


@router.post("/analyze/pristineness")
def analyze_pristineness(req: PristinenessParams):
    uploaded = _get_upload(req.upload_id)
    try:
        result = compute_pristineness(
            visit_decay_base_km=req.visit_decay_base_km,
            visit_decay_max_km=req.visit_decay_max_km,
            uploaded_gdf=uploaded,
            merge_uploaded=req.merge_uploaded,
        )
    except Exception as e:
        raise HTTPException(500, str(e))
    gc.collect()
    return result
