import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { concatMap, tap, switchMap, startWith, ignoreElements, endWith } from 'rxjs/operators';
import { QueuedAction } from '../models/action.interface';

/**
 * Service for managing sequential execution of agent actions
 * Follows Single Responsibility Principle - only handles action queuing
 */
@Injectable()
export class ActionQueueService {
  private readonly actionQueue$ = new Subject<QueuedAction>();
  private readonly reset$ = new Subject<void>();
  private readonly queueEmpty$ = new Subject<void>();
  private readonly cleared$ = new Subject<void>();
  private pendingActions = 0;

  constructor() {
    this.initializeQueue();
  }

  /**
   * Get observable that emits when queue becomes empty
   */
  get onQueueEmpty$(): Observable<void> {
    return this.queueEmpty$.asObservable();
  }

  /**
   * Get observable that emits when the queue is cleared
   */
  get onCleared$(): Observable<void> {
    return this.cleared$.asObservable();
  }

  /**
   * Add an action to the queue
   */
  enqueue(action: QueuedAction): void {
    this.pendingActions++;
    this.actionQueue$.next(action);
  }

  /**
   * Cancel the current in-progress action, drop all queued actions,
   * and emit a cleared event.
   */
  clear(): void {
    this.pendingActions = 0;
    this.reset$.next();
  }

  /**
   * Initialize queue processing pipeline.
   * Uses switchMap so that each reset$ emission cancels the current
   * concatMap pipeline (killing in-progress + buffered actions) and
   * restarts a fresh subscription to actionQueue$.
   */
  private initializeQueue(): void {
    this.reset$.pipe(
      startWith(null as null),
      switchMap(() => {
        this.cleared$.next();
        return this.actionQueue$.pipe(
          concatMap(action => action.execute().pipe(
            // Actions may emit intermediate states (e.g. WAITING). Queue advances on completion only.
            ignoreElements(),
            endWith(void 0)
          )),
          tap(() => {
            if (this.pendingActions > 0) {
              this.pendingActions--;
            }
            if (this.pendingActions === 0) {
              this.queueEmpty$.next();
            }
          })
        );
      })
    ).subscribe();
  }
}
