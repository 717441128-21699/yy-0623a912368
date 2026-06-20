export interface Chapter {
  id: string;
  title: string;
  content: string;
  paragraphs: string[];
  createdAt: number;
  updatedAt: number;
  playProgress?: number;
  isRead?: boolean;
}

export type VoiceType = 'slow' | 'female' | 'male' | 'dialect';

export interface VoiceOption {
  id: VoiceType;
  name: string;
  description: string;
  speed: number;
  pitch: number;
}

export interface VoiceSettings {
  voiceType: VoiceType;
  speed: number;
  pitch: number;
  volume: number;
  highlightWords: string[];
}

export interface PlayState {
  isPlaying: boolean;
  currentChapterId: string | null;
  currentParagraphIndex: number;
  currentTime: number;
  duration: number;
  sleepTimer: number | null;
  sleepTimerRemaining: number | null;
}
