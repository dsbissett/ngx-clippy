/**
 * Options for speech balloon display
 */
export interface SpeechOptions {
  readonly hold?: boolean;
  readonly tts?: boolean;
}

/**
 * Balloon positioning side
 */
export type BalloonSide = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Balloon position configuration
 */
export interface BalloonPosition {
  readonly top: number;
  readonly left: number;
  readonly side: BalloonSide;
}
