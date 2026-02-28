import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Observable, Subject, interval, EMPTY } from 'rxjs';
import { takeWhile, finalize } from 'rxjs/operators';
import { BalloonSide, BalloonPosition } from '../models/speech-options.interface';

/**
 * Service for managing speech balloon display and positioning
 * Follows Single Responsibility Principle - only handles speech balloon
 */
@Injectable()
export class SpeechBalloonService {
  private renderer: Renderer2;
  private balloonElement!: HTMLDivElement;
  private contentElement!: HTMLDivElement;
  private tipElement!: HTMLDivElement;
  private targetElement?: HTMLElement;
  private isHidden = true;
  private isActive = false;
  private shouldHold = false;
  private hideTimeout?: number;

  private readonly WORD_SPEAK_TIME = 200;
  private readonly CLOSE_BALLOON_DELAY = 5000;
  private readonly BALLOON_MARGIN = 15;

  constructor(private rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Initialize balloon with target element
   */
  initialize(targetElement: HTMLElement): void {
    this.targetElement = targetElement;
    this.createBalloonElements();
  }

  /**
   * Display text with typewriter effect
   */
  speak(text: string, hold = false): Observable<void> {
    this.isHidden = false;
    this.shouldHold = hold;
    this.show();

    this.prepareContent(text);
    this.reposition();

    return this.animateText(text, hold);
  }

  /**
   * Stream text chunks to balloon
   */
  speakStream(): { push: (chunk: string) => void; done: () => void; complete$: Observable<void> } {
    this.isHidden = false;
    this.isActive = true;
    this.shouldHold = true;
    this.show();

    const complete$ = new Subject<void>();
    let fullText = '';

    this.renderer.setStyle(this.contentElement, 'height', 'auto');
    this.renderer.setStyle(this.contentElement, 'width', 'auto');
    this.renderer.setProperty(this.contentElement, 'textContent', '');
    this.reposition();

    return {
      push: (chunk: string) => {
        fullText += chunk;
        this.renderer.setProperty(this.contentElement, 'textContent', fullText);
        this.updateContentSize();
        this.reposition();
      },
      done: () => {
        this.isActive = false;
        this.shouldHold = false;
        complete$.next();
        complete$.complete();
        this.hide();
      },
      complete$: complete$.asObservable()
    };
  }

  /**
   * Close balloon immediately or after delay
   */
  close(): void {
    if (this.isActive) {
      this.shouldHold = false;
    }
  }

  /**
   * Hide balloon
   */
  hide(immediate = false): void {
    if (immediate) {
      this.renderer.setStyle(this.balloonElement, 'display', 'none');
      return;
    }

    this.hideTimeout = window.setTimeout(() => {
      this.finishHide();
    }, this.CLOSE_BALLOON_DELAY);
  }

  /**
   * Show balloon
   */
  show(): void {
    if (!this.isHidden) {
      this.renderer.setStyle(this.balloonElement, 'display', 'block');
    }
  }

  /**
   * Reposition balloon to stay on screen (cyclomatic complexity: 2)
   */
  reposition(): void {
    const sides: BalloonSide[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    for (const side of sides) {
      this.positionBalloon(side);
      if (!this.isOffScreen()) {
        break;
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
    }
    if (this.balloonElement) {
      this.renderer.removeChild(document.body, this.balloonElement);
    }
  }

  /**
   * Create balloon DOM elements (cyclomatic complexity: 1)
   */
  private createBalloonElements(): void {
    this.balloonElement = this.renderer.createElement('div');
    this.applyBalloonStyles();

    this.tipElement = this.renderer.createElement('div');
    this.applyTipStyles();

    this.contentElement = this.renderer.createElement('div');
    this.applyContentStyles();

    this.renderer.appendChild(this.balloonElement, this.tipElement);
    this.renderer.appendChild(this.balloonElement, this.contentElement);
    this.renderer.appendChild(document.body, this.balloonElement);
  }

  /**
   * Apply balloon container styles (cyclomatic complexity: 1)
   */
  private applyBalloonStyles(): void {
    const styles = {
      position: 'fixed',
      zIndex: '10001',
      cursor: 'pointer',
      background: '#ffc',
      color: 'black',
      padding: '8px',
      border: '1px solid black',
      borderRadius: '5px',
      display: 'none',
      maxWidth: '230px'
    };

    Object.entries(styles).forEach(([key, value]) => {
      this.renderer.setStyle(this.balloonElement, key, value);
    });
  }

  /**
   * Apply tip element styles (cyclomatic complexity: 1)
   */
  private applyTipStyles(): void {
    const tipImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAgCAMAAAAlvKiEAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAAlQTFRF///MAAAA////52QwgAAAAAN0Uk5T//8A18oNQQAAAGxJREFUeNqs0kEOwCAIRFHn3//QTUU6xMyyxii+jQosrTPkyPEM6IN3FtzIRk1U4dFeKWQiH6pRRowMVKEmvronEynkwj0uZJgR22+YLopPSo9P34wJSamLSU7lSIWLJU7NkNomNlhqxUeAAQC+TQLZyEuJBwAAAABJRU5ErkJggg==';

    this.renderer.setStyle(this.tipElement, 'width', '10px');
    this.renderer.setStyle(this.tipElement, 'height', '16px');
    this.renderer.setStyle(this.tipElement, 'background', `url(${tipImage}) no-repeat`);
    this.renderer.setStyle(this.tipElement, 'position', 'absolute');
  }

  /**
   * Apply content element styles (cyclomatic complexity: 1)
   */
  private applyContentStyles(): void {
    const styles = {
      maxWidth: '200px',
      minWidth: '120px',
      fontFamily: '"Microsoft Sans", sans-serif',
      fontSize: '10pt',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      overflowWrap: 'break-word'
    };

    Object.entries(styles).forEach(([key, value]) => {
      this.renderer.setStyle(this.contentElement, key, value);
    });
  }

  /**
   * Prepare content element for text (cyclomatic complexity: 1)
   */
  private prepareContent(text: string): void {
    this.renderer.setStyle(this.contentElement, 'height', 'auto');
    this.renderer.setStyle(this.contentElement, 'width', 'auto');
    this.renderer.setProperty(this.contentElement, 'textContent', text);

    this.updateContentSize();
    this.renderer.setProperty(this.contentElement, 'textContent', '');
  }

  /**
   * Update content size (cyclomatic complexity: 1)
   */
  private updateContentSize(): void {
    const width = this.contentElement.offsetWidth;
    const height = this.contentElement.offsetHeight;
    this.renderer.setStyle(this.contentElement, 'width', `${width}px`);
    this.renderer.setStyle(this.contentElement, 'height', `${height}px`);
  }

  /**
   * Animate text with typewriter effect (cyclomatic complexity: 2)
   */
  private animateText(text: string, hold: boolean): Observable<void> {
    return new Observable<void>(observer => {
      this.isActive = true;
      const words = text.split(/( +|\n)/);
      let index = 1;

      const addWord = () => {
        if (!this.isActive) {
          observer.complete();
          return;
        }

        if (index > words.length) {
          this.isActive = false;
          if (!hold) {
            observer.next();
            observer.complete();
            this.hide();
          }
        } else {
          const displayText = words.slice(0, index).join('');
          this.renderer.setProperty(this.contentElement, 'textContent', displayText);
          index += 2;
          setTimeout(addWord, this.WORD_SPEAK_TIME);
        }
      };

      addWord();
    });
  }

  /**
   * Position balloon on specific side (cyclomatic complexity: 4)
   */
  private positionBalloon(side: BalloonSide): void {
    if (!this.targetElement) return;

    const rect = this.targetElement.getBoundingClientRect();
    const targetWidth = this.targetElement.offsetWidth;
    const targetHeight = this.targetElement.offsetHeight;
    const balloonWidth = this.balloonElement.offsetWidth;
    const balloonHeight = this.balloonElement.offsetHeight;

    const position = this.calculatePosition(
      side,
      rect,
      targetWidth,
      targetHeight,
      balloonWidth,
      balloonHeight
    );

    this.renderer.setStyle(this.balloonElement, 'top', `${position.top}px`);
    this.renderer.setStyle(this.balloonElement, 'left', `${position.left}px`);
    this.positionTip(side);
  }

  /**
   * Calculate balloon position (cyclomatic complexity: 4)
   */
  private calculatePosition(
    side: BalloonSide,
    rect: DOMRect,
    targetWidth: number,
    targetHeight: number,
    balloonWidth: number,
    balloonHeight: number
  ): { top: number; left: number } {
    const margin = this.BALLOON_MARGIN;

    switch (side) {
      case 'top-left':
        return {
          left: rect.left + targetWidth - balloonWidth,
          top: rect.top - balloonHeight - margin
        };
      case 'top-right':
        return {
          left: rect.left,
          top: rect.top - balloonHeight - margin
        };
      case 'bottom-right':
        return {
          left: rect.left,
          top: rect.top + targetHeight + margin
        };
      case 'bottom-left':
        return {
          left: rect.left + targetWidth - balloonWidth,
          top: rect.top + targetHeight + margin
        };
    }
  }

  /**
   * Position tip based on balloon side (cyclomatic complexity: 4)
   */
  private positionTip(side: BalloonSide): void {
    this.resetTipStyles();

    switch (side) {
      case 'top-left':
        this.setTipStyles('100%', '0px', '100%', '-50px', '');
        break;
      case 'top-right':
        this.setTipStyles('100%', '0px', '0', '50px', '-10px 0');
        break;
      case 'bottom-right':
        this.setTipStyles('0', '-16px', '0', '50px', '-10px -16px');
        break;
      case 'bottom-left':
        this.setTipStyles('0', '-16px', '100%', '-50px', '0px -16px');
        break;
    }
  }

  /**
   * Reset tip styles (cyclomatic complexity: 1)
   */
  private resetTipStyles(): void {
    ['top', 'left', 'marginTop', 'marginLeft', 'backgroundPosition'].forEach(prop => {
      this.renderer.setStyle(this.tipElement, prop, '');
    });
  }

  /**
   * Set tip styles (cyclomatic complexity: 1)
   */
  private setTipStyles(
    top: string,
    marginTop: string,
    left: string,
    marginLeft: string,
    bgPosition: string
  ): void {
    this.renderer.setStyle(this.tipElement, 'top', top);
    this.renderer.setStyle(this.tipElement, 'marginTop', marginTop);
    this.renderer.setStyle(this.tipElement, 'left', left);
    this.renderer.setStyle(this.tipElement, 'marginLeft', marginLeft);
    if (bgPosition) {
      this.renderer.setStyle(this.tipElement, 'backgroundPosition', bgPosition);
    }
  }

  /**
   * Check if balloon is off screen (cyclomatic complexity: 2)
   */
  private isOffScreen(): boolean {
    const rect = this.balloonElement.getBoundingClientRect();
    const margin = 5;

    if (rect.top - margin < 0 || rect.left - margin < 0) {
      return true;
    }

    return rect.bottom + margin > window.innerHeight || rect.right + margin > window.innerWidth;
  }

  /**
   * Complete hide operation (cyclomatic complexity: 1)
   */
  private finishHide(): void {
    if (!this.isActive) {
      this.renderer.setStyle(this.balloonElement, 'display', 'none');
      this.isHidden = true;
      this.hideTimeout = undefined;
    }
  }
}
