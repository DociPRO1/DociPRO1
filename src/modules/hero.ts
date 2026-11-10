/** Animated name and a signal connecting the software domains. */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, layerMark, polyLength, polyPath } from '../engine/kit.ts';
import type { TextStyle } from '../engine/type.ts';
import { type Module, type BuildContext, type RenderTarget } from './context.ts';

const NAME_DELAY = 0.25;
const NAME_STAGGER = 0.055;
const BUS_START = 1.25;
const BUS_DRAW = 1.5;
const PULSE_START = BUS_START + BUS_DRAW + 0.4;
const PULSE_TRAVEL = 2.6;
const PULSE_PERIOD = 7;

function nameReveal(doc: SvgDoc, lines: { text: string; x: number; baseline: number }[], style: TextStyle, offset = 0) {
  const t = doc.theme;
  const size = style.size;
  let glyphIndex = offset;
  let endX = 0;
  lines.forEach((ln, li) => {
    const clipId = `nc${li}`;
    // Clip spans ascender to descender; glyphs start below it and rise in.
    doc.def(
      `<clipPath id="${clipId}"><rect x="-20" y="${r2(ln.baseline - size * 0.98)}" width="${doc.width + 40}" height="${r2(size * 1.25)}"/></clipPath>`,
    );
    const base = glyphIndex;
    const run = doc.type.text(ln.text, ln.x, ln.baseline, { ...style, fill: t.t1, attrs: `class="nm"` }, (i) => `class="g${base + i}"`);
    glyphIndex += Array.from(ln.text).filter((c) => c !== ' ').length;
    doc.add(`<g clip-path="url(#${clipId})">${run}</g>`);
    endX = ln.x + doc.type.measure(ln.text, style);
  });
  const rules: string[] = [`.nm use{animation:rise 1.15s ${EASE.out} backwards}`, `@keyframes rise{from{transform:translateY(1100px)}}`];
  for (let i = offset; i < glyphIndex; i++) rules.push(`.g${i}{animation-delay:${r2(NAME_DELAY + i * NAME_STAGGER)}s!important}`);
  doc.style(...rules);
  return { endX, glyphs: glyphIndex };
}

/** Accent terminal square, the "full stop" after the name. */
function terminal(doc: SvgDoc, x: number, baseline: number, size: number, glyphs: number) {
  const s = r2(size * 0.105);
  const t = doc.theme;
  doc.add(`<rect class="term" x="${r2(x + size * 0.07)}" y="${r2(baseline - s)}" width="${s}" height="${s}" fill="${t.accent}"/>`);
  const at = r2(NAME_DELAY + glyphs * NAME_STAGGER + 0.55);
  doc.style(
    `.term{animation:blink 1.2s steps(1,end) ${at}s backwards}`,
    `@keyframes blink{0%{opacity:0}20%{opacity:1}40%{opacity:0}60%{opacity:1}80%{opacity:0}100%{opacity:1}}`,
  );
}

interface Station {
  id: Parameters<typeof layerMark>[0];
  x: number;
  y: number;
  /** Distance along the bus where the pulse reaches this station. */
  at: number;
}

