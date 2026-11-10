import type { ProfileConfig, Snapshot } from '../types.ts';
import type { ActivityStats } from '../data/stats.ts';
import type { RepoInfo } from '../types.ts';
import type { Layout, Theme } from '../engine/theme.ts';

export interface BuildContext {
  config: ProfileConfig;
  snapshot: Snapshot;
  stats: ActivityStats;
  projects: RepoInfo[];
  /** YYYY-MM-DD of the data, used for revision stamps. */
  date: string;
}

export interface RenderTarget {
  theme: Theme;
  layout: Layout;
  motion: boolean;
}

/** A module produces one plate in all of its variants. */
export interface Module {
  id: string;
  /** Alt text for the plate (the full information, for screen readers). */
  alt: (ctx: BuildContext) => string;
  /** Whether the module has content to show at all. */
  enabled?: (ctx: BuildContext) => boolean;
  render: (ctx: BuildContext, target: RenderTarget, index: string) => string;
  /** false for plates that continue the previous section (project cards). */
  section?: boolean;
  /** Optional link wrapping the plate. */
  href?: (ctx: BuildContext) => string | undefined;
}

export const rev = (date: string) => `REV ${date.slice(0, 7).replace('-', '.')}`;
