import { useCallback } from 'react';

export default function FileUploader({ onUpload }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (files.length) onUpload(files);
  }, [onUpload]);

  const handleDragOver = (e) => e.preventDefault();

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.md,.txt,.docx';
    input.onchange = (e) => {
      const files = [...e.target.files];
      if (files.length) onUpload(files);
    };
    input.click();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
      style={{
        border: '2px dashed #aaa',
        borderRadius: 8,
        padding: 32,
        textAlign: 'center',
        cursor: 'pointer',
        background: '#fafafa',
        marginBottom: 16,
      }}
    >
      <p style={{ margin: 0, fontSize: 16 }}>拖拽文件到此处，或点击选择</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#888' }}>
        支持 PDF、Markdown、TXT、DOCX
      </p>
    </div>
  );
}
