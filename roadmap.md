# Audio locator
- [x] Explore the demo opens cinematic hiker audio/zoom/search; inline hiker section removed. Verified actual hosted recording with local delivery interception, natural audio end, aircraft movement, radius 1775→397→25 m, exact reveal, restart/skip, mobile and no runtime errors.
- [x] Implement fullscreen audio → black fade → Earth zoom → simulated flight/search → configured hiker reveal; tested natural audio end, skip/restart/close, no live calls and mobile. Local asset delivery mocked from the actual hosted recordings for browser checks.
- [x] Replace flat image spin with a globe rotating around its polar axis; verified desktop/mobile, reduced motion and existing map transition/reset.
- [x] Align transmitting label with the account note and slowly spin the globe; verified layout and reduced motion.
- [x] Add Stawamus Chief fictional hiker demo with uploaded recording, playback controls and honest analysis availability; verified desktop/mobile. No audio-analysis API exists; no detections are generated.
- [x] Replace camping home with globe-backed audio locator.
- [x] Add audio upload, microphone recording, and explicitly simulated map result.
- [x] Verify desktop/mobile and audio demo flow.
# Location logic & pages
- [ ] Finish ADSB.lol Metro Vancouver past-month extraction and database loading; blocked by ~113 GB of global archive transfer requiring a sustained batch worker. Five-second-spaced manifest verified for Oct 8–Nov 6; streaming importer and protected table ready, zero positions loaded.
- [ ] Verify OpenSky OAuth flight lookup: credentials saved and function deployed, but the live sign-in request timed out. Blocked by OpenSky connectivity; keep audio analysis separate.
- [ ] Real location logic: synthetic tests exist; live results blocked by unavailable, unverified OpenSky flight access. Keep public location results simulated.
- [x] Verify GeoLocator title/brand returns to the opening screen, including after the demo.
- [x] Finish and verify Technology page: existing content, plain-language explanations and interactive flight-path/frequency visual on desktop and mobile.
- [x] Move Technology visual first and pair three-sentence concept summaries with matching diagrams; verified desktop/tablet/mobile and interactive controls.
- [x] Embed Technology content below the home workspace; verified Technology scrolling, legacy links, visual controls and desktop/mobile navigation.
- [x] Tighten gaps between science sections; verified desktop/tablet/mobile.
- [x] Rename GeoLocator to Doppler in the site and project; verified names and home navigation.
