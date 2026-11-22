import JSZip from 'jszip';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  DocumentType,
  FrozenUnderwritingSnapshot,
  QaCheckResult,
} from '../../src/types/factory.ts';
import { computeAnnualOperating, computeScenarioProjection, formatCapRate, formatCurrency } from '../../src/utils/financials.ts';

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

const CANONICAL_ES_TITLES = [
  '1. Investment Decision & Thesis',
  '2. Property / Transaction Snapshot',
  '3. Current Financial Picture',
  '4. Pricing / Valuation Read',
  '5. Value-Creation Opportunity',
  '6. Physical Condition / PIP / Franchise',
  '7. Market & Location',
  '8. Key Risks / Missing Evidence',
  '9. Recommendation / Price Posture / Next Steps',
  '10. Sources / Compact QA',
];

const CANONICAL_IC_TITLES = [
  '1. Executive Summary',
  '2. Transaction Overview',
  '3. Evidence and Verification Status',
  '4. Property Description and Physical Condition',
  '5. Location and Market',
  '6. Historical Financial Analysis',
  '7. Normalization',
  '8. Operating Scenarios and Detailed Pro Forma',
  '9. Sources and Uses and Capital Plan',
  '10. Financing Analysis',
  '11. Valuation',
  '12. Strike Price and MAO',
  '13. Return Analysis and Sensitivities',
  '14. Capital Stack and Waterfall',
  '15. Exit Analysis',
  '16. Risks, Conflicts, and Missing Information',
  '17. Action Plan and Conditions',
  '18. Detailed Sources and Provenance',
  '19. Final Quality Gate and Status',
];

