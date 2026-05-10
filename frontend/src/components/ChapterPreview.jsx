import { useState, useCallback } from 'react';
import { getChapterContent } from '../api';

export default function ChapterPreview({ data }) {
  const [expanded, setExpanded] = useState(null);
  const [contentCache, setContentCache] = useState({});
  const [loading, setLoading] = useState(null);

  const handleToggle = useCallback(async (chapterId) => {
    if (expanded === chapterId) {
      setExpanded(null);
      return;
    }
    setExpanded(chapterId);

    // Already cached
    if (contentCache[chapterId]) return;

    setLoading(chapterId);
    try {
      const res = await getChapterContent(data.textbook_id, chapterId);
      setContentCache((prev) => ({ ...prev, [chapterId]: res.content }));
    } catch {
      setContentCache((prev) => ({ ...prev, [chapterId]: '加载失败' }));
    } finally {
      setLoading(null);
    }
  }, [expanded, contentCache, data?.textbook_id]);

  if (!data) {
    return (
      <div style={{ padding: 24, color: '#999', textAlign: 'center' }}>
        选择一本已完成解析的教材查看章节结构
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 8px' }}>{data.title}</h3>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
        {data.total_pages ? `${data.total_pages} 页 · ` : ''}
        {data.total_chars?.toLocaleString()} 字 · {data.chapters?.length} 章
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.chapters?.map((ch) => (
          <div
            key={ch.chapter_id}
            onClick={() => handleToggle(ch.chapter_id)}
            style={{
              border: '1px solid #e8e8e8',
              borderRadius: 6,
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '10px 12px', background: '#fafafa', fontWeight: 500 }}>
              {ch.title}
              <span style={{ float: 'right', fontSize: 12, color: '#888' }}>
                {ch.char_count?.toLocaleString()} 字
                {ch.page_start ? ` · 第 ${ch.page_start}-${ch.page_end} 页` : ''}
              </span>
            </div>
            {expanded === ch.chapter_id && (
              <div style={{ padding: 12, fontSize: 13, lineHeight: 1.8, maxHeight: 300, overflow: 'auto' }}>
                {loading === ch.chapter_id
                  ? '加载中...'
                  : (contentCache[ch.chapter_id]?.slice(0, 2000) || '无内容')}
                {contentCache[ch.chapter_id]?.length > 2000 && '...'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
