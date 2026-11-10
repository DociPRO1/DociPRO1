import type { LayerId } from './engine/kit.ts';

export interface Layer {
  id: LayerId;
  /** Short layer name used in diagrams (e.g. "Silicon"). */
  name: string;
  /** Expertise domain mapped onto this layer. */
  domain: string;
  /** One line describing the domain's scope. */
  scope: string;
}

/** A discipline that cuts across several layers rather than living in one. */
export interface Span {
  name: string;
  from: LayerId;
  to: LayerId;
  scope: string;
}

export interface Technology {
  name: string;
  /** Category, not proficiency: Language, Runtime, Database, Protocol… */
  kind: string;
  /** Layers of the stack this technology is used in. */
  layers: LayerId[];
}

export interface Link {
  label: string;
  url: string;
  /** Text shown in the plate; defaults to the URL without protocol. */
  display?: string;
}

export interface ProfileConfig {
  login: string;
  /** Repository hosting this profile; must be <login>/<login> for GitHub to show it. */
  repository: string;
  name: string;
  role: string;
  /** Part-number-style identifier printed in the meta bar. */
  code: string;
  tagline: string;
  focus: string[];
  intro: {
    statement: string;
    /** Second half of the statement, set in the secondary tone. */
    continuation: string;
    facts: { label: string; value: string }[];
  };
  layers: Layer[];
  spans: Span[];
  stack: Technology[];
  projects: {
    /** "owner/repo" slugs pinned first, in order. */
    featured: string[];
    /** Also fill remaining slots with the account's best public repositories. */
    auto: boolean;
    limit: number;
    /** Repositories never shown (the profile repo is always excluded). */
    exclude: string[];
  };
  links: Link[];
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface RepoInfo {
  fullName: string;
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  pushedAt: string;
  isFork: boolean;
  isArchived: boolean;
}

export interface Snapshot {
  version: 1;
  login: string;
  /** Date the data last changed (YYYY-MM-DD); stays put when a fetch returns identical data. */
  updated: string;
  source: { calendar: 'graphql' | 'html' | 'cache' | 'none'; repos: 'rest' | 'cache' | 'none' };
  calendar: CalendarDay[];
  repos: RepoInfo[];
}
