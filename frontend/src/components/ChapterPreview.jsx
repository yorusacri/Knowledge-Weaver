import { useState } from 'react';

export default function ChapterPreview({ data }) {
  const [expanded, setExpanded] = useState(null);

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
            onClick={() => setExpanded(expanded === ch.chapter_id ? null : ch.chapter_id)}
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
                {ch.content?.slice(0, 2000)}
                {ch.content?.length > 2000 && '...'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
