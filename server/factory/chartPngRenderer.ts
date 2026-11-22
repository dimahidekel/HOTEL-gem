import zlib from 'node:zlib';
import { DealSummaryMetrics, formatCurrency } from '../../src/utils/financials.ts';

type Rgba = [number, number, number, number];

const FONT_5X7: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

class BitmapCanvas {
  readonly width: number;
  readonly height: number;
  private buf: Uint8Array;

  constructor(width: number, height: number, bg: Rgba = [255, 255, 255, 255]) {
    this.width = width;
    this.height = height;
    this.buf = new Uint8Array(width * height * 4);
    this.fillRect(0, 0, width, height, bg);
  }

  private setPixel(x: number, y: number, color: Rgba) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    const idx = (iy * this.width + ix) * 4;
    this.buf[idx] = color[0];
    this.buf[idx + 1] = color[1];
    this.buf[idx + 2] = color[2];
    this.buf[idx + 3] = color[3];
  }

  fillRect(x: number, y: number, w: number, h: number, color: Rgba) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x + w));
    const y1 = Math.min(this.height, Math.round(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const idx = (py * this.width + px) * 4;
        this.buf[idx] = color[0];
        this.buf[idx + 1] = color[1];
        this.buf[idx + 2] = color[2];
        this.buf[idx + 3] = color[3];
      }
    }
  }

  strokeRect(x: number, y: number, w: number, h: number, color: Rgba) {
    this.fillRect(x, y, w, 1, color);
    this.fillRect(x, y + h - 1, w, 1, color);
    this.fillRect(x, y, 1, h, color);
    this.fillRect(x + w - 1, y, 1, h, color);
  }

  drawText(
    text: string,
    x: number,
    y: number,
    color: Rgba,
    scale = 2,
    align: 'left' | 'center' | 'right' = 'left'
  ) {
    const upper = text.toUpperCase();
    const charW = 6 * scale;
    const totalW = upper.length * charW - scale;
    let startX = x;
    if (align === 'center') startX = x - totalW / 2;
    if (align === 'right') startX = x - totalW;

    for (let i = 0; i < upper.length; i++) {
      const glyph = FONT_5X7[upper[i]] ?? FONT_5X7[' '];
      const gx = startX + i * charW;
      for (let row = 0; row < 7; row++) {
        const line = glyph[row];
        for (let col = 0; col < 5; col++) {
          if (line[col] === '1') {
            this.fillRect(gx + col * scale, y + row * scale, scale, scale, color);
          }
        }
      }
    }
  }

  toPng(): Buffer {
    const stride = this.width * 4 + 1;
    const raw = Buffer.alloc(stride * this.height);
    for (let y = 0; y < this.height; y++) {
      raw[y * stride] = 0; // PNG filter type 0
      const rowSlice = this.buf.subarray(y * this.width * 4, (y + 1) * this.width * 4);
      raw.set(rowSlice, y * stride + 1);
    }

    const compressed = zlib.deflateSync(raw, { level: 6 });

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', compressed),
      pngChunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const NAVY: Rgba = [15, 41, 74, 255];
const TEAL: Rgba = [13, 115, 119, 255];
const CRIMSON: Rgba = [185, 28, 28, 255];
const SLATE_DARK: Rgba = [30, 41, 59, 255];
const SLATE_MID: Rgba = [100, 116, 139, 255];
const GRID_LIGHT: Rgba = [226, 232, 240, 255];
const AXIS_MID: Rgba = [148, 163, 184, 255];
const SUBTOTAL_BLUE: Rgba = [30, 58, 95, 255];

export function renderRevenueNoiChartPng(summary: DealSummaryMetrics): Buffer {
  const width = 960;
  const height = 400;
  const canvas = new BitmapCanvas(width, height, [255, 255, 255, 255]);
  canvas.strokeRect(0, 0, width, height, GRID_LIGHT);

  canvas.drawText('HISTORICAL REVENUE VS. USALI NOI', 28, 20, NAVY, 2, 'left');

  // Legend
  canvas.fillRect(580, 22, 14, 14, NAVY);
  canvas.drawText('TOTAL REV', 602, 22, SLATE_DARK, 2, 'left');
  canvas.fillRect(745, 22, 14, 14, TEAL);
  canvas.drawText('NOI', 767, 22, SLATE_DARK, 2, 'left');

  const valid = summary.historical.filter((d) => d.totalRevenue !== null && d.noi !== null);
  if (valid.length === 0) {
    canvas.drawText('NO HISTORICAL OPERATING SERIES AVAILABLE', width / 2, 190, SLATE_MID, 2, 'center');
    return canvas.toPng();
  }

  const padLeft = 115;
  const padRight = 32;
  const padTop = 64;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxRev = Math.max(...valid.map((d) => d.totalRevenue ?? 0), 1) * 1.15;
  const minNoi = Math.min(...valid.map((d) => d.noi ?? 0), 0);
  const minVal = minNoi < 0 ? minNoi * 1.25 : 0;
  const range = maxRev - minVal || 1;
  const yPos = (v: number) => padTop + ((maxRev - v) / range) * plotH;
  const zeroY = yPos(0);

  const ticks = [maxRev, maxRev * 0.5, 0, ...(minVal < 0 ? [minVal] : [])];
  for (const t of ticks) {
    const y = Math.round(yPos(t));
    canvas.fillRect(padLeft, y, plotW, t === 0 ? 2 : 1, t === 0 ? AXIS_MID : GRID_LIGHT);
    canvas.drawText(formatCurrency(t, true), padLeft - 10, y - 7, SLATE_MID, 2, 'right');
  }

  const groupW = plotW / valid.length;
  const barW = Math.min(48, Math.floor(groupW * 0.28));

  valid.forEach((item, idx) => {
    const rev = item.totalRevenue ?? 0;
    const noi = item.noi ?? 0;
    const cx = padLeft + groupW * idx + groupW / 2;

    const revTop = yPos(Math.max(0, rev));
    const revH = Math.max(2, zeroY - revTop);
    canvas.fillRect(cx - barW - 4, revTop, barW, revH, NAVY);
    canvas.drawText(formatCurrency(rev, true), cx - barW / 2 - 4, revTop - 18, NAVY, 1.5, 'center');

    const noiTop = noi >= 0 ? yPos(noi) : zeroY;
    const noiH = Math.max(3, Math.abs(yPos(noi) - zeroY));
    const noiColor = noi >= 0 ? TEAL : CRIMSON;
    canvas.fillRect(cx + 4, noiTop, barW, noiH, noiColor);
    const noiLabelY = noi >= 0 ? noiTop - 18 : noiTop + noiH + 6;
    canvas.drawText(formatCurrency(noi, true), cx + barW / 2 + 4, noiLabelY, noiColor, 1.5, 'center');

    const shortLabel = item.period.replace(' (Sep 2026)', '').replace(' (Intake)', '');
    canvas.drawText(shortLabel, cx, height - 34, SLATE_DARK, 2, 'center');
  });

  return canvas.toPng();
}

export function renderNoiWaterfallChartPng(summary: DealSummaryMetrics): Buffer {
  const width = 960;
  const height = 400;
  const canvas = new BitmapCanvas(width, height, [255, 255, 255, 255]);
  canvas.strokeRect(0, 0, width, height, GRID_LIGHT);

  const t12 = summary.t12;
  canvas.drawText(`T12 USALI NOI WATERFALL BRIDGE (${t12?.period ?? 'T12'})`, 28, 20, NAVY, 2, 'left');

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
    canvas.drawText('INSUFFICIENT T12 DATA FOR WATERFALL', width / 2, 190, SLATE_MID, 2, 'center');
    return canvas.toPng();
  }

  const fixedAndFees = t12.managementFee + t12.franchiseFee + t12.propertyTaxesAndInsurance;
  const afterDept = t12.totalRevenue - t12.departmentalExpenses;
  const afterFixed = t12.gop - fixedAndFees;

  const steps = [
    { label: 'TOT REV', start: 0, end: t12.totalRevenue, val: t12.totalRevenue, color: NAVY },
    { label: 'DEPT', start: afterDept, end: t12.totalRevenue, val: -t12.departmentalExpenses, color: SLATE_MID },
    { label: 'UNDIST', start: t12.gop, end: afterDept, val: -t12.undistributedExpenses, color: SLATE_MID },
    { label: 'GOP', start: 0, end: t12.gop, val: t12.gop, color: SUBTOTAL_BLUE },
    { label: 'FEES+TAX', start: afterFixed, end: t12.gop, val: -fixedAndFees, color: SLATE_MID },
    { label: 'FFE 4%', start: t12.noi, end: afterFixed, val: -t12.ffeReserve, color: SLATE_MID },
    {
      label: 'T12 NOI',
      start: t12.noi >= 0 ? 0 : t12.noi,
      end: t12.noi >= 0 ? t12.noi : 0,
      val: t12.noi,
      color: t12.noi >= 0 ? TEAL : CRIMSON,
    },
  ];

  const allVals = steps.flatMap((s) => [s.start, s.end, 0]);
  const maxVal = Math.max(...allVals) * 1.15;
  const minVal = Math.min(...allVals) < 0 ? Math.min(...allVals) * 1.25 : 0;
  const range = maxVal - minVal || 1;

  const padLeft = 115;
  const padRight = 28;
  const padTop = 64;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const yPos = (v: number) => padTop + ((maxVal - v) / range) * plotH;
  const zeroY = Math.round(yPos(0));

  canvas.fillRect(padLeft, zeroY, plotW, 2, AXIS_MID);
  canvas.drawText('$0', padLeft - 10, zeroY - 7, SLATE_MID, 2, 'right');
  const topGridY = Math.round(yPos(maxVal / 1.15));
  canvas.fillRect(padLeft, topGridY, plotW, 1, GRID_LIGHT);
  canvas.drawText(formatCurrency(maxVal / 1.15, true), padLeft - 10, topGridY - 7, SLATE_MID, 2, 'right');

  const colW = plotW / steps.length;
  const barW = Math.min(64, Math.floor(colW * 0.62));

  steps.forEach((s, idx) => {
    const cx = padLeft + idx * colW + colW / 2;
    const topVal = Math.max(s.start, s.end);
    const botVal = Math.min(s.start, s.end);
    const yTop = yPos(topVal);
    const yBot = yPos(botVal);
    const h = Math.max(3, yBot - yTop);
    canvas.fillRect(cx - barW / 2, yTop, barW, h, s.color);
    const labelY = s.val < 0 && s.label === 'T12 NOI' ? yBot + 6 : yTop - 18;
    canvas.drawText(formatCurrency(s.val, true), cx, labelY, s.color, 1.5, 'center');
    canvas.drawText(s.label, cx, height - 34, SLATE_DARK, 1.5, 'center');
  });

  return canvas.toPng();
}