/** Bus, stations, pulse and station flashes, shared by both layouts. */
function signal(doc: SvgDoc, pts: [number, number][], stations: Station[]) {
  const t = doc.theme;
  const L = polyLength(pts);
  const d = polyPath(pts);

  // Bus line, drawn in on load.
  doc.add(`<path class="bus" d="${d}" stroke="${t.line2}" stroke-width="1.5"/>`);
  // Origin and termination.
  const [sx, sy] = pts[0]!;
  const [ex, ey] = pts.at(-1)!;
  doc.add(`<circle cx="${sx}" cy="${sy}" r="3.5" fill="${t.accent}"/>`);
  doc.add(`<circle cx="${ex}" cy="${ey}" r="4" stroke="${t.t3}" stroke-width="1.5" fill="${t.canvas}" class="endpt"/>`);

  // Pulse: a short accent dash travelling the bus.
  const seg = 56;
  if (doc.motion) {
    doc.add(`<path class="pulse" d="${d}" stroke="${t.accent}" stroke-width="2" stroke-linecap="round"/>`);
    doc.add(`<path class="pulse halo" d="${d}" stroke="${t.accent}" stroke-width="8" stroke-linecap="round" opacity=".14"/>`);
  }
  const travelFrac = (PULSE_TRAVEL / PULSE_PERIOD) * 100;
  doc.style(
    `.bus{stroke-dasharray:${r2(L)};animation:draw ${BUS_DRAW}s ${EASE.inOut} ${BUS_START}s backwards}`,
    `@keyframes draw{from{stroke-dashoffset:${r2(L)}}}`,
    `.endpt{animation:fade .4s ${EASE.out} ${r2(BUS_START + BUS_DRAW)}s backwards}`,
    `.pulse{stroke-dasharray:${seg} ${r2(L * 2)};stroke-dashoffset:${seg};animation:travel ${PULSE_PERIOD}s ${EASE.inOut} ${PULSE_START}s infinite}`,
    `@keyframes travel{0%{stroke-dashoffset:${seg}}${r2(travelFrac)}%{stroke-dashoffset:${r2(-L)}}100%{stroke-dashoffset:${r2(-L)}}}`,
    `@keyframes fade{from{opacity:0}}`,
  );

  stations.forEach((s, i) => {
    // Canvas-filled pad hides the bus beneath each mark.
    const pad = `<rect x="${s.x - 16}" y="${s.y - 16}" width="32" height="32" rx="2" fill="${t.canvas}"/>`;
    const appear = r2(BUS_START + (s.at / L) * BUS_DRAW);
    doc.add(`<g class="st st${i}">${pad}${layerMark(s.id, s.x, s.y, t.t1, 1, '', t.canvas)}</g>`);
    // Corner ticks frame each station like a component footprint.
    const c = 16;
    const k = 4;
    doc.add(
      `<path class="st st${i}" d="M${s.x - c} ${s.y - c + k}V${s.y - c}H${s.x - c + k}M${s.x + c - k} ${s.y - c}H${s.x + c}V${s.y - c + k}M${s.x + c} ${s.y + c - k}V${s.y + c}H${s.x + c - k}M${s.x - c + k} ${s.y + c}H${s.x - c}V${s.y + c - k}" stroke="${t.t3}" stroke-width="1"/>`,
    );
    if (doc.motion) {
      doc.add(`<g class="fl fl${i}">${layerMark(s.id, s.x, s.y, t.accent, 1, '', t.canvas)}</g>`);
    }
    const reach = r2(PULSE_START + (s.at / L) * PULSE_TRAVEL - 0.05);
    doc.style(
      `.st${i}{animation:pop .7s ${EASE.out} ${appear}s backwards;transform-origin:${s.x}px ${s.y}px}`,
      `.fl${i}{opacity:0;animation:flash ${PULSE_PERIOD}s linear ${reach}s infinite}`,
    );
  });
  doc.style(
    `@keyframes pop{from{opacity:0;transform:scale(.95)}}`,
    `@keyframes flash{0%{opacity:1}12%{opacity:0}100%{opacity:0}}`,
  );
}

function stationLabel(doc: SvgDoc, ctx: BuildContext, i: number, x: number, y: number, maxW: number, cls: string) {
  const t = doc.theme;
  const layer = ctx.config.layers[i]!;
  const parts = [doc.type.text(layer.name, x, y, { font: 'sans500', size: 17, fill: t.t1 })];
  const domStyle: TextStyle = { font: 'sans400', size: 15, fill: t.t2 };
  const lines = doc.type.wrap(layer.domain, domStyle, maxW);
  lines.forEach((ln, j) => parts.push(doc.type.text(ln, x, y + 22 + j * 19, domStyle)));
  doc.add(`<g class="${cls}">${parts.join('')}</g>`);
}

function wide(ctx: BuildContext, target: RenderTarget): string {
  const { config: c } = ctx;
  const W = WIDTH.wide;
  const doc = new SvgDoc({ width: W, height: 500, title: `${c.name}, ${c.role}`, desc: c.tagline, ...target });
  const t = doc.theme;

  doc.add(`<g class="meta">` +
    doc.type.text(c.role, 0, 18, { font: 'sans400', size: 17, fill: t.t2 }) +
    doc.type.text(`@${c.login}`, W, 18, { ...label(t.t3, 12), caps: false, anchor: 'end' }) + `</g>`);
  doc.add(`<path class="rule" d="M0 36.5H${W}" stroke="${t.line2}"/>`);

  // Name.
  const nameStyle: TextStyle = { font: 'sans500', size: 132, tracking: -0.045 };
  const baseline = 30 + 34 + doc.type.capHeight(nameStyle);
  const { endX, glyphs } = nameReveal(doc, [{ text: c.name, x: -6, baseline }], nameStyle);
  terminal(doc, endX - 6, baseline, nameStyle.size, glyphs);

  const bio: TextStyle = { font: 'sans400', size: 22, fill: t.t2 };
  doc.type.wrap(c.intro.statement, bio, 360).forEach((line, i) => {
    doc.add(`<g class="bio">${doc.type.text(line, 640, baseline - 52 + i * 30, bio)}</g>`);
  });
  doc.style(`.bio{animation:up .8s ${EASE.out} .9s backwards}`);

  // Tagline: one full-width line under the name.
  const tagStyle: TextStyle = { font: 'sans300', size: 34, tracking: -0.012, fill: t.t1 };
  const tagLines = doc.type.wrap(c.tagline, tagStyle, W);
  const tagTop = baseline + 60;
  tagLines.forEach((ln, i) => {
    doc.add(`<g class="tg${i}">${doc.type.text(ln, 0, tagTop + i * 44, tagStyle)}</g>`);
    doc.style(`.tg${i}{animation:up .9s ${EASE.out} ${r2(0.85 + i * 0.12)}s backwards}`);
  });

  // One station for each configured software domain.
  const busY = tagTop + (tagLines.length - 1) * 44 + 70;
  const col = W / c.layers.length;
  const x0 = 20;
  const pts: [number, number][] = [
    [x0, busY],
    [W - 5, busY],
  ];
  const stations: Station[] = c.layers.map((l, i) => {
    const x = Math.round(i * col + x0);
    return { id: l.id, x, y: busY, at: x - x0 };
  });
  signal(doc, pts, stations);
  stations.forEach((s, i) => {
    stationLabel(doc, ctx, i, s.x - 16, busY + 46, col - 16, `lb${i}`);
    doc.style(`.lb${i}{animation:up .8s ${EASE.out} ${r2(BUS_START + (s.x / W) * BUS_DRAW + 0.15)}s backwards}`);
  });

  doc.height = busY + 112;

  doc.style(
    `.meta{animation:fade .6s ${EASE.out} .05s backwards}`,
    `.rule{stroke-dasharray:${W};animation:hdr 1.3s ${EASE.out} .1s backwards}`,
    `@keyframes hdr{from{stroke-dashoffset:${W}}}`,
    `@keyframes up{from{opacity:0;transform:translateY(10px)}}`,
  );
  return doc.render();
}

