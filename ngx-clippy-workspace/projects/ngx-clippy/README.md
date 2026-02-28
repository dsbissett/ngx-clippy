# ngx-clippy

[![CI](https://github.com/dsbissett/ngx-clippy/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dsbissett/ngx-clippy/actions/workflows/ci.yml)
[![Release](https://github.com/dsbissett/ngx-clippy/actions/workflows/release.yml/badge.svg)](https://github.com/dsbissett/ngx-clippy/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/ngx-clippy.svg)](https://www.npmjs.com/package/ngx-clippy)
[![npm downloads](https://img.shields.io/npm/dm/ngx-clippy.svg)](https://www.npmjs.com/package/ngx-clippy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Angular component library for adding nostalgic Microsoft Office assistant characters (Clippy and friends) to your Angular application.

This is a complete Angular rewrite of [ClippyJS](https://github.com/pi0/clippyjs), following SOLID design principles with full TypeScript support, RxJS observables, and Angular best practices.

## Features

- ✅ **Angular Native**: Built specifically for Angular with proper component architecture
- ✅ **SOLID Principles**: Follows Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles
- ✅ **RxJS Observables**: Uses observables instead of callbacks for reactive programming
- ✅ **TypeScript**: Fully typed with comprehensive interfaces
- ✅ **Testable**: All services are injectable and easily mockable
- ✅ **Low Complexity**: Maximum cyclomatic complexity of 5 per function
- ✅ **No jQuery**: Pure Angular implementation using Renderer2
- ✅ **Multiple Agents**: Clippy, Bonzi, Merlin, Genie, and more!
- ✅ **Interactive**: Drag-and-drop, animations, speech balloons
- ✅ **Text-to-Speech**: Optional Web Speech API integration
- ✅ **Responsive**: Automatically repositions to stay on screen

## Installation

```bash
npm install ngx-clippy
```

## Quick Start

### 1. Import the Module

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxClippyModule } from 'ngx-clippy';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    NgxClippyModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

### 2. Load an Agent in Your Component

```typescript
import { Component, OnInit, ViewChild } from '@angular/core';
import { ClippyAgentComponent, AgentLoaderService, ClippyAgent, AgentConfig } from 'ngx-clippy';

@Component({
  selector: 'app-root',
  template: `
    <clippy-agent *ngIf="agentConfig" [agentConfig]="agentConfig"></clippy-agent>
    <button (click)="showClippy()">Show Clippy</button>
  `
})
export class AppComponent implements OnInit {
  @ViewChild(ClippyAgentComponent) agent?: ClippyAgentComponent;
  agentConfig?: AgentConfig;

  constructor(private agentLoader: AgentLoaderService) {}

  ngOnInit() {
    this.agentLoader.loadAgent('Clippy', ClippyAgent).subscribe(config => {
      this.agentConfig = config;
    });
  }

  showClippy() {
    if (this.agent) {
      this.agent.show();
      this.agent.speak('Hello! I\'m Clippy, your virtual assistant.');
    }
  }
}
```

## Available Agents

Import any of these agents from `ngx-clippy`:

- `ClippyAgent` - The classic paperclip
- `BonziAgent` - Bonzi Buddy
- `F1Agent` - F1 robot
- `GenieAgent` - Genie
- `GeniusAgent` - Genius
- `LinksAgent` - Links the cat
- `MerlinAgent` - Merlin the wizard
- `PeedyAgent` - Peedy the parrot
- `RockyAgent` - Rocky
- `RoverAgent` - Rover the dog

## API Reference

### Component: `ClippyAgentComponent`

#### Inputs

- `agentConfig: AgentConfig` - Agent configuration loaded via `AgentLoaderService`

#### Methods

##### Display Methods

```typescript
// Show the agent
show(immediate?: boolean): void

// Hide the agent
hide(immediate?: boolean): void
```

##### Animation Methods

```typescript
// Play a specific animation
play(animationName: string, timeout?: number): boolean

// Play a random animation
animate(): boolean

// Get list of available animations
getAnimations(): string[]

// Check if animation exists
hasAnimation(name: string): boolean
```

##### Speech Methods

```typescript
// Make the agent speak
speak(text: string, options?: SpeechOptions): void

// Stream text to speech balloon (for LLM responses)
speakStream(source: AsyncIterable<string>, options?: SpeechOptions): Observable<void>

// Close the speech balloon
closeBalloon(): void
```

**SpeechOptions:**
```typescript
interface SpeechOptions {
  hold?: boolean;  // Keep balloon open until manually closed
  tts?: boolean;   // Use text-to-speech
}
```

##### Movement Methods

```typescript
// Move agent to coordinates
moveTo(x: number, y: number, duration?: number): void

// Gesture at a point
gestureAt(x: number, y: number): boolean
```

##### Control Methods

```typescript
// Add a delay to the action queue
delay(milliseconds?: number): void

// Stop current action
stopCurrent(): void

// Stop all actions and clear queue
stop(): void
```

## Usage Examples

### Basic Animation

```typescript
export class MyComponent {
  @ViewChild(ClippyAgentComponent) agent!: ClippyAgentComponent;

  ngAfterViewInit() {
    this.agent.show();
    this.agent.play('Wave');
  }
}
```

### Speech with Text-to-Speech

```typescript
this.agent.speak('Hello! How can I help you today?', { tts: true });
```

### Streaming Text (Perfect for LLM Responses)

```typescript
async streamResponse() {
  const response = await fetch('/api/chat');
  const reader = response.body?.getReader();
  
  if (reader) {
    const stream = this.readStream(reader);
    this.agent.speakStream(stream, { tts: true }).subscribe();
  }
}

async *readStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
}
```

### Movement and Gestures

```typescript
// Move to a specific position
this.agent.moveTo(200, 300);

// Gesture at an element
const button = document.querySelector('#help-button');
const rect = button.getBoundingClientRect();
this.agent.gestureAt(rect.left, rect.top);
this.agent.speak('Click here for help!');
```

### Action Chaining

All actions are automatically queued and executed sequentially:

```typescript
this.agent.show();
this.agent.speak('Let me show you around!');
this.agent.moveTo(100, 100);
this.agent.play('Congratulate');
this.agent.speak('Welcome to our app!');
this.agent.delay(1000);
this.agent.hide();
```

### Using Different Agents

```typescript
import { MerlinAgent, GenieAgent } from 'ngx-clippy';

// Load Merlin
this.agentLoader.loadAgent('Merlin', MerlinAgent).subscribe(config => {
  this.agentConfig = config;
});

// Or load Genie
this.agentLoader.loadAgent('Genie', GenieAgent).subscribe(config => {
  this.agentConfig = config;
});
```

## Architecture

This library follows SOLID principles with a clean separation of concerns:

### Services

- **AnimationService**: Handles sprite-based animation rendering
- **SpeechBalloonService**: Manages speech balloon display and positioning
- **ActionQueueService**: Manages sequential execution of actions using RxJS
- **DragDropService**: Handles drag-and-drop interactions
- **TextToSpeechService**: Manages Web Speech API integration
- **AgentLoaderService**: Loads agent assets and configuration

### Models

All interfaces are properly typed:

- `AgentConfig`: Agent configuration and assets
- `AgentData`: Animation and sprite data
- `AnimationState`: Animation state enumeration
- `SpeechOptions`: Speech balloon options
- `Position`: Coordinate interface

### Design Principles Applied

1. **Single Responsibility**: Each service has one clear purpose
2. **Open/Closed**: Extensible through dependency injection
3. **Liskov Substitution**: All services implement clear contracts
4. **Interface Segregation**: Focused, minimal interfaces
5. **Dependency Inversion**: Components depend on service abstractions

## Testing

All services are provided at the component level and can be easily mocked:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClippyAgentComponent } from 'ngx-clippy';
import { AnimationService } from 'ngx-clippy';

describe('ClippyAgentComponent', () => {
  let component: ClippyAgentComponent;
  let fixture: ComponentFixture<ClippyAgentComponent>;
  let mockAnimationService: jasmine.SpyObj<AnimationService>;

  beforeEach(() => {
    mockAnimationService = jasmine.createSpyObj('AnimationService', [
      'initialize',
      'playAnimation',
      'getAnimations'
    ]);

    TestBed.configureTestingModule({
      declarations: [ClippyAgentComponent],
      providers: [
        { provide: AnimationService, useValue: mockAnimationService }
      ]
    });

    fixture = TestBed.createComponent(ClippyAgentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

## Browser Support

- Modern browsers with ES6+ support
- Web Speech API for text-to-speech (optional)
- Touch events for mobile drag-and-drop

## License

MIT

This project is a rewrite of [ClippyJS](https://github.com/pi0/clippyjs) using agent data extracted with [Double Agent](https://doubleagent.sourceforge.net/) by Cinnamon Software.

Clippy and friends are original creations of [Microsoft](https://microsoft.com) as part of Microsoft Office. All character assets remain property of Microsoft.

## Contributing

Contributions are welcome! Please ensure:

- All code follows SOLID principles
- Maximum cyclomatic complexity of 5 per function
- Comprehensive TypeScript types
- RxJS observables for async operations
- Unit tests for new features

## Changelog

### 1.0.0

- Initial release
- Complete Angular rewrite from ClippyJS
- SOLID architecture with dependency injection
- RxJS observables throughout
- Full TypeScript support
- All 10 agents included
- Comprehensive API
