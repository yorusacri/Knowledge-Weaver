import { FileText, CheckCircle, Loader, AlertCircle, Trash2, BookOpen } from 'lucide-react';
import { formatBytes } from '../utils/helpers';

const STATUS_CONFIG = {
  uploaded: { text: '等待解析', color: 'var(--accent)', icon: FileText },
  parsing:  { text: '解析中', color: 'var(--blue)', icon: Loader },
  completed:{ text: '已完成', color: 'var(--green)', icon: CheckCircle },
  failed:   { text: '解析失败', color: 'var(--red)', icon: AlertCircle },
};

const BOOK_COLORS = [
  'var(--book-1)', 'var(--book-2)', 'var(--book-3)', 'var(--book-4)',
  'var(--book-5)', 'var(--book-6)', 'var(--book-7)',
];

export default function FileList({ files, onSelect, onDelete, selectedId, progressMap }) {
  if (!files?.length) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '32px 16px',
        color: 'var(--text-muted)',
      }}>
        <BookOpen size={28} strokeWidth={1} />
        <span style={{ fontSize: 12 }}>暂无已上传的教材</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {files.map((f, idx) => {
        const st = STATUS_CONFIG[f.status] || { text: f.status, color: '#6b7280', icon: FileText };
        const Icon = st.icon;
        const isSelected = f.textbook_id === selectedId;
        const dotColor = BOOK_COLORS[idx % BOOK_COLORS.length];

        return (
          <div
            key={f.textbook_id}
            onClick={() => f.status === 'completed' && onSelect(f.textbook_id)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              cursor: f.status === 'completed' ? 'pointer' : 'default',
              background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
              border: isSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
              transition: 'var(--transition-fast)',
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Color dot for textbook source */}
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor,
              marginTop: 5,
              flexShrink: 0,
              boxShadow: isSelected ? `0 0 6px ${dotColor}` : 'none',
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingRight: 20,
              }}>
                {f.filename}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 3,
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {f.file_type?.toUpperCase()} · {formatBytes(f.size)}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  color: st.color,
                }}>
                  <Icon size={11} className={f.status === 'parsing' ? 'animate-pulse' : ''} />
                  {st.text}
                </span>
              </div>

              {/* Progress bar for parsing */}
              {f.status === 'parsing' && (
                <div style={{ marginTop: 6 }}>
                  <div style={{
                    height: 3,
                    background: 'var(--bg-tertiary)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progressMap?.[f.textbook_id] ?? 50}%`,
                      background: 'var(--blue)',
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  {progressMap?.[f.textbook_id] != null && (
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {progressMap[f.textbook_id]}%
                    </div>
                  )}
                </div>
              )}

              {/* Error message for failed */}
              {f.status === 'failed' && f.error_message && (
                <div style={{
                  marginTop: 4, fontSize: 11, color: 'var(--red)',
                  lineHeight: 1.4,
                }}>
                  {f.error_message}
                </div>
              )}
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(f.textbook_id);
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                color: 'var(--text-muted)',
                opacity: 0.4,
                transition: 'var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = 'var(--red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.4';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="删除"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
