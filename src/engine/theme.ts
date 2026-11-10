/**
 * Design tokens.
 *
 * Every asset is rendered twice, once per palette, and GitHub's <picture>
 * theming chooses between them. Backgrounds stay transparent, so plates sit
 * directly on GitHub's own canvas in every theme variant (default, dimmed,
 * high contrast). `canvas` is used only where a shape needs an opaque fill to
 * hide geometry behind it.
 *
 * One accent colour, International Orange, marks the signal: anything that
 * moves, is live, or is the point of a diagram. Everything else is a tonal
 * ramp of the page foreground.
 */
export type ThemeName = 'dark' | 'light';

export interface Theme {
  name: ThemeName;
  canvas: string;
  t1: string; // primary text, headline geometry
  t2: string; // secondary text
  t3: string; // labels, metadata
  t4: string; // faint geometry: rulers, grid ticks
  line: string; // hairlines
  line2: string; // structural strokes
  accent: string;
  accentDim: string;
  slabTop: string;
  slabSide: string;
  slabFront: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    canvas: '#0d1117',
    t1: '#E9EEF2',
    t2: '#A3ADB8',
    t3: '#7D8792',
    t4: '#3A414B',
    line: '#232A33',
    line2: '#353D47',
    accent: '#FF6A2B',
    accentDim: '#7A3A20',
    slabTop: '#131921',
    slabSide: '#0B0F14',
    slabFront: '#0F141A',
  },
  light: {
    name: 'light',
    canvas: '#ffffff',
    t1: '#0E1116',
    t2: '#4A5360',
    t3: '#6B7480',
    t4: '#C9CFD6',
    line: '#E4E8EC',
    line2: '#CDD3DA',
    accent: '#C7430B',
    accentDim: '#F2C7B3',
    slabTop: '#F7F8FA',
    slabSide: '#E6EAEE',
    slabFront: '#EEF1F4',
  },
};

/** Two layout sizes. GitHub's README column collapses below 768px viewport. */
export type Layout = 'wide' | 'compact';
export const WIDTH: Record<Layout, number> = { wide: 1000, compact: 440 };
export const BREAKPOINT = 768;
