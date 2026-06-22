// ============================================================
// breeder/script.js  —  Breeder dashboard logic
// ============================================================
const API = window.location.origin + '/api';

// ── Helpers ───────────────────────────────────────────────────
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
  const res = await fetch(url, options);
  if (!res.ok) {
    if (res.status === 500) {
      throw new Error("Internal Server Error: Something went wrong on our end. Please try again later.");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Error ${res.status}`);
  }
  return res.json();
}

// Helper to normalize animal IDs to a standard PREFIX-XXX format
function normalizeAnimalId(input) {
  if (!input) return '';
  // Remove spaces and hyphens, convert to uppercase
  let cleaned = input.trim().toUpperCase().replace(/[\s-]/g, '');

  // Try to split into prefix (letters) and number
  const match = cleaned.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const number = match[2];
    // Pad number to 3 digits if it's shorter (e.g., "5" -> "005")
    const paddedNumber = number.padStart(3, '0');
    return `${prefix}-${paddedNumber}`;
  }
  return cleaned; // Return cleaned as-is if it doesn't fit the pattern
}

// ── Toast Notification System ─────────────────────────────────
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

// ── State ─────────────────────────────────────────────────────
let breederId = null;
let breederData = null;
let allAnimals = [];
let offspringHistoryData = [];
let animalMapForExports = new Map();
let currentPedigreeData = [];

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Password Visibility Toggle
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.textContent = isPwd ? '🙈' : '👁️';
    });
  });

  // Forgot Password Placeholder Logic
  document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Please contact the administrator to reset your password.', 'info');
  });

  // Lineage search listeners (needed on public pages)
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

      // Detect if input is an Animal ID (e.g., FAR-001) or a Breed name
      // Detect if input looks like an Animal ID (e.g., FAR-001, FAR001, FAR 1)
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
    return;
  }

  breederId = localStorage.getItem('breeder_id');
  if (!breederId) {
    console.warn('[Auth Guard] Breeder ID missing.');
    return;
  }

  initSidebar();
  initBreedingMethodToggle();
  initNotifications();
  initFilters();

  try {
    await loadBreederData();

    // Page-specific loaders
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
  } catch (err) {
    showToast('Failed to load dashboard data. Please refresh.', 'error');
  }

  // Forms
  document.getElementById('registerForm')?.addEventListener('submit', handleAnimalRegistration);
  document.getElementById('breedingForm')?.addEventListener('submit', handleBreedingEvent);
  document.getElementById('settingsForm')?.addEventListener('submit', e => {
    e.preventDefault();
    showToast('Settings saved!', 'success');
  });

  // Records page nav trigger
  document.querySelector('[data-section="records-page"]')?.addEventListener('click', () => {
    setTimeout(loadAnimalRecords, 100);
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', e => { e.preventDefault(); logout(); });

  // Global listener to close action dropdowns
  document.addEventListener('click', () => {
    document.querySelectorAll('.actions-dropdown.show').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
  });
});

  //  Sidebar nav ───────────────────────────────────────────────
function initSidebar() {
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');

  menuToggle?.addEventListener('click', () => sidebar?.classList.toggle('active'));

  navItems.forEach(item => {
    // Set active state based on current page
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'overview.html';
    if (item.getAttribute('href') === fileName) {
        item.classList.add('active');
    } else {
        item.classList.remove('active');
    }

    item.addEventListener('click', e => {
      // Closes the mobile sidebar on navigation. The browser handles the page change.
      if (window.innerWidth <= 768) sidebar?.classList.remove('active');
    });
  });
}

// ── Breeding method conditional fields ────────────────────────
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

// ── Filters ───────────────────────────────────────────────────
function initFilters() {
  document.getElementById('filterAnimalType')?.addEventListener('change', renderAnimalTable);
  document.getElementById('filterBreed')?.addEventListener('change', renderAnimalTable);
  document.getElementById('filterGender')?.addEventListener('change', renderAnimalTable);
}

// ── Notifications ─────────────────────────────────────────────
function initNotifications() {
  const bell = document.querySelector('.notification-bell');
  const dropdown = document.querySelector('.notification-dropdown');
  if (!bell || !dropdown) return;

  bell.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('show'); });
  document.addEventListener('click', e => {
    if (!bell.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('show');
  });
}

// ── Data loading ──────────────────────────────────────────────
async function loadBreederData() {
  const data = await apiFetch(`/api/breeders/${breederId}`, { headers: { Authorization: `Bearer ${getToken()}` } });

  // Validate that the API returned a valid breeder object, not an empty {}
  if (!data || !data.id) {
    throw new Error('Failed to load valid breeder profile. The API may have returned an invalid response.');
  }

  breederData = data;

  // Populate header select with current breeder
  const breederSelect = document.getElementById('breederSelect');
  if (breederSelect) {
      breederSelect.innerHTML = `<option value="${breederData.id}">${breederData.full_name} (${breederData.farm_name || 'No Farm Name'})</option>`;
  }
  return breederData;
}

// Loads dashboard stats data from the API or page state.
async function loadDashboardStats() {
  const [animals, events] = await Promise.all([
    apiFetch(`/api/breeders/${breederId}/animals`,          { headers: { Authorization: `Bearer ${getToken()}` } }),
    apiFetch(`/api/breeders/${breederId}/breeding-events`,  { headers: { Authorization: `Bearer ${getToken()}` } }),
  ]);

  // Calculate stats
  const maleCount = animals.filter(a => a.gender === 'male').length;
  const femaleCount = animals.filter(a => a.gender === 'female').length;
  const now = new Date();
  // Active pregnancies: No offspring yet, and due date is in the future
  const pregnancies = events.filter(ev => !ev.offspring_id && ev.expected_due_date && new Date(ev.expected_due_date) >= now).length;

  // Births this year: Based on due date (approx birth date) matching current year
  const birthsThisYear = events.filter(ev => {
    if (!ev.offspring_id) return false;
    const date = ev.expected_due_date ? new Date(ev.expected_due_date) : new Date(ev.breeding_date);
    return date.getFullYear() === now.getFullYear();
  }).length;

  // Success rate: Successful births / Completed events (excluding active pregnancies)
  const completedEvents = events.filter(ev => ev.offspring_id || (ev.expected_due_date && new Date(ev.expected_due_date) < now));
  const successfulEvents = events.filter(ev => ev.offspring_id).length;
  const successRate = completedEvents.length > 0 ? ((successfulEvents / completedEvents.length) * 100).toFixed(0) + '%' : 'N/A';

  // Handles set behavior for this page.
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      const displayVal = (val === null || val === undefined) ? '-' : val;
      // Handle both regular elements and input fields
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = displayVal;
      } else {
        el.textContent = displayVal;
      }
    }
  };
  set('totalAnimals', animals.length);
  set('maleCount', maleCount);
  set('femaleCount', femaleCount);
  set('pregnancies', pregnancies);
  set('birthsThisYear', birthsThisYear);
  set('successRate', successRate);

  // Populate breeder profile info
  set('farmName', breederData.farm_name);
  set('farmLocation', breederData.farm_location);
  set('animalType', breederData.animal_type);
  set('approvalStatus', breederData.status);
  set('breederEmail', breederData.email);
  set('breederPhone', breederData.phone);

  // Recent animals
  const recentList = document.getElementById('recentAnimalsList');
  if (recentList) {
    recentList.innerHTML = '';
    if (animals.length === 0) {
        recentList.innerHTML = '<li style="justify-content: center; color: #64748b;">No animals registered yet.</li>';
    } else {
        animals.slice(-5).reverse().forEach(a => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="animal-id">${a.animal_id}</span> <span class="animal-breed">${a.breed}</span> <span class="animal-gender">${a.gender}</span>`;
          recentList.appendChild(li);
        });
    }
  }

  // Upcoming events
  const upcoming = document.getElementById('upcomingEventsList');
  if (upcoming) {
    const animalIdMap = new Map(animals.map(a => [a.id, a.animal_id]));
    upcoming.innerHTML = '';
    const upcomingEvents = events
      .filter(ev => ev.expected_due_date)
      .sort((a, b) => new Date(a.expected_due_date) - new Date(b.expected_due_date));
    if (upcomingEvents.length === 0) {
        upcoming.innerHTML = '<li style="justify-content: center; color: #64748b;">No upcoming events.</li>';
    } else {
        upcomingEvents.slice(0, 5).forEach(ev => {
            const li = document.createElement('li');
            const damDisplayId = animalIdMap.get(ev.dam_id) || `ID: ${ev.dam_id}`;
            li.innerHTML = `<span class="event-date">${new Date(ev.expected_due_date).toLocaleDateString()}</span> <span class="event-dam">Dam: ${damDisplayId}</span>`;
            upcoming.appendChild(li);
        });
    }
  }
}

