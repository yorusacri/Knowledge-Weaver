import { useState, useRef, useEffect } from 'react';
import {
  Search, BookOpen, ChevronDown, ChevronRight, Zap,
  Database, Send, Loader2, FileText, BarChart3,
} from 'lucide-react';
import { useStore } from '../store';
import { buildRAGIndex, queryRAG, getRAGStatus } from '../api';
import { generateMockRAGResult } from '../utils/mockData';

export default function RAGTab() {
  const {
    ragStatus, setRagStatus,
    ragQuerying, setRagQuerying,
    ragResult, setRagResult,
    ragHistory, addRagHistory,
  } = useStore();

  const [question, setQuestion] = useState('');
  const [expandedChunk, setExpandedChunk] = useState(null);
  const [building, setBuilding] = useState(false);
  const resultRef = useRef(null);

  const handleBuildIndex = async () => {
    setBuilding(true);
    try {
      await buildRAGIndex();
      const status = await getRAGStatus();
      setRagStatus(status);
    } catch {
      // Demo mode
      setRagStatus({ indexed: true, textbookCount: 7, chunkCount: 2847 });
    }
    setBuilding(false);
  };

  const handleQuery = async () => {
    if (!question.trim() || ragQuerying) return;
    const q = question.trim();
    setQuestion('');
    setRagQuerying(true);

    try {
      const result = await queryRAG(q);
      setRagResult(result);
      addRagHistory({ question: q, result, timestamp: new Date().toISOString() });
    } catch {
      // Demo mode
      const result = generateMockRAGResult();
      setRagResult(result);
      addRagHistory({ question: q, result, timestamp: new Date().toISOString() });
    }
    setRagQuerying(false);
  };

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [ragResult]);

  const suggestedQuestions = [
    '什么是炎症反应？其基本病理变化有哪些？',
    '动作电位和静息电位有什么关系？',
    '免疫系统如何识别和清除病原体？',
    '比较细胞凋亡和细胞坏死的区别',
    '受体的分类及其信号转导机制',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Index status bar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={14} style={{ color: ragStatus?.indexed ? 'var(--green)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {ragStatus?.indexed ? (
              <>
                已索引 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{ragStatus.textbookCount}</span> 本教材，
                共 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{ragStatus.chunkCount?.toLocaleString()}</span> 个知识块
              </>
            ) : (
              '未建立索引'
            )}
          </span>
        </div>
        <button
          onClick={handleBuildIndex}
          disabled={building}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            background: building ? 'var(--bg-tertiary)' : 'var(--accent-glow)',
            color: building ? 'var(--text-muted)' : 'var(--accent)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-sm)',
            cursor: building ? 'wait' : 'pointer',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {building ? <Loader2 size={12} className="animate-pulse" /> : <Zap size={12} />}
          {building ? '构建中...' : '构建索引'}
        </button>
      </div>

      {/* Result area */}
      <div ref={resultRef} style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {!ragResult && !ragQuerying && (
          <div>
            <div style={{
              textAlign: 'center',
              padding: '24px 0 16px',
              color: 'var(--text-muted)',
            }}>
              <Search size={32} strokeWidth={1} style={{ marginBottom: 8, opacity: 0.3 }} />
              <div style={{ fontSize: 13 }}>输入问题，基于教材知识库精准回答</div>
            </div>

            {/* Suggested questions */}
            <div style={{ marginTop: 8 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8,
              }}>
                示例问题
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-accent)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {ragQuerying && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: 40,
            color: 'var(--text-muted)',
          }}>
            <Loader2 size={28} className="animate-pulse" style={{ color: 'var(--accent)' }} />
            <div style={{ fontSize: 13 }}>正在检索知识库并生成回答...</div>
          </div>
        )}

        {ragResult && (
          <div className="animate-fade-in">
            {/* Answer */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8,
              }}>
                回答
              </div>
              <div style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
              }}>
                {ragResult.answer}
              </div>
            </div>

            {/* Citations */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <BookOpen size={12} />
                引用来源 ({ragResult.citations?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ragResult.citations?.map((cite, i) => (
                  <div key={i}>
                    <div
                      onClick={() => setExpandedChunk(expandedChunk === i ? null : i)}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      <FileText size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {cite.textbook}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                          {cite.chapter} · 第 {cite.page} 页
                        </span>
                      </div>
                      <div style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: cite.relevance_score > 0.9 ? 'var(--green-dim)' : 'var(--accent-glow)',
                        color: cite.relevance_score > 0.9 ? 'var(--green)' : 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 500,
                      }}>
                        {Math.round(cite.relevance_score * 100)}%
                      </div>
                      {expandedChunk === i ? <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                    {expandedChunk === i && ragResult.source_chunks?.[i] && (
                      <div style={{
                        margin: '4px 0 0',
                        padding: '10px 12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 12,
                        lineHeight: 1.7,
                        color: 'var(--text-muted)',
                        borderLeft: '2px solid var(--accent)',
                      }}>
                        {ragResult.source_chunks[i]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            {ragHistory.length > 1 && (
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <BarChart3 size={12} />
                  查询历史
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ragHistory.slice(0, -1).reverse().map((entry, i) => (
                    <div
                      key={i}
                      onClick={() => setRagResult(entry.result)}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {entry.question}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="输入基于教材的问题..."
            style={{
              flex: 1,
              padding: '9px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              transition: 'var(--transition-fast)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--border-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={handleQuery}
            disabled={!question.trim() || ragQuerying}
            style={{
              padding: '9px 12px',
              background: question.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: question.trim() ? 'var(--text-inverse)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: question.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              transition: 'var(--transition-fast)',
            }}
          >
            {ragQuerying ? <Loader2 size={16} className="animate-pulse" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
