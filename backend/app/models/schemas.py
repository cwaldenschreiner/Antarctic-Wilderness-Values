"""Pydantic schemas for API."""

from typing import Any

from pydantic import BaseModel, Field


class LayerToggle(BaseModel):
    buildings: bool = True
    corridors: bool = True
    visitor_sites: bool = True
    planned: bool = False


class RemotenessRequest(BaseModel):
    year_min: int | None = None
    year_max: int | None = None
    opacity: float = Field(0.7, ge=0, le=1)
    layers: LayerToggle = LayerToggle()
    upload_id: str | None = None


class WildnessRequest(BaseModel):
    year_min: int | None = None
    year_max: int | None = None
    opacity: float = Field(0.7, ge=0, le=1)
    include_visitors: bool = True
    upload_id: str | None = None


class PristinenessRequest(BaseModel):
    year_min: int | None = None
    year_max: int | None = None
    impact_threshold_m: float = 5000
    opacity: float = Field(0.7, ge=0, le=1)
    upload_id: str | None = None


class AnalysisResponse(BaseModel):
    job_id: str
    status: str
    result: dict[str, Any] | None = None
