import { Typesetter } from './type.ts';
import type { Theme, Layout } from './theme.ts';

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Shared motion vocabulary. Every element's base style is its final state. */
export const EASE = {
  out: 'cubic-bezier(.16,.84,.24,1)',
  inOut: 'cubic-bezier(.65,0,.35,1)',
  linear: 'linear',
};

const REDUCED_MOTION =
  '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}';

export interface DocOptions {
  width: number;
  height: number;
  title: string;
  desc: string;
  theme: Theme;
  layout: Layout;
  /** false renders the static fallback: same composition, no animation CSS. */
  motion: boolean;
}

/**
 * Accumulates one SVG file. Text, geometry and CSS are collected separately
 * and serialised once, so glyph defs are shared by every text run in the file.
 */
export class SvgDoc {
  readonly type = new Typesetter();
  readonly theme: Theme;
  readonly layout: Layout;
  readonly motion: boolean;
  width: number;
  height: number;
  private title: string;
  private desc: string;
  private defs: string[] = [];
  private css: string[] = [];
  private body: string[] = [];

  constructor(o: DocOptions) {
    this.width = o.width;
    this.height = o.height;
    this.title = o.title;
    this.desc = o.desc;
    this.theme = o.theme;
    this.layout = o.layout;
    this.motion = o.motion;
  }

  add(...parts: string[]) {
    this.body.push(...parts);
    return this;
  }

  def(...parts: string[]) {
    this.defs.push(...parts);
    return this;
  }

  /** CSS is dropped entirely for static renders. */
  style(...rules: string[]) {
    if (this.motion) this.css.push(...rules);
    return this;
  }

  render(): string {
    const w = r2(this.width);
    const h = r2(Math.ceil(this.height));
    const css = this.css.length ? `<style>${this.css.join('')}${REDUCED_MOTION}</style>` : '';
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d" fill="none">` +
      `<title id="t">${esc(this.title)}</title><desc id="d">${esc(this.desc)}</desc>` +
      css +
      `<defs>${this.type.defs()}${this.defs.join('')}</defs>` +
      this.body.join('') +
      `</svg>\n`
    );
  }
}
