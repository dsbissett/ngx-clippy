/**
 * Configuration for loading an agent's assets
 */
export interface AgentConfig {
  readonly name: string;
  readonly agentData: AgentData;
  readonly mapUrl: string;
  readonly sounds: Record<string, string>;
}

/**
 * Agent animation and sprite data
 */
export interface AgentData {
  readonly framesize: [number, number];
  readonly overlayCount: number;
  readonly sounds: readonly string[];
  readonly animations: Record<string, AnimationData>;
  readonly tts?: TextToSpeechConfig;
}

/**
 * Animation frame and branching data
 */
export interface AnimationData {
  readonly frames: readonly AnimationFrame[];
  readonly useExitBranching?: boolean;
}

/**
 * Individual animation frame
 */
export interface AnimationFrame {
  readonly duration: number;
  readonly images?: readonly [number, number][];
  readonly sound?: string;
  readonly exitBranch?: number;
  readonly branching?: BranchingData;
}

/**
 * Branching logic for animation paths
 */
export interface BranchingData {
  readonly branches: readonly Branch[];
}

/**
 * Individual branch option
 */
export interface Branch {
  readonly frameIndex: number;
  readonly weight: number;
}

/**
 * Text-to-speech configuration
 */
export interface TextToSpeechConfig {
  readonly rate: number;
  readonly pitch: number;
  readonly voice: string;
}
