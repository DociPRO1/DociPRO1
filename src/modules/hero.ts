/** A short, typographic introduction. No decorative indices or diagrams. */
import { SvgDoc } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';

function description(ctx: BuildContext): string {
  const c = ctx.config;
  return [c.intro.statement, c.intro.continuation].filter(Boolean).join(' ');
}

function render(ctx: BuildContext, target: RenderTarget): string {
  const c = ctx.config;
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const inset = compact ? 4 : 8;
  const available = W - inset * 2;
  const doc = new SvgDoc({
    width: W, height: 400, title: `${c.name}, ${c.role}`,
    desc: `${c.tagline} ${description(ctx)}`, ...target,
  });
  const t = doc.theme;

  doc.add(`<path d="M${inset} 24H${inset + 28}" stroke="${t.accent}" stroke-width="3"/>`);
  doc.add(doc.type.text(c.role, inset + 42, 30, {
    font: 'sans400', size: compact ? 17 : 18, fill: t.t2,
  }));

  const name: TextStyle = { font: 'sans500', size: compact ? 80 : 126, tracking: -0.045, fill: t.t1 };
  // Fit the configured name, keeping it on one line on narrow screens too.
  name.size *= Math.min(1, available / doc.type.measure(c.name, name));
  const nameBaseline = compact ? 124 : 168;
  doc.add(doc.type.text(c.name, inset - 3, nameBaseline, name));

  const tagline: TextStyle = { font: 'sans400', size: compact ? 29 : 39, tracking: -0.025, fill: t.t1 };
  let y = nameBaseline + (compact ? 48 : 58);
  for (const line of doc.type.wrap(c.tagline, tagline, available)) {
    doc.add(doc.type.text(line, inset, y, tagline));
    y += compact ? 37 : 48;
  }

  const body: TextStyle = { font: 'sans400', size: compact ? 19 : 22, fill: t.t2 };
  y += 7;
  for (const line of doc.type.wrap(description(ctx), body, available)) {
    doc.add(doc.type.text(line, inset, y, body));
    y += compact ? 28 : 32;
  }

  y += compact ? 16 : 23;
  doc.add(`<path d="M${inset} ${y}H${W - inset}" stroke="${t.line2}"/>`);
  y += 32;

  // Wrap between technologies rather than within their names.
  const tech: TextStyle = { font: 'sans400', size: compact ? 16 : 18, fill: t.t2 };
  const gap = compact ? 23 : 28;
  const techRight = compact ? W - inset : 800;
  let x = inset;
  for (const item of c.stack) {
    const width = doc.type.measure(item.name, tech);
    if (x > inset && x + width > techRight) {
      x = inset;
      y += 29;
    }
    if (x > inset) doc.add(`<circle cx="${x - gap / 2}" cy="${y - 5}" r="1.5" fill="${t.t3}"/>`);
    doc.add(doc.type.text(item.name, x, y, tech));
    x += width + gap;
  }
  doc.height = y + 23;
  return doc.render();
}

export const hero: Module = {
  id: 'hero',
  alt: (ctx) => `${ctx.config.name}, ${ctx.config.role}. ${ctx.config.tagline} ${description(ctx)} Technologies: ${ctx.config.stack.map((item) => item.name).join(', ')}.`,
  render,
};
