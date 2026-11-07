# Project rules
- Authenticate OpenSky only server-side using saved OAuth client credentials; never expose provider response bodies or tokens in errors because they may contain sensitive data.
- Keep the audio locator frontend self-contained and its results explicitly simulated until a real analysis service exists; audio alone does not establish a reliable caller location.
- Use Leaflet with credited OpenStreetMap raster tiles for the location-result map, requiring no provider key.
- Keep audio files local in browser memory and revoke object URLs on replacement or unmount.
- Serve supplied scenario recordings through asset pointers in HikerDemo; keep its playback and unavailable-analysis state separate from legacy simulated map previews so demo audio never produces invented detections.
- Keep Technology content in TechnologySection on the home page and redirect legacy /technology links to /#technology; SiteHeader anchors scroll to the section and home callbacks reset the cinematic view.
- Use the retarded-time Doppler model for the teaching visual so sound propagation and the plotted pitch stay synchronized.
- Render scientific concept pictures as accessible token-themed SVG diagrams so their geometry remains accurate and legible at small sizes.