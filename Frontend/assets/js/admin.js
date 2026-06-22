// Frontend/assets/js/admin.js: controls frontend behavior for the Animal Breed Registry System.
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

// Handles get role behavior for this page.
function getRole() {
  return localStorage.getItem('role') || sessionStorage.getItem('role') || localStorage.getItem('user_role') || sessionStorage.getItem('user_role');
}

// Clears the active session and returns the user to the login page.
function logout() {
  const keys = ['token', 'role', 'admin', 'admin_id'];
  keys.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  window.location.href = '/login.html';
}

// Handles api fetch behavior for this page.
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof URLSearchParams) &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    throw new Error('Unauthorized. Please log in again as an administrator.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  const data = await res.json();
  return normalizeApiResponse(data);
}

// Handles normalize api response behavior for this page.
function normalizeApiResponse(payload, fallback = null) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data ?? fallback;
  }
  return payload ?? fallback;
}

// Handles ensure array behavior for this page.
function ensureArray(payload) {
  const data = normalizeApiResponse(payload, []);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.records)) return data.records;
  return [];
}

// Shows toast feedback to the user.
function showToast(message, type = 'info') {
  console.log(`[${type}] ${message}`);
  const existing = document.querySelector('.toast-message');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    borderRadius: '8px',
    background: type === 'error' ? '#dc2626' : '#16a34a',
    color: '#fff',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  });

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

window.getToken = getToken;
window.getRole = getRole;
window.logout = logout;
window.apiFetch = apiFetch;
window.showToast = showToast;
window.normalizeApiResponse = normalizeApiResponse;
window.ensureArray = ensureArray;
window.adminHeaders = adminHeaders;
window.requireAdminSession = function requireAdminSession() {
  const token = getToken();
  const role = getRole();
  if (!token || role !== 'admin') {
    console.warn('[Auth Guard] Missing or invalid admin session. Redirecting to login.');
    window.location.href = '/login.html';
    return false;
  }
  return true;
};
const API = window.location.origin + '/api';

// Runs page setup after the HTML document is ready.
document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname.toLowerCase();
  const publicKeywords = ['login.html', 'register.html', 'lineage_search.html', 'lineage-search', 'lineage', 'reset-password', 'index.html'];
  const isPublic = publicKeywords.some(kw => path.includes(kw)) ||
                   path.endsWith('/') || path.split('/').pop() === '';

  console.log(`[Auth Guard] Path: ${path}, isPublic: ${isPublic}`);
  if (isPublic) return;
  const token = getToken();
  const role = getRole();
  if (!window.requireAdminSession()) return;

  initAdminNav();

  await Promise.all([
    renderStats(),
    renderPendingApplications(),
    renderApprovedBreeders(),
    renderRejectedApplications(),
  ]);

  (document.getElementById('logoutBtn') || document.getElementById('logout-btn'))?.addEventListener('click', e => { e.preventDefault(); logout(); });
});

// Initializes admin nav behavior for this page.
function initAdminNav() {
  const sections = document.querySelectorAll('.admin-section');
  const navItems = document.querySelectorAll('.nav-item');
  if (sections.length && !document.querySelector('.admin-section.active')) {
    sections[0].classList.add('active');
  }

  navItems.forEach(item => {
    const sectionId = item.getAttribute('data-section');
    if (!sectionId) return;

    item.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(sectionId);
      if (!target) return;

      sections.forEach(s => s.classList.remove('active'));
      navItems.forEach(n => n.classList.remove('active'));
      target.classList.add('active');
      item.classList.add('active');
      const sidebar = document.querySelector('.sidebar');
      if (window.innerWidth <= 768 && sidebar?.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  });
}

// Handles admin headers behavior for this page.
function adminHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

// Renders stats content in the page.
async function renderStats() {
  try {
    const stats = await apiFetch('/api/admins/stats', { headers: adminHeaders() });
    // Handles set behavior for this page.
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? 0; };

    set('total-breeders',      stats.total_breeders);
    set('total-breeders-stat', stats.total_breeders);
    set('pending-count',       stats.pending_applications);
    set('pending-count-stat',  stats.pending_applications);
    set('total-animals',       stats.total_animals);
    set('total-animals-stat',  stats.total_animals);
    set('approved-count',      stats.approved_breeders);
  } catch (err) {
    showToast('Failed to load stats.', 'error');
  }
}

