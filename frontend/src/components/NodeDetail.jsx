import { X, MapPin, BookOpen, Layers, Link2, ArrowRight } from 'lucide-react';
import { RELATION_STYLES, CATEGORY_ICONS } from '../utils/helpers';

export default function NodeDetail({ node, allNodes, allEdges, onClose }) {
  if (!node) return null;

  // Find connected edges
  const connectedEdges = (allEdges || []).filter(
    (e) => e.source === node.id || e.target === node.id
  );

  // Find connected nodes
  const connectedNodeIds = new Set();
  connectedEdges.forEach((e) => {
    if (e.source === node.id) connectedNodeIds.add(e.target);
    if (e.target === node.id) connectedNodeIds.add(e.source);
  });
  const connectedNodes = (allNodes || []).filter((n) => connectedNodeIds.has(n.id));

  const catIcon = CATEGORY_ICONS[node.category] || '◆';

  return (
    <div
      className="animate-slide-right"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 340,
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: `${node.textbook_color || 'var(--accent)'}20`,
          border: `1px solid ${node.textbook_color || 'var(--accent)'}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}>
          {catIcon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 16,
            fontFamily: 'var(--font-display)',
            margin: 0,
            color: 'var(--text-primary)',
          }}>
            {node.name}
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
          }}>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: `${node.textbook_color || '#6b7280'}18`,
              color: node.textbook_color || '#6b7280',
              fontWeight: 500,
            }}>
              {node.category}
            </span>
            {node.frequency > 1 && (
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                fontWeight: 500,
              }}>
                出现 {node.frequency} 次
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
            cursor: 'pointer',
            padding: 6,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Definition */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6,
          }}>
            定义
          </div>
          <p style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            {node.definition}
          </p>
        </div>

        {/* Source info */}
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {node.textbook}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {node.chapter}
              </span>
            </div>
            {node.page && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  第 {node.page} 页
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connected nodes */}
        {connectedNodes.length > 0 && (
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
              <Link2 size={12} />
              关联知识点 ({connectedNodes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {connectedEdges.map((edge) => {
                const isSource = edge.source === node.id;
                const otherNode = connectedNodes.find(
                  (n) => n.id === (isSource ? edge.target : edge.source)
                );
                if (!otherNode) return null;
                const rStyle = RELATION_STYLES[edge.relation_type] || {};

                return (
                  <div
                    key={edge.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 3,
                    }}>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: `${rStyle.color || '#6b7280'}18`,
                        color: rStyle.color || '#6b7280',
                        fontWeight: 500,
                      }}>
                        {rStyle.label || edge.relation_type}
                      </span>
                      <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                      <span style={{
                        fontSize: 12,
                        color: otherNode.textbook_color || 'var(--text-primary)',
                        fontWeight: 500,
                      }}>
                        {otherNode.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {edge.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
