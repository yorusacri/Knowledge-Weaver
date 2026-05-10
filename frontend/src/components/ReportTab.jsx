import { useState } from 'react';
import {
  FileText, Download, Copy, Check, BookOpen, BarChart3,
  Network, AlertTriangle, TrendingDown,
} from 'lucide-react';
import { useStore } from '../store';
import { generateMockReport } from '../utils/mockData';
import { formatNumber } from '../utils/helpers';
import ReactMarkdown from 'react-markdown';

export default function ReportTab() {
  const { integrationStats, textbooks } = useStore();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('structured'); // 'structured' | 'markdown'

  const stats = integrationStats || {
    originalChars: 5820000,
    integratedChars: 1650000,
    compressionRatio: 28.4,
    mergeCount: 342,
    keepCount: 267,
    removeCount: 96,
    totalDecisions: 705,
    nodesBefore: 2847,
    nodesAfter: 1203,
    edgesBefore: 4562,
    edgesAfter: 2891,
  };

  const reportMd = generateMockReport();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([reportMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '整合报告.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      label: '教材数量',
      value: `${textbooks?.length || 7} 本`,
      sub: '原始教材',
      icon: BookOpen,
      color: 'var(--blue)',
    },
    {
      label: '压缩比',
      value: `${stats.compressionRatio}%`,
      sub: `${formatNumber(stats.originalChars)} → ${formatNumber(stats.integratedChars)} 字`,
      icon: TrendingDown,
      color: 'var(--green)',
    },
    {
      label: '整合决策',
      value: `${stats.totalDecisions} 项`,
      sub: `合并${stats.mergeCount} · 保留${stats.keepCount} · 删除${stats.removeCount}`,
      icon: BarChart3,
      color: 'var(--accent)',
    },
    {
      label: '节点变化',
      value: `${stats.nodesBefore} → ${stats.nodesAfter}`,
      sub: `减少 ${Math.round((1 - stats.nodesAfter / stats.nodesBefore) * 100)}%`,
      icon: Network,
      color: 'var(--purple)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>整合报告</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setViewMode(viewMode === 'structured' ? 'markdown' : 'structured')}
            style={{
              padding: '3px 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {viewMode === 'structured' ? '查看 Markdown' : '结构化视图'}
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: '3px 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: copied ? 'var(--green-dim)' : 'transparent',
              color: copied ? 'var(--green)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '3px 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Download size={11} />
            导出
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {viewMode === 'structured' ? (
          <div>
            {/* Stat cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 16,
            }}>
              {statCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className="animate-fade-in"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      animationDelay: `${i * 80}ms`,
                      opacity: 0,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8,
                    }}>
                      <Icon size={14} style={{ color: card.color }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {card.label}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: card.color,
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1,
                    }}>
                      {card.value}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      marginTop: 4,
                    }}>
                      {card.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compression gauge */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: 12,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                  压缩进度
                </span>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: stats.compressionRatio <= 30 ? 'var(--green)' : 'var(--red)',
                  fontWeight: 600,
                }}>
                  {stats.compressionRatio}% / 30% 目标
                </span>
              </div>
              <div style={{
                height: 8,
                background: 'var(--bg-tertiary)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  left: '30%',
                  top: 0,
                  width: 1,
                  height: '100%',
                  background: 'var(--red)',
                  opacity: 0.4,
                  zIndex: 1,
                }} />
                <div style={{
                  width: `${Math.min(100, (stats.compressionRatio / 30) * 100)}%`,
                  height: '100%',
                  background: stats.compressionRatio <= 30
                    ? 'linear-gradient(90deg, var(--green), var(--green) 80%, var(--accent))'
                    : 'var(--red)',
                  borderRadius: 4,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              {stats.compressionRatio <= 30 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 6,
                  fontSize: 11,
                  color: 'var(--green)',
                }}>
                  <Check size={12} />
                  压缩比达标（≤30%）
                </div>
              )}
            </div>

            {/* Key findings */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}>
                重点整合案例
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: '动作电位', action: '合并', sources: '生理学 + 病理学 + 免疫学', compression: '69.4%', confidence: '95%' },
                  { name: '炎症反应', action: '合并', sources: '病理学 + 免疫学', compression: '60.4%', confidence: '91%' },
                  { name: '抗体/免疫球蛋白', action: '合并', sources: '免疫学 + 生物化学', compression: '55.2%', confidence: '93%' },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--blue)',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.sources} · 压缩 {item.compression}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: 'var(--accent-glow)',
                      color: 'var(--accent)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {item.confidence}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completeness notice */}
            <div style={{
              background: 'var(--accent-glow)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              display: 'flex',
              gap: 8,
            }}>
              <AlertTriangle size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--accent)' }}>教学完整性说明：</strong>
                整合后每条 prerequisite 关系链均通过完整性验证，核心知识点覆盖率 ≥ 95%。
                已识别 2 处知识缺口（药理学分子式简化、解剖学图片引用丢失），
                通过 RAG 向量索引保留原文溯源能力。
              </div>
            </div>
          </div>
        ) : (
          <div className="md-content" style={{ fontSize: 13 }}>
            <ReactMarkdown>{reportMd}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
