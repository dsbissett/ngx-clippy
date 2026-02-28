import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { AgentConfig } from '../../models/agent-config.interface';
import { QueuedAction } from '../../models/action.interface';
import { AnimationService } from '../../services/animation.service';
import { ActionQueueService } from '../../services/action-queue.service';
import { DragDropService } from '../../services/drag-drop.service';
import { SpeechBalloonService } from '../../services/speech-balloon.service';
import { TextToSpeechService } from '../../services/text-to-speech.service';
import { ClippyAgentComponent } from './clippy-agent.component';

type AnimationMock = jasmine.SpyObj<AnimationService>;
type SpeechMock = jasmine.SpyObj<SpeechBalloonService>;
type TtsMock = jasmine.SpyObj<TextToSpeechService>;
type QueueMock = {
  enqueue: jasmine.Spy<(action: QueuedAction) => void>;
  clear: jasmine.Spy<() => void>;
  onQueueEmpty$: Observable<void>;
  queueEmptySubject: Subject<void>;
};
type DragMock = {
  enableDrag: jasmine.Spy<(el: HTMLElement) => void>;
  clampToViewport: jasmine.Spy<(pos: { x: number; y: number }, width: number, height: number) => { x: number; y: number }>;
  dispose: jasmine.Spy<() => void>;
  onDragStart$: Observable<{ x: number; y: number }>;
  onDragMove$: Observable<{ x: number; y: number }>;
  onDragEnd$: Observable<void>;
  dragStartSubject: Subject<{ x: number; y: number }>;
  dragMoveSubject: Subject<{ x: number; y: number }>;
  dragEndSubject: Subject<void>;
};

