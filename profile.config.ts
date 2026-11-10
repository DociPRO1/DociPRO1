/**
 * Profile content: the one file to edit.
 *
 * Everything rendered in README.md and assets/ comes from here plus live
 * GitHub data (contribution calendar, public repositories). After editing,
 * run `npm run build`, or let the scheduled workflow rebuild it.
 *
 * Rules this content follows on purpose:
 *  - No proficiency percentages or skill bars. `stack[].layers` says where a
 *    technology is used, not how well.
 *  - No invented projects. The projects module is filled from real public
 *    repositories and is left out of the README when there are none.
 */
import type { ProfileConfig } from './src/types.ts';

const config: ProfileConfig = {
  login: 'DociPRO1',
  repository: 'DociPRO1/DociPRO1',
  name: 'Filip Doci',
  role: 'Software Engineer',
  code: 'FD-01',
  tagline: 'Software systems, engineered from silicon to screen.',
  focus: ['Architecture', 'Cloud', 'Embedded'],

  intro: {
    statement: 'I design and build software systems across the full depth of the stack',
    continuation:
      'from firmware on microcontrollers, through device fleets and distributed services, to the cloud infrastructure and interfaces that operate them.',
    facts: [
      { label: 'Practice', value: 'Software architecture and full-stack delivery' },
      { label: 'Range', value: 'Embedded firmware to cloud platforms' },
      { label: 'Method', value: 'Explicit boundaries, measured trade-offs, automated delivery' },
    ],
  },

  // The stack, bottom (L0) to top (L5). Each expertise domain lives on a layer.
  layers: [
    { id: 'L0', name: 'Silicon', domain: 'Embedded Systems', scope: 'Firmware, microcontrollers, hardware interfaces' },
    { id: 'L1', name: 'Edge', domain: 'IoT Systems', scope: 'Device fleets, telemetry, edge-to-cloud messaging' },
    { id: 'L2', name: 'Infrastructure', domain: 'Cloud Infrastructure', scope: 'Provisioning, networking, deployment pipelines' },
    { id: 'L3', name: 'Distribution', domain: 'Distributed Systems', scope: 'Event-driven services, messaging, consistency' },
    { id: 'L4', name: 'Services', domain: 'Backend Engineering', scope: 'APIs, data modelling, persistence, integration' },
    { id: 'L5', name: 'Interface', domain: 'Full Stack Development', scope: 'Web and mobile applications, end to end' },
  ],

  // Disciplines that cut across layers.
  spans: [
    { name: 'Software Architecture', from: 'L0', to: 'L5', scope: 'Decomposition, boundaries and trade-offs across every layer' },
    { name: 'Full Stack', from: 'L4', to: 'L5', scope: 'Services and interfaces delivered together' },
  ],

  // Technologies and where in the stack they are used. Order is display order.
  stack: [
    { name: 'TypeScript / JavaScript', kind: 'Language', layers: ['L4', 'L5'] },
    { name: 'Python', kind: 'Language', layers: ['L4'] },
    { name: 'Node.js', kind: 'Runtime', layers: ['L3', 'L4'] },
    { name: 'React / Next.js', kind: 'UI framework', layers: ['L5'] },
    { name: 'React Native', kind: 'Mobile framework', layers: ['L5'] },
    { name: 'PostgreSQL', kind: 'Database', layers: ['L4'] },
    { name: 'MQTT', kind: 'Protocol', layers: ['L0', 'L1', 'L3'] },
    { name: 'Docker', kind: 'Containers', layers: ['L2', 'L3'] },
    { name: 'AWS', kind: 'Cloud platform', layers: ['L1', 'L2', 'L3'] },
    { name: 'GitHub Actions', kind: 'CI / CD', layers: ['L2'] },
  ],

  projects: {
    featured: [],
    auto: true,
    limit: 4,
    // The profile repository (<login>/<login>) is always excluded automatically.
    exclude: [],
  },

  links: [{ label: 'GitHub', url: 'https://github.com/DociPRO1', display: 'github.com/DociPRO1' }],
};

export default config;
