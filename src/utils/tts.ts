import Taro from '@tarojs/taro';
import type { VoiceSettings, VoiceType } from '@/types';

export interface SpeakOptions {
  text: string;
  settings: VoiceSettings;
  highlightWords?: string[];
  onEnd?: () => void;
  onStart?: () => void;
  onBoundary?: (charIndex: number, charLength: number) => void;
}

interface TTSSpeaker {
  speak: (text: string, rate: number, pitch: number, volume: number, voiceType: VoiceType) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: () => boolean;
  isPaused: () => boolean;
  setOnEnd: (cb: () => void) => void;
  setOnBoundary: (cb: (charIndex: number, charLength: number) => void) => void;
  destroy: () => void;
}

class WebSpeaker implements TTSSpeaker {
  private onEndCallback: (() => void) | null = null;
  private onBoundaryCallback: ((charIndex: number, charLength: number) => void) | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private _paused = false;
  private _speaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        this.voices = window.speechSynthesis.getVoices();
        console.log('[TTS] Web voices loaded:', this.voices.length);
        this.voices.forEach((v, i) => {
          console.log(`[TTS]   [${i}] ${v.name} (${v.lang}) default=${v.default}`);
        });
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  private pickVoice(voiceType: VoiceType): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) return null;

    const zhVoices = this.voices.filter(v =>
      v.lang && (v.lang.toLowerCase().startsWith('zh') || v.lang.toLowerCase().startsWith('cmn'))
    );

    if (zhVoices.length === 0) {
      return this.voices[0] || null;
    }

    console.log('[TTS] Available zh voices:', zhVoices.map(v => v.name).join(', '));

    switch (voiceType) {
      case 'female': {
        const female = zhVoices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('woman') ||
          v.name.toLowerCase().includes('女') ||
          v.name.toLowerCase().includes('xiaoxiao') ||
          v.name.toLowerCase().includes('xiaoyi') ||
          v.name.toLowerCase().includes('tingting') ||
          v.name.toLowerCase().includes('sinji') ||
          v.name.toLowerCase().includes('mei-jia')
        );
        return female || zhVoices[0];
      }
      case 'male': {
        const male = zhVoices.find(v =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('man') ||
          v.name.toLowerCase().includes('男') ||
          v.name.toLowerCase().includes('yunjian') ||
          v.name.toLowerCase().includes('yunyang') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('alex')
        );
        return male || zhVoices[zhVoices.length - 1];
      }
      case 'dialect': {
        const dialect = zhVoices.find(v =>
          v.name.toLowerCase().includes('cantonese') ||
          v.name.toLowerCase().includes('yue') ||
          v.name.toLowerCase().includes('粤') ||
          v.name.toLowerCase().includes('sichuan') ||
          v.name.toLowerCase().includes('东北') ||
          v.name.toLowerCase().includes('shanghai') ||
          v.name.toLowerCase().includes('hk')
        );
        return dialect || zhVoices[0];
      }
      case 'slow':
      default:
        return zhVoices[0];
    }
  }

  speak(text: string, rate: number, pitch: number, volume: number, voiceType: VoiceType = 'slow') {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[TTS] Web Speech API not available');
      setTimeout(() => {
        this._speaking = false;
        this._paused = false;
        this.onEndCallback?.();
      }, 1500);
      return;
    }

    this.stopInternal();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = 'zh-CN';
    this.currentUtterance.rate = Math.max(0.1, Math.min(10, rate));
    this.currentUtterance.pitch = Math.max(0, Math.min(2, pitch));
    this.currentUtterance.volume = Math.max(0, Math.min(1, volume));

    const voice = this.pickVoice(voiceType);
    if (voice) {
      this.currentUtterance.voice = voice;
      console.log('[TTS] Using voice:', voice.name, '/ type:', voiceType);
    } else {
      console.log('[TTS] No zh voice found, using default');
    }

    console.log('[TTS] Speak start:', {
      length: text.length,
      rate: this.currentUtterance.rate,
      pitch: this.currentUtterance.pitch
    });

    this.currentUtterance.onstart = () => {
      this._speaking = true;
      this._paused = false;
      console.log('[TTS] onstart fired');
    };

    this.currentUtterance.onend = () => {
      console.log('[TTS] onend fired');
      this._speaking = false;
      this._paused = false;
      this.currentUtterance = null;
      const cb = this.onEndCallback;
      this.onEndCallback = null;
      cb?.();
    };

    this.currentUtterance.onerror = (e) => {
      console.error('[TTS] onerror:', e.error, e.message);
      this._speaking = false;
      this._paused = false;
      this.currentUtterance = null;
      const cb = this.onEndCallback;
      this.onEndCallback = null;
      cb?.();
    };

    this.currentUtterance.onboundary = (e) => {
      if (this.onBoundaryCallback) {
        this.onBoundaryCallback(e.charIndex, e.charLength || 1);
      }
    };

    this._speaking = true;
    this._paused = false;
    window.speechSynthesis.speak(this.currentUtterance);
  }

  private stopInternal() {
    this._speaking = false;
    this._paused = false;
    this.currentUtterance = null;
    const cb = this.onEndCallback;
    this.onEndCallback = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.pause();
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('[TTS] cancel error:', e);
      }
    }

    if (cb) {
      try { cb(); } catch (e) {}
    }
  }

  pause() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this._speaking) {
      try {
        window.speechSynthesis.pause();
        this._paused = true;
        console.log('[TTS] paused');
      } catch (e) {
        console.warn('[TTS] pause error:', e);
      }
    }
  }

  resume() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this._paused) {
      try {
        window.speechSynthesis.resume();
        this._paused = false;
        console.log('[TTS] resumed');
      } catch (e) {
        console.warn('[TTS] resume error:', e);
      }
    }
  }

  stop() {
    this.stopInternal();
  }

  isSpeaking(): boolean {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      return window.speechSynthesis.speaking || this._speaking;
    }
    return this._speaking;
  }

  isPaused(): boolean {
    return this._paused;
  }

  setOnEnd(cb: () => void) {
    this.onEndCallback = cb;
  }

  setOnBoundary(cb: (charIndex: number, charLength: number) => void) {
    this.onBoundaryCallback = cb;
  }

  destroy() {
    this.stopInternal();
  }
}

