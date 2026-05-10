const API_BASE = '';

export async function uploadFiles(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  const res = await fetch(`${API_BASE}/api/textbooks/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function listTextbooks() {
  const res = await fetch(`${API_BASE}/api/textbooks`);
  return res.json();
}

export async function getStatus(textbookId) {
  const res = await fetch(`${API_BASE}/api/textbooks/${textbookId}/status`);
  return res.json();
}

export async function getParsed(textbookId) {
  const res = await fetch(`${API_BASE}/api/textbooks/${textbookId}/parsed`);
  return res.json();
}

export async function deleteTextbook(textbookId) {
  const res = await fetch(`${API_BASE}/api/textbooks/${textbookId}`, {
    method: 'DELETE',
  });
  return res.json();
}