// Loads settings page data data from the API or page state.
async function loadSettingsPageData() {
  if (!breederData) await loadBreederData();

  // Handles set behavior for this page.
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      const displayVal = (val === null || val === undefined) ? '' : val;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = displayVal;
      } else {
        el.textContent = displayVal;
      }
    }
  };

  set('farmName', breederData.farm_name);
  set('farmLocation', breederData.farm_location);
  set('animalType', breederData.animal_type);
  set('breederEmail', breederData.email);
  set('breederPhone', breederData.phone);
}

// Loads breeding events page data data from the API or page state.
async function loadBreedingEventsPageData() {
    const [animals, events] = await Promise.all([
        (allAnimals.length > 0 ? Promise.resolve(allAnimals) : apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } })),
        apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${getToken()}` } })
    ]);
    if (allAnimals.length === 0) allAnimals = animals;
    const animalIdMap = new Map(animals.map(a => [a.id, a.animal_id]));

    // 1. Upcoming Due Dates
    const dueDatesContainer = document.getElementById('upcomingDueDates');
    if (dueDatesContainer) {
        const upcoming = events
            .filter(ev => ev.expected_due_date && new Date(ev.expected_due_date) >= new Date())
            .sort((a, b) => new Date(a.expected_due_date) - new Date(b.expected_due_date))
            .slice(0, 5);
        if (upcoming.length > 0) {
            dueDatesContainer.innerHTML = upcoming.map(ev => `
                <div class="event-item">
                    <div class="event-header">Dam: ${animalIdMap.get(ev.dam_id) || 'N/A'}</div>
                    <div class="event-details">Due: ${new Date(ev.expected_due_date).toLocaleDateString()}</div>
                </div>
            `).join('');
        } else {
            dueDatesContainer.innerHTML = '<p style="font-size:14px; color:#64748b;">No upcoming due dates.</p>';
        }
    }

    // 2. Breeding Method Breakdown
    const breakdownContainer = document.getElementById('methodBreakdown');
    if (breakdownContainer) {
        const counts = events.reduce((acc, ev) => {
            acc[ev.breeding_method] = (acc[ev.breeding_method] || 0) + 1;
            return acc;
        }, {});
        breakdownContainer.innerHTML = `
            <div class="method-item"><div class="method-count">${counts.ai || 0}</div><div class="method-label">AI</div></div>
            <div class="method-item"><div class="method-count">${counts.natural || 0}</div><div class="method-label">Natural</div></div>
            <div class="method-item"><div class="method-count">${(counts.et || 0) + (counts.ivf || 0)}</div><div class="method-label">ET / IVF</div></div>
        `;
    }

    // 3. Pregnancy Monitor (loaded via dedicated API)
    await loadPregnancyMonitor();
}

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

        // Summary stats
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
          </div>`;

        // Pregnancy cards
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
async function loadReportsPage() {
    // This function can pre-load data if needed, but for now, just attach listeners.
    // Ensure data is loaded before exporting.
    document.getElementById('generateFarmReportBtn')?.addEventListener('click', generateComprehensiveFarmReport);
    document.getElementById('generateBreedingReportBtn')?.addEventListener('click', generateBreedingPerformanceReport);
    document.getElementById('exportAllAnimalsCsvBtn')?.addEventListener('click', exportAllAnimalsCsv);
    document.getElementById('exportAllEventsCsvBtn')?.addEventListener('click', exportAllEventsCsv);
}