class FallbackSpeaker implements TTSSpeaker {
  private onEndCallback: (() => void) | null = null;
  private onBoundaryCallback: ((charIndex: number, charLength: number) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private _speaking = false;
  private _paused = false;
  private totalDuration = 0;
  private elapsedDuration = 0;

  speak(text: string, rate: number) {
    this.stop();

    this._speaking = true;
    this._paused = false;

    const charCount = text.replace(/\s/g, '').length;
    const baseDuration = charCount * 200;
    this.totalDuration = Math.max(1000, Math.floor(baseDuration / rate));
    this.elapsedDuration = 0;

    console.log('[TTS] Fallback speak:', {
      chars: charCount,
      duration: this.totalDuration + 'ms',
      rate
    });

    const startTime = Date.now();
    const tick = () => {
      if (!this._speaking || this._paused) return;

      const elapsed = Date.now() - startTime;
      this.elapsedDuration = elapsed;

      if (elapsed >= this.totalDuration) {
        this._speaking = false;
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        console.log('[TTS] Fallback finished');
        cb?.();
      } else {
        this.timer = setTimeout(tick, 100);
      }
    };

    this.timer = setTimeout(tick, 100);
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this._speaking = false;
    this._paused = false;
    this.onEndCallback = null;
  }

  isSpeaking(): boolean {
    return this._speaking && !this._paused;
  }

  isPaused(): boolean {
    return this._paused;
  }

  setOnEnd(cb: () => void) {
    this.onEndCallback = cb;
  }

  setOnBoundary(cb: (charIndex: number, charLength: number) => void) {
    this.onBoundaryCallback = cb;
  }

  destroy() {
    this.stop();
  }
}

let speaker: TTSSpeaker | null = null;
let speakerType: 'web' | 'fallback' = 'fallback';

function initSpeaker(): TTSSpeaker {
  if (speaker) return speaker;

  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speaker = new WebSpeaker();
      speakerType = 'web';
      console.log('[TTS] Using Web Speech API');
    } else {
      speaker = new FallbackSpeaker();
      speakerType = 'fallback';
      console.log('[TTS] Using fallback speaker');
    }
  } catch (e) {
    console.warn('[TTS] Init failed, using fallback:', e);
    speaker = new FallbackSpeaker();
    speakerType = 'fallback';
  }

  return speaker;
}

