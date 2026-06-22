// Frontend/assets/js/breeders.js: controls frontend behavior for the Animal Breed Registry System.
const API = window.location.origin + '/api';

// Handles get token behavior for this page.
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Handles get role behavior for this page.
function getRole() {
  return localStorage.getItem('role') || sessionStorage.getItem('role');
}

// Clears the active session and returns the user to the login page.
function logout() {
  const keys = ['token', 'role', 'breeder_id', 'breeder', 'admin', 'admin_id'];
  keys.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  window.location.href = '/login.html';
}

// Handles api fetch behavior for this page.
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkError) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  if (res.status === 401 || res.status === 403) {
    const message = res.status === 401 ? 'Your session has expired. Please login again.' : 'You are not allowed to perform this action.';
    if (res.status === 401) {
      ['token', 'role', 'breeder_id', 'breeder'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
      setTimeout(() => { window.location.href = '/login.html'; }, 800);
    }
    throw new Error(message);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Handles set page busy behavior for this page.
function setPageBusy(isBusy, message = 'Loading...') {
  let overlay = document.getElementById('pageBusyOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pageBusyOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.18);z-index:9998;display:none;align-items:center;justify-content:center;';
    overlay.innerHTML = `<div style="background:white;border-radius:14px;padding:16px 20px;box-shadow:0 12px 30px rgba(15,23,42,.18);font-weight:600;color:#334155;">${message}</div>`;
    document.body.appendChild(overlay);
  }
  overlay.style.display = isBusy ? 'flex' : 'none';
}

// Handles current breeder page behavior for this page.
function currentBreederPage() {
  return window.location.pathname.split('/').pop() || 'overview.html';
}

// Handles refresh current page behavior for this page.
async function refreshCurrentPage({ silent = true } = {}) {
  if (!breederId || document.hidden) return;
  const page = currentBreederPage();
  try {
    if (!silent) setPageBusy(true, 'Refreshing...');
    if (page === 'overview.html' || page === '' || !page) await loadDashboardStats();
    else if (page === 'animal_management.html') await loadAnimalRecords();
    else if (page === 'breeding_events.html') await loadBreedingEventsPageData();
    else if (page === 'offspring_history.html') await loadOffspringHistoryPageData();
    else if (page === 'reports.html') await loadReportsPage();
  } catch (error) {
    if (!silent) showToast(`Refresh failed: ${error.message}`, 'error');
  } finally {
    if (!silent) setPageBusy(false);
  }
}

// Handles start live refresh behavior for this page.
function startLiveRefresh() {
  const page = currentBreederPage();
  const livePages = new Set(['overview.html', 'animal_management.html', 'breeding_events.html', 'offspring_history.html', 'reports.html']);
  if (!livePages.has(page)) return;
  const intervalMs = page === 'breeding_events.html' ? 30000 : 60000;
  if (window.__liveRefreshTimer) clearInterval(window.__liveRefreshTimer);
  window.__liveRefreshTimer = setInterval(() => refreshCurrentPage({ silent: true }), intervalMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshCurrentPage({ silent: true });
  }, { once: false });
}

// Handles normalize animal id behavior for this page.
function normalizeAnimalId(input) {
  if (!input) return '';
  let cleaned = input.trim().toUpperCase().replace(/[\s-]/g, '');
  const match = cleaned.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const number = match[2];
    const paddedNumber = number.padStart(3, '0');
    return `${prefix}-${paddedNumber}`;
  }
  return cleaned;
}

(function initToastSystem() {
  const style = document.createElement('style');
  style.textContent = `
    #toast-container {
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    }
    .toast {
      padding: 14px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
      color: #fff; min-width: 280px; max-width: 400px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      animation: toastIn 0.3s ease; pointer-events: all;
    }
    .toast.info    { background: #2563eb; }
    .toast.success { background: #16a34a; }
    .toast.error   { background: #dc2626; }
    .toast.fade-out { animation: toastOut 0.4s ease forwards; }
    @keyframes toastIn  { from{opacity:0;transform:translateX(30px);} to{opacity:1;transform:translateX(0);} }
    @keyframes toastOut { from{opacity:1;transform:translateX(0);}    to{opacity:0;transform:translateX(30px);} }

    /* Password Toggle Styles */
    .password-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
    .password-wrapper input { width: 100%; padding-right: 40px !important; }
    .toggle-icon {
      position: absolute; right: 12px; cursor: pointer; user-select: none;
      font-size: 1.2rem; filter: grayscale(1); opacity: 0.6; transition: 0.2s;
    }
    .toggle-icon:hover { opacity: 1; filter: none; }

    /* Remember Me & Forgot Link Styles */
    .form-options { margin: 15px 0; display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .remember-me { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #64748b; }
    .remember-me input { width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb; }
    .forgot-link { font-size: 13px; color: #2563eb; text-decoration: none; font-weight: 500; }
    .forgot-link:hover { text-decoration: underline; }
  `;
  document.head.appendChild(style);
  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);
})();

// Shows toast feedback to the user.
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}
let breederId = null;
let breederData = null;
let allAnimals = [];
let offspringHistoryData = [];
let animalMapForExports = new Map();
let currentPedigreeData = [];

// Runs page setup after the HTML document is ready.
document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.textContent = isPwd ? '🙈' : '👁️';
    });
  });

  document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Please contact the administrator to reset your password.', 'info');
  });
  const queryBtn = document.getElementById('queryBtn');
  const queryInput = document.getElementById('queryId');
  if (queryBtn && queryInput) {
    // Handles global search user actions and events.
    const handleGlobalSearch = (e) => {
      e.preventDefault();
      const val = queryInput.value.trim();
      if (!val) {
        showToast('Please enter an Animal ID or Breed name.', 'warning');
        return;
      }
      const isAnimalId = /^[A-Z]+\s*-?\s*\d+$/i.test(val);
      if (isAnimalId) {
        searchLineage(normalizeAnimalId(val), 'lineageResult');
      } else {
        searchBreed(val);
      }
    };

    queryBtn.addEventListener('click', handleGlobalSearch);
    queryInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleGlobalSearch(e); });
  }
  const path = window.location.pathname.toLowerCase();
  const publicKeywords = ['login.html', 'register.html', 'lineage_search.html', 'lineage-search.html', 'lineage', 'reset-password.html', 'index.html', 'lineage_search', '/lineage'];
  const isPublic = publicKeywords.some(kw => path.includes(kw)) ||
                   path.endsWith('/') || path.split('/').pop() === '';

  console.log(`[Auth Guard] Path: ${path}, isPublic: ${isPublic}`);
  if (isPublic) return;
  const token = getToken();
  const role = getRole();
  if (!token || role !== 'breeder') {
    console.warn('[Auth Guard] Missing session.');
    window.location.href = '/login.html';
    return;
  }

  breederId = localStorage.getItem('breeder_id') || sessionStorage.getItem('breeder_id');
  if (!breederId) {
    console.warn('[Auth Guard] Breeder ID missing.');
    window.location.href = '/login.html';
    return;
  }

  initBreedingMethodToggle();
  initNotifications();
  initFilters();

  try {
    await loadBreederData();
    const page = window.location.pathname.split('/').pop();
    if (page === 'overview.html' || page === '' || !page) {
        await loadDashboardStats();
    }
    if (page === 'animal_management.html') {
        await loadAnimalRecords();
        document.getElementById('exportCsvBtn')?.addEventListener('click', exportToCsv);
        document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPdf);
    }
    if (page === 'breeding_events.html') {
        await loadBreedingEventsPageData();
    }
    if (page === 'offspring_history.html') {
        await loadOffspringHistoryPageData();
        document.getElementById('exportOffspringCsvBtn')?.addEventListener('click', exportOffspringToCsv);
        document.getElementById('exportOffspringPdfBtn')?.addEventListener('click', exportOffspringToPdf);
    }
    if (page === 'setting.html') {
        await loadSettingsPageData();
    }
    if (page === 'reports.html') {
        await loadReportsPage();
    }

    await populateAnimalDropdowns();
    startLiveRefresh();
  } catch (err) {
    showToast(`Failed to load dashboard data: ${err.message}`, 'error');
  }

  document.getElementById('registerForm')?.addEventListener('submit', handleAnimalRegistration);
  document.getElementById('breedingForm')?.addEventListener('submit', handleBreedingEvent);
  document.getElementById('settingsForm')?.addEventListener('submit', e => {
    e.preventDefault();
    showToast('Settings saved!', 'success');
  });

  document.querySelector('[data-section="records-page"]')?.addEventListener('click', () => {
    setTimeout(loadAnimalRecords, 100);
  });

  document.getElementById('logoutBtn')?.addEventListener('click', e => { e.preventDefault(); logout(); });

  document.addEventListener('click', () => {
    document.querySelectorAll('.actions-dropdown.show').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
  });
});

// Initializes breeding method toggle behavior for this page.
function initBreedingMethodToggle() {
  const methodSel = document.getElementById('breedingMethod');
  const sireSection = document.getElementById('sireSection');
  const aiFields = document.getElementById('aiFields');
  const etFields = document.getElementById('etFields');
  const sireLabel = document.getElementById('sireLabel');
  if (!methodSel) return;

  methodSel.addEventListener('change', () => {
    const m = methodSel.value;
    sireSection?.classList.remove('hidden');
    aiFields?.classList.add('hidden');
    etFields?.classList.add('hidden');
    if (sireLabel) sireLabel.textContent = 'Sire/Father ID';
    if (['ai', 'et', 'ivf'].includes(m)) {
      aiFields?.classList.remove('hidden');
      if (sireLabel) sireLabel.textContent = 'Sire/Father ID (if known)';
    }
    if (['et', 'ivf'].includes(m)) etFields?.classList.remove('hidden');
  });
}

// Initializes filters behavior for this page.
function initFilters() {
  document.getElementById('filterAnimalType')?.addEventListener('change', renderAnimalTable);
  document.getElementById('filterBreed')?.addEventListener('change', renderAnimalTable);
  document.getElementById('filterGender')?.addEventListener('change', renderAnimalTable);
}

// Initializes notifications behavior for this page.
function initNotifications() {
  const bell = document.querySelector('.notification-bell');
  const dropdown = document.querySelector('.notification-dropdown');
  if (!bell || !dropdown) return;

  bell.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('show'); });
  document.addEventListener('click', e => {
    if (!bell.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('show');
  });
}

