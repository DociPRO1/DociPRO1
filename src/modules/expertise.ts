/** Animated software architecture, with four domains and no layer numbers. */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, sectionHeader, headerMotion, layerMark, type LayerId } from '../engine/kit.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';
import type { Layer } from '../types.ts';

interface StackGeo {
  cx: number;
  /** cy for each layer index (0 = L0). */
  cy: number[];
  w: number;
  h: number;
  T: number;
}

const P = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L') + 'Z';

function slab(doc: SvgDoc, g: StackGeo, i: number, layer: Layer, delay: number) {
  const t = doc.theme;
  const { cx, w, h, T } = g;
  const cy = g.cy[i]!;
  const top = P([
    [cx, cy - h],
    [cx + w, cy],
    [cx, cy + h],
    [cx - w, cy],
  ]);
  const left = P([
    [cx - w, cy],
    [cx, cy + h],
    [cx, cy + h + T],
    [cx - w, cy + T],
  ]);
  const right = P([
    [cx, cy + h],
    [cx + w, cy],
    [cx + w, cy + T],
    [cx, cy + h + T],
  ]);
  const s = `stroke="${t.line2}" stroke-width="1" stroke-linejoin="round"`;
  // Inner inset on the top face: a fine engraved border.
  const k = 0.82;
  const inset = P([
    [cx, cy - h * k],
    [cx + w * k, cy],
    [cx, cy + h * k],
    [cx - w * k, cy],
  ]);
  // Mark sits in the front quadrant of the face, the part left visible below the slab above.
  const mx = cx - w * 0.36;
  const my = cy + h * 0.36;
  const isTop = i === g.cy.length - 1;
  doc.add(
    `<g class="sl sl${i}">` +
      `<path d="${left}" fill="${t.slabSide}" ${s}/>` +
      `<path d="${right}" fill="${t.slabFront}" ${s}/>` +
      `<path d="${top}" fill="${t.slabTop}" ${s}/>` +
      `<path d="${inset}" stroke="${t.line}" stroke-width="1" stroke-dasharray="2 3"/>` +
      // Mark projected onto the face: rotate/scale into the isometric plane.
      `<g transform="translate(${r2(mx)} ${r2(my)}) matrix(.894 .447 -.894 .447 0 0)">${layerMark(layer.id, 0, 0, isTop ? t.t1 : t.t2, 0.82, '', t.slabTop)}</g>` +
      `</g>`,
  );
  doc.style(`.sl${i}{animation:drop .9s ${EASE.out} ${r2(delay)}s backwards}`);
}

/** Via through all slabs plus the climbing pulse. Drawn on top: an X-ray of the stack. */
function via(doc: SvgDoc, g: StackGeo, x: number, start: number) {
  const t = doc.theme;
  const n = g.cy.length;
  const yTop = g.cy[n - 1]! + g.h * 0.05;
  const yBot = g.cy[0]! + g.h * 0.05 + g.T + 14;
  const holeY = (i: number) => g.cy[i]! + g.h * 0.05;
  doc.add(`<path d="M${x} ${r2(yBot)}V${r2(yTop)}" stroke="${t.t3}" stroke-width="1" stroke-dasharray="1 3" class="via"/>`);
  for (let i = 0; i < n; i++) {
    doc.add(`<ellipse cx="${x}" cy="${r2(holeY(i))}" rx="7" ry="3.5" fill="${t.canvas}" stroke="${t.t2}" stroke-width="1.2" class="hole hole${i}"/>`);
  }
  const L = yBot - yTop;
  const seg = 40;
  if (doc.motion) {
    doc.add(`<path class="vp" d="M${x} ${r2(yBot)}V${r2(yTop)}" stroke="${t.accent}" stroke-width="2" stroke-linecap="round"/>`);
    for (let i = 0; i < n; i++) {
      doc.add(`<ellipse cx="${x}" cy="${r2(holeY(i))}" rx="7" ry="3.5" stroke="${t.accent}" stroke-width="1.5" class="hf hf${i}"/>`);
    }
  }
  const period = 6;
  const travel = 2.2;
  doc.style(
    `.vp{stroke-dasharray:${seg} ${r2(L * 2)};stroke-dashoffset:${seg};animation:climb ${period}s ${EASE.inOut} ${start}s infinite}`,
    `@keyframes climb{0%{stroke-dashoffset:${seg}}${r2((travel / period) * 100)}%{stroke-dashoffset:${r2(-L)}}100%{stroke-dashoffset:${r2(-L)}}}`,
    `@keyframes hflash{0%{opacity:1}14%{opacity:0}100%{opacity:0}}`,
    `.via{animation:fade 1s ${EASE.out} ${r2(start - 0.8)}s backwards}`,
  );
  for (let i = 0; i < n; i++) {
    // Ease-in-out makes arrival non-linear; approximate with the linear fraction, nudged.
    const frac = (yBot - holeY(i)) / L;
    const eased = frac < 0.5 ? Math.sqrt(frac / 2) : 1 - Math.sqrt((1 - frac) / 2);
    doc.style(`.hf${i}{opacity:0;animation:hflash ${period}s linear ${r2(start + eased * travel)}s infinite}`);
  }
}

