import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { DocumentType, FrozenUnderwritingSnapshot } from '../../src/types/factory.ts';
import {
  computeScenarioProjection,
  formatCapRate,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../../src/utils/financials.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONTS_DIR = path.resolve(__dirname, 'fonts');

const FONT_SANS = 'Sans';
const FONT_SANS_BOLD = 'SansBold';
const FONT_MONO = 'Mono';
const FONT_MONO_BOLD = 'MonoBold';

function registerEmbeddedFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont(FONT_SANS, path.join(FONTS_DIR, 'LiberationSans-Regular.ttf'));
  doc.registerFont(FONT_SANS_BOLD, path.join(FONTS_DIR, 'LiberationSans-Bold.ttf'));
  doc.registerFont(FONT_MONO, path.join(FONTS_DIR, 'JetBrainsMono-Regular.ttf'));
  doc.registerFont(FONT_MONO_BOLD, path.join(FONTS_DIR, 'JetBrainsMono-Bold.ttf'));
  doc.font(FONT_SANS);
}

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2; // 528pt
const BOTTOM_LIMIT = PAGE_H - 54;

// Master §21 / §24 Detroit UX v3 semantic palette
const COL_NAVY = '#183B53';
const COL_TEAL = '#257C83';
const COL_CARD_BG = '#F1F5F6';
const COL_CRIMSON = '#AB382B';
const COL_VERIFIED = '#1B7A4B';
const COL_WATCH = '#B45309';
const COL_TEXT = '#1E293B';
const COL_MUTED = '#52606D';
const COL_BORDER = '#CBD5E1';
const COL_BG_ALT = '#F8FAFC';

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > BOTTOM_LIMIT) {
    doc.addPage();
    doc.y = MARGIN + 16;
  }
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: { label: string; width: number; align?: 'left' | 'right' }[],
  rows: { cells: string[]; bold?: boolean; bg?: string; lastColor?: string }[]
) {
  const rowPadY = 5;
  const drawHeader = () => {
    ensureSpace(doc, 26);
    const y0 = doc.y;
    doc.save();
    doc.rect(MARGIN, y0, CONTENT_W, 21).fill(COL_NAVY);
    let x = MARGIN;
    headers.forEach((h) => {
      doc
        .font(FONT_SANS_BOLD)
        .fontSize(8.2)
        .fillColor('#FFFFFF')
        .text(h.label, x + 5, y0 + 6, {
          width: h.width - 10,
          align: h.align ?? 'left',
          lineBreak: false,
        });
      x += h.width;
    });
    doc.restore();
    doc.y = y0 + 21;
  };

  drawHeader();

  rows.forEach((r, idx) => {
    doc.font(r.bold ? FONT_SANS_BOLD : FONT_SANS).fontSize(9.0);
    let maxH = 19;
    r.cells.forEach((val, cIdx) => {
      const h = headers[cIdx];
      const w = Math.max(20, h.width - 10);
      doc.font(
        h.align === 'right'
          ? r.bold
            ? FONT_MONO_BOLD
            : FONT_MONO
          : r.bold
            ? FONT_SANS_BOLD
            : FONT_SANS
      );
      const cellH = doc.heightOfString(val, { width: w });
      if (cellH + rowPadY * 2 > maxH) maxH = cellH + rowPadY * 2;
    });

    if (doc.y + maxH > BOTTOM_LIMIT) {
      doc.addPage();
      doc.y = MARGIN + 16;
      drawHeader();
    }

    const y0 = doc.y;
    const bg = r.bg ?? (idx % 2 === 1 ? COL_BG_ALT : '#FFFFFF');
    doc.save();
    doc.rect(MARGIN, y0, CONTENT_W, maxH).fill(bg);
    doc
      .moveTo(MARGIN, y0 + maxH)
      .lineTo(MARGIN + CONTENT_W, y0 + maxH)
      .strokeColor('#E2E8F0')
      .lineWidth(0.5)
      .stroke();

    let x = MARGIN;
    r.cells.forEach((val, cIdx) => {
      const h = headers[cIdx];
      const isRight = h.align === 'right';
      const isLast = cIdx === r.cells.length - 1;
      doc
        .font(isRight ? (r.bold ? FONT_MONO_BOLD : FONT_MONO) : r.bold ? FONT_SANS_BOLD : FONT_SANS)
        .fontSize(9.0)
        .fillColor(isLast && r.lastColor ? r.lastColor : COL_TEXT)
        .text(val, x + 5, y0 + rowPadY, {
          width: h.width - 10,
          align: h.align ?? 'left',
        });
      x += h.width;
    });
    doc.restore();
    doc.y = y0 + maxH;
  });

  doc.y += 10;
}

