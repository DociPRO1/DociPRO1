import { hero } from './hero.ts';
import { intro } from './intro.ts';
import { expertise } from './expertise.ts';
import { ecosystem } from './ecosystem.ts';
import { activity } from './activity.ts';
import { projectsHeader, projectCards } from './projects.ts';
import { connect } from './connect.ts';
import type { BuildContext, Module } from './context.ts';

/**
 * Display order. Section numbers are assigned at build time, so removing a
 * module (or having no projects) renumbers the rest automatically.
 */
export function resolveModules(ctx: BuildContext): Module[] {
  const list: Module[] = [hero, intro, expertise, ecosystem, activity, projectsHeader, ...projectCards(ctx), connect];
  return list.filter((m) => m.enabled?.(ctx) ?? true);
}
