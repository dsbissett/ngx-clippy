import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, ObservableInput, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentConfig } from '../models/agent-config.interface';

/**
 * Agent loader configuration.
 * Each function may return an Observable, a Promise, or any other ObservableInput.
 */
export interface AgentLoaders {
  /**
   * Optional display name for this loader.
   * When provided, loadAgent(loaders) can derive AgentConfig.name directly.
   */
  name?: string;
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
   * Load agent configuration from loaders.
   * Preferred signature derives name from loaders.
   * Legacy signature with explicit name is kept for backwards compatibility.
   */
  loadAgent(loaders: AgentLoaders): Observable<AgentConfig>;
  loadAgent(name: string, loaders: AgentLoaders): Observable<AgentConfig>;
  loadAgent(nameOrLoaders: string | AgentLoaders, maybeLoaders?: AgentLoaders): Observable<AgentConfig> {
    const explicitName = typeof nameOrLoaders === 'string' ? nameOrLoaders : undefined;
    const loaders = typeof nameOrLoaders === 'string' ? maybeLoaders : nameOrLoaders;
    if (!loaders) {
      throw new Error('Agent loaders are required.');
    }

    return forkJoin({
      agentData: loaders.agent(),
      mapUrl: loaders.map(),
      sounds: this.loadSounds(loaders)
    }).pipe(
      map(({ agentData, mapUrl, sounds }) => ({
        name: explicitName ?? this.deriveName(loaders, mapUrl),
        agentData: agentData.default,
        mapUrl,
        sounds
      }))
    );
  }

  private deriveName(loaders: AgentLoaders, mapUrl: string): string {
    if (typeof loaders.name === 'string' && loaders.name.trim() !== '') {
      return loaders.name.trim();
    }

    const mapMatch = mapUrl.match(/(?:^|\/|\\)agents(?:\/|\\)([^/\\]+)(?:\/|\\)/i);
    if (mapMatch && mapMatch[1]) {
      const rawName = mapMatch[1];
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }

    throw new Error(
      'Agent name could not be derived from loaders. ' +
      'Provide loaders.name or call loadAgent(name, loaders).'
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
