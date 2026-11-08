import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from subprocess import CompletedProcess

spec = importlib.util.spec_from_file_location('batch_load', Path(__file__).with_name('load-adsblol-batches.py'))
loader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(loader)


class BatchLoadTests(unittest.TestCase):
    def prepare_fixture(self, root, count=2001, mutate=None):
        csv_path = root / '2025-07-19.csv'
        url = 'https://github.com/adsblol/globe_history_2025/releases/tag/v2025.07.19-planes-readsb-prod-0'
        with csv_path.open('w', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=loader.COLUMNS)
            writer.writeheader()
            for index in range(count):
                row = dict(zip(loader.COLUMNS, ['adsb.lol', f'{index:06x}',
                    '2025-07-19T00:00:05+00:00', '49.2', '-123.1', '',
                    '100', '180', "O'BRIEN", '', url]))
                if mutate:
                    mutate(row, index)
                writer.writerow(row)
        checkpoint = root / '2025-07-19.done.json'
        checkpoint.write_text(json.dumps({'day': '2025-07-19', 'rows': count, 'traces': 1, 'archive_url': url}))
        return csv_path, checkpoint, root / 'batches'

    def test_1000_row_batches_and_retry_safe_keys(self):
        with tempfile.TemporaryDirectory() as temp:
            args = self.prepare_fixture(Path(temp))
            manifest = loader.prepare(*args)
            self.assertEqual([b['rows'] for b in manifest['batches']], [1000, 1000, 1])
            for batch in manifest['batches']:
                sql = (args[2] / batch['file']).read_text()
                self.assertLessEqual(len(sql.encode()), 512 * 1024)
                self.assertIn('ON CONFLICT (source, icao24, observed_at) DO NOTHING', sql)
            self.assertIn("'O''BRIEN'", (args[2] / 'batch-00001.sql').read_text())
            final = (args[2] / 'complete-day.sql').read_text()
            self.assertIn(') = 2001', final)
            self.assertIn('2025-07-20T00:00:00+00:00', final)

    def test_invalid_day_rejected_before_any_payload_published(self):
        with tempfile.TemporaryDirectory() as temp:
            args = self.prepare_fixture(Path(temp), 3, lambda row, i: row.update(observed_at='2025-07-20T00:00:00Z') if i == 2 else None)
            with self.assertRaisesRegex(ValueError, 'UTC day'):
                loader.prepare(*args)
            self.assertFalse(args[2].exists())

    def test_outside_metro_vancouver_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            args = self.prepare_fixture(Path(temp), 1, lambda row, i: row.update(latitude='49.5'))
            with self.assertRaisesRegex(ValueError, 'outside Metro Vancouver'):
                loader.prepare(*args)

    def test_row_count_mismatch_never_publishes_completion(self):
        with tempfile.TemporaryDirectory() as temp:
            args = self.prepare_fixture(Path(temp), 2)
            checkpoint = json.loads(args[1].read_text())
            checkpoint['rows'] = 3
            args[1].write_text(json.dumps(checkpoint))
            with self.assertRaisesRegex(ValueError, 'does not match'):
                loader.prepare(*args)
            self.assertFalse(args[2].exists())

    def test_duplicate_rows_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            args = self.prepare_fixture(Path(temp), 2, lambda row, i: row.update(icao24='abc123'))
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                loader.prepare(*args)

    def test_2000_row_maximum_enforced(self):
        with self.assertRaisesRegex(ValueError, 'between 1 and 2000'):
            loader.prepare(Path('unused'), Path('unused'), Path('unused'), 2001)

    def test_failed_write_stops_before_completion(self):
        with tempfile.TemporaryDirectory() as temp:
            args = self.prepare_fixture(Path(temp), 2)
            loader.prepare(*args, batch_size=1)
            responses = [CompletedProcess([], 0, '{"ok":true}', ''), CompletedProcess([], 1, '', 'private provider details')]
            with patch.object(loader.subprocess, 'run', side_effect=responses) as run:
                with self.assertRaisesRegex(RuntimeError, 'batch-00002.sql'):
                    loader.execute(args[2], 'managed-adapter')
                self.assertEqual(run.call_count, 2)

    def test_resume_replays_conflict_safe_batches_and_completes_last(self):
        with tempfile.TemporaryDirectory() as temp:
            args = self.prepare_fixture(Path(temp), 2)
            loader.prepare(*args, batch_size=1)
            with patch.object(loader.subprocess, 'run', return_value=CompletedProcess([], 0, '{"ok":true}', '')) as run:
                loader.execute(args[2], 'managed-adapter')
                loader.execute(args[2], 'managed-adapter')
                self.assertEqual(run.call_count, 6)
                self.assertIn('aircraft_archive_days', run.call_args.kwargs['input'])


if __name__ == '__main__':
    unittest.main()