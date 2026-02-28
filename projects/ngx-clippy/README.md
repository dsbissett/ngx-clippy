# @dsbissett/ngx-clippy

Angular library that brings classic Microsoft Office assistants (Clippy, Merlin, Genie, and others) to Angular apps.

## Install

```bash
npm install @dsbissett/ngx-clippy
```

## Quick Start

```ts
import { Component, OnInit, effect, viewChild, signal } from '@angular/core';
import { NgxClippyModule, ClippyAgentComponent, AgentLoaderService, AgentConfig, ClippyAgent } from '@dsbissett/ngx-clippy';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgxClippyModule],
  template: `
    <button (click)="show()">Show</button>
    <button (click)="speak()">Speak</button>
    <clippy-agent *ngIf="agentConfig() as config" [agentConfig]="config"></clippy-agent>
  `
})
export class AppComponent implements OnInit {
  readonly agent = viewChild(ClippyAgentComponent);
  readonly agentConfig = signal<AgentConfig | undefined>(undefined);
  private initialShown = false;

  constructor(private readonly agentLoader: AgentLoaderService) {
    // Prevent a first-paint flash at the default position by waiting until
    // both agentConfig and viewChild(agent) are ready, then showing at target coordinates.
    effect(() => {
      const agent = this.agent();
      const config = this.agentConfig();
      if (!agent || !config || this.initialShown) {
        return;
      }

      const [width, height] = config.agentData.framesize;
      const margin = 16;
      const x = Math.max(0, window.innerWidth - width - margin);
      const y = Math.max(0, window.innerHeight - height - margin);
      agent.show({ immediate: true, position: { x, y } });
      this.initialShown = true;
    });
  }

  ngOnInit(): void {
    this.agentLoader.loadAgent(ClippyAgent).subscribe((config) => {
      this.initialShown = false;
      this.agentConfig.set(config);
    });
  }

  show(): void {
    this.agent()?.show();
  }

  showAt(x: number, y: number): void {
    this.agent()?.show({ position: { x, y } });
  }

  speak(): void {
    this.agent()?.speak('Hello from @dsbissett/ngx-clippy!', { tts: true });
  }
}
```

## No-Flash Initial Positioning

If you want a custom initial position on first render, prefer the `effect` pattern above.
It avoids timing races from `setTimeout`/`queueMicrotask` where the child component may not exist yet.

## Available Agents

`ClippyAgent`, `BonziAgent`, `F1Agent`, `GenieAgent`, `GeniusAgent`, `LinksAgent`, `MerlinAgent`, `PeedyAgent`, `RockyAgent`, `RoverAgent`

## IntelliSense Tips

- Built-in loaders include a typed `name`, so `loadAgent(ClippyAgent)` gives strong editor hints and avoids duplicated arguments.
- `loadAgent(name, loader)` still works for compatibility but is deprecated in favor of `loadAgent(loader)`.
- `BuiltInAgentName` is exported for strongly typed agent-name variables when needed.

## Positioning on Show

`show()` supports optional position arguments while keeping existing behavior:

```ts
// Existing behavior (top-center on first show)
agent.show();

// Boolean signature still works
agent.show(true);

// Place agent at specific viewport coordinates
agent.show({ position: { x: 300, y: 120 } });

// Alternate signature with immediate + position
agent.show(false, { x: 300, y: 120 });
```

## Build (Library)

```bash
npm run ng -- build ngx-clippy
```

## License

MIT
