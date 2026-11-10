/**
 * CONNECT: where the signal terminates.
 *
 * The bus that left the silicon station in the hero ends here in a ground
 * symbol. The primary endpoint is set large. The plate is wrapped in a link
 * to it, and plain-text links are repeated under the image so they stay
 * clickable and selectable.
 */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, sectionHeader, headerMotion, ruler } from '../engine/kit.ts';
import type { TextStyle } from '../engine/type.ts';
import { rev, type Module, type BuildContext, type RenderTarget } from './context.ts';

const arrow = (x: number, y: number, stroke: string, s: number) =>
  `<path d="M${x} ${y + s}L${x + s} ${y}M${x + s * 0.28} ${y}H${x + s}V${y + s * 0.72}" stroke="${stroke}" stroke-width="2" stroke-linecap="square"/>`;

function ground(x: number, y: number, stroke: string): string {
  return `<path d="M${x} ${y}v16M${x - 14} ${y + 16}h28M${x - 9} ${y + 23}h18M${x - 4} ${y + 30}h8" stroke="${stroke}" stroke-width="1.5"/>`;
}

function render(ctx: BuildContext, target: RenderTarget, index: string): string {
  const { config: c } = ctx;
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const doc = new SvgDoc({
    width: W,
    height: 240,
    title: 'Connect',
    desc: c.links.map((l) => `${l.label}: ${l.url}`).join(', '),
    ...target,
  });
  const t = doc.theme;
  let y = sectionHeader(doc, index, 'Connect', 'end of document');
  headerMotion(doc);

  const [primary, ...others] = c.links;
  if (!primary) {
    doc.height = y;
    return doc.render();
  }
  const display = primary.display ?? primary.url.replace(/^https?:\/\//, '');
  const big: TextStyle = { font: 'sans300', size: compact ? 30 : 46, tracking: -0.02, fill: t.t1 };
  doc.add(doc.type.text(primary.label, 0, y + 8, label(t.t3, 11)));
  const baseline = y + (compact ? 48 : 64);
  const tw = doc.type.measure(display, big);
  doc.add(`<g class="pl">${doc.type.text(display, -2, baseline, big)}</g>`);
  const as = compact ? 14 : 20;
  doc.add(`<g class="ar">${arrow(tw + (compact ? 10 : 16), baseline - big.size * 0.62, t.accent, as)}</g>`);

  // Bus to ground.
  const busY = baseline - big.size * 0.3;
  const bx0 = tw + (compact ? 10 : 16) + as + 22;
  const gx = W - 16;
  if (gx - bx0 > 60) {
    const d = `M${r2(bx0)} ${r2(busY)}H${gx}`;
    doc.add(`<path d="${d}" stroke="${t.line2}" stroke-width="1.5" class="bus"/>`);
    doc.add(ground(gx, busY, t.t2));
    doc.add(doc.type.text('GND', gx - 22, busY - 10, { ...label(t.t3, 10.5), anchor: 'end' }));
    const L = gx - bx0;
    if (doc.motion) {
      doc.add(`<path class="gp" d="${d}" stroke="${t.accent}" stroke-width="2" stroke-linecap="round"/>`);
      doc.add(`<g class="gf">${ground(gx, busY, t.accent)}</g>`);
    }
    const seg = 40;
    const period = 7;
    const travel = 1.6;
    doc.style(
      `.bus{stroke-dasharray:${r2(L)};animation:draw 1.2s ${EASE.inOut} .6s backwards}`,
      `@keyframes draw{from{stroke-dashoffset:${r2(L)}}}`,
      `.gp{stroke-dasharray:${seg} ${r2(L * 2)};stroke-dashoffset:${seg};animation:gp ${period}s ${EASE.inOut} 2s infinite}`,
      `@keyframes gp{0%{stroke-dashoffset:${seg}}${r2((travel / period) * 100)}%{stroke-dashoffset:${r2(-L)}}100%{stroke-dashoffset:${r2(-L)}}}`,
      `.gf{opacity:0;animation:gf ${period}s linear ${r2(2 + travel * 0.92)}s infinite}`,
      `@keyframes gf{0%{opacity:1}14%{opacity:0}100%{opacity:0}}`,
    );
  }
  y = baseline + (compact ? 30 : 40);

  // Secondary endpoints.
  if (others.length) {
    const colW = compact ? W : W / Math.min(3, others.length);
    others.forEach((l, i) => {
      const x = compact ? 0 : (i % 3) * colW;
      const ly = compact ? y + i * 40 : y + Math.floor(i / 3) * 44;
      doc.add(`<path d="M${x} ${ly + 0.5}H${x + colW - (compact ? 0 : 24)}" stroke="${t.line}"/>`);
      doc.add(doc.type.text(l.label, x, ly + 26, label(t.t3, 11)));
      doc.add(doc.type.text(l.display ?? l.url.replace(/^https?:\/\//, ''), x + 110, ly + 27, { font: 'sans400', size: 16, fill: t.t1 }));
    });
    y += (compact ? others.length * 40 : Math.ceil(others.length / 3) * 44) + 16;
  }

  // Colophon.
  doc.add(`<path d="M0 ${y + 0.5}H${W}" stroke="${t.line2}"/>`);
  const colophon = compact ? `${c.code}  /  ${rev(ctx.date)}` : `${c.code}  /  ${rev(ctx.date)}  /  generated from profile.config.ts`;
  doc.add(doc.type.text(colophon, 0, y + 24, label(t.t3, 10.5)));
  doc.add(doc.type.text(compact ? 'Silicon to screen' : 'Silicon to screen  /  end of signal', W, y + 24, { ...label(t.t3, 10.5), anchor: 'end' }));
  doc.add(`<g opacity=".8">${ruler(0, W, y + 38, t, 10)}</g>`);
  doc.height = y + 46;
  doc.style(
    `.pl{animation:up 1s ${EASE.out} .25s backwards}`,
    `.ar{animation:up 1s ${EASE.out} .45s backwards}`,
    `@keyframes up{from{opacity:0;transform:translateY(10px)}}`,
  );
  return doc.render();
}

export const connect: Module = {
  id: 'connect',
  alt: (ctx) => `Connect: ${ctx.config.links.map((l) => `${l.label} ${l.url}`).join(', ')}.`,
  href: (ctx) => ctx.config.links[0]?.url,
  render,
};
