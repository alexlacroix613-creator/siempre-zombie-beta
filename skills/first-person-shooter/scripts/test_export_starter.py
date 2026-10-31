"""Bounded exporter tests using a disposable local Git repository, never the live game."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from export_starter import export_project


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='fps-skill-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root/'source'
        (self.source/'game').mkdir(parents=True)
        (self.source/'tools').mkdir()
        (self.source/'game/index.html').write_bytes(b'<h1>committed</h1>\n')
        (self.source/'tools/check.mjs').write_bytes(b'console.log("fixture");\n')
        self.git('init', '-q')
        self.git('config', 'core.autocrlf', 'true')
        self.git('add', 'game', 'tools')
        self.git('-c', 'user.name=FPS Skill Test', '-c', 'user.email=fps-skill@example.invalid',
                 '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture')
        self.manifest = {'repository': 'local-test-only', 'revision': self.git('rev-parse', 'HEAD').strip(), 'files': {}}
        for name in ['game/index.html', 'tools/check.mjs']:
            b = (self.source/name).read_bytes()
            self.manifest['files'][name] = {'bytes':len(b), 'sha256':hashlib.sha256(b).hexdigest()}

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.source), *args], text=True, stderr=subprocess.PIPE)

    def test_committed_snapshot_excludes_working_tree_and_credentials(self):
        (self.source/'game/index.html').write_text('uncommitted user change', encoding='utf-8')
        (self.source/'game/.env.local').write_text('fixture-only', encoding='utf-8')
        output = self.root/'export'
        receipt = export_project(self.source, output, self.manifest)
        self.assertEqual((output/'game/index.html').read_bytes(), b'<h1>committed</h1>\n')
        self.assertFalse((output/'game/.env.local').exists())
        self.assertEqual(receipt['fileCount'], 2)
        self.assertEqual(json.loads((output/'FPS-SOURCE.json').read_text())['revision'], self.manifest['revision'])
        self.assertEqual((self.source/'game/index.html').read_text(), 'uncommitted user change')

    def test_refuses_existing_content_and_source_child(self):
        output = self.root/'existing'; output.mkdir()
        (output/'sentinel').write_text('keep', encoding='utf-8')
        with self.assertRaises(ValueError): export_project(self.source, output, self.manifest)
        self.assertEqual((output/'sentinel').read_text(), 'keep')
        with self.assertRaises(ValueError): export_project(self.source, self.source/'child', self.manifest)
        self.assertFalse((self.source/'child').exists())

    def test_refuses_unsafe_manifest_paths_and_hash_mismatch(self):
        for bad in ['game/../../escape', 'game/.env.local', 'game/.vercel/project.json', 'game/a\\b', '/game/absolute']:
            manifest = {**self.manifest, 'files': {bad: {'bytes':0,'sha256':'0'*64}}}
            with self.assertRaises(ValueError): export_project(self.source, self.root/'unsafe', manifest)
        self.assertFalse((self.root/'unsafe').exists())
        manifest = json.loads(json.dumps(self.manifest))
        manifest['files']['game/index.html']['sha256'] = '0'*64
        with self.assertRaises(ValueError): export_project(self.source, self.root/'mismatch', manifest)
        self.assertFalse((self.root/'mismatch/FPS-SOURCE.json').exists())


if __name__ == '__main__':
    unittest.main()
