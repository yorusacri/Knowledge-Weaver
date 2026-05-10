import { useState, useEffect, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import FileList from './components/FileList';
import ChapterPreview from './components/ChapterPreview';
import { uploadFiles, listTextbooks, getParsed, deleteTextbook } from './api';

export default function App() {
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listTextbooks();
      setFiles(data);
    } catch {
      // backend not ready
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  const handleUpload = async (newFiles) => {
    setUploading(true);
    try {
      await uploadFiles(newFiles);
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = async (id) => {
    setSelectedId(id);
    try {
      const data = await getParsed(id);
      setParsedData(data);
    } catch {
      setParsedData(null);
    }
  };

  const handleDelete = async (id) => {
    await deleteTextbook(id);
    if (selectedId === id) {
      setSelectedId(null);
      setParsedData(null);
    }
    await refresh();
  };

  const completed = files.filter((f) => f.status === 'completed').length;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      {/* Left panel */}
      <div style={{ width: 280, borderRight: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e8e8e8', fontWeight: 600, fontSize: 16 }}>
          教材管理
        </div>
        <div style={{ padding: 12, flex: 1, overflow: 'auto' }}>
          <FileUploader onUpload={handleUpload} />
          {uploading && <p style={{ color: '#1890ff', fontSize: 13 }}>上传中...</p>}
          <p style={{ fontSize: 12, color: '#888', margin: '8px 0' }}>
            已解析 {completed}/{files.length} 本
          </p>
          <FileList files={files} onSelect={handleSelect} onDelete={handleDelete} selectedId={selectedId} />
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ChapterPreview data={parsedData} />
      </div>
    </div>
  );
}
