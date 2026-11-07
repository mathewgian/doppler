# Project rules
- Keep the audio locator frontend self-contained and its results explicitly simulated until a real analysis service exists; audio alone does not establish a reliable caller location.
- Use Leaflet with credited OpenStreetMap raster tiles for the location-result map, requiring no provider key.
- Keep audio files local in browser memory and revoke object URLs on replacement or unmount.
- Share SiteHeader across the home and Technology pages; home callbacks reset the cinematic view while other pages navigate back.
- Use the retarded-time Doppler model for the teaching visual so sound propagation and the plotted pitch stay synchronized.