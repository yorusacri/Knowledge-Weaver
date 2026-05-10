import { useState, useCallback, useEffect } from 'react';
import {
  BookOpen, Network, GitMerge, MessageCircle, FileText,
  ChevronLeft, ChevronRight, Search, Loader,
} from 'lucide-react';

import FileUploader from './components/FileUploader';
import FileList from './components/FileList';
import GraphPanel from './components/GraphPanel';
import NodeDetail from './components/NodeDetail';
import IntegrationTab from './components/IntegrationTab';
import RAGTab from './components/RAGTab';
import DialogueTab from './components/DialogueTab';
import ReportTab from './components/ReportTab';
import { useStore } from './store';
import { uploadFiles, listTextbooks, getParsed, deleteTextbook, getTextbookStatus, getGraphData, getAllGraphData, buildGraph } from './api';

const TABS = [
  { key: 'integration', label: '整合操作', icon: GitMerge },
  { key: 'rag', label: 'RAG 问答', icon: Search },
  { key: 'dialogue', label: '教师对话', icon: MessageCircle },
  { key: 'report', label: '整合报告', icon: FileText },
];

export default function App() {
  const {
    textbooks, setTextbooks, uploading, setUploading,
    selectedBookId, setSelectedBook,
    graphData, setGraphData,
    selectedNode, setSelectedNode,
    graphSearch, setGraphSearch,
    showLabels, setShowLabels,
    progressMap, setProgress, clearProgress,
  } = useStore();

  const [activeTab, setActiveTab] = useState('integration');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [graphBuilding, setGraphBuilding] = useState(false);
  const [graphStatus, setGraphStatus] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await listTextbooks();
      setTextbooks(data);
    } catch {}
  }, [setTextbooks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll progress for textbooks that are currently parsing
  useEffect(() => {
    const parsingBooks = textbooks.filter((t) => t.status === 'parsing');
    if (!parsingBooks.length) return;

    const poll = setInterval(async () => {
      try {
        const results = await Promise.all(
          parsingBooks.map((t) => getTextbookStatus(t.textbook_id).catch(() => null))
        );
        let needsRefresh = false;
        results.forEach((status) => {
          if (!status) return;
          if (status.status === 'parsing') {
            setProgress(status.textbook_id, status.progress ?? 0);
          } else {
            clearProgress(status.textbook_id);
            needsRefresh = true;
          }
        });
        if (needsRefresh) refresh();
      } catch {}
    }, 1500);

    return () => clearInterval(poll);
  }, [textbooks, setProgress, clearProgress, refresh]);

  const handleUpload = async (newFiles) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadFiles(newFiles, (pct) => setUploadProgress(pct));
      setUploadProgress(100);
      await refresh();
    } catch {}
    setUploading(false);
    setUploadProgress(0);
  };

  const handleSelectBook = async (id) => {
    setSelectedBook(id);
    setGraphBuilding(true);
    setGraphStatus('正在获取图谱数据...');
    try {
      const data = await getGraphData(id);
      setGraphData(data);
      setGraphBuilding(false);
      setGraphStatus('');
      return;
    } catch (e) {
      console.log('Graph not found, triggering build:', e.message);
    }

    // Graph doesn't exist yet - trigger build
    try {
      setGraphStatus('正在调用 LLM 提取知识点，请稍候...');
      await buildGraph(id);
      console.log('Build triggered, polling for result...');
      // Poll until graph is ready (max ~120s)
      for (let i = 0; i < 60; i++) {
        setGraphStatus(`正在构建图谱... (${i * 2}s)`);
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const data = await getGraphData(id);
          setGraphData(data);
          console.log('Graph loaded successfully');
          setGraphBuilding(false);
          setGraphStatus('');
          return;
        } catch {
          /* not ready yet */
        }
      }
      console.error('Graph build timed out after 120s');
      setGraphStatus('图谱构建超时，请检查后端日志');
    } catch (e) {
      console.error('Graph build failed:', e);
      setGraphStatus(`构建失败: ${e.message}`);
    }
    setGraphBuilding(false);
  };

  const handleDeleteBook = async (id) => {
    try {
      await deleteTextbook(id);
    } catch {}
    if (selectedBookId === id) {
      setSelectedBook(null);
    }
    refresh();
  };

  const completedCount = textbooks.filter((f) => f.status === 'completed').length;
  const allNodes = graphData?.nodes || [];
  const allEdges = graphData?.edges || [];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'integration': return <IntegrationTab />;
      case 'rag': return <RAGTab />;
      case 'dialogue': return <DialogueTab />;
      case 'report': return <ReportTab />;
      default: return null;
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* ─── Left Sidebar: Textbook Management ─── */}
      <div style={{
        width: sidebarCollapsed ? 48 : 280,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: sidebarCollapsed ? '14px 0' : '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          minHeight: 52,
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent), #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Network size={13} style={{ color: 'var(--text-inverse)' }} />
              </div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}>
                MediGraph
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              border: 'none',
              background: 'var(--bg-tertiary)',
              borderRadius: 6,
              cursor: 'pointer',
              padding: 6,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              transition: 'var(--transition-fast)',
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <FileUploader onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />

            {/* Stats */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 4px',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}>
              <BookOpen size={13} />
              <span>
                已解析 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{completedCount}</span> / {textbooks.length} 本
              </span>
            </div>

            <FileList
              files={textbooks}
              onSelect={handleSelectBook}
              onDelete={handleDeleteBook}
              selectedId={selectedBookId}
              progressMap={progressMap}
            />
          </div>
        )}

        {sidebarCollapsed && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            gap: 8,
          }}>
            {textbooks.slice(0, 5).map((f, i) => (
              <div
                key={f.textbook_id}
                onClick={() => f.status === 'completed' && handleSelectBook(f.textbook_id)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  background: f.textbook_id === selectedBookId
                    ? 'var(--accent-glow)'
                    : 'var(--bg-tertiary)',
                  border: f.textbook_id === selectedBookId
                    ? '1px solid var(--border-accent)'
                    : '1px solid var(--border)',
                  cursor: f.status === 'completed' ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: f.textbook_id === selectedBookId ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
                title={f.filename}
              >
                {i + 1}
              </div>
            ))}
            {textbooks.length > 5 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                +{textbooks.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── Center: Knowledge Graph ─── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar with search */}
        <div style={{
          height: 44,
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
          }}>
            <Network size={15} style={{ color: 'var(--accent)' }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              color: 'var(--text-primary)',
            }}>
              知识图谱
            </span>
            {selectedBookId && (
              <span style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginLeft: 4,
              }}>
                — {textbooks.find((t) => t.textbook_id === selectedBookId)?.filename || ''}
              </span>
            )}
          </div>

          {/* Search */}
          <div style={{
            position: 'relative',
            width: 240,
          }}>
            <Search size={13} style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} />
            <input
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              placeholder="搜索知识点..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                transition: 'var(--transition-fast)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--border-accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        {/* Graph area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <GraphPanel
            graphData={graphData}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            searchQuery={graphSearch}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels(!showLabels)}
          />

          {/* Graph building overlay */}
          {graphBuilding && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, zIndex: 100,
            }}>
              <Loader size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                正在构建知识图谱...
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {graphStatus || 'LLM 正在提取知识点和关系，请稍候'}
              </div>
            </div>
          )}

          {/* Node detail overlay */}
          <NodeDetail
            node={selectedNode}
            allNodes={allNodes}
            allEdges={allEdges}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      </div>

      {/* ─── Right Panel: Functional Tabs ─── */}
      <div style={{
        width: rightCollapsed ? 48 : 380,
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{
          minHeight: 44,
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
        }}>
          {!rightCollapsed ? (
            <div style={{
              display: 'flex',
              flex: 1,
              padding: '0 4px',
              gap: 0,
            }}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '8px 4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      transition: 'var(--transition-fast)',
                      position: 'relative',
                    }}
                  >
                    <Icon size={14} />
                    <span style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            style={{
              border: 'none',
              background: 'var(--bg-tertiary)',
              borderRadius: 6,
              cursor: 'pointer',
              padding: 6,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              marginRight: 8,
              flexShrink: 0,
            }}
          >
            {rightCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* Tab content */}
        {!rightCollapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {renderTabContent()}
          </div>
        )}

        {rightCollapsed && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            gap: 8,
          }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setRightCollapsed(false); }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={tab.label}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
