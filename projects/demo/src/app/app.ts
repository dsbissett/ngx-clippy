import { Component, OnInit, OnDestroy, viewChild, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import {
  NgxClippyModule,
  ClippyAgentComponent,
  AgentLoaderService,
  AgentLoaders,
  ClippyAgent,
  BonziAgent,
  F1Agent,
  MerlinAgent,
  GenieAgent,
  GeniusAgent,
  LinksAgent,
  PeedyAgent,
  RockyAgent,
  RoverAgent,
  AgentConfig
} from '../../../ngx-clippy/src/public-api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgxClippyModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  /** Signal viewChild — replaces @ViewChild(ClippyAgentComponent) */
  readonly agent = viewChild(ClippyAgentComponent);

  readonly agentConfig = signal<AgentConfig | undefined>(undefined);
  readonly availableAnimations = computed(() => {
    const config = this.agentConfig();
    if (!config) {
      return [] as string[];
    }
    return Object.keys(config.agentData.animations).sort((a, b) => a.localeCompare(b));
  });

  readonly availableAgents: ReadonlyArray<{
    name: string;
    loader: AgentLoaders;
  }> = [
    { name: 'Clippy', loader: ClippyAgent },
    { name: 'Bonzi', loader: BonziAgent },
    { name: 'F1', loader: F1Agent },
    { name: 'Genie', loader: GenieAgent },
    { name: 'Genius', loader: GeniusAgent },
    { name: 'Links', loader: LinksAgent },
    { name: 'Merlin', loader: MerlinAgent },
    { name: 'Peedy', loader: PeedyAgent },
    { name: 'Rocky', loader: RockyAgent },
    { name: 'Rover', loader: RoverAgent }
  ];

  title = 'ngx-clippy Demo';

  /**
   * Funnels all load requests through switchMap so that clicking a new agent
   * button cancels any in-flight load, preventing the race condition where
   * the slower load overwrites the faster one.
   */
  private readonly loadRequest$ = new Subject<Observable<AgentConfig>>();
  private readonly destroy$ = new Subject<void>();
  private pendingAgentActions: Array<{
    name: string;
    run: (agent: ClippyAgentComponent) => void;
  }> = [];

  constructor(private agentLoader: AgentLoaderService) {
    effect(() => {
      const agent = this.agent();
      if (!agent || this.pendingAgentActions.length === 0) {
        return;
      }

      const actions = [...this.pendingAgentActions];
      this.pendingAgentActions = [];
      console.log(`[Demo] Agent ready. Flushing ${actions.length} queued action(s).`);

      actions.forEach(action => {
        console.log(`[Demo] Running queued action: ${action.name}`);
        action.run(agent);
      });
    });

    this.loadRequest$.pipe(
      switchMap(load$ => load$),
      takeUntil(this.destroy$)
    ).subscribe((config: AgentConfig) => {
      console.log(`[Demo] Agent loaded: ${config.name}`);

      // Apply the latest resolved config immediately.
      // ClippyAgentComponent already handles in-place reinitialization when agentConfig changes.
      this.agentConfig.set(config);
      this.showWelcome();
    });
  }

  ngOnInit(): void {
    const firstAgent = this.availableAgents[0];
    if (firstAgent) {
      this.loadAgent(firstAgent);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAgent(agentOption: { name: string; loader: AgentLoaders }): void {
    this.requestAgentLoad(this.agentLoader.loadAgent(agentOption.loader));
  }

  showWelcome(): void {
    this.runWithAgent('showWelcome', (agent) => {
      agent.show(true);
      agent.speak('Hello! I\'m here to help. Try the buttons below!');
    });
  }

  playAnimation(): void {
    this.runWithAgent('playAnimation', (agent) => {
      agent.animate();
    });
  }

  speak(): void {
    this.runWithAgent('speak', (agent) => {
      agent.speak('Bitches ain\'t shit and they ain\'t saying nothing.  A hundred motherfuckers can\'t tell me nothing. I beez in the trap, bee beez in the trap', { tts: true });
    });
  }

  moveAgent(): void {
    const x = Math.random() * (window.innerWidth - 200);
    const y = Math.random() * (window.innerHeight - 200);
    this.runWithAgent('moveAgent', (agent) => {
      agent.moveTo(x, y);
    });
  }

  hideAgent(): void {
    this.runWithAgent('hideAgent', (agent) => {
      agent.hide();
    });
  }

  showAgent(): void {
    this.runWithAgent('showAgent', (agent) => {
      agent.show();
    });
  }

  playNamedAnimation(animationName: string): void {
    this.runWithAgent(`play:${animationName}`, (agent) => {
      if (animationName === 'Show') {
        agent.show();
        return;
      }

      if (animationName === 'Hide') {
        agent.hide();
        return;
      }

      // Keep individual action buttons independent so one long/risky action
      // does not block the next button click.
      agent.stop();
      agent.show(true);

      const started = agent.play(animationName, 5000);
      if (!started) {
        console.warn(`[Demo] Animation could not be played: ${animationName}`);
      }
    });
  }

  stopCurrentAction(): void {
    this.runWithAgent('stopCurrentAction', (agent) => {
      agent.stopCurrent();
    });
  }

  stopAllActions(): void {
    this.runWithAgent('stopAllActions', (agent) => {
      agent.stop();
    });
  }

  closeSpeechBalloon(): void {
    this.runWithAgent('closeSpeechBalloon', (agent) => {
      agent.closeBalloon();
    });
  }

  isAgentReady(): boolean {
    return !!this.agent();
  }

  isCurrentAgent(name: string): boolean {
    return this.agentConfig()?.name === name;
  }

  trackByAgentName(_index: number, agentOption: { name: string }): string {
    return agentOption.name;
  }

  trackByValue(_index: number, value: string): string {
    return value;
  }

  private requestAgentLoad(load$: Observable<AgentConfig>): void {
    // Hide the currently displayed character while the next one loads.
    this.agentConfig.set(undefined);
    this.pendingAgentActions = [];
    console.log('[Demo] Requesting agent load...');
    this.loadRequest$.next(load$);
  }

  private runWithAgent(
    actionName: string,
    action: (agent: ClippyAgentComponent) => void
  ): void {
    const agent = this.agent();
    if (agent) {
      console.log(`[Demo] Running action immediately: ${actionName}`);
      action(agent);
      return;
    }

    console.log(`[Demo] Agent not ready. Queuing action: ${actionName}`);
    this.pendingAgentActions.push({
      name: actionName,
      run: action
    });
  }
}
