import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Observable, Subject, fromEvent, merge } from 'rxjs';
import { takeUntil, map, tap } from 'rxjs/operators';
import { Position } from '../models/animation-state.interface';

/**
 * Service for handling drag and drop interactions
 * Follows Single Responsibility Principle - only handles drag/drop
 */
@Injectable()
export class DragDropService {
  private renderer: Renderer2;
  private readonly dragStart$ = new Subject<Position>();
  private readonly dragMove$ = new Subject<Position>();
  private readonly dragEnd$ = new Subject<void>();

  constructor(private rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Get drag start observable
   */
  get onDragStart$(): Observable<Position> {
    return this.dragStart$.asObservable();
  }

  /**
   * Get drag move observable
   */
  get onDragMove$(): Observable<Position> {
    return this.dragMove$.asObservable();
  }

  /**
   * Get drag end observable
   */
  get onDragEnd$(): Observable<void> {
    return this.dragEnd$.asObservable();
  }

  /**
   * Enable dragging on an element
   */
  enableDrag(element: HTMLElement): void {
    const mouseDown$ = fromEvent<MouseEvent>(element, 'mousedown');
    const touchStart$ = fromEvent<TouchEvent>(element, 'touchstart', { passive: false });

    merge(mouseDown$, touchStart$).subscribe(event => {
      event.preventDefault();
      this.startDrag(event, element);
    });
  }

  /**
   * Clamp position to viewport bounds (cyclomatic complexity: 1)
   */
  clampToViewport(position: Position, elementWidth: number, elementHeight: number): Position {
    const margin = 5;
    const maxX = window.innerWidth - elementWidth - margin;
    const maxY = window.innerHeight - elementHeight - margin;

    return {
      x: Math.max(margin, Math.min(position.x, maxX)),
      y: Math.max(margin, Math.min(position.y, maxY))
    };
  }

  /**
   * Start drag operation (cyclomatic complexity: 2)
   */
  private startDrag(event: MouseEvent | TouchEvent, element: HTMLElement): void {
    const offset = this.calculateOffset(event, element);
    const stopDrag$ = new Subject<void>();

    const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const touchMove$ = fromEvent<TouchEvent>(document, 'touchmove', { passive: false });
    const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');
    const touchEnd$ = fromEvent<TouchEvent>(document, 'touchend');

    const move$ = merge(mouseMove$, touchMove$).pipe(
      takeUntil(stopDrag$),
      map(e => this.extractPosition(e, offset)),
      tap(pos => this.dragMove$.next(pos))
    );

    const end$ = merge(mouseUp$, touchEnd$).pipe(
      takeUntil(stopDrag$),
      tap(() => {
        this.dragEnd$.next();
        stopDrag$.next();
        stopDrag$.complete();
      })
    );

    const startPos = this.extractPosition(event, offset);
    this.dragStart$.next(startPos);

    move$.subscribe();
    end$.subscribe();
  }

  /**
   * Calculate click offset from element position (cyclomatic complexity: 2)
   */
  private calculateOffset(event: MouseEvent | TouchEvent, element: HTMLElement): Position {
    const point = this.getEventPoint(event);
    const rect = element.getBoundingClientRect();

    return {
      x: point.x - rect.left,
      y: point.y - rect.top
    };
  }

  /**
   * Extract position from event (cyclomatic complexity: 1)
   */
  private extractPosition(event: MouseEvent | TouchEvent, offset: Position): Position {
    const point = this.getEventPoint(event);

    return {
      x: point.x - offset.x,
      y: point.y - offset.y
    };
  }

  /**
   * Get point from mouse or touch event (cyclomatic complexity: 2)
   */
  private getEventPoint(event: MouseEvent | TouchEvent): Position {
    if ('touches' in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }

    const mouseEvent = event as MouseEvent;
    return {
      x: mouseEvent.clientX,
      y: mouseEvent.clientY
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.dragStart$.complete();
    this.dragMove$.complete();
    this.dragEnd$.complete();
  }
}
