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
  speak: (text: string, rate: number, pitch: number, volume: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: () => boolean;
  isPaused: () => boolean;
  setOnEnd: (cb: () => void) => void;
  setOnBoundary: (cb: (charIndex: number, charLength: number) => void) => void;
}

class WebSpeaker implements TTSSpeaker {
  private utterance: SpeechSynthesisUtterance | null = null;
  private onEndCallback: (() => void) | null = null;
  private onBoundaryCallback: ((charIndex: number, charLength: number) => void) | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private paused = false;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        this.voices = window.speechSynthesis.getVoices();
        console.log('[TTS] Loaded voices:', this.voices.length);
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  private pickVoice(voiceType: VoiceType): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) return null;

    const zhVoices = this.voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('zh'));
    if (zhVoices.length === 0) {
      return this.voices[0] || null;
    }

    switch (voiceType) {
      case 'female': {
        const female = zhVoices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('woman') ||
          v.name.toLowerCase().includes('女') ||
          v.name.toLowerCase().includes('xiaoxiao') ||
          v.name.toLowerCase().includes('xiaoyi')
        );
        return female || zhVoices[0];
      }
      case 'male': {
        const male = zhVoices.find(v =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('man') ||
          v.name.toLowerCase().includes('男') ||
          v.name.toLowerCase().includes('yunjian') ||
          v.name.toLowerCase().includes('yunyang')
        );
        return male || zhVoices[zhVoices.length - 1];
      }
      case 'dialect': {
        const dialect = zhVoices.find(v =>
          v.name.toLowerCase().includes('cantonese') ||
          v.name.toLowerCase().includes('yue') ||
          v.name.toLowerCase().includes('粤') ||
          v.name.toLowerCase().includes('sichuan') ||
          v.name.toLowerCase().includes('东北')
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
      setTimeout(() => this.onEndCallback?.(), 1000);
      return;
    }

    window.speechSynthesis.cancel();
    this.paused = false;

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.lang = 'zh-CN';
    this.utterance.rate = rate;
    this.utterance.pitch = pitch;
    this.utterance.volume = volume;

    const voice = this.pickVoice(voiceType);
    if (voice) {
      this.utterance.voice = voice;
      console.log('[TTS] Using voice:', voice.name, voice.lang);
    }

    this.utterance.onstart = () => {
      console.log('[TTS] Speaking started, text length:', text.length);
      this.paused = false;
    };

    this.utterance.onend = () => {
      console.log('[TTS] Speaking ended');
      this.paused = false;
      this.onEndCallback?.();
    };

    this.utterance.onerror = (e) => {
      console.error('[TTS] Speaking error:', e);
      this.paused = false;
      this.onEndCallback?.();
    };

    this.utterance.onboundary = (e) => {
      if (this.onBoundaryCallback) {
        this.onBoundaryCallback(e.charIndex, e.charLength || 1);
      }
    };

    window.speechSynthesis.speak(this.utterance);
  }

  pause() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      this.paused = true;
    }
  }

  resume() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      this.paused = false;
    }
  }

  stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.paused = false;
    }
  }

  isSpeaking(): boolean {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setOnEnd(cb: () => void) {
    this.onEndCallback = cb;
  }

  setOnBoundary(cb: (charIndex: number, charLength: number) => void) {
    this.onBoundaryCallback = cb;
  }
}

class WechatSpeaker implements TTSSpeaker {
  private onEndCallback: (() => void) | null = null;
  private onBoundaryCallback: ((charIndex: number, charLength: number) => void) | null = null;
  private speaking = false;
  private paused = false;

