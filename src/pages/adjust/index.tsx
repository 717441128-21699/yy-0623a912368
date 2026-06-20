import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Input, Button, Slider, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useApp } from '@/store/appContext';
import VoiceOption from '@/components/VoiceOption';
import BigButton from '@/components/BigButton';
import { voiceOptions } from '@/data/mockChapters';
import { stopSpeak } from '@/utils/tts';
import type { VoiceType } from '@/types';
import styles from './index.module.scss';

const PREVIEW_TEXT: Record<VoiceType, string> = {
  slow: '各位听众朋友，大家好。今天我来给大家读一段小说，请慢慢听，不要着急。',
  female: '春风十里不如你，亲爱的，今天天气真好，我们一起去郊外走走吧。',
  male: '话说那天下第一剑客，行走江湖数十年，从未遇到过真正的对手。',
  dialect: '嗨呀，这日子过得可真舒坦，俺们那旮沓的人呐，都是实在人。'
};

export default function AdjustPage() {
  const {
    voiceSettings,
    updateVoiceSettings,
    currentChapter,
    previewVoice,
    stopPreview
  } = useApp();

  const [highlightInput, setHighlightInput] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      stopSpeak();
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  const handleVoiceSelect = (voiceId: VoiceType) => {
    const option = voiceOptions.find(v => v.id === voiceId);
    if (option) {
      updateVoiceSettings({
        voiceType: voiceId,
        speed: option.speed,
        pitch: option.pitch
      });
      console.log('[AdjustPage] Voice selected:', voiceId);

      if (isPreviewing) {
        setIsPreviewing(false);
        stopPreview();
      }
    }
  };

  const handleSpeedChange = (e: any) => {
    const value = Number(e.detail.value.toFixed(1));
    updateVoiceSettings({ speed: value });
  };

  const handleSpeedAdjust = (delta: number) => {
    const newSpeed = Math.max(0.5, Math.min(1.5, voiceSettings.speed + delta));
    updateVoiceSettings({ speed: Number(newSpeed.toFixed(1)) });
    console.log('[AdjustPage] Speed adjusted to:', newSpeed.toFixed(1));

    if (isPreviewing) {
      handleStopPreview();
      setTimeout(() => handlePreview(), 200);
    }
  };

  const handlePitchChange = (e: any) => {
    const value = Number(e.detail.value.toFixed(1));
    updateVoiceSettings({ pitch: value });
  };

  const handleAddHighlight = () => {
    if (!highlightInput.trim()) {
      Taro.showToast({
        title: '请输入关键词',
        icon: 'none'
      });
      return;
    }

    if (voiceSettings.highlightWords.includes(highlightInput.trim())) {
      Taro.showToast({
        title: '已添加过',
        icon: 'none'
      });
      return;
    }

    updateVoiceSettings({
      highlightWords: [...voiceSettings.highlightWords, highlightInput.trim()]
    });
    setHighlightInput('');
    console.log('[AdjustPage] Highlight word added:', highlightInput.trim());
  };

  const handleRemoveHighlight = (word: string) => {
    updateVoiceSettings({
      highlightWords: voiceSettings.highlightWords.filter(w => w !== word)
    });
    console.log('[AdjustPage] Highlight word removed:', word);
  };

  const handlePreview = () => {
    if (isPreviewing) {
      handleStopPreview();
      return;
    }

    const previewText = PREVIEW_TEXT[voiceSettings.voiceType] || PREVIEW_TEXT.slow;
    let textToSpeak = previewText;

    if (currentChapter && currentChapter.paragraphs.length > 0) {
      textToSpeak = currentChapter.paragraphs[0].substring(0, 80) + '...';
    }

    setIsPreviewing(true);
    previewVoice(textToSpeak);

    const estimatedMs = Math.min(8000, textToSpeak.length * 250 / voiceSettings.speed);
    previewTimerRef.current = setTimeout(() => {
      setIsPreviewing(false);
    }, estimatedMs);

    console.log('[AdjustPage] Preview started with voice:', voiceSettings.voiceType);
  };

  const handleStopPreview = () => {
    stopPreview();
    setIsPreviewing(false);
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    console.log('[AdjustPage] Preview stopped');
  };

  return (
    <View className={styles.pageContainer}>
      <ScrollView scrollY style={{ height: '100%' }}>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择音色</Text>
          <Text className={styles.sectionDesc}>
            选一个最适合老人听的声音。慢速旁白最推荐，咬字清晰不费劲儿。
          </Text>

          <View className={styles.voiceList}>
            {voiceOptions.map((option) => (
              <VoiceOption
                key={option.id}
                option={option}
                selected={voiceSettings.voiceType === option.id}
                onClick={() => handleVoiceSelect(option.id)}
              />
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.speedSection}>
            <View className={styles.speedHeader}>
              <Text className={styles.speedLabel}>语速调节</Text>
              <Text className={styles.speedValue}>{voiceSettings.speed.toFixed(1)}x</Text>
            </View>

            <Slider
              className={styles.speedSlider}
              min={0.5}
              max={1.5}
              step={0.1}
              value={voiceSettings.speed}
              onChange={handleSpeedChange}
              activeColor="#FF7A45"
              backgroundColor="#F0F0F0"
              blockSize={28}
            />

            <View className={styles.speedButtons}>
              <Button
                className={styles.speedBtn}
                onClick={() => handleSpeedAdjust(-0.1)}
              >
                - 慢一点
              </Button>
              <Button
                className={`${styles.speedBtn} ${styles.slow}`}
                onClick={() => handleSpeedAdjust(-0.2)}
              >
                🐢 再慢一点
              </Button>
              <Button
                className={styles.speedBtn}
                onClick={() => handleSpeedAdjust(0.1)}
              >
                + 快一点
              </Button>
            </View>
          </View>

          <View className={styles.pitchSection}>
            <View className={styles.pitchHeader}>
              <Text className={styles.pitchLabel}>音调高低</Text>
              <Text className={styles.pitchValue}>{voiceSettings.pitch.toFixed(1)}</Text>
            </View>

            <Slider
              min={0.5}
              max={1.5}
              step={0.1}
              value={voiceSettings.pitch}
              onChange={handlePitchChange}
              activeColor="#4A90D9"
              backgroundColor="#F0F0F0"
              blockSize={28}
            />
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.highlightSection}>
            <View className={styles.highlightHeader}>
              <Text className={styles.highlightTitle}>重点读音</Text>
            </View>
            <Text className={styles.highlightDesc}>
              把人名、地名加进去，朗读时会读得更清楚、更重一些，方便老人听清。
            </Text>

            <View className={styles.highlightInputRow}>
              <Input
                className={styles.highlightInput}
                placeholder="输入人名、地名等关键词"
                value={highlightInput}
                onInput={(e) => setHighlightInput(e.detail.value)}
                maxlength={20}
                confirmType="done"
                onConfirm={handleAddHighlight}
              />
              <Button className={styles.addBtn} onClick={handleAddHighlight}>
                添加
              </Button>
            </View>

            {voiceSettings.highlightWords.length > 0 ? (
              <View className={styles.highlightTags}>
                {voiceSettings.highlightWords.map((word) => (
                  <View key={word} className={styles.highlightTag}>
                    <Text>{word}</Text>
                    <Text className={styles.remove} onClick={() => handleRemoveHighlight(word)}>
                      ×
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className={styles.emptyTags}>还没有添加重点词</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <BigButton type="primary" size="large" block onClick={handlePreview}>
          {isPreviewing ? '⏹️ 停止试听' : '🔊 试听效果'}
        </BigButton>
        <Text className={styles.previewTip}>
          {currentChapter
            ? `试听：${voiceSettings.voiceType === 'slow' ? '慢速旁白' : voiceSettings.voiceType === 'female' ? '清亮女声' : voiceSettings.voiceType === 'male' ? '沉稳男声' : '方言韵味'} · ${voiceSettings.speed.toFixed(1)}x`
            : '请到"选文"页选择或添加章节'}
        </Text>
      </View>
    </View>
  );
}
