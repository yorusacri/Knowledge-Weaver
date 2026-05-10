const API_BASE = '';

export function uploadFiles(files, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
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
        reject(new Error(xhr.statusText));
      }
    };
    xhr.onerror = () => reject(new Error('上传失败'));
    xhr.send(formData);
  });
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

export async function getChapterContent(textbookId, chapterId) {
  const res = await fetch(`${API_BASE}/api/textbooks/${textbookId}/chapters/${chapterId}`);
  return res.json();
}

export async function triggerParse(textbookId) {
  const res = await fetch(`${API_BASE}/api/textbooks/${textbookId}/parse`, { method: 'POST' });
  return res.json();
}

export async function deleteTextbook(textbookId) {
  const res = await fetch(`${API_BASE}/api/textbooks/${textbookId}`, {
    method: 'DELETE',
  });
  return res.json();
}
