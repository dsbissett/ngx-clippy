import { TestBed } from '@angular/core/testing';
import { ObservableInput, firstValueFrom, of } from 'rxjs';
import { AgentData } from '../models/agent-config.interface';
import { AgentLoaderService, AgentLoaders } from './agent-loader.service';

describe('AgentLoaderService', () => {
  let service: AgentLoaderService;

  beforeEach(() => {
    service = new AgentLoaderService();
  });

  it('can be created through Angular DI', () => {
    TestBed.configureTestingModule({});
    const injected = TestBed.inject(AgentLoaderService);
    expect(injected).toBeTruthy();
  });

  it('loads full agent config including sounds when MP3 is supported', async () => {
    const canPlayTypeSpy = jasmine.createSpy('canPlayType').and.returnValue('probably');
    spyOn(document, 'createElement').and.returnValue(
      { canPlayType: canPlayTypeSpy } as unknown as HTMLAudioElement
    );

    const agentData = createAgentData();
    const soundModule = { default: { beep: '/assets/beep.mp3' } };
    const loaders = createLoaders({
      agentResult: of({ default: agentData }),
      mapResult: Promise.resolve('/assets/map.png'),
      soundResult: Promise.resolve(soundModule),
    });

    const result = await firstValueFrom(service.loadAgent('Clippy', loaders));

    expect(result).toEqual({
      name: 'Clippy',
      agentData,
      mapUrl: '/assets/map.png',
      sounds: soundModule.default,
    });
    expect(loaders.agent).toHaveBeenCalledTimes(1);
    expect(loaders.map).toHaveBeenCalledTimes(1);
    expect(loaders.sound).toHaveBeenCalledTimes(1);
    expect(canPlayTypeSpy).toHaveBeenCalledWith('audio/mp3');
  });

  it('returns empty sounds and skips sound loader when MP3 check returns empty string', async () => {
    const canPlayTypeSpy = jasmine.createSpy('canPlayType').and.returnValue('');
    spyOn(document, 'createElement').and.returnValue(
      { canPlayType: canPlayTypeSpy } as unknown as HTMLAudioElement
    );

    const agentData = createAgentData();
    const loaders = createLoaders({
      agentResult: Promise.resolve({ default: agentData }),
      mapResult: of('/assets/map.png'),
      soundResult: of({ default: { shouldNot: 'load' } }),
    });

    const result = await firstValueFrom(service.loadAgent('Bonzi', loaders));

    expect(result.name).toBe('Bonzi');
    expect(result.agentData).toBe(agentData);
    expect(result.mapUrl).toBe('/assets/map.png');
    expect(result.sounds).toEqual({});
    expect(loaders.sound).not.toHaveBeenCalled();
    expect(canPlayTypeSpy).toHaveBeenCalledWith('audio/mp3');
  });

  it('returns empty sounds when canPlayType is unavailable', async () => {
    spyOn(document, 'createElement').and.returnValue({} as HTMLAudioElement);

    const agentData = createAgentData();
    const loaders = createLoaders({
      agentResult: of({ default: agentData }),
      mapResult: of('/assets/map.png'),
      soundResult: of({ default: { shouldNot: 'load' } }),
    });

    const result = await firstValueFrom(service.loadAgent('Rover', loaders));

    expect(result.sounds).toEqual({});
    expect(loaders.sound).not.toHaveBeenCalled();
  });
});

function createLoaders(params: {
  agentResult: ObservableInput<{ default: AgentData }>;
  mapResult: ObservableInput<string>;
  soundResult: ObservableInput<{ default: Record<string, string> }>;
}): AgentLoaders & {
  agent: jasmine.Spy<AgentLoaders['agent']>;
  map: jasmine.Spy<AgentLoaders['map']>;
  sound: jasmine.Spy<AgentLoaders['sound']>;
} {
  return {
    agent: jasmine.createSpy('agent').and.returnValue(params.agentResult),
    map: jasmine.createSpy('map').and.returnValue(params.mapResult),
    sound: jasmine.createSpy('sound').and.returnValue(params.soundResult),
  };
}

function createAgentData(): AgentData {
  return {
    framesize: [128, 128],
    overlayCount: 1,
    sounds: [],
    animations: {},
  };
}

