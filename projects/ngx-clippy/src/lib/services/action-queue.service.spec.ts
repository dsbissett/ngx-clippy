import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { QueuedAction } from '../models/action.interface';
import { ActionQueueService } from './action-queue.service';

type ControlledAction = {
  action: QueuedAction;
  executeSpy: jasmine.Spy<() => Subject<unknown>>;
  stream: Subject<unknown>;
};

describe('ActionQueueService', () => {
  let service: ActionQueueService;

  beforeEach(() => {
    service = new ActionQueueService();
  });

  it('can be created through Angular DI', () => {
    TestBed.configureTestingModule({
      providers: [ActionQueueService],
    });

    const injected = TestBed.inject(ActionQueueService);
    expect(injected).toBeTruthy();
  });

  it('executes queued actions sequentially and emits queue-empty when all complete', () => {
    const first = createControlledAction('first');
    const second = createControlledAction('second');
    let queueEmptyCount = 0;

    service.onQueueEmpty$.subscribe(() => {
      queueEmptyCount++;
    });

    service.enqueue(first.action);
    service.enqueue(second.action);

    expect(first.executeSpy).toHaveBeenCalledTimes(1);
    expect(second.executeSpy).not.toHaveBeenCalled();
    expect(queueEmptyCount).toBe(0);

    first.stream.next('WAITING');
    expect(second.executeSpy).not.toHaveBeenCalled();
    expect(queueEmptyCount).toBe(0);

    first.stream.complete();
    expect(second.executeSpy).toHaveBeenCalledTimes(1);
    expect(queueEmptyCount).toBe(0);

    second.stream.complete();
    expect(queueEmptyCount).toBe(1);
  });

  it('emits cleared and cancels in-progress and buffered actions on clear()', () => {
    const first = createControlledAction('first');
    const buffered = createControlledAction('buffered');
    const afterClear = createControlledAction('after-clear');
    let clearedCount = 0;
    let queueEmptyCount = 0;

    service.onCleared$.subscribe(() => {
      clearedCount++;
    });
    service.onQueueEmpty$.subscribe(() => {
      queueEmptyCount++;
    });

    service.enqueue(first.action);
    service.enqueue(buffered.action);

    expect(first.executeSpy).toHaveBeenCalledTimes(1);
    expect(buffered.executeSpy).not.toHaveBeenCalled();

    service.clear();
    expect(clearedCount).toBe(1);

    first.stream.complete();
    expect(buffered.executeSpy).not.toHaveBeenCalled();
    expect(queueEmptyCount).toBe(0);

    service.enqueue(afterClear.action);
    expect(afterClear.executeSpy).toHaveBeenCalledTimes(1);

    afterClear.stream.complete();
    expect(queueEmptyCount).toBe(1);
  });

  it('does not decrement pendingActions when counter is already zero, but still emits queue-empty', () => {
    const action = createControlledAction('single');
    let queueEmptyCount = 0;

    service.onQueueEmpty$.subscribe(() => {
      queueEmptyCount++;
    });

    service.enqueue(action.action);
    expect(action.executeSpy).toHaveBeenCalledTimes(1);

    (service as unknown as { pendingActions: number }).pendingActions = 0;
    action.stream.complete();

    expect((service as unknown as { pendingActions: number }).pendingActions).toBe(0);
    expect(queueEmptyCount).toBe(1);
  });
});

function createControlledAction(name: string): ControlledAction {
  const stream = new Subject<unknown>();
  const executeSpy = jasmine.createSpy(name).and.returnValue(stream);
  const action: QueuedAction = {
    execute: executeSpy,
  };

  return {
    action,
    executeSpy,
    stream,
  };
}
