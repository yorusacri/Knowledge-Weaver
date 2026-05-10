import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search, BookOpen, ChevronDown, ChevronRight, Zap,
  Database, Send, Loader2, FileText, BarChart3,
  AlertCircle, Sparkles, Wifi, WifiOff, Atom,
  Inbox, FileSearch,
} from 'lucide-react';
import { useStore } from '../store';
import { buildRAGIndex, queryRAG, getRAGStatus } from '../api';

// Book color map for citation accents
const BOOK_COLOR_MAP = {
  '生理学': '#f59e0b',
  '病理学': '#3b82f6',
  '免疫学': '#10b981',
  '药理学': '#8b5cf6',
  '解剖学': '#ec4899',
  '组织学': '#06b6d4',
  '生物化学': '#f97316',
};

function getBookColor(textbookName) {
  return BOOK_COLOR_MAP[textbookName] || 'var(--accent)';
}

// Skeleton loader block
function SkeletonBlock({ width = '100%', height = 16, style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 4,
        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-card-hover) 50%, var(--bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// Mode badge component
function ModeBadge({ isDemo }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.03em',
        background: isDemo ? 'var(--orange-dim)' : 'var(--green-dim)',
        color: isDemo ? 'var(--orange)' : 'var(--green)',
        border: `1px solid ${isDemo ? 'rgba(234, 88, 12, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`,
      }}
    >
      {isDemo ? <WifiOff size={10} /> : <Wifi size={10} />}
      {isDemo ? '演示模式' : '实时API'}
    </div>
  );
}

// Relevance score bar
function RelevanceBar({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? 'var(--green)' : pct >= 75 ? 'var(--accent)' : 'var(--text-muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 64 }}>
      <div style={{
        flex: 1,
        height: 4,
        background: 'var(--bg-tertiary)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color,
        fontWeight: 500,
        minWidth: 28,
      }}>
        {pct}%
      </span>
    </div>
  );
}

// Thinking dots animation
function ThinkingDots() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      background: 'var(--accent-glow)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-accent)',
    }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        正在检索知识库...
      </span>
    </div>
  );
}

