export function parseParagraphs(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());

  return paragraphs;
}

export function generateChapterTitle(content: string, defaultTitle?: string): string {
  if (defaultTitle && defaultTitle.trim()) {
    return defaultTitle.trim();
  }

  const paragraphs = parseParagraphs(content);
  if (paragraphs.length > 0) {
    const firstLine = paragraphs[0];
    if (firstLine.length <= 30) {
      return firstLine;
    }
    return firstLine.substring(0, 20) + '...';
  }

  return '未命名章节';
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function estimateDuration(text: string, speed: number = 1): number {
  const charCount = text.replace(/\s/g, '').length;
  const charsPerSecond = 4 * speed;
  return Math.max(1, Math.ceil(charCount / charsPerSecond));
}

export function extractHighlights(text: string, keywords: string[]): string {
  let result = text;
  keywords.forEach(keyword => {
    if (keyword.trim()) {
      const regex = new RegExp(`(${keyword.trim()})`, 'g');
      result = result.replace(regex, '【$1】');
    }
  });
  return result;
}