function compact(ctx: BuildContext, target: RenderTarget): string {
  const { config: c } = ctx;
  const W = WIDTH.compact;
  const doc = new SvgDoc({ width: W, height: 800, title: `${c.name}, ${c.role}`, desc: c.tagline, ...target });
  const t = doc.theme;

  doc.add(
    `<g class="meta">` +
      doc.type.text(c.role, 0, 14, { font: 'sans400', size: 16, fill: t.t2 }) +
      doc.type.text(`@${c.login}`, W, 14, { ...label(t.t3, 13), anchor: 'end' }) +
      `</g>`,
  );
  doc.add(`<path class="rule" d="M0 30.5H${W}" stroke="${t.line2}"/>`);

  const nameStyle: TextStyle = { font: 'sans500', size: 84, tracking: -0.045 };
  nameStyle.size *= Math.min(1, (W - 20) / doc.type.measure(c.name, nameStyle));
  const baseline = 118;
  const { endX, glyphs } = nameReveal(doc, [{ text: c.name, x: -3, baseline }], nameStyle);
  terminal(doc, endX - 3, baseline, nameStyle.size, glyphs);
  let y = baseline + 46;
  const tagStyle: TextStyle = { font: 'sans300', size: 28, tracking: -0.01, fill: t.t1 };
  doc.type.wrap(c.tagline, tagStyle, W).forEach((line, i) => {
    doc.add(`<g class="tg0">${doc.type.text(line, 0, y + i * 36, tagStyle)}</g>`);
  });
  y += 36 * doc.type.wrap(c.tagline, tagStyle, W).length + 12;
  const bio: TextStyle = { font: 'sans400', size: 18, fill: t.t2 };
  doc.type.wrap(c.intro.statement, bio, W).forEach((line) => {
    doc.add(`<g class="tg1">${doc.type.text(line, 0, y, bio)}</g>`);
    y += 25;
  });
  doc.style(`.tg0{animation:up .9s ${EASE.out} .8s backwards}`, `.tg1{animation:up .9s ${EASE.out} .95s backwards}`);

  // A vertical signal keeps all domain labels readable on mobile.
  const x = 16;
  const top = y + 8;
  const gap = 58;
  const stations: Station[] = c.layers.map((l, i) => ({ id: l.id, x, y: top + 34 + i * gap, at: 34 + i * gap }));
  const bottom = stations.at(-1)!.y + 40;
  signal(
    doc,
    [
      [x, top],
      [x, bottom],
    ],
    stations,
  );
  stations.forEach((s, i) => {
    stationLabel(doc, ctx, i, 52, s.y - 3, W - 60, `lb lb${i}`);
    doc.style(`.lb${i}{animation:up .8s ${EASE.out} ${r2(BUS_START + (s.at / (bottom - top)) * BUS_DRAW + 0.15)}s backwards}`);
  });
  doc.height = bottom + 12;
  doc.style(
    `.meta{animation:fade .6s ${EASE.out} .05s backwards}`,
    `.rule{stroke-dasharray:${W};animation:hdr 1.3s ${EASE.out} .1s backwards}`,
    `@keyframes hdr{from{stroke-dashoffset:${W}}}`,
    `@keyframes up{from{opacity:0;transform:translateY(10px)}}`,
  );
  return doc.render();
}

export const hero: Module = {
  id: 'hero',
  alt: (ctx) => {
    const c = ctx.config;
    return `${c.name}, ${c.role}. ${c.tagline} ${c.intro.statement} Areas: ${c.layers.map((l) => l.domain).join(', ')}.`;
  },
  render: (ctx, target) => (target.layout === 'wide' ? wide(ctx, target) : compact(ctx, target)),
};
