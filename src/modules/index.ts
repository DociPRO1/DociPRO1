import { hero } from './hero.ts';
import { projectsHeader, projectCards } from './projects.ts';
import type { BuildContext, Module } from './context.ts';

/** Keep the profile short; public work appears only when it is available. */
export function resolveModules(ctx: BuildContext): Module[] {
  const list: Module[] = [hero, projectsHeader, ...projectCards(ctx)];
  return list.filter((m) => m.enabled?.(ctx) ?? true);
}
