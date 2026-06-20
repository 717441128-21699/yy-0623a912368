import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import type { Chapter } from '@/types';
import { formatTime, estimateDuration } from '@/utils/textParser';
import styles from './index.module.scss';

interface ChapterCardProps {
  chapter: Chapter;
  isActive?: boolean;
  showDelete?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function ChapterCard({
  chapter,
  isActive = false,
  showDelete = true,
  onClick,
  onDelete
}: ChapterCardProps) {
  const duration = estimateDuration(chapter.content, 0.8);
  const dateStr = new Date(chapter.createdAt).toLocaleDateString('zh-CN');

  const handleDelete = (e: any) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <View
      className={classnames(styles.chapterCard, isActive && styles.active)}
      onClick={onClick}
    >
      <View className={styles.cardHeader}>
        <Text className={styles.chapterTitle}>{chapter.title}</Text>
        <Text className={classnames(styles.statusBadge, chapter.isRead && styles.read)}>
          {chapter.isRead ? '已听完' : '未听完'}
        </Text>
      </View>

      <Text className={styles.cardContent}>
        {chapter.paragraphs[0] || '暂无内容'}
      </Text>

      <View className={styles.cardFooter}>
        <View className={styles.meta}>
          <Text className={styles.metaItem}>
            {chapter.paragraphs.length}段
          </Text>
          <Text className={styles.metaItem}>
            {formatTime(duration)}
          </Text>
          <Text className={styles.metaItem}>{dateStr}</Text>
        </View>
        {showDelete && (
          <Button className={styles.deleteBtn} onClick={handleDelete}>
            删除
          </Button>
        )}
      </View>
    </View>
  );
}
