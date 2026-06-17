#!/usr/bin/env python3
"""Ensure bundled demo data is present."""

from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data" / "bundled"
REQUIRED = [
    "building_footprints.geojson",
    "linear_corridors.geojson",
    "visitor_sites.geojson",
    "human_footprints.geojson",
    "visitation_records.geojson",
    "catalog.json",
]


def main():
    missing = [f for f in REQUIRED if not (DATA / f).exists()]
    if missing:
        raise SystemExit(f"Missing bundled data: {missing}")
    print("Basemap/demo data OK:", DATA)


if __name__ == "__main__":
    main()
