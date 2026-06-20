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
  previewVoice: (text: string) => void;
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

  useEffect(() => {
    const storedChapters = getChapters();
    if (storedChapters.length === 0) {
      const mockChapters = getMockChapters();
      setChapters(mockChapters);
      if (mockChapters.length > 0) {
        setCurrentChapterId(mockChapters[0].id);
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
      stopSpeak();
    };
  }, []);

  const currentChapter = chapters.find(c => c.id === currentChapterId) || null;

  const playCurrentParagraph = useCallback(() => {
    if (!currentChapter) return;

    const paragraph = currentChapter.paragraphs[currentParagraphIndex];
    if (!paragraph) {
      setIsPlaying(false);
      return;
    }

    isPreviewRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);

    speak({
      text: paragraph,
      settings: voiceSettings,
      highlightWords: voiceSettings.highlightWords,
      onEnd: () => {
        if (isPreviewRef.current) return;

        if (currentParagraphIndex < (currentChapter?.paragraphs.length || 0) - 1) {
          setCurrentParagraphIndex(prev => {
            const next = prev + 1;
            setTimeout(() => {
              if (!isPreviewRef.current) {
                playCurrentParagraph();
              }
            }, 300);
            return next;
          });
        } else {
          setIsPlaying(false);
          setIsPaused(false);
          console.log('[AppContext] Chapter finished');
        }
      }
    });
  }, [currentChapter, currentParagraphIndex, voiceSettings]);

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
    stopSpeak();
    setIsPlaying(false);
    setIsPaused(false);
    console.log('[AppContext] Chapter added:', chapter.title);
    return chapter;
  }, []);

  const removeChapter = useCallback((id: string) => {
    const updated = storageDeleteChapter(id);
    const sorted = [...updated].sort((a, b) => a.createdAt - b.createdAt);
    setChapters(sorted);

    if (currentChapterId === id) {
      stopSpeak();
      setIsPlaying(false);
      setIsPaused(false);
      if (sorted.length > 0) {
        setCurrentChapterId(sorted[0].id);
        setCurrentParagraphIndex(0);
      } else {
        setCurrentChapterId(null);
        setCurrentParagraphIndex(0);
      }
    }
    console.log('[AppContext] Chapter deleted:', id);
  }, [currentChapterId]);

  const setCurrentChapter = useCallback((id: string) => {
    stopSpeak();
    setCurrentChapterId(id);
    setCurrentParagraphIndex(0);
    setIsPlaying(false);
    setIsPaused(false);
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
      playCurrentParagraph();
    }
  }, [currentChapter, isPlaying, isPaused, playCurrentParagraph]);

  const stopPlayback = useCallback(() => {
    stopSpeak();
    isPreviewRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  const setParagraphIndexAndPlay = useCallback((index: number) => {
    stopSpeak();
    isPreviewRef.current = false;
    setCurrentParagraphIndex(index);
    if (isPlaying) {
      setTimeout(() => playCurrentParagraph(), 100);
    }
  }, [isPlaying, playCurrentParagraph]);

  const nextParagraph = useCallback(() => {
    if (!currentChapter) return;
    const nextIdx = Math.min(currentParagraphIndex + 1, currentChapter.paragraphs.length - 1);
    setParagraphIndexAndPlay(nextIdx);
  }, [currentChapter, currentParagraphIndex, setParagraphIndexAndPlay]);

  const prevParagraph = useCallback(() => {
    const prevIdx = Math.max(currentParagraphIndex - 1, 0);
    setParagraphIndexAndPlay(prevIdx);
  }, [currentParagraphIndex, setParagraphIndexAndPlay]);

  const adjustSpeed = useCallback((delta: number) => {
    setVoiceSettings(prev => {
      const newSpeed = Math.max(0.5, Math.min(1.5, prev.speed + delta));
      const updated = { ...prev, speed: Number(newSpeed.toFixed(1)) };
      storageSaveVoiceSettings(updated);
      console.log('[AppContext] Speed adjusted to:', updated.speed);
      return updated;
    });
  }, []);

  const previewVoice = useCallback((text: string) => {
    stopSpeak();
    isPreviewRef.current = true;
    setIsPlaying(false);
    setIsPaused(false);

    speak({
      text,
      settings: voiceSettings,
      highlightWords: voiceSettings.highlightWords,
      onEnd: () => {
        isPreviewRef.current = false;
        console.log('[AppContext] Preview finished');
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
    setParagraphIndex: setParagraphIndexAndPlay,
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
