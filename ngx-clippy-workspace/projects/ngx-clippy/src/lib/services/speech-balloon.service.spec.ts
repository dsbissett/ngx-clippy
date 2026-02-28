import { Renderer2, RendererFactory2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { BalloonSide } from '../models/speech-options.interface';
import { SpeechBalloonService } from './speech-balloon.service';

describe('SpeechBalloonService', () => {
  let service: SpeechBalloonService;
  let renderer: Renderer2 & {
    createElement: jasmine.Spy<(name: string) => HTMLDivElement>;
    appendChild: jasmine.Spy<(parent: Node, child: Node) => void>;
    removeChild: jasmine.Spy<(parent: Node, child: Node) => void>;
    setStyle: jasmine.Spy<(target: any, style: string, value: string) => void>;
    setProperty: jasmine.Spy<(target: any, prop: string, value: unknown) => void>;
  };
  let rendererFactory: RendererFactory2 & { createRenderer: jasmine.Spy };
  let target: HTMLDivElement;

  beforeEach(() => {
    renderer = {
      createElement: jasmine.createSpy('createElement').and.callFake((name: string) => document.createElement(name) as HTMLDivElement),
      appendChild: jasmine.createSpy('appendChild').and.callFake((parent: Node, child: Node) => {
        parent.appendChild(child);
      }),
      removeChild: jasmine.createSpy('removeChild').and.callFake((parent: Node, child: Node) => {
        if (parent.contains(child)) {
          parent.removeChild(child);
        }
      }),
      setStyle: jasmine.createSpy('setStyle').and.callFake((targetNode: any, style: string, value: string) => {
        if (targetNode?.style) {
          (targetNode.style as any)[style] = value;
        }
      }),
      setProperty: jasmine.createSpy('setProperty').and.callFake((targetNode: any, prop: string, value: unknown) => {
        targetNode[prop] = value;
      }),
    } as unknown as Renderer2 & {
      createElement: jasmine.Spy<(name: string) => HTMLDivElement>;
      appendChild: jasmine.Spy<(parent: Node, child: Node) => void>;
      removeChild: jasmine.Spy<(parent: Node, child: Node) => void>;
      setStyle: jasmine.Spy<(target: any, style: string, value: string) => void>;
      setProperty: jasmine.Spy<(target: any, prop: string, value: unknown) => void>;
    };

    rendererFactory = {
      createRenderer: jasmine.createSpy('createRenderer').and.returnValue(renderer),
    } as unknown as RendererFactory2 & { createRenderer: jasmine.Spy };

    service = new SpeechBalloonService(rendererFactory);

    target = document.createElement('div');
    setElementSize(target, 120, 80);
    spyOn(target, 'getBoundingClientRect').and.returnValue(makeRect(200, 300, 120, 80));
  });

  afterEach(() => {
    try {
      jasmine.clock().uninstall();
    } catch {
      // no fake timers installed in this test
    }
  });

  it('can be created through Angular DI', () => {
    TestBed.configureTestingModule({
      providers: [
        SpeechBalloonService,
        { provide: RendererFactory2, useValue: rendererFactory },
      ],
    });

    const injected = TestBed.inject(SpeechBalloonService);
    expect(injected).toBeTruthy();
  });

  it('initializes balloon elements and handles show/hide immediate branches', () => {
    service.initialize(target);
    const privateService = service as unknown as {
      balloonElement: HTMLDivElement;
      contentElement: HTMLDivElement;
      tipElement: HTMLDivElement;
      isHidden: boolean;
    };

    expect(privateService.balloonElement).toBeDefined();
    expect(privateService.contentElement).toBeDefined();
    expect(privateService.tipElement).toBeDefined();
    expect(document.body.contains(privateService.balloonElement)).toBeTrue();

    const beforeShowCalls = renderer.setStyle.calls.count();
    service.show();
    expect(renderer.setStyle.calls.count()).toBe(beforeShowCalls);

    privateService.isHidden = false;
    service.show();
    expect(renderer.setStyle).toHaveBeenCalledWith(privateService.balloonElement, 'display', 'block');

    service.hide(true);
    expect(renderer.setStyle).toHaveBeenCalledWith(privateService.balloonElement, 'display', 'none');

    service.dispose();
  });

  it('animates speech text and auto-hides after delay when hold is false', () => {
    jasmine.clock().install();

    service.initialize(target);
    const privateService = service as unknown as {
      contentElement: HTMLDivElement;
      balloonElement: HTMLDivElement;
      isHidden: boolean;
      hideTimeout?: number;
    };

    setElementSize(privateService.contentElement, 140, 50);
    setElementSize(privateService.balloonElement, 200, 80);
    spyOn(privateService.balloonElement, 'getBoundingClientRect').and.returnValue(makeRect(50, 50, 200, 80));

    let nextCount = 0;
    let completed = 0;
    service.speak('hello world').subscribe({
      next: () => nextCount++,
      complete: () => completed++,
    });

    jasmine.clock().tick(400);
    expect(nextCount).toBe(1);
    expect(completed).toBe(1);
    expect(privateService.isHidden).toBeFalse();

    jasmine.clock().tick(4999);
    expect(privateService.isHidden).toBeFalse();

    jasmine.clock().tick(1);
    expect(privateService.isHidden).toBeTrue();
    expect(privateService.hideTimeout).toBeUndefined();
  });

  it('uses the default hold=false parameter when omitted', () => {
    service.initialize(target);
    const privateService = service as unknown as {
      contentElement: HTMLDivElement;
      animateText: (text: string, hold: boolean) => unknown;
    };
    setElementSize(privateService.contentElement, 120, 40);
    const animateSpy = spyOn(privateService, 'animateText').and.returnValue(EMPTY);

    Reflect.apply((service as unknown as { speak: (text: string, hold?: boolean) => unknown }).speak, service, ['default hold']);
    Reflect.apply((service as unknown as { speak: (text: string, hold?: boolean) => unknown }).speak, service, ['explicit hold', true]);

    expect(animateSpy).toHaveBeenCalledWith('default hold', false);
    expect(animateSpy).toHaveBeenCalledWith('explicit hold', true);
  });

  it('covers animateText hold=true and inactive branches', () => {
    jasmine.clock().install();

    service.initialize(target);
    const privateService = service as unknown as {
      contentElement: HTMLDivElement;
      animateText: (text: string, hold: boolean) => { subscribe: (obs: any) => void };
      isActive: boolean;
    };
    setElementSize(privateService.contentElement, 120, 40);

    let holdNext = 0;
    let holdComplete = 0;
    privateService.animateText('one two', true).subscribe({
      next: () => holdNext++,
      complete: () => holdComplete++,
    });

    jasmine.clock().tick(1000);
    expect(holdNext).toBe(0);
    expect(holdComplete).toBe(0);
    expect(privateService.isActive).toBeFalse();

    let inactiveComplete = 0;
    privateService.animateText('a b', true).subscribe({
      complete: () => inactiveComplete++,
    });
    privateService.isActive = false;
    jasmine.clock().tick(200);
    expect(inactiveComplete).toBe(1);
  });

  it('streams speech chunks and completes/hides on done()', () => {
    jasmine.clock().install();

    service.initialize(target);
    const privateService = service as unknown as {
      contentElement: HTMLDivElement;
      balloonElement: HTMLDivElement;
      isHidden: boolean;
    };
    setElementSize(privateService.contentElement, 120, 40);
    setElementSize(privateService.balloonElement, 200, 80);
    spyOn(privateService.balloonElement, 'getBoundingClientRect').and.returnValue(makeRect(50, 50, 200, 80));

    const stream = service.speakStream();
    let completeNext = 0;
    let completeDone = 0;
    stream.complete$.subscribe({
      next: () => completeNext++,
      complete: () => completeDone++,
    });

    stream.push('Hello');
    stream.push(' world');
    expect(privateService.contentElement.textContent).toBe('Hello world');

    stream.done();
    expect(completeNext).toBe(1);
    expect(completeDone).toBe(1);
    expect(privateService.isHidden).toBeFalse();

    jasmine.clock().tick(5000);
    expect(privateService.isHidden).toBeTrue();
  });

  it('closes only active balloons and covers finishHide active branch', () => {
    jasmine.clock().install();

    service.initialize(target);
    const privateService = service as unknown as {
      isActive: boolean;
      shouldHold: boolean;
      isHidden: boolean;
      hideTimeout?: number;
      finishHide: () => void;
    };

    privateService.shouldHold = true;
    privateService.isActive = false;
    service.close();
    expect(privateService.shouldHold).toBeTrue();

    privateService.isActive = true;
    service.close();
    expect(privateService.shouldHold).toBeFalse();

    privateService.isHidden = false;
    service.hide(false);
    jasmine.clock().tick(5000);
    expect(privateService.isHidden).toBeFalse();
    expect(privateService.hideTimeout).toBeDefined();

    privateService.finishHide();
    expect(privateService.isHidden).toBeFalse();
  });

  it('covers reposition loop and positionBalloon with missing target', () => {
    const other = new SpeechBalloonService(rendererFactory);
    expect(() => {
      (other as unknown as { positionBalloon: (side: BalloonSide) => void }).positionBalloon('top-left');
    }).not.toThrow();

    service.initialize(target);
    const positionSpy = spyOn(service as unknown as { positionBalloon: (side: BalloonSide) => void }, 'positionBalloon').and.callThrough();
    const offScreenSpy = spyOn(service as unknown as { isOffScreen: () => boolean }, 'isOffScreen').and.returnValues(true, true, false);

    service.reposition();

    expect(positionSpy.calls.count()).toBe(3);
    expect(positionSpy.calls.argsFor(0)[0]).toBe('top-left');
    expect(positionSpy.calls.argsFor(1)[0]).toBe('top-right');
    expect(positionSpy.calls.argsFor(2)[0]).toBe('bottom-left');
    expect(offScreenSpy.calls.count()).toBe(3);
  });

  it('covers calculatePosition, positionTip, and screen bounds logic', () => {
    service.initialize(target);
    const privateService = service as unknown as {
      balloonElement: HTMLDivElement;
      tipElement: HTMLDivElement;
      calculatePosition: (
        side: BalloonSide,
        rect: DOMRect,
        targetWidth: number,
        targetHeight: number,
        balloonWidth: number,
        balloonHeight: number
      ) => { top: number; left: number };
      positionTip: (side: BalloonSide) => void;
      isOffScreen: () => boolean;
      setTipStyles: (top: string, marginTop: string, left: string, marginLeft: string, bgPosition: string) => void;
    };

    const rect = makeRect(100, 200, 80, 60);
    expect(privateService.calculatePosition('top-left', rect, 80, 60, 50, 20)).toEqual({ left: 130, top: 165 });
    expect(privateService.calculatePosition('top-right', rect, 80, 60, 50, 20)).toEqual({ left: 100, top: 165 });
    expect(privateService.calculatePosition('bottom-right', rect, 80, 60, 50, 20)).toEqual({ left: 100, top: 275 });
    expect(privateService.calculatePosition('bottom-left', rect, 80, 60, 50, 20)).toEqual({ left: 130, top: 275 });

    privateService.positionTip('top-left');
    privateService.positionTip('top-right');
    privateService.positionTip('bottom-right');
    privateService.positionTip('bottom-left');
    privateService.setTipStyles('1px', '2px', '3px', '4px', '');

    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(300);
    spyOnProperty(window, 'innerHeight', 'get').and.returnValue(200);

    spyOn(privateService.balloonElement, 'getBoundingClientRect')
      .and.returnValues(
        makeRect(-1, 10, 20, 20),
        makeRect(290, 190, 20, 20),
        makeRect(50, 50, 20, 20)
      );

    expect(privateService.isOffScreen()).toBeTrue();
    expect(privateService.isOffScreen()).toBeTrue();
    expect(privateService.isOffScreen()).toBeFalse();
  });

  it('disposes with and without hide timeout', () => {
    const clearSpy = spyOn(window, 'clearTimeout').and.callThrough();

    const other = new SpeechBalloonService(rendererFactory);
    expect(() => other.dispose()).not.toThrow();

    service.initialize(target);
    const privateService = service as unknown as { hideTimeout?: number };
    service.hide();
    expect(privateService.hideTimeout).toBeDefined();

    service.dispose();
    expect(clearSpy).toHaveBeenCalled();
    expect(renderer.removeChild).toHaveBeenCalled();
  });
});

function setElementSize(element: HTMLElement, width: number, height: number): void {
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
