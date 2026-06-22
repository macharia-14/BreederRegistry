// Shared helpers for public-facing pages.
const API = window.location.origin + '/api';

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = payload && typeof payload === 'object'
      ? payload.detail || payload.message
      : payload;
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload;
}

function normalizeAnimalId(input) {
  if (!input) return '';
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, '');
  const match = cleaned.match(/^([A-Z]+)(\d+)$/);
  return match ? `${match[1]}-${match[2].padStart(3, '0')}` : cleaned;
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3500);
}

window.API = API;
window.apiFetch = apiFetch;
window.normalizeAnimalId = normalizeAnimalId;
window.showToast = showToast;
