import { useState } from 'react';
import {
  GitMerge, ShieldCheck, Trash2, Play, ChevronDown, ChevronUp,
  BarChart3, ArrowRight, Zap, PieChart,
} from 'lucide-react';
import { ACTION_CONFIG, formatNumber, formatPercent } from '../utils/helpers';
import { useStore } from '../store';
import { runIntegration, getIntegrations, getIntegrationStats } from '../api';

const DEMO_INTEGRATIONS = useStore.getState().integrations;
const DEMO_STATS = useStore.getState().integrationStats;

const actionIcons = {
  merge: GitMerge,
  keep: ShieldCheck,
  remove: Trash2,
};

export default function IntegrationTab() {
  const {
    integrations, setIntegrations,
    integrationRunning, setIntegrationRunning,
    integrationStats, setIntegrationStats,
  } = useStore();

  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | merge | keep | remove

  const handleRun = async () => {
    setIntegrationRunning(true);
    try {
      const result = await runIntegration();
      setIntegrations(result.decisions || result);
      const stats = await getIntegrationStats();
      setIntegrationStats(stats);
    } catch {
      // Demo mode — keep existing data
    }
    setIntegrationRunning(false);
  };

  const filtered = integrations.filter((d) =>
    filter === 'all' || d.action === filter
  );

  const mergeCount = integrations.filter((d) => d.action === 'merge').length;
  const keepCount = integrations.filter((d) => d.action === 'keep').length;
  const removeCount = integrations.filter((d) => d.action === 'remove').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Action bar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={handleRun}
          disabled={integrationRunning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            background: integrationRunning ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: integrationRunning ? 'var(--text-muted)' : 'var(--text-inverse)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: integrationRunning ? 'wait' : 'pointer',
            fontSize: 12,
            fontWeight: 600,
            transition: 'var(--transition-normal)',
          }}
        >
          {integrationRunning ? (
            <Zap size={13} className="animate-pulse" />
          ) : (
            <Play size={13} />
          )}
          {integrationRunning ? '整合中...' : '执行整合'}
        </button>
      </div>

      {/* Stats bar */}
      {integrationStats && (
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}>
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>压缩比</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              {integrationStats.compressionRatio}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {formatNumber(integrationStats.originalChars)} → {formatNumber(integrationStats.integratedChars)} 字
            </div>
          </div>
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>节点变化</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>
              {integrationStats.nodesBefore} → {integrationStats.nodesAfter}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              减少 {Math.round((1 - integrationStats.nodesAfter / integrationStats.nodesBefore) * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 4,
      }}>
        {[
          { key: 'all', label: '全部', count: integrations.length },
          { key: 'merge', label: '合并', count: mergeCount, color: 'var(--blue)' },
          { key: 'keep', label: '保留', count: keepCount, color: 'var(--green)' },
          { key: 'remove', label: '删除', count: removeCount, color: 'var(--red)' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: 'none',
              background: filter === f.key
                ? (f.color || 'var(--accent)') + '18'
                : 'var(--bg-tertiary)',
              color: filter === f.key
                ? (f.color || 'var(--accent)')
                : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
              transition: 'var(--transition-fast)',
            }}
          >
            {f.label} {f.count}
          </button>
        ))}
      </div>

      {/* Decision list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}>
            <BarChart3 size={28} strokeWidth={1} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>暂无整合决策</div>
            <div style={{ marginTop: 4 }}>点击"执行整合"开始处理</div>
          </div>
        )}

        {filtered.map((decision, idx) => {
          const config = ACTION_CONFIG[decision.action] || {};
          const Icon = actionIcons[decision.action] || GitMerge;
          const isExpanded = expandedId === decision.decision_id;

          return (
            <div
              key={decision.decision_id}
              className="animate-fade-in"
              style={{
                margin: '0 12px 6px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                overflow: 'hidden',
                animationDelay: `${idx * 50}ms`,
                opacity: 0,
              }}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : decision.decision_id)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  background: `${config.color || '#6b7280'}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={14} style={{ color: config.color || '#6b7280' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: `${config.color || '#6b7280'}18`,
                      color: config.color || '#6b7280',
                      fontWeight: 500,
                    }}>
                      {config.label}
                    </span>
                    {decision.confidence != null && (
                      <span style={{
                        fontSize: 10,
                        color: decision.confidence > 0.9 ? 'var(--green)' : 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {Math.round(decision.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}>
                    {decision.affected_nodes?.slice(0, 2).join('、')}
                    {decision.affected_nodes?.length > 2 && ` 等 ${decision.affected_nodes.length} 项`}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{
                  padding: '0 12px 12px',
                  borderTop: '1px solid var(--border)',
                  marginTop: 0,
                }}>
                  <div style={{ paddingTop: 10, fontSize: 12, lineHeight: 1.7 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>影响知识点：</span>
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {decision.affected_nodes?.map((node, i) => (
                          <span key={i} style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                          }}>
                            {node}
                          </span>
                        ))}
                      </div>
                    </div>
                    {decision.result_node && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>结果节点：</span>
                        <span style={{ color: 'var(--accent)', marginLeft: 4 }}>
                          {decision.result_node}
                        </span>
                      </div>
                    )}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>决策理由：</span>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                        {decision.reason}
                      </p>
                    </div>
                    {decision.textbook_sources && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {decision.textbook_sources.map((src, i) => (
                          <span key={i} style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: 'var(--accent-glow)',
                            color: 'var(--accent)',
                          }}>
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