// ── Animal dropdowns ──────────────────────────────────────────
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
  // Use global allAnimals if available, otherwise fetch
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

  // Populate Animal Type Select
  const typeSelect = document.getElementById('animalType');
  if (typeSelect && typeSelect.tagName === 'SELECT') {
    const types = Object.keys(BREEDS);
    typeSelect.innerHTML = '<option value="">Select Type</option>' +
        types.map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');

    // Default to breeder type if valid
    if (breederData?.animal_type && types.includes(breederData.animal_type)) {
        typeSelect.value = breederData.animal_type;
    }

    // Update parents when type changes
    typeSelect.addEventListener('change', () => updateParentOptions(animals));
  }

  // Populate Animal Type Select for Breeding Form
  const breedingTypeSelect = document.getElementById('breedingAnimalType');
  if (breedingTypeSelect && breedingTypeSelect.tagName === 'SELECT') {
    const types = Object.keys(BREEDS);
    breedingTypeSelect.innerHTML = '<option value="">Select Animal Type</option>' +
        types.map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');

    breedingTypeSelect.addEventListener('change', () => updateParentOptions(animals));
  }

  // Helper to filter parents based on selected type
  function updateParentOptions(list) {
    const regType = document.getElementById('animalType')?.value;
    const eventType = document.getElementById('breedingAnimalType')?.value;
    const selectedType = regType || eventType;
    const filtered = selectedType ? list.filter(a => a.animal_type === selectedType) : list;
    const males = filtered.filter(a => a.gender === 'male');
    const females = filtered.filter(a => a.gender === 'female');

    // Enable/disable and populate based on type selection
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

  // Initial fill
  updateParentOptions(animals);

  // Breed dropdown depends on type + gender
  ['animalType','gender'].forEach(id => document.getElementById(id)?.addEventListener('change', updateBreedDropdown));
}

// ── Exporters ─────────────────────────────────────────────────
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
function exportToCsv() {
  const filteredAnimals = getFilteredAnimals();
  if (filteredAnimals.length === 0) {
    showToast('No animals to export.', 'warning');
    return;
  }
  const animalIdMap = new Map(allAnimals.map(animal => [animal.id, animal.animal_id]));
  const headers = ['Animal ID', 'Animal Type', 'Breed', 'Gender', 'Date of Birth', 'Sire ID', 'Dam ID'];
  const rows = filteredAnimals.map(a => {
    const sireId = a.sire_id ? animalIdMap.get(a.sire_id) || `DB_ID:${a.sire_id}` : '';
    const damId = a.dam_id  ? animalIdMap.get(a.dam_id)  || `DB_ID:${a.dam_id}` : '';
    return [
      a.animal_id, a.animal_type, a.breed, a.gender, new Date(a.date_of_birth).toLocaleDateString(), sireId, damId
    ].map(field => `"${String(field).replace(/"/g, '""')}"`); // Handle quotes
  });
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `animal_records_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
    headStyles: { fillColor: [37, 99, 235] }, // Blue header from color scheme
    styles: { fontSize: 8 },
  });

  doc.save(`animal_records_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── Animal records table ──────────────────────────────────────
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
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:#6B7280;">No animals match the current filters.</td></tr>';
    return;
  }

  // Use the full map for parent lookups, even when filtered
  const animalIdMap = new Map(allAnimals.map(animal => [animal.id, animal.animal_id]));

  filteredAnimals.forEach(a => {
    const row = document.createElement('tr');
    const sireId = a.sire_id ? animalIdMap.get(a.sire_id) || `ID: ${a.sire_id}` : '—';
    const damId = a.dam_id  ? animalIdMap.get(a.dam_id)  || `ID: ${a.dam_id}` : '—';

    row.innerHTML = /*html*/`
      <td>${a.animal_id}</td>
      <td>${a.animal_type}</td>
      <td>${a.breed}</td>
      <td>${a.gender}</td>
      <td>${new Date(a.date_of_birth).toLocaleDateString()}</td>
      <td>${sireId}</td>
      <td>${damId}</td>
      <td class="actions-cell">
        <button class="actions-btn" onclick="toggleActions(event)">&#8942;</button>
        <div class="actions-dropdown">
            <a href="#" onclick="event.preventDefault(); showPedigree('${a.animal_id}')">🧬 View Pedigree</a>
            <a href="#" onclick="event.preventDefault(); showQrCode('${a.animal_id}')">📱 Get QR Code</a>
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

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1rem;">Loading…</td></tr>';

  try {
    allAnimals = await apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } });

    populateFilterDropdowns(allAnimals);
    renderAnimalTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1rem;color:#E63946;">${err.message}</td></tr>`;
    const countEl = document.getElementById('showingCount');
    if (countEl) countEl.textContent = 'Error loading animals';
  }
}

