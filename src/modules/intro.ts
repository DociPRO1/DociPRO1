/**
 * 01 · INTRODUCTION: an editorial abstract.
 * The statement is set as one paragraph in two tones: what (primary)
 * continuing into how far (secondary). Three facts sit underneath as a
 * datasheet row.
 */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, sectionHeader, headerMotion, richWrap, richLine } from '../engine/kit.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';

function render(ctx: BuildContext, target: RenderTarget, index: string): string {
  const { config: c } = ctx;
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const doc = new SvgDoc({
    width: W,
    height: 400,
    title: 'Introduction',
    desc: `${c.intro.statement}, ${c.intro.continuation}`,
    ...target,
  });
  const t = doc.theme;
  let y = sectionHeader(doc, index, 'Introduction', 'Abstract');
  headerMotion(doc);

  const style: TextStyle = compact
    ? { font: 'sans300', size: 24, tracking: -0.01 }
    : { font: 'sans300', size: 34, tracking: -0.014 };
  const lh = compact ? 33 : 46;
  const lines = richWrap(
    doc,
    [
      { text: `${c.intro.statement} —`, fill: t.t1 },
      { text: c.intro.continuation, fill: t.t2 },
    ],
    style,
    compact ? W : 880,
  );
  y += compact ? 14 : 22;
  lines.forEach((ln, i) => {
    doc.add(`<g class="ln${i}">${richLine(doc, ln, 0, y + style.size * 0.72 + i * lh, style)}</g>`);
    doc.style(`.ln${i}{animation:up 1s ${EASE.out} ${r2(0.15 + i * 0.09)}s backwards}`);
  });
  y += lines.length * lh + (compact ? 30 : 44);

  // Facts.
  const facts = c.intro.facts;
  const valStyle: TextStyle = { font: 'sans400', size: compact ? 16 : 17, fill: t.t1 };
  if (compact) {
    facts.forEach((f, i) => {
      doc.add(`<path d="M0 ${y + 0.5}H${W}" stroke="${t.line}"/>`);
      const vals = doc.type.wrap(f.value, valStyle, W - 110);
      const g =
        doc.type.text(f.label, 0, y + 25, label(t.t3, 12)) +
        vals.map((v, j) => doc.type.text(v, 110, y + 26 + j * 22, valStyle)).join('');
      doc.add(`<g class="ft${i}">${g}</g>`);
      doc.style(`.ft${i}{animation:fade .8s ${EASE.out} ${r2(0.6 + i * 0.1)}s backwards}`);
      y += 18 + vals.length * 22;
    });
    doc.add(`<path d="M0 ${y + 0.5}H${W}" stroke="${t.line}"/>`);
    y += 4;
  } else {
    const colW = W / facts.length;
    doc.add(`<path d="M0 ${y + 0.5}H${W}" stroke="${t.line2}" class="frule"/>`);
    let maxLines = 1;
    facts.forEach((f, i) => {
      const x = i * colW;
      const vals = doc.type.wrap(f.value, valStyle, colW - 40);
      maxLines = Math.max(maxLines, vals.length);
      const g =
        doc.type.text(`${String(i + 1).padStart(2, '0')}`, x, y + 30, label(t.accent, 12, 'mono500')) +
        doc.type.text(f.label, x + 30, y + 30, label(t.t3, 12)) +
        vals.map((v, j) => doc.type.text(v, x, y + 60 + j * 24, valStyle)).join('');
      doc.add(`<g class="ft${i}">${g}</g>`);
      if (i > 0) doc.add(`<path d="M${r2(x - 20) + 0.5} ${y + 14}V${y + 44 + maxLines * 24}" stroke="${t.line}"/>`);
      doc.style(`.ft${i}{animation:up .8s ${EASE.out} ${r2(0.55 + i * 0.12)}s backwards}`);
    });
    y += 44 + maxLines * 24 + 8;
  }
  doc.height = y;
  doc.style(`@keyframes up{from{opacity:0;transform:translateY(10px)}}`, `@keyframes fade{from{opacity:0}}`);
  return doc.render();
}

export const intro: Module = {
  id: 'introduction',
  alt: (ctx) => {
    const i = ctx.config.intro;
    return `Introduction. ${i.statement}, ${i.continuation} ${i.facts.map((f) => `${f.label}: ${f.value}.`).join(' ')}`;
  },
  render,
};
