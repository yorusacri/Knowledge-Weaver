const API_BASE = '';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Textbooks ──────────────────────────────────────────

export function uploadFiles(files, onProgress) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/textbooks/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send(formData);
  });
}

export const listTextbooks = () => request('/api/textbooks');

export const getTextbookStatus = (id) => request(`/api/textbooks/${id}/status`);

export const getParsed = (id) => request(`/api/textbooks/${id}/parsed`);

export const deleteTextbook = (id) =>
  request(`/api/textbooks/${id}`, { method: 'DELETE' });

// ── Knowledge Graph ────────────────────────────────────

export const getGraphData = (textbookId) =>
  request(`/api/graph/${textbookId}`);

export const getAllGraphData = () =>
  request('/api/graph/all');

export const buildGraph = (textbookId) =>
  request(`/api/graph/${textbookId}/build`, { method: 'POST' });

// ── Integration ────────────────────────────────────────

export const runIntegration = () =>
  request('/api/integration/run', { method: 'POST' });

export const getIntegrations = () =>
  request('/api/integration/decisions');

export const applyIntegration = (decisionId, action) =>
  request(`/api/integration/decisions/${decisionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

export const getIntegrationStats = () =>
  request('/api/integration/stats');

export const getCompressionRatio = () =>
  request('/api/integration/compression');

// ── RAG ────────────────────────────────────────────────

export const buildRAGIndex = () =>
  request('/api/rag/index', { method: 'POST' });

export const queryRAG = (question) =>
  request('/api/rag/query', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

export const getRAGStatus = () =>
  request('/api/rag/status');

// ── Dialogue ───────────────────────────────────────────

export const sendMessage = (content) =>
  request('/api/dialogue/message', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const getDialogHistory = () =>
  request('/api/dialogue/history');

export const clearDialogHistory = () =>
  request('/api/dialogue/history', { method: 'DELETE' });
