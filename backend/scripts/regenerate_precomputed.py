#!/usr/bin/env python3
"""Regenerate bundled precomputed PNG rasters and stats JSON."""
from __future__ import annotations

import base64
import json
from pathlib import Path

from app.analytics.compute import (
    DATA_DIR,
    compute_pristineness,
    compute_remoteness,
    compute_wildness,
)


def _write_png(name: str, b64: str) -> None:
    path = DATA_DIR / f"{name}.png"
    path.write_bytes(base64.b64decode(b64))
    print(f"wrote {path.name} ({path.stat().st_size:,} bytes)")


def main() -> None:
    rem = compute_remoteness()
    wild = compute_wildness()
    prist = compute_pristineness()

    _write_png("remoteness_score", rem["score_png"])
    _write_png("remoteness_rank", rem["rank_png"])
    _write_png("wildness_index", wild["wildness_png"])
    _write_png("cumulative_viewshed", wild["viewshed_png"])
    _write_png("pristineness_index", prist["pristineness_png"])
    _write_png("inviolate_mask", prist["inviolate_png"])

    stats = {
        "remoteness": {
            "rank_pcts": rem["rank_pcts"],
            "mean_score": rem["mean_score"],
            "high_remoteness_pct": rem["high_remoteness_pct"],
            "high_remoteness_km2": rem["high_remoteness_km2"],
            "total_continent_km2": rem["total_continent_km2"],
        },
        "wildness": {
            "wild_pct": wild["wild_pct"],
            "visible_impact_pct": wild["visible_impact_pct"],
            "wild_area_km2": wild["wild_area_km2"],
            "impacted_area_km2": wild["impacted_area_km2"],
            "total_continent_km2": wild["total_continent_km2"],
        },
        "pristineness": {
            "inviolate_pct": prist["inviolate_pct"],
            "inviolate_area_km2": prist["inviolate_area_km2"],
            "total_continent_km2": prist["total_continent_km2"],
            "n_patches": prist["n_patches"],
            "largest_patch_km2": prist["largest_patch_km2"],
            "mean_patch_km2": prist["mean_patch_km2"],
            "mean_score": prist["mean_score"],
        },
    }
    stats_path = DATA_DIR / "precomputed_stats.json"
    stats_path.write_text(json.dumps(stats, indent=2) + "\n")
    print(f"wrote {stats_path.name}")


if __name__ == "__main__":
    main()
