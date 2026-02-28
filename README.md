# ngx-clippy

[![CI](https://github.com/dsbissett/ngx-clippy/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dsbissett/ngx-clippy/actions/workflows/ci.yml)
[![Release](https://github.com/dsbissett/ngx-clippy/actions/workflows/release.yml/badge.svg)](https://github.com/dsbissett/ngx-clippy/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/ngx-clippy.svg)](https://www.npmjs.com/package/ngx-clippy)
[![npm downloads](https://img.shields.io/npm/dm/ngx-clippy.svg)](https://www.npmjs.com/package/ngx-clippy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This repository is an Angular workspace with two projects:

- `projects/ngx-clippy`: the reusable Angular library.
- `projects/demo`: the demo app used to exercise and validate the library.

## Project Structure

```text
./
  angular.json
  tsconfig.json
  projects/
    ngx-clippy/
      src/
        public-api.ts
        agents/
          <agent-name>/
            agent.ts
            sounds-ogg.ts
            map.avif
        lib/
          components/
            clippy-agent/
              clippy-agent.component.ts
          services/
            agent-loader.service.ts
            animation.service.ts
            speech-balloon.service.ts
            action-queue.service.ts
            drag-drop.service.ts
            text-to-speech.service.ts
          agents.ts
    demo/
      src/
        app/
          app.ts
          app.html
          app.css
```

## `ngx-clippy` vs `demo`

### `projects/ngx-clippy` (Library)

- Contains the standalone `ClippyAgentComponent`.
- Exposes services and models for loading and controlling agents.
- Contains all agent data (animations, sound maps, sprite maps).
- Built as a package (`ng build ngx-clippy`) for reuse by apps.

### `projects/demo` (Application)

- Imports and uses the library.
- Shows how to load agents dynamically via `AgentLoaderService`.
- Provides UI buttons to run actions (`show`, `hide`, `speak`, `move`, named animations).
- Serves as an integration test bed for behavior and UX.

## What `public-api.ts` Is For

`projects/ngx-clippy/src/public-api.ts` is the library entry point (the public surface).

- It re-exports everything consumers should import.
- It hides internal file layout from library users.
- `ng-packagr` uses this file to build the published package API.

In practice, this is why app code can import:

```ts
import { ClippyAgentComponent, AgentLoaderService, ClippyAgent } from 'ngx-clippy';
```

instead of deep internal paths.

## How Agent Loading Works

- `lib/agents.ts` defines loader objects (`ClippyAgent`, `BonziAgent`, etc.).
- Each loader provides `agent`, `sound`, and `map` sources.
- `AgentLoaderService.loadAgent()` resolves those sources with RxJS and returns `Observable<AgentConfig>`.
- `ClippyAgentComponent` receives `AgentConfig` and renders/controls the character.

## Example: Using `ngx-clippy` in an Angular Component

```ts
import { Component, OnInit, viewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgxClippyModule,
  ClippyAgentComponent,
  AgentLoaderService,
  AgentConfig,
  ClippyAgent
} from 'ngx-clippy';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgxClippyModule],
  template: `
    <button (click)="show()">Show</button>
    <button (click)="move()">Move Random</button>
    <button (click)="speak()">Speak</button>
    <clippy-agent *ngIf="agentConfig() as config" [agentConfig]="config"></clippy-agent>
  `
})
export class AppComponent implements OnInit {
  readonly agent = viewChild(ClippyAgentComponent);
  readonly agentConfig = signal<AgentConfig | undefined>(undefined);

  constructor(private agentLoader: AgentLoaderService) {}

  ngOnInit(): void {
    this.agentLoader.loadAgent('Clippy', ClippyAgent).subscribe(config => {
      this.agentConfig.set(config);
      this.agent()?.show(true);
    });
  }

  show(): void {
    this.agent()?.show();
  }

  move(): void {
    const x = Math.random() * (window.innerWidth - 200);
    const y = Math.random() * (window.innerHeight - 200);
    this.agent()?.moveTo(x, y);
  }

  speak(): void {
    this.agent()?.speak('Hello from ngx-clippy!', { tts: true });
  }
}
```

## Example: Local Workspace Import (When Developing the Library)

When developing inside this monorepo, you can import from the local public API file:

```ts
import {
  NgxClippyModule,
  ClippyAgentComponent,
  AgentLoaderService,
  ClippyAgent
} from '../../../ngx-clippy/src/public-api';
```

This bypasses package alias resolution in editors that are not loading workspace `tsconfig` path mappings.

## Build and Run

- Start demo app: `npm run ng -- serve demo`
- Build demo app: `npm run ng -- build demo`
- Build library: `npm run ng -- build ngx-clippy`
- Run all Jasmine unit tests: `npm run test:ci`
- Run library Jasmine tests: `npm run test:unit:ci`
- Run demo Jasmine tests: `npm run test:demo:ci`
