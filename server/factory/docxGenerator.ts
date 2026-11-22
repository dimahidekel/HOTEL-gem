import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { DocumentType, FrozenUnderwritingSnapshot } from '../../src/types/factory.ts';
import {
  formatCapRate,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../../src/utils/financials.ts';
import {
  renderNoiWaterfallChartPng,
  renderRevenueNoiChartPng,
} from './chartPngRenderer.ts';

// Master §24 / Detroit UX v3 colors
const NAVY = '183B53';
const TEAL = '257C83';
const CARD_BG = 'F1F5F6';
const SLATE_DARK = '1E293B';
const SLATE_MUTED = '52606D';
const BORDER_HEX = 'CBD5E1';
const BG_SUBTLE = 'F8FAFC';
const BG_WARN = 'FDF2F2';
const CRIMSON = 'AB382B';

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
};

function makeCell(
  text: string,
  opts: {
    bold?: boolean;
    color?: string;
    bg?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    mono?: boolean;
    size?: number;
    widthPct?: number;
  } = {}
): TableCell {
  return new TableCell({
    width: opts.widthPct
      ? { size: opts.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    shading: opts.bg ? { type: ShadingType.CLEAR, fill: opts.bg } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? false,
            color: opts.color ?? SLATE_DARK,
            font: opts.mono ? 'Consolas' : 'Calibri',
            size: opts.size ?? 19,
          }),
        ],
      }),
    ],
  });
}