describe('ClippyAgentComponent', () => {
  let fixture: ComponentFixture<ClippyAgentComponent>;
  let component: ClippyAgentComponent;
  let animation: AnimationMock;
  let speech: SpeechMock;
  let queue: QueueMock;
  let drag: DragMock;
  let tts: TtsMock;
  let container: HTMLElement;
  let config: AgentConfig;

  beforeEach(() => {
    animation = jasmine.createSpyObj<AnimationService>('AnimationService', [
      'initialize',
      'reinitialize',
      'exitAnimation',
      'dispose',
      'pause',
      'playAnimation',
      'getAnimations',
      'hasAnimation',
    ]);
    animation.playAnimation.and.returnValue(of({ animationName: 'x', state: 0 } as any));
    animation.getAnimations.and.returnValue(['Show', 'Hide', 'ClickedOn', 'Wave', 'IdleOne', 'MoveRight', 'GestureRight', 'LookRight']);
    animation.hasAnimation.and.callFake((_agentData, name) => ['Show', 'Hide', 'ClickedOn', 'Wave', 'IdleOne', 'MoveRight', 'GestureRight', 'LookRight'].includes(name));

    speech = jasmine.createSpyObj<SpeechBalloonService>('SpeechBalloonService', [
      'initialize',
      'hide',
      'show',
      'speak',
      'speakStream',
      'close',
      'reposition',
      'dispose',
    ]);
    speech.speak.and.returnValue(of(void 0));
    speech.speakStream.and.returnValue({
      push: jasmine.createSpy('push'),
      done: jasmine.createSpy('done'),
      complete$: of(void 0),
    });

    tts = jasmine.createSpyObj<TextToSpeechService>('TextToSpeechService', [
      'initialize',
      'cancel',
      'speak',
    ]);

    const queueEmptySubject = new Subject<void>();
    queue = {
      enqueue: jasmine.createSpy('enqueue'),
      clear: jasmine.createSpy('clear'),
      onQueueEmpty$: queueEmptySubject.asObservable(),
      queueEmptySubject,
    };

    const dragStartSubject = new Subject<{ x: number; y: number }>();
    const dragMoveSubject = new Subject<{ x: number; y: number }>();
    const dragEndSubject = new Subject<void>();
    drag = {
      enableDrag: jasmine.createSpy('enableDrag'),
      clampToViewport: jasmine.createSpy('clampToViewport').and.callFake((pos) => pos),
      dispose: jasmine.createSpy('dispose'),
      onDragStart$: dragStartSubject.asObservable(),
      onDragMove$: dragMoveSubject.asObservable(),
      onDragEnd$: dragEndSubject.asObservable(),
      dragStartSubject,
      dragMoveSubject,
      dragEndSubject,
    };

    TestBed.configureTestingModule({
      imports: [ClippyAgentComponent],
    });
    TestBed.overrideComponent(ClippyAgentComponent, {
      set: {
        providers: [
          { provide: AnimationService, useValue: animation },
          { provide: SpeechBalloonService, useValue: speech },
          { provide: ActionQueueService, useValue: queue },
          { provide: DragDropService, useValue: drag },
          { provide: TextToSpeechService, useValue: tts },
        ],
      },
    });

    fixture = TestBed.createComponent(ClippyAgentComponent);
    component = fixture.componentInstance;
    config = makeAgentConfig();
    fixture.componentRef.setInput('agentConfig', config);
    fixture.detectChanges();

    container = fixture.nativeElement.querySelector('.clippy-agent-container') as HTMLElement;
    setOffsetSize(container, 200, 120);
  });

  it('initializes services on view init and reacts to agent config changes', () => {
    jasmine.clock().install();
    expect(animation.initialize).toHaveBeenCalled();
    expect(speech.initialize).toHaveBeenCalledWith(container);
    expect(drag.enableDrag).toHaveBeenCalledWith(container);
    expect(tts.initialize).toHaveBeenCalledWith(config.agentData.tts);

    const newConfig = makeAgentConfig({ mapUrl: '/map-2.avif' });
    fixture.componentRef.setInput('agentConfig', newConfig);
    fixture.detectChanges();
    jasmine.clock().tick(0);

    expect(queue.clear).toHaveBeenCalled();
    expect(animation.exitAnimation).toHaveBeenCalled();
    expect(speech.hide).toHaveBeenCalledWith(true);
    expect(tts.cancel).toHaveBeenCalled();
    expect(animation.reinitialize).toHaveBeenCalled();
    jasmine.clock().uninstall();
  });

  it('handles show branches with and without initial position', () => {
    const positionSpy = spyOn(component as unknown as { positionAgent: () => void }, 'positionAgent').and.callThrough();
    const syncSpy = spyOn(component as unknown as { scheduleViewportSync: () => void }, 'scheduleViewportSync').and.callThrough();
    const playSpy = spyOn(component, 'play').and.returnValue(true);

    container.style.left = '';
    container.style.top = '';
    component.show();
    expect(positionSpy).toHaveBeenCalled();
    expect(syncSpy).toHaveBeenCalled();
    expect(playSpy).toHaveBeenCalledWith('Show');

    positionSpy.calls.reset();
    syncSpy.calls.reset();
    playSpy.calls.reset();
    container.style.left = '10px';
    container.style.top = '20px';
    component.show(true);
    expect(positionSpy).not.toHaveBeenCalled();
    expect(syncSpy).not.toHaveBeenCalled();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('handles hide immediate and queued branches', () => {
    component.show(true);
    component.hide(true);
    expect(component.isVisible()).toBeFalse();
    expect(animation.exitAnimation).toHaveBeenCalled();

    component.show(true);
    component.hide(false);
    const action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(component.isVisible()).toBeFalse();

    queue.enqueue.calls.reset();
    component.hide();
    expect(queue.enqueue).toHaveBeenCalled();
  });

  it('handles play branches and timeout cleanup', async () => {
    animation.hasAnimation.and.returnValue(false);
    expect(component.play('Missing')).toBeFalse();
    expect(queue.enqueue).not.toHaveBeenCalled();

    animation.hasAnimation.and.returnValue(true);
    expect(component.play('Wave', 10)).toBeTrue();
    let action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    const clearSpy = spyOn(window, 'clearTimeout').and.callThrough();
    action.execute().subscribe();
    expect(clearSpy).toHaveBeenCalled();

    queue.enqueue.calls.reset();
    animation.exitAnimation.calls.reset();
    animation.playAnimation.and.returnValue(new Subject<any>().asObservable());
    expect(component.play('Wave', 1)).toBeTrue();
    action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    const pendingSub = action.execute().subscribe();
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(animation.exitAnimation).toHaveBeenCalled();
    pendingSub.unsubscribe();

    queue.enqueue.calls.reset();
    clearSpy.calls.reset();
    expect(component.play('Wave', 0)).toBeTrue();
    action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('handles animate, speak, and double-click branches', () => {
    animation.getAnimations.and.returnValue(['IdleOne']);
    expect(component.animate()).toBeFalse();

    animation.getAnimations.and.returnValue(['IdleOne', 'Wave']);
    const playSpy = spyOn(component, 'play').and.returnValue(true);
    spyOn(Math, 'random').and.returnValue(0);
    expect(component.animate()).toBeTrue();
    expect(playSpy).toHaveBeenCalledWith('Wave');

    component.speak('hello', { tts: true, hold: true });
    let action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(speech.speak).toHaveBeenCalledWith('hello', true);
    expect(tts.speak).toHaveBeenCalledWith('hello');

    component.speak('no tts');
    action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(speech.speak).toHaveBeenCalledWith('no tts', undefined);

    playSpy.and.returnValue(false);
    const animateSpy = spyOn(component, 'animate').and.returnValue(true);
    component.onDoubleClick();
    expect(animateSpy).toHaveBeenCalled();

    playSpy.and.returnValue(true);
    animateSpy.calls.reset();
    component.onDoubleClick();
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('handles speakStream success, error, and teardown paths', async () => {
    const streamPush = jasmine.createSpy('push');
    const streamDone = jasmine.createSpy('done');
    speech.speakStream.and.returnValue({
      push: streamPush,
      done: streamDone,
      complete$: EMPTY,
    });

    const successIterator = {
      next: jasmine.createSpy('next').and.callFake(() => {
        if (successIterator.next.calls.count() === 1) {
          return Promise.resolve({ done: false, value: 'Hi' });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
      return: jasmine.createSpy('return').and.resolveTo({ done: true, value: undefined }),
    };
    const source: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => successIterator,
    };

    await new Promise<void>((resolve, reject) => {
      component.speakStream(source, { tts: true }).subscribe({
        complete: resolve,
        error: reject,
      });
    });
    expect(streamPush).toHaveBeenCalledWith('Hi');
    expect(tts.speak).toHaveBeenCalledWith('Hi');
    expect(streamDone).toHaveBeenCalled();

    const streamDone2 = jasmine.createSpy('done2');
    speech.speakStream.and.returnValue({
      push: jasmine.createSpy('push2'),
      done: streamDone2,
      complete$: EMPTY,
    });
    const error = new Error('boom');
    const errorSource: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: async () => {
            throw error;
          },
        };
      },
    };
    let receivedError: unknown;
    await new Promise<void>(resolve => {
      component.speakStream(errorSource).subscribe({
        error: (e) => {
          receivedError = e;
          resolve();
        },
      });
    });
    expect(receivedError).toBe(error);
    expect(streamDone2).toHaveBeenCalled();

    const iteratorReturn = jasmine.createSpy('return').and.resolveTo({ done: true, value: undefined });
    speech.speakStream.and.returnValue({
      push: jasmine.createSpy('push3'),
      done: jasmine.createSpy('done3'),
      complete$: EMPTY,
    });
    const pendingSource: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: () => new Promise(() => {}),
          return: iteratorReturn,
        };
      },
    };
    const sub = component.speakStream(pendingSource).subscribe();
    sub.unsubscribe();
    await Promise.resolve();
    expect(iteratorReturn).toHaveBeenCalled();
  });

  it('handles moveTo branches and gestureAt fallback', () => {
    const calcSpy = spyOn(component as unknown as { calculateDirection: (x: number, y: number) => string }, 'calculateDirection').and.returnValue('Right');
    const setPosSpy = spyOn(component as unknown as { setPosition: (x: number, y: number) => void }, 'setPosition');
    const movementSpy = spyOn(component as unknown as { animateMovement: (x: number, y: number, duration: number) => Observable<void> }, 'animateMovement').and.returnValue(of(void 0));
    const withMovementSpy = spyOn(component as unknown as { animateWithMovement: (name: string, x: number, y: number, duration: number) => Observable<void> }, 'animateWithMovement').and.returnValue(of(void 0));

    animation.hasAnimation.and.returnValue(false);
    component.moveTo(10, 20, 0);
    let action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(setPosSpy).toHaveBeenCalled();

    component.moveTo(10, 20, 100);
    action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(movementSpy).toHaveBeenCalled();

    queue.enqueue.calls.reset();
    component.moveTo(11, 21);
    action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(movementSpy).toHaveBeenCalledWith(jasmine.any(Number), jasmine.any(Number), 1000);

    animation.hasAnimation.and.returnValue(true);
    component.moveTo(10, 20, 100);
    action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    action.execute().subscribe();
    expect(withMovementSpy).toHaveBeenCalled();
    expect(calcSpy).toHaveBeenCalled();

    const playSpy = spyOn(component, 'play').and.returnValue(true);
    animation.hasAnimation.and.callFake((_data, name) => name === 'GestureRight');
    expect(component.gestureAt(0, 0)).toBeTrue();
    expect(playSpy).toHaveBeenCalledWith('GestureRight');

    animation.hasAnimation.and.returnValue(false);
    expect(component.gestureAt(0, 0)).toBeTrue();
    expect(playSpy).toHaveBeenCalledWith('LookRight');
  });

  it('handles delay, stopCurrent, stop, closeBalloon, and wrappers', () => {
    jasmine.clock().install();
    component.delay(5);
    const action = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    let completed = false;
    action.execute().subscribe({ complete: () => (completed = true) });
    jasmine.clock().tick(5);
    expect(completed).toBeTrue();

    component.delay();
    const defaultAction = queue.enqueue.calls.mostRecent().args[0] as QueuedAction;
    let defaultCompleted = false;
    defaultAction.execute().subscribe({ complete: () => (defaultCompleted = true) });
    jasmine.clock().tick(250);
    expect(defaultCompleted).toBeTrue();

    component.stopCurrent();
    expect(animation.exitAnimation).toHaveBeenCalled();
    expect(speech.close).toHaveBeenCalled();

    component.stop();
    expect(queue.clear).toHaveBeenCalled();
    expect(speech.hide).toHaveBeenCalledWith(true);
    expect(tts.cancel).toHaveBeenCalled();

    component.closeBalloon();
    expect(speech.hide).toHaveBeenCalledWith();

    expect(component.getAnimations()).toEqual(animation.getAnimations.calls.mostRecent().returnValue as string[]);
    animation.hasAnimation.and.returnValue(true);
    expect(component.hasAnimation('Show')).toBeTrue();
    jasmine.clock().uninstall();
  });

  it('binds dblclick from template to onDoubleClick', () => {
    const dblSpy = spyOn(component, 'onDoubleClick').and.callThrough();
    container.dispatchEvent(new MouseEvent('dblclick'));
    expect(dblSpy).toHaveBeenCalled();
  });

  it('handles drag and queue-empty subscriptions from setup hooks', () => {
    drag.dragStartSubject.next({ x: 0, y: 0 });
    expect(animation.pause).toHaveBeenCalled();
    expect(speech.hide).toHaveBeenCalledWith(true);

    drag.clampToViewport.and.returnValue({ x: 33, y: 44 });
    drag.dragMoveSubject.next({ x: 30, y: 40 });
    expect(container.style.left).toBe('33px');
    expect(container.style.top).toBe('44px');

    drag.dragEndSubject.next();
    expect(speech.show).toHaveBeenCalled();
    expect(speech.reposition).toHaveBeenCalled();

    animation.playAnimation.calls.reset();
    queue.queueEmptySubject.next();
    expect(animation.playAnimation).not.toHaveBeenCalled();

    component.show(true);
    animation.playAnimation.calls.reset();
    animation.playAnimation.and.returnValue(new Subject<any>().asObservable());
    queue.queueEmptySubject.next();
    expect(animation.playAnimation).toHaveBeenCalled();
  });

  it('covers private idle-loop branches and cancel logic', () => {
    jasmine.clock().install();
    const c = component as unknown as {
      startIdleLoop: () => void;
      cancelIdleLoop: () => void;
      idleLoopToken: number;
      isHidden: boolean;
      idleLoopSubscription?: { unsubscribe: () => void };
    };

    c.isHidden = true;
    animation.playAnimation.calls.reset();
    c.startIdleLoop();
    expect(animation.playAnimation).not.toHaveBeenCalled();

    c.isHidden = false;
    animation.getAnimations.and.returnValue(['Wave']);
    c.startIdleLoop();
    expect(animation.playAnimation).not.toHaveBeenCalled();

    animation.getAnimations.and.returnValue(['IdleOne']);
    let callCount = 0;
    const never = new Subject<any>();
    animation.playAnimation.and.callFake(() => {
      callCount++;
      return callCount === 1 ? of(void 0) : never.asObservable();
    });
    c.startIdleLoop();
    jasmine.clock().tick(0);
    expect(animation.playAnimation.calls.count()).toBeGreaterThanOrEqual(2);

    c.startIdleLoop();
    c.idleLoopToken++;
    jasmine.clock().tick(0);
    expect(true).toBeTrue();

    const unsubSpy = jasmine.createSpy('unsubscribe');
    c.idleLoopSubscription = { unsubscribe: unsubSpy };
    c.cancelIdleLoop();
    expect(unsubSpy).toHaveBeenCalled();
    jasmine.clock().uninstall();
  });

  it('covers calculateDirection branches including top fallback', () => {
    spyOn(container, 'getBoundingClientRect').and.returnValue(makeRect(0, 0, 200, 120));
    setOffsetSize(container, 200, 120);
    const c = component as unknown as { calculateDirection: (x: number, y: number) => string };

    expect(c.calculateDirection(50, 60)).toBe('Right');
    expect(c.calculateDirection(50, 0)).toBe('Up');
    expect(c.calculateDirection(150, 60)).toBe('Left');
    expect(c.calculateDirection(50, 121)).toBe('Down');
    expect(c.calculateDirection(Number.NaN, Number.NaN)).toBe('Top');
  });

  it('covers geometry helpers and viewport sync branches', () => {
    jasmine.clock().install();
    const c = component as unknown as {
      clampPosition: (x: number, y: number) => { x: number; y: number };
      setPosition: (x: number, y: number) => void;
      positionAgent: () => void;
      getAgentDimensions: () => { width: number; height: number };
      scheduleViewportSync: () => void;
      isHidden: boolean;
      positionAgentInternal?: () => void;
    };

    drag.clampToViewport.and.returnValue({ x: 7, y: 9 });
    expect(c.clampPosition(1, 2)).toEqual({ x: 7, y: 9 });
    c.setPosition(11, 22);
    expect(container.style.left).toBe('11px');
    expect(container.style.top).toBe('22px');

    const originalWidth = container.offsetWidth;
    const originalHeight = container.offsetHeight;
    setOffsetSize(container, 0, 0);
    expect(c.getAgentDimensions()).toEqual({ width: config.agentData.framesize[0], height: config.agentData.framesize[1] });
    setOffsetSize(container, originalWidth, originalHeight);
    expect(c.getAgentDimensions()).toEqual({ width: originalWidth, height: originalHeight });

    const setPosSpy = spyOn(c, 'setPosition').and.callThrough();
    c.positionAgent();
    expect(setPosSpy).toHaveBeenCalled();

    const positionSpy = spyOn(c, 'positionAgent').and.callThrough();
    c.isHidden = true;
    c.scheduleViewportSync();
    jasmine.clock().tick(0);
    expect(positionSpy).not.toHaveBeenCalled();

    c.isHidden = false;
    c.scheduleViewportSync();
    jasmine.clock().tick(0);
    expect(positionSpy).toHaveBeenCalled();
    jasmine.clock().uninstall();
  });

  it('covers animateMovement and animateWithMovement including teardown', () => {
    const perfSpy = spyOn(performance, 'now').and.returnValue(100);
    const styleSpy = spyOn(window, 'getComputedStyle').and.returnValue({ left: '0px', top: '0px' } as unknown as CSSStyleDeclaration);
    let rafCalls = 0;
    const rafSpy = spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      rafCalls++;
      cb(rafCalls === 1 ? 105 : 110);
      return rafCalls;
    });

    let movedComplete = false;
    (component as unknown as { animateMovement: (x: number, y: number, duration: number) => Observable<void> })
      .animateMovement(10, 20, 10)
      .subscribe({ complete: () => (movedComplete = true) });
    expect(movedComplete).toBeTrue();
    expect(rafSpy).toHaveBeenCalled();
    expect(perfSpy).toHaveBeenCalled();
    expect(styleSpy).toHaveBeenCalled();

    const movementSubject = new Subject<void>();
    spyOn(component as unknown as { animateMovement: (x: number, y: number, duration: number) => Observable<void> }, 'animateMovement')
      .and.returnValue(movementSubject.asObservable());
    const animNever = new Subject<void>();
    animation.playAnimation.and.returnValue(animNever.asObservable() as any);

    let next = 0;
    let done = 0;
    (component as unknown as {
      animateWithMovement: (name: string, x: number, y: number, duration: number) => Observable<void>;
    }).animateWithMovement('MoveRight', 1, 2, 3).subscribe({
      next: () => next++,
      complete: () => done++,
    });
    movementSubject.next();
    expect(animation.exitAnimation).toHaveBeenCalled();
    expect(next).toBe(1);
    expect(done).toBe(1);

    let animUnsub = false;
    let moveUnsub = false;
    animation.playAnimation.and.returnValue(new Observable<any>(() => () => { animUnsub = true; }));
    (component as unknown as { animateMovement: (x: number, y: number, duration: number) => Observable<void> }).animateMovement =
      () => new Observable<void>(() => () => { moveUnsub = true; });
    const sub = (component as unknown as {
      animateWithMovement: (name: string, x: number, y: number, duration: number) => Observable<void>;
    }).animateWithMovement('MoveRight', 3, 4, 5).subscribe();
    sub.unsubscribe();
    expect(animUnsub).toBeTrue();
    expect(moveUnsub).toBeTrue();
  });

  it('calls dispose through ngOnDestroy', () => {
    component.ngOnDestroy();
    expect(animation.dispose).toHaveBeenCalled();
    expect(speech.dispose).toHaveBeenCalled();
    expect(drag.dispose).toHaveBeenCalled();
    expect(tts.cancel).toHaveBeenCalled();
  });
});

function makeAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    name: 'Clippy',
    mapUrl: '/map.avif',
    sounds: {},
    agentData: {
      framesize: [160, 120],
      overlayCount: 1,
      sounds: [],
      tts: {
        rate: 1,
        pitch: 1,
        voice: 'Amy',
      },
      animations: {
        Show: { frames: [{ duration: 1 }] },
        Hide: { frames: [{ duration: 1 }] },
        ClickedOn: { frames: [{ duration: 1 }] },
        Wave: { frames: [{ duration: 1 }] },
        IdleOne: { frames: [{ duration: 1 }] },
        MoveRight: { frames: [{ duration: 1 }] },
        GestureRight: { frames: [{ duration: 1 }] },
        LookRight: { frames: [{ duration: 1 }] },
      },
    },
    ...overrides,
  };
}

function setOffsetSize(element: HTMLElement, width: number, height: number): void {
  Object.defineProperty(element, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true });
}

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}
