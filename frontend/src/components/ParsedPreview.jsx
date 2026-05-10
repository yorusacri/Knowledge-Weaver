import { useState } from 'react';
import { X, BookOpen, FileText, ChevronDown, ChevronRight, Layers } from 'lucide-react';

export default function ParsedPreview({ data, loading, onClose }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)',
      }}>
        <div className="animate-pulse"><FileText size={32} strokeWidth={1} /></div>
        <span style={{ fontSize: 13 }}>正在加载解析结果...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-muted)',
      }}>
        <BookOpen size={32} strokeWidth={1} style={{ opacity: 0.2 }} />
        <span style={{ fontSize: 13 }}>选择一本已解析的教材查看章节结构</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: 'var(--accent-glow)', border: '1px solid var(--border-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <BookOpen size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 15, fontFamily: 'var(--font-display)', margin: 0,
            color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {data.title || data.filename}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
            {data.total_pages && <span>{data.total_pages} 页</span>}
            <span>{data.total_chars?.toLocaleString()} 字</span>
            <span>{data.chapters?.length} 章</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none', background: 'var(--bg-tertiary)', borderRadius: 6,
            cursor: 'pointer', padding: 6, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Chapter list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {data.chapters?.map((ch, idx) => {
          const isOpen = expanded === ch.chapter_id;
          return (
            <div key={ch.chapter_id} style={{ margin: '0 10px 4px' }}>
              <div
                onClick={() => setExpanded(isOpen ? null : ch.chapter_id)}
                style={{
                  padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: isOpen ? 'var(--accent-glow)' : 'transparent',
                  border: isOpen ? '1px solid var(--border-accent)' : '1px solid transparent',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, background: 'var(--bg-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0,
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: isOpen ? 'var(--accent)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ch.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {ch.char_count?.toLocaleString()} 字
                    {ch.page_start != null && ` · 第 ${ch.page_start}–${ch.page_end} 页`}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </div>

              {isOpen && (
                <div style={{
                  margin: '2px 0 4px 28px', padding: '10px 12px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)',
                  maxHeight: 280, overflow: 'auto',
                }}>
                  {ch.content?.slice(0, 3000)}
                  {ch.content?.length > 3000 && (
                    <span style={{ color: 'var(--text-muted)' }}>... (共 {ch.char_count?.toLocaleString()} 字)</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
