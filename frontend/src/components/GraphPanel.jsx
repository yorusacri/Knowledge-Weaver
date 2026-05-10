import { useRef, useEffect, useState } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import {
  Search, ZoomIn, ZoomOut, Maximize2, Network, GitBranch, Circle,
  Eye, EyeOff, Info, ChevronDown,
} from 'lucide-react';
import { RELATION_STYLES } from '../utils/helpers';

try { cytoscape.use(coseBilkent); } catch {}

const LAYOUT_OPTIONS = {
  force: {
    name: 'cose-bilkent',
    animate: 'end',
    animationDuration: 1000,
    nodeDimensionsIncludeLabels: true,
    fit: true,
    padding: 50,
    randomize: true,
    nodeRepulsion: 9000,
    idealEdgeLength: 220,
    edgeElasticity: 0.05,
    nestingFactor: 0.08,
    gravity: 0.15,
    numIter: 3000,
    tile: true,
  },
  hierarchical: {
    name: 'breadthfirst',
    animate: true,
    animationDuration: 600,
    directed: true,
    fit: true,
    padding: 50,
    spacingFactor: 1.3,
    avoidOverlap: true,
  },
  circular: {
    name: 'circle',
    animate: true,
    animationDuration: 600,
    fit: true,
    padding: 50,
    avoidOverlap: true,
    spacingFactor: 1.15,
  },
};

const NODE_BASE_SIZE = 46;

function buildStyle(showLabels) {
  return [
    // ── NODE default ──
    {
      selector: 'node',
      style: {
        'shape': 'ellipse',
        'width': 'data(size)',
        'height': 'data(size)',
        'background-color': 'data(color)',
        'background-opacity': 0.9,
        'border-width': 2.5,
        'border-color': 'data(borderColor)',
        'border-opacity': 0.5,
        'overlay-padding': 6,
        'overlay-opacity': 0,
        'overlay-color': 'data(color)',
        'label': showLabels ? 'data(label)' : '',
        'font-size': 14,
        'font-weight': 600,
        'font-family': 'DM Sans, sans-serif',
        'color': '#1a1a2e',
        'text-outline-color': '#ffffff',
        'text-outline-width': 3,
        'text-outline-opacity': 0.85,
        'text-margin-y': 12,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-wrap': 'ellipsis',
        'text-max-width': 130,
        'transition-property': 'background-color, background-opacity, border-color, border-width, width, height, opacity, overlay-opacity',
        'transition-duration': '0.25s',
        'transition-timing-function': 'ease-out',
      },
    },
    // ── NODE selected ──
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#b45309',
        'border-opacity': 1,
        'background-opacity': 1,
        'overlay-padding': 12,
        'overlay-opacity': 0.1,
        'overlay-color': '#d97706',
        'font-size': 15,
        'font-weight': 700,
        'text-outline-width': 3.5,
      },
    },
    // ── NODE highlighted ──
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#b45309',
        'border-opacity': 1,
        'background-opacity': 1,
        'overlay-padding': 12,
        'overlay-opacity': 0.12,
        'overlay-color': '#d97706',
        'font-weight': 700,
      },
    },
    // ── NODE dimmed ──
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.08,
        'text-opacity': 0,
      },
    },
    // ── NODE faded ──
    {
      selector: 'node.faded',
      style: {
        'opacity': 0.06,
        'text-opacity': 0,
      },
    },
    // ── NODE active ──
    {
      selector: 'node:active',
      style: {
        'overlay-padding': 8,
        'overlay-opacity': 0.08,
      },
    },

    // ── EDGE default ──
    {
      selector: 'edge',
      style: {
        'curve-style': 'unbundled-bezier',
        'width': 1.8,
        'line-color': 'data(edgeColor)',
        'line-opacity': 0.25,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': 'data(edgeColor)',
        'arrow-scale': 0.9,
        'label': '',
        'font-size': 11,
        'font-family': 'DM Sans, sans-serif',
        'font-weight': 500,
        'color': '#3a3a52',
        'text-outline-color': '#ffffff',
        'text-outline-width': 2.5,
        'text-outline-opacity': 0.9,
        'text-rotation': 'autorotate',
        'text-margin-y': -12,
        'text-opacity': 0,
        'transition-property': 'line-color, line-opacity, width, opacity, text-opacity',
        'transition-duration': '0.25s',
        'transition-timing-function': 'ease-out',
      },
    },

    // ── EDGE by relation type ──
    {
      selector: 'edge[relationType="prerequisite"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [10, 5],
        'width': 2,
        'line-opacity': 0.35,
      },
    },
    {
      selector: 'edge[relationType="parallel"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [5, 5],
        'width': 1.5,
        'line-opacity': 0.22,
      },
    },
    {
      selector: 'edge[relationType="contains"]',
      style: {
        'width': 2.5,
        'line-opacity': 0.35,
      },
    },
    {
      selector: 'edge[relationType="applies_to"]',
      style: {
        'width': 1.8,
        'line-opacity': 0.25,
        'line-style': 'dashed',
        'line-dash-pattern': [3, 3],
      },
    },

    // ── EDGE highlighted ──
    {
      selector: 'edge.highlighted',
      style: {
        'width': 3.5,
        'line-opacity': 0.8,
        'target-arrow-color': 'data(edgeColor)',
        'arrow-scale': 1.1,
        'label': 'data(relationLabel)',
        'text-opacity': 1,
        'font-size': 12,
        'text-outline-width': 3,
        'z-index': 10,
      },
    },

    // ── EDGE faded ──
    {
      selector: 'edge.faded',
      style: {
        'opacity': 0.02,
        'text-opacity': 0,
      },
    },
  ];
}

