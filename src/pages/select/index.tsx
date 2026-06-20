import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Textarea, Input, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useApp } from '@/store/appContext';
import ChapterCard from '@/components/ChapterCard';
import BigButton from '@/components/BigButton';
import { parseParagraphs } from '@/utils/textParser';
import styles from './index.module.scss';

export default function SelectPage() {
  const { chapters, addChapter, removeChapter, currentChapter, setCurrentChapter, stopPreview, stopPlayback } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    stopPreview();
    stopPlayback();
  }, [stopPreview, stopPlayback]);

  const paragraphs = useMemo(() => parseParagraphs(content), [content]);

  const handlePaste = async () => {
    try {
      const res = await Taro.getClipboardData();
      if (res.data) {
        setContent(res.data);
        Taro.showToast({
          title: '已粘贴',
          icon: 'success',
          duration: 1500
        });
        console.log('[SelectPage] Pasted content from clipboard');
      }
    } catch (e) {
      console.error('[SelectPage] Paste error:', e);
      Taro.showToast({
        title: '粘贴失败',
        icon: 'none'
      });
    }
  };

  const handleSave = () => {
    if (!content.trim()) {
      Taro.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    if (paragraphs.length === 0) {
      Taro.showToast({
        title: '没有可保存的段落',
        icon: 'none'
      });
      return;
    }

    addChapter(content, title || undefined);
    setTitle('');
    setContent('');

    Taro.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500
    });

    console.log('[SelectPage] Chapter saved, total paragraphs:', paragraphs.length);
  };

  const handleDeleteChapter = (id: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个章节吗？',
      confirmText: '删除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          removeChapter(id);
          Taro.showToast({
            title: '已删除',
            icon: 'success'
          });
          console.log('[SelectPage] Chapter deleted:', id);
        }
      }
    });
  };

  const handleSelectChapter = (id: string) => {
    setCurrentChapter(id);
    Taro.switchTab({
      url: '/pages/play/index'
    });
  };

  return (
    <View className={styles.pageContainer}>
      <ScrollView scrollY style={{ height: '100%' }}>
        <View className={styles.inputCard}>
          <Input
            className={styles.titleInput}
            placeholder="输入章节标题（可选）"
            placeholderClass={styles.placeholder}
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
            maxlength={50}
          />

          <View className={styles.inputHeader}>
            <Text className={styles.inputLabel}>小说内容</Text>
            <Button className={styles.pasteBtn} onClick={handlePaste}>
              📋 粘贴
            </Button>
          </View>

          <Textarea
            className={styles.textArea}
            placeholder="在这里粘贴或输入小说内容...

支持乡村、年代、武侠等各种类型的小说段落。
系统会自动按自然段整理，让老人听得更清楚。"
            placeholderClass={styles.placeholder}
            value={content}
            onInput={(e) => setContent(e.detail.value)}
            autoHeight={false}
            maxlength={10000}
          />
        </View>

        <View className={styles.previewSection}>
          <View className={styles.previewTitle}>
            <Text>段落预览</Text>
            <Text className={styles.previewSubtitle}>
              共 {paragraphs.length} 段
            </Text>
          </View>

          {paragraphs.length > 0 ? (
            <View className={styles.paragraphList}>
              {paragraphs.map((p, index) => (
                <View key={index} className={styles.paragraphItem}>
                  <Text className={styles.paragraphNumber}>{index + 1}</Text>
                  <Text className={styles.paragraphText}>{p}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className={styles.paragraphList}>
              <Text className={styles.emptyState}>
                输入或粘贴内容后，这里会显示整理好的段落
              </Text>
            </View>
          )}
        </View>

        <View className={styles.chaptersSection}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>我的章节</Text>
            <Text className={styles.chapterCount}>共 {chapters.length} 章</Text>
          </View>

          {chapters.length > 0 ? (
            chapters.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                isActive={currentChapter?.id === chapter.id}
                onClick={() => handleSelectChapter(chapter.id)}
                onDelete={() => handleDeleteChapter(chapter.id)}
              />
            ))
          ) : (
            <View className={styles.paragraphList}>
              <Text className={styles.emptyState}>还没有保存的章节</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <BigButton type="primary" size="large" block onClick={handleSave}>
          💾 保存为章节
        </BigButton>
      </View>
    </View>
  );
}
