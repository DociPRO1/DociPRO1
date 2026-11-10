/**
 * 03 · TECHNOLOGY ECOSYSTEM: a bill of materials.
 *
 * Rows are technologies, columns are the stack's layers. A filled pad marks
 * a layer where the technology is used, and a trace joins a technology's
 * outermost layers to show how deep it reaches through the stack. This is a
 * map of where, never a score of how well, so there are no percentages and
 * no proficiency bars.
 *
 * Motion: a scan line sweeps L0→L5 on a loop and pads flash as it crosses
 * them, the same signal language as the hero and the stack.
 */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, sectionHeader, headerMotion, layerMark } from '../engine/kit.ts';
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
    desc: c.stack.map((s) => `${s.name} (${s.kind}): ${s.layers.join(', ')}`).join('. '),
    ...target,
  });
  const t = doc.theme;
  let y = sectionHeader(doc, index, 'Technology Ecosystem', `${c.stack.length} components  /  bill of materials`);
  headerMotion(doc);

  const layers = c.layers;
  const colX0 = compact ? 262 : 520;
  const colW = compact ? 30 : 80;
  const colCx = (j: number) => colX0 + j * colW + colW / 2;
  const rowH = compact ? 50 : 38;

  // Column header: layer marks and ids.
  const hy = y + 4;
  const tableTop = hy + (compact ? 40 : 50);
  doc.add(doc.type.text('Ref', 0, hy + 30, label(t.t3, 11)));
  if (!compact) {
    doc.add(doc.type.text('Component', 56, hy + 30, label(t.t3, 11)));
    doc.add(doc.type.text('Class', 300, hy + 30, label(t.t3, 11)));
  } else {
    doc.add(doc.type.text('Component', 44, hy + 30, label(t.t3, 11)));
  }
  layers.forEach((l, j) => {
    const cx = colCx(j);
    if (compact) {
      doc.add(doc.type.text(l.id.slice(1), cx, hy + 30, { ...label(t.t3, 11, 'mono500'), anchor: 'middle' }));
    } else {
      doc.add(layerMark(l.id, cx, hy + 8, t.t2, 0.8, '', t.canvas));
      doc.add(doc.type.text(l.id, cx, hy + 40, { ...label(t.t3, 11, 'mono500'), anchor: 'middle' }));
    }
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
    const ref = `T${String(i + 1).padStart(2, '0')}`;
    let g = doc.type.text(ref, 0, mid + 4.5, label(t.t3, 11));
    if (compact) {
      g += doc.type.text(tech.name, 44, mid - 3, nameStyle);
      g += doc.type.text(tech.kind, 44, mid + 15, label(t.t3, 10.5));
    } else {
      g += doc.type.text(tech.name, 56, mid + 6, nameStyle);
      g += doc.type.text(tech.kind, 300, mid + 4.5, label(t.t3, 11));
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

  // Footer: components per layer.
  const fy = tableBottom + (compact ? 24 : 28);
  doc.add(doc.type.text(compact ? 'Per layer' : 'Components per layer', compact ? 44 : 56, fy, label(t.t3, 11)));
  layers.forEach((l, j) => {
    const count = c.stack.filter((s) => s.layers.includes(l.id)).length;
    doc.add(doc.type.text(String(count), colCx(j), fy, { ...label(count ? t.t1 : t.t3, 12, 'mono500'), anchor: 'middle' }));
  });
  if (compact) {
    // Legend for the numeric column headers.
    const legend = layers.map((l) => `${l.id.slice(1)} ${l.name}`).join('   ');
    const lines = doc.type.wrap(legend, label(t.t3, 10.5), W);
    lines.forEach((ln, i) => doc.add(doc.type.text(ln, 0, fy + 30 + i * 17, label(t.t3, 10.5))));
    doc.height = fy + 30 + lines.length * 17;
  } else {
    doc.height = fy + 12;
  }

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
    `Technology ecosystem, as a bill of materials mapping each technology to the stack layers where it is used. ${ctx.config.stack
      .map((s) => `${s.name}, ${s.kind}, used in ${s.layers.map((id) => `${id} ${ctx.config.layers.find((l) => l.id === id)?.name ?? ''}`).join(', ')}.`)
      .join(' ')}`,
  render,
};
