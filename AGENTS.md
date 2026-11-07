# Project rules
- Keep the audio locator frontend self-contained and its results explicitly simulated until a real analysis service exists; audio alone does not establish a reliable caller location.
- Use Leaflet with credited OpenStreetMap raster tiles for the location-result map, requiring no provider key.
- Keep audio files local in browser memory and revoke object URLs on replacement or unmount.