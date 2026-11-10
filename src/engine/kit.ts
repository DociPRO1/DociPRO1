/**
 * Shared visual components. These keep every plate on the same grid, and the
 * same layer marks appear in the hero, the expertise stack and the ecosystem
 * matrix, so the iconography means the same thing everywhere.
 */
import { r2, type SvgDoc } from './svg.ts';
import type { TextStyle } from './type.ts';
import type { Theme } from './theme.ts';

export type LayerId = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

/** Mono label style used for every piece of metadata. */
export const label = (fill: string, size = 12, font: TextStyle['font'] = 'mono400'): TextStyle => ({
  font,
  size,
  tracking: 0.06,
  caps: true,
  fill,
});

/**
 * Section header: index, title, hairline, right-aligned metadata.
 * Returns the y coordinate where content should start.
 */
export function sectionHeader(doc: SvgDoc, index: string, title: string, meta: string, y = 0): number {
  const t = doc.theme;
  const compact = doc.layout === 'compact';
  const size = compact ? 13 : 13;
  const base = y + 16;
  const idx = label(t.accent, size, 'mono500');
  const ttl = label(t.t1, size, 'mono500');
  const idxW = doc.type.measure(index, idx);
  doc.add(doc.type.text(index, 0, base, idx));
  doc.add(doc.type.text(title, idxW + 14, base, { ...ttl, tracking: 0.12 }));
  const titleEnd = idxW + 14 + doc.type.measure(title, { ...ttl, tracking: 0.12 });
  let lineEnd = doc.width;
  if (meta && !compact) {
    const m = label(t.t3, size);
    const mw = doc.type.measure(meta, m);
    doc.add(doc.type.text(meta, doc.width, base, { ...m, anchor: 'end' }));
    lineEnd = doc.width - mw - 16;
  }
  const lx = titleEnd + 16;
  if (lineEnd > lx) {
    doc.add(`<path d="M${r2(lx)} ${base - 4.5}H${r2(lineEnd)}" stroke="${t.line2}" class="hdr-rule"/>`);
  }
  if (compact && meta) {
    doc.add(doc.type.text(meta, 0, base + 24, label(t.t3, 12)));
    return base + 52;
  }
  return base + 40;
}

/** Hairline header rule draws in from the left on load. */
export function headerMotion(doc: SvgDoc) {
  doc.style(
    `.hdr-rule{stroke-dasharray:1200;stroke-dashoffset:0;animation:hdr 1.4s cubic-bezier(.16,.84,.24,1) .2s backwards}`,
    `@keyframes hdr{from{stroke-dashoffset:1200}}`,
  );
}

/**
 * Layer marks. Each layer of the stack has one primitive. They are drawn on
 * a 24×24 box centred at (cx, cy), stroke only, so they read as technical
 * symbols, not icons.
 */
export function layerMark(
  id: LayerId,
  cx: number,
  cy: number,
  stroke: string,
  s = 1,
  extra = '',
  bg = 'none',
): string {
  const k = (n: number) => r2(n * s);
  const g = (inner: string) =>
    `<g transform="translate(${r2(cx)} ${r2(cy)})" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" ${extra}>${inner}</g>`;
  switch (id) {
    case 'L0': {
      // Silicon: die with pins.
      const b = k(7);
      const p = k(10.5);
      const pins = [-3.5, 0, 3.5]
        .map((o) => {
          const q = k(o);
          return `M${-p} ${q}H${-b}M${b} ${q}H${p}M${q} ${-p}V${-b}M${q} ${b}V${p}`;
        })
        .join('');
      return g(`<rect x="${-b}" y="${-b}" width="${2 * b}" height="${2 * b}" rx="${k(1)}"/><path d="${pins}"/>`);
    }
    case 'L1': {
      // Edge: gateway diamond with a node.
      const d = k(9);
      return g(`<path d="M0 ${-d}L${d} 0L0 ${d}L${-d} 0Z"/><circle r="${k(2)}" fill="${stroke}" stroke="none"/>`);
    }
    case 'L2': {
      // Infrastructure: dashed region boundary with a provisioned unit.
      return g(
        `<rect x="${k(-10.5)}" y="${k(-8)}" width="${k(21)}" height="${k(16)}" rx="${k(3)}" stroke-dasharray="${k(3)} ${k(2.2)}"/><rect x="${k(-4)}" y="${k(-3)}" width="${k(8)}" height="${k(6)}" rx="${k(1)}"/>`,
      );
    }
    case 'L3': {
      // Distributed: three replicas in quorum.
      const pts: [number, number][] = [
        [0, -7],
        [-7.5, 5.5],
        [7.5, 5.5],
      ];
      const lines = `M${k(0)} ${k(-7)}L${k(-7.5)} ${k(5.5)}L${k(7.5)} ${k(5.5)}Z`;
      return g(
        `<path d="${lines}" stroke-opacity=".5"/>` +
          pts.map(([x, y]) => `<circle cx="${k(x)}" cy="${k(y)}" r="${k(3)}" fill="${bg}"/>`).join(''),
      );
    }
    case 'L4': {
      // Services: hexagonal process boundary with an endpoint.
      const r = 9.5;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        return `${k(Math.cos(a) * r)} ${k(Math.sin(a) * r)}`;
      });
      return g(`<path d="M${pts.join('L')}Z"/><circle r="${k(2.2)}" fill="${stroke}" stroke="none"/>`);
    }
    case 'L5': {
      // Interface: viewport with title bar.
      return g(
        `<rect x="${k(-10)}" y="${k(-8)}" width="${k(20)}" height="${k(16)}" rx="${k(2)}"/><path d="M${k(-10)} ${k(-3)}H${k(10)}"/><path d="M${k(-6.5)} ${k(-5.5)}h.01M${k(-3.5)} ${k(-5.5)}h.01" stroke-linecap="round" stroke-width="2"/>`,
      );
    }
  }
}

