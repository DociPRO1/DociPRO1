# Profile engine

This repository is a GitHub profile. `README.md` is generated, and so are the
SVG plates it shows. They come from a small build pipeline driven by
`profile.config.ts` and live GitHub data, rebuilt daily by GitHub Actions.

```
profile.config.ts ─┐
GitHub data ───────┼─▶ scripts/build.ts ─▶ assets/*.svg  (module × layout × theme)
data/github.json ──┘        (cache)     └▶ README.md     (<picture> markup)
```

## Quick start

```bash
npm ci
npm run build           # fetch data (falls back to cache), render all plates + README
npm run build:offline   # render from data/github.json only, no network
npm run check           # validate assets and README references
npm run typecheck
npm run preview         # preview/index.html: desktop + mobile frames
```

Requires Node 24 or newer. TypeScript runs natively with no build step. The
only runtime dependency is `opentype.js`. Fonts come from pinned
`@fontsource` packages (IBM Plex, SIL OFL).

## Publishing as your profile

GitHub shows a profile README only from a repository named exactly like the
account: **`DociPRO1/DociPRO1`**. This repository is currently
`DociPRO1/DociPRO`, so it has to be renamed (Settings → General → Repository
name) or its contents moved to a new `DociPRO1/DociPRO1` repository. It must
be public.

After the first push, open **Actions → profile → Run workflow** once to
confirm the scheduled job works.

## Editing content

Everything textual lives in `profile.config.ts`:

| Field | Used in |
| --- | --- |
| `name`, `role`, `tagline`, `focus`, `code` | Hero |
| `intro` | 01 Introduction |
| `layers`, `spans` | Hero stations, 02 Expertise stack, 03 matrix columns |
| `stack` | 03 Technology ecosystem: *where* each technology is used, never how well |
| `projects` | Selected work: pinned slugs first, then the best public repos (`auto`) |
| `links` | Connect plate and the plain-text links under it |

Section numbers are assigned automatically. The *Selected work* section only
appears once there is at least one eligible public repository; there are none
today, so it is omitted rather than filled with placeholders.

## Automation

`.github/workflows/profile.yml` runs daily (04:17 UTC), on manual dispatch,
and on pushes that touch sources or config.

- **Token:** the built-in `GITHUB_TOKEN`, used read-only for the GraphQL
  contribution calendar and the public repository list. No secrets to add.
- **Permissions:** `contents: write` only, to commit regenerated files.
- **Fallbacks:** GraphQL, then the public contributions page, then the
  committed snapshot. A GitHub outage cannot blank the profile.
- **Rate limits:** bounded retries with exponential backoff. `Retry-After`
  is honoured, and an exhausted primary limit stops immediately.
- **No pointless commits:** output is deterministic and the snapshot's
  `updated` date only moves when the data changes, so a quiet day produces no
  diff and no commit.
- **No loops:** pushes made with `GITHUB_TOKEN` do not trigger workflows,
  generated paths are not in the `push` filter, and runs are serialised with
  `concurrency`.
- **Supply chain:** actions are pinned to commit SHAs, dependencies are
  locked with exact versions, and `npm ci --ignore-scripts` is used.

`.github/workflows/verify.yml` checks pull requests without network or token,
and fails if the committed README or assets are stale.

## How it works inside GitHub's constraints

GitHub sanitises README HTML: no `<style>`, no `<script>`, no `style=`
attributes. Images are served from the repository and rendered through
`<img>`, so they cannot load fonts or other files. The design works within
that:

- **Typography as geometry.** Every glyph is converted to a path once per
  file (`<defs>`) and placed with `<use>`. Type renders identically on every
  OS and in the mobile app, and each glyph can be animated. Kerning comes
  from the font's GPOS table through a small parser (`src/engine/gpos.ts`),
  because opentype.js does not read Plex's extension-wrapped lookups.
- **Animation** uses CSS inside each SVG, which works for `<img>`-embedded
  SVGs. Every element's resting style is its final state, and animations only
  play *from* an offset. `prefers-reduced-motion` disables all motion, and
  `assets/hero.static.*.svg` are motion-free renders. Browsers pause
  animations in off-screen images and play them when they scroll into view,
  so each plate reveals itself as the reader reaches it.
- **Light/dark × desktop/mobile.** GitHub wraps README pictures in
  `<themed-picture>`. When a user forces a theme, it replaces the **whole**
  `media` attribute of any `<source>` mentioning `prefers-color-scheme`, so a
  combined `(prefers-color-scheme: light) and (max-width: …)` query would lose
  its width condition. Each plate is therefore two pictures: width is decided
  by a theme-free source that swaps the inactive layout for a 1px spacer, and
  theme by plain `prefers-color-scheme` sources. This holds in auto, forced
  light and forced dark modes. See `src/readme.ts`.
- **HTML blocks.** Plates sit inside `<div>` blocks. Inside a Markdown
  paragraph, GitHub wraps each `<img>` in a link to the file, which pulls it
  out of its `<picture>`.

## Verifying

- `npm run check` validates that referenced assets exist, nothing is
  orphaned, there are no scripts or external resources, internal references
  resolve, tags balance, alt text is present, and sizes are within budget.
- `npm run preview` sends the README to GitHub's Markdown API to confirm
  every `<picture>`, `<source media>`, `srcset`, width and link survives the
  real sanitiser, then renders the README in desktop and 390px frames. The
  API itself wraps images in links more aggressively than the live README
  renderer, so the preview displays the README HTML rather than the API
  output.
- Nothing local replaces a look at the live profile after the first push.
  Check github.com in forced light, forced dark and "sync with system", and
  check the mobile layout.

## Layout

```
profile.config.ts        content
src/engine/              type engine, GPOS kerning, SVG document, tokens, shared components
src/modules/             one file per plate (hero, intro, expertise, ecosystem, activity, projects, connect)
src/data/                GitHub fetchers, retry/rate-limit wrapper, stats
src/readme.ts            README composer (<picture> strategy)
scripts/                 build, check, preview
data/github.json         data snapshot (cache + change detection)
assets/                  generated plates. Do not edit by hand
```
