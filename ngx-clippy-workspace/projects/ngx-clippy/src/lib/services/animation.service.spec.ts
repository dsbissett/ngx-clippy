import { ElementRef, Renderer2, RendererFactory2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnimationData, AgentData } from '../models/agent-config.interface';
import { AnimationState, AnimationStateChange } from '../models/animation-state.interface';
import { AnimationService } from './animation.service';

type AudioMock = HTMLAudioElement & {
  pause: jasmine.Spy<() => void>;
  play: jasmine.Spy<() => Promise<void>>;
};

describe('AnimationService', () => {
  let service: AnimationService;
  let container: HTMLDivElement;
  let containerRef: ElementRef;
  let renderer: Renderer2 & {
    createElement: jasmine.Spy<(name: string) => HTMLElement>;
    appendChild: jasmine.Spy<(parent: HTMLElement, child: HTMLElement) => void>;
    removeChild: jasmine.Spy<(parent: HTMLElement, child: Node) => void>;
    setStyle: jasmine.Spy<(target: HTMLElement, style: string, value: string) => void>;
  };
  let rendererFactory: RendererFactory2 & {
    createRenderer: jasmine.Spy;
  };
  let createdAudios: AudioMock[];
  let originalAudio: typeof Audio;

  beforeEach(() => {
    container = document.createElement('div');
    containerRef = new ElementRef(container);

    renderer = {
      createElement: jasmine.createSpy('createElement').and.callFake((name: string) => document.createElement(name)),
      appendChild: jasmine.createSpy('appendChild').and.callFake((parent: HTMLElement, child: HTMLElement) => {
        parent.appendChild(child);
      }),
      removeChild: jasmine.createSpy('removeChild').and.callFake((parent: HTMLElement, child: Node) => {
        parent.removeChild(child);
      }),
      setStyle: jasmine.createSpy('setStyle').and.callFake((target: HTMLElement, style: string, value: string) => {
        target.style.setProperty(style, value);
      }),
    } as unknown as Renderer2 & {
      createElement: jasmine.Spy<(name: string) => HTMLElement>;
      appendChild: jasmine.Spy<(parent: HTMLElement, child: HTMLElement) => void>;
      removeChild: jasmine.Spy<(parent: HTMLElement, child: Node) => void>;
      setStyle: jasmine.Spy<(target: HTMLElement, style: string, value: string) => void>;
    };

    rendererFactory = {
      createRenderer: jasmine.createSpy('createRenderer').and.returnValue(renderer),
    } as unknown as RendererFactory2 & {
      createRenderer: jasmine.Spy;
    };

    service = new AnimationService(rendererFactory);

    createdAudios = [];
    originalAudio = globalThis.Audio;
    (globalThis as unknown as { Audio: typeof Audio }).Audio = function MockAudio(url: string): HTMLAudioElement {
      const audio = createAudioMock(url);
      createdAudios.push(audio);
      return audio;
    } as unknown as typeof Audio;
  });

  afterEach(() => {
    (globalThis as unknown as { Audio: typeof Audio }).Audio = originalAudio;
    try {
      jasmine.clock().uninstall();
    } catch {
      // no fake clock installed in this test
    }
  });

  it('can be created through Angular DI', () => {
    TestBed.configureTestingModule({
      providers: [
        AnimationService,
        { provide: RendererFactory2, useValue: rendererFactory },
      ],
    });

    const injected = TestBed.inject(AnimationService);
    expect(injected).toBeTruthy();
  });

  it('initializes overlays and sounds and exposes animation lookup APIs', () => {
    const staleOverlay = document.createElement('div');
    container.appendChild(staleOverlay);

    const agentData = createAgentData({
      overlayCount: 3,
      sounds: ['beep', 'missing'],
      animations: {
        Wave: {
          frames: [{ duration: 5 }],
        },
      },
    });

    service.initialize(containerRef, '/map.png', agentData, {
      beep: '/sounds/beep.mp3',
    });

    expect(renderer.removeChild).toHaveBeenCalledWith(container, staleOverlay);
    expect(container.children.length).toBe(2);
    expect((service as unknown as { overlayElements: HTMLElement[] }).overlayElements.length).toBe(3);

    expect(createdAudios.length).toBe(1);
    expect(createdAudios[0].src).toBe('/sounds/beep.mp3');

    expect(service.getAnimations(agentData)).toEqual(['Wave']);
    expect(service.hasAnimation(agentData, 'Wave')).toBeTrue();
    expect(service.hasAnimation(agentData, 'Nope')).toBeFalse();

    service.pause();
    expect(service.onStateChange$).toBeDefined();
  });

  it('reinitializes by resetting animation state and disposing old sounds', () => {
    const oldA = createAudioMock('/old/a.mp3');
    const oldB = createAudioMock('/old/b.mp3');

    const privateService = service as unknown as {
      animationId: number;
      shouldExit: boolean;
      currentAnimationName?: string;
      currentAnimationData?: unknown;
      currentFrameIndex: number;
      currentFrame?: unknown;
      sounds: Record<string, HTMLAudioElement>;
      overlayElements: HTMLElement[];
    };

    privateService.sounds = { a: oldA, b: oldB };
    privateService.shouldExit = false;
    privateService.currentAnimationName = 'OldAnim';
    privateService.currentAnimationData = { frames: [{ duration: 1 }] };
    privateService.currentFrameIndex = 3;
    privateService.currentFrame = { duration: 1 };
    const oldAnimationId = privateService.animationId;

    const agentData = createAgentData({
      overlayCount: 1,
      sounds: ['newSound'],
    });

    service.reinitialize(containerRef, '/new-map.png', agentData, {
      newSound: '/sounds/new.mp3',
    });

    expect(privateService.animationId).toBe(oldAnimationId + 1);
    expect(privateService.shouldExit).toBeTrue();
    expect(privateService.currentAnimationName).toBeUndefined();
    expect(privateService.currentAnimationData).toBeUndefined();
    expect(privateService.currentFrameIndex).toBe(0);
    expect(privateService.currentFrame).toBeUndefined();
    expect(privateService.overlayElements.length).toBe(1);

    expect(oldA.pause).toHaveBeenCalled();
    expect(oldB.pause).toHaveBeenCalled();
    expect(oldA.src).toBe('');
    expect(oldB.src).toBe('');

    expect(Object.keys(privateService.sounds)).toEqual(['newSound']);
  });

  it('disposes sounds and completes state-change stream', () => {
    const completionSpy = jasmine.createSpy('state-complete');
    service.onStateChange$.subscribe({ complete: completionSpy });

    const privateService = service as unknown as {
      sounds: Record<string, HTMLAudioElement>;
    };
    const audio = createAudioMock('/dispose.mp3');
    privateService.sounds = { dispose: audio };

    service.dispose();

    expect(audio.pause).toHaveBeenCalled();
    expect(audio.src).toBe('');
    expect(privateService.sounds).toEqual({});
    expect(completionSpy).toHaveBeenCalled();
  });

  it('returns EMPTY when requested animation does not exist', () => {
    const agentData = createAgentData({
      animations: {},
    });

    let completed = false;
    service.playAnimation(agentData, 'Missing').subscribe({
      complete: () => {
        completed = true;
      },
    });

    expect(completed).toBeTrue();
  });

  it('completes immediately when animation loop is invalidated by a newer animation id', () => {
    const agentData = createAgentData({
      animations: {
        Run: {
          frames: [{ duration: 1, images: [[0, 0]] }],
        },
      },
    });

    service.initialize(containerRef, '/map.png', agentData, {});
    const stream = service.playAnimation(agentData, 'Run');

    (service as unknown as { animationId: number }).animationId++;

    const completeSpy = jasmine.createSpy('complete');
    stream.subscribe({ complete: completeSpy });

    expect(completeSpy).toHaveBeenCalled();
  });

  it('plays a standard animation and emits EXITED state changes', async () => {
    jasmine.clock().install();

    const agentData = createAgentData({
      overlayCount: 2,
      sounds: ['boom'],
      animations: {
        Run: {
          frames: [
            { duration: 5, images: [[1, 2]], sound: 'boom' },
            { duration: 5, images: [[3, 4]] },
          ],
        },
      },
    });

    service.initialize(containerRef, '/map.png', agentData, {
      boom: '/sounds/boom.mp3',
    });

    const failingAudio = createAudioMock('/sounds/boom.mp3', true);
    (service as unknown as { sounds: Record<string, HTMLAudioElement> }).sounds['boom'] = failingAudio;

    const directChanges: AnimationStateChange[] = [];
    const stateStreamChanges: AnimationStateChange[] = [];
    let completed = false;

    service.onStateChange$.subscribe(change => {
      stateStreamChanges.push(change);
    });

    service.playAnimation(agentData, 'Run').subscribe({
      next: change => {
        directChanges.push(change);
      },
      complete: () => {
        completed = true;
      },
    });

    expect(completed).toBeFalse();

    jasmine.clock().tick(5);
    await Promise.resolve();

    expect(failingAudio.play).toHaveBeenCalled();
    expect(directChanges).toEqual([
      { animationName: 'Run', state: AnimationState.EXITED },
    ]);
    expect(stateStreamChanges).toEqual([
      { animationName: 'Run', state: AnimationState.EXITED },
    ]);
    expect(completed).toBeTrue();
  });

  it('waits at last frame for exit-branching animations and exits after exitAnimation()', () => {
    jasmine.clock().install();

    const agentData = createAgentData({
      animations: {
        IdleLoop: {
          useExitBranching: true,
          frames: [
            { duration: 1, images: [[0, 0]] },
            { duration: 1, images: [[5, 5]] },
          ],
        },
      },
    });

    service.initialize(containerRef, '/map.png', agentData, {});

    const states: AnimationState[] = [];
    let completed = false;

    service.playAnimation(agentData, 'IdleLoop').subscribe({
      next: change => {
        states.push(change.state);
      },
      complete: () => {
        completed = true;
      },
    });

    jasmine.clock().tick(1);
    expect(states).toEqual([AnimationState.WAITING]);
    expect(completed).toBeFalse();

    service.exitAnimation();
    jasmine.clock().tick(1);

    expect(states).toEqual([AnimationState.WAITING, AnimationState.EXITED]);
    expect(completed).toBeTrue();
  });

  it('uses default 100ms frame delay when duration is falsy', () => {
    jasmine.clock().install();

    const agentData = createAgentData({
      animations: {
        ZeroDuration: {
          frames: [
            { duration: 0, images: [[0, 0]] },
            { duration: 1, images: [[1, 1]] },
          ],
        },
      },
    });

    service.initialize(containerRef, '/map.png', agentData, {});

    let completed = false;
    service.playAnimation(agentData, 'ZeroDuration').subscribe({
      complete: () => {
        completed = true;
      },
    });

    jasmine.clock().tick(99);
    expect(completed).toBeFalse();

    jasmine.clock().tick(1);
    expect(completed).toBeTrue();
  });

  it('covers internal frame-navigation and rendering branches', () => {
    const privateService = service as unknown as {
      currentAnimationData?: any;
      currentFrame?: any;
      currentFrameIndex: number;
      shouldExit: boolean;
      overlayElements: HTMLElement[];
      sounds: Record<string, HTMLAudioElement>;
      getNextFrameIndex: () => number;
      selectBranch: (branches: ReadonlyArray<{ frameIndex: number; weight: number }>) => number;
      renderFrame: () => void;
      playFrameSound: () => void;
      isAtLastFrame: () => boolean;
      isAtLastFrameWithExitBranching: () => boolean;
    };

    privateService.currentAnimationData = undefined;
    privateService.currentFrame = undefined;
    expect(privateService.getNextFrameIndex()).toBe(0);

    privateService.currentAnimationData = {
      useExitBranching: false,
      frames: [{ duration: 1 }, { duration: 1 }],
    };
    privateService.currentFrame = { duration: 1, exitBranch: 7 };
    privateService.currentFrameIndex = 1;
    privateService.shouldExit = true;
    expect(privateService.getNextFrameIndex()).toBe(7);

    privateService.currentFrame = {
      duration: 1,
      branching: {
        branches: [
          { frameIndex: 4, weight: 60 },
          { frameIndex: 5, weight: 40 },
        ],
      },
    };
    privateService.shouldExit = false;

    const randomSpy = spyOn(Math, 'random');
    randomSpy.and.returnValue(0.2);
    expect(privateService.getNextFrameIndex()).toBe(4);

    randomSpy.and.returnValue(0.7);
    expect(privateService.selectBranch([
      { frameIndex: 10, weight: 50 },
      { frameIndex: 11, weight: 50 },
    ])).toBe(11);

    privateService.currentFrameIndex = 9;
    randomSpy.and.returnValue(0.99);
    expect(privateService.selectBranch([
      { frameIndex: 1, weight: 10 },
    ])).toBe(10);

    privateService.currentFrame = { duration: 1 };
    privateService.currentFrameIndex = 2;
    expect(privateService.getNextFrameIndex()).toBe(3);

    privateService.currentAnimationData = {
      useExitBranching: true,
      frames: [{ duration: 1 }, { duration: 1 }],
    };
    privateService.currentFrameIndex = 1;
    expect(privateService.isAtLastFrame()).toBeTrue();
    expect(privateService.isAtLastFrameWithExitBranching()).toBeTrue();

    privateService.currentAnimationData = {
      useExitBranching: false,
      frames: [{ duration: 1 }, { duration: 1 }],
    };
    privateService.currentFrameIndex = 0;
    expect(privateService.isAtLastFrame()).toBeFalse();
    expect(privateService.isAtLastFrameWithExitBranching()).toBeFalse();

    const overlayA = document.createElement('div');
    const overlayB = document.createElement('div');
    privateService.overlayElements = [overlayA, overlayB];

    privateService.currentFrame = { duration: 1, images: [[7, 8]] };
    privateService.renderFrame();
    expect(renderer.setStyle).toHaveBeenCalledWith(overlayA, 'background-position', '-7px -8px');
    expect(renderer.setStyle).toHaveBeenCalledWith(overlayB, 'display', 'none');

    privateService.currentFrame = undefined;
    privateService.renderFrame();

    privateService.currentFrame = { duration: 1 };
    privateService.sounds = {};
    privateService.playFrameSound();
  });
});

function createAgentData(overrides: Partial<AgentData> = {}): AgentData {
  const defaultAnimation: AnimationData = {
    frames: [{ duration: 1, images: [[0, 0]] }],
  };

  return {
    framesize: [100, 80],
    overlayCount: 1,
    sounds: [],
    animations: { Default: defaultAnimation },
    ...overrides,
  };
}

function createAudioMock(url: string, shouldReject = false): AudioMock {
  return {
    src: url,
    pause: jasmine.createSpy('pause'),
    play: jasmine.createSpy('play').and.returnValue(
      shouldReject ? Promise.reject(new Error('play failed')) : Promise.resolve()
    ),
  } as unknown as AudioMock;
}
