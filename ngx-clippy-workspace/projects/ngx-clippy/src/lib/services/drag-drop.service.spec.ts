import { Renderer2, RendererFactory2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DragDropService } from './drag-drop.service';

describe('DragDropService', () => {
  let service: DragDropService;
  let rendererFactory: RendererFactory2 & { createRenderer: jasmine.Spy };
  let renderer: Renderer2;

  beforeEach(() => {
    renderer = {} as Renderer2;
    rendererFactory = {
      createRenderer: jasmine.createSpy('createRenderer').and.returnValue(renderer),
    } as unknown as RendererFactory2 & { createRenderer: jasmine.Spy };

    service = new DragDropService(rendererFactory);
  });

  it('can be created through Angular DI', () => {
    TestBed.configureTestingModule({
      providers: [
        DragDropService,
        { provide: RendererFactory2, useValue: rendererFactory },
      ],
    });

    const injected = TestBed.inject(DragDropService);
    expect(injected).toBeTruthy();
  });

  it('clamps position to viewport margins and maximum bounds', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(500);
    spyOnProperty(window, 'innerHeight', 'get').and.returnValue(400);

    expect(service.clampToViewport({ x: 100, y: 150 }, 20, 20)).toEqual({ x: 100, y: 150 });
    expect(service.clampToViewport({ x: -10, y: -20 }, 20, 20)).toEqual({ x: 5, y: 5 });
    expect(service.clampToViewport({ x: 999, y: 999 }, 20, 20)).toEqual({ x: 475, y: 375 });
  });

  it('handles mouse drag start, move, and end, then stops move emission after end', () => {
    const element = document.createElement('div');
    spyOn(element, 'getBoundingClientRect').and.returnValue(makeRect(10, 20, 40, 50));

    const starts: Array<{ x: number; y: number }> = [];
    const moves: Array<{ x: number; y: number }> = [];
    let ended = 0;

    service.onDragStart$.subscribe(pos => starts.push(pos));
    service.onDragMove$.subscribe(pos => moves.push(pos));
    service.onDragEnd$.subscribe(() => ended++);

    service.enableDrag(element);

    const down = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 35,
      clientY: 55,
    });
    element.dispatchEvent(down);
    expect(down.defaultPrevented).toBeTrue();

    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 60,
      clientY: 90,
    }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

    const moveCountAtEnd = moves.length;
    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 120,
    }));

    expect(starts).toEqual([{ x: 10, y: 20 }]);
    expect(moves).toEqual([{ x: 35, y: 55 }]);
    expect(ended).toBe(1);
    expect(moves.length).toBe(moveCountAtEnd);
  });

  it('handles touch drag start, move, and end', () => {
    const element = document.createElement('div');
    spyOn(element, 'getBoundingClientRect').and.returnValue(makeRect(10, 20, 40, 50));

    const starts: Array<{ x: number; y: number }> = [];
    const moves: Array<{ x: number; y: number }> = [];
    let ended = 0;

    service.onDragStart$.subscribe(pos => starts.push(pos));
    service.onDragMove$.subscribe(pos => moves.push(pos));
    service.onDragEnd$.subscribe(() => ended++);

    service.enableDrag(element);

    const touchStart = createTouchLikeEvent('touchstart', [{ clientX: 50, clientY: 70 }]);
    element.dispatchEvent(touchStart);
    expect(touchStart.defaultPrevented).toBeTrue();

    document.dispatchEvent(createTouchLikeEvent('touchmove', [{ clientX: 70, clientY: 100 }]));
    document.dispatchEvent(createTouchLikeEvent('touchend', []));

    const moveCountAtEnd = moves.length;
    document.dispatchEvent(createTouchLikeEvent('touchmove', [{ clientX: 90, clientY: 130 }]));

    expect(starts).toEqual([{ x: 10, y: 20 }]);
    expect(moves).toEqual([{ x: 30, y: 50 }]);
    expect(ended).toBe(1);
    expect(moves.length).toBe(moveCountAtEnd);
  });

  it('covers getEventPoint fallback when touches exist but are empty', () => {
    const point = (service as unknown as {
      getEventPoint: (event: MouseEvent | TouchEvent) => { x: number; y: number };
    }).getEventPoint({
      touches: [],
      clientX: 7,
      clientY: 9,
    } as unknown as TouchEvent);

    expect(point).toEqual({ x: 7, y: 9 });
  });

  it('completes all observables on dispose()', () => {
    const startComplete = jasmine.createSpy('startComplete');
    const moveComplete = jasmine.createSpy('moveComplete');
    const endComplete = jasmine.createSpy('endComplete');

    service.onDragStart$.subscribe({ complete: startComplete });
    service.onDragMove$.subscribe({ complete: moveComplete });
    service.onDragEnd$.subscribe({ complete: endComplete });

    service.dispose();

    expect(startComplete).toHaveBeenCalled();
    expect(moveComplete).toHaveBeenCalled();
    expect(endComplete).toHaveBeenCalled();
  });
});

function createTouchLikeEvent(type: string, touches: Array<{ clientX: number; clientY: number }>): TouchEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', {
    value: touches,
    configurable: true,
  });
  return event;
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
