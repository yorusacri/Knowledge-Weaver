import { useCallback, useRef, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';

export default function FileUploader({ onUpload, uploading, progress }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onUpload(files);
  }, [onUpload]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const files = [...e.target.files];
    if (files.length) onUpload(files);
    e.target.value = '';
  };

  const hasProgress = uploading && progress > 0;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      style={{
        border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '28px 16px',
        textAlign: 'center',
        cursor: uploading ? 'wait' : 'pointer',
        background: dragOver ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
        transition: 'var(--transition-normal)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Upload progress background fill */}
      {uploading && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${progress}%`,
          height: 3,
          background: 'var(--accent)',
          transition: 'width 0.3s ease',
          borderRadius: '0 2px 0 0',
        }} />
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.md,.txt,.docx,.xlsx"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {uploading ? (
          <div className="animate-pulse" style={{ color: 'var(--accent)' }}>
            <FileUp size={28} />
          </div>
        ) : (
          <Upload size={28} style={{ color: dragOver ? 'var(--accent)' : 'var(--text-muted)' }} />
        )}
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: uploading ? 'var(--accent)' : 'var(--text-secondary)',
        }}>
          {uploading
            ? hasProgress ? `上传中 ${progress}%` : '上传中...'
            : '拖拽教材文件到此处'
          }
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          支持 PDF / Markdown / TXT / DOCX
        </div>
      </div>
    </div>
  );
}