/** Technical-drawing ruler: minor ticks every `step`, major every 5. */
export function ruler(x0: number, x1: number, y: number, t: Theme, step = 10): string {
  let d = '';
  let i = 0;
  for (let x = x0; x <= x1 + 0.01; x += step, i++) {
    const major = i % 5 === 0;
    d += `M${r2(x)} ${y}v${major ? 7 : 3}`;
  }
  return `<path d="${d}" stroke="${t.t4}" stroke-width="1"/>`;
}

/** Small crosshair registration mark, used at plate corners. */
export function regMark(x: number, y: number, t: Theme, s = 5): string {
  return `<path d="M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}" stroke="${t.t3}" stroke-width="1"/>`;
}

/** Polyline length, used for exact stroke-dash animation without pathLength. */
export function polyLength(pts: [number, number][]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  }
  return L;
}

export const polyPath = (pts: [number, number][]) =>
  'M' + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L');

/** Distance along a polyline at which it first reaches a given x (monotonic routes). */
export function lengthAtX(pts: [number, number][], x: number): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i]!;
    const seg = Math.hypot(bx - ax, by - ay);
    if ((x >= ax && x <= bx) || (x <= ax && x >= bx)) {
      const f = bx === ax ? 0 : (x - ax) / (bx - ax);
      return L + seg * f;
    }
    L += seg;
  }
  return L;
}

/** Same as lengthAtX for vertical routes. */
export function lengthAtY(pts: [number, number][], y: number): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i]!;
    const seg = Math.hypot(bx - ax, by - ay);
    if ((y >= ay && y <= by) || (y <= ay && y >= by)) {
      const f = by === ay ? 0 : (y - ay) / (by - ay);
      return L + seg * f;
    }
    L += seg;
  }
  return L;
}

/** A run of text with its own colour, for mixed-tone paragraphs. */
export interface Seg {
  text: string;
  fill: string;
}

/** Word-wraps mixed-colour segments as one paragraph. */
export function richWrap(doc: SvgDoc, segs: Seg[], style: TextStyle, maxW: number): Seg[][] {
  const words = segs.flatMap((s) => s.text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, fill: s.fill })));
  const lines: Seg[][] = [];
  let line: Seg[] = [];
  const width = (ws: Seg[]) => doc.type.measure(ws.map((w) => w.text).join(' '), style);
  for (const w of words) {
    if (line.length && width([...line, w]) > maxW) {
      lines.push(line);
      line = [w];
    } else line.push(w);
  }
  if (line.length) lines.push(line);
  return lines;
}

/** Renders one wrapped line produced by richWrap. */
export function richLine(doc: SvgDoc, words: Seg[], x: number, y: number, style: TextStyle): string {
  const runs: Seg[] = [];
  for (const w of words) {
    const last = runs.at(-1);
    if (last && last.fill === w.fill) last.text += ` ${w.text}`;
    else runs.push({ ...w });
  }
  let cx = x;
  return runs
    .map((r) => {
      const out = doc.type.text(r.text, cx, y, { ...style, fill: r.fill });
      cx += doc.type.measure(`${r.text} `, style);
      return out;
    })
    .join('');
}