/** Dashed isometric envelope around the whole stack: Software Architecture. */
function envelope(doc: SvgDoc, g: StackGeo, pad: number, labelText: string, sub: string, compact: boolean) {
  const t = doc.theme;
  const { cx } = g;
  const w = g.w + pad * 2;
  const h = g.h + pad;
  const yTop = g.cy.at(-1)! - pad * 1.6;
  const yBot = g.cy[0]! + g.T + pad * 0.9;
  const dash = `stroke="${t.t3}" stroke-width="1" stroke-dasharray="4 4"`;
  const d =
    P([
      [cx, yTop - h],
      [cx + w, yTop],
      [cx, yTop + h],
      [cx - w, yTop],
    ]) +
    `M${r2(cx - w)} ${r2(yTop)}V${r2(yBot)}L${cx} ${r2(yBot + h)}L${r2(cx + w)} ${r2(yBot)}V${r2(yTop)}M${cx} ${r2(yTop + h)}V${r2(yBot + h)}`;
  doc.add(`<path d="${d}" ${dash} class="env"/>`);
  // Label on the free side, with a leader to the envelope's upper-left edge.
  if (compact) {
    doc.add(
      `<g class="envl">${doc.type.text(labelText, doc.width, yTop - h + 6, { ...label(t.t2, 11, 'mono500'), anchor: 'end' })}${doc.type.text(sub, doc.width, yTop - h + 22, { ...label(t.t3, 11), anchor: 'end' })}</g>`,
    );
  } else {
    const ex = cx - w * 0.6;
    const ey = yTop - h * 0.6;
    const lx = cx - w - 24;
    doc.add(
      `<g class="envl"><path d="M${r2(ex)} ${r2(ey)}L${r2(ex - 22)} ${r2(ey - 22)}H${r2(lx)}" stroke="${t.t3}" stroke-width="1"/>` +
        `<circle cx="${r2(ex)}" cy="${r2(ey)}" r="2" fill="${t.t3}"/>` +
        doc.type.text(labelText, lx - 8, ey - 22 + 4, { ...label(t.t2, 11, 'mono500'), anchor: 'end' }) +
        doc.type.text(sub, lx - 8, ey - 22 + 20, { ...label(t.t3, 11), anchor: 'end' }) +
        `</g>`,
    );
  }
  doc.style(`.env{animation:fade 1.2s ${EASE.out} 1.1s backwards}`, `.envl{animation:fade 1s ${EASE.out} 1.4s backwards}`);
  return { right: cx + w, top: yTop - h, bottom: yBot + h };
}

/** Bracket on the right side spanning a range of slabs: Full Stack. */
function bracket(doc: SvgDoc, g: StackGeo, from: number, to: number, x: number, text: string, sub: string) {
  const t = doc.theme;
  const y0 = g.cy[to]! - 2;
  const y1 = g.cy[from]! + g.T + 2;
  doc.add(
    `<g class="br"><path d="M${x - 6} ${r2(y0)}H${x}V${r2(y1)}H${x - 6}" stroke="${t.t2}" stroke-width="1.2"/>` +
      doc.type.text(text, x + 10, r2((y0 + y1) / 2 - 2), label(t.t2, 11, 'mono500')) +
      doc.type.text(sub, x + 10, r2((y0 + y1) / 2 + 14), label(t.t3, 11)) +
      `</g>`,
  );
  doc.style(`.br{animation:fade 1s ${EASE.out} 1.5s backwards}`);
}