// Handles set table loading behavior for this page.
function setTableLoading(tbodyId, colSpan) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return null;
  tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:1rem;">Loading…</td></tr>`;
  return tbody;
}

// Handles set table empty behavior for this page.
function setTableEmpty(tbody, colSpan, message) {
  tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:1.5rem;color:#6B7280;">${message}</td></tr>`;
}

// Renders pending applications content in the page.
async function renderPendingApplications() {
  const tbody = setTableLoading('applications-tbody', 9);
  if (!tbody) return;

  try {
    const apps = await apiFetch('/api/admins/applications', { headers: adminHeaders() });
    tbody.innerHTML = '';
    if (!apps.length) { setTableEmpty(tbody, 9, 'No pending applications.'); return; }

    apps.forEach(app => tbody.appendChild(buildApplicationRow(app)));
  } catch (err) {
    setTableEmpty(tbody, 9, `Error: ${err.message}`);
  }
}

// Handles build application row behavior for this page.
function buildApplicationRow(app) {
  const row = document.createElement('tr');
  const cells = [
    app.full_name,
    app.national_id,
    `<span class="badge badge-individual">${app.animal_type ?? '—'}</span>`,
    app.farm_name ?? '—',
    app.county ?? '—',
    app.phone,
    app.email,
    new Date(app.created_at).toLocaleDateString(),
  ];

  cells.forEach((cell, i) => {
    const td = document.createElement('td');
    if (i === 2) td.innerHTML = cell;
    else td.textContent = cell;
    row.appendChild(td);
  });
  const actions = document.createElement('td');
  const approveBtn = makeBtn('approve-btn', '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 5 13"></polyline></svg> Approve', () => approveApplication(app.id));
  const rejectBtn = makeBtn('reject-btn',  '✕ Reject',  () => rejectApplication(app.id));
  const viewBtn = makeBtn('view-btn',    '👁 View',    () => viewApplication(app.id));
  actions.append(approveBtn, rejectBtn, viewBtn);
  row.appendChild(actions);
  return row;
}

// Renders approved breeders content in the page.
async function renderApprovedBreeders() {
  const tbody = setTableLoading('farmers-tbody', 9);
  if (!tbody) return;

  try {
    const breeders = await apiFetch('/api/admins/approved-breeders', { headers: adminHeaders() });
    tbody.innerHTML = '';
    if (!breeders.length) { setTableEmpty(tbody, 9, 'No approved breeders.'); return; }

    breeders.forEach(b => {
      const row = document.createElement('tr');
      const cells = [b.full_name, b.farm_prefix ?? '—', b.farm_name ?? '—', b.county ?? '—',
        `<span class="badge badge-individual">${b.animal_type ?? '—'}</span>`,
        b.email, b.phone,
        `<span class="status-approved">Approved</span>`,
        b.approved_at ? new Date(b.approved_at).toLocaleDateString() : '—',
      ];
      cells.forEach((c, i) => {
        const td = document.createElement('td');
        if (i === 4 || i === 7) td.innerHTML = c; else td.textContent = c;
        row.appendChild(td);
      });
      const actions = document.createElement('td');
      actions.appendChild(makeBtn('delete-btn', '🗑 Delete', () => deleteBreeder(b.id)));
      row.appendChild(actions);
      tbody.appendChild(row);
    });
  } catch (err) {
    setTableEmpty(tbody, 9, `Error: ${err.message}`);
  }
}