// Citation card
function CitationCard({ citation, index, sourceChunk, expanded, onToggle }) {
  const bookColor = getBookColor(citation.textbook);
  return (
    <div
      className="animate-scale-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: '10px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          borderLeft: `3px solid ${bookColor}`,
          cursor: 'pointer',
          transition: 'var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = bookColor;
          e.currentTarget.style.background = 'var(--bg-card-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.borderLeftColor = bookColor;
          e.currentTarget.style.background = 'var(--bg-card)';
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <FileText size={13} style={{ color: bookColor, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 2,
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {citation.textbook}
              </span>
              <span style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {citation.chapter}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              第 {citation.page} 页
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <RelevanceBar score={citation.relevance_score} />
          </div>
          {expanded ? (
            <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          ) : (
            <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          )}
        </div>
      </div>
      {expanded && sourceChunk && (
        <div
          className="animate-fade-in"
          style={{
            margin: '6px 0 0 0',
            padding: '10px 14px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: `3px solid ${bookColor}`,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 6,
          }}>
            <Atom size={10} style={{ color: bookColor }} />
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              原始文本块
            </span>
          </div>
          <div style={{
            fontSize: 12,
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {sourceChunk}
          </div>
        </div>
      )}
    </div>
  );
}

// Suggested question chip
function SuggestedChip({ text, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        padding: '7px 10px',
        background: hover ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: `1px solid ${hover ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontSize: 12,
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        lineHeight: 1.5,
        transition: 'var(--transition-fast)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Sparkles size={11} style={{ color: 'var(--accent)', flexShrink: 0, opacity: hover ? 1 : 0.6 }} />
      {text}
    </button>
  );
}

export default function RAGTab() {
  const {
    ragStatus, setRagStatus,
    ragQuerying, setRagQuerying,
    ragResult, setRagResult,
    ragHistory, addRagHistory,
  } = useStore();

  const [userQuestion, setUserQuestion] = useState('');
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [expandedChunk, setExpandedChunk] = useState(null);
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const resultRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-scroll result area
  useEffect(() => {
    if (resultRef.current && ragResult) {
      resultRef.current.scrollTop = 0;
    }
  }, [ragResult]);

  const handleBuildIndex = async () => {
    setBuilding(true);
    setBuildProgress(0);
    setError(null);
    setIsDemoMode(false);
    setBuildProgress(20);

    try {
      await buildRAGIndex();
      setBuildProgress(70);
      const status = await getRAGStatus();
      setBuildProgress(100);
      setRagStatus(status);
    } catch (err) {
      setBuildProgress(100);
      setError('索引构建失败，请检查后端服务');
      console.error('RAG index build failed:', err);
    }
    setBuilding(false);
  };

  const handleQuery = async () => {
    if (!userQuestion.trim() || ragQuerying) return;
    const q = userQuestion.trim();
    setDisplayedQuestion(q);
    setUserQuestion('');
    setRagQuerying(true);
    setError(null);
    setIsDemoMode(false);
    setExpandedChunk(null);

    try {
      const result = await queryRAG(q);
      setRagResult(result);
      setRagQuerying(false);
      addRagHistory({ question: q, result, timestamp: new Date().toISOString() });
    } catch (err) {
      setRagQuerying(false);
      setRagResult(null);
      setError('请求失败，请检查后端服务或索引状态');
      console.error('RAG query failed:', err);
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  }, [userQuestion, ragQuerying]);

  const handleSuggestedClick = (q) => {
    setUserQuestion(q);
    if (inputRef.current) inputRef.current.focus();
  };

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
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Database size={14} style={{
            color: ragStatus?.indexed ? 'var(--green)' : 'var(--text-muted)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ragStatus?.indexed ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  已索引
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}> {ragStatus.textbookCount} </span>
                  本教材，共
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}> {ragStatus.chunkCount?.toLocaleString()} </span>
                  个知识块
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>未建立索引</span>
            )}
            {ragStatus?.indexed && <ModeBadge isDemo={isDemoMode} />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {building && (
            <div style={{
              width: 100,
              height: 4,
              background: 'var(--bg-tertiary)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${buildProgress}%`,
                height: '100%',
                background: 'var(--accent)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
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
              transition: 'var(--transition-fast)',
            }}
          >
            {building ? (
              <>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                构建中 {buildProgress}%
              </>
            ) : (
              <>
                <Zap size={12} />
                构建索引
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--red-dim)',
          borderBottom: '1px solid rgba(220, 38, 38, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--red)',
        }}>
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Result area */}
      <div ref={resultRef} style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {/* No textbooks uploaded state */}
        {(!ragStatus?.textbookCount || ragStatus.textbookCount === 0) && !ragQuerying && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              marginBottom: 14,
            }}>
              <FileSearch size={26} strokeWidth={1.2} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              还没有上传教材
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              请先在左侧上传并解析教材<br />然后构建索引后再进行问答
            </div>
          </div>
        )}

        {/* Empty state — has textbooks but no result yet */}
        {ragStatus?.textbookCount > 0 && !ragResult && !ragQuerying && (
          <div>
            <div style={{
              textAlign: 'center',
              padding: '28px 0 20px',
              color: 'var(--text-muted)',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--accent-glow)',
                marginBottom: 12,
              }}>
                <Search size={24} strokeWidth={1.2} style={{ color: 'var(--accent)', opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                基于教材知识库智能问答
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                输入问题，获取带引用的精准回答
              </div>
            </div>

            {/* Suggested questions */}
            <div style={{ marginTop: 4 }}>
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
                <Sparkles size={11} />
                示例问题
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {suggestedQuestions.map((q, i) => (
                  <SuggestedChip
                    key={i}
                    text={q}
                    onClick={() => handleSuggestedClick(q)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {ragQuerying && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 20,
            animation: 'fadeIn 0.2s ease',
          }}>
            {/* User question */}
            {displayedQuestion && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <Search size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{displayedQuestion}</span>
              </div>
            )}

            {/* Thinking indicator */}
            <ThinkingDots />

            {/* Skeleton answer */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
            }}>
              <SkeletonBlock width={60} height={10} style={{ marginBottom: 12 }} />
              <SkeletonBlock width="100%" height={12} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="95%" height={12} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="88%" height={12} />
            </div>

            {/* Skeleton citations */}
            <div>
              <SkeletonBlock width={80} height={10} style={{ marginBottom: 8 }} />
              {[1, 2].map((i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <SkeletonBlock width={60} height={12} />
                    <div style={{ flex: 1 }} />
                    <SkeletonBlock width={80} height={6} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {ragResult && !ragQuerying && (
          <div className="animate-fade-in">
            {/* User question */}
            {displayedQuestion && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 10,
                fontSize: 12,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <Search size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{displayedQuestion}</span>
              </div>
            )}

            {/* Answer with markdown */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              marginBottom: 12,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--accent-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={11} style={{ color: 'var(--accent)' }} />
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  回答
                </span>
                {isDemoMode && <ModeBadge isDemo={true} />}
              </div>
              <div className="md-content" style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
              }}>
                <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
              </div>
            </div>

            {/* Citations */}
            {ragResult.citations?.length > 0 && (
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
                  引用来源 ({ragResult.citations.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {ragResult.citations.map((cite, i) => (
                    <CitationCard
                      key={i}
                      citation={cite}
                      index={i}
                      sourceChunk={ragResult.source_chunks?.[i]}
                      expanded={expandedChunk === i}
                      onToggle={() => setExpandedChunk(expandedChunk === i ? null : i)}
                    />
                  ))}
                </div>
              </div>
            )}

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
                  查询历史 ({ragHistory.length - 1})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ragHistory.slice(0, -1).reverse().map((entry, i) => (
                    <div
                      key={i}
                      onClick={() => setRagResult(entry.result)}
                      className="animate-fade-in"
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        transition: 'var(--transition-fast)',
                        animationDelay: `${i * 40}ms`,
                        animationFillMode: 'both',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
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
                      <Search size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.question}
                      </span>
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
          <textarea
            ref={inputRef}
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入基于教材的问题... (Shift+Enter 换行)"
            rows={1}
            style={{
              flex: 1,
              padding: '9px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              lineHeight: 1.5,
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              transition: 'var(--transition-fast)',
              minHeight: 38,
              maxHeight: 120,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--border-accent)';
              e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleQuery}
            disabled={!userQuestion.trim() || ragQuerying}
            style={{
              padding: '9px 12px',
              background: userQuestion.trim() && !ragQuerying ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: userQuestion.trim() && !ragQuerying ? 'var(--text-inverse)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: userQuestion.trim() && !ragQuerying ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-fast)',
              flexShrink: 0,
              minWidth: 38,
            }}
            onMouseEnter={(e) => {
              if (userQuestion.trim() && !ragQuerying) {
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {ragQuerying ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <div style={{
          marginTop: 6,
          fontSize: 10,
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>Enter 发送 · Shift+Enter 换行</span>
          {userQuestion.trim() && <span style={{ color: 'var(--accent)' }}>按 Enter 发送问题</span>}
        </div>
      </div>

      {/* Global styles for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}