/**
 * Animation playback states
 */
export enum AnimationState {
  WAITING = 1,
  EXITED = 0
}

/**
 * Animation state change event
 */
export interface AnimationStateChange {
  readonly animationName: string;
  readonly state: AnimationState;
}

/**
 * Position coordinates
 */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/**
 * Direction for movement and gestures
 */
export type Direction = 'Up' | 'Down' | 'Left' | 'Right' | 'Top';
