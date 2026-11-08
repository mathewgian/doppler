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

### Bounded batch loader

Prepare validated, retry-safe SQL batches (1,000 rows by default; maximum 2,000 rows and 512 KiB per SQL payload):

```bash
python3 scripts/load-adsblol-batches.py \
  --csv /tmp/adsblol-july-2025/2025-07-19.csv \
  --checkpoint /tmp/adsblol-july-2025/2025-07-19.done.json \
  --output /tmp/adsblol-july-2025/batches --batch-size 1000
```

Preparation checks every row's UTC date, geographic bounds, finite numbers, provenance, unique position key, and the full extraction count before publishing any SQL. Partial CSVs are refused. Existing output folders are not overwritten. Each position write ignores existing `(source, icao24, observed_at)` keys, so replay after interruption is safe. `complete-day.sql` must run **last**; it records coverage only if the database count matches the validated CSV and the rows have valid bounds/provenance. Confirm that the completed-day record actually exists with the managed read tool afterward; successful execution alone does not establish coverage.

The SQL files can be submitted in order through the managed `run_sql` data-write tool. When the sandbox has managed `PG*` connection variables and insert access, validated position-only batches can also be loaded with `psql -v ON_ERROR_STOP=1 -f <batch.sql>` using that restricted connection; never supply privileged keys or alternate connection strings. Use managed read tools for verification and `run_sql` for the guarded completed-day write. The loader also supports `--output <existing-batches> --execute-command <approved-adapter>` for automation: that adapter must accept SQL on stdin and return JSON `{"ok": true}` only after a successful managed write. It stops on failed or ambiguous acknowledgement and replays conflict-safe batches on restart. The Lovable CLI's database query command remains read-only. Preparing batches alone does not establish coverage.

## Verified one-day import

November 6, 2026 prod-0 was fully streamed and filtered: 75,277 trace documents, 130,689 regional points, and 130,659 unique `(source, icao24, observed_at)` positions from 344 aircraft. The unique rows were loaded into `aircraft_archive_positions` and read back; timestamps span 00:00:01.89–23:59:58.77 UTC. The other 29 days are not imported.

September 1, 2026 prod-0 was also fully streamed with five-second request spacing: 78,489 trace documents and 196,668 unique regional positions across 645 source identifiers, including ADSB.lol's tilde-prefixed non-ICAO identifiers. Loaded rows were verified within regional bounds, spanning 00:00:00.36–23:59:59.62 UTC, then recorded as complete. A two-minute historical lookup returned 447 positions and 18 usable tracks. The cinematic demo is unchanged.

July 19, 2025 prod-0 was fully streamed with five-second request spacing: 70,204 trace documents and 223,811 unique regional positions across 458 source identifiers. All 224 conflict-safe batches were loaded through the restricted managed insert connection. Managed database read-back verified exactly 223,811 positions, no invalid bounds or archive provenance, and timestamps spanning 00:00:00.03–23:59:59.89 UTC. The guarded completed-day write was applied and read back on November 8, 2026. The app's public historical lookup returned completed July 19 coverage with 266 positions and 10 usable tracks for 19:00–19:02 UTC. The cinematic demo is unchanged; actual recording-location accuracy is still unverified.

After any full daily import, verify database row counts before marking that day complete in service-only `aircraft_archive_days`. Never mark a capped or interrupted extraction complete. Reruns must deduplicate against existing rows; do not blindly append to an already-loaded day.

The public `archive-flights` function queries only completed days, fixed Metro Vancouver bounds, and at most a 22-minute window / 30,000 positions. It returns aircraft tracks and archive attribution, never audio. The audio workspace performs experimental Doppler fitting locally; missing coverage yields an explicit error, not simulated coordinates. Individual candidates are not verified caller locations. The cinematic hiker demo remains unchanged and simulated.