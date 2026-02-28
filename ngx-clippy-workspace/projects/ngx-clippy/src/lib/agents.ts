import { from, of } from 'rxjs';

/**
 * Agent loader configurations for all available agents.
 *
 * AVIF sprite-sheets are served as static assets (copied by ng-package.json
 * from src/agents to dist/ngx-clippy/assets/agents, then by the app's
 * angular.json to assets/agents at runtime). The map loader returns a static
 * URL via RxJS `of()` to avoid dynamic AVIF imports during the library build.
 */

export const ClippyAgent = {
  agent: () => from(import('../agents/clippy/agent')),
  sound: () => from(import('../agents/clippy/sounds-ogg')),
  map: () => of('assets/agents/clippy/map.avif')
};

export const BonziAgent = {
  agent: () => from(import('../agents/bonzi/agent')),
  sound: () => from(import('../agents/bonzi/sounds-ogg')),
  map: () => of('assets/agents/bonzi/map.avif')
};

export const F1Agent = {
  agent: () => from(import('../agents/f1/agent')),
  sound: () => from(import('../agents/f1/sounds-ogg')),
  map: () => of('assets/agents/f1/map.avif')
};

export const GenieAgent = {
  agent: () => from(import('../agents/genie/agent')),
  sound: () => from(import('../agents/genie/sounds-ogg')),
  map: () => of('assets/agents/genie/map.avif')
};

export const GeniusAgent = {
  agent: () => from(import('../agents/genius/agent')),
  sound: () => from(import('../agents/genius/sounds-ogg')),
  map: () => of('assets/agents/genius/map.avif')
};

export const LinksAgent = {
  agent: () => from(import('../agents/links/agent')),
  sound: () => from(import('../agents/links/sounds-ogg')),
  map: () => of('assets/agents/links/map.avif')
};

export const MerlinAgent = {
  agent: () => from(import('../agents/merlin/agent')),
  sound: () => from(import('../agents/merlin/sounds-ogg')),
  map: () => of('assets/agents/merlin/map.avif')
};

export const PeedyAgent = {
  agent: () => from(import('../agents/peedy/agent')),
  sound: () => from(import('../agents/peedy/sounds-ogg')),
  map: () => of('assets/agents/peedy/map.avif')
};

export const RockyAgent = {
  agent: () => from(import('../agents/rocky/agent')),
  sound: () => from(import('../agents/rocky/sounds-ogg')),
  map: () => of('assets/agents/rocky/map.avif')
};

export const RoverAgent = {
  agent: () => from(import('../agents/rover/agent')),
  sound: () => from(import('../agents/rover/sounds-ogg')),
  map: () => of('assets/agents/rover/map.avif')
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