function drawRevenueNoiVectorChart(
  doc: PDFKit.PDFDocument,
  snapshot: FrozenUnderwritingSnapshot
) {
  const valid = snapshot.summary.historical.filter(
    (d) => d.totalRevenue !== null && d.noi !== null
  );
  if (valid.length === 0) return;

  const boxH = 175;
  ensureSpace(doc, boxH + 14);
  const x0 = MARGIN;
  const y0 = doc.y;

  doc.save();
  doc.rect(x0, y0, CONTENT_W, boxH).strokeColor(COL_BORDER).lineWidth(0.75).stroke();
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(8.5)
    .fillColor(COL_NAVY)
    .text('Historical Total Revenue vs. USALI NOI (Unverified Baseline)', x0 + 12, y0 + 10);

  doc.rect(x0 + 340, y0 + 11, 8, 8).fill(COL_NAVY);
  doc.font(FONT_SANS).fontSize(8.0).fillColor(COL_TEXT).text('Total Revenue', x0 + 352, y0 + 10);
  doc.rect(x0 + 425, y0 + 11, 8, 8).fill(COL_TEAL);
  doc.text('NOI', x0 + 437, y0 + 10);

  const padL = 56;
  const padR = 16;
  const padT = 34;
  const padB = 26;
  const plotW = CONTENT_W - padL - padR;
  const plotH = boxH - padT - padB;

  const maxRev = Math.max(...valid.map((d) => d.totalRevenue ?? 0), 1) * 1.15;
  const minNoi = Math.min(...valid.map((d) => d.noi ?? 0), 0);
  const minVal = minNoi < 0 ? minNoi * 1.25 : 0;
  const range = maxRev - minVal || 1;
  const yFor = (v: number) => y0 + padT + ((maxRev - v) / range) * plotH;
  const zeroY = yFor(0);

  [maxRev, maxRev * 0.5, 0, ...(minVal < 0 ? [minVal] : [])].forEach((tick) => {
    const ty = yFor(tick);
    doc
      .moveTo(x0 + padL, ty)
      .lineTo(x0 + CONTENT_W - padR, ty)
      .strokeColor(tick === 0 ? '#94A3B8' : '#E2E8F0')
      .lineWidth(tick === 0 ? 1 : 0.5)
      .stroke();
    doc
      .font(FONT_MONO)
      .fontSize(8.0)
      .fillColor(COL_MUTED)
      .text(formatCurrency(tick, true), x0 + 2, ty - 4, { width: padL - 6, align: 'right' });
  });

  const groupW = plotW / valid.length;
  const barW = Math.min(26, groupW * 0.28);

  valid.forEach((item, idx) => {
    const cx = x0 + padL + groupW * idx + groupW / 2;
    const rev = item.totalRevenue ?? 0;
    const noi = item.noi ?? 0;

    const revTop = yFor(Math.max(0, rev));
    const revH = Math.max(2, zeroY - revTop);
    doc.rect(cx - barW - 2, revTop, barW, revH).fill(COL_NAVY);
    doc
      .font(FONT_MONO)
      .fontSize(7.8)
      .fillColor(COL_NAVY)
      .text(formatCurrency(rev, true), cx - barW - 14, revTop - 10, { width: barW + 24, align: 'center' });

    const noiTop = noi >= 0 ? yFor(noi) : zeroY;
    const noiH = Math.max(2, Math.abs(yFor(noi) - zeroY));
    const noiCol = noi >= 0 ? COL_TEAL : COL_CRIMSON;
    doc.rect(cx + 2, noiTop, barW, noiH).fill(noiCol);
    doc
      .font(FONT_MONO)
      .fontSize(7.8)
      .fillColor(noiCol)
      .text(
        formatCurrency(noi, true),
        cx - 10,
        noi >= 0 ? noiTop - 10 : noiTop + noiH + 2,
        { width: barW + 24, align: 'center' }
      );

    doc
      .font(FONT_SANS)
      .fontSize(8.0)
      .fillColor(COL_TEXT)
      .text(item.period, cx - groupW / 2, y0 + boxH - 18, { width: groupW, align: 'center' });
  });

  doc.restore();
  doc.y = y0 + boxH + 12;
}

