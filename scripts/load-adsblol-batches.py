"""Validate archive CSVs and prepare retry-safe, bounded managed SQL writes.

Default: prepare SQL files for the managed data-write tool. --execute-command
accepts an approved adapter, receiving SQL on stdin and returning JSON
{"ok": true} only after successful execution. No direct database connection,
privileged key, or gateway workaround is used by this script.
"""
import argparse
import csv
import hashlib
import json
import math
import shlex
import sqlite3
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

COLUMNS = ['source', 'icao24', 'observed_at', 'latitude', 'longitude',
           'altitude_m', 'ground_speed_mps', 'track_deg', 'callsign',
           'position_source', 'archive_url']
NUMBERS = {'latitude', 'longitude', 'altitude_m', 'ground_speed_mps', 'track_deg'}
MAX_BATCH_ROWS = 2000
MAX_SQL_BYTES = 512 * 1024


def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError('Non-finite numeric value')
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def validate_row(raw, checkpoint):
    row = dict(raw)
    if None in row or any(value is None for value in row.values()):
        raise ValueError('Malformed CSV row')
    for column in NUMBERS:
        row[column] = float(row[column]) if row[column] else None
        if row[column] is not None and not math.isfinite(row[column]):
            raise ValueError('Non-finite numeric value')
    lat, lon = row['latitude'], row['longitude']
    if lat is None or lon is None or not (49.0 <= lat <= 49.4 and -123.3 <= lon <= -122.55):
        raise ValueError('Position outside Metro Vancouver')
    stamp = datetime.fromisoformat(row['observed_at'].replace('Z', '+00:00'))
    if stamp.tzinfo is None or stamp.astimezone(timezone.utc).date().isoformat() != checkpoint['day']:
        raise ValueError('Timestamp outside requested UTC day')
    row['observed_at'] = stamp.astimezone(timezone.utc).isoformat()
    if row['source'] != 'adsb.lol' or not row['icao24'] or row['archive_url'] != checkpoint['archive_url']:
        raise ValueError('Source or archive provenance mismatch')
    for column in ('callsign', 'position_source'):
        row[column] = row[column] or None
    if any(isinstance(value, str) and ('\x00' in value or len(value) > 2048) for value in row.values()):
        raise ValueError('Invalid or excessively long text field')
    return row


def insert_sql(values):
    return ('INSERT INTO public.aircraft_archive_positions (' + ','.join(COLUMNS)
            + ') VALUES\n' + ',\n'.join(values)
            + '\nON CONFLICT (source, icao24, observed_at) DO NOTHING;\n')


def completion_sql(checkpoint):
    day = datetime.strptime(checkpoint['day'], '%Y-%m-%d').replace(tzinfo=timezone.utc)
    start, end = literal(day.isoformat()), literal((day + timedelta(days=1)).isoformat())
    url, count = literal(checkpoint['archive_url']), checkpoint['rows']
    # The SELECT is part of the INSERT: it is a guarded managed data write,
    # not a separate inspection through a shell database connection.
    return f"""INSERT INTO public.aircraft_archive_days (day, archive_url, row_count)
SELECT {literal(checkpoint['day'])}::date, {url}, {count}
WHERE (SELECT count(*) FROM public.aircraft_archive_positions
       WHERE source = 'adsb.lol' AND observed_at >= {start}::timestamptz
         AND observed_at < {end}::timestamptz) = {count}
  AND NOT EXISTS (SELECT 1 FROM public.aircraft_archive_positions
       WHERE source = 'adsb.lol' AND observed_at >= {start}::timestamptz
         AND observed_at < {end}::timestamptz
         AND (archive_url <> {url} OR latitude NOT BETWEEN 49.0 AND 49.4
              OR longitude NOT BETWEEN -123.3 AND -122.55))
ON CONFLICT (day) DO UPDATE SET archive_url = EXCLUDED.archive_url,
row_count = EXCLUDED.row_count, completed_at = now();
"""


