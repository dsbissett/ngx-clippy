import { Injectable, ElementRef, Renderer2, RendererFactory2 } from '@angular/core';
import { Observable, Subject, interval, EMPTY } from 'rxjs';
import { takeWhile, tap, finalize } from 'rxjs/operators';
import { AgentData, AnimationFrame } from '../models/agent-config.interface';
import { AnimationState, AnimationStateChange } from '../models/animation-state.interface';

/**
 * Service for handling sprite-based animation playback
 * Follows Single Responsibility Principle - only handles animation rendering
 */
@Injectable()
export class AnimationService {
  private renderer: Renderer2;
  private animationId = 0;
  private currentFrameIndex = 0;
  private currentFrame?: AnimationFrame;
  private currentAnimationName?: string;
  private currentAnimationData?: any;
  private shouldExit = false;
  private overlayElements: HTMLElement[] = [];
  private sounds: Record<string, HTMLAudioElement> = {};
  private readonly stateChange$ = new Subject<AnimationStateChange>();

  constructor(private rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Get observable for animation state changes
   */
  get onStateChange$(): Observable<AnimationStateChange> {
    return this.stateChange$.asObservable();
  }

  /**
   * Initialize animation system with agent data
   */
  initialize(
    containerRef: ElementRef,
    mapUrl: string,
    agentData: AgentData,
    soundUrls: Record<string, string>
  ): void {
    this.setupOverlays(containerRef, mapUrl, agentData);
    this.preloadSounds(agentData.sounds, soundUrls);
  }

  /**
   * Get list of available animations
   */
  getAnimations(agentData: AgentData): string[] {
    return Object.keys(agentData.animations);
  }

  /**
   * Check if animation exists
   */
  hasAnimation(agentData: AgentData, name: string): boolean {
    return !!agentData.animations[name];
  }

  /**
   * Play an animation
   */
  playAnimation(
    agentData: AgentData,
    animationName: string
  ): Observable<AnimationStateChange> {
    if (!this.hasAnimation(agentData, animationName)) {
      return EMPTY;
    }

    this.shouldExit = false;
    this.currentAnimationName = animationName;
    this.currentAnimationData = agentData.animations[animationName];
    this.currentFrameIndex = 0;
    this.currentFrame = undefined;

    return this.animationLoop();
  }

  /**
   * Signal animation to exit at next opportunity
   */
  exitAnimation(): void {
    this.shouldExit = true;
  }

  /**
   * Pause animation
   */
  pause(): void {
    // Handled by subscription management in component
  }

  /**
   * Reinitialize with new agent data without completing stateChange$
   * Used when switching agents on the same component instance
   */
  reinitialize(
    containerRef: ElementRef,
    mapUrl: string,
    agentData: AgentData,
    soundUrls: Record<string, string>
  ): void {
    // Increment animationId to invalidate any in-flight setTimeout loops
    this.animationId++;
    this.shouldExit = true;
    this.currentAnimationName = undefined;
    this.currentAnimationData = undefined;
    this.currentFrameIndex = 0;
    this.currentFrame = undefined;

    Object.values(this.sounds).forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.sounds = {};

    this.setupOverlays(containerRef, mapUrl, agentData);
    this.preloadSounds(agentData.sounds, soundUrls);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    Object.values(this.sounds).forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.sounds = {};
    this.stateChange$.complete();
  }

  /**
   * Setup overlay elements for multi-layer sprites
   * Clears any previously appended child overlays first
   */
  private setupOverlays(
    containerRef: ElementRef,
    mapUrl: string,
    agentData: AgentData
  ): void {
    const container = containerRef.nativeElement;
    const [width, height] = agentData.framesize;

    // Remove child overlay divs added by a previous initialization
    while (container.firstChild) {
      this.renderer.removeChild(container, container.firstChild);
    }

    this.overlayElements = [container];
    this.applyOverlayStyles(container, width, height, mapUrl);

    for (let i = 1; i < agentData.overlayCount; i++) {
      const overlay = this.renderer.createElement('div');
      this.applyOverlayStyles(overlay, width, height, mapUrl);
      // Layer on top of the container, not below it
      this.renderer.setStyle(overlay, 'position', 'absolute');
      this.renderer.setStyle(overlay, 'top', '0');
      this.renderer.setStyle(overlay, 'left', '0');
      this.renderer.appendChild(container, overlay);
      this.overlayElements.push(overlay);
    }
  }

  /**
   * Apply styles to overlay element (cyclomatic complexity: 1)
   */
  private applyOverlayStyles(
    element: HTMLElement,
    width: number,
    height: number,
    mapUrl: string
  ): void {
    this.renderer.setStyle(element, 'width', `${width}px`);
    this.renderer.setStyle(element, 'height', `${height}px`);
    this.renderer.setStyle(element, 'background', `url('${mapUrl}') no-repeat`);
    this.renderer.setStyle(element, 'display', 'block');
  }

  /**
   * Preload audio files (cyclomatic complexity: 2)
   */
  private preloadSounds(soundNames: readonly string[], soundUrls: Record<string, string>): void {
    soundNames.forEach(name => {
      const url = soundUrls[name];
      if (url) {
        this.sounds[name] = new Audio(url);
      }
    });
  }

  /**
   * Main animation loop using setTimeout (cyclomatic complexity: 3)
   * Captures animationId at start; each frame checks the id is still
   * current so that reinitialize() immediately stops stale loops.
   */
  private animationLoop(): Observable<AnimationStateChange> {
    const id = ++this.animationId;
    return new Observable<AnimationStateChange>(observer => {
      const processFrame = () => {
        // Bail out if a newer animation has started
        if (this.animationId !== id) {
          observer.complete();
          return;
        }

        const nextIndex = this.getNextFrameIndex();
        const frameChanged = !this.currentFrame || this.currentFrameIndex !== nextIndex;
        this.currentFrameIndex = nextIndex;

        if (!this.isAtLastFrameWithExitBranching()) {
          this.currentFrame = this.currentAnimationData.frames[this.currentFrameIndex];
        }

        this.renderFrame();
        this.playFrameSound();

        const isLastFrame = this.isAtLastFrame();
        if (frameChanged && isLastFrame) {
          this.emitStateChange(observer);
        }

        if (!isLastFrame || (this.currentAnimationData.useExitBranching && !this.shouldExit)) {
          setTimeout(processFrame, this.currentFrame?.duration || 100);
        }
      };

      processFrame();
    });
  }

  /**
   * Emit appropriate state change (cyclomatic complexity: 2)
   */
  private emitStateChange(observer: any): void {
    const state = (this.currentAnimationData.useExitBranching && !this.shouldExit)
      ? AnimationState.WAITING
      : AnimationState.EXITED;

    const change: AnimationStateChange = {
      animationName: this.currentAnimationName!,
      state
    };

    observer.next(change);
    this.stateChange$.next(change);

    if (state === AnimationState.EXITED) {
      observer.complete();
    }
  }

  /**
   * Get next frame index based on branching logic (cyclomatic complexity: 4)
   */
  private getNextFrameIndex(): number {
    if (!this.currentAnimationData || !this.currentFrame) {
      return 0;
    }

    if (this.shouldExit && this.currentFrame.exitBranch !== undefined) {
      return this.currentFrame.exitBranch;
    }

    if (this.currentFrame.branching) {
      return this.selectBranch(this.currentFrame.branching.branches);
    }

    return this.currentFrameIndex + 1;
  }

  /**
   * Select branch based on weighted random (cyclomatic complexity: 2)
   */
  private selectBranch(branches: readonly any[]): number {
    let random = Math.random() * 100;
    for (const branch of branches) {
      if (random <= branch.weight) {
        return branch.frameIndex;
      }
      random -= branch.weight;
    }
    return this.currentFrameIndex + 1;
  }

  /**
   * Render current frame to overlays (cyclomatic complexity: 3)
   */
  private renderFrame(): void {
    const images = this.currentFrame?.images || [];

    this.overlayElements.forEach((overlay, index) => {
      if (index < images.length) {
        const [x, y] = images[index];
        this.renderer.setStyle(overlay, 'background-position', `${-x}px ${-y}px`);
        this.renderer.setStyle(overlay, 'display', 'block');
      } else {
        this.renderer.setStyle(overlay, 'display', 'none');
      }
    });
  }

  /**
   * Play sound for current frame (cyclomatic complexity: 2)
   */
  private playFrameSound(): void {
    const soundName = this.currentFrame?.sound;
    if (soundName && this.sounds[soundName]) {
      this.sounds[soundName].play().catch(() => {});
    }
  }

  /**
   * Check if at last frame (cyclomatic complexity: 1)
   */
  private isAtLastFrame(): boolean {
    return this.currentFrameIndex >= this.currentAnimationData.frames.length - 1;
  }

  /**
   * Check if at last frame with exit branching (cyclomatic complexity: 1)
   */
  private isAtLastFrameWithExitBranching(): boolean {
    return this.isAtLastFrame() && this.currentAnimationData.useExitBranching;
  }
}
