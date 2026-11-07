import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("archive_import", Path(__file__).with_name("pull-adsblol-archives.py"))
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


class TraceImportTests(unittest.TestCase):
    def test_five_second_source_spacing(self):
        archive.last_request = 100
        with patch.object(archive.time, "monotonic", side_effect=[102, 105]), patch.object(archive.time, "sleep") as pause, patch.object(archive, "urlopen"):
            archive.open_source("https://api.github.com/example")
        pause.assert_called_once_with(3)
        self.assertEqual(archive.INTERVAL, 5)

    def test_regional_timestamps_units_and_stale_filter(self):
        doc = {"icao": "ABC123", "timestamp": 1791417600, "trace": [
            [5, 49.2827, -123.1207, 1000, 100, 180, 0, 0, {"flight": " TEST "}, "adsb_icao", 1200],
            [10, 49.2827, -123.1207, 1000, 100, 180, 1, 0, None],
            [15, 47.6, -122.3, 1000, 100, 180, 0, 0, None],
        ]}
        rows = list(archive.normalize_trace(doc, "https://github.com/adsblol/example", "2026-10-08"))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["observed_at"], "2026-10-08T00:00:05+00:00")
        self.assertAlmostEqual(rows[0]["altitude_m"], 365.76)
        self.assertAlmostEqual(rows[0]["ground_speed_mps"], 51.4444)
        self.assertEqual(rows[0]["callsign"], "TEST")


if __name__ == "__main__":
    unittest.main()