import { useState, useEffect, useCallback, useRef } from 'react';
import FileUploader from './components/FileUploader';
import FileList from './components/FileList';
import ChapterPreview from './components/ChapterPreview';
import { uploadFiles, listTextbooks, getParsed, deleteTextbook, triggerParse } from './api';

export default function App() {
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const prevStatusRef = useRef({});

  const refresh = useCallback(async () => {
    try {
      const data = await listTextbooks();
      if (Array.isArray(data)) {
        setFiles(data);
        return data;
      }
    } catch {}
    return [];
  }, []);

  // Retry on mount: first request may fail due to proxy not ready
  useEffect(() => {
    let timer;
    let retries = 0;
    const tryLoad = async () => {
      const data = await refresh();
      if (data.length === 0 && retries < 5) {
        retries++;
        timer = setTimeout(tryLoad, 500);
      }
    };
    tryLoad();
    return () => clearTimeout(timer);
  }, [refresh]);

  // Smart polling: 1s when parsing, 3s otherwise
  useEffect(() => {
    let timer;
    const poll = async () => {
      const data = await refresh();
      const hasActive = data.some((f) => f.status === 'parsing' || f.status === 'uploaded');
      timer = setTimeout(poll, hasActive ? 1000 : 3000);

      // Auto-select when a file just finished parsing
      for (const f of data) {
        const prev = prevStatusRef.current[f.textbook_id];
        if (prev && prev !== 'completed' && f.status === 'completed') {
          setSelectedId((current) => {
            if (!current) {
              getParsed(f.textbook_id).then(setParsedData).catch(() => {});
              return f.textbook_id;
            }
            return current;
          });
        }
      }
      prevStatusRef.current = Object.fromEntries(data.map((f) => [f.textbook_id, f.status]));
    };
    // Delay first poll to let mount retry finish
    timer = setTimeout(poll, 2000);
    return () => clearTimeout(timer);
  }, [refresh]);

  const handleUpload = async (newFiles) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadFiles(newFiles, setUploadProgress);
      await refresh();
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  const handleReparse = async (id) => {
    await triggerParse(id);
    await refresh();
  };

  const completed = files.filter((f) => f.status === 'completed').length;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ width: 280, borderRight: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e8e8e8', fontWeight: 600, fontSize: 16 }}>
          教材管理
        </div>
        <div style={{ padding: 12, flex: 1, overflow: 'auto' }}>
          <FileUploader onUpload={handleUpload} />
          {uploading && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 4 }}>上传中... {uploadProgress}%</div>
              <div style={{ background: '#f0f0f0', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#1890ff', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: '#888', margin: '8px 0' }}>
            已解析 {completed}/{files.length} 本
          </p>
          <FileList files={files} onSelect={handleSelect} onDelete={handleDelete} onReparse={handleReparse} selectedId={selectedId} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <ChapterPreview data={parsedData} />
      </div>
    </div>
  );
}