// Glass panel style for light theme
const panelGlass = {
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(16px) saturate(1.2)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06), 0 0 0 0.5px rgba(0,0,0,0.03)',
};

const panelBtnStyle = {
  ...panelGlass,
  borderRadius: 'var(--radius-sm)',
  padding: '7px 11px',
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.15s, box-shadow 0.15s',
};

export default function GraphPanel({
  graphData,
  selectedNode,
  onSelectNode,
  layout: layoutProp,
  searchQuery,
  showLabels,
  onToggleLabels,
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [layoutName, setLayoutName] = useState(layoutProp || 'force');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: buildStyle(showLabels),
      layout: LAYOUT_OPTIONS[layoutName] || LAYOUT_OPTIONS.force,
      minZoom: 0.15,
      maxZoom: 4,
      wheelSensitivity: 1.0,
      boxSelectionEnabled: false,
      autoungrabify: false,
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data();
      const fullNode = graphData?.nodes?.find((n) => n.id === nodeData.id);
      if (fullNode) onSelectNode(fullNode);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelectNode(null);
    });

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass('faded');
      neighborhood.removeClass('faded');
      node.connectedEdges().removeClass('faded').addClass('highlighted');
      neighborhood.nodes().forEach((n) => n.style('text-opacity', 1));
    });

    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('faded highlighted');
      cy.nodes().forEach((n) => n.removeStyle('text-opacity'));
    });

    cy.on('mouseover', 'edge', (evt) => evt.target.addClass('highlighted'));
    cy.on('mouseout', 'edge', (evt) => evt.target.removeClass('highlighted'));

    return () => { cy.destroy(); cyRef.current = null; };
  }, [graphData, layoutName]);

  // Update graph data
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !graphData) return;
    cy.elements().remove();

    const lighten = (hex, amt) => {
      try {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
        const num = parseInt(c, 16);
        let r = Math.min(255, (num >> 16) + amt);
        let g = Math.min(255, ((num >> 8) & 0xFF) + amt);
        let b = Math.min(255, (num & 0xFF) + amt);
        return `rgb(${r},${g},${b})`;
      } catch { return hex; }
    };

    const nodes = graphData.nodes.map((n) => {
      const baseColor = n.textbook_color || '#6b7280';
      return {
        group: 'nodes',
        data: {
          id: n.id,
          label: n.name,
          color: baseColor,
          borderColor: lighten(baseColor, 60),
          size: NODE_BASE_SIZE + Math.sqrt(n.frequency || 1) * 18,
          ...n,
        },
      };
    });

    const nodeIds = new Set(graphData.nodes.map((n) => n.id));
    const edges = graphData.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        group: 'edges',
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          edgeColor: e.relation_color || RELATION_STYLES[e.relation_type]?.color || '#999',
          relationType: e.relation_type,
          relationLabel: e.description || RELATION_STYLES[e.relation_type]?.label || '',
          ...e,
        },
      }));

    cy.add([...nodes, ...edges]);
    cy.layout(LAYOUT_OPTIONS[layoutName] || LAYOUT_OPTIONS.force).run();
  }, [graphData, layoutName]);

  // Labels toggle
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style().selector('node').style('label', showLabels ? 'data(label)' : '').update();
  }, [showLabels]);

  // Search
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('highlighted dimmed');
    if (searchQuery?.trim()) {
      const q = searchQuery.toLowerCase();
      const matched = cy.nodes().filter((node) => {
        const d = node.data();
        return (d.label||'').toLowerCase().includes(q)
          || (d.definition||'').toLowerCase().includes(q)
          || (d.textbook||'').toLowerCase().includes(q)
          || (d.category||'').toLowerCase().includes(q);
      });
      if (matched.length > 0) {
        cy.elements().addClass('dimmed');
        matched.removeClass('dimmed').addClass('highlighted');
        matched.connectedEdges().removeClass('dimmed').addClass('highlighted');
        matched.closedNeighborhood().removeClass('dimmed');
        cy.animate({ fit: { eles: matched.closedNeighborhood(), padding: 80 }, duration: 500 });
      }
    }
  }, [searchQuery]);

  // Select
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().unselect();
    if (selectedNode) {
      const el = cy.getElementById(selectedNode.id);
      if (el.length) {
        el.select();
        cy.animate({ center: { eles: el }, zoom: 1.8, duration: 500 });
      }
    }
  }, [selectedNode]);

  const zoomTo = (factor) => {
    const cy = cyRef.current, c = containerRef.current;
    if (!cy || !c) return;
    cy.animate({ zoom: { level: cy.zoom() * factor, renderedPosition: { x: c.clientWidth/2, y: c.clientHeight/2 } }, duration: 200 });
  };
  const handleFit = () => cyRef.current?.animate({ fit: { padding: 50 }, duration: 500 });

  const nodeCount = graphData?.nodes?.length || 0;
  const edgeCount = graphData?.edges?.length || 0;
  const layoutIcons = { force: Network, hierarchical: GitBranch, circular: Circle };
  const LayoutIcon = layoutIcons[layoutName] || Network;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Graph canvas — light background */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: [
            'radial-gradient(ellipse 70% 55% at 50% 40%, #f5f3ee 0%, transparent 100%)',
            'radial-gradient(circle at 15% 25%, rgba(217, 119, 6, 0.03) 0%, transparent 50%)',
            'radial-gradient(circle at 85% 75%, rgba(37, 99, 235, 0.02) 0%, transparent 50%)',
            'linear-gradient(180deg, #eceae3 0%, #e8e6df 50%, #eceae3 100%)',
          ].join(', '),
        }}
      >
        {/* Grid dots */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Stats bar ── */}
      <div style={{ position: 'absolute', top: 14, left: 14, animation: 'fadeIn 0.5s ease' }}>
        <div style={{ ...panelGlass, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <span><span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{nodeCount}</span> 节点</span>
          <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <span><span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{edgeCount}</span> 关系</span>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.5s ease' }}>
        {/* Layout */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLayoutMenu(!showLayoutMenu)} style={{ ...panelBtnStyle, gap: 5 }}>
            <LayoutIcon size={13} />
            {layoutName === 'force' ? '力导向' : layoutName === 'hierarchical' ? '层次' : '环形'}
            <ChevronDown size={11} />
          </button>
          {showLayoutMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, ...panelGlass, padding: 4, minWidth: 125, zIndex: 20 }}>
              {[
                { key: 'force', label: '力导向图', icon: Network },
                { key: 'hierarchical', label: '层次树状', icon: GitBranch },
                { key: 'circular', label: '环形布局', icon: Circle },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setLayoutName(opt.key); setShowLayoutMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    padding: '7px 9px', border: 'none',
                    background: layoutName === opt.key ? 'var(--accent-glow)' : 'transparent',
                    color: layoutName === opt.key ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', borderRadius: 4, fontSize: 12,
                  }}
                >
                  <opt.icon size={13} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Labels toggle */}
        <button
          onClick={onToggleLabels}
          style={{ ...panelBtnStyle, padding: '7px 9px', color: showLabels ? 'var(--accent)' : 'var(--text-muted)' }}
          title={showLabels ? '隐藏标签' : '显示标签'}
        >
          {showLabels ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        {/* Zoom */}
        <div style={{ ...panelGlass, display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {[
            { icon: ZoomIn, action: () => zoomTo(1.4), title: '放大' },
            { icon: ZoomOut, action: () => zoomTo(1/1.4), title: '缩小' },
            { icon: Maximize2, action: handleFit, title: '适应画布' },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              title={btn.title}
              style={{
                background: 'transparent', border: 'none',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                padding: '7px 9px', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <btn.icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ position: 'absolute', bottom: 14, left: 14, animation: 'fadeIn 0.6s ease' }}>
        <button
          onClick={() => setLegendOpen(!legendOpen)}
          style={{ ...panelBtnStyle, padding: '5px 11px', fontSize: 11, gap: 5, marginBottom: legendOpen ? 6 : 0 }}
        >
          <Info size={12} />
          图例
        </button>
        {legendOpen && (
          <div style={{ ...panelGlass, padding: '11px 14px', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>关系类型</div>
            {Object.entries(RELATION_STYLES).map(([key, style]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 24, height: 0,
                  borderTop: key === 'prerequisite'
                    ? `2.5px dashed ${style.color}`
                    : key === 'parallel' || key === 'applies_to'
                      ? `2px dashed ${style.color}`
                      : `2.5px solid ${style.color}`,
                  borderRadius: 1,
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>{style.label}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '5px 0' }} />
            <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>节点大小</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: '1.5px solid rgba(0,0,0,0.1)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>单教材</span>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: '1.5px solid rgba(0,0,0,0.1)', marginLeft: 4 }} />
              <span style={{ color: 'var(--text-secondary)' }}>多教材频次</span>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!graphData?.nodes?.length && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Network size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.2 }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>暂无知识图谱数据</div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>上传教材并完成解析后即可生成图谱</div>
        </div>
      )}
    </div>
  );
}
