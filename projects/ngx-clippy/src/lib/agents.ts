import { from, of } from 'rxjs';

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
};

export const BonziAgent = {
  name: 'Bonzi',
  agent: () => from(import('../agents/bonzi/agent')),
  sound: () => from(import('../agents/bonzi/sounds-ogg')),
  map: () => of('assets/agents/bonzi/map.png')
};

export const F1Agent = {
  name: 'F1',
  agent: () => from(import('../agents/f1/agent')),
  sound: () => from(import('../agents/f1/sounds-ogg')),
  map: () => of('assets/agents/f1/map.png')
};

export const GenieAgent = {
  name: 'Genie',
  agent: () => from(import('../agents/genie/agent')),
  sound: () => from(import('../agents/genie/sounds-ogg')),
  map: () => of('assets/agents/genie/map.png')
};

export const GeniusAgent = {
  name: 'Genius',
  agent: () => from(import('../agents/genius/agent')),
  sound: () => from(import('../agents/genius/sounds-ogg')),
  map: () => of('assets/agents/genius/map.png')
};

export const LinksAgent = {
  name: 'Links',
  agent: () => from(import('../agents/links/agent')),
  sound: () => from(import('../agents/links/sounds-ogg')),
  map: () => of('assets/agents/links/map.png')
};

export const MerlinAgent = {
  name: 'Merlin',
  agent: () => from(import('../agents/merlin/agent')),
  sound: () => from(import('../agents/merlin/sounds-ogg')),
  map: () => of('assets/agents/merlin/map.png')
};

export const PeedyAgent = {
  name: 'Peedy',
  agent: () => from(import('../agents/peedy/agent')),
  sound: () => from(import('../agents/peedy/sounds-ogg')),
  map: () => of('assets/agents/peedy/map.png')
};

export const RockyAgent = {
  name: 'Rocky',
  agent: () => from(import('../agents/rocky/agent')),
  sound: () => from(import('../agents/rocky/sounds-ogg')),
  map: () => of('assets/agents/rocky/map.png')
};

export const RoverAgent = {
  name: 'Rover',
  agent: () => from(import('../agents/rover/agent')),
  sound: () => from(import('../agents/rover/sounds-ogg')),
  map: () => of('assets/agents/rover/map.png')
};

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
};