// Renders rejected applications content in the page.
async function renderRejectedApplications() {
  const tbody = setTableLoading('rejected-tbody', 9);
  if (!tbody) return;

  try {
    const apps = await apiFetch('/api/admins/rejected-applications', { headers: adminHeaders() });
    tbody.innerHTML = '';
    if (!apps.length) { setTableEmpty(tbody, 9, 'No rejected applications.'); return; }

    apps.forEach(app => {
      const row = document.createElement('tr');
      [app.full_name, app.national_id, app.animal_type ?? '—', app.farm_name ?? '—',
       app.county ?? '—', app.phone, app.email,
       new Date(app.created_at).toLocaleDateString()].forEach(c => {
        const td = document.createElement('td');
        td.textContent = c;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
  } catch (err) {
    setTableEmpty(tbody, 9, `Error: ${err.message}`);
  }
}

// Handles approve application behavior for this page.
async function approveApplication(id) {
  if (!confirm('Approve this breeder?')) return;
  try {
    await apiFetch(`/api/admins/approve/${id}`, { method: 'POST', headers: adminHeaders() });
    showToast('Breeder approved!', 'success');
    await Promise.all([renderPendingApplications(), renderApprovedBreeders(), renderStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handles reject application behavior for this page.
async function rejectApplication(id) {
  if (!confirm('Reject this application?')) return;
  try {
    await apiFetch(`/api/admins/reject/${id}`, { method: 'POST', headers: adminHeaders() });
    showToast('Application rejected.', 'success');
    await Promise.all([renderPendingApplications(), renderStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handles delete breeder behavior for this page.
async function deleteBreeder(id) {
  if (!confirm('Delete this breeder? This cannot be undone.')) return;
  try {
    await apiFetch(`/api/admins/breeders/${id}`, { method: 'DELETE', headers: adminHeaders() });
    showToast('Breeder deleted.', 'success');
    await Promise.all([renderApprovedBreeders(), renderStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handles view application behavior for this page.
async function viewApplication(id) {
  const modal = createModal();
  const modalContent = modal.querySelector('.modal-content');
  document.body.appendChild(modal);

  try {
    const app = await apiFetch(`/api/admins/applications/${id}`, { headers: adminHeaders() });
    const docList = app.documents
      ? app.documents.split(',').map(d => `<li>${d.trim()}</li>`).join('')
      : null;

    modalContent.innerHTML = `
      <button class="close-button" aria-label="Close">&times;</button>
      <h2>Application Details</h2>
      <div class="application-details">
        <p><strong>Full Name:</strong> ${app.full_name}</p>
        <p><strong>National ID:</strong> ${app.national_id}</p>
        <p><strong>Animal Type:</strong> <span class="badge badge-individual">${app.animal_type}</span></p>
        <p><strong>Farm Name:</strong> ${app.farm_name ?? '—'}</p>
        <p><strong>Farm Prefix:</strong> ${app.farm_prefix ?? '—'}</p>
        <p><strong>Location:</strong> ${app.farm_location}, ${app.county ?? '—'}</p>
        <p><strong>Phone:</strong> ${app.phone}</p>
        <p><strong>Email:</strong> ${app.email}</p>
        <p><strong>Submitted:</strong> ${new Date(app.created_at).toLocaleString()}</p>
        <div><strong>Documents:</strong> ${docList ? `<ul>${docList}</ul>` : 'None uploaded'}</div>
      </div>
      <div class="modal-actions">
        <button class="action-btn approve-btn" id="modal-approve"><svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 5 13"></polyline></svg> Approve</button>
        <button class="action-btn reject-btn"  id="modal-reject">✕ Reject</button>
      </div>
    `;

    modal.querySelector('.close-button').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#modal-approve').addEventListener('click', async () => { await approveApplication(app.id); modal.remove(); });
    modal.querySelector('#modal-reject').addEventListener('click',  async () => { await rejectApplication(app.id);  modal.remove(); });
  } catch (err) {
    modalContent.innerHTML = `<button class="close-button">&times;</button><p style="color:#E63946;">${err.message}</p>`;
    modal.querySelector('.close-button').addEventListener('click', () => modal.remove());
  }
}

// Handles make btn behavior for this page.
function makeBtn(className, label, onClick) {
  const btn = document.createElement('button');
  btn.className = `action-btn ${className}`;
  btn.innerHTML = label;
  btn.addEventListener('click', onClick);
  return btn;
}

// Handles create modal behavior for this page.
function createModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-content"></div>';
  return overlay;
}