def prepare(csv_path, checkpoint_path, output, batch_size=1000):
    if not 1 <= batch_size <= MAX_BATCH_ROWS:
        raise ValueError('Batch size must be between 1 and 2000')
    checkpoint = json.loads(checkpoint_path.read_text())
    datetime.strptime(checkpoint['day'], '%Y-%m-%d')
    if not isinstance(checkpoint['rows'], int) or checkpoint['rows'] <= 0 or checkpoint.get('traces', 0) <= 0:
        raise ValueError('A full extraction checkpoint with positive counts is required')
    if csv_path.name != checkpoint['day'] + '.csv':
        raise ValueError('Expected completed daily CSV; partial files are not accepted')
    if output.exists():
        raise ValueError('Output already exists; reuse its manifest or choose a new folder')
    output.parent.mkdir(parents=True, exist_ok=True)
    # Publish nothing until the entire file passes validation. SQLite bounds
    # deduplication memory; SQL payloads are bounded by rows and bytes.
    with tempfile.TemporaryDirectory(dir=output.parent) as staging:
        stage = Path(staging)
        payload_dir = stage / 'payloads'
        payload_dir.mkdir()
        keys = sqlite3.connect(stage / 'keys.sqlite')
        keys.execute('CREATE TABLE seen (source TEXT, icao TEXT, stamp TEXT, PRIMARY KEY(source,icao,stamp)) WITHOUT ROWID')
        batches, values, total = [], [], 0

        def flush():
            if not values:
                return
            text = insert_sql(values)
            name = f'batch-{len(batches) + 1:05d}.sql'
            (payload_dir / name).write_text(text)
            batches.append({'file': name, 'rows': len(values), 'sha256': hashlib.sha256(text.encode()).hexdigest()})
            values.clear()

        try:
            with csv_path.open(newline='') as handle:
                reader = csv.DictReader(handle)
                if reader.fieldnames != COLUMNS:
                    raise ValueError('Unexpected CSV columns')
                for raw in reader:
                    row = validate_row(raw, checkpoint)
                    try:
                        keys.execute('INSERT INTO seen VALUES (?,?,?)', (row['source'], row['icao24'], row['observed_at']))
                    except sqlite3.IntegrityError as error:
                        raise ValueError('Duplicate position in completed CSV') from error
                    value = '(' + ','.join(literal(row[column]) for column in COLUMNS) + ')'
                    if values and (len(values) >= batch_size or len(insert_sql(values + [value]).encode()) > MAX_SQL_BYTES):
                        flush()
                    values.append(value)
                    total += 1
                flush()
        finally:
            keys.close()
        if total != checkpoint['rows']:
            raise ValueError(f'CSV count {total} does not match checkpoint {checkpoint["rows"]}')
        final = completion_sql(checkpoint)
        (payload_dir / 'complete-day.sql').write_text(final)
        manifest = {**checkpoint, 'batch_size': batch_size, 'batches': batches,
                    'completion_sha256': hashlib.sha256(final.encode()).hexdigest()}
        (payload_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2))
        payload_dir.rename(output)
    return manifest


def execute(output, command):
    manifest = json.loads((output / 'manifest.json').read_text())
    tasks = [(batch['file'], batch['sha256']) for batch in manifest['batches']]
    tasks.append(('complete-day.sql', manifest['completion_sha256']))
    # Replay all batches on restart: conflicts are ignored, and completion is
    # guarded by the real database count rather than a local progress marker.
    for index, (name, expected_hash) in enumerate(tasks, 1):
        sql = (output / name).read_text()
        if hashlib.sha256(sql.encode()).hexdigest() != expected_hash:
            raise ValueError('SQL payload changed; prepare it again')
        result = subprocess.run(shlex.split(command), input=sql, text=True,
                                capture_output=True, timeout=120)
        # Do not print adapter output: it may contain credentials or tokens.
        try:
            acknowledgement = json.loads(result.stdout)
        except json.JSONDecodeError:
            acknowledgement = {}
        if result.returncode != 0 or acknowledgement.get('ok') is not True:
            raise RuntimeError(f'Managed write failed at {name}; safe to rerun')
        print(f'Write {index}/{len(tasks)} acknowledged', flush=True)
    print('Writes acknowledged. Verify the completed-day record with the managed read tool before claiming coverage.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv', type=Path)
    parser.add_argument('--checkpoint', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--batch-size', type=int, default=1000)
    parser.add_argument('--execute-command', help='Approved managed-write adapter; SQL stdin, JSON acknowledgement stdout')
    args = parser.parse_args()
    if bool(args.csv) != bool(args.checkpoint):
        parser.error('--csv and --checkpoint must be supplied together')
    if args.csv:
        manifest = prepare(args.csv, args.checkpoint, args.output, args.batch_size)
        print(f'Prepared {manifest["rows"]} rows in {len(manifest["batches"])} bounded batches; no rows loaded yet.')
    if args.execute_command:
        execute(args.output, args.execute_command)
    elif not args.csv:
        parser.error('Supply CSV/checkpoint to prepare or an approved execution command')


if __name__ == '__main__':
    main()