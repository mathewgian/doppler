# ADSB.lol historical import

Source: https://github.com/adsblol/globe_history_2026/releases
License: ODbL 1.0. Attribute ADSB.lol and contributing feeders; retain source URLs and comply with derived-database obligations before publishing the data.

The importer spaces requests **at least five seconds apart**. This is historical batch downloading, not a five-second live poll. It retains all valid regional trace timestamps, not one sample every five seconds.

Metro Vancouver uses the existing analysis bounding box: latitude 49.0–49.4, longitude −123.3–−122.55. This excludes the Squamish cinematic simulation. The previous 30 complete UTC days on November 7 are October 8–November 6.

## Run on a batch-processing machine

Python 3, standard library only. Keep output outside the source checkout.

```bash
python3 scripts/pull-adsblol-archives.py --output /tmp/adsblol-metro --end 2026-11-07 --manifest-only
python3 scripts/pull-adsblol-archives.py --output /tmp/adsblol-metro --end 2026-11-07
```

The global split tar parts are streamed sequentially without extraction to disk. Daily regional CSVs and completion checkpoints are retained. Completed days are skipped on rerun; interrupted days restart from the beginning. `--max-transfer-mb` provides a per-day transfer safety limit; partial files are explicitly marked and must not be treated as complete coverage.

The full month requires tens of gigabytes of network transfer and a sustained batch worker, not a browser or short-lived Cloud function. No scheduled five-second polling is installed.

## Database loading

The service-only `public.aircraft_archive_positions` table is ready for validated CSV rows. Load regional rows in bounded batches through the managed data-write tools, with conflict handling on `(source, icao24, observed_at)`. Do not put privileged credentials in this script or frontend. The CSV includes absolute UTC timestamps, geometric altitude when available (otherwise barometric altitude), ground speed converted from knots to m/s, track, callsign, position source, and archive provenance. Stale positions are excluded and unknown altitude stays empty.

The download script **does not load CSVs into the database automatically**. Deduplication uses a disk-backed SQLite index to keep memory bounded. Gzip signatures, rather than filename extensions, identify compressed traces.

## Verified one-day import

November 6, 2026 prod-0 was fully streamed and filtered: 75,277 trace documents, 130,689 regional points, and 130,659 unique `(source, icao24, observed_at)` positions from 344 aircraft. The unique rows were loaded into `aircraft_archive_positions` and read back; timestamps span 00:00:01.89–23:59:58.77 UTC. The other 29 days are not imported.

After any full daily import, verify database row counts before marking that day complete in service-only `aircraft_archive_days`. Never mark a capped or interrupted extraction complete. Reruns must deduplicate against existing rows; do not blindly append to an already-loaded day.

The public `archive-flights` function queries only completed days, fixed Metro Vancouver bounds, and at most a 22-minute window / 30,000 positions. It returns aircraft tracks and archive attribution, never audio. The audio workspace performs experimental Doppler fitting locally; missing coverage yields an explicit error, not simulated coordinates. Individual candidates are not verified caller locations. The cinematic hiker demo remains unchanged and simulated.