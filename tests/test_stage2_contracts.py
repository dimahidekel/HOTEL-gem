"""Stage 2 offline source guards; runtime Excel recalculation is separately required."""
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Stage2SourceGuards(unittest.TestCase):
    def test_internal_scenario_model_contains_three_case_formula_outputs(self):
        workbook = (ROOT / 'server/factory/xlsxGenerator.ts').read_text()
        self.assertIn("addWorksheet('Scenario_Model')", workbook)
        for scenario in ('Downside', 'Base Case', 'Stabilized'):
            self.assertIn(f"label: '{scenario}'", workbook)
        for col in ('G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'):
            self.assertIn(f"cellFormula('{col}'", workbook)
        self.assertIn("'Net Residual ($, NOT MAO)'", workbook)
        self.assertIn('NOT A DATED INVESTMENT CASH FLOW OR FINAL MAO', workbook)

    def test_internal_scenario_QA_recomputes_and_checks_independent_values(self):
        qa = (ROOT / 'server/factory/artifactQa.ts').read_text()
        self.assertIn("'Scenario_Model'", qa)
        self.assertIn("id: 'XLSX-02'", qa)
        self.assertIn('computeScenarioProjection(deal', qa)
        self.assertIn('scenarioMatches === 3', qa)
        self.assertIn('external workbook formula recalc NOT VERIFIED', qa)

    def test_master_preflight_does_not_mislabel_pdf_compliant_in_ui(self):
        ui = (ROOT / 'src/components/workspace/DocumentFactoryPanel.tsx').read_text()
        self.assertIn('Live Master read; this PDF has NOT passed canonical content and visual parity QA', ui)
        self.assertIn("const isMasterVerified = false", ui)


if __name__ == '__main__':
    unittest.main()
