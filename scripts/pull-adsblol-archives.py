"""Stream ADSB.lol split daily tars; keep only Metro Vancouver trace points.

No raw archives are retained. Output CSVs can be imported into the protected
aircraft_archive_positions table. Completed-day checkpoints avoid re-downloading.
"""
import argparse
import csv
import gzip
import io
import json
import time
import tarfile
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

INTERVAL = 5.0
BBOX = (49.0, 49.4, -123.3, -122.55)
COLUMNS = ["source", "icao24", "observed_at", "latitude", "longitude", "altitude_m", "ground_speed_mps", "track_deg", "callsign", "position_source", "archive_url"]
last_request = None


def open_source(url):
    global last_request
    if last_request is not None:
        time.sleep(max(0, INTERVAL - (time.monotonic() - last_request)))
    last_request = time.monotonic()
    return urlopen(Request(url, headers={"User-Agent": "Doppler-archive-import/1.0", "Accept": "application/vnd.github+json"}), timeout=90)


def normalize_trace(doc, archive_url, day):
    icao = doc.get("icao", "")
    base = doc.get("timestamp")
    if not isinstance(icao, str) or not isinstance(base, (int, float)):
        return
    callsign = None
    for point in doc.get("trace", []):
        if not isinstance(point, list) or len(point) < 9:
            continue
        extra = point[8]
        if isinstance(extra, dict) and isinstance(extra.get("flight"), str):
            callsign = extra["flight"].strip() or None
        offset, lat, lon, altitude, speed, track, flags = point[:7]
        if not all(isinstance(v, (int, float)) for v in [offset, lat, lon]):
            continue
        south, north, west, east = BBOX
        if not (south <= lat <= north and west <= lon <= east) or (isinstance(flags, int) and flags & 1):
            continue
        observed = datetime.fromtimestamp(base + offset, timezone.utc)
        if observed.date().isoformat() != day:
            continue
        # Prefer geometric altitude when supplied; do not invent missing altitude.
        geometric = point[10] if len(point) > 10 else None
        alt = geometric if isinstance(geometric, (int, float)) else altitude
        yield dict(zip(COLUMNS, ["adsb.lol", icao.lower(), observed.isoformat(), lat, lon,
            alt * 0.3048 if isinstance(alt, (int, float)) else None,
            speed * 0.514444 if isinstance(speed, (int, float)) else None,
            track if isinstance(track, (int, float)) else None, callsign,
            point[9] if len(point) > 9 else None, archive_url]))


class SplitStream(io.RawIOBase):
    def __init__(self, urls, max_bytes=0):
        self.urls = iter(urls)
        self.current = None
        self.total = 0
        self.max_bytes = max_bytes

    def readable(self):
        return True

    def readinto(self, buffer):
        if self.max_bytes and self.total >= self.max_bytes:
            raise RuntimeError("Transfer budget reached; day remains incomplete")
        while True:
            if self.current is None:
                url = next(self.urls, None)
                if url is None:
                    return 0
                self.current = open_source(url)
            size = len(buffer)
            if self.max_bytes:
                size = min(size, self.max_bytes - self.total)
            data = self.current.read(size)
            if not data:
                self.current.close()
                self.current = None
                continue
            buffer[:len(data)] = data
            self.total += len(data)
            return len(data)

    def close(self):
        if self.current:
            self.current.close()
        super().close()


def process_day(release, day, output, max_bytes):
    assets = sorted((a for a in release["assets"] if ".tar.a" in a["name"]), key=lambda a: a["name"])
    if not assets:
        raise RuntimeError("No split tar assets available")
    pending = output / f"{day}.partial.csv"
    count = 0
    traces = 0
    dedup = output / f"{day}.dedup.sqlite"
    dedup.unlink(missing_ok=True)
    with sqlite3.connect(dedup) as keys, SplitStream([a["browser_download_url"] for a in assets], max_bytes) as raw, io.BufferedReader(raw) as stream, tarfile.open(fileobj=stream, mode="r|") as archive, pending.open("w", newline="") as csv_file:
        keys.execute("CREATE TABLE seen (icao TEXT, observed TEXT, PRIMARY KEY (icao, observed)) WITHOUT ROWID")
        writer = csv.DictWriter(csv_file, fieldnames=COLUMNS)
        writer.writeheader()
        for member in archive:
            if not member.isfile() or "/traces/" not in "/" + member.name or not member.name.endswith((".json.gz", ".json")):
                continue
            source = archive.extractfile(member)
            if source is None:
                continue
            # ADSB.lol uses gzip bytes even for trace_full_*.json members.
            with source, io.BufferedReader(source) as buffered:
                if buffered.peek(2)[:2] == b"\x1f\x8b":
                    with gzip.GzipFile(fileobj=buffered) as compressed:
                        doc = json.load(compressed)
                else:
                    doc = json.load(buffered)
            traces += 1
            for row in normalize_trace(doc, release["html_url"], day):
                inserted = keys.execute("INSERT OR IGNORE INTO seen VALUES (?, ?)", (row["icao24"], row["observed_at"]))
                if inserted.rowcount == 0:
                    continue
                writer.writerow(row)
                count += 1
    if traces == 0:
        raise RuntimeError("No trace documents read; archive is not validated")
    pending.rename(output / f"{day}.csv")
    dedup.unlink(missing_ok=True)
    (output / f"{day}.done.json").write_text(json.dumps({"day": day, "rows": count, "traces": traces, "archive_url": release["html_url"], "license": "ODbL-1.0"}))
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--end", default=datetime.now(timezone.utc).date().isoformat(), help="Exclusive UTC end date")
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--manifest-only", action="store_true")
    parser.add_argument("--max-transfer-mb", type=int, default=0, help="Per-day safety budget, zero means unlimited")
    args = parser.parse_args()
    if not 1 <= args.days <= 30 or args.max_transfer_mb < 0:
        parser.error("Use 1–30 days and a nonnegative transfer budget")
    args.output.mkdir(parents=True, exist_ok=True)
    end = datetime.strptime(args.end, "%Y-%m-%d")
    manifest = []
    for n in range(args.days, 0, -1):
        day = (end - timedelta(days=n)).date().isoformat()
        if (args.output / f"{day}.done.json").exists():
            print(day, "already complete", flush=True)
            continue
        tag = f"v{day.replace('-', '.')}-planes-readsb-prod-0"
        try:
            with open_source(f"https://api.github.com/repos/adsblol/globe_history_{day[:4]}/releases/tags/{tag}") as response:
                release = json.load(response)
            manifest.append({"date": day, "url": release["html_url"], "bytes": sum(a["size"] for a in release["assets"]), "assets": [a["browser_download_url"] for a in release["assets"]]})
            (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2))
            print(day, "available", manifest[-1]["bytes"], "bytes", flush=True)
            if not args.manifest_only:
                print(day, "regional rows", process_day(release, day, args.output, args.max_transfer_mb * 1024 * 1024), flush=True)
        except HTTPError as error:
            print(day, "HTTP", error.code, "not completed", flush=True)
        except Exception as error:
            print(day, type(error).__name__, str(error), "not completed", flush=True)
            raise


if __name__ == "__main__":
    main()