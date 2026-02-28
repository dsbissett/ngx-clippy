/*
 * Public API Surface of ngx-clippy
 */

/// <reference path="./typings.d.ts" />

// Module
export * from './lib/ngx-clippy.module';

// Components
export * from './lib/components/clippy-agent/clippy-agent.component';

// Models
export * from './lib/models/agent-config.interface';
export * from './lib/models/animation-state.interface';
export * from './lib/models/speech-options.interface';
export * from './lib/models/action.interface';

// Services (exported for advanced usage and testing)
export * from './lib/services/animation.service';
export * from './lib/services/speech-balloon.service';
export * from './lib/services/action-queue.service';
export * from './lib/services/drag-drop.service';
export * from './lib/services/text-to-speech.service';
export * from './lib/services/agent-loader.service';

// Agent loaders
export * from './lib/agents';