// Loads breeder data data from the API or page state.
async function loadBreederData() {
  const data = await apiFetch(`/api/breeders/${breederId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!data || !data.id) {
    throw new Error('Failed to load valid breeder profile. The API may have returned an invalid response.');
  }

  breederData = data;
  const breederSelect = document.getElementById('breederSelect');
  if (breederSelect) {
      breederSelect.innerHTML = `<option value="${breederData.id}">${breederData.full_name} (${breederData.farm_name || 'No Farm Name'})</option>`;
  }
  return breederData;
}

// Loads dashboard stats data from the API or page state.
// Loads settings page data data from the API or page state.
// Loads breeding events page data data from the API or page state.
// Loads pregnancy monitor data from the API or page state.
async function loadPregnancyMonitor() {
    const loading = document.getElementById('pregLoading');
    const content = document.getElementById('pregContent');
    const empty = document.getElementById('pregEmpty');
    if (!loading || !content || !empty) return;

    loading.style.display = 'block';
    content.style.display = 'none';
    empty.style.display = 'none';

    try {
        const data = await apiFetch(
            `/api/genetics/pregnancy-monitor/${breederId}`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
        );

        loading.style.display = 'none';
        if (!data.pregnancies || !data.pregnancies.length) {
            empty.style.display = 'block'; return;
        }
        const s = data.summary;
        document.getElementById('pregSummary').innerHTML = `
          <div class="preg-stat">
            <div class="preg-stat-val">${s.total}</div>
            <div class="preg-stat-lbl">Total Active</div>
          </div>
          <div class="preg-stat">
            <div class="preg-stat-val" style="color:#16a34a">${s.active}</div>
            <div class="preg-stat-lbl">Active</div>
          </div>
          <div class="preg-stat">
            <div class="preg-stat-val" style="color:#ea580c">${s.due_soon}</div>
            <div class="preg-stat-lbl">Due Soon (<14d)</div>
          </div>
          <div class="preg-stat">
            <div class="preg-stat-val" style="color:#dc2626">${s.overdue}</div>
            <div class="preg-stat-lbl">Overdue</div>
          </div>
          <div class="preg-stat">
            <div class="preg-stat-val" style="color:#64748b">${s.awaiting_check || 0}</div>
            <div class="preg-stat-lbl">Awaiting Check</div>
          </div>`;

        document.getElementById('pregCards').innerHTML = data.pregnancies.map(p => {
            const progressColor =
                p.status === 'Overdue'  ? '#dc2626' :
                p.status === 'Due Soon' ? '#ea580c' :
                p.status === 'Upcoming' ? '#6366f1' : '#2563eb';
            const daysLabel = p.days_remaining >= 0
                ? `${p.days_remaining} days remaining`
                : `${Math.abs(p.days_remaining)} days overdue`;
            const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-KE', {
                day:'numeric', month:'short', year:'numeric'
            });
            return `
              <div class="preg-card">
                <div class="preg-header">
                  <div>
                    <div class="preg-animal">
                      🐄 ${p.dam_animal_id}
                      <span style="font-size:12px;font-weight:400;color:#64748b;"> — ${p.dam_breed}</span>
                    </div>
                    <div class="preg-meta">
                      Method: <strong>${p.breeding_method.toUpperCase()}</strong>
                      ${p.sire_animal_id ? ' · Sire: <strong>' + p.sire_animal_id + '</strong>' : ''}
                    </div>
                  </div>
                  <span class="status-pill" style="background:${p.status_color}">${p.status}</span>
                </div>

                <div class="preg-dates">
                  <span>📅 Bred: <strong>${fmt(p.breeding_date)}</strong></span>
                  <span>🎯 Due: <strong>${fmt(p.due_date)}</strong></span>
                  <span>⏱ ${p.gestation_days}d gestation</span>
                  <span style="color:${progressColor};font-weight:700;">${daysLabel}</span>
                </div>

                <div class="progress-wrap">
                  <div class="progress-label">
                    <span>Day ${p.days_elapsed} of ${p.gestation_days} — ${p.progress_pct}%</span>
                    <span style="color:${progressColor};font-weight:600;">${p.status}</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill"
                         style="width:${p.progress_pct}%;background:${progressColor};"></div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                  ${!p.pregnancy_confirmed ? `<button class="btn btn-sm" onclick="confirmPregnancy(${p.event_id})">Confirm Pregnancy</button>` : ''}
                  <button class="btn btn-sm" onclick="recordBreedingOutcome(${p.event_id}, 'failed_conception')">Mark Failed</button>
                  <button class="btn btn-sm" onclick="recordBreedingOutcome(${p.event_id}, 'miscarriage')">Pregnancy Lost</button>
                  <button class="btn btn-sm" onclick="recordBreedingOutcome(${p.event_id}, 'live_birth')">Record Live Birth</button>
                </div>
              </div>`;
        }).join('');

        content.style.display = 'block';
    } catch (e) {
        loading.style.display = 'none';
        empty.style.display = 'block';
        showToast('Could not load pregnancy data: ' + e.message, 'error');
    }
}

// Loads reports page data from the API or page state.
const BREEDS = {
  cattle:  { male: ['Angus','Hereford','Holstein','Charolais','Limousin','Brahman','Simmental'], female: ['Holstein-Friesian','Jersey','Guernsey','Ayrshire','Brown Swiss'] },
  sheep:   { male: ['Merino','Dorper','Suffolk','Rambouillet','Hampshire','Dorset'], female: ['Merino','Dorper','Suffolk','Rambouillet','Hampshire','Dorset'] },
  goat:    { male: ['Boer','Saanen','Nubian','Alpine','Toggenburg','Kiko','LaMancha'], female: ['Boer','Saanen','Nubian','Alpine','Toggenburg','Kiko','LaMancha'] },
  pig:     { male: ['Duroc','Large White','Landrace','Hampshire','Berkshire','Pietrain','Tamworth'], female: ['Duroc','Large White','Landrace','Hampshire','Berkshire','Pietrain','Tamworth'] },
  horse:   { male: ['Thoroughbred','Quarter Horse','Arabian','Mustang','Shire','Clydesdale'], female: ['Thoroughbred','Quarter Horse','Arabian','Mustang','Shire','Clydesdale'] },
  dog:     { male: ['German Shepherd','Labrador Retriever','Golden Retriever','Rottweiler','Bulldog'], female: ['German Shepherd','Labrador Retriever','Golden Retriever','Rottweiler','Bulldog'] },
};

// Handles update breed dropdown behavior for this page.
function updateBreedDropdown() {
  const typeEl = document.getElementById('animalType');
  const genderEl = document.getElementById('gender');
  const breedEl = document.getElementById('breed');
  if (!typeEl || !genderEl || !breedEl) return;
  const breeds = BREEDS[typeEl.value]?.[genderEl.value] ?? [];
  breedEl.innerHTML = breeds.length
    ? `<option value="">Select Breed</option>` + breeds.map(b => `<option value="${b.toLowerCase().replace(/ /g, '-')}">${b}</option>`).join('')
    : `<option value="">Select Animal Type & Gender first</option>`;
  breedEl.disabled = !breeds.length;
}

// Handles populate animal dropdowns behavior for this page.
async function populateAnimalDropdowns() {
  let animals = allAnimals;
  if (!animals || animals.length === 0) {
    try {
      animals = await apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } });
      allAnimals = animals;
    } catch (e) { animals = []; }
  }

  // Handles fill behavior for this page.
  function fill(selectId, list, placeholder) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      list.map(a => `<option value="${a.id}">${a.animal_id} (${a.breed})</option>`).join('');
  }

  // Handles fill string behavior for this page.
  function fillString(selectId, list, placeholder) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      list.map(a => `<option value="${a.animal_id}">${a.animal_id} (${a.breed})</option>`).join('');
  }

  // Handles fill datalist behavior for this page.
  function fillDatalist(inputId, list, placeholder) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const datalistId = input.getAttribute('list');
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    input.placeholder = placeholder;
    datalist.innerHTML = list.map(a => `<option value="${a.animal_id}"></option>`).join('');
  }
  const typeSelect = document.getElementById('animalType');
  if (typeSelect && typeSelect.tagName === 'SELECT') {
    const types = Object.keys(BREEDS);
    typeSelect.innerHTML = '<option value="">Select Type</option>' +
        types.map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');
    if (breederData?.animal_type && types.includes(breederData.animal_type)) {
        typeSelect.value = breederData.animal_type;
    }

    typeSelect.addEventListener('change', () => updateParentOptions(animals));
  }
  const breedingTypeSelect = document.getElementById('breedingAnimalType');
  if (breedingTypeSelect && breedingTypeSelect.tagName === 'SELECT') {
    const types = Object.keys(BREEDS);
    breedingTypeSelect.innerHTML = '<option value="">Select Animal Type</option>' +
        types.map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');

    breedingTypeSelect.addEventListener('change', () => updateParentOptions(animals));
  }

  // Handles update parent options behavior for this page.
  function updateParentOptions(list) {
    const regType = document.getElementById('animalType')?.value;
    const eventType = document.getElementById('breedingAnimalType')?.value;
    const selectedType = regType || eventType;
    const filtered = selectedType ? list.filter(a => a.animal_type === selectedType) : list;
    const males = filtered.filter(a => a.gender === 'male');
    const females = filtered.filter(a => a.gender === 'female');
    const sireSelect = document.getElementById('sire');
    const damSelect = document.getElementById('dam');
    if (sireSelect) sireSelect.disabled = !selectedType;
    if (damSelect) damSelect.disabled = !selectedType;
    const sireRegSelect = document.getElementById('sireForRegistration');
    const damRegSelect = document.getElementById('damForRegistration');
    if (sireRegSelect) sireRegSelect.disabled = !selectedType;
    if (damRegSelect) damRegSelect.disabled = !selectedType;

    fillDatalist('parent1', males, selectedType ? 'Type or select Sire ID' : 'Select Type First');
    fillDatalist('parent2', females, selectedType ? 'Type or select Dam ID' : 'Select Type First');
    fill('sire', males, selectedType ? 'Select Sire (Optional)' : 'Select Type First');
    fill('dam', females, selectedType ? 'Select Dam' : 'Select Type First');
    fill('offspring', filtered, selectedType ? 'Select Offspring (Optional)' : 'Select Type First');
    fillString('sireForRegistration', males, selectedType ? 'Select Sire (Optional)' : 'Select Type First');
    fillString('damForRegistration', females, selectedType ? 'Select Dam (Optional)' : 'Select Type First');
  }

  updateParentOptions(animals);

  ['animalType','gender'].forEach(id => document.getElementById(id)?.addEventListener('change', updateBreedDropdown));
}

// Handles get filtered animals behavior for this page.
function getFilteredAnimals() {
  const typeFilter = document.getElementById('filterAnimalType').value;
  const breedFilter = document.getElementById('filterBreed').value;
  const genderFilter = document.getElementById('filterGender').value;
  return allAnimals.filter(a => {
    const typeMatch = typeFilter === 'all' || a.animal_type === typeFilter;
    const breedMatch = breedFilter === 'all' || a.breed === breedFilter;
    const genderMatch = genderFilter === 'all' || a.gender === genderFilter;
    return typeMatch && breedMatch && genderMatch;
  });
}

// Handles export to csv behavior for this page.
// Handles export to pdf behavior for this page.
function exportToPdf() {
  const filteredAnimals = getFilteredAnimals();
  if (filteredAnimals.length === 0) {
    showToast('No animals to export.', 'warning');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const animalIdMap = new Map(allAnimals.map(animal => [animal.id, animal.animal_id]));
  const head = [['Animal ID', 'Type', 'Breed', 'Gender', 'DOB', 'Sire ID', 'Dam ID']];
  const body = filteredAnimals.map(a => {
    const sireId = a.sire_id ? animalIdMap.get(a.sire_id) || `DB_ID:${a.sire_id}` : '—';
    const damId = a.dam_id  ? animalIdMap.get(a.dam_id)  || `DB_ID:${a.dam_id}` : '—';
    return [ a.animal_id, a.animal_type, a.breed, a.gender, new Date(a.date_of_birth).toLocaleDateString(), sireId, damId ];
  });

  doc.setFontSize(18);
  doc.text('Animal Records', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 30);
  if (breederData) {
    doc.text(`Breeder: ${breederData.farm_name || breederData.full_name}`, 14, 36);
  }

  doc.autoTable({
    head: head,
    body: body,
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8 },
  });

  doc.save(`animal_records_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Handles populate filter dropdowns behavior for this page.
function populateFilterDropdowns(animals) {
  const typeFilter = document.getElementById('filterAnimalType');
  const breedFilter = document.getElementById('filterBreed');
  if (!typeFilter || !breedFilter) return;
  const types = [...new Set(animals.map(a => a.animal_type))];
  const breeds = [...new Set(animals.map(a => a.breed))];

  typeFilter.innerHTML = '<option value="all">All Types</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
  breedFilter.innerHTML = '<option value="all">All Breeds</option>' + breeds.map(b => `<option value="${b}">${b}</option>`).join('');
}

// Renders animal table content in the page.
function renderAnimalTable() {
  const tbody = document.getElementById('animalsTableBody');
  const countEl = document.getElementById('showingCount');
  if (!tbody) return;
  const filteredAnimals = getFilteredAnimals();
  tbody.innerHTML = '';
  if (countEl) {
    countEl.textContent = `Showing ${filteredAnimals.length} of ${allAnimals.length}`;
  }
  if (!filteredAnimals.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:#6B7280;">No animals match the current filters.</td></tr>';
    return;
  }
  const animalIdMap = new Map(allAnimals.map(animal => [animal.id, animal.animal_id]));

  filteredAnimals.forEach(a => {
    const row = document.createElement('tr');
    const sireId = a.sire_id ? animalIdMap.get(a.sire_id) || `ID: ${a.sire_id}` : '—';
    const damId = a.dam_id  ? animalIdMap.get(a.dam_id)  || `ID: ${a.dam_id}` : '—';

    row.innerHTML = `
      <td>${a.animal_id}</td>
      <td>${a.animal_type}</td>
      <td>${a.breed}</td>
      <td>${a.gender}</td>
      <td>${new Date(a.date_of_birth).toLocaleDateString()}</td>
      <td>${a.current_weight ?? '—'}${a.current_weight ? ' kg' : ''}</td>
      <td>${sireId}</td>
      <td>${damId}</td>
      <td class="actions-cell">
        <button class="actions-btn" onclick="toggleActions(event)">&#8942;</button>
        <div class="actions-dropdown">
            <a href="#" onclick="event.preventDefault(); openEditAnimalModal(${a.id})">✏️ Edit Details</a>
            <a href="#" onclick="event.preventDefault(); openWeightRecordModal(${a.id})">⚖️ Record Weight</a>
            <a href="#" onclick="event.preventDefault(); showPedigree('${a.animal_id}')">🧬 View Pedigree</a>
            <a href="#" onclick="event.preventDefault(); showQrCode('${a.animal_id}')">📱 Get QR Code</a>
            <a href="#" onclick="event.preventDefault(); openAnimalDetailsModal(${a.id})">📋 View Details</a>
            <a href="#" onclick="event.preventDefault(); deleteAnimal('${a.animal_id}', ${a.id})" class="delete">🗑 Delete Animal</a>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Loads animal records data from the API or page state.
async function loadAnimalRecords() {
  const tbody = document.getElementById('animalsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:1rem;">Loading…</td></tr>';

  try {
    allAnimals = await apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } });

    populateFilterDropdowns(allAnimals);
    renderAnimalTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:1rem;color:#E63946;">${err.message}</td></tr>`;
    const countEl = document.getElementById('showingCount');
    if (countEl) countEl.textContent = 'Error loading animals';
  }
}

// Handles animal registration user actions and events.
async function handleAnimalRegistration(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Registering…';

  try {
    // Handles number or null behavior for this page.
    const numberOrNull = (id) => {
      const value = document.getElementById(id)?.value;
      return value === undefined || value === null || value === '' ? null : Number(value);
    };
    // Handles text or null behavior for this page.
    const textOrNull = (id) => {
      const value = document.getElementById(id)?.value?.trim();
      return value ? value : null;
    };
    const animalData = {
      animal_type:   document.getElementById('animalType')?.value,
      breed:         document.getElementById('breed')?.value,
      gender:        document.getElementById('gender')?.value,
      date_of_birth: document.getElementById('dob')?.value,
      sire_id:       document.getElementById('sireForRegistration')?.value || null,
      dam_id:        document.getElementById('damForRegistration')?.value || null,
      birth_weight: numberOrNull('birthWeight'),
      current_weight: numberOrNull('currentWeight'),
      weaning_weight: numberOrNull('weaningWeight'),
      mature_weight: numberOrNull('matureWeight'),
      body_condition_score: numberOrNull('bodyConditionScore'),
      average_daily_gain: numberOrNull('averageDailyGain'),
      production_type: textOrNull('productionType'),
      daily_milk_yield: numberOrNull('dailyMilkYield'),
      milk_fat_percent: numberOrNull('milkFatPercent'),
      egg_count_annual: numberOrNull('eggCountAnnual'),
      health_status: textOrNull('healthStatus'),
      vaccination_status: textOrNull('vaccinationStatus'),
      disease_history: textOrNull('diseaseHistory'),
      hereditary_conditions: textOrNull('hereditaryConditions'),
      fertility_status: textOrNull('fertilityStatus'),
      age_at_first_service_months: numberOrNull('ageAtFirstServiceMonths'),
      services_per_conception: numberOrNull('servicesPerConception'),
      birth_interval_days: numberOrNull('birthIntervalDays'),
      offspring_count: numberOrNull('offspringCount'),
      offspring_survival_rate: numberOrNull('offspringSurvivalRate'),
      offspring_quality_score: numberOrNull('offspringQualityScore'),
      vet_notes: textOrNull('vetNotes'),
    };
    if (!animalData.animal_type || !animalData.breed || !animalData.gender || !animalData.date_of_birth) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const result = await apiFetch(`/api/breeders/${breederId}/animals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(animalData),
    });

    showToast(`Animal ${result.animal_id} registered successfully!`, 'success');
    e.target.reset();
    await populateAnimalDropdowns();
    await loadDashboardStats();
    await loadAnimalRecords();

    document.querySelector('.modal-overlay.active')?.classList.remove('active');
    document.body.style.overflow = 'auto';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// Handles toggle actions behavior for this page.
function toggleActions(event) {
    event.stopPropagation();
    const currentDropdown = event.currentTarget.nextElementSibling;

    document.querySelectorAll('.actions-dropdown.show').forEach(dropdown => {
        if (dropdown !== currentDropdown) {
            dropdown.classList.remove('show');
        }
    });

    currentDropdown.classList.toggle('show');
}

// Handles open named modal behavior for this page.
function openNamedModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Handles close named modal behavior for this page.
function closeNamedModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Handles close edit animal modal behavior for this page.
function closeEditAnimalModal() { closeNamedModal('editAnimalModal'); }
// Handles close weight record modal behavior for this page.
function closeWeightRecordModal() { closeNamedModal('weightRecordModal'); }

// Handles set form value behavior for this page.
function setFormValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

// Handles number or null from behavior for this page.
function numberOrNullFrom(id) {
  const value = document.getElementById(id)?.value;
  return value === undefined || value === null || value === '' ? null : Number(value);
}

// Handles text or null from behavior for this page.
function textOrNullFrom(id) {
  const value = document.getElementById(id)?.value?.trim();
  return value ? value : null;
}

// Handles populate edit parent options behavior for this page.
function populateEditParentOptions(animal) {
  const sireSelect = document.getElementById('editSireForRegistration');
  const damSelect = document.getElementById('editDamForRegistration');
  if (!sireSelect || !damSelect) return;
  const sameType = allAnimals.filter(a => a.animal_type === animal.animal_type && a.id !== animal.id);
  const males = sameType.filter(a => a.gender === 'male');
  const females = sameType.filter(a => a.gender === 'female');

  sireSelect.innerHTML = '<option value="">None</option>' + males.map(a => `<option value="${a.animal_id}">${a.animal_id} (${a.breed})</option>`).join('');
  damSelect.innerHTML = '<option value="">None</option>' + females.map(a => `<option value="${a.animal_id}">${a.animal_id} (${a.breed})</option>`).join('');
  const animalIdMap = new Map(allAnimals.map(a => [a.id, a.animal_id]));
  sireSelect.value = animal.sire_id ? animalIdMap.get(animal.sire_id) || '' : '';
  damSelect.value = animal.dam_id ? animalIdMap.get(animal.dam_id) || '' : '';
}

// Handles open edit animal modal behavior for this page.
function openEditAnimalModal(animalDbId) {
  const animal = allAnimals.find(a => a.id === animalDbId);
  if (!animal) {
    showToast('Animal not found in the current table. Please refresh and try again.', 'error');
    return;
  }

  setFormValue('editAnimalDbId', animal.id);
  const title = document.getElementById('editAnimalModalTitle');
  if (title) title.textContent = `Edit ${animal.animal_id}`;

  setFormValue('editAnimalType', animal.animal_type);
  setFormValue('editBreed', animal.breed);
  setFormValue('editGender', animal.gender);
  setFormValue('editDob', animal.date_of_birth);
  populateEditParentOptions(animal);

  setFormValue('editCurrentWeight', animal.current_weight);
  setFormValue('editBirthWeight', animal.birth_weight);
  setFormValue('editWeaningWeight', animal.weaning_weight);
  setFormValue('editMatureWeight', animal.mature_weight);
  setFormValue('editBodyConditionScore', animal.body_condition_score);
  setFormValue('editAverageDailyGain', animal.average_daily_gain);
  setFormValue('editProductionType', animal.production_type);
  setFormValue('editDailyMilkYield', animal.daily_milk_yield);
  setFormValue('editMilkFatPercent', animal.milk_fat_percent);
  setFormValue('editEggCountAnnual', animal.egg_count_annual);
  setFormValue('editHealthStatus', animal.health_status);
  setFormValue('editVaccinationStatus', animal.vaccination_status);
  setFormValue('editDiseaseHistory', animal.disease_history);
  setFormValue('editHereditaryConditions', animal.hereditary_conditions);
  setFormValue('editFertilityStatus', animal.fertility_status);
  setFormValue('editAgeAtFirstServiceMonths', animal.age_at_first_service_months);
  setFormValue('editServicesPerConception', animal.services_per_conception);
  setFormValue('editBirthIntervalDays', animal.birth_interval_days);
  setFormValue('editOffspringCount', animal.offspring_count);
  setFormValue('editOffspringSurvivalRate', animal.offspring_survival_rate);
  setFormValue('editOffspringQualityScore', animal.offspring_quality_score);
  setFormValue('editVetNotes', animal.vet_notes);

  openNamedModal('editAnimalModal');
}

// Handles animal update user actions and events.
async function handleAnimalUpdate(e) {
  e.preventDefault();
  const btn = document.getElementById('editAnimalSubmitBtn');
  const original = btn?.textContent || 'Save Changes';
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const animalDbId = document.getElementById('editAnimalDbId')?.value;
  try {
    const payload = {
      animal_type: textOrNullFrom('editAnimalType'),
      breed: textOrNullFrom('editBreed'),
      gender: textOrNullFrom('editGender'),
      date_of_birth: textOrNullFrom('editDob'),
      sire_id: document.getElementById('editSireForRegistration')?.value || null,
      dam_id: document.getElementById('editDamForRegistration')?.value || null,
      current_weight: numberOrNullFrom('editCurrentWeight'),
      birth_weight: numberOrNullFrom('editBirthWeight'),
      weaning_weight: numberOrNullFrom('editWeaningWeight'),
      mature_weight: numberOrNullFrom('editMatureWeight'),
      body_condition_score: numberOrNullFrom('editBodyConditionScore'),
      average_daily_gain: numberOrNullFrom('editAverageDailyGain'),
      production_type: textOrNullFrom('editProductionType'),
      daily_milk_yield: numberOrNullFrom('editDailyMilkYield'),
      milk_fat_percent: numberOrNullFrom('editMilkFatPercent'),
      egg_count_annual: numberOrNullFrom('editEggCountAnnual'),
      health_status: textOrNullFrom('editHealthStatus'),
      vaccination_status: textOrNullFrom('editVaccinationStatus'),
      disease_history: textOrNullFrom('editDiseaseHistory'),
      hereditary_conditions: textOrNullFrom('editHereditaryConditions'),
      fertility_status: textOrNullFrom('editFertilityStatus'),
      age_at_first_service_months: numberOrNullFrom('editAgeAtFirstServiceMonths'),
      services_per_conception: numberOrNullFrom('editServicesPerConception'),
      birth_interval_days: numberOrNullFrom('editBirthIntervalDays'),
      offspring_count: numberOrNullFrom('editOffspringCount'),
      offspring_survival_rate: numberOrNullFrom('editOffspringSurvivalRate'),
      offspring_quality_score: numberOrNullFrom('editOffspringQualityScore'),
      vet_notes: textOrNullFrom('editVetNotes'),
    };

    await apiFetch(`/api/breeders/${breederId}/animals/${animalDbId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });

    showToast('Animal details updated successfully.', 'success');
    closeEditAnimalModal();
    allAnimals = [];
    await populateAnimalDropdowns();
    await loadAnimalRecords();
  } catch (err) {
    showToast(`Error updating animal: ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = original; }
  }
}

// Handles close animal details modal behavior for this page.
function closeAnimalDetailsModal() { closeNamedModal('animalDetailsModal'); }

// Handles format detail value behavior for this page.
function formatDetailValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${value}${suffix}`;
}

// Handles get animal public id by db id behavior for this page.
function getAnimalPublicIdByDbId(dbId) {
  if (!dbId) return '—';
  const match = allAnimals.find(a => a.id === dbId);
  return match ? `${match.animal_id} (${match.breed})` : `DB ID: ${dbId}`;
}

// Handles detail item behavior for this page.
function detailItem(label, value, suffix = '') {
  return `<div class="animal-detail-item"><span class="animal-detail-label">${label}</span><span class="animal-detail-value">${formatDetailValue(value, suffix)}</span></div>`;
}

// Handles detail section behavior for this page.
function detailSection(title, items) {
  return `<section class="animal-detail-section"><h4>${title}</h4>${items.join('')}</section>`;
}

// Handles open animal details modal behavior for this page.
async function openAnimalDetailsModal(animalDbId) {
  const animal = allAnimals.find(a => a.id === animalDbId);
  if (!animal) {
    showToast('Animal not found in the current table. Please refresh and try again.', 'error');
    return;
  }
  const title = document.getElementById('animalDetailsModalTitle');
  const subtitle = document.getElementById('animalDetailsModalSubtitle');
  const content = document.getElementById('animalDetailsContent');
  if (title) title.textContent = `${animal.animal_id} Full Details`;
  if (subtitle) subtitle.textContent = `${animal.animal_type || 'Animal'} • ${animal.breed || 'Unknown breed'} • ${animal.gender || 'Unknown gender'}`;
  if (!content) return;

  content.innerHTML = `
    <div class="animal-detail-grid">
      ${detailSection('Identity & Pedigree', [
        detailItem('Animal ID', animal.animal_id),
        detailItem('Type', animal.animal_type),
        detailItem('Breed', animal.breed),
        detailItem('Gender', animal.gender),
        detailItem('Date of Birth', animal.date_of_birth ? new Date(animal.date_of_birth).toLocaleDateString() : null),
        detailItem('Sire / Father', getAnimalPublicIdByDbId(animal.sire_id)),
        detailItem('Dam / Mother', getAnimalPublicIdByDbId(animal.dam_id)),
        detailItem('Registered On', animal.created_at ? new Date(animal.created_at).toLocaleString() : null),
        detailItem('Last Updated', animal.updated_at ? new Date(animal.updated_at).toLocaleString() : null),
      ])}
      ${detailSection('Growth & Body Data', [
        detailItem('Current Weight', animal.current_weight, animal.current_weight ? ' kg' : ''),
        detailItem('Birth Weight', animal.birth_weight, animal.birth_weight ? ' kg' : ''),
        detailItem('Weaning Weight', animal.weaning_weight, animal.weaning_weight ? ' kg' : ''),
        detailItem('Mature Weight', animal.mature_weight, animal.mature_weight ? ' kg' : ''),
        detailItem('Body Condition Score', animal.body_condition_score),
        detailItem('Average Daily Gain', animal.average_daily_gain, animal.average_daily_gain ? ' kg/day' : ''),
      ])}
      ${detailSection('Production Data', [
        detailItem('Production Type', animal.production_type),
        detailItem('Daily Milk Yield', animal.daily_milk_yield, animal.daily_milk_yield ? ' litres' : ''),
        detailItem('Milk Fat', animal.milk_fat_percent, animal.milk_fat_percent ? '%' : ''),
        detailItem('Annual Egg Count', animal.egg_count_annual),
      ])}
      ${detailSection('Health Records', [
        detailItem('Health Status', animal.health_status),
        detailItem('Vaccination Status', animal.vaccination_status),
        detailItem('Disease History', animal.disease_history),
        detailItem('Hereditary Conditions', animal.hereditary_conditions),
        detailItem('Vet Notes', animal.vet_notes),
      ])}
      ${detailSection('Fertility & Reproduction', [
        detailItem('Fertility Status', animal.fertility_status),
        detailItem('Age at First Service', animal.age_at_first_service_months, animal.age_at_first_service_months ? ' months' : ''),
        detailItem('Services per Conception', animal.services_per_conception),
        detailItem('Birth Interval', animal.birth_interval_days, animal.birth_interval_days ? ' days' : ''),
      ])}
      ${detailSection('Offspring Performance', [
        detailItem('Offspring Count', animal.offspring_count),
        detailItem('Offspring Survival Rate', animal.offspring_survival_rate, animal.offspring_survival_rate ? '%' : ''),
        detailItem('Offspring Quality Score', animal.offspring_quality_score),
      ])}
    </div>
    <section class="animal-detail-section" style="margin-top:1rem;">
      <h4>Weight History</h4>
      <div id="animalMeasurementHistory">Loading measurement history…</div>
    </section>
    <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1rem;">
      <button type="button" class="export-btn" onclick="closeAnimalDetailsModal(); openEditAnimalModal(${animal.id});">Edit Details</button>
      <button type="button" class="export-btn" onclick="closeAnimalDetailsModal(); openWeightRecordModal(${animal.id});">Record Weight</button>
    </div>
  `;

  openNamedModal('animalDetailsModal');

  try {
    const measurements = await apiFetch(`/api/breeders/${breederId}/animals/${animal.id}/measurements`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    renderAnimalMeasurementHistory(measurements);
  } catch (err) {
    const history = document.getElementById('animalMeasurementHistory');
    if (history) history.innerHTML = `<span style="color:#E63946;">Could not load measurement history: ${err.message}</span>`;
  }
}

// Renders animal measurement history content in the page.
function renderAnimalMeasurementHistory(measurements) {
  const history = document.getElementById('animalMeasurementHistory');
  if (!history) return;
  if (!measurements || measurements.length === 0) {
    history.innerHTML = '<p style="color:#64748b;font-size:0.85rem;margin:0;">No measurement history recorded yet.</p>';
    return;
  }
  const rows = measurements
    .slice()
    .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
    .map(m => `
      <tr>
        <td>${m.measured_at ? new Date(m.measured_at).toLocaleDateString() : '—'}</td>
        <td>${m.measurement_type || 'weight'}</td>
        <td>${m.value ?? '—'} ${m.unit || ''}</td>
        <td>${m.notes || '—'}</td>
      </tr>
    `).join('');
  history.innerHTML = `
    <table class="measurement-history-table">
      <thead><tr><th>Date</th><th>Type</th><th>Value</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// Handles open weight record modal behavior for this page.
function openWeightRecordModal(animalDbId) {
  const animal = allAnimals.find(a => a.id === animalDbId);
  if (!animal) {
    showToast('Animal not found in the current table. Please refresh and try again.', 'error');
    return;
  }
  setFormValue('weightAnimalDbId', animal.id);
  setFormValue('weightAnimalLabel', `${animal.animal_id} (${animal.breed})`);
  setFormValue('weightRecordValue', animal.current_weight);
  setFormValue('weightRecordDate', new Date().toISOString().slice(0, 10));
  setFormValue('weightRecordNotes', '');
  const title = document.getElementById('weightRecordModalTitle');
  if (title) title.textContent = `Record Weight: ${animal.animal_id}`;
  openNamedModal('weightRecordModal');
}

// Handles weight record user actions and events.
async function handleWeightRecord(e) {
  e.preventDefault();
  const btn = document.getElementById('weightRecordSubmitBtn');
  const original = btn?.textContent || 'Save Weight Record';
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const animalDbId = document.getElementById('weightAnimalDbId')?.value;
  try {
    const payload = {
      measurement_type: 'weight',
      value: Number(document.getElementById('weightRecordValue')?.value),
      unit: 'kg',
      measured_at: document.getElementById('weightRecordDate')?.value,
      notes: textOrNullFrom('weightRecordNotes'),
    };

    await apiFetch(`/api/breeders/${breederId}/animals/${animalDbId}/measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });

    showToast('Weight record saved and current weight updated.', 'success');
    closeWeightRecordModal();
    allAnimals = [];
    await loadAnimalRecords();
  } catch (err) {
    showToast(`Error saving weight: ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = original; }
  }
}

// Handles delete animal behavior for this page.
async function deleteAnimal(animalStringId, animalDbId) {
    if (!confirm(`Are you sure you want to delete animal ${animalStringId}? This action cannot be undone and may fail if the animal is part of a breeding history.`)) {
        return;
    }

    try {
        await apiFetch(`/api/breeders/${breederId}/animals/${animalDbId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });

        showToast(`Animal ${animalStringId} has been deleted.`, 'success');

        allAnimals = [];
        await loadAnimalRecords();
    } catch (err) {
        showToast(`Error deleting animal: ${err.message}`, 'error');
    }
}

// Loads offspring history page data data from the API or page state.
// Renders monthly trends chart content in the page.
// Shows pedigree feedback to the user.
async function showPedigree(animalId) {
  const modalTitle = document.getElementById('pedigreeModalTitle');
  if (modalTitle) {
    modalTitle.textContent = `Pedigree for ${animalId}`;
  }
  openPedigreeModal();
  await searchLineage(animalId, 'pedigreeResult');
}

// Handles search lineage behavior for this page.
async function searchLineage(animalId, containerId) {
  const resultsContainer = document.getElementById(containerId);
  if (!resultsContainer) {
    console.error(`Lineage container with id "${containerId}" not found.`);
    return;
  }

  resultsContainer.innerHTML = '<div class="loading">Searching lineage...</div>';

  try {
    const url = `/api/public/animals/lineage/${encodeURIComponent(animalId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Animal with ID "${animalId}" not found`);
      }
      if (response.status === 500) {
        throw new Error("Internal Server Error: Something went wrong while retrieving lineage data. Please contact support if the issue persists.");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    const json = await response.json();
    const lineageData = Array.isArray(json) ? json : (json.data ?? json);
    currentPedigreeData = Array.isArray(lineageData) ? lineageData : [];
    if (!currentPedigreeData.length) {
      resultsContainer.innerHTML = `<div class="no-results">No lineage information found for animal ID "${animalId}"</div>`;
      return;
    }
    const lineageHtml = generateLineageHtmlFromPostgres(currentPedigreeData);
    resultsContainer.innerHTML = lineageHtml;
  } catch (error) {
    resultsContainer.innerHTML = `<div class="error-message">${error.message}</div>`;
  }
}

// Handles generate lineage html from postgres behavior for this page.
function generateLineageHtmlFromPostgres(lineageData) {
    if (!Array.isArray(lineageData) || lineageData.length === 0) {
        return '<div class="no-results">No lineage data.</div>';
    }
    const animalMap = new Map(lineageData.map(a => [a.animal_id, a]));
    const root = lineageData.find(a => a.generation === 0);
    if (!root) return '<div class="error-message">Could not find root animal in lineage data.</div>';
    const sire = root.sire_id ? animalMap.get(root.sire_id) : null;
    const dam = root.dam_id  ? animalMap.get(root.dam_id) : null;
    const patGrandsire = sire?.sire_id ? animalMap.get(sire.sire_id) : null;
    const patGranddam = sire?.dam_id  ? animalMap.get(sire.dam_id) : null;
    const matGrandsire = dam?.sire_id  ? animalMap.get(dam.sire_id) : null;
    const matGranddam = dam?.dam_id   ? animalMap.get(dam.dam_id) : null;
    const hasGrandparents = patGrandsire || patGranddam || matGrandsire || matGranddam;
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    // Handles node card behavior for this page.
    function nodeCard(animal, role, accentColor, bgColor, labelColor) {
        if (!animal) {
            return `<div style="flex:1;background:#f8fafc;border:2px dashed #e2e8f0;border-radius:10px;padding:0.75rem 1rem;text-align:center;min-width:0;">
                <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:0.3rem;">${role}</div>
                <div style="font-size:0.82rem;color:#cbd5e1;font-style:italic;">Unknown</div>
            </div>`;
        }
        return `<div style="flex:1;background:${bgColor};border-left:4px solid ${accentColor};border-radius:10px;padding:0.75rem 1rem;min-width:0;">
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:.08em;color:${labelColor};font-weight:700;margin-bottom:0.3rem;">${role}</div>
            <div style="font-size:0.9rem;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${animal.animal_id}</div>
            <div style="font-size:0.75rem;color:#64748b;margin-top:0.15rem;">${animal.breed || '—'}</div>
            <div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem;">${animal.gender === 'male' ? '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>' : '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg>'} &nbsp;·&nbsp; ${fmtDate(animal.date_of_birth)}</div>
        </div>`;
    }
    const vConn = `<div style="display:flex;justify-content:center;height:22px;"><div style="width:2px;background:linear-gradient(#d1fae5,#a7f3d0);height:100%;border-radius:2px;"></div></div>`;
    const midConnector = `<div style="position:relative;height:22px;margin:0 8px;">
        <svg width="100%" height="22" style="overflow:visible;position:absolute;top:0;left:0;">
            <line x1="25%" y1="0" x2="75%" y2="0" stroke="#a7f3d0" stroke-width="2"/>
            <line x1="50%" y1="0" x2="50%" y2="22" stroke="#a7f3d0" stroke-width="2"/>
        </svg>
    </div>`;
    const grandparentSection = hasGrandparents ? `
        <div>
            <div style="text-align:center;font-size:0.68rem;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-weight:600;margin-bottom:0.6rem;">Grandparents</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.5rem;">
                ${nodeCard(patGrandsire, 'Pat. Grandsire', '#3b82f6', '#eff6ff', '#3b82f6')}
                ${nodeCard(patGranddam,  'Pat. Granddam',  '#ec4899', '#fdf2f8', '#ec4899')}
                ${nodeCard(matGrandsire, 'Mat. Grandsire', '#3b82f6', '#eff6ff', '#3b82f6')}
                ${nodeCard(matGranddam,  'Mat. Granddam',  '#ec4899', '#fdf2f8', '#ec4899')}
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">${vConn}${vConn}</div>
    ` : '';
    const parentSection = `
        <div>
            <div style="text-align:center;font-size:0.68rem;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-weight:600;margin-bottom:0.6rem;">Parents</div>
            <div style="display:flex;gap:1rem;">
                ${nodeCard(sire, 'Sire / Father', '#3b82f6', '#eff6ff', '#3b82f6')}
                ${nodeCard(dam,  'Dam / Mother',  '#ec4899', '#fdf2f8', '#ec4899')}
            </div>
        </div>
    `;
    const subjectSection = `
        <div>
            <div style="text-align:center;font-size:0.68rem;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-weight:600;margin-bottom:0.6rem;">Subject</div>
            <div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:2px solid #2563eb;border-radius:12px;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;">
                <div>
                    <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.08em;color:#2563eb;font-weight:700;margin-bottom:0.2rem;">⭐ Subject Animal</div>
                    <div style="font-size:1.1rem;font-weight:700;color:#1e293b;">${root.animal_id}</div>
                    <div style="font-size:0.8rem;color:#475569;margin-top:0.15rem;">${root.breed || '—'} &nbsp;·&nbsp; ${root.animal_type || ''}</div>
                </div>
                <div style="text-align:right;font-size:0.8rem;color:#64748b;flex-shrink:0;">
                    <div style="font-weight:600;color:#1e293b;">${root.gender === 'male' ? '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg> Male' : '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg> Female'}</div>
                    <div>DOB: ${fmtDate(root.date_of_birth)}</div>
                </div>
            </div>
        </div>
    `;
    return `
    <div id="pedigreeChartInner" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <!-- Header summary -->
        <div style="background:linear-gradient(135deg,#2D6A4F,#1B4332);border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
            <div>
                <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.6);margin-bottom:0.2rem;">Pedigree Record</div>
                <div style="font-size:1.5rem;font-weight:700;">${root.animal_id}</div>
                <div style="font-size:0.88rem;color:rgba(255,255,255,.8);margin-top:0.2rem;">${root.breed || ''} ${root.animal_type || ''}</div>
            </div>
            <div style="text-align:right;font-size:0.83rem;color:rgba(255,255,255,.75);">
                <div style="font-weight:600;font-size:1rem;">${root.gender === 'male' ? '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg> Male' : '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg> Female'}</div>
                <div>Born: ${fmtDate(root.date_of_birth)}</div>
                <div style="margin-top:0.3rem;background:rgba(255,255,255,.12);padding:0.2rem 0.7rem;border-radius:20px;font-size:0.72rem;display:inline-block;">${lineageData.length} records in lineage</div>
            </div>
        </div>

        <!-- Pedigree title -->
        <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.9rem;font-weight:700;color:#1e293b;margin-bottom:1rem;padding-bottom:0.6rem;border-bottom:1px solid #e2e8f0;">
            🧬 <span>Pedigree Chart</span>
        </div>

        <!-- Chart rows -->
        <div style="display:flex;flex-direction:column;gap:0;">
            ${grandparentSection}
            ${parentSection}
            ${midConnector}
            ${subjectSection}
        </div>
    </div>`;
}

// Shows qr code feedback to the user.
function showQrCode(animalId) {
    const modal = document.getElementById('qrModal');
    const titleEl = document.getElementById('qrModalAnimalId');
    const container = document.getElementById('qrCodeContainer');
    if (!modal || !container) return;
    if (titleEl) titleEl.textContent = animalId;
    container.innerHTML = '';
    const publicUrl = `${window.location.origin}/lineage_search.html?animal=${encodeURIComponent(animalId)}`;
    document.getElementById('qrPublicUrl').textContent = publicUrl;
    if (typeof QRCode !== 'undefined') {
        new QRCode(container, {
            text: publicUrl,
            width: 220,
            height: 220,
            colorDark: '#1B4332',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        const img = document.createElement('img');
        img.src = `https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=${encodeURIComponent(publicUrl)}&choe=UTF-8`;
        img.alt = 'QR Code';
        img.style.cssText = 'width:220px;height:220px;display:block;';
        container.appendChild(img);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Handles close qr modal behavior for this page.
function closeQrModal() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Handles download qr code behavior for this page.
function downloadQrCode() {
    const container = document.getElementById('qrCodeContainer');
    const animalId = document.getElementById('qrModalAnimalId')?.textContent || 'animal';
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `qr_${animalId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        return;
    }
    const img = container.querySelector('img');
    if (img) {
        const link = document.createElement('a');
        link.download = `qr_${animalId}.png`;
        link.href = img.src;
        link.target = '_blank';
        link.click();
    }
}

// Handles breeding event user actions and events.
// Handles export offspring to csv behavior for this page.
// Handles export pedigree to pdf behavior for this page.
async function exportPedigreeToPdf() {
  if (!currentPedigreeData || currentPedigreeData.length === 0) {
    showToast('No pedigree data to export.', 'warning');
    return;
  }
  const pedigreeContainer = document.querySelector('#pedigreeResult #pedigreeChartInner')
                          || document.querySelector('#pedigreeResult .pedigree-tree')
                          || document.getElementById('pedigreeResult');
  if (!pedigreeContainer) {
      showToast('Pedigree chart element not found.', 'error');
      return;
  }
  if (typeof html2canvas === 'undefined') {
      showToast('PDF generation library (html2canvas) not loaded. Please refresh.', 'error');
      return;
  }
  const btn = document.querySelector('#pedigreeModal .export-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
      const canvas = await html2canvas(pedigreeContainer, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const rootAnimal = currentPedigreeData.find(a => a.generation === 0);
      const filename = `pedigree_${rootAnimal ? rootAnimal.animal_id : 'report'}.pdf`;
      pdf.save(filename);
  } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Failed to generate PDF.', 'error');
  } finally {
      btn.disabled = false;
      btn.textContent = originalText;
  }
}

// Handles export all animals csv behavior for this page.
// Handles export all events csv behavior for this page.
// Handles generate comprehensive farm report behavior for this page.
// Handles generate breeding performance report behavior for this page.
// Handles confirm pregnancy behavior for this page.
async function confirmPregnancy(eventId) {
  try {
    await apiFetch(`/api/breeders/${breederId}/breeding-events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        status: 'confirmed_pregnant',
        pregnancy_confirmed: true,
        pregnancy_check_date: new Date().toISOString().slice(0, 10)
      })
    });
    showToast('Pregnancy confirmed.', 'success');
    await loadPregnancyMonitor();
  } catch (e) {
    showToast('Could not confirm pregnancy: ' + e.message, 'error');
  }
}

// Handles record breeding outcome behavior for this page.
async function recordBreedingOutcome(eventId, outcome) {
  const labels = {
    live_birth: 'live birth',
    failed_conception: 'failed conception',
    miscarriage: 'pregnancy loss',
    stillbirth: 'stillbirth',
    abortion: 'abortion'
  };
  const ok = confirm(`Record this breeding outcome as ${labels[outcome] || outcome}?`);
  if (!ok) return;
  const payload = {
    outcome,
    outcome_date: new Date().toISOString().slice(0, 10),
    status: outcome === 'live_birth' ? 'completed' : (outcome === 'failed_conception' ? 'failed' : 'lost'),
    pregnancy_confirmed: outcome !== 'failed_conception'
  };
  if (outcome === 'live_birth') {
    const liveCount = prompt('How many live offspring?', '1');
    if (liveCount !== null && liveCount !== '') {
      payload.live_offspring_count = Number(liveCount);
      payload.offspring_count = Number(liveCount);
    }
  }
  try {
    await apiFetch(`/api/breeders/${breederId}/breeding-events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload)
    });
    showToast('Breeding outcome recorded.', 'success');
    await loadPregnancyMonitor();
  } catch (e) {
    showToast('Could not record outcome: ' + e.message, 'error');
  }
}

// Handles format date ke behavior for this page.
function formatDateKE(value) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Handles status badge behavior for this page.
function statusBadge(status) {
  const map = {
    planned: '#6366f1', served: '#64748b', confirmed_pregnant: '#16a34a',
    not_pregnant: '#f97316', failed: '#dc2626', lost: '#7c2d12', completed: '#2563eb', cancelled: '#94a3b8'
  };
  const label = String(status || 'unknown').replaceAll('_', ' ');
  return `<span class="status-pill" style="background:${map[status] || '#64748b'}">${label}</span>`;
}

// Loads breeding events page data data from the API or page state.
async function loadBreedingEventsPageData() {
  const [animals, events, analytics, alerts] = await Promise.all([
    apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    apiFetch(`/api/breeders/${breederId}/breeding-analytics`, { headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => null),
    apiFetch(`/api/breeders/${breederId}/breeding-alerts`, { headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => null),
  ]);
  allAnimals = animals;
  window.__breedingEvents = events;
  window.__animalByDbId = new Map(animals.map(a => [a.id, a]));

  renderUpcomingDueDates(events, animals);
  renderBreedingMethodBreakdown(events);
  await loadPregnancyMonitor();
  renderBreedingEventsTable(events, animals);
  if (analytics) renderFertilityAnalytics(analytics);
  if (alerts) renderBreedingAlerts(alerts);
}

// Renders upcoming due dates content in the page.
function renderUpcomingDueDates(events, animals) {
  const container = document.getElementById('upcomingDueDates');
  if (!container) return;
  const animalMap = new Map(animals.map(a => [a.id, a]));
  const today = new Date();
  const due = events
    .filter(e => ['served','confirmed_pregnant'].includes(e.status) && !e.outcome && e.expected_due_date)
    .sort((a,b) => new Date(a.expected_due_date) - new Date(b.expected_due_date))
    .slice(0, 8);
  if (!due.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa fa-calendar" style="color:#cbd5e1;"></i><p>No active due dates.</p></div>';
    return;
  }
  container.innerHTML = due.map(e => {
    const dam = animalMap.get(e.dam_id);
    const days = Math.ceil((new Date(`${e.expected_due_date}T00:00:00`) - today) / 86400000);
    return `<div class="event-item"><strong>${dam?.animal_id || e.dam_id}</strong><br><span>Due ${formatDateKE(e.expected_due_date)} · ${days >= 0 ? days + ' days remaining' : Math.abs(days) + ' days overdue'}</span></div>`;
  }).join('');
}

// Renders breeding method breakdown content in the page.
function renderBreedingMethodBreakdown(events) {
  const el = document.getElementById('methodBreakdown');
  if (!el) return;
  const counts = events.reduce((acc, ev) => {
    acc[ev.breeding_method] = (acc[ev.breeding_method] || 0) + 1;
    return acc;
  }, {});
  el.innerHTML = `
    <div class="method-item"><div class="method-count">${counts.ai || 0}</div><div class="method-label">AI</div></div>
    <div class="method-item"><div class="method-count">${counts.natural || 0}</div><div class="method-label">Natural</div></div>
    <div class="method-item"><div class="method-count">${(counts.et || 0) + (counts.ivf || 0)}</div><div class="method-label">ET / IVF</div></div>`;
}

// Renders breeding events table content in the page.
function renderBreedingEventsTable(events, animals) {
  const wrap = document.getElementById('breedingEventsTableWrap');
  if (!wrap) return;
  const animalMap = new Map(animals.map(a => [a.id, a]));
  if (!events.length) {
    wrap.innerHTML = '<div class="empty-state"><i class="fa fa-clipboard-list" style="color:#cbd5e1;"></i><p>No breeding events recorded yet.</p></div>';
    return;
  }
  wrap.innerHTML = `<table class="records-table"><thead><tr>
    <th>Date</th><th>Dam</th><th>Sire</th><th>Method</th><th>Status</th><th>Outcome</th><th>Expected Due</th><th>Actions</th>
  </tr></thead><tbody>${events.map(e => {
    const dam = animalMap.get(e.dam_id); const sire = animalMap.get(e.sire_id);
    const active = ['served','confirmed_pregnant'].includes(e.status) && !e.outcome;
    return `<tr>
      <td>${formatDateKE(e.breeding_date)}</td>
      <td>${dam?.animal_id || e.dam_id}</td>
      <td>${sire?.animal_id || '—'}</td>
      <td>${e.breeding_method || '—'}</td>
      <td>${statusBadge(e.status)}</td>
      <td>${e.outcome ? e.outcome.replaceAll('_',' ') : 'Pending'}</td>
      <td>${formatDateKE(e.expected_due_date)}</td>
      <td>
        <div class="breeding-action-group" aria-label="Breeding workflow actions">
          ${active && !e.pregnancy_confirmed ? `<button class="breeding-action-btn confirm" onclick="openBreedingWorkflowModal(${e.id}, 'confirm')" title="Confirm pregnancy"><i class="fa-solid fa-circle-check"></i><span>Confirm</span></button>` : ''}
          ${active ? `<button class="breeding-action-btn not-pregnant" onclick="openBreedingWorkflowModal(${e.id}, 'not_pregnant')" title="Mark not pregnant / failed conception"><i class="fa-solid fa-circle-xmark"></i><span>Not Pregnant</span></button>` : ''}
          ${active ? `<button class="breeding-action-btn delivered" onclick="openBreedingWorkflowModal(${e.id}, 'live_birth')" title="Record delivery outcome"><i class="fa-solid fa-baby"></i><span>Delivered</span></button>` : ''}
          ${active ? `<button class="breeding-action-btn loss" onclick="openBreedingWorkflowModal(${e.id}, 'loss')" title="Record pregnancy loss"><i class="fa-solid fa-triangle-exclamation"></i><span>Loss</span></button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

// Renders fertility analytics content in the page.
function renderFertilityAnalytics(data) {
  const s = data.summary || {};
  const summary = document.getElementById('fertilityAnalyticsSummary');
  if (summary) {
    summary.innerHTML = `
      <div class="preg-stat"><div class="preg-stat-val">${s.total_events || 0}</div><div class="preg-stat-lbl">Events</div></div>
      <div class="preg-stat"><div class="preg-stat-val" style="color:#16a34a">${s.live_births || 0}</div><div class="preg-stat-lbl">Live Births</div></div>
      <div class="preg-stat"><div class="preg-stat-val" style="color:#dc2626">${s.failed_conceptions || 0}</div><div class="preg-stat-lbl">Failed Conceptions</div></div>
      <div class="preg-stat"><div class="preg-stat-val" style="color:#7c2d12">${s.pregnancy_losses || 0}</div><div class="preg-stat-lbl">Pregnancy Losses</div></div>
      <div class="preg-stat"><div class="preg-stat-val">${s.success_rate ?? '—'}${s.success_rate == null ? '' : '%'}</div><div class="preg-stat-lbl">Closed Success Rate</div></div>`;
  }
  const method = document.getElementById('fertilityMethodBreakdown');
  if (method) {
    const entries = Object.entries(data.by_method || {});
    method.innerHTML = entries.length ? entries.map(([name, m]) => `
      <div class="method-item"><div class="method-count">${m.success_rate ?? '—'}${m.success_rate == null ? '' : '%'}</div><div class="method-label">${name} · ${m.total} event(s)</div></div>
    `).join('') : '<p>No method analytics yet.</p>';
  }
}

// Renders breeding alerts content in the page.
function renderBreedingAlerts(data) {
  const box = document.getElementById('breedingAlerts');
  if (!box) return;
  const alerts = data.alerts || [];
  if (!alerts.length) {
    box.innerHTML = '<div class="empty-state"><i class="fa fa-check-circle" style="color:#16a34a;"></i><p>No urgent breeding alerts.</p></div>';
    return;
  }
  box.innerHTML = alerts.map(a => `<div class="event-item" style="border-left:4px solid ${a.severity === 'danger' ? '#dc2626' : '#ea580c'};padding-left:12px;">
    <strong>${a.animal_id}</strong> — ${a.message}<br>
    <span>Due: ${formatDateKE(a.due_date)} · ${a.days_remaining >= 0 ? a.days_remaining + ' days remaining' : Math.abs(a.days_remaining) + ' days overdue'}</span>
  </div>`).join('');
}

// Handles open breeding workflow modal behavior for this page.
function openBreedingWorkflowModal(eventId, action) {
  const modal = document.getElementById('outcomeModal');
  if (!modal) return;
  document.getElementById('outcomeEventId').value = eventId;
  document.getElementById('outcomeActionType').value = action;
  document.getElementById('pregnancyCheckDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('outcomeDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('outcomeOffspringCount').value = '';
  document.getElementById('outcomeLiveOffspringCount').value = '';
  document.getElementById('outcomeNotes').value = '';
  const title = {
    confirm: 'Confirm Pregnancy', not_pregnant: 'Record Not Pregnant / Failed Conception',
    live_birth: 'Record Delivery Outcome', loss: 'Record Pregnancy Loss'
  }[action] || 'Update Breeding Event';
  document.getElementById('outcomeModalTitle').textContent = title;
  const showBirth = action === 'live_birth';
  document.getElementById('offspringCountGroup').style.display = showBirth ? 'block' : 'none';
  document.getElementById('liveOffspringCountGroup').style.display = showBirth ? 'block' : 'none';
  document.getElementById('outcomeDateGroup').style.display = action === 'confirm' ? 'none' : 'block';
  document.getElementById('pregnancyCheckDateGroup').style.display = action === 'confirm' ? 'block' : 'none';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Handles breeding workflow submit user actions and events.
async function handleBreedingWorkflowSubmit(e) {
  e.preventDefault();
  const eventId = document.getElementById('outcomeEventId').value;
  const action = document.getElementById('outcomeActionType').value;
  const notes = document.getElementById('outcomeNotes').value.trim();
  const payload = { outcome_notes: notes || null };
  if (action === 'confirm') {
    payload.status = 'confirmed_pregnant';
    payload.pregnancy_confirmed = true;
    payload.pregnancy_check_date = document.getElementById('pregnancyCheckDate').value;
  } else if (action === 'not_pregnant') {
    payload.status = 'failed';
    payload.pregnancy_confirmed = false;
    payload.outcome = 'failed_conception';
    payload.outcome_date = document.getElementById('outcomeDate').value;
  } else if (action === 'live_birth') {
    payload.status = 'completed';
    payload.pregnancy_confirmed = true;
    payload.outcome = 'live_birth';
    payload.outcome_date = document.getElementById('outcomeDate').value;
    payload.offspring_count = Number(document.getElementById('outcomeOffspringCount').value || 0);
    payload.live_offspring_count = Number(document.getElementById('outcomeLiveOffspringCount').value || 0);
  } else if (action === 'loss') {
    const loss = prompt('Enter loss type: miscarriage, stillbirth, or abortion', 'miscarriage') || 'miscarriage';
    payload.status = 'lost';
    payload.pregnancy_confirmed = true;
    payload.outcome = ['miscarriage','stillbirth','abortion'].includes(loss) ? loss : 'miscarriage';
    payload.outcome_date = document.getElementById('outcomeDate').value;
  }

  try {
    await apiFetch(`/api/breeders/${breederId}/breeding-events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload)
    });
    closeOutcomeModal();
    showToast('Breeding workflow updated.', 'success');
    await loadBreedingEventsPageData();
  } catch (err) {
    showToast(`Could not update breeding workflow: ${err.message}`, 'error');
  }
}

document.getElementById('outcomeForm')?.addEventListener('submit', handleBreedingWorkflowSubmit);

// Handles breeding event user actions and events.
async function handleBreedingEvent(e) {
  e.preventDefault();
  const form = e.target;
  const eventData = {
    breeding_method: document.getElementById('breedingMethod').value,
    dam_id: Number(document.getElementById('dam').value),
    sire_id: document.getElementById('sire').value ? Number(document.getElementById('sire').value) : null,
    breeding_date: form.querySelector('[name="breedingDate"]').value,
    expected_due_date: form.querySelector('[name="expectedDueDate"]').value || null,
    status: form.querySelector('[name="breedingStatus"]')?.value || 'served',
    batch_number: form.querySelector('[name="batchNumber"]')?.value || null,
    ai_technician: form.querySelector('[name="aiTechnician"]')?.value || null,
    donor_dam: form.querySelector('[name="donorDam"]')?.value || null,
    embryo_id: form.querySelector('[name="embryoId"]')?.value || null,
    offspring_id: document.getElementById('offspring').value ? Number(document.getElementById('offspring').value) : null,
    notes: form.querySelector('[name="notes"]').value || null,
  };
  if (!eventData.breeding_method || !eventData.dam_id || !eventData.breeding_date) {
    showToast('Please select method, dam and breeding date.', 'error');
    return;
  }
  try {
    await apiFetch(`/api/breeders/${breederId}/breeding-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(eventData)
    });
    closeModal();
    form.reset();
    showToast('Breeding event registered.', 'success');
    await loadBreedingEventsPageData();
  } catch (err) {
    showToast(`Could not register breeding event: ${err.message}`, 'error');
  }
}

// Handles phase8 date behavior for this page.
function phase8Date(value) {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
// Handles phase8 text behavior for this page.
function phase8Text(value, fallback = '—') { return value === null || value === undefined || value === '' ? fallback : String(value); }
// Handles phase8 download csv behavior for this page.
function phase8DownloadCsv(filename, headers, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map(row => row.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
// Handles phase8 load animals events summary behavior for this page.
async function phase8LoadAnimalsEventsSummary() {
  const [animals, events, summary] = await Promise.all([
    apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => []),
    apiFetch(`/api/breeders/${breederId}/report-summary`, { headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => null),
  ]);
  allAnimals = animals || [];
  return { animals: allAnimals, events: events || [], summary };
}
// Handles phase8 event status behavior for this page.
function phase8EventStatus(ev) {
  if (ev.outcome === 'live_birth') return `Live birth (${ev.live_offspring_count ?? ev.offspring_count ?? 0} live)`;
  if (ev.outcome) return ev.outcome.replaceAll('_', ' ');
  if (ev.status) return ev.status.replaceAll('_', ' ');
  return 'Pending';
}
// Handles phase8 ensure card behavior for this page.
function phase8EnsureCard(containerId, title) {
  let el = document.getElementById(containerId);
  if (el) return el;
  const main = document.querySelector('.main-content') || document.querySelector('main') || document.body;
  const card = document.createElement('section');
  card.className = 'info-card phase8-card';
  card.innerHTML = `<h3>${title}</h3><div id="${containerId}"></div>`;
  main.appendChild(card);
  return document.getElementById(containerId);
}

// Loads dashboard stats data from the API or page state.
async function loadDashboardStats() {
  const { animals, events, summary } = await phase8LoadAnimalsEventsSummary();
  const s = summary?.summary || {};
  const closed = events.filter(e => ['live_birth', 'failed_conception', 'miscarriage', 'stillbirth', 'abortion'].includes(e.outcome));
  const live = closed.filter(e => e.outcome === 'live_birth').length;
  // Handles set behavior for this page.
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = phase8Text(val); };
  set('totalAnimals', s.total_animals ?? animals.length);
  set('maleCount', s.males ?? animals.filter(a => a.gender === 'male').length);
  set('femaleCount', s.females ?? animals.filter(a => a.gender === 'female').length);
  set('pregnancies', s.active_pregnancies ?? events.filter(e => e.status === 'confirmed_pregnant' && !e.outcome).length);
  set('birthsThisYear', s.births_this_year ?? events.filter(e => e.outcome === 'live_birth' && new Date(e.outcome_date || e.expected_due_date || e.breeding_date).getFullYear() === new Date().getFullYear()).length);
  set('successRate', closed.length ? `${Math.round((live / closed.length) * 100)}%` : 'N/A');

  // Handles fill input or text behavior for this page.
  const fillInputOrText = (id, val) => { const el = document.getElementById(id); if (!el) return; if (el.tagName === 'INPUT') el.value = phase8Text(val, ''); else el.textContent = phase8Text(val); };
  fillInputOrText('farmName', breederData?.farm_name);
  fillInputOrText('farmLocation', breederData?.farm_location);
  fillInputOrText('animalType', breederData?.animal_type);
  fillInputOrText('approvalStatus', breederData?.status);
  fillInputOrText('breederEmail', breederData?.email);
  fillInputOrText('breederPhone', breederData?.phone);
  const recent = document.getElementById('recentAnimalsList');
  if (recent) {
    const ordered = [...animals].sort((a,b) => new Date(b.created_at || b.date_of_birth) - new Date(a.created_at || a.date_of_birth)).slice(0, 6);
    recent.innerHTML = ordered.length ? ordered.map(a => `<li><span class="animal-id">${a.animal_id}</span><span>${a.breed}</span><span>${a.gender}</span><span>${phase8Text(a.current_weight)} kg</span></li>`).join('') : '<li style="justify-content:center;color:#64748b;">No animals registered yet.</li>';
  }
  const upcoming = document.getElementById('upcomingEventsList');
  if (upcoming) {
    const map = new Map(animals.map(a => [a.id, a]));
    const due = events.filter(e => ['served','confirmed_pregnant'].includes(e.status) && !e.outcome && e.expected_due_date).sort((a,b)=>new Date(a.expected_due_date)-new Date(b.expected_due_date)).slice(0,6);
    upcoming.innerHTML = due.length ? due.map(e => `<li><span>${phase8Date(e.expected_due_date)}</span><span>Dam: ${map.get(e.dam_id)?.animal_id || e.dam_id}</span><span>${phase8EventStatus(e)}</span></li>`).join('') : '<li style="justify-content:center;color:#64748b;">No active breeding due dates.</li>';
  }
  const alertsBox = phase8EnsureCard('overviewAlerts', 'Operational Alerts');
  const alerts = summary?.alerts?.alerts || [];
  alertsBox.innerHTML = alerts.length ? alerts.map(a => `<div class="event-item"><strong>${a.animal_id}</strong> — ${a.message}<br><span>${phase8Date(a.due_date)} · ${a.days_remaining >= 0 ? a.days_remaining + ' days remaining' : Math.abs(a.days_remaining) + ' days overdue'}</span></div>`).join('') : '<p style="color:#64748b;">No urgent alerts. Your reproductive workflow is up to date.</p>';
}

// Handles export to csv behavior for this page.
async function exportToCsv() {
  const animals = allAnimals.length ? allAnimals : await apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!animals.length) return showToast('No animals to export.', 'warning');
  const map = new Map(animals.map(a => [a.id, a.animal_id]));
  phase8DownloadCsv(`animals_${new Date().toISOString().slice(0,10)}.csv`,
    ['Animal ID','Type','Breed','Gender','DOB','Current Weight','Health','Fertility','Production Type','Sire','Dam','Created'],
    animals.map(a => [a.animal_id, a.animal_type, a.breed, a.gender, a.date_of_birth, a.current_weight, a.health_status, a.fertility_status, a.production_type, a.sire_id ? map.get(a.sire_id) || a.sire_id : '', a.dam_id ? map.get(a.dam_id) || a.dam_id : '', a.created_at])
  );
}
// Handles export all animals csv behavior for this page.
// Handles export all events csv behavior for this page.
// Loads offspring history page data data from the API or page state.
async function loadOffspringHistoryPageData() {
  const { animals, events } = await phase8LoadAnimalsEventsSummary();
  const map = new Map(animals.map(a => [a.id, a]));
  animalMapForExports = map;
  const liveBirthEvents = events.filter(e => e.outcome === 'live_birth' || e.offspring_id);
  offspringHistoryData = liveBirthEvents;
  const tbody = document.getElementById('offspringTableBody');
  if (tbody) {
    tbody.innerHTML = liveBirthEvents.length ? liveBirthEvents.map(e => {
      const offspring = map.get(e.offspring_id);
      return `<tr>
        <td>${offspring?.animal_id || (e.offspring_id ? `DB:${e.offspring_id}` : `${e.live_offspring_count ?? e.offspring_count ?? 0} offspring`)}</td>
        <td>${phase8Date(offspring?.date_of_birth || e.outcome_date || e.expected_due_date)}</td>
        <td>${e.sire_id ? (map.get(e.sire_id)?.animal_id || e.sire_id) : '—'}</td>
        <td>${map.get(e.dam_id)?.animal_id || e.dam_id}</td>
        <td><span class="offspring-chip">${phase8Text(e.breeding_method)}</span></td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">No live birth / offspring history recorded yet.</td></tr>';
  }
  renderMonthlyTrendsChart(liveBirthEvents, map);
  const totalBox = phase8EnsureCard('offspringSummaryBox', 'Offspring Summary');
  const liveTotal = liveBirthEvents.reduce((sum, e) => sum + Number(e.live_offspring_count ?? e.offspring_count ?? (e.offspring_id ? 1 : 0)), 0);
  totalBox.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-value">${liveBirthEvents.length}</div><div class="stat-label">Birth Events</div></div><div class="stat-card"><div class="stat-value">${liveTotal}</div><div class="stat-label">Live Offspring</div></div></div>`;
}

// Handles export offspring to csv behavior for this page.
function exportOffspringToCsv() {
  if (!offspringHistoryData.length) return showToast('No offspring history to export.', 'warning');
  phase8DownloadCsv(`offspring_history_${new Date().toISOString().slice(0,10)}.csv`,
    ['Event ID','Date','Dam','Sire','Offspring Animal','Total Offspring','Live Offspring','Method','Outcome'],
    offspringHistoryData.map(e => {
      const off = animalMapForExports.get(e.offspring_id);
      return [e.id, e.outcome_date || e.expected_due_date || e.breeding_date, animalMapForExports.get(e.dam_id)?.animal_id || e.dam_id, e.sire_id ? animalMapForExports.get(e.sire_id)?.animal_id || e.sire_id : '', off?.animal_id || '', e.offspring_count, e.live_offspring_count, e.breeding_method, e.outcome];
    })
  );
}

// Loads reports page data from the API or page state.
// Loads settings page data data from the API or page state.
async function loadSettingsPageData() {
  if (!breederData) await loadBreederData();
  // Handles set behavior for this page.
  const set = (id, val) => { const el = document.getElementById(id); if (!el) return; if (el.tagName === 'INPUT') el.value = phase8Text(val, ''); else el.textContent = phase8Text(val); };
  set('farmName', breederData.farm_name); set('farmLocation', breederData.farm_location); set('animalType', breederData.animal_type);
  set('breederEmail', breederData.email); set('breederPhone', breederData.phone); set('settingsStatusBadge', breederData.status);
  const activity = phase8EnsureCard('settingsActivityLogs', 'Recent Security & Activity Logs');
  try {
    const logs = await apiFetch(`/api/breeders/${breederId}/activity-logs`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const items = logs.logs || [];
    activity.innerHTML = items.length ? `<table class="records-table"><thead><tr><th>Date</th><th>Action</th><th>Target</th></tr></thead><tbody>${items.map(l => `<tr><td>${phase8Text(l.created_at)}</td><td>${phase8Text(l.action).replaceAll('_',' ')}</td><td>${phase8Text(l.target_type)} ${phase8Text(l.target_id,'')}</td></tr>`).join('')}</tbody></table>` : '<p style="color:#64748b;">No activity logs yet.</p>';
  } catch (e) { activity.innerHTML = '<p style="color:#64748b;">Activity logs unavailable.</p>'; }
}

// Handles phase8 handle settings update behavior for this page.
async function phase8HandleSettingsUpdate(e) {
  e.preventDefault(); e.stopImmediatePropagation();
  const payload = {
    farm_name: document.getElementById('farmName')?.value || null,
    farm_location: document.getElementById('farmLocation')?.value || null,
    email: document.getElementById('breederEmail')?.value || null,
    phone: document.getElementById('breederPhone')?.value || null,
  };
  try {
    breederData = await apiFetch(`/api/breeders/${breederId}/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(payload) });
    showToast('Settings saved successfully.', 'success');
    await loadSettingsPageData();
  } catch (err) { showToast(`Could not save settings: ${err.message}`, 'error'); }
}

// Runs page setup after the HTML document is ready.
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('settingsForm')?.addEventListener('submit', phase8HandleSettingsUpdate, true);
});

// Handles phase9 text behavior for this page.
function phase9Text(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

// Handles phase9 date behavior for this page.
function phase9Date(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
}

// Handles phase9 date time behavior for this page.
function phase9DateTime(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleString();
}

// Handles phase9 title case behavior for this page.
function phase9TitleCase(value) {
  return phase9Text(value, '').replaceAll('_', ' ').replace(/\b\w/g, s => s.toUpperCase()) || '—';
}

// Handles phase9 current page behavior for this page.
function phase9CurrentPage() {
  return window.location.pathname.split('/').pop() || 'overview.html';
}

// Handles phase9 enhance page shell behavior for this page.
function phase9EnhancePageShell() {
  const page = phase9CurrentPage();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href === 'breeding_events.html') item.innerHTML = '<span class="nav-icon"><i class="fa-solid fa-heart-pulse"></i></span>Breeding &amp; Pregnancy';
    if (href === 'offspring_history.html') item.innerHTML = '<span class="nav-icon"><i class="fa-solid fa-baby"></i></span>Offspring Register';
    if (href === 'genetics.html') item.innerHTML = '<span class="nav-icon"><i class="fa-solid fa-dna"></i></span>Genetics &amp; Recommendations';
    if (href === page) item.classList.add('active');
  });
  const header = document.querySelector('.main-content .page-header');
  if (!header || header.querySelector('.notification-center')) return;
  const existingRight = header.querySelector('.breeder-select, .header-actions, .page-header-actions');
  const actions = document.createElement('div');
  actions.className = 'page-header-actions';
  actions.innerHTML = `
    <div class="notification-center" id="notificationCenter">
      <button type="button" class="notification-bell" id="notificationBell" title="Notifications" aria-label="Notifications">
        <i class="fa fa-bell"></i><span class="notification-count hidden" id="notificationCount">0</span>
      </button>
      <div class="notification-dropdown" id="notificationDropdown">
        <div class="notification-dropdown-header"><h3>Notifications</h3><a href="breeding_events.html">Open workflow</a></div>
        <div class="notification-list" id="notificationList"><div class="empty-notifications">Loading notifications…</div></div>
      </div>
    </div>`;
  if (existingRight) {
    actions.appendChild(existingRight);
  }
  header.appendChild(actions);
}

// Handles phase9 load notification center behavior for this page.
async function phase9LoadNotificationCenter() {
  if (!breederId || !document.getElementById('notificationCenter')) return;
  const countEl = document.getElementById('notificationCount');
  const listEl = document.getElementById('notificationList');
  try {
    const payload = await apiFetch(`/api/breeders/${breederId}/breeding-alerts`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const alerts = payload.alerts || [];
    const urgent = alerts.filter(a => Number(a.days_remaining ?? 999) <= 14 || String(a.severity || '').toLowerCase() === 'critical');
    if (countEl) {
      countEl.textContent = urgent.length > 9 ? '9+' : String(urgent.length);
      countEl.classList.toggle('hidden', urgent.length === 0);
    }
    if (listEl) {
      listEl.innerHTML = alerts.length ? alerts.slice(0, 8).map(a => {
        const days = Number(a.days_remaining ?? 0);
        const severity = days < 0 ? 'critical' : days <= 14 ? 'warning' : 'info';
        const meta = days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`;
        return `<a class="notification-item ${severity}" href="breeding_events.html">
          <div class="notification-icon"><i class="fa ${severity === 'critical' ? 'fa-triangle-exclamation' : 'fa-calendar-check'}"></i></div>
          <div>
            <div class="notification-title">${phase9Text(a.animal_id, 'Breeding follow-up')}</div>
            <div class="notification-message">${phase9Text(a.message, 'Action required')}</div>
            <div class="notification-meta">${phase9Date(a.due_date)} · ${meta}</div>
          </div>
        </a>`;
      }).join('') : '<div class="empty-notifications"><i class="fa fa-circle-check" style="color:#16a34a;font-size:1.4rem;"></i><br><br>No urgent reproductive alerts. Your workflow is up to date.</div>';
    }
  } catch (err) {
    if (listEl) listEl.innerHTML = `<div class="empty-notifications">Could not load notifications: ${err.message}</div>`;
  }
}

// Handles phase9 init notification bell behavior for this page.
function phase9InitNotificationBell() {
  const bell = document.getElementById('notificationBell');
  const dropdown = document.getElementById('notificationDropdown');
  if (!bell || !dropdown || bell.dataset.phase9Ready) return;
  bell.dataset.phase9Ready = '1';
  bell.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
    phase9LoadNotificationCenter();
  });
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && !bell.contains(e.target)) dropdown.classList.remove('show');
  });
}

// Handles phase9 add overview quick actions behavior for this page.
function phase9AddOverviewQuickActions() {
  if (phase9CurrentPage() !== 'overview.html') return;
  const header = document.querySelector('.main-content .page-header');
  if (!header || document.getElementById('phase9QuickActions')) return;
  const quick = document.createElement('div');
  quick.id = 'phase9QuickActions';
  quick.className = 'quick-actions-grid';
  quick.innerHTML = `
    <a class="quick-action-card" href="animal_management.html"><div class="quick-action-icon"><i class="fa fa-plus"></i></div><div><div class="quick-action-title">Register Animal</div><div class="quick-action-desc">Add identity and pedigree data.</div></div></a>
    <a class="quick-action-card" href="breeding_events.html"><div class="quick-action-icon"><i class="fa fa-heart-pulse"></i></div><div><div class="quick-action-title">Breeding & Pregnancy</div><div class="quick-action-desc">Record service, confirmation, and delivery.</div></div></a>
    <a class="quick-action-card" href="reports.html"><div class="quick-action-icon"><i class="fa fa-chart-line"></i></div><div><div class="quick-action-title">View Reports</div><div class="quick-action-desc">Check farm, fertility, and offspring performance.</div></div></a>
    <a class="quick-action-card" href="genetics.html"><div class="quick-action-icon"><i class="fa fa-dna"></i></div><div><div class="quick-action-title">Genetics Recommendations</div><div class="quick-action-desc">Review confidence-based breeding guidance.</div></div></a>`;
  header.insertAdjacentElement('afterend', quick);
}
const phase9OriginalRenderAnimalTable = typeof renderAnimalTable === 'function' ? renderAnimalTable : null;
renderAnimalTable = function phase9RenderAnimalTable() {
  const tbody = document.getElementById('animalsTableBody');
  const countEl = document.getElementById('showingCount');
  if (!tbody) return phase9OriginalRenderAnimalTable?.();
  const filteredAnimals = typeof getFilteredAnimals === 'function' ? getFilteredAnimals() : allAnimals;
  if (countEl) countEl.textContent = `Showing ${filteredAnimals.length} of ${allAnimals.length}`;
  if (!filteredAnimals.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:#6B7280;">No animals match the current filters.</td></tr>';
    return;
  }
  const animalIdMap = new Map(allAnimals.map(animal => [animal.id, animal.animal_id]));
  tbody.innerHTML = filteredAnimals.map(a => {
    const sireId = a.sire_id ? animalIdMap.get(a.sire_id) || `ID: ${a.sire_id}` : '—';
    const damId = a.dam_id  ? animalIdMap.get(a.dam_id)  || `ID: ${a.dam_id}` : '—';
    const profileUrl = `animal_profile.html?id=${encodeURIComponent(a.id)}`;
    return `<tr>
      <td><a href="${profileUrl}" style="font-weight:800;color:#2563eb;text-decoration:none;">${phase9Text(a.animal_id)}</a></td>
      <td>${phase9TitleCase(a.animal_type)}</td>
      <td>${phase9Text(a.breed)}</td>
      <td>${phase9TitleCase(a.gender)}</td>
      <td>${phase9Date(a.date_of_birth)}</td>
      <td>${a.current_weight ? `${a.current_weight} kg` : '—'}</td>
      <td>${sireId}</td>
      <td>${damId}</td>
      <td class="actions-cell">
        <button class="actions-btn" onclick="toggleActions(event)" aria-label="Animal actions">&#8942;</button>
        <div class="actions-dropdown">
          <a href="${profileUrl}">📋 Open Full Profile</a>
          <a href="#" onclick="event.preventDefault(); openEditAnimalModal(${a.id})">✏️ Edit Basic Details</a>
          <a href="#" onclick="event.preventDefault(); openWeightRecordModal(${a.id})">⚖️ Record Weight</a>
          <a href="#" onclick="event.preventDefault(); showPedigree('${a.animal_id}')">🧬 View Pedigree</a>
          <a href="#" onclick="event.preventDefault(); showQrCode('${a.animal_id}')">📱 Get QR Code</a>
          <a href="#" onclick="event.preventDefault(); deleteAnimal('${a.animal_id}', ${a.id})" class="delete">🗑 Delete Animal</a>
        </div>
      </td>
    </tr>`;
  }).join('');
};

// Handles phase9 load animal profile page behavior for this page.
async function phase9LoadAnimalProfilePage() {
  if (phase9CurrentPage() !== 'animal_profile.html') return;
  const params = new URLSearchParams(window.location.search);
  const animalDbId = params.get('id');
  const root = document.getElementById('animalProfileRoot');
  if (!animalDbId || !root) {
    if (root) root.innerHTML = '<div class="profile-card">No animal selected. Return to Animals and open a profile.</div>';
    return;
  }
  try {
    root.innerHTML = '<div class="profile-card">Loading animal profile…</div>';
    const profile = await apiFetch(`/api/breeders/${breederId}/animals/${animalDbId}/profile`, { headers: { Authorization: `Bearer ${getToken()}` } });
    phase9RenderAnimalProfile(profile);
  } catch (err) {
    root.innerHTML = `<div class="profile-card" style="color:#dc2626;">Could not load animal profile: ${err.message}</div>`;
  }
}

// Handles phase9 field behavior for this page.
function phase9Field(label, value, suffix = '') {
  const finalValue = value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`;
  return `<div class="profile-field"><span class="profile-label">${label}</span><span class="profile-value">${finalValue}</span></div>`;
}

// Handles phase9 timeline behavior for this page.
function phase9Timeline(items, mapper, empty = 'No records captured yet.') {
  if (!items || !items.length) return `<div class="profile-card"><p style="color:#64748b;">${empty}</p></div>`;
  return `<div class="timeline-list">${items.map(mapper).join('')}</div>`;
}

// Handles phase9 render animal profile behavior for this page.
function phase9RenderAnimalProfile(profile) {
  const root = document.getElementById('animalProfileRoot');
  const a = profile.animal || {};
  const title = document.getElementById('animalProfileTitle');
  if (title) title.textContent = `${phase9Text(a.animal_id)} Animal Profile`;
  const dataQuality = [
    ['Measurement records', profile.measurements?.length],
    ['Health records', profile.health_records?.length],
    ['Fertility records', profile.fertility_records?.length],
    ['Production records', profile.production_records?.length],
    ['Offspring records', profile.offspring_records?.length],
    ['Notes', profile.notes?.length],
  ];
  root.innerHTML = `
    <section class="profile-hero">
      <div class="profile-hero-grid">
        <div>
          <h1 class="profile-title">${phase9Text(a.animal_id)}</h1>
          <div class="profile-subtitle">${phase9TitleCase(a.animal_type)} · ${phase9Text(a.breed)} · ${phase9TitleCase(a.gender)} · Born ${phase9Date(a.date_of_birth)}</div>
          <div class="profile-badges">
            <span class="profile-badge">Current weight: ${a.current_weight ? a.current_weight + ' kg' : 'Not recorded'}</span>
            <span class="profile-badge">Health: ${phase9TitleCase(a.health_status)}</span>
            <span class="profile-badge">Fertility: ${phase9TitleCase(a.fertility_status)}</span>
          </div>
        </div>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;justify-content:flex-end;">
          <a href="animal_management.html" class="profile-badge" style="text-decoration:none;color:#fff;">Back to Animals</a>
          <a href="genetics.html" class="profile-badge" style="text-decoration:none;color:#fff;">Genetics</a>
        </div>
      </div>
    </section>
    <div class="profile-tabs" id="profileTabs">
      ${['Summary','Measurements','Health','Fertility','Production','Offspring','Notes','Data Quality'].map((t,i)=>`<button class="profile-tab ${i===0?'active':''}" data-target="${t.toLowerCase().replace(' ','-')}">${t}</button>`).join('')}
    </div>
    <section class="profile-section active" id="summary">
      <div class="profile-card-grid">
        <div class="profile-card"><h3>Identity & Pedigree</h3>${phase9Field('Animal ID', a.animal_id)}${phase9Field('Type', phase9TitleCase(a.animal_type))}${phase9Field('Breed', a.breed)}${phase9Field('Gender', phase9TitleCase(a.gender))}${phase9Field('Date of Birth', phase9Date(a.date_of_birth))}${phase9Field('Sire DB ID', a.sire_id)}${phase9Field('Dam DB ID', a.dam_id)}</div>
        <div class="profile-card"><h3>Latest Growth Snapshot</h3>${phase9Field('Current Weight', a.current_weight, a.current_weight ? ' kg' : '')}${phase9Field('Birth Weight', a.birth_weight, a.birth_weight ? ' kg' : '')}${phase9Field('Weaning Weight', a.weaning_weight, a.weaning_weight ? ' kg' : '')}${phase9Field('Mature Weight', a.mature_weight, a.mature_weight ? ' kg' : '')}${phase9Field('Body Condition Score', a.body_condition_score)}${phase9Field('Average Daily Gain', a.average_daily_gain, a.average_daily_gain ? ' kg/day' : '')}</div>
        <div class="profile-card"><h3>Breeding Intelligence Snapshot</h3>${phase9Field('Health Status', phase9TitleCase(a.health_status))}${phase9Field('Vaccination Status', phase9TitleCase(a.vaccination_status))}${phase9Field('Fertility Status', phase9TitleCase(a.fertility_status))}${phase9Field('Production Type', phase9TitleCase(a.production_type))}${phase9Field('Offspring Survival', a.offspring_survival_rate, a.offspring_survival_rate ? '%' : '')}</div>
      </div>
    </section>
    <section class="profile-section" id="measurements">${phase9Timeline(profile.measurements, r => `<div class="timeline-item"><div class="timeline-title">${phase9Text(r.value)} ${phase9Text(r.unit,'kg')}</div><div class="timeline-meta">${phase9Date(r.measured_at)} · ${phase9Text(r.measurement_type,'weight')}<br>${phase9Text(r.notes,'')}</div></div>`)}</section>
    <section class="profile-section" id="health">${phase9Timeline(profile.health_records, r => `<div class="timeline-item"><div class="timeline-title">${phase9TitleCase(r.health_status)}</div><div class="timeline-meta">${phase9Date(r.record_date)} · Vaccination: ${phase9TitleCase(r.vaccination_status)}<br>Disease: ${phase9Text(r.disease_history)}<br>Hereditary: ${phase9Text(r.hereditary_conditions)}<br>${phase9Text(r.vet_notes,'')}</div></div>`)}</section>
    <section class="profile-section" id="fertility">${phase9Timeline(profile.fertility_records, r => `<div class="timeline-item"><div class="timeline-title">${phase9TitleCase(r.fertility_status)}</div><div class="timeline-meta">${phase9Date(r.record_date)} · Services/conception: ${phase9Text(r.services_per_conception)} · Birth interval: ${phase9Text(r.birth_interval_days)} days<br>${phase9Text(r.notes,'')}</div></div>`)}</section>
    <section class="profile-section" id="production">${phase9Timeline(profile.production_records, r => `<div class="timeline-item"><div class="timeline-title">${phase9TitleCase(r.production_type)}</div><div class="timeline-meta">${phase9Date(r.record_date)} · Milk: ${phase9Text(r.daily_milk_yield)} L · Eggs/year: ${phase9Text(r.egg_count_annual)} · ADG: ${phase9Text(r.average_daily_gain)}<br>${phase9Text(r.notes,'')}</div></div>`)}</section>
    <section class="profile-section" id="offspring">${phase9Timeline(profile.offspring_records, r => `<div class="timeline-item"><div class="timeline-title">${phase9Text(r.offspring_count)} offspring recorded</div><div class="timeline-meta">${phase9Date(r.record_date)} · Survival: ${phase9Text(r.offspring_survival_rate)}% · Quality: ${phase9Text(r.offspring_quality_score)}<br>${phase9Text(r.notes,'')}</div></div>`)}</section>
    <section class="profile-section" id="notes">${phase9Timeline(profile.notes, r => `<div class="timeline-item"><div class="timeline-title">${phase9TitleCase(r.note_type)}</div><div class="timeline-meta">${phase9DateTime(r.created_at)}<br>${phase9Text(r.note)}</div></div>`)}</section>
    <section class="profile-section" id="data-quality"><div class="data-quality-grid">${dataQuality.map(([label,count]) => `<div class="data-quality-item ${count ? 'good' : 'missing'}"><div class="data-quality-title">${label}</div><div class="data-quality-meta">${count ? `${count} record(s) captured` : 'Missing — recommendation confidence may be lower'}</div></div>`).join('')}</div></section>
  `;
  document.querySelectorAll('.profile-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.profile-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target)?.classList.add('active');
  }));
}

// Runs page setup after the HTML document is ready.
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(async () => {
    phase9EnhancePageShell();
    phase9InitNotificationBell();
    phase9AddOverviewQuickActions();
    if (breederId) {
      await phase9LoadNotificationCenter();
      await phase9LoadAnimalProfilePage();
      if (window.__phase9NotificationTimer) clearInterval(window.__phase9NotificationTimer);
      window.__phase9NotificationTimer = setInterval(phase9LoadNotificationCenter, 60000);
    }
  }, 250);
});

// Handles phase10 page meta behavior for this page.
function phase10PageMeta() {
  const map = {
    'overview.html': ['Overview', 'Actionable farm intelligence, risks, and next steps.'],
    'animal_management.html': ['Animals', 'Register, search, export, and open full animal profiles.'],
    'animal_profile.html': ['Animal Profile', 'Full lifecycle record for one animal.'],
    'breeding_events.html': ['Breeding & Pregnancy', 'Manage service, confirmation, loss, delivery, and due-date follow-up.'],
    'offspring_history.html': ['Offspring Register', 'Live-birth records, survival visibility, and exportable offspring history.'],
    'genetics.html': ['Genetics & Recommendations', 'Confidence-based breeding guidance using pedigree and farm records.'],
    'reports.html': ['Reports', 'Organized farm, animal, fertility, offspring, and data-quality reports.'],
    'setting.html': ['Settings', 'Farm profile, account security, notifications, and activity logs.']
  };
  return map[phase9CurrentPage()] || ['Breeder Dashboard', ''];
}

// Handles phase10 enhance header behavior for this page.
function phase10EnhanceHeader() {
  const header = document.querySelector('.main-content .page-header');
  if (!header || header.dataset.phase10Ready) return;
  const [title, subtitle] = phase10PageMeta();
  let titleEl = header.querySelector('.page-title');
  if (!titleEl) return;
  if (!titleEl.parentElement.classList.contains('page-title-block')) {
    const wrap = document.createElement('div');
    wrap.className = 'page-title-block';
    titleEl.insertAdjacentElement('beforebegin', wrap);
    wrap.appendChild(titleEl);
  }
  titleEl.textContent = title;
  if (subtitle && !header.querySelector('.page-kicker')) {
    const kicker = document.createElement('span');
    kicker.className = 'page-kicker';
    kicker.textContent = subtitle;
    titleEl.insertAdjacentElement('afterend', kicker);
  }
  const actions = header.querySelector('.page-header-actions') || document.createElement('div');
  actions.className = 'page-header-actions';
  const select = header.querySelector('#breederSelect');
  const center = header.querySelector('#notificationCenter');
  if (!actions.parentElement) header.appendChild(actions);
  if (select) actions.appendChild(select);
  if (center) actions.appendChild(center);
  header.dataset.phase10Ready = '1';
}

// Handles phase10 safe percent behavior for this page.
function phase10SafePercent(num, den) {
  if (!den) return 0;
  return Math.max(0, Math.min(100, Math.round((num / den) * 100)));
}

// Handles phase10 outcome date behavior for this page.
function phase10OutcomeDate(e) {
  return e.outcome_date || e.expected_due_date || e.breeding_date;
}

// Handles phase10 data completeness behavior for this page.
function phase10DataCompleteness(animals) {
  if (!animals.length) return { percent: 0, missing: ['Register animals first'] };
  const checks = animals.map(a => ({
    weight: !!a.current_weight,
    health: !!a.health_status || !!a.vaccination_status,
    fertility: !!a.fertility_status || !!a.services_per_conception,
    pedigree: !!a.sire_id || !!a.dam_id,
    production: !!a.production_type || !!a.daily_milk_yield || !!a.average_daily_gain || !!a.egg_count_annual
  }));
  const keys = ['weight', 'health', 'fertility', 'pedigree', 'production'];
  const total = checks.length * keys.length;
  const filled = checks.reduce((sum, row) => sum + keys.filter(k => row[k]).length, 0);
  const missing = keys
    .map(k => [k, checks.filter(row => !row[k]).length])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, count]) => `${count} animal(s) missing ${k} data`);
  return { percent: phase10SafePercent(filled, total), missing };
}

// Handles phase10 render overview intelligence behavior for this page.
function phase10RenderOverviewIntelligence({ animals, events, summary }) {
  if (phase9CurrentPage() !== 'overview.html') return;
  const main = document.querySelector('.main-content');
  const stats = document.querySelector('.stats-container');
  if (!main || document.getElementById('phase10OverviewIntelligence')) return;
  const s = summary?.summary || {};
  const closed = events.filter(e => ['live_birth', 'failed_conception', 'miscarriage', 'stillbirth', 'abortion'].includes(e.outcome));
  const live = closed.filter(e => e.outcome === 'live_birth');
  const pendingChecks = s.pending_pregnancy_checks ?? events.filter(e => e.status === 'served' && !e.outcome && !e.pregnancy_confirmed).length;
  const activePregnancies = s.active_pregnancies ?? events.filter(e => e.status === 'confirmed_pregnant' && !e.outcome).length;
  const alerts = summary?.alerts?.alerts || [];
  const dataQuality = phase10DataCompleteness(animals);
  const successRate = phase10SafePercent(live.length, closed.length);
  const urgentAlerts = alerts.filter(a => Number(a.days_remaining ?? 999) <= 14).length;
  const overdueAlerts = alerts.filter(a => Number(a.days_remaining ?? 999) < 0).length;
  const nextBestActions = [];
  if (!animals.length) nextBestActions.push(['Register your first animal', 'animal_management.html']);
  if (pendingChecks) nextBestActions.push([`${pendingChecks} pregnancy confirmation(s) pending`, 'breeding_events.html']);
  if (overdueAlerts) nextBestActions.push([`${overdueAlerts} overdue reproductive follow-up(s)`, 'breeding_events.html']);
  if (dataQuality.percent < 70) nextBestActions.push(['Improve animal records for better genetics confidence', 'animal_management.html']);
  if (!nextBestActions.length) nextBestActions.push(['Review genetics recommendations', 'genetics.html']);
  const monthCounts = new Map();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthCounts.set(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, { label: d.toLocaleString('en-KE', { month:'short' }), count: 0 });
  }
  live.forEach(e => {
    const d = new Date(phase10OutcomeDate(e));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (monthCounts.has(key)) monthCounts.get(key).count += Number(e.live_offspring_count ?? e.offspring_count ?? 1);
  });
  const maxBirths = Math.max(1, ...[...monthCounts.values()].map(m => m.count));
  const hero = document.createElement('section');
  hero.id = 'phase10OverviewIntelligence';
  hero.innerHTML = `
    <div class="overview-hero">
      <h2>${breederData?.farm_name || 'Farm'} command center</h2>
      <p>This overview converts your animal, breeding, pregnancy, offspring, and health records into practical farm actions.</p>
    </div>
    <div class="intelligence-grid">
      <div class="intelligence-card span-4">
        <h3>Today’s Reproductive Workload</h3>
        <div class="intel-big">${urgentAlerts}</div>
        <div class="intel-caption">urgent notification(s) from due dates and follow-ups</div>
        <div style="margin-top:12px;"><span class="intel-status ${overdueAlerts ? 'danger' : urgentAlerts ? 'warning' : 'good'}">${overdueAlerts ? `${overdueAlerts} overdue` : urgentAlerts ? 'Needs attention' : 'Up to date'}</span></div>
      </div>
      <div class="intelligence-card span-4">
        <h3>Breeding Pipeline</h3>
        <div class="intel-big">${activePregnancies}</div>
        <div class="intel-caption">confirmed active pregnancy/pregnancies · ${pendingChecks} pending check(s)</div>
        <div class="progress-track"><div class="progress-fill" style="width:${phase10SafePercent(activePregnancies, Math.max(1, activePregnancies + pendingChecks))}%"></div></div>
      </div>
      <div class="intelligence-card span-4">
        <h3>Breeding Success</h3>
        <div class="intel-big">${closed.length ? `${successRate}%` : 'N/A'}</div>
        <div class="intel-caption">${live.length} successful birth event(s) out of ${closed.length} closed event(s)</div>
      </div>
      <div class="intelligence-card span-6">
        <h3>Data Quality for Genetics</h3>
        <div class="intel-big">${dataQuality.percent}%</div>
        <div class="progress-track"><div class="progress-fill" style="width:${dataQuality.percent}%"></div></div>
        <div class="intel-caption">${dataQuality.missing.length ? dataQuality.missing.join(' · ') : 'Core animal records look complete.'}</div>
      </div>
      <div class="intelligence-card span-6">
        <h3>Offspring Trend</h3>
        <div class="mini-chart">${[...monthCounts.values()].map(m => `<div class="mini-bar" style="height:${Math.max(6, (m.count/maxBirths)*100)}%" title="${m.count} offspring"><span>${m.label}</span></div>`).join('')}</div>
      </div>
      <div class="intelligence-card span-12">
        <h3>Recommended Next Actions</h3>
        <div class="action-list">${nextBestActions.slice(0,4).map(([label, href]) => `<div class="action-row"><strong>${label}</strong><a href="${href}">Open</a></div>`).join('')}</div>
      </div>
    </div>`;
  if (stats) stats.insertAdjacentElement('beforebegin', hero);
  else main.insertAdjacentElement('afterbegin', hero);
}
const phase10OriginalLoadDashboardStats = loadDashboardStats;
loadDashboardStats = async function phase10LoadDashboardStats() {
  const data = await phase8LoadAnimalsEventsSummary();
  const { animals, events, summary } = data;
  const s = summary?.summary || {};
  const closed = events.filter(e => ['live_birth', 'failed_conception', 'miscarriage', 'stillbirth', 'abortion'].includes(e.outcome));
  const live = closed.filter(e => e.outcome === 'live_birth').length;
  // Handles set behavior for this page.
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = phase8Text(val); };
  set('totalAnimals', s.total_animals ?? animals.length);
  set('maleCount', s.males ?? animals.filter(a => a.gender === 'male').length);
  set('femaleCount', s.females ?? animals.filter(a => a.gender === 'female').length);
  set('pregnancies', s.active_pregnancies ?? events.filter(e => e.status === 'confirmed_pregnant' && !e.outcome).length);
  set('birthsThisYear', s.births_this_year ?? events.filter(e => e.outcome === 'live_birth' && new Date(phase10OutcomeDate(e)).getFullYear() === new Date().getFullYear()).length);
  set('successRate', closed.length ? `${Math.round((live / closed.length) * 100)}%` : 'N/A');

  // Handles fill input or text behavior for this page.
  const fillInputOrText = (id, val) => { const el = document.getElementById(id); if (!el) return; if (el.tagName === 'INPUT') el.value = phase8Text(val, ''); else el.textContent = phase8Text(val); };
  fillInputOrText('farmName', breederData?.farm_name);
  fillInputOrText('farmLocation', breederData?.farm_location);
  fillInputOrText('animalType', breederData?.animal_type);
  fillInputOrText('approvalStatus', breederData?.status);
  fillInputOrText('breederEmail', breederData?.email);
  fillInputOrText('breederPhone', breederData?.phone);
  const recent = document.getElementById('recentAnimalsList');
  if (recent) {
    const ordered = [...animals].sort((a,b) => new Date(b.created_at || b.date_of_birth) - new Date(a.created_at || a.date_of_birth)).slice(0, 6);
    recent.innerHTML = ordered.length ? ordered.map(a => `<li><a class="table-link" href="animal_profile.html?id=${a.id}">${a.animal_id}</a><span>${phase8Text(a.breed)}</span><span>${phase8Text(a.gender)}</span><span>${a.current_weight ? a.current_weight + ' kg' : 'No weight'}</span></li>`).join('') : '<li style="justify-content:center;color:#64748b;">No animals registered yet.</li>';
  }
  const upcoming = document.getElementById('upcomingEventsList');
  if (upcoming) {
    const map = new Map(animals.map(a => [a.id, a]));
    const due = events.filter(e => ['served','confirmed_pregnant'].includes(e.status) && !e.outcome && e.expected_due_date).sort((a,b)=>new Date(a.expected_due_date)-new Date(b.expected_due_date)).slice(0,6);
    upcoming.innerHTML = due.length ? due.map(e => `<li><span>${phase8Date(e.expected_due_date)}</span><span>Dam: ${map.get(e.dam_id)?.animal_id || e.dam_id}</span><span>${phase8EventStatus(e)}</span></li>`).join('') : '<li style="justify-content:center;color:#64748b;">No active breeding due dates.</li>';
  }
  phase10RenderOverviewIntelligence(data);
};

// Handles phase10 ensure offspring toolbar behavior for this page.
function phase10EnsureOffspringToolbar() {
  if (phase9CurrentPage() !== 'offspring_history.html') return;
  const section = document.querySelector('.content-section');
  if (!section || document.getElementById('offspringSearch')) return;
  const toolbar = document.createElement('div');
  toolbar.className = 'offspring-toolbar';
  toolbar.innerHTML = `
    <input class="offspring-search" id="offspringSearch" placeholder="Search offspring, dam, sire, method, or outcome…">
    <div style="color:#64748b;font-size:13px;" id="offspringRecordCount">Loading records…</div>`;
  const table = section.querySelector('.table-container');
  table?.insertAdjacentElement('beforebegin', toolbar);
  document.getElementById('offspringSearch')?.addEventListener('input', () => phase10RenderOffspringRegister());
}

// Handles phase10 offspring rows behavior for this page.
function phase10OffspringRows() {
  const query = (document.getElementById('offspringSearch')?.value || '').trim().toLowerCase();
  return (offspringHistoryData || []).filter(e => {
    const off = animalMapForExports.get(e.offspring_id);
    const dam = animalMapForExports.get(e.dam_id);
    const sire = animalMapForExports.get(e.sire_id);
    const hay = [off?.animal_id, dam?.animal_id, sire?.animal_id, e.breeding_method, e.outcome, e.status, e.id].filter(Boolean).join(' ').toLowerCase();
    return !query || hay.includes(query);
  });
}

// Handles phase10 render offspring register behavior for this page.
function phase10RenderOffspringRegister() {
  const tbody = document.getElementById('offspringTableBody');
  if (!tbody) return;
  const rows = phase10OffspringRows();
  const countEl = document.getElementById('offspringRecordCount');
  if (countEl) countEl.textContent = `${rows.length} record(s) shown`;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#64748b;">No offspring records match the current search.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(e => {
    const off = animalMapForExports.get(e.offspring_id);
    const dam = animalMapForExports.get(e.dam_id);
    const sire = animalMapForExports.get(e.sire_id);
    const live = Number(e.live_offspring_count ?? e.offspring_count ?? (e.offspring_id ? 1 : 0));
    const total = Number(e.offspring_count ?? live);
    const survival = total ? Math.round((live / total) * 100) : (live ? 100 : 0);
    const offLabel = off ? `<a class="table-link" href="animal_profile.html?id=${off.id}">${off.animal_id}</a>` : `${live} offspring ${e.offspring_id ? `(DB:${e.offspring_id})` : ''}`;
    return `<tr>
      <td>${offLabel}<br><span style="color:#94a3b8;font-size:12px;">Event #${e.id}</span></td>
      <td>${phase8Date(phase10OutcomeDate(e))}</td>
      <td>${dam ? `<a class="table-link" href="animal_profile.html?id=${dam.id}">${dam.animal_id}</a>` : phase8Text(e.dam_id)}</td>
      <td>${sire ? `<a class="table-link" href="animal_profile.html?id=${sire.id}">${sire.animal_id}</a>` : '—'}</td>
      <td>${total || '—'} total / ${live || 0} live<br><span style="color:#64748b;font-size:12px;">${survival || 0}% survival</span></td>
      <td><span class="outcome-pill">${phase9TitleCase(e.outcome || 'live_birth')}</span></td>
      <td><span class="offspring-chip">${phase8Text(e.breeding_method)}</span></td>
    </tr>`;
  }).join('');
}
const phase10OriginalLoadOffspringHistoryPageData = loadOffspringHistoryPageData;
loadOffspringHistoryPageData = async function phase10LoadOffspringHistoryPageData() {
  const { animals, events } = await phase8LoadAnimalsEventsSummary();
  const map = new Map(animals.map(a => [a.id, a]));
  animalMapForExports = map;
  offspringHistoryData = events
    .filter(e => e.outcome === 'live_birth' || e.offspring_id || Number(e.live_offspring_count || 0) > 0)
    .sort((a,b) => new Date(phase10OutcomeDate(b)) - new Date(phase10OutcomeDate(a)));
  phase10EnsureOffspringToolbar();
  phase10RenderOffspringRegister();
  renderMonthlyTrendsChart(offspringHistoryData, map);
  let summaryMount = document.getElementById('phase10OffspringSummary');
  const firstSection = document.querySelector('.content-section');
  if (!summaryMount && firstSection) {
    summaryMount = document.createElement('div');
    summaryMount.id = 'phase10OffspringSummary';
    firstSection.insertAdjacentElement('beforebegin', summaryMount);
  }
  const totalEvents = offspringHistoryData.length;
  const totalBorn = offspringHistoryData.reduce((sum, e) => sum + Number(e.offspring_count ?? e.live_offspring_count ?? (e.offspring_id ? 1 : 0)), 0);
  const totalLive = offspringHistoryData.reduce((sum, e) => sum + Number(e.live_offspring_count ?? e.offspring_count ?? (e.offspring_id ? 1 : 0)), 0);
  const survival = phase10SafePercent(totalLive, totalBorn);
  if (summaryMount) {
    summaryMount.innerHTML = `<div class="offspring-summary-grid">
      <div class="offspring-summary-card"><div class="value">${totalEvents}</div><div class="label">Birth Events</div></div>
      <div class="offspring-summary-card"><div class="value">${totalBorn}</div><div class="label">Total Born</div></div>
      <div class="offspring-summary-card"><div class="value">${totalLive}</div><div class="label">Live Offspring</div></div>
      <div class="offspring-summary-card"><div class="value">${totalBorn ? survival + '%' : 'N/A'}</div><div class="label">Survival Rate</div></div>
    </div>`;
  }
};
const phase10OriginalExportOffspringToCsv = exportOffspringToCsv;
exportOffspringToCsv = function phase10ExportOffspringToCsv() {
  const rows = phase10OffspringRows ? phase10OffspringRows() : offspringHistoryData;
  if (!rows.length) return showToast('No offspring history to export.', 'warning');
  phase8DownloadCsv(`offspring_register_${new Date().toISOString().slice(0,10)}.csv`,
    ['Event ID','Date','Offspring Animal','Dam','Sire','Total Offspring','Live Offspring','Survival %','Method','Outcome','Status'],
    rows.map(e => {
      const off = animalMapForExports.get(e.offspring_id);
      const total = Number(e.offspring_count ?? e.live_offspring_count ?? (e.offspring_id ? 1 : 0));
      const live = Number(e.live_offspring_count ?? e.offspring_count ?? (e.offspring_id ? 1 : 0));
      return [e.id, phase10OutcomeDate(e), off?.animal_id || '', animalMapForExports.get(e.dam_id)?.animal_id || e.dam_id, e.sire_id ? animalMapForExports.get(e.sire_id)?.animal_id || e.sire_id : '', total, live, total ? Math.round((live/total)*100) : '', e.breeding_method, e.outcome, e.status];
    })
  );
};

// Handles phase10 update offspring table header behavior for this page.
function phase10UpdateOffspringTableHeader() {
  if (phase9CurrentPage() !== 'offspring_history.html') return;
  const headerRow = document.querySelector('table thead tr');
  if (!headerRow || headerRow.dataset.phase10Ready) return;
  headerRow.innerHTML = '<th>Offspring / Event</th><th>Birth Date</th><th>Dam</th><th>Sire</th><th>Survival</th><th>Outcome</th><th>Method</th>';
  headerRow.dataset.phase10Ready = '1';
}

// Runs page setup after the HTML document is ready.
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    phase10EnhanceHeader();
    phase10UpdateOffspringTableHeader();
    if (phase9CurrentPage() === 'offspring_history.html') phase10EnsureOffspringToolbar();
  }, 550);
});

// Handles phase10 birth event date behavior for this page.
function phase10BirthEventDate(event, animalMap) {
  const linkedOffspring = event && event.offspring_id ? animalMap.get(event.offspring_id) : null;
  return (
    linkedOffspring?.date_of_birth ||
    event?.outcome_date ||
    event?.expected_due_date ||
    event?.breeding_date ||
    null
  );
}

// Handles phase10 birth event count behavior for this page.
function phase10BirthEventCount(event) {
  const live = Number(event?.live_offspring_count);
  const total = Number(event?.offspring_count);
  if (Number.isFinite(live) && live > 0) return live;
  if (Number.isFinite(total) && total > 0) return total;
  if (event?.offspring_id) return 1;
  return 0;
}

// Renders monthly trends chart content in the page.
function renderMonthlyTrendsChart(events, animalMap) {
  const chartContainer = document.getElementById('monthlyTrendsChart');
  if (!chartContainer) return;
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('default', { month: 'short' }),
      count: 0,
      events: 0
    };
  });

  (events || []).forEach(event => {
    const rawDate = phase10BirthEventDate(event, animalMap || new Map());
    if (!rawDate) return;
    const birthDate = new Date(rawDate);
    if (Number.isNaN(birthDate.getTime())) return;
    const key = `${birthDate.getFullYear()}-${birthDate.getMonth()}`;
    const month = months.find(item => item.key === key);
    if (!month) return;
    const count = phase10BirthEventCount(event);
    if (count <= 0) return;

    month.count += count;
    month.events += 1;
  });
  const totalLive = months.reduce((sum, month) => sum + month.count, 0);
  const max = Math.max(...months.map(month => month.count), 1);
  if (totalLive === 0) {
    chartContainer.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:13px;text-align:center;">No live-birth data available for the last 12 months.</div>';
    return;
  }

  chartContainer.innerHTML = months.map(month => {
    const height = Math.max((month.count / max) * 100, month.count > 0 ? 6 : 0);
    return `
      <div style="display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;gap:6px;min-width:28px;">
        <div style="font-size:11px;color:#334155;font-weight:700;min-height:14px;">${month.count || ''}</div>
        <div style="width:62%;background:linear-gradient(180deg,#2563eb,#60a5fa);border-radius:6px 6px 0 0;height:${height}%;min-height:${month.count > 0 ? '6px' : '0'};transition:height 0.35s ease;" title="${month.count} live offspring from ${month.events} birth event(s)"></div>
        <div style="font-size:10px;color:#64748b;">${month.label}</div>
      </div>
    `;
  }).join('');
}

// Handles phase11 inject runtime styles behavior for this page.
function phase11InjectRuntimeStyles() {
  if (document.getElementById('phase11RuntimeStyles')) return;
  const style = document.createElement('style');
  style.id = 'phase11RuntimeStyles';
  style.textContent = `
    .main-content .page-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 18px !important;
      margin-bottom: 28px !important;
      padding: 18px 20px !important;
      background: rgba(255,255,255,0.92) !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 20px !important;
      box-shadow: 0 12px 30px rgba(15,23,42,.06) !important;
    }
    .main-content .page-title-block {
      min-width: 0 !important;
      flex: 1 1 auto !important;
    }
    .main-content .page-title {
      margin: 0 !important;
      font-size: 28px !important;
      font-weight: 850 !important;
      line-height: 1.05 !important;
      color: #0f172a !important;
      letter-spacing: -0.03em !important;
    }
    .main-content .page-kicker {
      display: block !important;
      margin-top: 7px !important;
      color: #64748b !important;
      font-size: 13px !important;
      font-weight: 500 !important;
    }
    .main-content .page-header-actions {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 12px !important;
      flex: 0 0 auto !important;
      flex-wrap: nowrap !important;
    }
    .main-content .page-header-actions .breeder-select,
    .main-content .page-header #breederSelect {
      height: 42px !important;
      min-width: 245px !important;
      border-radius: 14px !important;
      border: 1px solid #e2e8f0 !important;
      background: #fff !important;
      color: #0f172a !important;
      box-shadow: 0 1px 2px rgba(15,23,42,.04) !important;
    }
    .main-content .notification-center { position: relative !important; flex: 0 0 auto !important; }
    .main-content .notification-bell {
      width: 42px !important;
      height: 42px !important;
      border-radius: 14px !important;
      border: 1px solid #e2e8f0 !important;
      background: #fff !important;
      color: #1e293b !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 1px 2px rgba(15,23,42,.04) !important;
    }
    .main-content .notification-bell:hover { background:#eff6ff !important; color:#2563eb !important; border-color:#bfdbfe !important; }
    .nav-item .nav-icon i { min-width: 18px !important; display: inline-block !important; text-align: center !important; }
    .breeding-action-group {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      align-items: center !important;
      min-width: 260px !important;
    }
    .breeding-action-btn {
      border: 1px solid #e2e8f0 !important;
      background: #fff !important;
      color: #334155 !important;
      border-radius: 999px !important;
      padding: 8px 10px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      font-size: 12px !important;
      font-weight: 800 !important;
      cursor: pointer !important;
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }
    .breeding-action-btn:hover { transform: translateY(-1px) !important; box-shadow: 0 10px 22px rgba(15,23,42,.10) !important; }
    .breeding-action-btn.confirm { background:#ecfdf5 !important; color:#047857 !important; border-color:#a7f3d0 !important; }
    .breeding-action-btn.not-pregnant { background:#fff7ed !important; color:#c2410c !important; border-color:#fed7aa !important; }
    .breeding-action-btn.delivered { background:#eff6ff !important; color:#1d4ed8 !important; border-color:#bfdbfe !important; }
    .breeding-action-btn.loss { background:#fef2f2 !important; color:#b91c1c !important; border-color:#fecaca !important; }
    @media (max-width: 900px) {
      .main-content .page-header { flex-wrap: wrap !important; align-items: flex-start !important; }
      .main-content .page-header-actions { width: 100% !important; justify-content: space-between !important; }
      .main-content .page-header-actions .breeder-select,
      .main-content .page-header #breederSelect { min-width: 0 !important; flex: 1 1 auto !important; }
      .breeding-action-group { min-width: 0 !important; }
    }
  `;
  document.head.appendChild(style);
}

// Handles phase11 polish nav icons behavior for this page.
function phase11PolishNavIcons() {
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href === 'breeding_events.html') item.innerHTML = '<span class="nav-icon"><i class="fa-solid fa-heart-pulse"></i></span>Breeding &amp; Pregnancy';
    if (href === 'offspring_history.html') item.innerHTML = '<span class="nav-icon"><i class="fa-solid fa-baby"></i></span>Offspring Register';
    if (href === 'genetics.html') item.innerHTML = '<span class="nav-icon"><i class="fa-solid fa-dna"></i></span>Genetics &amp; Recommendations';
    if (href === phase9CurrentPage()) item.classList.add('active');
  });
}

// Handles export offspring to pdf behavior for this page.
function exportOffspringToPdf() {
  const rows = (typeof phase10OffspringRows === 'function') ? phase10OffspringRows() : (offspringHistoryData || []);
  if (!rows.length) return showToast('No offspring history to export.', 'warning');
  if (!window.jspdf || !window.jspdf.jsPDF) {
    return showToast('PDF library is not loaded. Please refresh the page and try again.', 'error');
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const title = 'Offspring Register';
  const exportedAt = new Date().toLocaleString();
  const farm = breederData?.farm_name || breederData?.full_name || 'Breeder';

  doc.setFontSize(18);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Farm/Breeder: ${farm}`, 14, 23);
  doc.text(`Exported: ${exportedAt}`, 14, 29);
  const body = rows.map(e => {
    const off = animalMapForExports.get(e.offspring_id);
    const dam = animalMapForExports.get(e.dam_id);
    const sire = animalMapForExports.get(e.sire_id);
    const total = Number(e.offspring_count ?? e.live_offspring_count ?? (e.offspring_id ? 1 : 0));
    const live = Number(e.live_offspring_count ?? e.offspring_count ?? (e.offspring_id ? 1 : 0));
    const survival = total ? `${Math.round((live / total) * 100)}%` : '—';
    return [
      e.id || '—',
      phase10OutcomeDate(e) ? phase8Date(phase10OutcomeDate(e)) : '—',
      off?.animal_id || (live ? `${live} live offspring` : '—'),
      dam?.animal_id || e.dam_id || '—',
      sire?.animal_id || e.sire_id || '—',
      total || '—',
      live || 0,
      survival,
      phase9TitleCase(e.outcome || 'live_birth'),
      phase9TitleCase(e.breeding_method || '—')
    ];
  });
  if (typeof doc.autoTable === 'function') {
    doc.autoTable({
      startY: 36,
      head: [['Event', 'Birth Date', 'Offspring', 'Dam', 'Sire', 'Total', 'Live', 'Survival', 'Outcome', 'Method']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 2: { cellWidth: 38 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28 } }
    });
  } else {
    let y = 38;
    body.slice(0, 28).forEach(row => {
      doc.text(row.join(' | '), 14, y);
      y += 6;
    });
  }

  doc.save(`offspring_register_${new Date().toISOString().slice(0, 10)}.pdf`);
}

window.exportOffspringToPdf = exportOffspringToPdf;

// Runs page setup after the HTML document is ready.
document.addEventListener('DOMContentLoaded', () => {
  phase11InjectRuntimeStyles();
  setTimeout(() => {
    phase11InjectRuntimeStyles();
    phase10EnhanceHeader();
    phase11PolishNavIcons();
  }, 750);
});

(function () {
  // Handles get sidebar parts behavior for this page.
  function getSidebarParts() {
    return {
      sidebar: document.getElementById('sidebar'),
      overlay: document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay'),
      toggle: document.getElementById('menu-toggle') || document.getElementById('menuToggle') || document.querySelector('.menu-toggle')
    };
  }

  // Handles set sidebar open behavior for this page.
  function setSidebarOpen(open) {
    const { sidebar, overlay, toggle } = getSidebarParts();
    if (!sidebar) return;
    sidebar.classList.toggle('active', !!open);
    overlay?.classList.toggle('active', !!open);
    toggle?.setAttribute('aria-expanded', String(!!open));
    document.body.classList.toggle('sidebar-open', !!open);
  }

  window.toggleMenu = function () {
    const { sidebar } = getSidebarParts();
    setSidebarOpen(!sidebar?.classList.contains('active'));
  };

  window.closeSidebar = function () {
    setSidebarOpen(false);
  };

  // Runs page setup after the HTML document is ready.
  document.addEventListener('DOMContentLoaded', function () {
    const { overlay, toggle } = getSidebarParts();
    if (toggle && !toggle.dataset.sidebarBound) {
      toggle.dataset.sidebarBound = 'true';
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.toggleMenu();
      });
    }
    overlay?.addEventListener('click', window.closeSidebar);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') window.closeSidebar();
    });
    document.querySelectorAll('.sidebar .nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        if (window.innerWidth <= 1100) window.closeSidebar();
      });
    });
  });
})();