export function getSpeakerType(): string {
  return speakerType;
}

export function processHighlightText(text: string, highlightWords: string[]): string {
  if (!highlightWords || highlightWords.length === 0) {
    return text;
  }

  let result = text;
  const sortedWords = [...highlightWords]
    .filter(w => w && w.trim())
    .sort((a, b) => b.length - a.length);

  if (sortedWords.length === 0) {
    return text;
  }

  sortedWords.forEach(word => {
    const trimmed = word.trim();
    try {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      result = result.replace(regex, `，${trimmed}。${trimmed}，`);
    } catch (e) {
      console.warn('[TTS] Regex error for word:', trimmed, e);
    }
  });

  return result;
}

export function getVoiceBaseParams(voiceType: VoiceType): { rate: number; pitch: number; volume: number } {
  switch (voiceType) {
    case 'slow':
      return { rate: 0.6, pitch: 1.0, volume: 1.0 };
    case 'female':
      return { rate: 0.9, pitch: 1.4, volume: 1.0 };
    case 'male':
      return { rate: 0.8, pitch: 0.6, volume: 1.0 };
    case 'dialect':
      return { rate: 0.7, pitch: 1.2, volume: 1.0 };
    default:
      return { rate: 0.8, pitch: 1.0, volume: 1.0 };
  }
}

export function speak(options: SpeakOptions) {
  const { text, settings, highlightWords = [], onEnd, onStart, onBoundary } = options;

  if (!text || !text.trim()) {
    console.warn('[TTS] Empty text, skip');
    onEnd?.();
    return;
  }

  const sp = initSpeaker();
  const baseParams = getVoiceBaseParams(settings.voiceType);

  const speedMultiplier = settings.speed / 0.8;
  const finalRate = Math.max(0.3, Math.min(2.0, baseParams.rate * speedMultiplier));
  const finalPitch = Math.max(0, Math.min(2, baseParams.pitch * settings.pitch));
  const finalVolume = settings.volume;

  const processedText = processHighlightText(text, highlightWords);

  console.log('[TTS] Speak request:', {
    voiceType: settings.voiceType,
    originalLen: text.length,
    processedLen: processedText.length,
    rate: finalRate,
    pitch: finalPitch,
    highlightCount: highlightWords.length,
    speaker: speakerType
  });

  sp.setOnEnd(() => {
    console.log('[TTS] Speak completed');
    onEnd?.();
  });

  if (onBoundary) {
    sp.setOnBoundary(onBoundary);
  }

  onStart?.();
  sp.speak(processedText, finalRate, finalPitch, finalVolume, settings.voiceType);
}

export function pauseSpeak() {
  if (speaker) {
    speaker.pause();
  }
}

export function resumeSpeak() {
  if (speaker) {
    speaker.resume();
  }
}

export function stopSpeak() {
  if (speaker) {
    speaker.stop();
  }
}

export function isSpeaking(): boolean {
  return speaker ? speaker.isSpeaking() : false;
}

export function isPaused(): boolean {
  return speaker ? speaker.isPaused() : false;
}

export function destroySpeaker() {
  if (speaker) {
    speaker.destroy();
    speaker = null;
  }
}