  speak(text: string, rate: number, pitch: number, volume: number, voiceType: VoiceType = 'slow') {
    try {
      const plugin = Taro.requirePlugin('WechatSI');
      const manager = plugin.getRecordRecognitionManager();

      if (!plugin.textToSpeech) {
        console.warn('[TTS] WechatSI TTS not available, falling back');
        setTimeout(() => this.onEndCallback?.(), 2000);
        return;
      }

      this.speaking = true;
      this.paused = false;

      plugin.textToSpeech({
        lang: 'zh_CN',
        tts: true,
        content: text,
        speed: rate * 1.5,
        voice: voiceType === 'female' ? 0 : voiceType === 'male' ? 1 : 0,
        success: (res: any) => {
          console.log('[TTS] Wechat TTS success');
        },
        fail: (err: any) => {
          console.error('[TTS] Wechat TTS fail:', err);
          this.speaking = false;
          this.onEndCallback?.();
        },
        complete: () => {
          this.speaking = false;
          this.onEndCallback?.();
        }
      });
    } catch (e) {
      console.warn('[TTS] Wechat plugin not available, falling back');
      this.speaking = true;
      setTimeout(() => {
        this.speaking = false;
        this.onEndCallback?.();
      }, 3000);
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  stop() {
    this.speaking = false;
    this.paused = false;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setOnEnd(cb: () => void) {
    this.onEndCallback = cb;
  }

  setOnBoundary(cb: (charIndex: number, charLength: number) => void) {
    this.onBoundaryCallback = cb;
  }
}

let speaker: TTSSpeaker | null = null;

function getSpeaker(): TTSSpeaker {
  if (!speaker) {
    if (process.env.TARO_ENV === 'weapp') {
      speaker = new WechatSpeaker();
    } else {
      speaker = new WebSpeaker();
    }
    console.log('[TTS] Speaker created:', process.env.TARO_ENV);
  }
  return speaker;
}

export function processHighlightText(text: string, highlightWords: string[]): string {
  if (!highlightWords || highlightWords.length === 0) {
    return text;
  }

  let result = text;
  const sortedWords = [...highlightWords].sort((a, b) => b.length - a.length);

  sortedWords.forEach(word => {
    const trimmed = word.trim();
    if (!trimmed) return;

    const regex = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
    result = result.replace(regex, '，$1。$1，');
  });

  return result;
}

export function getVoiceParams(voiceType: VoiceType): { rate: number; pitch: number; volume: number } {
  switch (voiceType) {
    case 'slow':
      return { rate: 0.7, pitch: 1.0, volume: 1.0 };
    case 'female':
      return { rate: 0.95, pitch: 1.2, volume: 1.0 };
    case 'male':
      return { rate: 0.85, pitch: 0.8, volume: 1.0 };
    case 'dialect':
      return { rate: 0.75, pitch: 1.1, volume: 1.0 };
    default:
      return { rate: 0.8, pitch: 1.0, volume: 1.0 };
  }
}

export function speak(options: SpeakOptions) {
  const { text, settings, highlightWords = [], onEnd, onStart, onBoundary } = options;

  if (!text || !text.trim()) {
    onEnd?.();
    return;
  }

  const speaker = getSpeaker();
  const baseParams = getVoiceParams(settings.voiceType);

  const finalRate = Math.max(0.3, Math.min(2.0, baseParams.rate * (settings.speed / 0.8)));
  const finalPitch = baseParams.pitch * settings.pitch;
  const finalVolume = settings.volume;

  const processedText = processHighlightText(text, highlightWords);

  console.log('[TTS] Speak:', {
    voiceType: settings.voiceType,
    originalTextLen: text.length,
    processedTextLen: processedText.length,
    rate: finalRate,
    pitch: finalPitch,
    highlightCount: highlightWords.length
  });

  speaker.setOnEnd(() => onEnd?.());
  speaker.setOnBoundary((idx, len) => onBoundary?.(idx, len));

  onStart?.();
  speaker.speak(processedText, finalRate, finalPitch, finalVolume, settings.voiceType);
}

export function pauseSpeak() {
  getSpeaker().pause();
}

export function resumeSpeak() {
  getSpeaker().resume();
}

export function stopSpeak() {
  getSpeaker().stop();
}

export function isSpeaking(): boolean {
  return getSpeaker().isSpeaking();
}

export function isPaused(): boolean {
  return getSpeaker().isPaused();
}
