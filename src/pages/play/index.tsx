import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useApp } from '@/store/appContext';
import { formatTime } from '@/utils/textParser';
import type { Chapter } from '@/types';
import styles from './index.module.scss';

type TextSize = 'normal' | 'large' | 'huge';
type SleepTimer = number | null;

const SLEEP_OPTIONS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '45分钟', value: 45 },
  { label: '60分钟', value: 60 }
];

export default function PlayPage() {
  const {
    chapters,
    currentChapter,
    isPlaying,
    isPaused,
    currentParagraphIndex,
    togglePlay,
    stopPlayback,
    nextParagraph,
    prevParagraph,
    setCurrentChapter,
    setParagraphIndex,
    stopPreview
  } = useApp();

  useEffect(() => {
    stopPreview();
    return () => {
      stopPlayback();
    };
  }, [stopPreview, stopPlayback]);

  const [textSize, setTextSize] = useState<TextSize>('normal');
  const [sleepTimer, setSleepTimer] = useState<SleepTimer>(null);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalParagraphs = currentChapter?.paragraphs.length || 0;
  const currentParagraph = currentChapter?.paragraphs[currentParagraphIndex] || '';

  const totalDuration = useMemo(() => {
    if (!currentChapter) return 0;
    const totalChars = currentChapter.paragraphs.reduce((sum, p) => sum + p.length, 0);
    return Math.max(60, Math.ceil(totalChars / 4));
  }, [currentChapter]);

  useEffect(() => {
    if (isPlaying && !isPaused) {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(prev => Math.min(prev + 1, totalDuration));
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [isPlaying, isPaused, totalDuration]);

  useEffect(() => {
    setElapsedSeconds(0);
  }, [currentChapter?.id]);

  useEffect(() => {
    if (sleepTimer && sleepTimer > 0) {
      setSleepRemaining(sleepTimer * 60);

      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
      }

      sleepTimerRef.current = setInterval(() => {
        setSleepRemaining(prev => {
          if (prev === null || prev <= 1) {
            stopPlayback();
            setSleepTimer(null);
            if (sleepTimerRef.current) {
              clearInterval(sleepTimerRef.current);
            }
            Taro.showToast({
              title: '定时结束，已停止',
              icon: 'none'
            });
            console.log('[PlayPage] Sleep timer finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
      }
    };
  }, [sleepTimer, stopPlayback]);

  const handlePlayToggle = () => {
    if (!currentChapter) {
      Taro.showToast({
        title: '请先添加章节',
        icon: 'none'
      });
      return;
    }
    togglePlay();
  };

  const handlePrevParagraph = () => {
    prevParagraph();
  };

  const handleNextParagraph = () => {
    nextParagraph();
  };

  const handleSleepSelect = (minutes: number) => {
    setSleepTimer(minutes);
    setShowSleepModal(false);
    Taro.showToast({
      title: `${minutes}分钟后停止`,
      icon: 'success'
    });
    console.log('[PlayPage] Sleep timer set:', minutes, 'minutes');
  };

  const handleCancelSleep = () => {
    setSleepTimer(null);
    setSleepRemaining(null);
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
    }
    setShowSleepModal(false);
    Taro.showToast({
      title: '已取消定时',
      icon: 'none'
    });
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setCurrentChapter(chapter.id);
    setShowChapterModal(false);
    setElapsedSeconds(0);
    console.log('[PlayPage] Chapter selected:', chapter.title);
  };

  const handleTextSizeChange = (size: TextSize) => {
    setTextSize(size);
  };

  const progressPercent = totalDuration > 0 ? (elapsedSeconds / totalDuration) * 100 : 0;

  const formatSleepRemaining = () => {
    if (sleepRemaining === null) return '';
    const mins = Math.floor(sleepRemaining / 60);
    const secs = sleepRemaining % 60;
    return `${mins}分${secs.toString().padStart(2, '0')}秒`;
  };

  return (
    <View className={styles.pageContainer}>
      <ScrollView scrollY className={styles.content}>
        {currentChapter ? (
          <>
            <View className={styles.chapterInfo}>
              <Text className={styles.chapterTitle}>{currentChapter.title}</Text>
              <Text className={styles.chapterMeta}>
                第 {currentParagraphIndex + 1} 段 / 共 {totalParagraphs} 段
              </Text>
            </View>

            <View className={styles.paragraphCard}>
              <Text
                className={classnames(
                  styles.paragraphText,
                  textSize === 'large' && styles.large,
                  textSize === 'huge' && styles.huge
                )}
              >
                {currentParagraph || '没有内容'}
              </Text>
            </View>

            <View className={styles.progressSection}>
              <View className={styles.progressBar}>
                <View
                  className={styles.progressFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
              <View className={styles.progressInfo}>
                <Text>{formatTime(elapsedSeconds)}</Text>
                <Text>{formatTime(totalDuration)}</Text>
              </View>
            </View>

            <View className={styles.paragraphNav}>
              <Button
                className={classnames(styles.navBtn, currentParagraphIndex === 0 && styles.disabled)}
                onClick={handlePrevParagraph}
              >
                ◀
              </Button>
              <Text className={styles.paragraphIndicator}>
                {currentParagraphIndex + 1} / {totalParagraphs}
              </Text>
              <Button
                className={classnames(
                  styles.navBtn,
                  currentParagraphIndex >= totalParagraphs - 1 && styles.disabled
                )}
                onClick={handleNextParagraph}
              >
                ▶
              </Button>
            </View>

            <View className={styles.playControls}>
              <Button
                className={styles.smallControlBtn}
                onClick={() => setShowChapterModal(true)}
              >
                📚
              </Button>

              <Button
                className={classnames(styles.playBtn, (isPlaying || isPaused) && styles.playing)}
                onClick={handlePlayToggle}
              >
                {isPlaying && !isPaused ? '⏸' : '▶'}
              </Button>

              <Button
                className={styles.smallControlBtn}
                onClick={() => setShowSleepModal(true)}
              >
                ⏰
              </Button>
            </View>
          </>
        ) : (
          <View className={styles.emptyState}>
            <Text style={{ fontSize: '80rpx', marginBottom: '32rpx' }}>📖</Text>
            <Text>还没有添加章节</Text>
            <Text style={{ fontSize: '28rpx', marginTop: '16rpx' }}>
              请到"选文"页粘贴或输入小说内容
            </Text>
          </View>
        )}
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.bottomActions}>
          <View style={{ flex: 2, marginRight: '16rpx' }}>
            <Text style={{ fontSize: '28rpx', color: '#4A4A4A', marginBottom: '12rpx' }}>
              字号大小
            </Text>
            <View className={styles.sizeOptions}>
              <Button
                className={classnames(styles.sizeOption, textSize === 'normal' && styles.active)}
                onClick={() => handleTextSizeChange('normal')}
              >
                标准
              </Button>
              <Button
                className={classnames(styles.sizeOption, textSize === 'large' && styles.active)}
                onClick={() => handleTextSizeChange('large')}
              >
                大
              </Button>
              <Button
                className={classnames(styles.sizeOption, textSize === 'huge' && styles.active)}
                onClick={() => handleTextSizeChange('huge')}
              >
                特大
              </Button>
            </View>
          </View>
        </View>

        {sleepTimer !== null && sleepRemaining !== null && (
          <Text className={classnames(styles.timerDisplay, styles.timerActive)}>
            ⏰ 睡前定时：还剩 {formatSleepRemaining()}
          </Text>
        )}
      </View>

      {showSleepModal && (
        <View className={styles.sleepTimerModal} onClick={() => setShowSleepModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>睡前定时</Text>

            <View className={styles.timerOptions}>
              {SLEEP_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  className={classnames(
                    styles.timerOption,
                    sleepTimer === option.value && styles.selected
                  )}
                  onClick={() => handleSleepSelect(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </View>

            {sleepTimer !== null && (
              <Button className={styles.modalClose} onClick={handleCancelSleep}>
                取消定时
              </Button>
            )}
          </View>
        </View>
      )}

      {showChapterModal && (
        <View className={styles.sleepTimerModal} onClick={() => setShowChapterModal(false)}>
          <View
            className={classnames(styles.modalContent, styles.chapterModal)}
            onClick={(e) => e.stopPropagation()}
          >
            <Text className={styles.modalTitle}>选择章节</Text>

            {chapters.length > 0 ? (
              chapters.map((chapter) => (
                <View
                  key={chapter.id}
                  className={classnames(
                    styles.chapterItem,
                    currentChapter?.id === chapter.id && styles.active
                  )}
                  onClick={() => handleChapterSelect(chapter)}
                >
                  {chapter.title}
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', color: '#8C8C8C', padding: '32rpx 0' }}>
                还没有章节
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