// ── Form handlers ─────────────────────────────────────────────
async function handleAnimalRegistration(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Registering…';

  try {
    const animalData = {
      animal_type:   document.getElementById('animalType')?.value,
      breed:         document.getElementById('breed')?.value,
      gender:        document.getElementById('gender')?.value,
      date_of_birth: document.getElementById('dob')?.value,
      sire_id:       document.getElementById('sireForRegistration')?.value || null,
      dam_id:        document.getElementById('damForRegistration')?.value || null,
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

    // Close modal if open
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
    event.stopPropagation(); // Prevent the global click listener from closing it immediately
    const currentDropdown = event.currentTarget.nextElementSibling;

    // Close all other open dropdowns
    document.querySelectorAll('.actions-dropdown.show').forEach(dropdown => {
        if (dropdown !== currentDropdown) {
            dropdown.classList.remove('show');
        }
    });

    currentDropdown.classList.toggle('show');
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

        // Refresh data on the page
        allAnimals = []; // Force a re-fetch
        await loadAnimalRecords();
        // Optionally refresh dashboard stats if you are on that page or if it's always visible
        // await loadDashboardStats();
    } catch (err) {
        showToast(`Error deleting animal: ${err.message}`, 'error');
    }
}

// Loads offspring history page data data from the API or page state.
async function loadOffspringHistoryPageData() {
  const [animals, events] = await Promise.all([
    (allAnimals.length > 0 ? Promise.resolve(allAnimals) : apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } })),
    apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${getToken()}` } })
  ]);
  if (allAnimals.length === 0) allAnimals = animals;
  const animalMap = new Map(animals.map(a => [a.id, a]));
  animalMapForExports = animalMap;

  // Filter events that resulted in offspring
  const successfulEvents = events.filter(ev => ev.offspring_id);

  // Sort by date (newest first)
  successfulEvents.sort((a, b) => {
    const animalA = animalMap.get(a.offspring_id);
    const animalB = animalMap.get(b.offspring_id);
    const dateA = animalA ? new Date(animalA.date_of_birth) : new Date(a.expected_due_date || a.breeding_date);
    const dateB = animalB ? new Date(animalB.date_of_birth) : new Date(b.expected_due_date || b.breeding_date);
    return dateB - dateA;
  });

  offspringHistoryData = successfulEvents;
  const tbody = document.getElementById('offspringTableBody');
  if (tbody) {
    if (successfulEvents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">No offspring history found.</td></tr>';
    } else {
      tbody.innerHTML = successfulEvents.map(ev => {
        const offspring = animalMap.get(ev.offspring_id);
        const offspringDisplay = offspring ? offspring.animal_id : `ID: ${ev.offspring_id}`;
        const birthDate = offspring ? new Date(offspring.date_of_birth).toLocaleDateString() : 'Unknown';
        const sire = animalMap.get(ev.sire_id);
        const sireDisplay = sire ? sire.animal_id : (ev.sire_id ? `ID: ${ev.sire_id}` : '—');
        const dam = animalMap.get(ev.dam_id);
        const damDisplay = dam ? dam.animal_id : (ev.dam_id ? `ID: ${ev.dam_id}` : '—');
        return `
          <tr>
            <td>${offspringDisplay}</td>
            <td>${birthDate}</td>
            <td>${sireDisplay}</td>
            <td>${damDisplay}</td>
            <td><span class="offspring-chip">${ev.breeding_method}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  renderMonthlyTrendsChart(successfulEvents, animalMap);
}

// Renders monthly trends chart content in the page.
function renderMonthlyTrendsChart(events, animalMap) {
  const chartContainer = document.getElementById('monthlyTrendsChart');
  if (!chartContainer) return;
  const now = new Date();
  const months = Array.from({length: 12}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('default', { month: 'short' }), count: 0 };
  });

  events.forEach(ev => {
    const offspring = animalMap.get(ev.offspring_id);
    if (!offspring) return;
    const dob = new Date(offspring.date_of_birth);
    const key = `${dob.getFullYear()}-${dob.getMonth()}`;
    const m = months.find(x => x.key === key);
    if (m) m.count++;
  });
  const max = Math.max(...months.map(m => m.count), 1);

  chartContainer.innerHTML = months.map(m => {
    const h = (m.count / max) * 100;
    return `
      <div style="display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;gap:5px;">
        <div style="width:60%;background-color:#3b82f6;border-radius:4px 4px 0 0;height:${h}%;min-height:${m.count > 0 ? '4px' : '0'};transition:height 0.5s ease;" title="${m.count} births"></div>
        <div style="font-size:10px;color:#64748b;">${m.label}</div>
      </div>
    `;
  }).join('');
}