function buildStyledTable(
  headers: { label: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; widthPct?: number }[],
  rows: { cells: string[]; bold?: boolean; highlightBg?: string; lastColColor?: string }[]
): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h) =>
      makeCell(h.label, {
        bold: true,
        color: 'FFFFFF',
        bg: NAVY,
        align: h.align ?? AlignmentType.LEFT,
        size: 18,
        widthPct: h.widthPct,
      })
    ),
  });

  const bodyRows = rows.map(
    (r, idx) =>
      new TableRow({
        cantSplit: true,
        children: r.cells.map((val, cIdx) => {
          const isNumericCol = headers[cIdx]?.align === AlignmentType.RIGHT;
          const isLast = cIdx === r.cells.length - 1;
          return makeCell(val, {
            bold: r.bold ?? false,
            bg: r.highlightBg ?? (idx % 2 === 1 ? BG_SUBTLE : undefined),
            align: headers[cIdx]?.align ?? AlignmentType.LEFT,
            mono: isNumericCol,
            color: isLast && r.lastColColor ? r.lastColColor : SLATE_DARK,
            size: 18,
            widthPct: headers[cIdx]?.widthPct,
          });
        }),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

export async function generateDocxArtifact(
  snapshot: FrozenUnderwritingSnapshot,
  docType: DocumentType
): Promise<{ buffer: Buffer; paragraphCount: number }> {
  const { deal, summary, masterProvenance } = snapshot;
  const { t12, historical } = summary;
  const isEs = docType === 'executive-summary';
  const sections = isEs ? snapshot.esSections : snapshot.icSections;
  const docTitle = isEs
    ? 'EXECUTIVE SUMMARY'
    : 'FULL INVESTMENT COMMITTEE MEMORANDUM';

  const capDisplay = formatCapRate(summary.indicativeCapRatePct, t12?.noi);
  const maoText = summary.finalMaoWithheld
    ? `WITHHELD (${summary.criticalBlockerCount + summary.highBlockerCount} blockers)`
    : formatCurrency(summary.indicativeNetMaoUnverified);

  const revNoiPng = renderRevenueNoiChartPng(summary);
  const waterfallPng = renderNoiWaterfallChartPng(summary);

  const children: (Paragraph | Table)[] = [];
  let paragraphCount = 0;
  const pushP = (p: Paragraph) => {
    paragraphCount += 1;
    children.push(p);
  };

  // Page 1 Header Identifier (Master §24)
  pushP(
    new Paragraph({
      spacing: { before: 20, after: 30 },
      children: [
        new TextRun({
          text: `HOTEL WORK / INVESTMENT DECISION SCREEN · ${docTitle}`,
          bold: true,
          color: TEAL,
          size: 18,
          font: 'Calibri',
        }),
      ],
    })
  );

  pushP(
    new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: `${masterProvenance.complianceStatus} | Master Revision: ${masterProvenance.masterRevision} | Snapshot: ${snapshot.snapshotId}`,
          color: SLATE_MUTED,
          size: 15,
          font: 'Consolas',
        }),
      ],
    })
  );

  pushP(
    new Paragraph({
      spacing: { before: 20, after: 30 },
      children: [
        new TextRun({
          text: `${deal.name} (${deal.id})`,
          bold: true,
          color: NAVY,
          size: 32,
          font: 'Calibri',
        }),
      ],
    })
  );

  pushP(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${deal.location} · ${deal.submarket} · ${deal.rooms} Keys · ${deal.brand} · ${deal.assetClass}`,
          color: SLATE_MUTED,
          size: 20,
          font: 'Calibri',
        }),
      ],
    })
  );

  // IC Decision Banner
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: summary.finalMaoWithheld ? BG_WARN : CARD_BG },
              margins: { top: 90, bottom: 90, left: 140, right: 140 },
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: `IC DECISION | ${deal.posture} · ${summary.finalMaoWithheld ? 'NOT FINAL / NO HARD DEPOSIT' : 'CONDITIONAL REVIEW'}`,
                      bold: true,
                      color: summary.finalMaoWithheld ? CRIMSON : NAVY,
                      size: 20,
                      font: 'Calibri',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 0 },
                  children: [
                    new TextRun({
                      text: deal.postureRationale,
                      color: SLATE_DARK,
                      size: 18,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Two Equal KPI Cards Side-by-Side (ASKING PRICE vs HISTORICAL OPERATING BRIDGE)
  children.push(
    buildStyledTable(
      [
        { label: 'ASKING PRICE', widthPct: 50 },
        { label: `HISTORICAL OPERATING BRIDGE (${t12?.period ?? 'T12'})`, widthPct: 50 },
      ],
      [
        {
          bold: true,
          highlightBg: CARD_BG,
          cells: [
            `${formatCurrency(deal.askingPrice)} (${deal.rooms} Keys · ${formatCurrency(summary.pricePerKey)}/key)`,
            `${formatCurrency(t12?.noi)} NOI · Rev ${formatCurrency(t12?.totalRevenue)} · NOT normalized NOI`,
          ],
        },
      ]
    )
  );

  // Horizontal State Bar
  children.push(
    buildStyledTable(
      [
        { label: 'FINAL MAO', widthPct: 33 },
        { label: 'CAPITAL / PIP EXPOSURE', widthPct: 34 },
        { label: 'GOING-IN CAP RATE', widthPct: 33 },
      ],
      [
        {
          bold: true,
          highlightBg: summary.finalMaoWithheld ? BG_WARN : CARD_BG,
          cells: [
            maoText,
            summary.totalPipExposure > 0
              ? `${formatCurrency(summary.totalPipExposure)} (${formatCurrency(summary.pipPerKey)}/key)`
              : 'UNPRICED',
            capDisplay,
          ],
          lastColColor: SLATE_DARK,
        },
      ]
    )
  );

  // WHAT BLOCKS THE INVESTMENT? (Top 3 Ranked P0)
  const top3Blockers = deal.blockers.slice(0, 3);
  if (top3Blockers.length > 0) {
    pushP(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: 'WHAT BLOCKS THE INVESTMENT? (TOP 3 RANKED P0 VERIFICATIONS)',
            bold: true,
            color: CRIMSON,
            size: 20,
          }),
        ],
      })
    );
    children.push(
      buildStyledTable(
        [
          { label: 'Rank / ID', widthPct: 14 },
          { label: 'Missing Evidence', widthPct: 32 },
          { label: 'Investment Decision Consequence', widthPct: 40 },
          { label: 'Severity', widthPct: 14 },
        ],
        top3Blockers.map((b, idx) => ({
          cells: [`#${idx + 1} (${b.id})`, b.title, b.impactOnUnderwriting, b.severity],
          lastColColor: b.severity === 'Critical' ? CRIMSON : SLATE_DARK,
        }))
      )
    );
  }

  pushP(
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({
          text: 'NEXT DECISION: ',
          bold: true,
          color: NAVY,
          size: 20,
        }),
        new TextRun({
          text: deal.nextActions[0] ?? 'Issue P0 diligence request list for audited financials, PIP, and safety review.',
          color: SLATE_DARK,
          size: 19,
        }),
      ],
    })
  );

  // Page Break before numbered sections
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Numbered Sections (1..10 ES, 1..19 Full IC)
  for (const sec of sections) {
    pushP(
      new Paragraph({
        spacing: { before: 220, after: 80 },
        keepNext: true,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER_HEX },
        },
        children: [
          new TextRun({
            text: `${sec.number}. ${sec.title}`,
            bold: true,
            color: NAVY,
            size: 24,
            font: 'Calibri',
          }),
        ],
      })
    );

    if (sec.keyMetrics && sec.keyMetrics.length > 0) {
      children.push(
        buildStyledTable(
          sec.keyMetrics.map((m) => ({
            label: m.label,
            widthPct: Math.floor(100 / sec.keyMetrics!.length),
          })),
          [{ bold: true, cells: sec.keyMetrics.map((m) => m.value) }]
        )
      );
    }

    for (const p of sec.paragraphs) {
      pushP(
        new Paragraph({
          spacing: { before: 70, after: 70 },
          children: [new TextRun({ text: p, color: SLATE_DARK, size: 20, font: 'Calibri' })],
        })
      );
    }

    if (sec.bullets && sec.bullets.length > 0) {
      for (const b of sec.bullets) {
        pushP(
          new Paragraph({
            spacing: { before: 30, after: 30 },
            indent: { left: 280 },
            children: [
              new TextRun({ text: '•  ', bold: true, color: TEAL, size: 20 }),
              new TextRun({ text: b, color: SLATE_DARK, size: 19, font: 'Calibri' }),
            ],
          })
        );
      }
    }

    const insertFinancialSchedule =
      (isEs && sec.number === 3) || (!isEs && sec.number === 6);
    if (insertFinancialSchedule && historical.length > 0) {
      pushP(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          keepNext: true,
          children: [
            new TextRun({
              text: 'USALI Historical & T12 Operating Summary Schedule',
              bold: true,
              color: TEAL,
              size: 19,
            }),
          ],
        })
      );

      children.push(
        buildStyledTable(
          [
            { label: 'Line Item', widthPct: 36 },
            ...historical.map((h) => ({
              label: h.period,
              align: AlignmentType.RIGHT,
              widthPct: Math.floor(64 / historical.length),
            })),
          ],
          [
            { cells: ['Occupancy (%)', ...historical.map((h) => formatPercent(h.occupancyPct))] },
            { cells: ['ADR ($)', ...historical.map((h) => formatCurrencyExact(h.adr))] },
            {
              bold: true,
              cells: ['RevPAR ($)', ...historical.map((h) => formatCurrencyExact(h.revPAR))],
            },
            { cells: ['Rooms Revenue', ...historical.map((h) => formatCurrency(h.roomsRevenue))] },
            { cells: ['F&B / Banquet Revenue', ...historical.map((h) => formatCurrency(h.fbRevenue))] },
            { cells: ['Other Operated', ...historical.map((h) => formatCurrency(h.otherRevenue))] },
            {
              bold: true,
              cells: ['Total Operating Revenue', ...historical.map((h) => formatCurrency(h.totalRevenue))],
            },
            {
              cells: [
                'Departmental Expenses',
                ...historical.map((h) => `(${formatCurrency(h.departmentalExpenses)})`),
              ],
            },
            {
              cells: [
                'Undistributed Expenses',
                ...historical.map((h) => `(${formatCurrency(h.undistributedExpenses)})`),
              ],
            },
            { bold: true, cells: ['Gross Operating Profit (GOP)', ...historical.map((h) => formatCurrency(h.gop))] },
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
              cells: [
                'FF&E Reserve (4.0%)',
                ...historical.map((h) => `(${formatCurrency(h.ffeReserve)})`),
              ],
            },
            {
              bold: true,
              highlightBg: CARD_BG,
              cells: ['USALI Net Operating Income (NOI)', ...historical.map((h) => formatCurrency(h.noi))],
            },
            { cells: ['NOI Margin (%)', ...historical.map((h) => formatPercent(h.noiMarginPct))] },
          ]
        )
      );

      pushP(
        new Paragraph({
          spacing: { before: 140, after: 80 },
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: 'png',
              data: revNoiPng,
              transformation: { width: 580, height: 242 },
            }),
          ],
        })
      );
    }

    const insertWaterfall =
      (isEs && sec.number === 4) || (!isEs && sec.number === 7);
    if (insertWaterfall) {
      pushP(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: 'png',
              data: waterfallPng,
              transformation: { width: 580, height: 242 },
            }),
          ],
        })
      );
    }

    if (((isEs && sec.number === 6) || (!isEs && sec.number === 4)) && deal.pipItems.length > 0) {
      children.push(
        buildStyledTable(
          [
            { label: 'Category', widthPct: 30 },
            { label: 'Scope', widthPct: 36 },
            { label: 'Timing', widthPct: 18 },
            { label: 'Estimate', align: AlignmentType.RIGHT, widthPct: 16 },
          ],
          [
            ...deal.pipItems.map((p) => ({
              cells: [p.category, p.scopeDescription, p.timing, formatCurrency(p.estimatedCost)],
            })),
            {
              bold: true,
              highlightBg: CARD_BG,
              cells: ['Total Identified PIP / Capex', `${deal.pipItems.length} workstreams`, 'Cumulative', formatCurrency(summary.totalPipExposure)],
            },
          ]
        )
      );
    }

    if (!isEs && sec.number === 18 && deal.sourceRegister.length > 0) {
      children.push(
        buildStyledTable(
          [
            { label: 'ID', widthPct: 12 },
            { label: 'Source Document', widthPct: 38 },
            { label: 'Period', widthPct: 18 },
            { label: 'Status', widthPct: 32 },
          ],
          deal.sourceRegister.map((d) => ({
            cells: [d.id, d.title, d.periodCovered, d.status],
            lastColColor: d.status === 'Missing' || d.status === 'Conflicted' ? CRIMSON : SLATE_DARK,
          }))
        )
      );
    }
  }

  const doc = new Document({
    creator: 'HOTEL WORK DEV — Document Factory',
    title: `${docTitle} — ${deal.name} (${deal.id})`,
    description: masterProvenance.disclaimer,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 760, bottom: 760, left: 760, right: 760 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `HOTEL WORK DEV · ${deal.id} · ${masterProvenance.complianceStatus}`,
                    color: SLATE_MUTED,
                    size: 15,
                    font: 'Consolas',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Snapshot ${snapshot.snapshotId} · Page `,
                    color: SLATE_MUTED,
                    size: 16,
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: SLATE_MUTED,
                    size: 16,
                  }),
                  new TextRun({
                    text: ' of ',
                    color: SLATE_MUTED,
                    size: 16,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    color: SLATE_MUTED,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return { buffer: Buffer.from(buffer), paragraphCount };
}