function drawNoiWaterfallVectorChart(
  doc: PDFKit.PDFDocument,
  snapshot: FrozenUnderwritingSnapshot
) {
  const t12 = snapshot.summary.t12;
  if (
    !t12 ||
    t12.totalRevenue === null ||
    t12.departmentalExpenses === null ||
    t12.undistributedExpenses === null ||
    t12.gop === null ||
    t12.managementFee === null ||
    t12.franchiseFee === null ||
    t12.ffeReserve === null ||
    t12.noi === null
  ) {
    return;
  }

  const boxH = 175;
  ensureSpace(doc, boxH + 14);
  const x0 = MARGIN;
  const y0 = doc.y;

  const fixedAndFees = t12.managementFee + t12.franchiseFee + t12.propertyTaxesAndInsurance;
  const afterDept = t12.totalRevenue - t12.departmentalExpenses;
  const afterFixed = t12.gop - fixedAndFees;

  const steps = [
    { label: 'Total Rev', start: 0, end: t12.totalRevenue, val: t12.totalRevenue, color: COL_NAVY },
    { label: 'Dept Exp', start: afterDept, end: t12.totalRevenue, val: -t12.departmentalExpenses, color: COL_MUTED },
    { label: 'Undist Exp', start: t12.gop, end: afterDept, val: -t12.undistributedExpenses, color: COL_MUTED },
    { label: 'GOP', start: 0, end: t12.gop, val: t12.gop, color: COL_NAVY },
    { label: 'Fees & Tax', start: afterFixed, end: t12.gop, val: -fixedAndFees, color: COL_MUTED },
    { label: 'FF&E 4%', start: t12.noi, end: afterFixed, val: -t12.ffeReserve, color: COL_MUTED },
    {
      label: 'T12 NOI',
      start: t12.noi >= 0 ? 0 : t12.noi,
      end: t12.noi >= 0 ? t12.noi : 0,
      val: t12.noi,
      color: t12.noi >= 0 ? COL_TEAL : COL_CRIMSON,
    },
  ];

  doc.save();
  doc.rect(x0, y0, CONTENT_W, boxH).strokeColor(COL_BORDER).lineWidth(0.75).stroke();
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(8.5)
    .fillColor(COL_NAVY)
    .text(`T12 USALI NOI Waterfall Bridge (${t12.period})`, x0 + 12, y0 + 10);

  const padL = 56;
  const padR = 14;
  const padT = 34;
  const padB = 26;
  const plotW = CONTENT_W - padL - padR;
  const plotH = boxH - padT - padB;

  const allVals = steps.flatMap((s) => [s.start, s.end, 0]);
  const maxVal = Math.max(...allVals) * 1.15;
  const minVal = Math.min(...allVals) < 0 ? Math.min(...allVals) * 1.25 : 0;
  const range = maxVal - minVal || 1;
  const yFor = (v: number) => y0 + padT + ((maxVal - v) / range) * plotH;
  const zeroY = yFor(0);

  doc.moveTo(x0 + padL, zeroY).lineTo(x0 + CONTENT_W - padR, zeroY).strokeColor('#94A3B8').lineWidth(1).stroke();
  doc.font(FONT_MONO).fontSize(8.0).fillColor(COL_MUTED).text('$0', x0 + 2, zeroY - 4, { width: padL - 6, align: 'right' });

  const colW = plotW / steps.length;
  const barW = Math.min(34, colW * 0.62);

  steps.forEach((s, idx) => {
    const cx = x0 + padL + idx * colW + colW / 2;
    const topV = Math.max(s.start, s.end);
    const botV = Math.min(s.start, s.end);
    const yt = yFor(topV);
    const yb = yFor(botV);
    const h = Math.max(2, yb - yt);
    doc.rect(cx - barW / 2, yt, barW, h).fill(s.color);
    doc
      .font(FONT_MONO)
      .fontSize(7.8)
      .fillColor(s.color)
      .text(
        formatCurrency(s.val, true),
        cx - colW / 2,
        s.val < 0 && s.label === 'T12 NOI' ? yb + 2 : yt - 10,
        { width: colW, align: 'center' }
      );
    doc
      .font(FONT_SANS)
      .fontSize(8.0)
      .fillColor(COL_TEXT)
      .text(s.label, cx - colW / 2, y0 + boxH - 18, { width: colW, align: 'center' });
  });

  doc.restore();
  doc.y = y0 + boxH + 12;
}

