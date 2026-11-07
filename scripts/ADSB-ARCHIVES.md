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

The download script **does not load CSVs into the database automatically**. Until extraction and managed loading finish, the table has no verified archive coverage. The public audio locator and fictional hiker demo remain simulated and unchanged.