import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
import { getMockChapters } from '@/data/mockChapters';

interface AppContextType {
  chapters: Chapter[];
  voiceSettings: VoiceSettings;
  currentChapter: Chapter | null;
  isPlaying: boolean;
  currentParagraphIndex: number;

  addChapter: (content: string, title?: string) => Chapter;
  removeChapter: (id: string) => void;
  setCurrentChapter: (id: string) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  setPlaying: (playing: boolean) => void;
  setParagraphIndex: (index: number) => void;
  nextParagraph: () => void;
  prevParagraph: () => void;
  adjustSpeed: (delta: number) => void;
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
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);

  useEffect(() => {
    const storedChapters = getChapters();
    if (storedChapters.length === 0) {
      const mockChapters = getMockChapters();
      setChapters(mockChapters);
      if (mockChapters.length > 0) {
        setCurrentChapterId(mockChapters[0].id);
      }
    } else {
      setChapters(storedChapters);
      const savedId = getCurrentChapterId();
      if (savedId && storedChapters.some(c => c.id === savedId)) {
        setCurrentChapterId(savedId);
      } else if (storedChapters.length > 0) {
        setCurrentChapterId(storedChapters[0].id);
      }
    }

    const savedSettings = getVoiceSettings();
    setVoiceSettings(savedSettings);

    console.log('[AppContext] Initialized with', storedChapters.length, 'chapters');
  }, []);

  const currentChapter = chapters.find(c => c.id === currentChapterId) || null;

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
    setChapters(updated);
    setCurrentChapterId(chapter.id);
    setCurrentParagraphIndex(0);
    console.log('[AppContext] Chapter added:', chapter.title);
    return chapter;
  }, []);

  const removeChapter = useCallback((id: string) => {
    const updated = storageDeleteChapter(id);
    setChapters(updated);

    if (currentChapterId === id) {
      if (updated.length > 0) {
        setCurrentChapterId(updated[0].id);
        setCurrentParagraphIndex(0);
      } else {
        setCurrentChapterId(null);
        setCurrentParagraphIndex(0);
      }
    }
    console.log('[AppContext] Chapter deleted:', id);
  }, [currentChapterId]);

  const setCurrentChapter = useCallback((id: string) => {
    setCurrentChapterId(id);
    setCurrentParagraphIndex(0);
    setIsPlaying(false);
    saveCurrentChapterId(id);
    console.log('[AppContext] Current chapter changed:', id);
  }, []);

  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => {
      const updated = { ...prev, ...settings };
      storageSaveVoiceSettings(updated);
      return updated;
    });
  }, []);

  const setPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    console.log('[AppContext] Playing:', playing);
  }, []);

  const setParagraphIndex = useCallback((index: number) => {
    setCurrentParagraphIndex(index);
  }, []);

  const nextParagraph = useCallback(() => {
    if (currentChapter) {
      setCurrentParagraphIndex(prev =>
        Math.min(prev + 1, currentChapter.paragraphs.length - 1)
      );
    }
  }, [currentChapter]);

  const prevParagraph = useCallback(() => {
    setCurrentParagraphIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const adjustSpeed = useCallback((delta: number) => {
    setVoiceSettings(prev => {
      const newSpeed = Math.max(0.5, Math.min(1.5, prev.speed + delta));
      const updated = { ...prev, speed: Number(newSpeed.toFixed(1)) };
      storageSaveVoiceSettings(updated);
      console.log('[AppContext] Speed adjusted to:', updated.speed);
      return updated;
    });
  }, []);

  const value: AppContextType = {
    chapters,
    voiceSettings,
    currentChapter,
    isPlaying,
    currentParagraphIndex,
    addChapter,
    removeChapter,
    setCurrentChapter,
    updateVoiceSettings,
    setPlaying,
    setParagraphIndex,
    nextParagraph,
    prevParagraph,
    adjustSpeed
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
