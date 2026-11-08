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

The SQL files can be submitted in order through the managed `run_sql` data-write tool. The loader also supports `--output <existing-batches> --execute-command <approved-adapter>` for automation: that adapter must accept SQL on stdin and return JSON `{"ok": true}` only after a successful managed write. It stops on any failed or ambiguous acknowledgement, suppresses provider output, and replays conflict-safe batches on restart. **No such shell adapter is currently available in this workspace.** The Lovable CLI's database query command is read-only, and this script does not bypass it or use privileged keys. Preparing batches does not load the database or remove this integration limitation.

## Verified one-day import

November 6, 2026 prod-0 was fully streamed and filtered: 75,277 trace documents, 130,689 regional points, and 130,659 unique `(source, icao24, observed_at)` positions from 344 aircraft. The unique rows were loaded into `aircraft_archive_positions` and read back; timestamps span 00:00:01.89–23:59:58.77 UTC. The other 29 days are not imported.

September 1, 2026 prod-0 was also fully streamed with five-second request spacing: 78,489 trace documents and 196,668 unique regional positions across 645 source identifiers, including ADSB.lol's tilde-prefixed non-ICAO identifiers. Loaded rows were verified within regional bounds, spanning 00:00:00.36–23:59:59.62 UTC, then recorded as complete. A two-minute historical lookup returned 447 positions and 18 usable tracks. The cinematic demo is unchanged.

July 19, 2025 prod-0 was fully streamed with five-second request spacing: 70,204 trace documents and 223,811 unique regional positions across 458 source identifiers. Every extracted row was validated against the regional bounds and requested UTC date; timestamps span 00:00:00.03–23:59:59.89 UTC. The validated CSV and extraction checkpoint are at `/tmp/adsblol-july-2025/2025-07-19.csv` and `/tmp/adsblol-july-2025/2025-07-19.done.json` in the current sandbox (temporary, not durable storage). **These rows have not been loaded into the database**, and no completed-day coverage record was added. The database read-back returned zero rows for this date. Loading is blocked on a supported bulk managed-data write path: shell database writes are not permitted, and the available managed write tool accepts inline SQL rather than a local CSV file. Do not treat the extraction checkpoint as database coverage.

After any full daily import, verify database row counts before marking that day complete in service-only `aircraft_archive_days`. Never mark a capped or interrupted extraction complete. Reruns must deduplicate against existing rows; do not blindly append to an already-loaded day.

The public `archive-flights` function queries only completed days, fixed Metro Vancouver bounds, and at most a 22-minute window / 30,000 positions. It returns aircraft tracks and archive attribution, never audio. The audio workspace performs experimental Doppler fitting locally; missing coverage yields an explicit error, not simulated coordinates. Individual candidates are not verified caller locations. The cinematic hiker demo remains unchanged and simulated.