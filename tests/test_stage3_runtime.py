"""Dependency-free runtime regression of financials and synthetic PIP updates."""
import pathlib
import os
import shutil
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
BUILD = ROOT / '.qa_stage3'


class RuntimeRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        BUILD.mkdir(exist_ok=True)
        (BUILD / 'package.json').write_text('{"type":"commonjs"}')
        compiler = pathlib.Path(os.environ.get('TSC_SCRIPT', ROOT / 'node_modules/typescript/bin/tsc'))
        command = [shutil.which('node'), str(compiler)] if compiler.is_file() else [shutil.which('tsc') or 'tsc']
        subprocess.run([
            *command, 'src/utils/financials.ts', 'src/utils/pipAdjustments.ts',
            'src/data/syntheticDeals.ts', 'src/types/underwriting.ts',
            '--ignoreConfig', '--target', 'ES2022', '--module', 'commonjs', '--skipLibCheck',
            '--outDir', str(BUILD), '--pretty', 'false',
        ], cwd=ROOT, check=True, capture_output=True, text=True)

    def run_node(self, code):
        result = subprocess.run(['node', '-e', code], cwd=BUILD, check=True, capture_output=True, text=True)
        return result.stdout.strip()

    def test_pip_adjustment_preserves_original_scopes(self):
        output = self.run_node(r'''
const assert=require('node:assert/strict');
const {SYNTHETIC_DEALS}=require('./data/syntheticDeals.js');
const {applySyntheticPipTotalAdjustment}=require('./utils/pipAdjustments.js');
const {computeDealSummary}=require('./utils/financials.js');
const source=SYNTHETIC_DEALS[0];
const base=computeDealSummary(source).totalPipExposure;
assert.equal(base,3450000);
for(const target of [500000,0,3700000,3450000]) {
  const edited=applySyntheticPipTotalAdjustment(source,target);
  assert.equal(computeDealSummary(edited).totalPipExposure,target);
  assert.deepEqual(edited.pipItems.slice(0,source.pipItems.length),source.pipItems);
  assert.deepEqual(source.pipItems,SYNTHETIC_DEALS[0].pipItems);
  const repeated=applySyntheticPipTotalAdjustment(edited,2000000);
  assert.equal(computeDealSummary(repeated).totalPipExposure,2000000);
  assert.equal(repeated.pipItems.filter(x=>x.id.includes('PIP-USER-ADJUSTMENT')).length,1);
}
assert.throws(()=>applySyntheticPipTotalAdjustment(source,-1),/INVALID_PIP_TOTAL/);
console.log('PIP-01 PASS');
''')
        self.assertEqual(output, 'PIP-01 PASS')

    def test_no_stage_a_master_certification(self):
        qa = (ROOT / 'server/factory/artifactQa.ts').read_text()
        pipeline = (ROOT / 'server/factory/pipeline.ts').read_text()
        self.assertNotIn("complianceStatus === 'MASTER_VERIFIED' ||", qa)
        self.assertNotIn("'MASTER_VERIFIED_QA_PASSED'", pipeline)
        self.assertIn('MASTER_PREFLIGHT_ONLY', qa)

    def test_synthetic_financials_and_negative_noi_guardrails(self):
        output=self.run_node(r'''
const assert=require('node:assert/strict');
const {SYNTHETIC_DEALS}=require('./data/syntheticDeals.js');
const {computeDealSummary,computeScenarioProjection}=require('./utils/financials.js');
const one=computeDealSummary(SYNTHETIC_DEALS[0]);
assert.equal(one.t12.totalRevenue,15585922);
assert.equal(one.t12.noi,4164604);
assert.equal(Math.round(one.indicativeCapRatePct*100)/100,8.09);
assert.equal(one.finalMaoWithheld,true);
const negative=SYNTHETIC_DEALS.find(d=>d.id==='SYN-003');
const neg=computeDealSummary(negative);
assert.ok(neg.t12.noi<0);
assert.equal(neg.indicativeCapRatePct,null);
const missing=structuredClone(SYNTHETIC_DEALS[0]);
missing.historicalInputs[missing.historicalInputs.length-1].occupancyPct=null;
missing.historicalInputs[missing.historicalInputs.length-1].adr=null;
delete missing.historicalInputs[missing.historicalInputs.length-1].explicitRoomsRevenue;
assert.equal(computeDealSummary(missing).t12.noi,null);
const projection=computeScenarioProjection(SYNTHETIC_DEALS[0],{occupancyDeltaPctPts:0,adrDeltaPct:0,expenseDeltaPctPts:0,targetCapRatePct:7.75,pipExposureOverride:3450000,closingCostsPct:1.5});
assert.equal(projection.proFormaNoi,4164604);
console.log('FIN-01 PASS');
''')
        self.assertEqual(output,'FIN-01 PASS')


if __name__=='__main__':
    unittest.main()
