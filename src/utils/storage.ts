import Taro from '@tarojs/taro';
import type { Chapter, VoiceSettings } from '@/types';

const CHAPTERS_KEY = 'family_audiobook_chapters';
const VOICE_SETTINGS_KEY = 'family_audiobook_voice_settings';
const CURRENT_CHAPTER_KEY = 'family_audiobook_current_chapter';

export function getChapters(): Chapter[] {
  try {
    const data = Taro.getStorageSync(CHAPTERS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[Storage] getChapters error:', e);
  }
  return [];
}

export function saveChapters(chapters: Chapter[]): void {
  try {
    Taro.setStorageSync(CHAPTERS_KEY, JSON.stringify(chapters));
  } catch (e) {
    console.error('[Storage] saveChapters error:', e);
  }
}

export function addChapter(chapter: Chapter): Chapter[] {
  const chapters = getChapters();
  chapters.push(chapter);
  saveChapters(chapters);
  return chapters;
}

export function updateChapter(id: string, updates: Partial<Chapter>): Chapter[] {
  const chapters = getChapters();
  const index = chapters.findIndex(c => c.id === id);
  if (index !== -1) {
    chapters[index] = { ...chapters[index], ...updates, updatedAt: Date.now() };
    saveChapters(chapters);
  }
  return chapters;
}

export function deleteChapter(id: string): Chapter[] {
  const chapters = getChapters();
  const filtered = chapters.filter(c => c.id !== id);
  saveChapters(filtered);
  return filtered;
}

export function getVoiceSettings(): VoiceSettings {
  try {
    const data = Taro.getStorageSync(VOICE_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[Storage] getVoiceSettings error:', e);
  }
  return {
    voiceType: 'slow',
    speed: 0.8,
    pitch: 1,
    volume: 1,
    highlightWords: []
  };
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    Taro.setStorageSync(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('[Storage] saveVoiceSettings error:', e);
  }
}

export function getCurrentChapterId(): string | null {
  try {
    return Taro.getStorageSync(CURRENT_CHAPTER_KEY) || null;
  } catch (e) {
    console.error('[Storage] getCurrentChapterId error:', e);
    return null;
  }
}

export function saveCurrentChapterId(id: string): void {
  try {
    Taro.setStorageSync(CURRENT_CHAPTER_KEY, id);
  } catch (e) {
    console.error('[Storage] saveCurrentChapterId error:', e);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
