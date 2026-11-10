/** A compact contact footer that carries the hero's signal through to the link. */
import { SvgDoc, EASE } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { sectionHeader } from '../engine/kit.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';

function render(ctx: BuildContext, target: RenderTarget, index: string): string {
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const doc = new SvgDoc({ width: W, height: 170, title: 'Connect', desc: ctx.config.links.map((link) => `${link.label}: ${link.url}`).join(', '), ...target });
  const t = doc.theme;
  const y = sectionHeader(doc, index, 'Connect', '');
  const primary = ctx.config.links[0];
  if (!primary) return doc.render();
  const display = primary.display ?? primary.url.replace(/^https?:\/\//, '');
  const style: TextStyle = { font: 'sans300', size: compact ? 32 : 48, tracking: -0.02, fill: t.t1 };
  style.size *= Math.min(1, (W - 42) / doc.type.measure(display, style));
  const baseline = y + (compact ? 30 : 42);
  const end = doc.type.measure(display, style) + 18;
  doc.add(`<g class="link">${doc.type.text(display, 0, baseline, style)}</g>`);
  doc.add(`<g class="arrow"><path d="M${end} ${baseline - 3}l14 -14m-14 0h14v14" stroke="${t.accent}" stroke-width="2"/></g>`);
  const lineY = baseline + 30;
  doc.add(`<path d="M0 ${lineY}H${W}" stroke="${t.line2}"/>`);
  if (doc.motion) {
    doc.def(`<clipPath id="signalClip"><rect width="${W}" height="${lineY + 4}"/></clipPath>`);
    doc.add(`<g clip-path="url(#signalClip)"><path class="signal" d="M-60 ${lineY}H0" stroke="${t.accent}" stroke-width="2"/></g>`);
  }
  doc.style(
    `.link{animation:up .8s ${EASE.out} .15s backwards}`,
    `.arrow{animation:up .8s ${EASE.out} .23s backwards}`,
    `@keyframes up{from{opacity:0;transform:translateY(8px)}}`,
    `.signal{animation:signal 7s ${EASE.inOut} 1s infinite}`,
    `@keyframes signal{0%{transform:translateX(0)}40%,100%{transform:translateX(${W + 60}px)}}`,
  );
  doc.height = lineY + 20;
  return doc.render();
}

export const connect: Module = {
  id: 'connect',
  enabled: (ctx) => ctx.config.links.length > 0,
  alt: (ctx) => `Connect: ${ctx.config.links.map((link) => `${link.label} ${link.url}`).join(', ')}.`,
  href: (ctx) => ctx.config.links[0]?.url,
  render,
};
