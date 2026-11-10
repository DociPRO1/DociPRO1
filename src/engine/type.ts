/**
 * Typesetting engine: renders text as vector outlines through a per-document
 * glyph atlas.
 *
 * SVGs embedded through <img> on GitHub cannot load web fonts, and system font
 * fallback differs between macOS, Windows, Linux and the mobile apps. Every
 * glyph is therefore converted to a <path> once inside <defs> and placed with
 * <use>, which keeps typography identical on every platform at roughly 30
 * bytes per character. It also lets each glyph be animated individually.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype, { type Font, type Glyph } from 'opentype.js';
import { readKerning } from './gpos.ts';

const require = createRequire(import.meta.url);

export type FontKey = 'sans300' | 'sans400' | 'sans500' | 'mono400' | 'mono500';

const FONT_FILES: Record<FontKey, string> = {
  sans300: '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-300-normal.woff',
  sans400: '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff',
  sans500: '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff',
  mono400: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff',
  mono500: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff',
};

const PREFIX: Record<FontKey, string> = {
  sans300: 'a',
  sans400: 'b',
  sans500: 'c',
  mono400: 'm',
  mono500: 'n',
};

interface LoadedFont {
  key: FontKey;
  font: Font;
  upm: number;
  kern: (a: number, b: number) => number;
  capHeight: number;
}

const cache = new Map<FontKey, LoadedFont>();

export function font(key: FontKey): LoadedFont {
  const hit = cache.get(key);
  if (hit) return hit;
  const bytes = readFileSync(require.resolve(FONT_FILES[key]));
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const f = opentype.parse(ab);
  const loaded: LoadedFont = {
    key,
    font: f,
    upm: f.unitsPerEm,
    kern: key.startsWith('sans') ? readKerning(bytes) : () => 0,
    capHeight: (f.tables as { os2?: { sCapHeight?: number } }).os2?.sCapHeight ?? f.unitsPerEm * 0.7,
  };
  cache.set(key, loaded);
  return loaded;
}

export interface TextStyle {
  font: FontKey;
  size: number;
  /** Letter spacing in em. */
  tracking?: number;
  fill?: string;
  opacity?: number;
  anchor?: 'start' | 'middle' | 'end';
  /** Uppercases the string before setting it. */
  caps?: boolean;
  /** Extra attributes on the run's <g>. */
  attrs?: string;
}

interface Placed {
  id: string | null;
  char: string;
  x: number; // font units
}

const round = (n: number) => Math.round(n * 100) / 100;

export class Typesetter {
  private glyphs = new Map<string, string>();

  /** Lays out a string in font units. */
  private layout(text: string, style: TextStyle): { placed: Placed[]; width: number } {
    const f = font(style.font);
    const str = style.caps ? text.toUpperCase() : text;
    const track = (style.tracking ?? 0) * f.upm;
    const placed: Placed[] = [];
    let x = 0;
    let prev: Glyph | null = null;
    const chars = Array.from(str);
    chars.forEach((ch, i) => {
      const g = f.font.charToGlyph(ch);
      if (!g || (g.index === 0 && ch !== ' ')) {
        throw new Error(`Glyph missing for "${ch}" (U+${ch.codePointAt(0)!.toString(16)}) in ${style.font}`);
      }
      if (prev) x += f.kern(prev.index, g.index);
      const id = `${PREFIX[style.font]}${g.index.toString(36)}`;
      const isBlank = ch === ' ' || ch === ' ';
      if (!isBlank && !this.glyphs.has(id)) {
        const d = g.getPath(0, 0, f.upm).toPathData({ decimalPlaces: 0, optimize: true, flipY: false });
        this.glyphs.set(id, d);
      }
      placed.push({ id: isBlank ? null : id, char: ch, x });
      x += (g.advanceWidth ?? 0) + (i < chars.length - 1 ? track : 0);
      prev = g;
    });
    return { placed, width: x };
  }

  /** Width of a string in px at the style's size. */
  measure(text: string, style: TextStyle): number {
    const f = font(style.font);
    return (this.layout(text, style).width * style.size) / f.upm;
  }

  /** Greedy word wrap; returns lines that fit maxWidth (px). */
  wrap(text: string, style: TextStyle, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (line && this.measure(candidate, style) > maxWidth) {
        lines.push(line);
        line = w;
      } else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }

  /**
   * Places a run of text with its baseline at (x, y).
   * `glyphAttrs` receives each visible glyph's index so callers can attach
   * per-glyph animation classes and timing.
   */
  text(
    text: string,
    x: number,
    y: number,
    style: TextStyle,
    glyphAttrs?: (i: number, char: string) => string,
  ): string {
    const f = font(style.font);
    const { placed, width } = this.layout(text, style);
    const k = style.size / f.upm;
    const anchorShift = style.anchor === 'middle' ? width / 2 : style.anchor === 'end' ? width : 0;
    const fill = style.fill ? ` fill="${style.fill}"` : '';
    const op = style.opacity !== undefined && style.opacity !== 1 ? ` opacity="${style.opacity}"` : '';
    const attrs = style.attrs ? ` ${style.attrs}` : '';
    let n = 0;
    const uses = placed
      .filter((p) => p.id)
      .map((p) => {
        const extra = glyphAttrs ? ` ${glyphAttrs(n++, p.char)}` : '';
        const gx = Math.round(p.x - anchorShift);
        return `<use href="#${p.id}"${gx ? ` x="${gx}"` : ''}${extra}/>`;
      })
      .join('');
    return `<g${fill}${op}${attrs} transform="translate(${round(x)} ${round(y)}) scale(${round(k * 1e4) / 1e4})">${uses}</g>`;
  }

  /** Cap height in px for a style (useful for optical vertical alignment). */
  capHeight(style: TextStyle): number {
    const f = font(style.font);
    return (f.capHeight * style.size) / f.upm;
  }

  defs(): string {
    return Array.from(this.glyphs, ([id, d]) => `<path id="${id}" d="${d}"/>`).join('');
  }
}
