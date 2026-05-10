const STATUS_MAP = {
  uploaded: { text: '等待解析', color: '#faad14' },
  parsing: { text: '解析中', color: '#1890ff' },
  completed: { text: '已完成', color: '#52c41a' },
  failed: { text: '失败', color: '#ff4d4f' },
};

export default function FileList({ files, onSelect, onDelete, onReparse, selectedId }) {
  if (!files.length) {
    return <p style={{ color: '#999', padding: 16 }}>暂无已上传的教材</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {files.map((f) => {
        const st = STATUS_MAP[f.status] || { text: f.status, color: '#999' };
        const isSelected = f.textbook_id === selectedId;
        const canReparse = f.status !== 'completed' && f.status !== 'parsing';
        return (
          <div
            key={f.textbook_id}
            onClick={() => f.status === 'completed' && onSelect(f.textbook_id)}
            style={{
              padding: '10px 12px',
              border: isSelected ? '2px solid #1890ff' : '1px solid #e8e8e8',
              borderRadius: 6,
              cursor: f.status === 'completed' ? 'pointer' : 'default',
              background: isSelected ? '#e6f7ff' : '#fff',
              position: 'relative',
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(f.textbook_id); }}
              style={{
                position: 'absolute', top: 8, right: 8,
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 16, color: '#bbb', padding: '0 4px', lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.target.style.color = '#ff4d4f')}
              onMouseLeave={(e) => (e.target.style.color = '#bbb')}
              title="删除"
            >
              &times;
            </button>

            <div style={{ fontWeight: 500, fontSize: 14, paddingRight: 48 }}>{f.filename}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {f.file_type.toUpperCase()} &middot; {(f.size / 1024 / 1024).toFixed(1)} MB
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: st.color }}>
                {st.text}{f.status === 'parsing' ? ` ${f.progress}%` : ''}
              </span>
              {canReparse && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReparse(f.textbook_id); }}
                  style={{
                    fontSize: 11, color: '#1890ff', background: 'none',
                    border: '1px solid #1890ff', borderRadius: 3,
                    padding: '1px 6px', cursor: 'pointer',
                  }}
                >
                  重新解析
                </button>
              )}
            </div>
            {f.status === 'parsing' && (
              <div style={{ marginTop: 6, background: '#f0f0f0', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                <div style={{ width: `${f.progress}%`, height: '100%', background: '#1890ff', transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
