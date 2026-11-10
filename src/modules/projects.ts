/**
 * 05 · SELECTED WORK: one linked plate per repository.
 *
 * Cards are generated from real repository metadata (description, language,
 * topics, stars, last push). Selection is profile.config.ts → projects:
 * pinned slugs first, then the best remaining public repositories. Nothing
 * is invented. With no eligible repositories the whole section is omitted.
 */
import { SvgDoc, EASE, r2 } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import { label, sectionHeader, headerMotion } from '../engine/kit.ts';
import { MONTHS } from '../data/stats.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';
import type { RepoInfo } from '../types.ts';

const fmtDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Wraps to at most `max` lines, ending with an ellipsis when truncated. */
function clampLines(doc: SvgDoc, text: string, style: TextStyle, maxW: number, max: number): string[] {
  const lines = doc.type.wrap(text, style, maxW);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1]!;
  while (last && doc.type.measure(`${last}…`, style) > maxW) last = last.replace(/\s*\S+$/, '');
  kept[max - 1] = `${last}…`;
  return kept;
}

/** Arrow "↗" as geometry, since the latin font subset has no arrow glyphs. */
const arrow = (x: number, y: number, stroke: string, s = 9) =>
  `<path d="M${x} ${y + s}L${x + s} ${y}M${x + 2.5} ${y}H${x + s}V${y + s - 2.5}" stroke="${stroke}" stroke-width="1.5" stroke-linecap="square"/>`;

function chips(doc: SvgDoc, items: string[], x: number, y: number, maxX: number): string {
  const t = doc.theme;
  const st = label(t.t2, 10.5);
  let cx = x;
  let out = '';
  for (const it of items) {
    const w = doc.type.measure(it, st) + 16;
    if (cx + w > maxX) break;
    out += `<rect x="${r2(cx) + 0.5}" y="${y + 0.5}" width="${r2(w)}" height="21" rx="2" stroke="${t.line2}"/>` + doc.type.text(it, cx + 8, y + 14.5, st);
    cx += w + 8;
  }
  return out;
}

function card(ctx: BuildContext, target: RenderTarget, repo: RepoInfo, i: number): string {
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const doc = new SvgDoc({ width: W, height: 170, title: repo.name, desc: repo.description ?? repo.fullName, ...target });
  const t = doc.theme;
  const ref = `P${String(i + 1).padStart(2, '0')}`;
  const nameStyle: TextStyle = { font: 'sans500', size: compact ? 22 : 26, tracking: -0.01, fill: t.t1 };
  const descStyle: TextStyle = { font: 'sans400', size: compact ? 15 : 16, fill: t.t2 };
  const meta: [string, string][] = [
    ['Language', repo.language ?? '—'],
    ['Stars', String(repo.stars)],
    ['Updated', fmtDate(repo.pushedAt)],
  ];

  doc.add(`<path d="M0 0.5H${W}" stroke="${t.line2}" class="rule"/>`);
  if (!compact) {
    const mainX = 110;
    const metaX = 730;
    doc.add(doc.type.text(ref, 0, 40, label(t.accent, 12, 'mono500')));
    doc.add(doc.type.text(repo.name, mainX, 42, nameStyle));
    const desc = clampLines(doc, repo.description ?? 'No description provided.', descStyle, metaX - mainX - 40, 2);
    desc.forEach((ln, j) => doc.add(doc.type.text(ln, mainX, 74 + j * 23, descStyle)));
    const chipY = 74 + desc.length * 23 + 6;
    if (repo.topics.length) doc.add(chips(doc, repo.topics, mainX, chipY, metaX - 40));
    meta.forEach(([k, v], j) => {
      const my = 26 + j * 26;
      doc.add(doc.type.text(k, metaX, my + 9, label(t.t3, 11)));
      doc.add(doc.type.text(v, W, my + 9, { ...label(t.t1, 12, 'mono500'), anchor: 'end', caps: false }));
      doc.add(`<path d="M${metaX} ${my + 17.5}H${W}" stroke="${t.line}"/>`);
    });
    const slug = repo.fullName.toLowerCase();
    doc.add(doc.type.text(`github.com/${slug}`, W - 20, 124, { ...label(t.t3, 11), caps: false, anchor: 'end' }));
    doc.add(arrow(W - 9, 115, t.accent));
    doc.height = Math.max(140, chipY + (repo.topics.length ? 36 : 12));
  } else {
    doc.add(doc.type.text(ref, 0, 30, label(t.accent, 12, 'mono500')));
    doc.add(arrow(W - 9, 20, t.accent));
    doc.add(doc.type.text(repo.name, 0, 62, nameStyle));
    const desc = clampLines(doc, repo.description ?? 'No description provided.', descStyle, W, 3);
    desc.forEach((ln, j) => doc.add(doc.type.text(ln, 0, 90 + j * 21, descStyle)));
    let y = 90 + desc.length * 21 + 8;
    doc.add(doc.type.text(meta.map(([k, v]) => `${k} ${v}`).join('   '), 0, y + 8, { ...label(t.t3, 10.5), caps: false }));
    y += 22;
    if (repo.topics.length) {
      doc.add(chips(doc, repo.topics, 0, y, W));
      y += 32;
    }
    doc.height = y + 6;
  }
  doc.style(`.rule{stroke-dasharray:${W};animation:hdr 1.2s ${EASE.out} .1s backwards}`, `@keyframes hdr{from{stroke-dashoffset:${W}}}`);
  return doc.render();
}

export const projectsHeader: Module = {
  id: 'projects',
  enabled: (ctx) => ctx.projects.length > 0,
  alt: (ctx) => `Selected work: ${ctx.projects.length} public repositories.`,
  render: (ctx, target, index) => {
    const W = WIDTH[target.layout];
    const doc = new SvgDoc({ width: W, height: 60, title: 'Selected work', desc: 'Selected public repositories', ...target });
    const y = sectionHeader(doc, index, 'Selected Work', `${ctx.projects.length} public repositories`);
    headerMotion(doc);
    doc.height = y - 16;
    return doc.render();
  },
};

/** One module per featured repository, numbered under the section above. */
export function projectCards(ctx: BuildContext): Module[] {
  return ctx.projects.map((repo, i) => ({
    id: `project-${i + 1}`,
    section: false,
    alt: () => `${repo.name}: ${repo.description ?? 'no description'}. ${repo.language ?? ''} ${repo.topics.join(', ')}`.trim(),
    href: () => repo.url,
    render: (c, target) => card(c, target, repo, i),
  }));
}