function rows(doc: SvgDoc, ctx: BuildContext, x: number, y: number, rowH: number, maxW: number, leaderTo?: (i: number) => [number, number]) {
  const t = doc.theme;
  const layers = [...ctx.config.layers].reverse();
  const domStyle: TextStyle = { font: 'sans500', size: doc.layout === 'compact' ? 18 : 19, tracking: -0.005, fill: t.t1 };
  const scopeStyle: TextStyle = { font: 'sans400', size: 14, fill: t.t2 };
  layers.forEach((l, r) => {
    const i = layers.length - 1 - r;
    const y0 = y + r * rowH;
    let g = doc.type.text(l.domain, x, y0 + 24, domStyle);
    const scope = doc.type.wrap(l.scope, scopeStyle, maxW);
    g += scope.map((s, j) => doc.type.text(s, x, y0 + 47 + j * 18, scopeStyle)).join('');
    if (leaderTo) {
      const [lx, ly] = leaderTo(i);
      const sx = x + Math.max(doc.type.measure(l.domain, domStyle), ...scope.map((s) => doc.type.measure(s, scopeStyle))) + 16;
      const startX = Math.max(sx, x + maxW + 12);
      g += `<path d="M${r2(startX)} ${r2(y0 + 24)}H${r2(lx - 26)}L${r2(lx - 6)} ${r2(ly)}" stroke="${t.line2}" stroke-width="1" stroke-dasharray="1 3"/><circle cx="${r2(lx - 4)}" cy="${r2(ly)}" r="2" fill="${t.t3}"/>`;
    }
    doc.add(`<g class="rw rw${i}">${g}</g>`);
    doc.style(`.rw${i}{animation:up .8s ${EASE.out} ${r2(0.3 + (layers.length - 1 - i) * 0.08)}s backwards}`);
  });
}

function render(ctx: BuildContext, target: RenderTarget, index: string): string {
  const { config: c } = ctx;
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const arch = c.spans[0];
  const fs = c.spans[1];
  const doc = new SvgDoc({
    width: W,
    height: 600,
    title: 'Engineering expertise',
    desc: c.layers.map((l) => `${l.domain}: ${l.scope}`).join('. '),
    ...target,
  });
  const t = doc.theme;
  let y = sectionHeader(doc, index, 'What I work on', '');
  headerMotion(doc);
  const n = c.layers.length;
  const idx = (id: LayerId) => c.layers.findIndex((l) => l.id === id);

  if (!compact) {
    const rowH = 70;
    const top = y + 40;
    const g: StackGeo = { cx: 742, w: 128, h: 64, T: 11, cy: [] };
    // Slab i aligns its left vertex with row (n-1-i)'s domain baseline.
    for (let i = 0; i < n; i++) g.cy[i] = top + (n - 1 - i) * rowH + 24;
    if (arch) envelope(doc, g, 16, arch.name, '', false);
    for (let i = 0; i < n; i++) slab(doc, g, i, c.layers[i]!, 0.35 + i * 0.1);
    via(doc, g, Math.round(g.cx + g.w * 0.58), 2.2);
    if (fs) bracket(doc, g, idx(fs.from), idx(fs.to), g.cx + g.w + 30, fs.name, '');
    rows(doc, ctx, 0, top, rowH, 330, (i) => [g.cx - g.w, g.cy[i]!]);
    doc.height = g.cy[0]! + g.T + 16 * 0.9 + g.h + 16 + 8;
  } else {
    const g: StackGeo = { cx: 170, w: 112, h: 56, T: 9, cy: [] };
    const gap = 46;
    const top = y + 92;
    for (let i = 0; i < n; i++) g.cy[i] = top + (n - 1 - i) * gap;
    if (arch) envelope(doc, g, 12, arch.name, '', true);
    for (let i = 0; i < n; i++) slab(doc, g, i, c.layers[i]!, 0.3 + i * 0.09);
    via(doc, g, Math.round(g.cx + g.w * 0.58), 2.0);
    if (fs) bracket(doc, g, idx(fs.from), idx(fs.to), g.cx + g.w + 22, fs.name, '');
    y = g.cy[0]! + g.h + g.T + 52;
    doc.add(`<path d="M0 ${y - 16.5}H${W}" stroke="${t.line}"/>`);
    rows(doc, ctx, 0, y, 68, W);
    doc.height = y + n * 68 - 8;
  }
  doc.style(
    `@keyframes drop{from{opacity:0;transform:translateY(-18px)}}`,
    `@keyframes up{from{opacity:0;transform:translateY(10px)}}`,
    `@keyframes fade{from{opacity:0}}`,
  );
  return doc.render();
}

export const expertise: Module = {
  id: 'expertise',
  alt: (ctx) =>
    `Software architecture, shown as a connected stack. ${ctx.config.layers.map((l) => `${l.domain}: ${l.scope}.`).join(' ')} ${ctx.config.spans.map((s) => `${s.name}: ${s.scope}.`).join(' ')}`,
  render,
};
