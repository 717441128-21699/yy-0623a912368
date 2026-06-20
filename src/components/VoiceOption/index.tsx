import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { VoiceOption as VoiceOptionType } from '@/types';
import styles from './index.module.scss';

interface VoiceOptionProps {
  option: VoiceOptionType;
  selected?: boolean;
  onClick?: () => void;
}

export default function VoiceOption({ option, selected = false, onClick }: VoiceOptionProps) {
  const iconMap: Record<string, string> = {
    slow: '🐢',
    female: '👩',
    male: '👨',
    dialect: '🏡'
  };

  return (
    <View
      className={classnames(styles.voiceOption, selected && styles.selected)}
      onClick={onClick}
    >
      <View className={styles.voiceHeader}>
        <Text className={styles.voiceName}>{option.name}</Text>
        <View className={styles.voiceIcon}>{iconMap[option.id] || '🔊'}</View>
      </View>
      <Text className={styles.voiceDescription}>{option.description}</Text>
      <View className={styles.voiceInfo}>
        <Text className={styles.infoTag}>语速 {option.speed.toFixed(1)}x</Text>
        <Text className={styles.infoTag}>音调 {option.pitch.toFixed(1)}</Text>
      </View>
    </View>
  );
}
