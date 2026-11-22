"""Static guardrails for Stage 1; not a substitute for runtime tests."""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class Stage1Guardrails(unittest.TestCase):
    def test_snapshot_identity_excludes_report_type(self):
        source = (ROOT / 'server/factory/snapshotStore.ts').read_text()
        body = source.split('function computeSnapshotFingerprint(', 1)[1].split('export function freezeOrReuseSnapshot(', 1)[0]
        self.assertNotIn('docType', body, 'ES and Full IC must share one analytical fingerprint')
        self.assertIn('engineContract: SNAPSHOT_ENGINE_CONTRACT', body)
        self.assertIn('masterRevision: preflight.tuple.masterRevision', body)
        self.assertIn('icTemplateDigest: preflight.tuple.icTemplateDigest', body)

    def test_stale_snapshot_request_fails_closed(self):
        source = (ROOT / 'server/factory/snapshotStore.ts').read_text()
        self.assertIn('existing.snapshotHash !== hash', source)
        self.assertIn('SNAPSHOT_STALE_OR_MISMATCHED', source)
        server = (ROOT / 'server.ts').read_text()
        self.assertIn("reason.startsWith('SNAPSHOT_STALE_OR_MISMATCHED:') ? 409 : 500", server)

    def test_per_document_provenance_is_derived(self):
        pipeline = (ROOT / 'server/factory/pipeline.ts').read_text()
        self.assertIn('snapshot: commonSnapshot', pipeline)
        self.assertIn('masterProvenance: buildMasterProvenance(docType, masterPreflight)', pipeline)

    def test_ui_has_simple_primary_navigation(self):
        source = (ROOT / 'src/components/DealWorkspaceView.tsx').read_text()
        for label in ['Overview', 'Data & Evidence', 'Analysis', 'Documents']:
            self.assertIn(f"label: '{label}'", source)
        self.assertIn('WORKSPACE_GROUPS.map', source)
        self.assertIn('Generate Executive Summary', source)
        self.assertIn('Generate Full IC', source)

if __name__ == '__main__':
    unittest.main()
