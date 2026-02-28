import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, ObservableInput, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentConfig } from '../models/agent-config.interface';

/**
 * Agent loader configuration.
 * Each function may return an Observable, a Promise, or any other ObservableInput.
 */
export interface AgentLoaders {
  agent: () => ObservableInput<{ default: any }>;
  sound: () => ObservableInput<{ default: any }>;
  map: () => ObservableInput<string>;
}

/**
 * Service for loading agent assets
 * Follows Single Responsibility Principle - only handles asset loading
 */
@Injectable({
  providedIn: 'root'
})
export class AgentLoaderService {
  /**
   * Load agent configuration from loaders (cyclomatic complexity: 2)
   */
  loadAgent(name: string, loaders: AgentLoaders): Observable<AgentConfig> {
    return forkJoin({
      agentData: loaders.agent(),
      mapUrl: loaders.map(),
      sounds: this.loadSounds(loaders)
    }).pipe(
      map(({ agentData, mapUrl, sounds }) => ({
        name,
        agentData: agentData.default,
        mapUrl,
        sounds
      }))
    );
  }

  /**
   * Load sounds if MP3 is supported (cyclomatic complexity: 2)
   */
  private loadSounds(loaders: AgentLoaders): Observable<Record<string, string>> {
    const audio = document.createElement('audio');
    const canPlayMp3 = !!audio.canPlayType && audio.canPlayType('audio/mp3') !== '';

    if (!canPlayMp3) {
      return of({});
    }

    return from(loaders.sound() as ObservableInput<{ default: Record<string, string> }>).pipe(
      map((soundModule: { default: Record<string, string> }) => soundModule.default)
    );
  }
}
