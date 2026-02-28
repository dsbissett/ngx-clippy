# @dsbissett/ngx-clippy

Angular library that brings classic Microsoft Office assistants (Clippy, Merlin, Genie, and others) to Angular apps.

## Install

```bash
npm install @dsbissett/ngx-clippy
```

## Quick Start

```ts
import { Component, OnInit, viewChild, signal } from '@angular/core';
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

  constructor(private readonly agentLoader: AgentLoaderService) {}

  ngOnInit(): void {
    this.agentLoader.loadAgent('Clippy', ClippyAgent).subscribe((config) => {
      this.agentConfig.set(config);
      this.agent()?.show(true);
    });
  }

  show(): void {
    this.agent()?.show();
  }

  speak(): void {
    this.agent()?.speak('Hello from @dsbissett/ngx-clippy!', { tts: true });
  }
}
```

## Available Agents

`ClippyAgent`, `BonziAgent`, `F1Agent`, `GenieAgent`, `GeniusAgent`, `LinksAgent`, `MerlinAgent`, `PeedyAgent`, `RockyAgent`, `RoverAgent`

## Build (Library)

```bash
npm run ng -- build ngx-clippy
```

## License

MIT
