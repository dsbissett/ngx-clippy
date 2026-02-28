import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ChangeDetectionStrategy,
  input,
  viewChild,
  signal,
  inject,
  DestroyRef,
  effect
} from '@angular/core';
import { Observable, of, EMPTY, timer, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, tap, finalize } from 'rxjs/operators';
import { AgentConfig } from '../../models/agent-config.interface';
import { Position } from '../../models/animation-state.interface';
import { SpeechOptions } from '../../models/speech-options.interface';
import { QueuedAction } from '../../models/action.interface';
import { AnimationService } from '../../services/animation.service';
import { SpeechBalloonService } from '../../services/speech-balloon.service';
import { ActionQueueService } from '../../services/action-queue.service';
import { DragDropService } from '../../services/drag-drop.service';
import { TextToSpeechService } from '../../services/text-to-speech.service';

/**
 * Options for show().
 */
export interface ShowOptions {
  immediate?: boolean;
  position?: Position;
}

/**
 * Main component for displaying and controlling an animated agent.
 *
 * Uses Angular signal primitives (input, viewChild, signal) so that
 * ChangeDetectionStrategy.OnPush re-renders automatically on state changes
 * without needing markForCheck().
 *
 * Agent switching is handled via effect() + firstRun flag:
 *   - First effect run (initial value) is skipped; ngAfterViewInit handles setup.
 *   - Subsequent runs call reinitialize() within the effect phase (before any
 *     macrotask like setTimeout fires), so reinitialize() always precedes show().
 *
 * Idle animation loop: startIdleLoop() continues ambient idle playback while
 * allowing user-triggered actions to preempt immediately.
 */
@Component({
  selector: 'clippy-agent',
  template: `
    <div
      #agentContainer
      class="clippy-agent-container"
      [style.position]="'fixed'"
      [style.z-index]="'10001'"
      [style.cursor]="'pointer'"
      [style.display]="isVisible() ? 'block' : 'none'"
      [style.touch-action]="'none'"
      (dblclick)="onDoubleClick()"
    ></div>
  `,
  styles: [`
    .clippy-agent-container {
      user-select: none;
      -webkit-user-select: none;
    }
  `],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AnimationService,
    SpeechBalloonService,
    ActionQueueService,
    DragDropService,
    TextToSpeechService
  ]
})
export class ClippyAgentComponent implements AfterViewInit, OnDestroy {
  /** Signal input replaces @Input() */
  readonly agentConfig = input.required<AgentConfig>();

  /** Signal viewChild replaces @ViewChild('agentContainer', { static: true }) */
  readonly containerRef = viewChild.required<ElementRef>('agentContainer');

  /**
   * Signal state drives template visibility.
   * With OnPush, a plain boolean requires markForCheck(); a signal does not.
   */
  readonly isVisible = signal(false);

