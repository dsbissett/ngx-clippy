import { Observable } from 'rxjs';

/**
 * Represents a queued action to be executed
 */
export interface QueuedAction {
  execute(): Observable<unknown>;
}

/**
 * Action types for the agent
 */
export enum ActionType {
  ANIMATION = 'animation',
  MOVEMENT = 'movement',
  SPEECH = 'speech',
  DELAY = 'delay'
}