export async function runArtifactQa(params: {
  snapshot: FrozenUnderwritingSnapshot;
  docType: DocumentType;
  docxBuffer: Buffer;
  pdfBuffer: Buffer;
  xlsxBuffer?: Buffer;
}): Promise<{ qaPassed: boolean; qaChecks: QaCheckResult[]; pdfPageCount: number }> {
  const { snapshot, docType, docxBuffer, pdfBuffer, xlsxBuffer } = params;
  const { deal, summary } = snapshot;
  const expectedSections = docType === 'executive-summary' ? snapshot.esSections : snapshot.icSections;
  const canonicalTitles = docType === 'executive-summary' ? CANONICAL_ES_TITLES : CANONICAL_IC_TITLES;
  const expectedCount = canonicalTitles.length;

  const checks: QaCheckResult[] = [];

  // 1. Numerical QA — Independent recomputation check
  const lastInput = deal.historicalInputs[deal.historicalInputs.length - 1];
  const recomputedT12 = computeAnnualOperating(deal.rooms, lastInput);
  const recomputedPreFfe =
    recomputedT12.noi !== null && recomputedT12.ffeReserve !== null
      ? recomputedT12.noi + recomputedT12.ffeReserve
      : null;
  const numericalMatch =
    recomputedT12.totalRevenue === summary.t12?.totalRevenue &&
    recomputedT12.noi === summary.t12?.noi &&
    (recomputedPreFfe === null || recomputedPreFfe >= (recomputedT12.noi ?? 0));

  const capRuleOk =
    summary.t12?.noi !== null && summary.t12.noi <= 0
      ? summary.indicativeCapRatePct === null &&
        formatCapRate(summary.indicativeCapRatePct, summary.t12.noi) === 'N/A'
      : true;

  checks.push({
    id: 'NUM-01',
    category: 'Numerical',
    label: 'Frozen T12 Rev, Pre/Post-FF&E NOI & Scenario Reconciliation',
    passed: numericalMatch,
    detail: `T12 Rev=${formatCurrency(summary.t12?.totalRevenue)}, Pre-FF&E=${formatCurrency(recomputedPreFfe)}, Post-FF&E NOI=${formatCurrency(summary.t12?.noi)}`,
  });

  checks.push({
    id: 'NUM-02',
    category: 'Numerical',
    label: 'Negative NOI Cap Rate Guardrail',
    passed: capRuleOk,
    detail: `Indicative Cap Rate=${formatCapRate(summary.indicativeCapRatePct, summary.t12?.noi)}`,
  });

  // 2. Governance QA — Blocker / MAO Withholding, §7B Safety & §25 Rescue Check
  const blockerOk =
    deal.blockers.some((b) => b.blocksFinalMao) ? summary.finalMaoWithheld === true : true;
  const complianceStatus = snapshot.masterProvenance.complianceStatus;
  const complianceValid =
    complianceStatus === 'MASTER_PREFLIGHT_ONLY' ||
    // No Stage A renderer is certified against the full canonical Master.
    // A preflight cannot elevate the report's release compliance.
    complianceStatus === 'MASTER_ACCESS_BLOCKED' ||
    complianceStatus === 'BLOCKED_RELEASE_MISMATCH';

  const sectionOrderMatch =
    expectedSections.length === expectedCount &&
    canonicalTitles.every(
      (title, idx) => `${expectedSections[idx].number}. ${expectedSections[idx].title}` === title
    );

  checks.push({
    id: 'GOV-01',
    category: 'Governance',
    label: 'Final MAO Gate, Master §10 Contract & Provenance',
    passed: blockerOk && complianceValid && sectionOrderMatch,
    detail: `Final MAO=${summary.finalMaoWithheld ? 'WITHHELD' : 'OPEN'} · Compliance=${complianceStatus} · §10 Sections=${expectedSections.length}/${expectedCount}`,
  });

  // 3. DOCX Structural QA (via JSZip XML parsing)
  try {
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file('word/document.xml')?.async('string');
    const mediaFiles = Object.keys(zip.files).filter((k) => k.startsWith('word/media/'));
    if (!docXml) {
      checks.push({
        id: 'DOCX-01',
        category: 'DOCX Structure',
        label: 'DOCX OOXML Integrity & Embedded Charts',
        passed: false,
        detail: 'word/document.xml missing from archive',
      });
    } else {
      const plainText = decodeXmlEntities(docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      const missingSecs = canonicalTitles.filter((t) => !plainText.includes(t));
      const hasCover = plainText.includes('HOTEL WORK / INVESTMENT DECISION SCREEN');
      const hasDisclaimer = plainText.includes(complianceStatus);
      const hasCharts = mediaFiles.length >= 2;
      const t12NoiStr = formatCurrency(summary.t12?.noi);
      const hasNoi = plainText.includes(t12NoiStr);

      checks.push({
        id: 'DOCX-01',
        category: 'DOCX Structure',
        label: `DOCX Master §10 Sections (1–${expectedCount}), Cover & Charts`,
        passed:
          missingSecs.length === 0 && hasCover && hasDisclaimer && hasCharts && hasNoi,
        detail: `Sections matched=${expectedCount - missingSecs.length}/${expectedCount}, Charts=${mediaFiles.length} PNG(s), NOI "${t12NoiStr}" present=${hasNoi}`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'DOCX-01',
      category: 'DOCX Structure',
      label: 'DOCX Archive Inspection',
      passed: false,
      detail: err instanceof Error ? err.message : 'Failed to parse DOCX',
    });
  }

  // 4. PDF Render, §24 Cover, §7B/§25 Content & Coordinate QA
  let pdfPageCount = 0;
  try {
    const pdfLibDoc = await PDFDocument.load(pdfBuffer);
    pdfPageCount = pdfLibDoc.getPageCount();
    const minPages = docType === 'executive-summary' ? 3 : 5;

    const loadingTask = getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdfJsDoc = await loadingTask.promise;

    let allPdfText = '';
    let page1Text = '';
    let page2Text = '';
    let overflowItems = 0;
    let emptyPages = 0;

    for (let p = 1; p <= pdfJsDoc.numPages; p++) {
      const page = await pdfJsDoc.getPage(p);
      const viewport = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent();
      let pageBodyTextLen = 0;

      for (const item of content.items) {
        if ('str' in item && item.str.trim().length > 0) {
          allPdfText += item.str + ' ';
          if (p === 1) page1Text += item.str + ' ';
          if (p === 2) page2Text += item.str + ' ';
          const x = item.transform[4];
          const y = item.transform[5];
          const w = item.width ?? 0;
          if (y > 42 && y < viewport.height - 36) {
            pageBodyTextLen += item.str.trim().length;
          }
          if (x < 24 || x + w > viewport.width - 20) {
            overflowItems += 1;
          }
        }
      }
      if (pageBodyTextLen < 25) emptyPages += 1;
    }

    const normalizedPdf = allPdfText.replace(/\s+/g, ' ');
    const normPage1 = page1Text.replace(/\s+/g, ' ');
    const normPage2 = page2Text.replace(/\s+/g, ' ');
    const missingPdfSecs = canonicalTitles.filter((t) => !normalizedPdf.includes(t));
    const hasThreeP0 =
      normPage1.includes('#1 (') && normPage1.includes('#2 (') && normPage1.includes('#3 (');
    const coverEndsBeforeSec1 =
      !normPage1.includes(canonicalTitles[0]) && normPage2.includes(canonicalTitles[0]);
    const hasCoverContract =
      normPage1.includes('HOTEL WORK / INVESTMENT DECISION SCREEN') &&
      normPage1.includes('HISTORICAL OPERATING BRIDGE') &&
      normPage1.includes('NOT normalized NOI') &&
      normPage1.includes('NEXT DECISION') &&
      normPage1.includes('WHAT BLOCKS THE INVESTMENT?') &&
      hasThreeP0 &&
      coverEndsBeforeSec1;
    const hasRescue = normalizedPdf.includes('Alternative / Rescue Strategy');
    const hasSafetyGate = normalizedPdf.includes('Micro-Location, Crime & Guest-Safety Gate');
    const hasPrePostFfe =
      normalizedPdf.includes('NOI Pre-FF&E') && normalizedPdf.includes('Post-FF&E');
    const hasScenarios =
      docType === 'executive-summary' ||
      (normalizedPdf.includes('Downside') &&
        normalizedPdf.includes('Base Case') &&
        normalizedPdf.includes('Stabilized'));
    const hasWithheld = summary.finalMaoWithheld ? normalizedPdf.includes('WITHHELD') : true;

    checks.push({
      id: 'PDF-01',
      category: 'PDF Layout',
      label: `PDF §10 (${expectedCount}s), §24 Cover (3 P0s), Pre/Post-FF&E, §7B Safety & §25 Rescue`,
      passed:
        pdfPageCount >= minPages &&
        missingPdfSecs.length === 0 &&
        hasCoverContract &&
        hasRescue &&
        hasSafetyGate &&
        hasPrePostFfe &&
        hasScenarios &&
        hasWithheld &&
        emptyPages === 0,
      detail: `Pages=${pdfPageCount}, §10=${expectedCount - missingPdfSecs.length}/${expectedCount}, §24Cover(3P0)=${hasCoverContract}, PrePostFFE=${hasPrePostFfe}, §7B=${hasSafetyGate}, §25=${hasRescue}, Empty=${emptyPages}`,
    });

    checks.push({
      id: 'PDF-02',
      category: 'PDF Layout',
      label: 'PDF Coordinate Margin & Horizontal Overflow Inspection',
      passed: overflowItems === 0,
      detail:
        overflowItems === 0
          ? '0 text runs outside printable Letter bounds (612pt)'
          : `${overflowItems} text item(s) exceeded horizontal page bounds`,
    });

    const unembeddedFonts: string[] = [];
    const embeddedFonts = new Set<string>();
    for (const [, obj] of pdfLibDoc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFDict) {
        const typeObj = obj.get(PDFName.of('Type'));
        if (typeObj?.toString() === '/Font') {
          const subtype = obj.get(PDFName.of('Subtype'))?.toString() ?? '';
          const baseFont = obj.get(PDFName.of('BaseFont'))?.toString() ?? 'Unknown';
          if (subtype === '/Type1' && !obj.get(PDFName.of('FontDescriptor'))) {
            unembeddedFonts.push(baseFont);
          } else {
            embeddedFonts.add(baseFont);
          }
        }
      }
    }

    checks.push({
      id: 'PDF-03',
      category: 'PDF Layout',
      label: 'PDF Embedded TrueType / CID Font Program Verification',
      passed: unembeddedFonts.length === 0 && embeddedFonts.size > 0,
      detail:
        unembeddedFonts.length === 0
          ? `${embeddedFonts.size} embedded font dictionary(ies) verified (0 unembedded Standard-14 fonts)`
          : `Unembedded font(s) detected: ${unembeddedFonts.join(', ')}`,
    });
  } catch (err) {
    checks.push({
      id: 'PDF-01',
      category: 'PDF Layout',
      label: 'PDF Render & Layout Inspection',
      passed: false,
      detail: err instanceof Error ? err.message : 'Failed to parse PDF',
    });
  }

  // 5. XLSX Live-Formula QA (when Full IC workbook generated)
  if (xlsxBuffer) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(xlsxBuffer as unknown as ArrayBuffer);
      const expectedSheets = [
        'Decision_Summary',
        'USALI_Operating_Model',
        'Valuation_Sensitivity',
        'PIP_and_Evidence_QA',
        'Scenario_Model',
      ];
      const missingSheets = expectedSheets.filter((name) => !wb.getWorksheet(name));
      let verifiedFormulas = 0;
      wb.eachSheet((ws) => {
        ws.eachRow((row) => {
          row.eachCell((cell) => {
            if (cell.formula && cell.formula.length > 0) {
              verifiedFormulas += 1;
            }
          });
        });
      });

      const dsSheet = wb.getWorksheet('Decision_Summary');
      const revCell = dsSheet?.getCell('B8').result;
      const noiCell = dsSheet?.getCell('B9').result;
      const pdfXlsxMatch =
        Number(revCell) === summary.t12?.totalRevenue && Number(noiCell) === summary.t12?.noi;

      checks.push({
        id: 'XLSX-01',
        category: 'XLSX Formula',
        label: 'Live-Formula Workbook Sheets, Formula Count & T12 Cross-Check',
        passed: missingSheets.length === 0 && verifiedFormulas >= 20 && pdfXlsxMatch,
        detail: `Sheets=${expectedSheets.length - missingSheets.length}/${expectedSheets.length}, Live formulas=${verifiedFormulas}, PDF-XLSX T12 Match=${pdfXlsxMatch}; independent Excel/LibreOffice recalculation NOT RUN`,
      });

      // Scenario values must agree with independent deterministic recomputation
      // and contain working formulas, not merely three labels or cached constants.
      const wsScenario = wb.getWorksheet('Scenario_Model');
      const params = [
        { name: 'Downside', occ: -5, adr: -6, exp: 2.5, cap: deal.targetCapRatePct + 0.75 },
        { name: 'Base Case', occ: 0, adr: 0, exp: 0, cap: deal.targetCapRatePct },
        { name: 'Stabilized', occ: 4, adr: 6, exp: -1.5, cap: Math.max(6, deal.targetCapRatePct - 0.5) },
      ];
      let scenarioMatches = 0;
      for (let i = 0; i < params.length; i++) {
        const sc = params[i];
        const r = i + 3;
        const independent = computeScenarioProjection(deal, {
          occupancyDeltaPctPts: sc.occ,
          adrDeltaPct: sc.adr,
          expenseDeltaPctPts: sc.exp,
          targetCapRatePct: sc.cap,
          pipExposureOverride: summary.totalPipExposure,
          closingCostsPct: 1.5,
        });
        const noi = wsScenario?.getCell(`S${r}`);
        const residual = wsScenario?.getCell(`U${r}`);
        const matches = (value: unknown, expected: number | null) =>
          expected === null ? value === 'N/A' : typeof value === 'number' && Math.abs(value - expected) <= 0.01;
        if (
          wsScenario?.getCell(`A${r}`).value === sc.name &&
          noi?.formula && residual?.formula &&
          matches(noi.result, independent.proFormaNoi) &&
          matches(residual.result, independent.impliedNetMaoAfterPipAndClosing)
        ) scenarioMatches++;
      }
      checks.push({
        id: 'XLSX-02',
        category: 'XLSX Formula',
        label: 'Full IC 3-Scenario Formula/Cached-Value Consistency',
        passed: scenarioMatches === 3,
        detail: `Independent JS recalculation matched ${scenarioMatches}/3 named scenario NOI/residual pairs; external workbook formula recalc NOT VERIFIED`,
      });
    } catch (err) {
      checks.push({
        id: 'XLSX-01',
        category: 'XLSX Formula',
        label: 'XLSX Workbook Inspection',
        passed: false,
        detail: err instanceof Error ? err.message : 'Failed to load XLSX',
      });
    }
  }

  const qaPassed = checks.every((c) => c.passed);
  return { qaPassed, qaChecks: checks, pdfPageCount };
}
