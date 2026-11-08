# Metro Vancouver terrain

Bounded 224 × 276 elevation grid covering 49.0–49.4° N, −123.3–−122.55° E, sampled at approximately 200 m from Mapzen Terrarium elevation tiles at zoom 10. Elevations are metres above sea level. Negative coastal bathymetry is clamped to zero at query time. This grid is not survey-grade; refinement below its source resolution does not establish corresponding positional accuracy.

Source: https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png

Decoded elevation: R × 256 + G + B / 256 − 32768.

Canada terrain contains information licensed under the Open Government Licence – Canada. Global GMTED2010 and SRTM terrain courtesy of the U.S. Geological Survey; global ETOPO1 terrain courtesy of NOAA. Mapzen Terrain Tiles are redistributed through AWS Open Data.

Source attribution and licensing: https://github.com/tilezen/joerd/blob/master/docs/attribution.md