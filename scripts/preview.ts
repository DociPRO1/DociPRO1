/**
 * Local preview of the profile as github.com renders it.
 *
 * Rendering: README.md is already pure HTML blocks, so it is shown as-is,
 * styled with github-markdown-css, inside a profile-like frame (desktop) and
 * a 390px iframe (mobile, so <picture> width queries evaluate against the
 * frame, as on a phone).
 *
 * Sanitizer check: the README is also sent to GitHub's Markdown API, and every
 * tag and attribute the design depends on (<picture>, <source media/srcset>,
 * <img width/alt>, links) is verified to survive sanitisation.
 *
 * Why not display the API output directly: the API wraps every <img> in a
 * link to the image file, including images inside <picture>, which detaches
 * them from their <source>s. The live README renderer does not do this for
 * HTML blocks. Popular READMEs with `div > picture` render unwrapped on
 * github.com, which is what makes GitHub's documented light/dark <picture>
 * technique work. Displaying the API output would preview a bug that does
 * not exist on the site.
 *
 *   npm run preview   → preview/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../profile.config.ts';
import { request } from '../src/data/http.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'preview');
const CSS = 'https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown.css';

/** Verifies the attributes the layout depends on survive GitHub's sanitizer. */
async function sanitizerCheck(md: string): Promise<string> {
  let html: string;
  try {
    const res = await request('https://api.github.com/markdown', {
      method: 'POST',
      body: { mode: 'markdown', context: config.repository, text: md },
      accept: 'text/html',
      retries: 1,
    });
    html = await res.text();
  } catch (e) {
    return `skipped (${(e as Error).message})`;
  }
  writeFileSync(join(OUT, 'sanitized.html'), html);
  const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
  const checks: [string, number, number][] = [
    ['<picture>', count(md, /<picture>/g), count(html, /<picture>/g)],
    ['<source media>', count(md, /<source media="/g), count(html, /<source media="/g)],
    ['srcset', count(md, /srcset="/g), count(html, /srcset="/g)],
    ['img width', count(md, /<img [^>]*width="100%"/g), count(html, /<img [^>]*width="100%"/g)],
    ['links', count(md, /<a href="/g), count(html, /<a href="https?:/g)],
  ];
  const failed = checks.filter(([, a, b]) => b < a);
  for (const [name, a, b] of checks) console.log(`  ${b >= a ? '✓' : '✗'} ${name.padEnd(16)} ${b}/${a}`);
  return failed.length ? `FAILED: ${failed.map((f) => f[0]).join(', ')}` : 'all layout attributes survive';
}

const page = (body: string, frame: boolean) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Profile preview</title>
<link rel="stylesheet" href="${CSS}">
<style>
  :root{color-scheme:light dark}
  body{margin:0;background:#fff}
  @media (prefers-color-scheme:dark){body{background:#0d1117}}
  .shell{display:flex;gap:24px;max-width:1280px;margin:0 auto;padding:24px 32px}
  .side{flex:0 0 296px}
  .avatar{width:296px;height:296px;border-radius:50%;border:1px solid #d0d7de55;background:#8881}
  .card{flex:1;min-width:0;border:1px solid #d0d7de;border-radius:6px;padding:24px}
  @media (prefers-color-scheme:dark){.card{border-color:#30363d}}
  .frame .card{border:0;padding:0}
  .frame .shell{padding:16px}
  @media (max-width:767.98px){.side{display:none}.shell{padding:16px}.card{border:0;padding:0}}
  /* GitHub hides themed pictures until its JS runs; without that JS, show them. */
  themed-picture{visibility:visible!important}
</style></head>
<body class="${frame ? 'frame' : ''}"><div class="shell">${frame ? '' : '<aside class="side"><div class="avatar"></div></aside>'}
<main class="card"><article class="markdown-body">${body}</article></main></div></body></html>`;

async function main() {
  const md = readFileSync(join(ROOT, 'README.md'), 'utf8');
  mkdirSync(OUT, { recursive: true });
  const sanitizer = await sanitizerCheck(md);
  const local = md.replace(/<!--[\s\S]*?-->/g, '').replace(/(src|srcset)="(assets\/[^"]+)"/g, '$1="../$2"');
  writeFileSync(join(OUT, 'readme.html'), page(local, false));
  writeFileSync(join(OUT, 'readme-frame.html'), page(local, true));
  writeFileSync(
    join(OUT, 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8"><title>Profile preview</title>
<style>body{margin:0;font:13px ui-monospace,monospace;background:#010409;color:#9198a1}
header{padding:12px 20px;border-bottom:1px solid #30363d}
.row{display:flex;gap:24px;padding:20px;align-items:flex-start}
iframe{border:1px solid #30363d;border-radius:8px;background:#0d1117}
</style></head><body>
<header>Profile preview · GitHub sanitizer: ${sanitizer} · theme follows your OS</header>
<div class="row"><iframe src="readme.html" width="1280" height="4400" title="Desktop"></iframe>
<iframe src="readme-frame.html" width="390" height="4400" title="Mobile"></iframe></div></body></html>`,
  );
  console.log(`✓ preview/index.html · sanitizer: ${sanitizer}`);
  if (sanitizer.startsWith('FAILED')) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
