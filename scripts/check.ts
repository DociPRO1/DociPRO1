/**
 * Validates the generated output before it is committed:
 *  - every asset referenced by README.md exists, and every asset is referenced
 *  - each SVG is well-formed enough to render as an image: a single root,
 *    a viewBox, a title, and no scripts, external resources or foreignObject
 *    (GitHub serves SVGs with a strict CSP; any of these would break or be blocked)
 *  - every internal href="#id" / url(#id) reference resolves
 *  - per-file and total size budgets
 *  - README alt text present on every visible plate
 *
 *   npm run check   (exit code 1 on any failure)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAX_FILE = 160 * 1024;
const MAX_TOTAL = 2 * 1024 * 1024;

const errors: string[] = [];
const fail = (m: string) => errors.push(m);

const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const referenced = new Set([...readme.matchAll(/(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]!));
const files = readdirSync(join(ROOT, 'assets')).filter((f) => f.endsWith('.svg'));
const onDisk = new Set(files.map((f) => `assets/${f}`));

for (const ref of referenced) {
  if (/^https?:/.test(ref)) fail(`README references a remote asset: ${ref}`);
  else if (!onDisk.has(ref)) fail(`README references a missing asset: ${ref}`);
}
for (const f of onDisk) {
  if (!referenced.has(f) && !f.includes('.static.')) fail(`Unreferenced asset: ${f}`);
}

for (const m of readme.matchAll(/<img ([^>]*)>/g)) {
  const attrs = m[1]!;
  if (!/\balt="/.test(attrs)) fail(`<img> without alt: ${attrs.slice(0, 60)}`);
  const src = /src="([^"]+)"/.exec(attrs)?.[1] ?? '';
  if (!src.includes('spacer') && /\balt=""/.test(attrs)) fail(`Visible plate with empty alt: ${src}`);
}

let total = 0;
for (const f of files) {
  const path = join(ROOT, 'assets', f);
  const svg = readFileSync(path, 'utf8');
  const size = statSync(path).size;
  total += size;
  if (size > MAX_FILE) fail(`${f}: ${(size / 1024).toFixed(1)} KB exceeds ${MAX_FILE / 1024} KB`);
  if (!svg.startsWith('<svg ') || (svg.match(/<svg[\s>]/g) ?? []).length !== 1) fail(`${f}: expected exactly one root <svg>`);
  if (!/viewBox="0 0 [\d.]+ [\d.]+"/.test(svg)) fail(`${f}: missing viewBox`);
  if (!f.startsWith('spacer') && !/<title[^>]*>[^<]+<\/title>/.test(svg)) fail(`${f}: missing <title>`);
  if (/<script|<foreignObject|\bon[a-z]+=/i.test(svg)) fail(`${f}: contains script/foreignObject/event handler`);
  if (/(?:href|src)="(?!#)[^"]+"|url\((?!#)/.test(svg) || /@import|@font-face/.test(svg)) fail(`${f}: references an external resource`);
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) {
    if (!ids.has(m[1]!)) {
      fail(`${f}: dangling reference #${m[1]}`);
      break;
    }
  }
  // Tag balance (cheap well-formedness check; the generator emits no text nodes with '<').
  const opens = (svg.match(/<[a-zA-Z][^>]*[^/]>/g) ?? []).filter((t) => !t.startsWith('<svg')).length;
  const closes = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).filter((t) => t !== '</svg>').length;
  if (opens !== closes) fail(`${f}: unbalanced tags (${opens} open, ${closes} close)`);
}
if (total > MAX_TOTAL) fail(`assets total ${(total / 1024).toFixed(0)} KB exceeds budget`);

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${files.length} assets, ${(total / 1024).toFixed(0)} KB total, ${referenced.size} README references, all valid`);
