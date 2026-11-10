/**
 * 04 · ACTIVITY: a signal capture of the last twelve months.
 *
 * Instead of the familiar heatmap, the contribution calendar is read like a
 * scope trace: weekly totals as a stepped waveform with a probe tracing it,
 * and every single day as a barcode strip on the same time axis. Readouts
 * along the top are computed from the same data at build time.
 */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, sectionHeader, headerMotion, polyLength, polyPath } from '../engine/kit.ts';
import { MONTHS } from '../data/stats.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';

const fmtN = (n: number) => n.toLocaleString('en-US');
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const md = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(8, 10)}`;

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function readouts(ctx: BuildContext) {
  const s = ctx.stats;
  const busiest = s.weekday.some((v) => v > 0) ? WEEKDAYS[s.weekday.indexOf(Math.max(...s.weekday))]! : '—';
  const has = s.days.length > 0;
  return [
    { k: 'Contributions', v: has ? fmtN(s.total) : '—', u: 'last 12 months' },
    { k: 'Active days', v: has ? fmtN(s.activeDays) : '—', u: `of ${s.days.length || 365}` },
    { k: 'Longest streak', v: has ? String(s.longestStreak) : '—', u: 'days' },
    { k: 'Current streak', v: has ? String(s.currentStreak) : '—', u: 'days' },
    { k: 'Peak week', v: s.peakWeek ? String(s.peakWeek.total) : '—', u: s.peakWeek ? `wk of ${md(s.peakWeek.start)}` : '' },
    { k: 'Busiest day', v: busiest, u: 'by volume' },
  ];
}

function render(ctx: BuildContext, target: RenderTarget, index: string): string {
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const s = ctx.stats;
  const doc = new SvgDoc({
    width: W,
    height: 500,
    title: 'GitHub activity, last 12 months',
    desc: readouts(ctx)
      .map((r) => `${r.k}: ${r.v} ${r.u}`)
      .join('. '),
    ...target,
  });
  const t = doc.theme;
  let y = sectionHeader(doc, index, 'Activity', `last 12 months  /  synced ${ctx.snapshot.updated}`);
  headerMotion(doc);

  // Readouts.
  const ro = readouts(ctx);
  const valStyle: TextStyle = { font: 'sans300', size: compact ? 34 : 42, tracking: -0.02, fill: t.t1 };
  if (compact) {
    const cw = W / 2;
    ro.forEach((r, i) => {
      const x = (i % 2) * cw;
      const ry = y + Math.floor(i / 2) * 92;
      doc.add(
        `<g class="ro${i}">` +
          doc.type.text(r.k, x, ry + 12, label(t.t3, 11)) +
          doc.type.text(r.v, x - 1, ry + 52, valStyle) +
          doc.type.text(r.u, x, ry + 72, label(t.t3, 10.5)) +
          `</g>`,
      );
      doc.style(`.ro${i}{animation:up .8s ${EASE.out} ${r2(0.2 + i * 0.07)}s backwards}`);
    });
    y += Math.ceil(ro.length / 2) * 92 + 8;
  } else {
    const cw = W / ro.length;
    ro.forEach((r, i) => {
      const x = i * cw + (i ? 18 : 0);
      if (i) doc.add(`<path d="M${r2(i * cw) + 0.5} ${y}V${y + 92}" stroke="${t.line}"/>`);
      doc.add(
        `<g class="ro${i}">` +
          doc.type.text(r.k, x, y + 12, label(t.t3, 11)) +
          doc.type.text(r.v, x - 1, y + 60, valStyle) +
          doc.type.text(r.u, x, y + 84, label(t.t3, 10.5)) +
          `</g>`,
      );
      doc.style(`.ro${i}{animation:up .8s ${EASE.out} ${r2(0.2 + i * 0.07)}s backwards}`);
    });
    y += 92 + 28;
  }

  // Waveform.
  const gutter = compact ? 30 : 44;
  const cw = W - gutter;
  const chartH = compact ? 118 : 168;
  const top = y + 10;
  const bottom = top + chartH;
  const weeks = s.weeks;
  const maxW = niceMax(Math.max(1, ...weeks.map((w) => w.total)));
  const n = Math.max(1, weeks.length);
  const xAt = (k: number) => (k / n) * cw;
  const yAt = (v: number) => bottom - (v / maxW) * chartH;

  // Grid.
  for (let q = 0; q <= 4; q++) {
    const gy = r2(bottom - (q / 4) * chartH) + 0.5;
    doc.add(`<path d="M0 ${gy}H${cw}" stroke="${q === 0 ? t.line2 : t.line}"${q === 0 ? '' : ' stroke-dasharray="2 4"'}/>`);
    doc.add(doc.type.text(fmtN((maxW * q) / 4), W, gy + 4, { ...label(t.t3, 10.5), anchor: 'end' }));
  }

  const pts: [number, number][] = [];
  weeks.forEach((w, k) => {
    pts.push([xAt(k), yAt(w.total)], [xAt(k + 1), yAt(w.total)]);
  });
  if (pts.length) {
    const d = polyPath(pts);
    const area = `${d}L${r2(cw)} ${bottom}L0 ${bottom}Z`;
    doc.def(
      `<pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M.5 0V4" stroke="${t.t2}" stroke-width="1" opacity=".38"/></pattern>`,
      `<clipPath id="areaClip"><path d="${area}"/></clipPath>`,
    );
    doc.add(`<rect class="area" x="0" y="${top}" width="${cw}" height="${chartH}" fill="url(#hatch)" clip-path="url(#areaClip)"/>`);
    const L = polyLength(pts);
    doc.add(`<path class="wave" d="${d}" stroke="${t.t1}" stroke-width="1.5" stroke-linejoin="round"/>`);
    doc.style(
      `.wave{stroke-dasharray:${r2(L)};animation:draw 2.2s ${EASE.inOut} .5s backwards}`,
      `@keyframes draw{from{stroke-dashoffset:${r2(L)}}}`,
      `.area{animation:fade 1.2s ${EASE.out} 1.6s backwards}`,
    );

    // Peak annotation.
    if (s.peakWeek) {
      const k = weeks.findIndex((w) => w.start === s.peakWeek!.start);
      const px = (xAt(k) + xAt(k + 1)) / 2;
      const py = yAt(s.peakWeek.total);
      const right = px < cw * 0.7;
      const tx = right ? px + 14 : px - 14;
      doc.add(
        `<g class="peak"><circle cx="${r2(px)}" cy="${r2(py)}" r="3.5" fill="${t.accent}"/>` +
          `<path d="M${r2(px)} ${r2(py - 6)}V${r2(top - 2)}" stroke="${t.accent}" stroke-width="1" stroke-dasharray="1 2"/>` +
          doc.type.text(`Peak ${s.peakWeek.total}`, tx, top + 10, { ...label(t.accent, 10.5, 'mono500'), anchor: right ? 'start' : 'end' }) +
          `</g>`,
      );
      doc.style(`.peak{animation:fade .8s ${EASE.out} 2.5s backwards}`);
    }

    // Probe: a cursor and a dot that trace the waveform.
    if (doc.motion) {
      const P = 14;
      const startAt = 3.2;
      // Week starts are nudged by a hair so each boundary is a vertical step, not a diagonal.
      const frames = pts.map(([x, py], i) => {
        const pct = (x / cw) * 100 + (i > 0 && i % 2 === 0 ? 0.02 : 0);
        return `${Math.min(99.9, Math.round(pct * 1000) / 1000)}%{transform:translate(${r2(x)}px,${r2(py)}px)}`;
      });
      doc.add(
        `<g class="cur"><path d="M0 ${top}V${bottom}" stroke="${t.t3}" stroke-width="1"/></g>` +
          `<g class="probe"><circle r="7" fill="${t.accent}" opacity=".18"/><circle r="3" fill="${t.accent}"/></g>`,
      );
      doc.style(
        `.cur{opacity:0;animation:cur ${P}s linear ${startAt}s infinite}`,
        `@keyframes cur{0%{opacity:1;transform:translateX(0)}99.9%{opacity:1;transform:translateX(${r2(cw)}px)}100%{opacity:0}}`,
        `.probe{opacity:0;animation:probe ${P}s linear ${startAt}s infinite}`,
        `@keyframes probe{${frames.join('')}0%{opacity:1}99.9%{opacity:1}100%{opacity:0}}`,
      );
    }
  }
  // "Now" marker on the right edge.
  doc.add(`<g class="now"><circle cx="${r2(cw)}" cy="${bottom}" r="3" fill="${t.accent}"/></g>`);
  doc.style(`.now circle{animation:breathe 2.4s ${EASE.inOut} infinite;transform-origin:${r2(cw)}px ${bottom}px}`, `@keyframes breathe{50%{transform:scale(1.8);opacity:.35}}`);

  // Month axis.
  let lastMonth = '';
  const my = bottom + 20;
  s.days.forEach((d, i) => {
    const m = d.date.slice(5, 7);
    if (m !== lastMonth && d.date.slice(8, 10) <= '07') {
      const x = (i / Math.max(1, s.days.length)) * cw;
      if (x < cw - (compact ? 14 : 24)) {
        doc.add(`<path d="M${r2(x) + 0.5} ${bottom}v5" stroke="${t.t3}"/>`);
        const txt = compact ? MONTHS[Number(m) - 1]!.slice(0, 1) : MONTHS[Number(m) - 1]!;
        doc.add(doc.type.text(txt, x + 3, my, label(t.t3, 10.5)));
      }
    }
    lastMonth = m;
  });

  // Barcode: one bar per day.
  const by = my + 14;
  const bh = compact ? 22 : 28;
  const maxDay = Math.max(1, ...s.days.map((d) => d.count));
  const sorted = s.days.map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? Infinity;
  const step = cw / Math.max(1, s.days.length);
  const bw = r2(Math.max(1, step * 0.55));
  let dim = '';
  let mid = '';
  let hi = '';
  s.days.forEach((d, i) => {
    const x = r2(i * step);
    if (d.count === 0) dim += `M${x} ${by + bh}v-3`;
    else {
      const h = r2(5 + (bh - 5) * Math.sqrt(d.count / maxDay));
      const seg = `M${x} ${by + bh}v-${h}`;
      if (d.count >= p90) hi += seg;
      else mid += seg;
    }
  });
  doc.add(
    `<g class="bars" stroke-width="${bw}">` +
      (dim ? `<path d="${dim}" stroke="${t.t4}"/>` : '') +
      (mid ? `<path d="${mid}" stroke="${t.t2}"/>` : '') +
      (hi ? `<path d="${hi}" stroke="${t.t1}"/>` : '') +
      `</g>`,
  );
  doc.add(doc.type.text('Daily', W, by + bh - 1, { ...label(t.t3, 10.5), anchor: 'end' }));
  doc.style(`.bars{animation:wipe 1.8s ${EASE.inOut} 1s backwards}`, `@keyframes wipe{from{clip-path:inset(0 100% 0 0)}}`);

  doc.height = by + bh + 6;
  doc.style(`@keyframes up{from{opacity:0;transform:translateY(8px)}}`, `@keyframes fade{from{opacity:0}}`);
  return doc.render();
}

export const activity: Module = {
  id: 'activity',
  alt: (ctx) =>
    `GitHub activity over the last 12 months: ${readouts(ctx)
      .map((r) => `${r.k.toLowerCase()} ${r.v}${r.u ? ` (${r.u})` : ''}`)
      .join(', ')}.`,
  render,
};
