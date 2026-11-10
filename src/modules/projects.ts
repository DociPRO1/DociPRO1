/** Linked public repositories, rendered only when real work is available. */
import { SvgDoc } from '../engine/svg.ts';
import { WIDTH } from '../engine/theme.ts';
import type { TextStyle } from '../engine/type.ts';
import type { Module, BuildContext, RenderTarget } from './context.ts';
import type { RepoInfo } from '../types.ts';

function card(target: RenderTarget, repo: RepoInfo): string {
  const compact = target.layout === 'compact';
  const W = WIDTH[target.layout];
  const doc = new SvgDoc({ width: W, height: 140, title: repo.name, desc: repo.description ?? repo.fullName, ...target });
  const t = doc.theme;
  const name: TextStyle = { font: 'sans500', size: compact ? 24 : 28, tracking: -0.02, fill: t.t1 };
  const body: TextStyle = { font: 'sans400', size: compact ? 17 : 20, fill: t.t2 };
  let y = 30;
  for (const line of doc.type.wrap(repo.name, name, W - 36)) {
    doc.add(doc.type.text(line, 4, y, name));
    y += 34;
  }
  doc.add(`<path d="M${W - 19} 29l12 -12m-12 0h12v12" stroke="${t.accent}" stroke-width="1.5"/>`);
  const lines = doc.type.wrap(repo.description ?? repo.fullName, body, W - 8);
  const visible = lines.slice(0, 2);
  if (lines.length > 2) {
    let last = visible[1]!;
    while (last && doc.type.measure(`${last}…`, body) > W - 8) last = last.slice(0, -1);
    visible[1] = `${last.trimEnd()}…`;
  }
  for (const line of visible) {
    doc.add(doc.type.text(line, 4, y, body));
    y += 27;
  }
  if (repo.language) {
    y += 5;
    doc.add(doc.type.text(repo.language, 4, y, { font: 'sans400', size: 15, fill: t.t3 }));
    y += 22;
  }
  doc.height = y + 16;
  return doc.render();
}

export const projectsHeader: Module = {
  id: 'projects',
  enabled: (ctx) => ctx.projects.length > 0,
  alt: () => 'Selected work',
  render: (_ctx, target) => {
    const doc = new SvgDoc({ width: WIDTH[target.layout], height: 54, title: 'Selected work', desc: 'Public repositories', ...target });
    doc.add(doc.type.text('Selected work', 4, 30, { font: 'sans500', size: 22, fill: doc.theme.t1 }));
    return doc.render();
  },
};

export function projectCards(ctx: BuildContext): Module[] {
  return ctx.projects.map((repo, i) => ({
    id: `project-${i + 1}`,
    section: false,
    alt: () => `${repo.name}: ${repo.description ?? repo.fullName}${repo.language ? ` (${repo.language})` : ''}`,
    href: () => repo.url,
    render: (_ctx, target) => card(target, repo),
  }));
}
