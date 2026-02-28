import { Injectable } from '@angular/core';
import { TextToSpeechConfig } from '../models/agent-config.interface';

/**
 * Service for text-to-speech functionality
 * Follows Single Responsibility Principle - only handles TTS
 */
@Injectable()
export class TextToSpeechService {
  private config?: TextToSpeechConfig;

  /**
   * Initialize TTS with configuration
   */
  initialize(config?: TextToSpeechConfig): void {
    this.config = config;
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    return 'speechSynthesis' in window && !!this.config;
  }

  /**
   * Speak text using Web Speech API (cyclomatic complexity: 3)
   */
  speak(text: string): void {
    if (!this.isAvailable() || !this.config) {
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '));
    utterance.rate = this.config.rate;
    utterance.pitch = this.config.pitch;

    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.setVoiceAndSpeak(utterance, voices);
    } else {
      this.waitForVoicesAndSpeak(utterance);
    }
  }

  /**
   * Cancel current speech
   */
  cancel(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  /**
   * Set voice and speak (cyclomatic complexity: 2)
   */
  private setVoiceAndSpeak(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]): void {
    const matchingVoice = voices.find(v => v.name.includes(this.config!.voice));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    speechSynthesis.speak(utterance);
  }

  /**
   * Wait for voices to load then speak (cyclomatic complexity: 2)
   */
  private waitForVoicesAndSpeak(utterance: SpeechSynthesisUtterance): void {
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        const voices = speechSynthesis.getVoices();
        this.setVoiceAndSpeak(utterance, voices);
      },
      { once: true }
    );
  }
}