  private isHidden = true;
  private idleLoopToken = 0;
  private idleLoopSubscription?: Subscription;
  private viewportSyncTimeoutId?: ReturnType<typeof setTimeout>;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private animationService: AnimationService,
    private speechBalloonService: SpeechBalloonService,
    private actionQueueService: ActionQueueService,
    private dragDropService: DragDropService,
    private ttsService: TextToSpeechService
  ) {
    /**
     * React to agentConfig changes after the first render.
     * The effect() runs in the effect phase of change detection — synchronously
     * within the same CD cycle, before any macrotask (setTimeout) fires.
     * The firstRun flag skips the initial value; ngAfterViewInit handles that.
     */
    let firstRun = true;
    effect(() => {
      const config = this.agentConfig();
      if (firstRun) {
        firstRun = false;
        return;
      }
      this.cancelIdleLoop();
      this.actionQueueService.clear();
      this.animationService.exitAnimation();
      this.speechBalloonService.hide(true);
      this.ttsService.cancel();
      this.animationService.reinitialize(
        this.containerRef(),
        config.mapUrl,
        config.agentData,
        config.sounds
      );
      this.ttsService.initialize(config.agentData.tts);
      this.scheduleViewportSync();
    });
  }

  ngAfterViewInit(): void {
    this.initializeServices();
    this.setupDragDrop();
    this.setupQueueEmptyHandler();
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  show(immediate?: boolean, position?: Position): void;
  show(options?: ShowOptions): void;
  show(immediateOrOptions: boolean | ShowOptions = false, position?: Position): void {
    const immediate =
      typeof immediateOrOptions === 'boolean'
        ? immediateOrOptions
        : (immediateOrOptions.immediate ?? false);
    const requestedPosition =
      typeof immediateOrOptions === 'boolean'
        ? position
        : immediateOrOptions.position;

    this.cancelIdleLoop();
    this.cancelViewportSync();
    this.isHidden = false;

    // Apply position before first paint so show(position) never flashes at a default location.
    if (requestedPosition) {
      const clamped = this.clampPosition(requestedPosition.x, requestedPosition.y);
      this.setPosition(clamped.x, clamped.y);
    } else {
      const element = this.containerRef().nativeElement;
      const hasPosition = element.style.left !== '' && element.style.top !== '';
      if (!hasPosition) {
        this.positionAgent();
        this.scheduleViewportSync();
      }
    }

    this.isVisible.set(true);

    if (!immediate) {
      this.play('Show');
    }
  }

  hide(immediate = false): void {
    this.cancelIdleLoop();
    this.cancelViewportSync();
    this.isHidden = true;
    if (immediate) {
      this.isVisible.set(false);
      this.animationService.exitAnimation();
      return;
    }
    this.enqueueAction({
      execute: () => this.animationService.playAnimation(this.agentConfig().agentData, 'Hide').pipe(
        tap(() => { this.isVisible.set(false); })
      )
    });
  }

  play(animationName: string, timeout = 5000): boolean {
    if (!this.hasAnimation(animationName)) {
      return false;
    }
    this.enqueueAction({
      execute: () => {
        const timeoutId = timeout > 0
          ? setTimeout(() => this.animationService.exitAnimation(), timeout)
          : undefined;

        return this.animationService.playAnimation(
          this.agentConfig().agentData,
          animationName
        ).pipe(
          finalize(() => {
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
            }
          })
        );
      }
    });
    return true;
  }

  animate(): boolean {
    const animations = this.getAnimations();
    const nonIdleAnimations = animations.filter(name => !name.startsWith('Idle'));
    if (nonIdleAnimations.length === 0) {
      return false;
    }
    const randomIndex = Math.floor(Math.random() * nonIdleAnimations.length);
    return this.play(nonIdleAnimations[randomIndex]);
  }

  speak(text: string, options: SpeechOptions = {}): void {
    this.enqueueAction({
      execute: () => {
        const speech$ = this.speechBalloonService.speak(text, options.hold);
        if (options.tts) {
          this.ttsService.speak(text);
        }
        return speech$;
      }
    });
  }

  speakStream(source: AsyncIterable<string>, options: SpeechOptions = {}): Observable<void> {
    return new Observable<void>(observer => {
      this.stop();

      let fullText = '';
      let finished = false;
      const stream = this.speechBalloonService.speakStream();
      const iterator = source[Symbol.asyncIterator]();

      const finishStream = () => {
        if (finished) {
          return;
        }
        finished = true;
        stream.done();
      };

      const run = async () => {
        try {
          while (!finished) {
            const { value, done } = await iterator.next();
            if (done || finished) {
              break;
            }
            fullText += value;
            stream.push(value);
          }

          if (!finished && options.tts && fullText) {
            this.ttsService.speak(fullText);
          }

          finishStream();
          observer.next();
          observer.complete();
        } catch (error) {
          finishStream();
          observer.error(error);
        }
      };

      void run();

      return () => {
        finishStream();
        void iterator.return?.();
      };
    });
  }

  moveTo(x: number, y: number, duration = 1000): void {
    const direction = this.calculateDirection(x, y);
    const moveAnimationName = 'Move' + direction;
    this.enqueueAction({
      execute: () => {
        const clamped = this.clampPosition(x, y);
        if (duration === 0) {
          this.setPosition(clamped.x, clamped.y);
          return of(void 0);
        }
        if (!this.hasAnimation(moveAnimationName)) {
          return this.animateMovement(clamped.x, clamped.y, duration);
        }
        return this.animateWithMovement(moveAnimationName, clamped.x, clamped.y, duration);
      }
    });
  }

  gestureAt(x: number, y: number): boolean {
    const direction = this.calculateDirection(x, y);
    const gestureAnim = 'Gesture' + direction;
    const lookAnim = 'Look' + direction;
    const animation = this.hasAnimation(gestureAnim) ? gestureAnim : lookAnim;
    return this.play(animation);
  }

  delay(milliseconds = 250): void {
    this.enqueueAction({
      execute: () => timer(milliseconds).pipe(switchMap(() => EMPTY))
    });
  }

  stopCurrent(): void {
    this.cancelIdleLoop();
    this.animationService.exitAnimation();
    this.speechBalloonService.close();
  }

  stop(): void {
    this.cancelIdleLoop();
    this.actionQueueService.clear();
    this.animationService.exitAnimation();
    this.speechBalloonService.hide(true);
    this.ttsService.cancel();
  }

  closeBalloon(): void {
    this.speechBalloonService.hide();
  }

  getAnimations(): string[] {
    return this.animationService.getAnimations(this.agentConfig().agentData);
  }

  hasAnimation(name: string): boolean {
    return this.animationService.hasAnimation(this.agentConfig().agentData, name);
  }

  onDoubleClick(): void {
    if (!this.play('ClickedOn')) {
      this.animate();
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private initializeServices(): void {
    const config = this.agentConfig();
    this.animationService.initialize(
      this.containerRef(),
      config.mapUrl,
      config.agentData,
      config.sounds
    );
    this.speechBalloonService.initialize(this.containerRef().nativeElement);
    this.ttsService.initialize(config.agentData.tts);
  }

  private setupDragDrop(): void {
    this.dragDropService.enableDrag(this.containerRef().nativeElement);
    this.dragDropService.onDragStart$.pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.animationService.pause();
        this.speechBalloonService.hide(true);
      })
    ).subscribe();
    this.dragDropService.onDragMove$.pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(position => {
        const { width, height } = this.getAgentDimensions();
        const clamped = this.dragDropService.clampToViewport(
          position,
          width,
          height
        );
        this.setPosition(clamped.x, clamped.y);
      })
    ).subscribe();
    this.dragDropService.onDragEnd$.pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.speechBalloonService.show();
        this.speechBalloonService.reposition();
      })
    ).subscribe();
  }

  private setupQueueEmptyHandler(): void {
    this.actionQueueService.onQueueEmpty$.pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        if (!this.isHidden) {
          this.startIdleLoop();
        }
      })
    ).subscribe();
  }

  /**
   * Start idle-loop playback. Each new token cancels older loop callbacks so
   * user-triggered actions always preempt idle animations.
   */
  private startIdleLoop(): void {
    this.cancelIdleLoop();
    const token = this.idleLoopToken;

    const playNext = (): void => {
      if (this.isHidden || token !== this.idleLoopToken) {
        return;
      }

      const idleAnimations = this.getAnimations().filter(name => name.startsWith('Idle'));
      if (idleAnimations.length === 0) {
        return;
      }

      const randomIndex = Math.floor(Math.random() * idleAnimations.length);
      const idleAnimation = idleAnimations[randomIndex];
      this.idleLoopSubscription = this.animationService.playAnimation(
        this.agentConfig().agentData,
        idleAnimation
      ).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        complete: () => {
          if (this.isHidden || token !== this.idleLoopToken) {
            return;
          }

          // Schedule next idle step asynchronously to avoid deep completion recursion.
          this.idleLoopSubscription = timer(0).pipe(
            takeUntilDestroyed(this.destroyRef)
          ).subscribe(() => {
            playNext();
          });
        }
      });
    };

    playNext();
  }

  /**
   * Cancel all idle-loop callbacks/subscriptions. Token increment invalidates
   * any already-scheduled async continuation.
   */
  private cancelIdleLoop(): void {
    this.idleLoopToken++;
    this.idleLoopSubscription?.unsubscribe();
    this.idleLoopSubscription = undefined;
  }

  private enqueueAction(action: QueuedAction): void {
    // Any explicit user action should preempt the ambient idle loop.
    this.cancelIdleLoop();
    this.actionQueueService.enqueue(action);
  }

  private calculateDirection(x: number, y: number): string {
    const element = this.containerRef().nativeElement;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + element.offsetWidth / 2;
    const centerY = rect.top + element.offsetHeight / 2;
    const angle = Math.round((180 * Math.atan2(centerY - y, centerX - x)) / Math.PI);
    if (angle >= -45 && angle < 45) return 'Right';
    if (angle >= 45 && angle < 135) return 'Up';
    if ((angle >= 135 && angle <= 180) || (angle >= -180 && angle < -135)) return 'Left';
    if (angle >= -135 && angle < -45) return 'Down';
    return 'Top';
  }

  private clampPosition(x: number, y: number): { x: number; y: number } {
    const { width, height } = this.getAgentDimensions();
    return this.dragDropService.clampToViewport(
      { x, y },
      width,
      height
    );
  }

  private setPosition(x: number, y: number): void {
    const element = this.containerRef().nativeElement;
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    this.speechBalloonService.reposition();
  }

  private positionAgent(): void {
    const { width, height } = this.getAgentDimensions();
    const left = (window.innerWidth - width) / 2;
    const top = 40;
    const clamped = this.clampPosition(left, top);
    this.setPosition(clamped.x, clamped.y);
  }

  private getAgentDimensions(): { width: number; height: number } {
    const element = this.containerRef().nativeElement;
    const [frameWidth, frameHeight] = this.agentConfig().agentData.framesize;
    return {
      width: element.offsetWidth || frameWidth,
      height: element.offsetHeight || frameHeight
    };
  }

  private scheduleViewportSync(): void {
    this.cancelViewportSync();
    this.viewportSyncTimeoutId = setTimeout(() => {
      this.viewportSyncTimeoutId = undefined;
      if (this.isHidden) {
        return;
      }

      const element = this.containerRef().nativeElement;
      const hasPosition = element.style.left !== '' && element.style.top !== '';
      if (!hasPosition) {
        this.positionAgent();
        return;
      }

      const currentX = parseFloat(element.style.left);
      const currentY = parseFloat(element.style.top);
      if (!Number.isFinite(currentX) || !Number.isFinite(currentY)) {
        this.positionAgent();
        return;
      }

      const clamped = this.clampPosition(currentX, currentY);
      this.setPosition(clamped.x, clamped.y);
    }, 0);
  }

  private animateMovement(x: number, y: number, duration: number): Observable<void> {
    return new Observable<void>(observer => {
      const element = this.containerRef().nativeElement;
      const start = performance.now();
      const startX = parseFloat(getComputedStyle(element).left) || 0;
      const startY = parseFloat(getComputedStyle(element).top) || 0;
      const swing = (p: number) => 0.5 - Math.cos(p * Math.PI) / 2;
      const animate = (currentTime: number) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = swing(progress);
        const currentX = startX + (x - startX) * eased;
        const currentY = startY + (y - startY) * eased;
        this.setPosition(currentX, currentY);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          observer.next();
          observer.complete();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  private animateWithMovement(
    animationName: string,
    x: number,
    y: number,
    duration: number
  ): Observable<void> {
    return new Observable<void>(observer => {
      const animationSub = this.animationService.playAnimation(
        this.agentConfig().agentData,
        animationName
      ).subscribe();

      const movementSub = this.animateMovement(x, y, duration).pipe(
        tap(() => {
          // Tell move animations with exit-branching to finish at their next branch point.
          this.animationService.exitAnimation();
          observer.next();
          observer.complete();
        })
      ).subscribe();

      return () => {
        animationSub.unsubscribe();
        movementSub.unsubscribe();
      };
    });
  }

  private dispose(): void {
    this.cancelIdleLoop();
    this.cancelViewportSync();
    this.animationService.dispose();
    this.speechBalloonService.dispose();
    this.dragDropService.dispose();
    this.ttsService.cancel();
  }

  private cancelViewportSync(): void {
    if (this.viewportSyncTimeoutId === undefined) {
      return;
    }
    clearTimeout(this.viewportSyncTimeoutId);
    this.viewportSyncTimeoutId = undefined;
  }
}
