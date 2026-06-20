import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { Chapter, VoiceSettings, VoiceType } from '@/types';
import {
  getChapters,
  addChapter as storageAddChapter,
  updateChapter as storageUpdateChapter,
  deleteChapter as storageDeleteChapter,
  getVoiceSettings,
  saveVoiceSettings as storageSaveVoiceSettings,
  getCurrentChapterId,
  saveCurrentChapterId,
  generateId
} from '@/utils/storage';
import { parseParagraphs, generateChapterTitle } from '@/utils/textParser';
import { speak, stopSpeak, pauseSpeak, resumeSpeak, isSpeaking } from '@/utils/tts';
import { getMockChapters } from '@/data/mockChapters';

interface AppContextType {
  chapters: Chapter[];
  voiceSettings: VoiceSettings;
  currentChapter: Chapter | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentParagraphIndex: number;

  addChapter: (content: string, title?: string) => Chapter;
  removeChapter: (id: string) => void;
  setCurrentChapter: (id: string) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  togglePlay: () => void;
  stopPlayback: () => void;
  setParagraphIndex: (index: number) => void;
  nextParagraph: () => void;
  prevParagraph: () => void;
  adjustSpeed: (delta: number) => void;
  previewVoice: (text: string, overrideSettings?: Partial<VoiceSettings>) => void;
  stopPreview: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceType: 'slow',
    speed: 0.8,
    pitch: 1,
    volume: 1,
    highlightWords: []
  });
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);

  const isPreviewRef = useRef(false);
  const isAutoPlayRef = useRef(false);

  const stopSpeaker = useCallback(() => {
    isPreviewRef.current = false;
    isAutoPlayRef.current = false;
    stopSpeak();
  }, []);

  useEffect(() => {
    const storedChapters = getChapters();
    if (storedChapters.length === 0) {
      const mockChapters = getMockChapters();
      const sorted = [...mockChapters].sort((a, b) => a.createdAt - b.createdAt);
      setChapters(sorted);
      if (sorted.length > 0) {
        setCurrentChapterId(sorted[0].id);
      }
    } else {
      const sortedChapters = [...storedChapters].sort((a, b) => a.createdAt - b.createdAt);
      setChapters(sortedChapters);
      const savedId = getCurrentChapterId();
      if (savedId && sortedChapters.some(c => c.id === savedId)) {
        setCurrentChapterId(savedId);
      } else if (sortedChapters.length > 0) {
        setCurrentChapterId(sortedChapters[0].id);
      }
    }

    const savedSettings = getVoiceSettings();
    setVoiceSettings(savedSettings);

    console.log('[AppContext] Initialized with', storedChapters.length, 'chapters');

    return () => {
      stopSpeaker();
    };
  }, [stopSpeaker]);

  const currentChapter = chapters.find(c => c.id === currentChapterId) || null;

  const playParagraph = useCallback((paragraphIndex: number, isAutoPlay = false) => {
    if (!currentChapter) return;

    const paragraphs = currentChapter.paragraphs;
    if (paragraphIndex < 0 || paragraphIndex >= paragraphs.length) {
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) {
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    stopSpeak();

    isPreviewRef.current = false;
    isAutoPlayRef.current = isAutoPlay;
    setIsPlaying(true);
    setIsPaused(false);

    console.log('[AppContext] Playing paragraph', paragraphIndex + 1, '/', paragraphs.length);

    speak({
      text: paragraph,
      settings: voiceSettings,
      highlightWords: voiceSettings.highlightWords,
      onEnd: () => {
        if (isPreviewRef.current) {
          console.log('[AppContext] Preview ended, ignoring (was preview)');
          return;
        }

        if (paragraphIndex < paragraphs.length - 1) {
          console.log('[AppContext] Auto-playing next paragraph');
          const nextIdx = paragraphIndex + 1;
          setCurrentParagraphIndex(nextIdx);
          setTimeout(() => {
            if (!isPreviewRef.current) {
              playParagraph(nextIdx, true);
            }
          }, 300);
        } else {
          console.log('[AppContext] Chapter finished');
          setIsPlaying(false);
          setIsPaused(false);
          isAutoPlayRef.current = false;
        }
      }
    });
  }, [currentChapter, voiceSettings]);

  const addChapter = useCallback((content: string, title?: string): Chapter => {
    const now = Date.now();
    const chapter: Chapter = {
      id: generateId(),
      title: generateChapterTitle(content, title),
      content,
      paragraphs: parseParagraphs(content),
      createdAt: now,
      updatedAt: now,
      playProgress: 0,
      isRead: false
    };

    const updated = storageAddChapter(chapter);
    const sorted = [...updated].sort((a, b) => a.createdAt - b.createdAt);
    setChapters(sorted);
    setCurrentChapterId(chapter.id);
    setCurrentParagraphIndex(0);
    stopSpeaker();
    console.log('[AppContext] Chapter added:', chapter.title);
    return chapter;
  }, [stopSpeaker]);

  const removeChapter = useCallback((id: string) => {
    const updated = storageDeleteChapter(id);
    const sorted = [...updated].sort((a, b) => a.createdAt - b.createdAt);
    setChapters(sorted);

    if (currentChapterId === id) {
      stopSpeaker();
      if (sorted.length > 0) {
        setCurrentChapterId(sorted[0].id);
        setCurrentParagraphIndex(0);
      } else {
        setCurrentChapterId(null);
        setCurrentParagraphIndex(0);
      }
    }
    console.log('[AppContext] Chapter deleted:', id);
  }, [currentChapterId, stopSpeaker]);

  const setCurrentChapter = useCallback((id: string) => {
    stopSpeaker();
    setCurrentChapterId(id);
    setCurrentParagraphIndex(0);
    saveCurrentChapterId(id);
    console.log('[AppContext] Current chapter changed:', id);
  }, [stopSpeaker]);

  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => {
      const updated = { ...prev, ...settings };
      storageSaveVoiceSettings(updated);
      return updated;
    });
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentChapter) {
      console.warn('[AppContext] No chapter selected');
      return;
    }

    if (isPlaying && !isPaused) {
      pauseSpeak();
      setIsPaused(true);
      console.log('[AppContext] Paused');
    } else if (isPaused) {
      resumeSpeak();
      setIsPaused(false);
      console.log('[AppContext] Resumed');
    } else {
      playParagraph(currentParagraphIndex, false);
    }
  }, [currentChapter, isPlaying, isPaused, currentParagraphIndex, playParagraph]);

  const stopPlayback = useCallback(() => {
    stopSpeaker();
    setIsPlaying(false);
    setIsPaused(false);
  }, [stopSpeaker]);

  const setParagraphIndex = useCallback((index: number) => {
    if (!currentChapter) return;
    const total = currentChapter.paragraphs.length;
    const safeIndex = Math.max(0, Math.min(total - 1, index));

    setCurrentParagraphIndex(safeIndex);

    if (isPlaying || isPaused) {
      setIsPaused(false);
      playParagraph(safeIndex, false);
    }
  }, [currentChapter, isPlaying, isPaused, playParagraph]);

  const nextParagraph = useCallback(() => {
    if (!currentChapter) return;
    const nextIdx = Math.min(currentParagraphIndex + 1, currentChapter.paragraphs.length - 1);
    setParagraphIndex(nextIdx);
  }, [currentChapter, currentParagraphIndex, setParagraphIndex]);

  const prevParagraph = useCallback(() => {
    const prevIdx = Math.max(currentParagraphIndex - 1, 0);
    setParagraphIndex(prevIdx);
  }, [currentParagraphIndex, setParagraphIndex]);

  const adjustSpeed = useCallback((delta: number) => {
    setVoiceSettings(prev => {
      const newSpeed = Math.max(0.5, Math.min(1.5, prev.speed + delta));
      const updated = { ...prev, speed: Number(newSpeed.toFixed(1)) };
      storageSaveVoiceSettings(updated);
      console.log('[AppContext] Speed adjusted to:', updated.speed);
      return updated;
    });
  }, []);

  const previewVoice = useCallback((text: string, overrideSettings?: Partial<VoiceSettings>) => {
    stopSpeak();
    isPreviewRef.current = true;
    isAutoPlayRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);

    const effectiveSettings = overrideSettings
      ? { ...voiceSettings, ...overrideSettings }
      : voiceSettings;

    console.log('[AppContext] Preview voice:', effectiveSettings.voiceType,
      'speed:', effectiveSettings.speed,
      'pitch:', effectiveSettings.pitch,
      'highlights:', effectiveSettings.highlightWords);

    speak({
      text,
      settings: effectiveSettings,
      highlightWords: effectiveSettings.highlightWords,
      onEnd: () => {
        console.log('[AppContext] Preview finished');
        isPreviewRef.current = false;
      }
    });
  }, [voiceSettings]);

  const stopPreview = useCallback(() => {
    stopSpeak();
    isPreviewRef.current = false;
  }, []);

  const value: AppContextType = {
    chapters,
    voiceSettings,
    currentChapter,
    isPlaying,
    isPaused,
    currentParagraphIndex,
    addChapter,
    removeChapter,
    setCurrentChapter,
    updateVoiceSettings,
    togglePlay,
    stopPlayback,
    setParagraphIndex,
    nextParagraph,
    prevParagraph,
    adjustSpeed,
    previewVoice,
    stopPreview
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
