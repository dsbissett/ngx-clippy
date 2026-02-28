import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, ObservableInput, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentConfig } from '../models/agent-config.interface';

/**
 * Agent loader configuration.
 * Each function may return an Observable, a Promise, or any other ObservableInput.
 */
export interface AgentLoaders<TName extends string = string> {
  /**
   * Optional display name for this loader.
   * When provided, loadAgent(loaders) can derive AgentConfig.name directly.
   */
  name?: TName;
  /**
   * Loader for the agent metadata module.
   * Must resolve to a module object whose default export is agent data.
   */
  agent: () => ObservableInput<{ default: any }>;
  /**
   * Loader for the agent sound module.
   * Must resolve to a module object whose default export is a sound-url map.
   */
  sound: () => ObservableInput<{ default: any }>;
  /**
   * Loader for the sprite map URL.
   * Usually a static assets URL such as `assets/agents/clippy/map.png`.
   */
  map: () => ObservableInput<string>;
}

/**
 * Agent loader shape with a required name.
 * Prefer this for best autocomplete and stronger inferred return typing.
 */
export type NamedAgentLoaders<TName extends string = string> = AgentLoaders<TName> & {
  name: TName;
};

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
   * Preferred signature: derive `config.name` from `loaders.name`.
   */
  loadAgent<TName extends string>(
    loaders: NamedAgentLoaders<TName>
  ): Observable<AgentConfig & { name: TName }>;

  /**
   * Load agent configuration from loaders with optional derived name.
   * If `loaders.name` is missing, name is derived from `mapUrl` when possible.
   */
  loadAgent(loaders: AgentLoaders): Observable<AgentConfig>;

  /**
   * Load agent configuration with explicit name.
   * @deprecated Prefer `loadAgent(loaders)` and set `loaders.name`.
   */
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
