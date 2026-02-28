import { from, of } from 'rxjs';
import type { NamedAgentLoaders } from './services/agent-loader.service';

/**
 * Agent loader configurations for all available agents.
 *
 * PNG sprite-sheets are served as static assets (copied by ng-package.json
 * from src/agents to dist/ngx-clippy/assets/agents, then by the app's
 * angular.json to assets/agents at runtime). The map loader returns a static
 * URL via RxJS `of()` to avoid dynamic image imports during the library build.
 */

export const ClippyAgent = {
  name: 'Clippy',
  agent: () => from(import('../agents/clippy/agent')),
  sound: () => from(import('../agents/clippy/sounds-ogg')),
  map: () => of('assets/agents/clippy/map.png')
} satisfies NamedAgentLoaders<'Clippy'>;

export const BonziAgent = {
  name: 'Bonzi',
  agent: () => from(import('../agents/bonzi/agent')),
  sound: () => from(import('../agents/bonzi/sounds-ogg')),
  map: () => of('assets/agents/bonzi/map.png')
} satisfies NamedAgentLoaders<'Bonzi'>;

export const F1Agent = {
  name: 'F1',
  agent: () => from(import('../agents/f1/agent')),
  sound: () => from(import('../agents/f1/sounds-ogg')),
  map: () => of('assets/agents/f1/map.png')
} satisfies NamedAgentLoaders<'F1'>;

export const GenieAgent = {
  name: 'Genie',
  agent: () => from(import('../agents/genie/agent')),
  sound: () => from(import('../agents/genie/sounds-ogg')),
  map: () => of('assets/agents/genie/map.png')
} satisfies NamedAgentLoaders<'Genie'>;

export const GeniusAgent = {
  name: 'Genius',
  agent: () => from(import('../agents/genius/agent')),
  sound: () => from(import('../agents/genius/sounds-ogg')),
  map: () => of('assets/agents/genius/map.png')
} satisfies NamedAgentLoaders<'Genius'>;

export const LinksAgent = {
  name: 'Links',
  agent: () => from(import('../agents/links/agent')),
  sound: () => from(import('../agents/links/sounds-ogg')),
  map: () => of('assets/agents/links/map.png')
} satisfies NamedAgentLoaders<'Links'>;

export const MerlinAgent = {
  name: 'Merlin',
  agent: () => from(import('../agents/merlin/agent')),
  sound: () => from(import('../agents/merlin/sounds-ogg')),
  map: () => of('assets/agents/merlin/map.png')
} satisfies NamedAgentLoaders<'Merlin'>;

export const PeedyAgent = {
  name: 'Peedy',
  agent: () => from(import('../agents/peedy/agent')),
  sound: () => from(import('../agents/peedy/sounds-ogg')),
  map: () => of('assets/agents/peedy/map.png')
} satisfies NamedAgentLoaders<'Peedy'>;

export const RockyAgent = {
  name: 'Rocky',
  agent: () => from(import('../agents/rocky/agent')),
  sound: () => from(import('../agents/rocky/sounds-ogg')),
  map: () => of('assets/agents/rocky/map.png')
} satisfies NamedAgentLoaders<'Rocky'>;

export const RoverAgent = {
  name: 'Rover',
  agent: () => from(import('../agents/rover/agent')),
  sound: () => from(import('../agents/rover/sounds-ogg')),
  map: () => of('assets/agents/rover/map.png')
} satisfies NamedAgentLoaders<'Rover'>;

/**
 * All available agents
 */
export const AllAgents = {
  Clippy: ClippyAgent,
  Bonzi: BonziAgent,
  F1: F1Agent,
  Genie: GenieAgent,
  Genius: GeniusAgent,
  Links: LinksAgent,
  Merlin: MerlinAgent,
  Peedy: PeedyAgent,
  Rocky: RockyAgent,
  Rover: RoverAgent
} as const;

/**
 * Union of built-in agent names (e.g. "Clippy" | "Merlin").
 */
export type BuiltInAgentName = keyof typeof AllAgents;

