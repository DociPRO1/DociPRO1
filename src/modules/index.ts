import { hero } from './hero.ts';
import { expertise } from './expertise.ts';
import { ecosystem } from './ecosystem.ts';
import { activity } from './activity.ts';
import { connect } from './connect.ts';
import { projectsHeader, projectCards } from './projects.ts';
import type { BuildContext, Module } from './context.ts';

/** Keep the animated sections; the introduction is folded into the hero. */
export function resolveModules(ctx: BuildContext): Module[] {
  const list: Module[] = [hero, expertise, ecosystem, activity, projectsHeader, ...projectCards(ctx), connect];
  return list.filter((m) => m.enabled?.(ctx) ?? true);
}
