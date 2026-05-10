export const BOOK_COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export const BOOK_NAMES = [
  '生理学', '病理学', '免疫学', '药理学', '解剖学', '组织学', '生物化学',
];

export const RELATION_STYLES = {
  prerequisite: { label: '前置依赖', color: '#f59e0b', dash: '8 4' },
  parallel:     { label: '并列关系', color: '#3b82f6', dash: '5 5' },
  contains:     { label: '包含关系', color: '#10b981', dash: 'solid' },
  applies_to:   { label: '应用关系', color: '#8b5cf6', dash: '3 3' },
};

export const CATEGORY_ICONS = {
  '核心概念': '◈',
  '生理机制': '⚙',
  '疾病概念': '🩺',
  '解剖结构': '🦴',
  '生化过程': '⚗',
  '免疫机制': '🛡',
  '药理作用': '💊',
};

export const ACTION_CONFIG = {
  merge:  { label: '合并', color: '#3b82f6', icon: 'GitMerge' },
  keep:   { label: '保留', color: '#10b981', icon: 'ShieldCheck' },
  remove: { label: '删除', color: '#ef4444', icon: 'Trash2' },
};

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatNumber(n) {
  if (n == null) return '-';
  return n.toLocaleString('zh-CN');
}

export function formatPercent(value, total) {
  if (!total) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

export function getBookColor(name) {
  const idx = BOOK_NAMES.indexOf(name);
  return idx >= 0 ? BOOK_COLORS[idx] : '#6b7280';
}

export function truncate(str, len = 100) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function timeAgo(dateStr) {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}