export async function generatePdfArtifact(
  snapshot: FrozenUnderwritingSnapshot,
  docType: DocumentType
): Promise<{ buffer: Buffer; pageCount: number }> {
  const { deal, summary, masterProvenance } = snapshot;
  const { t12, historical } = summary;
  const isEs = docType === 'executive-summary';
  const sections = isEs ? snapshot.esSections : snapshot.icSections;
  const docTitle = isEs
    ? 'EXECUTIVE SUMMARY'
    : 'FULL INVESTMENT COMMITTEE MEMORANDUM';

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: `${docTitle} — ${deal.name} (${deal.id})`,
      Author: 'HOTEL WORK DEV — Document Factory',
      Subject: masterProvenance.disclaimer,
    },
  });

  registerEmbeddedFonts(doc);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // Add clickable outline bookmark for Cover (§21)
  doc.outline.addItem('Investment Decision Screen');

  // =========================================================================
  // UNNUMBERED PAGE 1 — LOCKED INVESTMENT DECISION SCREEN (Master §24 & UX v3)
  // =========================================================================

  // Top Header Strip
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(8.5)
    .fillColor(COL_TEAL)
    .text(`HOTEL WORK / INVESTMENT DECISION SCREEN  ·  ${docTitle}`, MARGIN, MARGIN);

  doc
    .font(FONT_MONO)
    .fontSize(8.0)
    .fillColor(COL_MUTED)
    .text(
      `${masterProvenance.complianceStatus} | Master: ${masterProvenance.masterRevision} | Snapshot: ${snapshot.snapshotId}`,
      MARGIN,
      MARGIN + 13,
      { width: CONTENT_W, lineBreak: false }
    );

  // Prominent Property Name & Location
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(17.5)
    .fillColor(COL_NAVY)
    .text(`${deal.name} (${deal.id})`, MARGIN, MARGIN + 29, { width: CONTENT_W });

  doc
    .font(FONT_SANS)
    .fontSize(9.5)
    .fillColor(COL_MUTED)
    .text(
      `${deal.location} · ${deal.submarket} · ${deal.rooms} Keys · ${deal.brand} · ${deal.assetClass}`,
      MARGIN,
      doc.y + 2,
      { width: CONTENT_W }
    );

  doc.y += 10;

  // Restrained IC DECISION Status Banner (dynamic height, zero truncation)
  const isHoldOrBlocked = deal.posture === 'HOLD / KILL' || summary.finalMaoWithheld;
  doc.font(FONT_SANS).fontSize(8.3);
  const rationaleH = doc.heightOfString(deal.postureRationale, {
    width: CONTENT_W - 22,
    lineGap: 1.5,
  });
  const statusBannerH = Math.max(46, Math.ceil(rationaleH) + 30);
  const sbY = doc.y;
  doc.save();
  doc
    .rect(MARGIN, sbY, CONTENT_W, statusBannerH)
    .fill(isHoldOrBlocked ? '#FDF2F2' : COL_CARD_BG);
  doc
    .rect(MARGIN, sbY, 4, statusBannerH)
    .fill(isHoldOrBlocked ? COL_CRIMSON : COL_TEAL);
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(9.5)
    .fillColor(isHoldOrBlocked ? COL_CRIMSON : COL_NAVY)
    .text(
      `IC DECISION | ${deal.posture}  ·  ${summary.finalMaoWithheld ? 'NOT FINAL / NO HARD DEPOSIT' : 'CONDITIONAL REVIEW'}`,
      MARGIN + 12,
      sbY + 8,
      { width: CONTENT_W - 22, lineBreak: false }
    );
  doc
    .font(FONT_SANS)
    .fontSize(8.3)
    .fillColor(COL_TEXT)
    .text(deal.postureRationale, MARGIN + 12, sbY + 23, {
      width: CONTENT_W - 22,
      lineGap: 1.5,
    });
  doc.restore();
  doc.y = sbY + statusBannerH + 12;

  // Two Equally Weighted Prominent KPI Cards (Master §24)
  const cardGap = 12;
  const cardW = (CONTENT_W - cardGap) / 2; // 256pt each
  const cardH = 92;
  const cardY = doc.y;

  // Left KPI Card: ASKING PRICE
  doc.save();
  doc.rect(MARGIN, cardY, cardW, cardH).fill(COL_CARD_BG);
  doc.rect(MARGIN, cardY, cardW, 3).fill(COL_NAVY);
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(8)
    .fillColor(COL_MUTED)
    .text('ASKING PRICE', MARGIN + 12, cardY + 12, { width: cardW - 24 });
  doc
    .font(FONT_MONO_BOLD)
    .fontSize(17)
    .fillColor(COL_NAVY)
    .text(
      deal.askingPrice !== null ? formatCurrency(deal.askingPrice) : 'UNPRICED / N/A',
      MARGIN + 12,
      cardY + 27,
      { width: cardW - 24 }
    );
  doc
    .font(FONT_SANS)
    .fontSize(8.5)
    .fillColor(COL_TEXT)
    .text(
      `${deal.rooms} Offered Keys  ·  ${formatCurrency(summary.pricePerKey)} / Key`,
      MARGIN + 12,
      cardY + 54,
      { width: cardW - 24 }
    );
  doc
    .font(FONT_SANS)
    .fontSize(8)
    .fillColor(COL_MUTED)
    .text(
      `Benchmark Target Cap: ${formatPercent(deal.targetCapRatePct, 2)} (Unverified)`,
      MARGIN + 12,
      cardY + 70,
      { width: cardW - 24 }
    );
  doc.restore();

  // Right KPI Card: HISTORICAL OPERATING BRIDGE
  const rightX = MARGIN + cardW + cardGap;
  doc.save();
  doc.rect(rightX, cardY, cardW, cardH).fill(COL_CARD_BG);
  doc.rect(rightX, cardY, cardW, 3).fill(COL_TEAL);
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(8)
    .fillColor(COL_MUTED)
    .text(
      `HISTORICAL OPERATING BRIDGE (${t12?.period ?? 'T12'})`,
      rightX + 12,
      cardY + 12,
      { width: cardW - 24 }
    );
  doc
    .font(FONT_MONO_BOLD)
    .fontSize(17)
    .fillColor(t12?.noi !== null && t12.noi < 0 ? COL_CRIMSON : COL_NAVY)
    .text(
      t12?.noi !== null && t12?.noi !== undefined ? `${formatCurrency(t12.noi)} NOI` : 'UNKNOWN',
      rightX + 12,
      cardY + 27,
      { width: cardW - 24 }
    );
  doc
    .font(FONT_SANS)
    .fontSize(8.5)
    .fillColor(COL_TEXT)
    .text(
      `Rev ${formatCurrency(t12?.totalRevenue)} · RevPAR ${formatCurrencyExact(t12?.revPAR)} (${formatPercent(t12?.occupancyPct)})`,
      rightX + 12,
      cardY + 54,
      { width: cardW - 24 }
    );
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(8)
    .fillColor(COL_CRIMSON)
    .text('DISCLOSURE: Seller-derived bridge — NOT normalized NOI', rightX + 12, cardY + 70, {
      width: cardW - 24,
    });
  doc.restore();

  doc.y = cardY + cardH + 10;

  // Separate Horizontal State Line (Master §24)
  const capDisplay = formatCapRate(summary.indicativeCapRatePct, t12?.noi);
  const pipStatus =
    summary.totalPipExposure > 0
      ? `${formatCurrency(summary.totalPipExposure)} (${formatCurrency(summary.pipPerKey)}/key · Unverified)`
      : 'UNPRICED (PCA Required)';
  const stateY = doc.y;
  doc.save();
  doc.rect(MARGIN, stateY, CONTENT_W, 28).fill(COL_NAVY);
  doc
    .font(FONT_MONO_BOLD)
    .fontSize(8)
    .fillColor('#FFFFFF')
    .text(
      `FINAL MAO = ${summary.finalMaoWithheld ? 'WITHHELD' : formatCurrency(summary.indicativeNetMaoUnverified)}   |   CAPITAL / PIP = ${pipStatus}   |   CAP = ${capDisplay}`,
      MARGIN + 10,
      stateY + 10,
      { width: CONTENT_W - 20, lineBreak: false }
    );
  doc.restore();
  doc.y = stateY + 38;

  // WHAT BLOCKS THE INVESTMENT? — Strictly Three Ranked P0 Verifications (Master §24)
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(9.5)
    .fillColor(COL_CRIMSON)
    .text('WHAT BLOCKS THE INVESTMENT? (TOP 3 RANKED P0 VERIFICATIONS)', MARGIN, doc.y);
  doc.y += 5;

  const p0Rows: { cells: string[]; lastColor: string }[] = deal.blockers
    .slice(0, 3)
    .map((b, idx) => ({
      cells: [`#${idx + 1} (${b.id})`, b.title, b.impactOnUnderwriting, b.severity],
      lastColor: b.severity === 'Critical' ? COL_CRIMSON : COL_WATCH,
    }));

  const p0Fallbacks: { id: string; evidence: string; consequence: string; gate: string }[] = [
    {
      id: 'P0-SAFETY',
      evidence: 'Tier 1 Micro-Location, Crime & Guest-Safety Gate (§7A/§7B)',
      consequence:
        'Exact-address police/municipal portal search NOT VERIFIED; blocks FINAL approval, Final MAO, and hard deposit.',
      gate: 'Blocking',
    },
    {
      id: 'P0-PNL',
      evidence: 'Audited Monthly General Ledger & Bank Ties (FY2022–T12)',
      consequence:
        'Seller-derived bridge is NOT normalized NOI; historical revenue, departmental ratios, and tax resets unverified.',
      gate: 'P0 Gate',
    },
    {
      id: 'P0-PIP',
      evidence: 'Third-Party PCA / GMP PIP Quote & Brand Relicensing Letter',
      consequence:
        'Total CapEx, MEP/life-safety exposure, room downtime, and franchise transfer eligibility remain unverified.',
      gate: 'P0 Gate',
    },
  ];

  for (const fb of p0Fallbacks) {
    if (p0Rows.length >= 3) break;
    p0Rows.push({
      cells: [`#${p0Rows.length + 1} (${fb.id})`, fb.evidence, fb.consequence, fb.gate],
      lastColor: COL_CRIMSON,
    });
  }

  drawTable(
    doc,
    [
      { label: 'Rank / ID', width: 72 },
      { label: 'Missing / Unverified Evidence', width: 172 },
      { label: 'Investment Decision Consequence', width: 226 },
      { label: 'Gate', width: 58 },
    ],
    p0Rows
  );

  // NEXT DECISION Box
  const nextActionText =
    deal.nextActions[0] ?? 'Issue P0 diligence request list for audited T12 P&L, PIP scope, and safety review.';
  doc.font(FONT_SANS).fontSize(9.0);
  const ndTextH = doc.heightOfString(nextActionText, { width: CONTENT_W - 22 });
  const ndBoxH = Math.max(44, Math.ceil(ndTextH) + 28);
  const ndY = doc.y;
  doc.save();
  doc.rect(MARGIN, ndY, CONTENT_W, ndBoxH).fill(COL_CARD_BG);
  doc.rect(MARGIN, ndY, 4, ndBoxH).fill(COL_TEAL);
  doc
    .font(FONT_SANS_BOLD)
    .fontSize(9.0)
    .fillColor(COL_NAVY)
    .text('NEXT DECISION — ACTIONABLE DILIGENCE REQUEST', MARGIN + 12, ndY + 7);
  doc
    .font(FONT_SANS)
    .fontSize(9.0)
    .fillColor(COL_TEXT)
    .text(nextActionText, MARGIN + 12, ndY + 21, { width: CONTENT_W - 22 });
  doc.restore();
  doc.y = ndY + ndBoxH + 8;

  // Compact Page 1 Source / Status Footnote (>=8pt per §21)
  doc
    .font(FONT_SANS)
    .fontSize(8.0)
    .fillColor(COL_MUTED)
    .text(
      `Sources: ${deal.sourceRegister.length} tracked file(s) (${deal.evidenceStatus}; 0 verified) · Tier 1 Safety Gate: NOT VERIFIED · ${masterProvenance.complianceStatus} · All figures synthetic demonstration inputs.`,
      MARGIN,
      doc.y,
      { width: CONTENT_W }
    );

  // =========================================================================
  // NUMBERED SECTIONS START ON PAGE 2 (ES: 1–10 | Full IC: 1–19)
  // =========================================================================
  doc.addPage();
  doc.y = MARGIN + 16;

  for (const sec of sections) {
    ensureSpace(doc, 92);
    doc.outline.addItem(`${sec.number}. ${sec.title}`);

    doc
      .font(FONT_SANS_BOLD)
      .fontSize(11)
      .fillColor(COL_NAVY)
      .text(`${sec.number}. ${sec.title}`, MARGIN, doc.y, { width: CONTENT_W });
    doc
      .moveTo(MARGIN, doc.y + 2)
      .lineTo(MARGIN + CONTENT_W, doc.y + 2)
      .strokeColor(COL_BORDER)
      .lineWidth(0.75)
      .stroke();
    doc.y += 9;

    if (sec.keyMetrics && sec.keyMetrics.length > 0) {
      const colW = Math.floor(CONTENT_W / sec.keyMetrics.length);
      const rem = CONTENT_W - colW * sec.keyMetrics.length;
      drawTable(
        doc,
        sec.keyMetrics.map((m, i) => ({
          label: m.label,
          width: i === sec.keyMetrics!.length - 1 ? colW + rem : colW,
        })),
        [{ bold: true, cells: sec.keyMetrics.map((m) => m.value) }]
      );
    }

    for (const p of sec.paragraphs) {
      ensureSpace(doc, 36);
      doc
        .font(FONT_SANS)
        .fontSize(10.2)
        .fillColor(COL_TEXT)
        .text(p, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2.2 });
      doc.y += 7;
    }

    if (sec.bullets && sec.bullets.length > 0) {
      for (const b of sec.bullets) {
        ensureSpace(doc, 24);
        doc
          .font(FONT_SANS)
          .fontSize(9.8)
          .fillColor(COL_TEXT)
          .text(`•  ${b}`, MARGIN + 10, doc.y, { width: CONTENT_W - 10, lineGap: 1.8 });
        doc.y += 4;
      }
      doc.y += 5;
    }

    // Operating Table + Revenue/NOI Chart immediately beside Financial Picture (ES §3 / Full IC §6)
    if (((isEs && sec.number === 3) || (!isEs && sec.number === 6)) && historical.length > 0) {
      const labelW = 168;
      const colW = Math.floor((CONTENT_W - labelW) / historical.length);
      const rem = CONTENT_W - labelW - colW * historical.length;
      drawTable(
        doc,
        [
          { label: 'USALI Line Item', width: labelW },
          ...historical.map((h, i) => ({
            label: h.period,
            width: i === historical.length - 1 ? colW + rem : colW,
            align: 'right' as const,
          })),
        ],
        [
          { cells: ['Occupancy (%)', ...historical.map((h) => formatPercent(h.occupancyPct))] },
          { cells: ['ADR ($)', ...historical.map((h) => formatCurrencyExact(h.adr))] },
          { bold: true, cells: ['RevPAR ($)', ...historical.map((h) => formatCurrencyExact(h.revPAR))] },
          { cells: ['Rooms Revenue', ...historical.map((h) => formatCurrency(h.roomsRevenue))] },
          { cells: ['F&B & Other', ...historical.map((h) => formatCurrency(h.fbRevenue + h.otherRevenue))] },
          { bold: true, cells: ['Total Revenue', ...historical.map((h) => formatCurrency(h.totalRevenue))] },
          {
            cells: [
              'Dept. & Undist. Exp.',
              ...historical.map((h) =>
                h.departmentalExpenses !== null && h.undistributedExpenses !== null
                  ? `(${formatCurrency(h.departmentalExpenses + h.undistributedExpenses)})`
                  : 'N/A'
              ),
            ],
          },
          { bold: true, cells: ['Gross Operating Profit', ...historical.map((h) => formatCurrency(h.gop))] },
          {
            cells: [
              'Mgmt, Franchise, Tax & Ins.',
              ...historical.map((h) =>
                h.managementFee !== null && h.franchiseFee !== null
                  ? `(${formatCurrency(h.managementFee + h.franchiseFee + h.propertyTaxesAndInsurance)})`
                  : 'N/A'
              ),
            ],
          },
          {
            bold: true,
            cells: [
              'NOI Pre-FF&E (Unverified)',
              ...historical.map((h) =>
                h.noi !== null && h.ffeReserve !== null
                  ? formatCurrency(h.noi + h.ffeReserve)
                  : 'N/A'
              ),
            ],
          },
          {
            cells: [
              'FF&E Reserve (4.0%)',
              ...historical.map((h) =>
                h.ffeReserve !== null ? `(${formatCurrency(h.ffeReserve)})` : 'N/A'
              ),
            ],
          },
          { bold: true, bg: COL_CARD_BG, cells: ['USALI NOI (Post-FF&E)', ...historical.map((h) => formatCurrency(h.noi))] },
          { cells: ['NOI Margin (%)', ...historical.map((h) => formatPercent(h.noiMarginPct))] },
        ]
      );
      drawRevenueNoiVectorChart(doc, snapshot);
    }

    // Waterfall Chart immediately beside Valuation / Normalization (ES §4 / Full IC §7)
    if ((isEs && sec.number === 4) || (!isEs && sec.number === 7)) {
      drawNoiWaterfallVectorChart(doc, snapshot);
    }

    // Operating Scenarios Comparison Table inside Full IC §8 (Master §31 P2)
    if (!isEs && sec.number === 8) {
      const ds = computeScenarioProjection(deal, {
        occupancyDeltaPctPts: -5,
        adrDeltaPct: -6,
        expenseDeltaPctPts: 2.5,
        targetCapRatePct: deal.targetCapRatePct + 0.75,
        pipExposureOverride: summary.totalPipExposure,
        closingCostsPct: 1.5,
      });
      const bc = computeScenarioProjection(deal, {
        occupancyDeltaPctPts: 0,
        adrDeltaPct: 0,
        expenseDeltaPctPts: 0,
        targetCapRatePct: deal.targetCapRatePct,
        pipExposureOverride: summary.totalPipExposure,
        closingCostsPct: 1.5,
      });
      const st = computeScenarioProjection(deal, {
        occupancyDeltaPctPts: 4,
        adrDeltaPct: 6,
        expenseDeltaPctPts: -1.5,
        targetCapRatePct: Math.max(6, deal.targetCapRatePct - 0.5),
        pipExposureOverride: summary.totalPipExposure,
        closingCostsPct: 1.5,
      });
      drawTable(
        doc,
        [
          { label: 'Scenario (ASSUMPTION)', width: 120 },
          { label: 'Occ / ADR', width: 92, align: 'right' },
          { label: 'Total Rev', width: 82, align: 'right' },
          { label: 'USALI NOI', width: 82, align: 'right' },
          { label: 'Cap', width: 52, align: 'right' },
          { label: 'Implied Net', width: 100, align: 'right' },
        ],
        [
          {
            cells: [
              'Downside (-5pp / -6%)',
              `${formatPercent(ds.proFormaOccupancyPct)} / ${formatCurrencyExact(ds.proFormaAdr)}`,
              formatCurrency(ds.proFormaTotalRevenue),
              formatCurrency(ds.proFormaNoi),
              formatPercent(deal.targetCapRatePct + 0.75, 2),
              formatCurrency(ds.impliedNetMaoAfterPipAndClosing),
            ],
            lastColor: COL_CRIMSON,
          },
          {
            bold: true,
            cells: [
              'Base Case (T12 Driver)',
              `${formatPercent(bc.proFormaOccupancyPct)} / ${formatCurrencyExact(bc.proFormaAdr)}`,
              formatCurrency(bc.proFormaTotalRevenue),
              formatCurrency(bc.proFormaNoi),
              formatPercent(deal.targetCapRatePct, 2),
              formatCurrency(bc.impliedNetMaoAfterPipAndClosing),
            ],
          },
          {
            cells: [
              'Stabilized (+4pp / +6%)',
              `${formatPercent(st.proFormaOccupancyPct)} / ${formatCurrencyExact(st.proFormaAdr)}`,
              formatCurrency(st.proFormaTotalRevenue),
              formatCurrency(st.proFormaNoi),
              formatPercent(Math.max(6, deal.targetCapRatePct - 0.5), 2),
              formatCurrency(st.impliedNetMaoAfterPipAndClosing),
            ],
            lastColor: COL_TEAL,
          },
        ]
      );
    }

    // PIP Table immediately beside Physical Condition (ES §6 / Full IC §4)
    if (((isEs && sec.number === 6) || (!isEs && sec.number === 4)) && deal.pipItems.length > 0) {
      drawTable(
        doc,
        [
          { label: 'PIP Category', width: 150 },
          { label: 'Scope Description', width: 218 },
          { label: 'Timing', width: 85 },
          { label: 'Estimate', width: 75, align: 'right' },
        ],
        [
          ...deal.pipItems.map((p) => ({
            cells: [p.category, p.scopeDescription, p.timing, formatCurrency(p.estimatedCost)],
          })),
          {
            bold: true,
            bg: COL_CARD_BG,
            cells: ['Total PIP / Capex', `${deal.pipItems.length} scoped items`, 'Cumulative', formatCurrency(summary.totalPipExposure)],
          },
        ]
      );
    }

    // Source Register Table in Full IC §18
    if (!isEs && sec.number === 18 && deal.sourceRegister.length > 0) {
      drawTable(
        doc,
        [
          { label: 'ID', width: 68 },
          { label: 'Source Document', width: 210 },
          { label: 'Period', width: 105 },
          { label: 'Verification', width: 145 },
        ],
        deal.sourceRegister.map((d) => ({
          cells: [d.id, d.title, d.periodCovered, d.status],
          lastColor:
            d.status === 'Missing' || d.status === 'Conflicted'
              ? COL_CRIMSON
              : d.status === 'Pending Third-Party' || d.status === 'Received — Unverified'
                ? COL_WATCH
                : COL_NAVY,
        }))
      );
    }

    doc.y += 6;
  }

  // Pass 2: Running Header (pages 2+) and Footer (all pages, >=8pt per §21)
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    const savedBottom = doc.page.margins.bottom;
    const savedTop = doc.page.margins.top;
    doc.page.margins.bottom = 0;
    doc.page.margins.top = 0;
    if (i > 0) {
      doc
        .font(FONT_MONO)
        .fontSize(8.0)
        .fillColor(COL_MUTED)
        .text(
          `HOTEL WORK DEV · ${deal.id} · ${isEs ? 'EXECUTIVE SUMMARY' : 'FULL IC MEMO'} · ${masterProvenance.complianceStatus}`,
          MARGIN,
          18,
          { width: CONTENT_W, align: 'right', lineBreak: false }
        );
    }
    doc
      .font(FONT_SANS)
      .fontSize(8.0)
      .fillColor(COL_MUTED)
      .text(
        `Snapshot ${snapshot.snapshotId} · ${masterProvenance.complianceStatus} · Page ${i + 1} of ${totalPages}`,
        MARGIN,
        PAGE_H - 30,
        { width: CONTENT_W, align: 'center', lineBreak: false }
      );
    doc.page.margins.bottom = savedBottom;
    doc.page.margins.top = savedTop;
  }

  doc.end();

  const buffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  return { buffer, pageCount: totalPages };
}
