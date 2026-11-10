/**
 * Build pipeline:  data → stats → plates (module × layout × theme) → README.
 *
 *   npm run build            fetch fresh data (falls back to cache), render everything
 *   npm run build:offline    render from the committed snapshot only
 *
 * Output is deterministic for a given config + snapshot, so CI can commit
 * only when something actually changed.
 */
import { mkdirSync, writeFileSync, readdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../profile.config.ts';
import { refresh } from '../src/data/github.ts';
import { activity, featured } from '../src/data/stats.ts';
import { THEMES, WIDTH, type Layout, type ThemeName } from '../src/engine/theme.ts';
import { composeReadme, asset, SPACER } from '../src/readme.ts';
import { resolveModules } from '../src/modules/index.ts';
import type { BuildContext } from '../src/modules/context.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASSETS = join(ROOT, 'assets');
const offline = process.argv.includes('--offline');

const write = (rel: string, content: string) => {
  const p = join(ROOT, rel);
  const prev = existsSync(p) ? readFileSync(p, 'utf8') : null;
  if (prev !== content) writeFileSync(p, content);
  return content.length;
};

async function main() {
  console.log(`▸ data ${offline ? '(offline)' : ''}`);
  const snapshot = await refresh(config.login, join(ROOT, 'data', 'github.json'), offline);
  console.log(`  calendar: ${snapshot.calendar.length} days (${snapshot.source.calendar}), repos: ${snapshot.repos.length} (${snapshot.source.repos})`);

  const stats = activity(snapshot.calendar, new Date(`${snapshot.updated}T23:59:59Z`));
  const ctx: BuildContext = {
    config,
    snapshot,
    stats,
    projects: featured(config, snapshot.repos),
    date: snapshot.updated,
  };

  mkdirSync(ASSETS, { recursive: true });
  const expected = new Set<string>([SPACER]);
  write(SPACER, `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH.wide}" height="1" viewBox="0 0 ${WIDTH.wide} 1"/>\n`);

  console.log('▸ plates');
  const active = resolveModules(ctx);
  for (const m of active) {
    for (const layout of ['wide', 'compact'] as Layout[]) {
      for (const theme of ['dark', 'light'] as ThemeName[]) {
        const rel = asset(m.id, layout, theme);
        const svg = m.render(ctx, { theme: THEMES[theme], layout, motion: true }, '');
        const bytes = write(rel, svg);
        expected.add(rel);
        if (theme === 'dark') console.log(`  ${rel.padEnd(42)} ${(bytes / 1024).toFixed(1)} KB`);
      }
    }
    // Static fallback of the hero for non-animating contexts (social cards, docs).
    if (m.id === 'hero') {
      for (const theme of ['dark', 'light'] as ThemeName[]) {
        const rel = `assets/hero.static.${theme}.svg`;
        write(rel, m.render(ctx, { theme: THEMES[theme], layout: 'wide', motion: false }, ''));
        expected.add(rel);
      }
    }
  }

  // Remove plates of modules that are no longer rendered.
  for (const f of readdirSync(ASSETS)) {
    if (!expected.has(`assets/${f}`) && f.endsWith('.svg')) rmSync(join(ASSETS, f));
  }

  console.log('▸ README.md');
  const links = config.links.map((l) => ({ label: l.display ?? l.url.replace(/^https?:\/\//, ''), url: l.url }));
  const readme = composeReadme({
    plates: active.map((m) => ({ id: m.id, alt: m.alt(ctx), href: m.href?.(ctx) })),
    links,
    summary: [config.name, config.role, config.tagline, config.intro.statement, config.intro.continuation].filter(Boolean).join(' '),
  });
  write('README.md', readme);
  console.log('✓ done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
