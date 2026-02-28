import { TestBed } from '@angular/core/testing';
import { TextToSpeechConfig } from '../models/agent-config.interface';
import { TextToSpeechService } from './text-to-speech.service';

type MockSpeechSynthesis = {
  cancel: jasmine.Spy;
  speak: jasmine.Spy;
  getVoices: jasmine.Spy;
  addEventListener: jasmine.Spy;
};

type MockUtteranceInstance = {
  text: string;
  rate: number;
  pitch: number;
  voice?: SpeechSynthesisVoice;
};

let speechSynthesisMockCleanup: (() => void) | undefined;

describe('TextToSpeechService', () => {
  let service: TextToSpeechService;
  let originalUtterance: unknown;
  let speechMock: MockSpeechSynthesis;
  const baseConfig: TextToSpeechConfig = {
    rate: 1.1,
    pitch: 0.9,
    voice: 'Amy',
  };

  beforeEach(() => {
    service = new TextToSpeechService();
    originalUtterance = (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  });

  afterEach(() => {
    speechSynthesisMockCleanup?.();
    speechSynthesisMockCleanup = undefined;
    restoreUtterance(originalUtterance);
  });

  it('can be created through Angular DI', () => {
    TestBed.configureTestingModule({
      providers: [TextToSpeechService],
    });

    const injected = TestBed.inject(TextToSpeechService);
    expect(injected).toBeTruthy();
  });

  it('reports availability only when speechSynthesis exists and config is initialized', () => {
    installUtteranceMock();
    speechMock = createSpeechSynthesisMock([]);
    installSpeechSynthesisMock(speechMock);

    expect(service.isAvailable()).toBeFalse();

    service.initialize(baseConfig);
    expect(service.isAvailable()).toBeTrue();
  });

  it('returns early from speak when TTS is unavailable and covers cancel false branch', () => {
    service.initialize(undefined);
    service.speak('should not speak');

    expect(() => service.cancel()).not.toThrow();
  });

  it('speaks immediately when voices are already available and matching voice exists', () => {
    installUtteranceMock();
    speechMock = createSpeechSynthesisMock([
      { name: 'Amy (UK)' } as SpeechSynthesisVoice,
      { name: 'Other' } as SpeechSynthesisVoice,
    ]);
    installSpeechSynthesisMock(speechMock);

    service.initialize(baseConfig);
    service.speak('hello\nworld');

    expect(speechMock.cancel).toHaveBeenCalledTimes(1);
    expect(speechMock.speak).toHaveBeenCalledTimes(1);

    const utterance = speechMock.speak.calls.mostRecent().args[0] as MockUtteranceInstance;
    expect(utterance.text).toBe('hello world');
    expect(utterance.rate).toBe(1.1);
    expect(utterance.pitch).toBe(0.9);
    expect(utterance.voice?.name).toContain('Amy');
  });

  it('speaks without assigning voice when no matching voice exists', () => {
    installUtteranceMock();
    speechMock = createSpeechSynthesisMock([
      { name: 'Brian' } as SpeechSynthesisVoice,
    ]);
    installSpeechSynthesisMock(speechMock);

    service.initialize(baseConfig);
    service.speak('no match');

    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    const utterance = speechMock.speak.calls.mostRecent().args[0] as MockUtteranceInstance;
    expect(utterance.voice).toBeUndefined();
  });

  it('waits for voiceschanged when voices list is initially empty', () => {
    installUtteranceMock();

    let voices: SpeechSynthesisVoice[] = [];
    let voicesChangedHandler: (() => void) | undefined;
    speechMock = {
      cancel: jasmine.createSpy('cancel'),
      speak: jasmine.createSpy('speak'),
      getVoices: jasmine.createSpy('getVoices').and.callFake(() => voices),
      addEventListener: jasmine.createSpy('addEventListener').and.callFake(
        (_event: string, handler: () => void, options: AddEventListenerOptions) => {
          expect(options.once).toBeTrue();
          voicesChangedHandler = handler;
        }
      ),
    };
    installSpeechSynthesisMock(speechMock);

    service.initialize(baseConfig);
    service.speak('wait for voices');

    expect(speechMock.speak).not.toHaveBeenCalled();
    expect(speechMock.addEventListener).toHaveBeenCalledWith(
      'voiceschanged',
      jasmine.any(Function),
      { once: true }
    );

    voices = [{ name: 'Amy Voice' } as SpeechSynthesisVoice];
    voicesChangedHandler?.();

    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    const utterance = speechMock.speak.calls.mostRecent().args[0] as MockUtteranceInstance;
    expect(utterance.voice?.name).toBe('Amy Voice');
  });

  it('cancels active speech when API exists', () => {
    installUtteranceMock();
    speechMock = createSpeechSynthesisMock([]);
    installSpeechSynthesisMock(speechMock);

    service.cancel();

    expect(speechMock.cancel).toHaveBeenCalledTimes(1);
  });
});

function installSpeechSynthesisMock(mock: MockSpeechSynthesis): void {
  if ('speechSynthesis' in window) {
    const getterSpy = spyOnProperty(window, 'speechSynthesis', 'get').and.returnValue(
      mock as unknown as SpeechSynthesis
    );
    speechSynthesisMockCleanup = () => {
      getterSpy.and.callThrough();
    };
    return;
  }

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    get: () => mock,
  });
  speechSynthesisMockCleanup = () => {
    delete (window as any).speechSynthesis;
  };
}

function installUtteranceMock(): void {
  class MockSpeechSynthesisUtterance {
    text: string;
    rate = 1;
    pitch = 1;
    voice?: SpeechSynthesisVoice;

    constructor(text: string) {
      this.text = text;
    }
  }

  (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
    MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;
}

function createSpeechSynthesisMock(voices: SpeechSynthesisVoice[]): MockSpeechSynthesis {
  return {
    cancel: jasmine.createSpy('cancel'),
    speak: jasmine.createSpy('speak'),
    getVoices: jasmine.createSpy('getVoices').and.returnValue(voices),
    addEventListener: jasmine.createSpy('addEventListener'),
  };
}

function restoreUtterance(value: unknown): void {
  if (value === undefined) {
    delete (globalThis as any).SpeechSynthesisUtterance;
    return;
  }

  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    value,
    configurable: true,
    writable: true,
  });
}
