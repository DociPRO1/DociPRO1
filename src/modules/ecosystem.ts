/** Technology map with an animated scan and readable domain names. */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, sectionHeader, headerMotion } from '../engine/kit.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';

const SCAN_START = 2.0;
const SCAN_TRAVEL = 2.4;
const SCAN_PERIOD = 8;

function render(ctx: BuildContext, target: RenderTarget, index: string): string {
  const { config: c } = ctx;
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const doc = new SvgDoc({
    width: W,
    height: 500,
    title: 'Technology ecosystem',
    desc: c.stack.map((s) => `${s.name} (${s.kind})`).join('. '),
    ...target,
  });
  const t = doc.theme;
  let y = sectionHeader(doc, index, 'Technologies', '');
  headerMotion(doc);

  const layers = c.layers;
  const colX0 = compact ? 250 : 520;
  const colW = compact ? 46 : 120;
  const colCx = (j: number) => colX0 + j * colW + colW / 2;
  const rowH = compact ? 46 : 38;

  const hy = y + 4;
  const tableTop = hy + 28;
  doc.add(doc.type.text('Technology', 0, hy + 12, { font: 'sans400', size: 14, fill: t.t3 }));
  if (!compact) doc.add(doc.type.text('Type', 310, hy + 12, { font: 'sans400', size: 14, fill: t.t3 }));
  layers.forEach((layer, j) => {
    doc.add(doc.type.text(layer.name, colCx(j), hy + 12, {
      font: 'sans500', size: compact ? 11 : 14, fill: t.t2, anchor: 'middle',
    }));
  });
  doc.add(`<path d="M0 ${tableTop - 0.5}H${W}" stroke="${t.line2}"/>`);

  // Column guides.
  const tableBottom = tableTop + c.stack.length * rowH;
  layers.forEach((_, j) => {
    doc.add(`<path d="M${colCx(j)} ${tableTop}V${tableBottom}" stroke="${t.line}" stroke-dasharray="1 3"/>`);
  });

  const nameStyle: TextStyle = { font: 'sans400', size: compact ? 15.5 : 17, fill: t.t1 };
  c.stack.forEach((tech, i) => {
    const ry = tableTop + i * rowH;
    const mid = ry + rowH / 2;
    let g = '';
    if (compact) {
      g += doc.type.text(tech.name, 0, mid - 3, nameStyle);
      g += doc.type.text(tech.kind, 0, mid + 15, { font: 'sans400', size: 12, fill: t.t3 });
    } else {
      g += doc.type.text(tech.name, 0, mid + 6, nameStyle);
      g += doc.type.text(tech.kind, 310, mid + 5, { font: 'sans400', size: 14, fill: t.t3 });
    }
    // Reach trace between the outermost used layers.
    const js = tech.layers.map((id) => layers.findIndex((l) => l.id === id)).filter((j) => j >= 0).sort((a, b) => a - b);
    if (js.length > 1) {
      g += `<path d="M${colCx(js[0]!)} ${mid}H${colCx(js.at(-1)!)}" stroke="${t.t3}" stroke-width="1.5"/>`;
    }
    const pad = compact ? 9 : 11;
    for (const j of js) {
      g += `<rect x="${r2(colCx(j) - pad / 2)}" y="${r2(mid - pad / 2)}" width="${pad}" height="${pad}" fill="${t.t1}"/>`;
    }
    g += `<path d="M0 ${ry + rowH - 0.5}H${W}" stroke="${t.line}"/>`;
    doc.add(`<g class="r${i}">${g}</g>`);
    doc.style(`.r${i}{animation:up .7s ${EASE.out} ${r2(0.25 + i * 0.06)}s backwards}`);
    if (doc.motion) {
      for (const j of js) {
        doc.add(`<rect class="pf c${j}" x="${r2(colCx(j) - pad / 2 - 3)}" y="${r2(mid - pad / 2 - 3)}" width="${pad + 6}" height="${pad + 6}" stroke="${t.accent}" stroke-width="1.5"/>`);
      }
    }
  });

  doc.height = tableBottom + 24;

  // Scan line.
  if (doc.motion) {
    const x0 = colX0;
    const x1 = colX0 + layers.length * colW;
    doc.add(`<path class="scan" d="M${x0} ${tableTop}V${tableBottom}" stroke="${t.accent}" stroke-width="1.5" opacity=".9"/>`);
    const fr = r2((SCAN_TRAVEL / SCAN_PERIOD) * 100);
    doc.style(
      `.scan{opacity:0;animation:scan ${SCAN_PERIOD}s linear ${SCAN_START}s infinite}`,
      `@keyframes scan{0%{opacity:.9;transform:translateX(0)}${fr}%{opacity:.9;transform:translateX(${x1 - x0}px)}${r2(Number(fr) + 0.01)}%,100%{opacity:0;transform:translateX(${x1 - x0}px)}}`,
      `@keyframes pf{0%{opacity:1}10%{opacity:0}100%{opacity:0}}`,
    );
    layers.forEach((_, j) => {
      const at = SCAN_START + ((colCx(j) - x0) / (x1 - x0)) * SCAN_TRAVEL;
      doc.style(`.c${j}{opacity:0;animation:pf ${SCAN_PERIOD}s linear ${r2(at)}s infinite}`);
    });
  }
  doc.style(`@keyframes up{from{opacity:0;transform:translateY(8px)}}`);
  return doc.render();
}

export const ecosystem: Module = {
  id: 'ecosystem',
  alt: (ctx) =>
    `Technologies and the software domains where I use them. ${ctx.config.stack
      .map((s) => `${s.name}, ${s.kind}, used in ${s.layers.map((id) => `${ctx.config.layers.find((l) => l.id === id)?.name ?? ''}`).join(', ')}.`)
      .join(' ')}`,
  render,
};
