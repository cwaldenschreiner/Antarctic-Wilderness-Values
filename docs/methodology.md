# Methodology

Analytical methods follow the ANT-MICI-Dashboard specification, grounded in:

- Summerson, R. (2012). Protection of Wilderness and Aesthetic Values in Antarctica.
- Summerson, R. & Bishop, I.D. (2012). Polar Research, 31, 10858.
- New Zealand (2013). ATCM XXXVI IP 39.

## Remoteness

`combined_remoteness_score()` combines weighted distance layers from building footprints, linear corridors, and visitor sites. Activity-type impact radii map to IP 39 Table 1. Wilderness ranks use thresholds of 5, 20, and 50 km (Table 4).

## Wildness

`compute_viewshed()` implements cumulative viewshed union per IP 39 §6. REMA DEM used when available; synthetic DEM otherwise.

## Pristineness

Inviolate areas and fragmentation metrics follow Hughes et al. (2011) and Leihy et al. (2020). Pollutant layers are placeholders.
