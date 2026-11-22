"""Offline Stage-0 guardrails; no npm dependencies or network access required.

These checks are static regression tests, not a runtime security certification.
"""
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Stage0Guardrails(unittest.TestCase):
    def test_no_private_master_in_public_assets(self):
        pub = ROOT / 'public'
        unsafe = [p for p in pub.rglob('*') if p.is_file() and 'HOTEL_IC_Master_Control_Plane' in p.name]
        self.assertEqual(unsafe, [], f'Private policy document exposed in frontend public assets: {unsafe}')

    def test_no_ai_studio_internal_artifacts(self):
        self.assertFalse((ROOT / '.aistudio').exists(), 'AI Studio internal files must not be re-exported')
        self.assertFalse((ROOT / '.qa_render_tmp').exists(), 'Temporary QA output must not be shipped')

    def test_master_preflight_not_promoted_to_document_certification(self):
        snapshot = (ROOT / 'server/factory/snapshotStore.ts').read_text()
        self.assertIn("complianceStatus: 'MASTER_PREFLIGHT_ONLY'", snapshot)
        self.assertNotIn("complianceStatus: 'MASTER_VERIFIED',", snapshot)
        status = (ROOT / 'server.ts').read_text()
        self.assertIn("? 'MASTER_PREFLIGHT_ONLY'", status)

    def test_read_only_google_drive_contract(self):
        oauth = (ROOT / 'src/services/googleDriveAuth.ts').read_text()
        self.assertIn('https://www.googleapis.com/auth/drive.readonly', oauth)
        self.assertNotIn("'https://www.googleapis.com/auth/drive'", oauth)
        self.assertNotIn("'https://www.googleapis.com/auth/drive.file'", oauth)

    def test_document_factory_and_ui_preserved(self):
        for rel in ('src/components/DealWorkspaceView.tsx',
                    'server/factory/pdfGenerator.ts', 'server/factory/xlsxGenerator.ts',
                    'server/factory/masterResolver.ts'):
            self.assertTrue((ROOT / rel).is_file(), rel)


if __name__ == '__main__':
    unittest.main()
