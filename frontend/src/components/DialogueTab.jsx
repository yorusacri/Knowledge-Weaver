import { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Bot, User, Trash2, MessageCircle,
} from 'lucide-react';
import { useStore } from '../store';
import { sendMessage, getDialogHistory, clearDialogHistory } from '../api';

export default function DialogueTab() {
  const {
    messages, setMessages, addMessage,
    messageSending, setMessageSending,
  } = useStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || messageSending) return;
    const content = input.trim();
    setInput('');

    // Add user message immediately
    const userMsg = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setMessageSending(true);

    try {
      const response = await sendMessage(content);
      addMessage({
        role: 'assistant',
        content: response.content || response.message || response,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Demo: simulate response
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1500));
      addMessage({
        role: 'assistant',
        content: generateDemoResponse(content),
        timestamp: new Date().toISOString(),
      });
    }
    setMessageSending(false);
  };

  const handleClear = async () => {
    try {
      await clearDialogHistory();
    } catch {}
    setMessages([{
      role: 'assistant',
      content: '对话已清空。您可以继续询问关于知识整合的问题。',
      timestamp: new Date().toISOString(),
    }]);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

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
          <MessageCircle size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            教师对话 · 支持多轮交互
          </span>
        </div>
        <button
          onClick={handleClear}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title="清空对话"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              display: 'flex',
              gap: 10,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: msg.role === 'user'
                ? 'var(--blue-dim)'
                : 'var(--accent-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {msg.role === 'user'
                ? <User size={14} style={{ color: 'var(--blue)' }} />
                : <Bot size={14} style={{ color: 'var(--accent)' }} />
              }
            </div>

            {/* Message bubble */}
            <div style={{
              maxWidth: '85%',
              padding: '10px 12px',
              borderRadius: msg.role === 'user'
                ? '12px 12px 4px 12px'
                : '12px 12px 12px 4px',
              background: msg.role === 'user'
                ? 'var(--blue-dim)'
                : 'var(--bg-card)',
              border: '1px solid',
              borderColor: msg.role === 'user'
                ? 'rgba(59, 130, 246, 0.15)'
                : 'var(--border)',
            }}>
              <div style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                marginTop: 4,
                textAlign: msg.role === 'user' ? 'left' : 'right',
              }}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {messageSending && (
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--accent-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bot size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px 12px 12px 4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex',
              gap: 4,
            }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    opacity: 0.3,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{
        padding: '6px 16px 0',
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
      }}>
        {[
          '展示整合决策列表',
          '解释合并"炎症"的原因',
          '保留"免疫应答"',
          '查看压缩比统计',
        ].map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            style={{
              padding: '3px 8px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              transition: 'var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息，例如：为什么把这两个概念合并了？"
            rows={1}
            style={{
              flex: 1,
              padding: '9px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.5,
              transition: 'var(--transition-fast)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--border-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || messageSending}
            style={{
              padding: '9px 12px',
              background: input.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: input.trim() ? 'var(--text-inverse)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              transition: 'var(--transition-fast)',
            }}
          >
            {messageSending ? <Loader2 size={16} className="animate-pulse" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function generateDemoResponse(question) {
  const q = question.toLowerCase();
  if (q.includes('炎症') && (q.includes('为什么') || q.includes('合并') || q.includes('解释'))) {
    return '合并《生理学》和《病理学》中"炎症"相关概念的原因：\n\n**1. 语义高度重叠**\n两本教材描述的是同一个生物学过程——炎症反应。《生理学》侧重"炎症的生理机制"，《病理学》侧重"炎症的病理变化"，两者是互补视角而非独立概念。\n\n**2. 语义相似度计算**\n通过 BGE-small-zh 模型计算，两个知识点的嵌入向量余弦相似度为 0.91，超过合并阈值 0.85。\n\n**3. 整合策略**\n保留《病理学》中更系统的分类框架（变质、渗出、增生），补充《生理学》中关于全身反应和调节机制的内容，整合后覆盖率提升 23%。\n\n如果您认为这两个概念有本质区别需要分开保留，请告诉我具体理由，我可以撤销此项决策。';
  }
  if (q.includes('免疫应答') && (q.includes('保留') || q.includes('不要删'))) {
    return '收到您的反馈！让我检查一下"免疫应答"相关决策：\n\n**当前状态**："免疫应答"这个核心概念在整合版中是被保留的，并且融合了《免疫学》和《生理学》两个版本的内容。\n\n**可能被删除的是**：《组织学》中对免疫系统的概述性章节，其核心内容已被更详细的免疫学章节覆盖。\n\n如果您指的是其他具体知识点，请提供决策 ID（如 merge_001），我可以为您详细解释或撤销该决策。\n\n需要我将"免疫应答"从合并状态改为独立保留吗？';
  }
  if (q.includes('压缩比') || q.includes('统计')) {
    return '当前整合统计：\n\n📊 **压缩数据**\n- 原始总字数：5,820,000 字（7本教材）\n- 整合后字数：1,650,000 字\n- 压缩比：28.4% ✅（低于30%目标）\n\n📋 **决策分布**\n- 合并（merge）：342 项（48.5%）\n- 保留（keep）：267 项（37.9%）\n- 删除（remove）：96 项（13.6%）\n\n🕸 **图谱变化**\n- 节点：2,847 → 1,203（-57.7%）\n- 关系：4,562 → 2,891（-36.6%）\n- 跨教材关系增加 80.5%\n\n需要查看详细的整合报告吗？';
  }
  if (q.includes('决策') || q.includes('列表')) {
    return '以下是整合决策摘要：\n\n**合并决策（342项）示例：**\n• merge_001: 动作电位 ×3 → 整合版（置信度 95%）\n• merge_002: 炎症 ×2 → 整合版（置信度 91%）\n• merge_003: 抗体/免疫球蛋白 → 整合版（置信度 93%）\n\n**保留决策（267项）示例：**\n• keep_001: 肾小球滤过 — 仅在生理学出现\n• keep_002: 半衰期 — 药理学独有概念\n\n**删除决策（96项）示例：**\n• remove_001: 细胞基本结构概述 — 冗余\n• remove_002: 生物化学绪论 — 内容贡献有限\n\n您可以在右侧"整合操作"面板查看完整列表和详细理由。需要修改任何决策吗？';
  }
  return '感谢您的提问！关于这个问题，我需要查看具体的教材内容和整合记录。\n\n目前我可以帮您：\n1. 解释任何一项整合决策的理由\n2. 修改或撤销特定的合并/删除决策\n3. 查看某个知识点在各教材中的原始内容\n4. 展示整合前后的知识图谱对比\n\n请告诉我您想了解的具体内容，或者您可以点击右侧的"整合操作"面板查看完整的决策列表。';
}