// ── Lineage Search ────────────────────────────────────────────
async function showPedigree(animalId) {
  const modalTitle = document.getElementById('pedigreeModalTitle');
  if (modalTitle) {
    modalTitle.textContent = `Pedigree for ${animalId}`;
  }
  openPedigreeModal(); // This function is in the HTML file's script tag
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

    // Unwrap the API success envelope { success: true, data: [...] } if present
    const json = await response.json();
    const lineageData = Array.isArray(json) ? json : (json.data ?? json);
    currentPedigreeData = Array.isArray(lineageData) ? lineageData : [];
    if (!currentPedigreeData.length) {
      resultsContainer.innerHTML = `<div class="no-results">No lineage information found for animal ID "${animalId}"</div>`;
      return;
    }
    const lineageHtml = generateLineageHtmlFromPostgres(currentPedigreeData);
    resultsContainer.innerHTML = lineageHtml;
    requestAnimationFrame(drawPedigreeConnectors);
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

    // Build an avatar-style pedigree node matching lineage_search.html visual style
    function buildNode(animal, roleLabel, roleKey, genderHint) {
        const emoji = genderHint === 'sire' ? '🐂' : '🐄';
        const avBorder = roleKey === 'self'  ? '#2D6A4F' :
                         roleKey === 'sire'  ? '#40916c' :
                         roleKey === 'dam'   ? '#d4a96a' : '#1B4332';
        const avSize = roleKey === 'self' ? '80px' : '68px';
        const avBorderW = roleKey === 'self' ? '4px' : '3px';
        const tagBg = roleKey === 'self'  ? '#2D6A4F' :
                         roleKey === 'sire'  ? 'rgba(64,145,108,.12)' :
                         roleKey === 'dam'   ? 'rgba(212,169,106,.2)' : 'rgba(27,67,50,.1)';
        const tagColor = roleKey === 'self'  ? '#fff' :
                         roleKey === 'sire'  ? '#40916c' :
                         roleKey === 'dam'   ? '#a07030' : '#1B4332';
        if (!animal) {
            return `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .18s;" onclick="openAnimalPopup(null,'${roleLabel}')">
                <div style="width:68px;height:68px;border-radius:50%;border:3px dashed #ddd;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:1.6rem;">❓</div>
                <div style="margin-top:.5rem;font-size:.78rem;font-weight:600;color:#475569;text-align:center;max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Unknown</div>
                <div style="font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-top:.2rem;padding:.1rem .45rem;border-radius:20px;background:#f0f0f0;color:#aaa;">${roleLabel}</div>
            </div>`;
        }
        const safeData = encodeURIComponent(JSON.stringify(animal));
        return `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .18s;" onmouseenter="this.style.transform='translateY(-3px)'" onmouseleave="this.style.transform=''" onclick="openAnimalPopup(decodeURIComponent('${safeData}'),'${roleLabel}')">
            <div style="width:${avSize};height:${avSize};border-radius:50%;border:${avBorderW} solid ${avBorder};background:#f8faf9;display:flex;align-items:center;justify-content:center;font-size:1.6rem;box-shadow:0 2px 12px rgba(0,0,0,.12);transition:box-shadow .18s;">${emoji}</div>
            <div style="margin-top:.5rem;font-size:.78rem;font-weight:600;color:#1e293b;text-align:center;max-width:88px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${animal.animal_id || '—'}</div>
            <div style="font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-top:.2rem;padding:.1rem .45rem;border-radius:20px;background:${tagBg};color:${tagColor};">${roleLabel}</div>
        </div>`;
    }
    const grandparentSection = hasGrandparents ? `
        <div style="text-align:center;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-weight:600;margin-bottom:.75rem;">Grandparents</div>
        <div id="pg-grand-row" style="display:flex;justify-content:center;gap:2.5rem;flex-wrap:wrap;margin-bottom:0;">
            ${buildNode(patGrandsire, 'Pat. Grandsire', 'grand', 'sire')}
            ${buildNode(patGranddam,  'Pat. Granddam',  'grand', 'dam')}
            ${buildNode(matGrandsire, 'Mat. Grandsire', 'grand', 'sire')}
            ${buildNode(matGranddam,  'Mat. Granddam',  'grand', 'dam')}
        </div>
        <div style="position:relative;height:36px;margin:0 auto;width:100%;">
            <svg id="pg-conn-grand" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;"></svg>
        </div>
    ` : '';
    const parentSection = `
        <div style="text-align:center;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-weight:600;margin-bottom:.75rem;">Parents</div>
        <div id="pg-parent-row" style="display:flex;justify-content:center;gap:4rem;margin-bottom:0;">
            ${buildNode(sire, 'Sire', 'sire', 'sire')}
            ${buildNode(dam,  'Dam',  'dam',  'dam')}
        </div>
        <div style="position:relative;height:36px;margin:0 auto;width:100%;">
            <svg id="pg-conn-parents" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;"></svg>
        </div>
    `;
    const subjectSection = `
        <div style="text-align:center;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-weight:600;margin-bottom:.75rem;">Subject</div>
        <div style="display:flex;justify-content:center;">
            ${buildNode(root, 'Subject', 'self', root.gender === 'male' ? 'sire' : 'dam')}
        </div>
    `;

    // Scoped detail grid for root animal
    const detailGrid = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #e2e8f0;">
            ${[
                ['Animal ID',   root.animal_id],
                ['Breed',       root.breed || '—'],
                ['Animal Type', root.animal_type || '—'],
                ['Gender',      root.gender === 'male' ? '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg> Male' : '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg> Female'],
                ['Date of Birth', fmtDate(root.date_of_birth)],
                ['Lineage Records', lineageData.length],
            ].map(([label, val]) => `
            <div>
                <div style="font-size:.73rem;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:600;margin-bottom:.3rem;">${label}</div>
                <div style="font-size:.92rem;color:#1e293b;font-weight:500;">${val}</div>
            </div>`).join('')}
        </div>
    `;
    return `
    <div id="pedigreeChartInner" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <!-- Green gradient header matching lineage_search style -->
        <div style="background:linear-gradient(135deg,#2D6A4F,#1B4332);border-radius:14px;padding:1.5rem 1.75rem;margin-bottom:1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
            <div>
                <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.55);margin-bottom:.25rem;">Pedigree Record</div>
                <div style="font-size:1.6rem;font-weight:700;font-family:'Playfair Display',Georgia,serif;">${root.animal_id}</div>
                <div style="font-size:.88rem;color:rgba(255,255,255,.8);margin-top:.2rem;">${root.breed || ''} ${root.animal_type || ''}</div>
            </div>
            <div style="text-align:right;font-size:.83rem;color:rgba(255,255,255,.75);">
                <div style="font-weight:600;font-size:1rem;">${root.gender === 'male' ? '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg> Male' : '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg> Female'}</div>
                <div>Born: ${fmtDate(root.date_of_birth)}</div>
                <div style="margin-top:.4rem;background:rgba(255,255,255,.12);padding:.2rem .75rem;border-radius:20px;font-size:.72rem;display:inline-block;">${lineageData.length} records</div>
            </div>
        </div>

        <!-- Detail grid -->
        ${detailGrid}

        <!-- Pedigree chart section -->
        <div style="margin-top:1.75rem;padding-top:1.75rem;border-top:1px solid #e2e8f0;">
            <div style="font-size:1.05rem;font-weight:700;color:#1B4332;margin-bottom:1.75rem;display:flex;align-items:center;gap:.5rem;font-family:'Playfair Display',Georgia,serif;">
                🧬 Pedigree Chart
            </div>
            <div id="pg-tree" style="display:flex;flex-direction:column;align-items:center;gap:0;user-select:none;">
                ${grandparentSection}
                ${parentSection}
                ${subjectSection}
            </div>
        </div>
    </div>`;
}

// Draw SVG connector lines after pedigree renders
function drawPedigreeConnectors() {
    // Parents → Subject
    const parentRow = document.getElementById('pg-parent-row');
    const connSvg = document.getElementById('pg-conn-parents');
    if (parentRow && connSvg) {
        const nodes = parentRow.querySelectorAll('[style*="flex-direction:column"]');
        const svgRect = connSvg.getBoundingClientRect();
        if (nodes.length === 2) {
            const r1 = nodes[0].getBoundingClientRect();
            const r2 = nodes[1].getBoundingClientRect();
            const x1 = r1.left + r1.width / 2 - svgRect.left;
            const x2 = r2.left + r2.width / 2 - svgRect.left;
            const midX = (x1 + x2) / 2;
            connSvg.innerHTML = `
                <line x1="${x1}" y1="0" x2="${x2}" y2="0" stroke="#d0e8d8" stroke-width="2"/>
                <line x1="${midX}" y1="0" x2="${midX}" y2="${svgRect.height}" stroke="#d0e8d8" stroke-width="2"/>`;
        }
    }

    // Grandparents → Parents
    const grandRow = document.getElementById('pg-grand-row');
    const grandSvg = document.getElementById('pg-conn-grand');
    if (grandRow && grandSvg && parentRow) {
        const gNodes = grandRow.querySelectorAll('[style*="flex-direction:column"]');
        const pNodes = parentRow.querySelectorAll('[style*="flex-direction:column"]');
        const svgRect = grandSvg.getBoundingClientRect();
        let paths = '';
        // Connect pairs: [0,1]→sire, [2,3]→dam
        [[0,1,0],[2,3,1]].forEach(([gA, gB, pIdx]) => {
            if (gNodes[gA] && gNodes[gB] && pNodes[pIdx]) {
                const rA = gNodes[gA].getBoundingClientRect();
                const rB = gNodes[gB].getBoundingClientRect();
                const rP = pNodes[pIdx].getBoundingClientRect();
                const xA = rA.left + rA.width / 2 - svgRect.left;
                const xB = rB.left + rB.width / 2 - svgRect.left;
                const xP = rP.left + rP.width / 2 - svgRect.left;
                const midX = (xA + xB) / 2;
                paths += `
                    <line x1="${xA}" y1="0" x2="${xB}" y2="0" stroke="#d0e8d8" stroke-width="2"/>
                    <line x1="${midX}" y1="0" x2="${midX}" y2="${svgRect.height}" stroke="#d0e8d8" stroke-width="2"/>
                    <line x1="${midX}" y1="${svgRect.height}" x2="${xP}" y2="${svgRect.height}" stroke="#d0e8d8" stroke-width="2" stroke-dasharray="4 3"/>`;
            }
        });
        grandSvg.innerHTML = paths;
    }
}

// ── Animal Popup (node click inside pedigree) ────────────────
function openAnimalPopup(animalJson, role) {
    const popup = document.getElementById('pedigreeAnimalPopup');
    if (!popup) return;
    const animal = animalJson ? JSON.parse(animalJson) : null;
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    document.getElementById('popupAvatar').textContent = !animal ? '❓' : (animal.gender === 'female' ? '🐄' : '🐂');
    document.getElementById('popupAnimalId').textContent = animal ? (animal.animal_id || '—') : 'Unknown';
    document.getElementById('popupRole').textContent = role || '';
    const fields = animal ? [
        ['Breed',        animal.breed],
        ['Animal Type',  animal.animal_type],
        ['Gender',       animal.gender === 'male' ? '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg> Male' : '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg> Female'],
        ['Date of Birth', fmtDate(animal.date_of_birth)],
        ['Sire ID',      animal.sire_id || '—'],
        ['Dam ID',       animal.dam_id  || '—'],
    ] : [];

    document.getElementById('popupFields').innerHTML = fields.length
        ? fields.map(([label, val]) => `
            <div style="display:flex;flex-direction:column;gap:.2rem;">
                <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:600;">${label}</div>
                <div style="font-size:.9rem;color:#1e293b;font-weight:500;">${val || '—'}</div>
            </div>`).join('')
        : `<div style="text-align:center;color:#94a3b8;font-size:.9rem;padding:1rem 0;">No record available for this ancestor.</div>`;

    popup.classList.add('active');
}

// Handles close animal popup behavior for this page.
function closeAnimalPopup() {
    const popup = document.getElementById('pedigreeAnimalPopup');
    if (popup) popup.classList.remove('active');
}

// ── QR Code ───────────────────────────────────────────────────
function showQrCode(animalId) {
    const modal = document.getElementById('qrModal');
    const titleEl = document.getElementById('qrModalAnimalId');
    const container = document.getElementById('qrCodeContainer');
    if (!modal || !container) return;
    if (titleEl) titleEl.textContent = animalId;
    container.innerHTML = '';

    // Build the public URL that the QR code will encode
    const publicUrl = `${window.location.origin}/lineage_search.html?animal=${encodeURIComponent(animalId)}`;
    document.getElementById('qrPublicUrl').textContent = publicUrl;

    // Use QRCode library if available, otherwise fallback to a QR API
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
        // Fallback: use Google Charts QR API
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

    // Try canvas first (QRCode lib renders a canvas)
    const canvas = container.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `qr_${animalId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        return;
    }

    // Fallback: try the img tag
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
async function handleBreedingEvent(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const eventData = {
      breeding_method:   document.getElementById('breedingMethod').value,
      dam_id:            parseInt(document.getElementById('dam').value),
      sire_id:           document.getElementById('sire').value ? parseInt(document.getElementById('sire').value) : null,
      breeding_date:     document.querySelector('[name="breedingDate"]').value,
      offspring_id:      document.getElementById('offspring').value ? parseInt(document.getElementById('offspring').value) : null,
      expected_due_date: document.querySelector('[name="expectedDueDate"]').value || null,
      notes:             document.querySelector('[name="notes"]').value || null,
      // Conditional fields
      batch_number:      document.querySelector('[name="batchNumber"]').value || null,
      ai_technician:     document.querySelector('[name="aiTechnician"]').value || null,
      donor_dam:         document.querySelector('[name="donorDam"]').value || null,
      embryo_id:         document.querySelector('[name="embryoId"]').value || null,
    };
    if (!eventData.breeding_method || !eventData.dam_id || !eventData.breeding_date) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const result = await apiFetch(`/api/breeders/${breederId}/breeding-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(eventData),
    });

/**
 * Search for breeders by breed name and show results in a modal.
 * This prevents the redirect to a separate search page.
 */
// Handles search breed behavior for this page.
async function searchBreed(breedName) {
  try {
    const data = await apiFetch(`/api/public/animals/breed/${encodeURIComponent(breedName)}`);
    // Extract data if it's wrapped in a success envelope
    const results = data.data || data;
    showBreedModal(breedName, results);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Shows breed modal feedback to the user.
function showBreedModal(breedName, data) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.style.zIndex = '2000';
  const rows = data.length > 0
    ? data.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${item.breeder_name}</strong>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.farm_location}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.county || '—'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.phone}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            <span class="badge badge-individual" style="background: #e0f2e8; color: #1b5e20; padding: 4px 8px; border-radius: 12px;">${item.count} animals</span>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No approved breeders found for this breed.</td></tr>';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 850px; width: 95%; position: relative;">
      <button class="close-button" style="position: absolute; right: 20px; top: 20px; font-size: 24px; border: none; background: none; cursor: pointer;">&times;</button>
      <h2 style="color: #1b4332; margin-bottom: 5px;">Breed Summary: ${breedName.toUpperCase()}</h2>
      <p style="color: #64748b; margin-bottom: 20px; font-size: 14px;">Found ${data.length} registered farms specializing in this breed.</p>

      <div style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
          <thead style="background: #f8fafc; position: sticky; top: 0; z-index: 1;">
            <tr>
              <th style="padding: 12px; border-bottom: 2px solid #eee;">Breeder / Farm</th>
              <th style="padding: 12px; border-bottom: 2px solid #eee;">Location</th>
              <th style="padding: 12px; border-bottom: 2px solid #eee;">County</th>
              <th style="padding: 12px; border-bottom: 2px solid #eee;">Phone</th>
              <th style="padding: 12px; border-bottom: 2px solid #eee; text-align: center;">Animals</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Handles close behavior for this page.
  const close = () => { modal.remove(); document.body.style.overflow = 'auto'; };
  modal.querySelector('.close-button').onclick = close;
  modal.onclick = (e) => { if(e.target === modal) close(); };
}
    showToast(`Breeding event for Dam ID ${result.dam_id} recorded!`, 'success');
    e.target.reset();
    await loadDashboardStats();
    await loadBreedingEventsPageData();

    // Close modal if open
    document.querySelector('.modal-overlay.active')?.classList.remove('active');
    document.body.style.overflow = 'auto';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// Handles export offspring to csv behavior for this page.
function exportOffspringToCsv() {
  if (offspringHistoryData.length === 0) {
    showToast('No offspring history to export.', 'warning');
    return;
  }
  const headers = ['Offspring ID', 'Birth Date', 'Sire', 'Dam', 'Breeding Method'];
  const rows = offspringHistoryData.map(ev => {
    const offspring = animalMapForExports.get(ev.offspring_id);
    const offspringDisplay = offspring ? offspring.animal_id : `ID: ${ev.offspring_id}`;
    const birthDate = offspring ? new Date(offspring.date_of_birth).toLocaleDateString() : 'Unknown';
    const sire = animalMapForExports.get(ev.sire_id);
    const sireDisplay = sire ? sire.animal_id : (ev.sire_id ? `ID: ${ev.sire_id}` : '—');
    const dam = animalMapForExports.get(ev.dam_id);
    const damDisplay = dam ? dam.animal_id : (ev.dam_id ? `ID: ${ev.dam_id}` : '—');
    return [
      offspringDisplay,
      birthDate,
      sireDisplay,
      damDisplay,
      ev.breeding_method
    ].map(field => `"${String(field).replace(/"/g, '""')}"`);
  });
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `offspring_history_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
          scale: 1.5, // Higher scale for better resolution
          useCORS: true,
          backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;

      // Calculate PDF dimensions to fit the image
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
async function exportAllAnimalsCsv() {
    const btn = document.getElementById('exportAllAnimalsCsvBtn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Exporting...';

    try {
        if (allAnimals.length === 0) {
            allAnimals = await apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } });
        }
        if (allAnimals.length === 0) {
            showToast('No animals to export.', 'warning');
            return;
        }
        const animalIdMap = new Map(allAnimals.map(animal => [animal.id, animal.animal_id]));
        const headers = ['Animal ID', 'Animal Type', 'Breed', 'Gender', 'Date of Birth', 'Sire ID', 'Dam ID', 'DB ID'];
        const rows = allAnimals.map(a => {
            const sireId = a.sire_id ? animalIdMap.get(a.sire_id) || `DB_ID:${a.sire_id}` : '';
            const damId = a.dam_id  ? animalIdMap.get(a.dam_id)  || `DB_ID:${a.dam_id}` : '';
            return [
            a.animal_id, a.animal_type, a.breed, a.gender, new Date(a.date_of_birth).toLocaleDateString(), sireId, damId, a.id
            ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        });
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `all_animals_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        showToast(`Error exporting animals: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}

// Handles export all events csv behavior for this page.
async function exportAllEventsCsv() {
    const btn = document.getElementById('exportAllEventsCsvBtn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Exporting...';

    try {
        const [animals, events] = await Promise.all([
            (allAnimals.length > 0 ? Promise.resolve(allAnimals) : apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } })),
            apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${getToken()}` } })
        ]);
        if (allAnimals.length === 0) allAnimals = animals;
        if (events.length === 0) {
            showToast('No breeding events to export.', 'warning');
            return;
        }
        const animalIdMap = new Map(animals.map(a => [a.id, a.animal_id]));
        const headers = ['Event ID', 'Dam ID', 'Sire ID', 'Offspring ID', 'Breeding Date', 'Due Date', 'Method', 'Status', 'Notes'];
        const rows = events.map(ev => {
            const damId = animalIdMap.get(ev.dam_id) || `DB_ID:${ev.dam_id}`;
            const sireId = ev.sire_id ? (animalIdMap.get(ev.sire_id) || `DB_ID:${ev.sire_id}`) : '';
            const offspringId = ev.offspring_id ? (animalIdMap.get(ev.offspring_id) || `DB_ID:${ev.offspring_id}`) : '';
            let status = 'In Progress';
            if (ev.offspring_id) {
                status = 'Successful';
            } else if (ev.expected_due_date && new Date(ev.expected_due_date) < new Date()) {
                status = 'Failed/Overdue';
            }
            return [
                ev.id, damId, sireId, offspringId,
                new Date(ev.breeding_date).toLocaleDateString(),
                ev.expected_due_date ? new Date(ev.expected_due_date).toLocaleDateString() : '',
                ev.breeding_method, status, ev.notes || ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        });
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `all_breeding_events_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        showToast(`Error exporting events: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}

