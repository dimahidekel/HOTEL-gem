import ExcelJS from 'exceljs';
import { FrozenUnderwritingSnapshot } from '../../src/types/factory.ts';
import { computeAnnualOperating, computeScenarioProjection } from '../../src/utils/financials.ts';

function colLetter(colNum: number): string {
  let s = '';
  let n = colNum;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function generateXlsxWorkbook(
  snapshot: FrozenUnderwritingSnapshot
): Promise<{ buffer: Buffer; formulaCount: number }> {
  const { deal, summary, masterProvenance } = snapshot;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HOTEL WORK DEV — Stage A Document Factory';
  wb.created = new Date();

  let formulaCount = 0;

  // Sheet 1: Decision Summary
  const wsSummary = wb.addWorksheet('Decision_Summary');
  wsSummary.columns = [
    { width: 34 },
    { width: 28 },
    { width: 42 },
  ];

  wsSummary.addRow(['HOTEL WORK DEV — STAGE A SYNTHETIC WORKBOOK (NOT MASTER VERIFIED)', '', '']);
  wsSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F294A' } };
  wsSummary.mergeCells('A1:C1');

  wsSummary.addRow(['Snapshot ID', snapshot.snapshotId, masterProvenance.disclaimer]);
  wsSummary.addRow(['Deal ID / Name', `${deal.id} — ${deal.name}`, deal.location]);
  wsSummary.addRow(['Room Count (Keys)', deal.rooms, 'Integer key count']);
  wsSummary.addRow([
    'Asking Price ($)',
    deal.askingPrice ?? 'N/A',
    deal.askingPrice ? 'Seller asking price' : 'Unpriced / N/A',
  ]);
  wsSummary.getCell('B5').numFmt = '$#,##0';

  const lastColIdx = 1 + Math.max(1, deal.historicalInputs.length);
  const t12Col = colLetter(lastColIdx);

  wsSummary.addRow([
    'Asking Price / Key',
    deal.askingPrice !== null && deal.rooms > 0
      ? { formula: 'B5/B4', result: deal.askingPrice / deal.rooms }
      : 'N/A',
    'Live formula: Asking Price / Keys',
  ]);
  if (deal.askingPrice !== null) {
    formulaCount += 1;
    wsSummary.getCell('B6').numFmt = '$#,##0';
  }

  wsSummary.addRow([
    'T12 RevPAR ($)',
    { formula: `USALI_Operating_Model!${t12Col}6`, result: summary.t12?.revPAR ?? 0 },
    'Linked to USALI_Operating_Model',
  ]);
  formulaCount += 1;
  wsSummary.getCell('B7').numFmt = '$#,##0.00';

  wsSummary.addRow([
    'T12 Total Revenue ($)',
    { formula: `USALI_Operating_Model!${t12Col}10`, result: summary.t12?.totalRevenue ?? 0 },
    'Linked to USALI_Operating_Model',
  ]);
  formulaCount += 1;
  wsSummary.getCell('B8').numFmt = '$#,##0';

  wsSummary.addRow([
    'T12 USALI NOI ($)',
    { formula: `USALI_Operating_Model!${t12Col}19`, result: summary.t12?.noi ?? 0 },
    'Linked to USALI_Operating_Model',
  ]);
  formulaCount += 1;
  wsSummary.getCell('B9').numFmt = '$#,##0';

  wsSummary.addRow([
    'Indicative Cap Rate (Ask)',
    deal.askingPrice !== null && deal.askingPrice > 0
      ? {
          formula: 'IF(B9>0, B9/B5, "N/A")',
          result:
            summary.t12?.noi && summary.t12.noi > 0
              ? summary.t12.noi / deal.askingPrice
              : 'N/A',
        }
      : 'N/A',
    'Never displays positive cap rate for negative NOI',
  ]);
  if (deal.askingPrice !== null && deal.askingPrice > 0) {
    formulaCount += 1;
    wsSummary.getCell('B10').numFmt = '0.00%';
  }

  wsSummary.addRow([
    'Identified PIP / Capex ($)',
    { formula: 'PIP_and_Evidence_QA!D100', result: summary.totalPipExposure },
    'Linked to PIP_and_Evidence_QA total',
  ]);
  // We'll place PIP sum at exact cell below once PIP sheet is built; update dynamically!

  wsSummary.addRow(['Target Benchmark Cap Rate', deal.targetCapRatePct / 100, 'Underwriting assumption']);
  wsSummary.getCell('B12').numFmt = '0.00%';

  wsSummary.addRow(['Investment Posture', deal.posture, deal.evidenceStatus]);
  wsSummary.addRow([
    'Final MAO & IC Approval',
    summary.finalMaoWithheld ? 'WITHHELD — CRITICAL BLOCKERS OPEN' : 'ELIGIBLE FOR REVIEW',
    `${summary.criticalBlockerCount} critical / ${summary.highBlockerCount} high blockers`,
  ]);

  // Sheet 2: USALI Operating Model (Live Formulas)
  const wsOp = wb.addWorksheet('USALI_Operating_Model');
  wsOp.columns = [
    { width: 34 },
    ...deal.historicalInputs.map(() => ({ width: 18 })),
  ];

  wsOp.addRow(['USALI Historical & T12 Operating Model', ...deal.historicalInputs.map((h) => h.period)]);
  wsOp.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsOp.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F294A' } };

  const rowLabels = [
    'Available Room Nights (Keys * 365)', // row 2
    'Occupied Room Nights', // row 3
    'Occupancy (%)', // row 4
    'ADR ($)', // row 5
    'RevPAR ($)', // row 6
    'Rooms Revenue ($)', // row 7
    'F&B / Banquet Revenue ($)', // row 8
    'Other Operated Revenue ($)', // row 9
    'Total Operating Revenue ($)', // row 10
    'Departmental Expenses ($)', // row 11
    'Undistributed Expenses ($)', // row 12
    'Gross Operating Profit (GOP) ($)', // row 13
    'GOP Margin (%)', // row 14
    'Management Fee ($)', // row 15
    'Franchise Fee ($)', // row 16
    'Property Taxes & Insurance ($)', // row 17
    'FF&E Reserve (4.0%) ($)', // row 18
    'USALI Net Operating Income (NOI) ($)', // row 19
    'NOI Margin (%)', // row 20
  ];

  rowLabels.forEach((lbl) => wsOp.addRow([lbl]));

  deal.historicalInputs.forEach((inp, idx) => {
    const c = colLetter(2 + idx);
    const comp = summary.historical[idx];

    wsOp.getCell(`${c}2`).value = { formula: 'Decision_Summary!$B$4*365', result: comp.roomsAvailableNights };
    wsOp.getCell(`${c}2`).numFmt = '#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}4`).value = inp.occupancyPct !== null ? inp.occupancyPct / 100 : null;
    wsOp.getCell(`${c}4`).numFmt = '0.0%';

    wsOp.getCell(`${c}5`).value = inp.adr;
    wsOp.getCell(`${c}5`).numFmt = '$#,##0.00';

    wsOp.getCell(`${c}3`).value = {
      formula: `IF(ISNUMBER(${c}4), ROUND(${c}2*${c}4, 0), "N/A")`,
      result: comp.occupiedRoomNights ?? 'N/A',
    };
    wsOp.getCell(`${c}3`).numFmt = '#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}6`).value = {
      formula: `IF(AND(ISNUMBER(${c}4), ISNUMBER(${c}5)), ${c}4*${c}5, "N/A")`,
      result: comp.revPAR ?? 'N/A',
    };
    wsOp.getCell(`${c}6`).numFmt = '$#,##0.00';
    formulaCount += 1;

    wsOp.getCell(`${c}7`).value = {
      formula: `IF(ISNUMBER(${c}6), ROUND(${c}2*${c}6, 0), "N/A")`,
      result: comp.roomsRevenue ?? 'N/A',
    };
    wsOp.getCell(`${c}7`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}8`).value = inp.fbRevenue;
    wsOp.getCell(`${c}8`).numFmt = '$#,##0';

    wsOp.getCell(`${c}9`).value = inp.otherRevenue;
    wsOp.getCell(`${c}9`).numFmt = '$#,##0';

    wsOp.getCell(`${c}10`).value = {
      formula: `IF(ISNUMBER(${c}7), SUM(${c}7:${c}9), "N/A")`,
      result: comp.totalRevenue ?? 'N/A',
    };
    wsOp.getCell(`${c}10`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}11`).value = {
      formula: `IF(ISNUMBER(${c}10), ROUND(${c}10*${(inp.departmentalExpenseRatioPct / 100).toFixed(4)}, 0), "N/A")`,
      result: comp.departmentalExpenses ?? 'N/A',
    };
    wsOp.getCell(`${c}11`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}12`).value = {
      formula: `IF(ISNUMBER(${c}10), ROUND(${c}10*${(inp.undistributedExpenseRatioPct / 100).toFixed(4)}, 0), "N/A")`,
      result: comp.undistributedExpenses ?? 'N/A',
    };
    wsOp.getCell(`${c}12`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}13`).value = {
      formula: `IF(ISNUMBER(${c}10), ${c}10-${c}11-${c}12, "N/A")`,
      result: comp.gop ?? 'N/A',
    };
    wsOp.getCell(`${c}13`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}14`).value = {
      formula: `IF(AND(ISNUMBER(${c}10), ${c}10>0), ${c}13/${c}10, "N/A")`,
      result: comp.gopMarginPct !== null ? comp.gopMarginPct / 100 : 'N/A',
    };
    wsOp.getCell(`${c}14`).numFmt = '0.0%';
    formulaCount += 1;

    wsOp.getCell(`${c}15`).value = {
      formula: `IF(ISNUMBER(${c}10), ROUND(${c}10*${(inp.managementFeePct / 100).toFixed(4)}, 0), "N/A")`,
      result: comp.managementFee ?? 'N/A',
    };
    wsOp.getCell(`${c}15`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}16`).value = {
      formula: `IF(ISNUMBER(${c}7), ROUND(${c}7*${(inp.franchiseFeePctOfRooms / 100).toFixed(4)}, 0), "N/A")`,
      result: comp.franchiseFee ?? 'N/A',
    };
    wsOp.getCell(`${c}16`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}17`).value = inp.propertyTaxesAndInsurance;
    wsOp.getCell(`${c}17`).numFmt = '$#,##0';

    wsOp.getCell(`${c}18`).value = {
      formula: `IF(ISNUMBER(${c}10), ROUND(${c}10*${(inp.ffeReservePct / 100).toFixed(4)}, 0), "N/A")`,
      result: comp.ffeReserve ?? 'N/A',
    };
    wsOp.getCell(`${c}18`).numFmt = '$#,##0';
    formulaCount += 1;

    wsOp.getCell(`${c}19`).value = {
      formula: `IF(ISNUMBER(${c}13), ${c}13-${c}15-${c}16-${c}17-${c}18, "N/A")`,
      result: comp.noi ?? 'N/A',
    };
    wsOp.getCell(`${c}19`).numFmt = '$#,##0';
    wsOp.getCell(`${c}19`).font = { bold: true };
    formulaCount += 1;

    wsOp.getCell(`${c}20`).value = {
      formula: `IF(AND(ISNUMBER(${c}10), ${c}10>0), ${c}19/${c}10, "N/A")`,
      result: comp.noiMarginPct !== null ? comp.noiMarginPct / 100 : 'N/A',
    };
    wsOp.getCell(`${c}20`).numFmt = '0.0%';
    formulaCount += 1;
  });

  // Sheet 3: Valuation Sensitivity
  const wsSens = wb.addWorksheet('Valuation_Sensitivity');
  wsSens.columns = [{ width: 22 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
  const capRates = [-1.0, -0.5, 0, 0.5, 1.0].map((d) =>
    Math.max(0.05, (deal.targetCapRatePct + d) / 100)
  );
  wsSens.addRow(['NOI Shock \\ Cap Rate', ...capRates]);
  wsSens.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsSens.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F294A' } };
  for (let c = 2; c <= 6; c++) {
    wsSens.getCell(1, c).numFmt = '0.00%';
  }

  const shocks = [-0.15, -0.075, 0, 0.075, 0.15];
  shocks.forEach((sh, rIdx) => {
    const rowNum = 2 + rIdx;
    wsSens.getCell(rowNum, 1).value = sh;
    wsSens.getCell(rowNum, 1).numFmt = '+0.0%;-0.0%;0.0%';
    capRates.forEach((cap, cIdx) => {
      const colN = 2 + cIdx;
      const capCol = colLetter(colN);
      const t12Noi = summary.t12?.noi;
      const shocked = t12Noi !== null ? t12Noi * (1 + sh) : null;
      wsSens.getCell(rowNum, colN).value = {
        formula: `IF(AND(ISNUMBER(Decision_Summary!$B$9), Decision_Summary!$B$9*(1+$A${rowNum})>0), (Decision_Summary!$B$9*(1+$A${rowNum}))/${capCol}$1, "N/A")`,
        result: shocked !== null && shocked > 0 ? shocked / cap : 'N/A',
      };
      wsSens.getCell(rowNum, colN).numFmt = '$#,##0';
      formulaCount += 1;
    });
  });

  // Sheet 4: PIP & Evidence QA
  const wsPip = wb.addWorksheet('PIP_and_Evidence_QA');
  wsPip.columns = [{ width: 14 }, { width: 36 }, { width: 22 }, { width: 18 }];
  wsPip.addRow(['Item ID', 'PIP / Capital Category', 'Timing', 'Estimated Cost ($)']);
  wsPip.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsPip.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F294A' } };

  if (deal.pipItems.length === 0) {
    wsPip.addRow(['NONE', 'No itemized PIP entries logged', 'N/A', 0]);
  } else {
    deal.pipItems.forEach((p) => {
      const row = wsPip.addRow([p.id, p.category, p.timing, p.estimatedCost]);
      row.getCell(4).numFmt = '$#,##0';
    });
  }

  const pipLastDataRow = Math.max(2, 1 + deal.pipItems.length);
  const pipTotalRowNum = pipLastDataRow + 1;
  wsPip.getCell(`A${pipTotalRowNum}`).value = 'TOTAL';
  wsPip.getCell(`B${pipTotalRowNum}`).value = 'Aggregate Identified PIP / Capex';
  wsPip.getCell(`D${pipTotalRowNum}`).value = {
    formula: `SUM(D2:D${pipLastDataRow})`,
    result: summary.totalPipExposure,
  };
  wsPip.getCell(`D${pipTotalRowNum}`).numFmt = '$#,##0';
  wsPip.getRow(pipTotalRowNum).font = { bold: true };
  formulaCount += 1;

  // Link Decision_Summary B11 to exact PIP total cell
  wsSummary.getCell('B11').value = {
    formula: `PIP_and_Evidence_QA!D${pipTotalRowNum}`,
    result: summary.totalPipExposure,
  };
  wsSummary.getCell('B11').numFmt = '$#,##0';
  formulaCount += 1;

  // Blockers summary below PIP table
  wsPip.addRow([]);
  wsPip.addRow(['Blocker ID', 'Critical / High Evidence Blocker', 'Severity', 'Blocks Final MAO']);
  deal.blockers.forEach((b) => {
    wsPip.addRow([b.id, b.title, b.severity, b.blocksFinalMao ? 'YES' : 'NO']);
  });

  // Sheet 5: transparent, formula-driven, explicitly hypothetical scenarios.
  // IMPORTANT: these are NOT a dated, verified multi-year cash-flow forecast.
  // They expose the same three driver cases rendered in Full IC PDF §8.
  const wsSc = wb.addWorksheet('Scenario_Model');
  const scenarioHeaders = [
    'Scenario (ASSUMPTION)', 'Occ Delta (pp)', 'ADR Delta (%)', 'Expense Delta (pp)',
    'Cap Rate (%)', 'Closing Costs (%)', 'Occupancy (%)', 'ADR ($)', 'RevPAR ($)',
    'Rooms Revenue ($)', 'Total Revenue ($)', 'Dept. Exp. ($)', 'Undist. Exp. ($)',
    'GOP ($)', 'Mgmt Fee ($)', 'Franchise Fee ($)', 'Tax & Insurance ($)',
    'FF&E Reserve ($)', 'NOI Post-FF&E ($)', 'Gross Value ($)',
    'Net Residual ($, NOT MAO)', 'PIP ($)',
  ];
  wsSc.addRow(['SYNTHETIC / UNVERIFIED DRIVER SCENARIOS — NOT A DATED INVESTMENT CASH FLOW OR FINAL MAO']);
  wsSc.mergeCells('A1:V1');
  wsSc.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsSc.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF183B53' } };
  wsSc.addRow(scenarioHeaders);
  wsSc.getRow(2).font = { bold: true };
  wsSc.columns = scenarioHeaders.map((header, idx) => ({ width: idx === 0 ? 27 : Math.max(15, Math.min(24, header.length + 2)) }));

  const scInputs = [
    { label: 'Downside', occ: -5, adr: -6, exp: 2.5, cap: deal.targetCapRatePct + 0.75 },
    { label: 'Base Case', occ: 0, adr: 0, exp: 0, cap: deal.targetCapRatePct },
    { label: 'Stabilized', occ: 4, adr: 6, exp: -1.5, cap: Math.max(6, deal.targetCapRatePct - 0.5) },
  ];
  const lastInput = deal.historicalInputs[deal.historicalInputs.length - 1];
  // Editable assumptions: spreadsheet recalculates linked operating model outputs.
  const assumptions: [string, number][] = [
    ['Departmental Ratio (pct points)', lastInput.departmentalExpenseRatioPct],
    ['Undistributed Ratio (pct points)', lastInput.undistributedExpenseRatioPct],
    ['Management Fee (pct points)', lastInput.managementFeePct],
    ['Franchise Fee (pct points of rooms)', lastInput.franchiseFeePctOfRooms],
    ['Taxes and Insurance ($)', lastInput.propertyTaxesAndInsurance],
    ['FF&E Reserve (pct points)', lastInput.ffeReservePct],
  ];
  assumptions.forEach(([label, value], i) => {
    wsSc.getCell(`A${11 + i}`).value = label;
    wsSc.getCell(`B${11 + i}`).value = value;
  });
  wsSc.getCell('A9').value = 'USER-EDITABLE ASSUMPTIONS (UNVERIFIED)';
  wsSc.getCell('A9').font = { bold: true };
  wsSc.getCell('A18').value = 'NO REAL DEBT, PIP DOWNTIME, EXIT CASH FLOW, OR IRR/MOIC IS MODELED HERE.';
  wsSc.mergeCells('A18:H18');

  scInputs.forEach((sc, idx) => {
    const r = idx + 3;
    const projected = computeScenarioProjection(deal, {
      occupancyDeltaPctPts: sc.occ,
      adrDeltaPct: sc.adr,
      expenseDeltaPctPts: sc.exp,
      targetCapRatePct: sc.cap,
      pipExposureOverride: summary.totalPipExposure,
      closingCostsPct: 1.5,
    });
    const adjOcc = lastInput.occupancyPct === null ? null : Math.min(95, Math.max(15, lastInput.occupancyPct + sc.occ));
    const adjAdr = lastInput.adr === null ? null : Math.max(40, lastInput.adr * (1 + sc.adr / 100));
    const op = computeAnnualOperating(deal.rooms, {
      ...lastInput,
      period: sc.label,
      occupancyPct: adjOcc,
      adr: adjAdr,
      explicitRoomsRevenue: undefined,
      departmentalExpenseRatioPct: Math.max(12, lastInput.departmentalExpenseRatioPct + sc.exp * 0.55),
      undistributedExpenseRatioPct: Math.max(10, lastInput.undistributedExpenseRatioPct + sc.exp * 0.45),
    });
    const cached = (v: number | null) => v ?? 'N/A';
    const cellFormula = (col: string, formula: string, value: number | null) => {
      wsSc.getCell(`${col}${r}`).value = { formula, result: cached(value) };
      formulaCount += 1;
    };
    wsSc.getCell(`A${r}`).value = sc.label;
    wsSc.getCell(`B${r}`).value = sc.occ;
    wsSc.getCell(`C${r}`).value = sc.adr;
    wsSc.getCell(`D${r}`).value = sc.exp;
    wsSc.getCell(`E${r}`).value = sc.cap / 100;
    wsSc.getCell(`F${r}`).value = 0.015;
    wsSc.getCell(`V${r}`).value = { formula: 'Decision_Summary!$B$11', result: summary.totalPipExposure };
    formulaCount += 1;

    cellFormula('G', `IF(ISNUMBER(USALI_Operating_Model!${t12Col}4),MIN(0.95,MAX(0.15,USALI_Operating_Model!${t12Col}4+B${r}/100)),"N/A")`, adjOcc === null ? null : adjOcc / 100);
    cellFormula('H', `IF(ISNUMBER(USALI_Operating_Model!${t12Col}5),MAX(40,USALI_Operating_Model!${t12Col}5*(1+C${r}/100)),"N/A")`, adjAdr);
    cellFormula('I', `IF(AND(ISNUMBER(G${r}),ISNUMBER(H${r})),G${r}*H${r},"N/A")`, op.revPAR);
    cellFormula('J', `IF(ISNUMBER(I${r}),ROUND(USALI_Operating_Model!${t12Col}2*I${r},0),"N/A")`, op.roomsRevenue);
    cellFormula('K', `IF(ISNUMBER(J${r}),J${r}+USALI_Operating_Model!${t12Col}8+USALI_Operating_Model!${t12Col}9,"N/A")`, op.totalRevenue);
    cellFormula('L', `IF(ISNUMBER(K${r}),ROUND(K${r}*MAX(12,$B$11+D${r}*0.55)/100,0),"N/A")`, op.departmentalExpenses);
    cellFormula('M', `IF(ISNUMBER(K${r}),ROUND(K${r}*MAX(10,$B$12+D${r}*0.45)/100,0),"N/A")`, op.undistributedExpenses);
    cellFormula('N', `IF(ISNUMBER(K${r}),K${r}-L${r}-M${r},"N/A")`, op.gop);
    cellFormula('O', `IF(ISNUMBER(K${r}),ROUND(K${r}*$B$13/100,0),"N/A")`, op.managementFee);
    cellFormula('P', `IF(ISNUMBER(J${r}),ROUND(J${r}*$B$14/100,0),"N/A")`, op.franchiseFee);
    cellFormula('Q', '$B$15', op.propertyTaxesAndInsurance);
    cellFormula('R', `IF(ISNUMBER(K${r}),ROUND(K${r}*$B$16/100,0),"N/A")`, op.ffeReserve);
    cellFormula('S', `IF(ISNUMBER(N${r}),N${r}-O${r}-P${r}-Q${r}-R${r},"N/A")`, op.noi);
    cellFormula('T', `IF(AND(ISNUMBER(S${r}),S${r}>0,E${r}>0),S${r}/E${r},"N/A")`, projected.impliedGrossValue);
    cellFormula('U', `IF(ISNUMBER(T${r}),MAX(0,T${r}*(1-F${r})-V${r}),"N/A")`, projected.impliedNetMaoAfterPipAndClosing);
    ['E', 'F', 'G'].forEach((col) => { wsSc.getCell(`${col}${r}`).numFmt = '0.00%'; });
    for (const col of ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V']) {
      wsSc.getCell(`${col}${r}`).numFmt = '$#,##0.00;[Red]($#,##0.00)';
    }
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(arrayBuffer), formulaCount };
}