// Handles generate comprehensive farm report behavior for this page.
async function generateComprehensiveFarmReport() {
    const btn = document.getElementById('generateFarmReportBtn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
        const [animals, events] = await Promise.all([
            apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } }),
            apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${getToken()}` } })
        ]);
        allAnimals = animals;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const animalIdMap = new Map(animals.map(a => [a.id, a.animal_id]));
        const now = new Date();

        doc.setFontSize(22);
        doc.text('Comprehensive Farm Report', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`${breederData.farm_name || breederData.full_name}`, 105, 28, { align: 'center' });
        doc.text(`Report Generated: ${now.toLocaleString()}`, 105, 34, { align: 'center' });

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Farm Statistics', 14, 50);
        const maleCount = animals.filter(a => a.gender === 'male').length;
        const femaleCount = animals.filter(a => a.gender === 'female').length;
        const pregnancies = events.filter(ev => !ev.offspring_id && ev.expected_due_date && new Date(ev.expected_due_date) >= now).length;
        const completedEvents = events.filter(ev => ev.offspring_id || (ev.expected_due_date && new Date(ev.expected_due_date) < now));
        const successfulEvents = events.filter(ev => ev.offspring_id).length;
        const successRate = completedEvents.length > 0 ? `${((successfulEvents / completedEvents.length) * 100).toFixed(0)}%` : 'N/A';
        const stats = [
            ['Total Animals', animals.length],
            ['Male Animals', maleCount],
            ['Female Animals', femaleCount],
            ['Active Pregnancies', pregnancies],
            ['Breeding Success Rate', successRate],
        ];
        doc.autoTable({
            body: stats,
            startY: 55,
            theme: 'plain',
            styles: { fontSize: 11 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        doc.addPage();
        doc.setFontSize(16);
        doc.text('Full Animal Inventory', 14, 20);
        const animalHead = [['ID', 'Type', 'Breed', 'Gender', 'DOB', 'Sire', 'Dam']];
        const animalBody = animals.map(a => [
            a.animal_id, a.animal_type, a.breed, a.gender, new Date(a.date_of_birth).toLocaleDateString(),
            a.sire_id ? animalIdMap.get(a.sire_id) || 'N/A' : '—',
            a.dam_id ? animalIdMap.get(a.dam_id) || 'N/A' : '—',
        ]);
        doc.autoTable({
            head: animalHead,
            body: animalBody,
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8, cellPadding: 2 },
        });

        doc.addPage();
        doc.setFontSize(16);
        doc.text('Full Breeding History', 14, 20);
        const eventHead = [['Dam', 'Sire', 'Breeding Date', 'Due Date', 'Method', 'Status']];
        const eventBody = events.map(ev => {
            let status = 'In Progress';
            if (ev.offspring_id) status = `Success (Offspring: ${animalIdMap.get(ev.offspring_id) || 'N/A'})`;
            else if (ev.expected_due_date && new Date(ev.expected_due_date) < now) status = 'Failed/Overdue';
            return [
                animalIdMap.get(ev.dam_id) || 'N/A',
                ev.sire_id ? animalIdMap.get(ev.sire_id) || 'N/A' : '—',
                new Date(ev.breeding_date).toLocaleDateString(),
                ev.expected_due_date ? new Date(ev.expected_due_date).toLocaleDateString() : '—',
                ev.breeding_method,
                status
            ];
        });
        doc.autoTable({
            head: eventHead,
            body: eventBody,
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8, cellPadding: 2 },
        });

        doc.save(`comprehensive_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        showToast(`Error generating report: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}

// Handles generate breeding performance report behavior for this page.
async function generateBreedingPerformanceReport() {
    const btn = document.getElementById('generateBreedingReportBtn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
        const [animals, events] = await Promise.all([
            apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${getToken()}` } }),
            apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${getToken()}` } })
        ]);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const now = new Date();

        doc.setFontSize(22);
        doc.text('Breeding Performance Report', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Report Generated: ${now.toLocaleString()}`, 105, 28, { align: 'center' });

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Performance by Breeding Method', 14, 45);
        const completedEvents = events.filter(ev => ev.offspring_id || (ev.expected_due_date && new Date(ev.expected_due_date) < now));
        const methodStats = completedEvents.reduce((acc, ev) => {
            const method = ev.breeding_method;
            if (!acc[method]) acc[method] = { total: 0, success: 0 };
            acc[method].total++;
            if (ev.offspring_id) acc[method].success++;
            return acc;
        }, {});
        const methodBody = Object.entries(methodStats).map(([method, data]) => {
            const rate = data.total > 0 ? `${((data.success / data.total) * 100).toFixed(0)}%` : 'N/A';
            return [method, data.total, data.success, rate];
        });

        doc.autoTable({
            head: [['Method', 'Total Attempts', 'Successful Births', 'Success Rate']],
            body: methodBody,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
        });
        let finalY = doc.lastAutoTable.finalY + 15;

        doc.text('Performance by Sire', 14, finalY);
        const sireStats = completedEvents.reduce((acc, ev) => {
            if (!ev.sire_id) return acc;
            const sireId = ev.sire_id;
            if (!acc[sireId]) acc[sireId] = { total: 0, success: 0 };
            acc[sireId].total++;
            if (ev.offspring_id) acc[sireId].success++;
            return acc;
        }, {});
        const animalIdMap = new Map(animals.map(a => [a.id, a.animal_id]));
        const sireBody = Object.entries(sireStats).map(([sireId, data]) => {
            const rate = data.total > 0 ? `${((data.success / data.total) * 100).toFixed(0)}%` : 'N/A';
            return [animalIdMap.get(parseInt(sireId)) || `DB_ID:${sireId}`, data.total, data.success, rate];
        });

        doc.autoTable({
            head: [['Sire ID', 'Total Offspring Events', 'Successful Births', 'Success Rate']],
            body: sireBody,
            startY: finalY + 5,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
        });

        doc.save(`breeding_performance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        showToast(`Error generating report: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}
