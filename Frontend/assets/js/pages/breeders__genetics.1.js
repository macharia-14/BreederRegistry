//  State
let _females = [];
let _males = [];
let _all = [];

//  Tab switching
function switchTab(name, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['coi', 'recs'].forEach(t => {
        document.getElementById('tab-' + t).style.display = (t === name) ? 'block' : 'none';
    });
}

// Logout logic (shared across breeder and admin pages)
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault(); logout();
    });
    try {
        await waitForBreederData();
        await loadAnimalsForSelects();
    } catch (err) {
        showToast('Could not initialise genetics module: ' + err.message, 'error');
    }
});

/**
 * Waits for script.js to finish loading the breeder profile.
 * Falls back to reading localStorage directly after a short delay.
 */
// Handles wait for breeder data behavior for this page.
function waitForBreederData() {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        // Handles check behavior for this page.
        const check = () => {
            // script.js sets these as module-level globals
            if (typeof breederData !== 'undefined' && breederData &&
                typeof breederId  !== 'undefined' && breederId) {
                window.breederData = breederData;
                window.breederId = breederId;
                resolve(); return;
            }
            // Already on window
            if (window.breederData && window.breederId) { resolve(); return; }
            // localStorage fallback (safe after 500 ms)
            if (Date.now() - start > 500) {
                const id = localStorage.getItem('breeder_id') || sessionStorage.getItem('breeder_id');
                if (id) {
                    window.breederId = id;
                    window.breederData = window.breederData || { id };
                    resolve(); return;
                }
            }
            if (Date.now() - start > 8000) {
                reject(new Error('Timeout waiting for session. Please log in again.')); return;
            }
            setTimeout(check, 120);
        };
        check();
    });
}

// Loads animals for selects data from the API or page state.
async function loadAnimalsForSelects() {
    try {
        const animals = await apiFetch(`/api/breeders/${window.breederId}/animals`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        _all = animals;
        _females = animals.filter(a => a.gender === 'female');
        _males = animals.filter(a => a.gender === 'male');

        fillSelect('coiSireSelect',      _males,   'Select a sire…');
        fillSelect('coiDamSelect',       _females, 'Select a dam…');
        fillSelect('recDamSelect',       _females, 'Select a dam…');
        fillSelect('lookupAnimalSelect', _all,     'Select an animal…');
    } catch (e) {
        showToast('Could not load animals — please refresh.', 'error');
        ['coiSireSelect','coiDamSelect','recDamSelect','lookupAnimalSelect'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<option value="">Failed to load — refresh</option>';
        });
    }
}

// Handles fill select behavior for this page.
function fillSelect(id, list, placeholder) {
    const sel = document.getElementById(id);
    if (!sel) return;
    if (!list.length) {
        sel.innerHTML = `<option value="">${placeholder.split('…')[0]} (none registered)</option>`;
        return;
    }
    sel.innerHTML = `<option value="">${placeholder}</option>` +
        list.map(a => `<option value="${a.id}">${a.animal_id} — ${a.breed}</option>`).join('');
}

// Renders pedigree notice content in the page.
function renderPedigreeNotice(data) {
    const depth = data.pedigree_depth_analyzed ?? data.pedigree_completeness?.generations_requested ?? '—';
    const available = data.pedigree_depth_available ?? data.pedigree_completeness?.generations_available ?? 0;
    const completeness = data.pedigree_completeness_percent ?? data.pedigree_completeness?.completeness_percent ?? 0;
    const warnings = data.pedigree_completeness?.warnings || (data.pedigree_completeness?.warning ? [data.pedigree_completeness.warning] : []);
    const warningHtml = warnings.length
        ? `<div class="alert-box alert-warn" style="margin-top:12px;"><i class="fa fa-triangle-exclamation"></i> ${warnings[0]}</div>`
        : '';
    return `
        <div class="info-note" style="margin-top:12px;">
            <strong>Pedigree reliability:</strong> ${completeness}% complete · depth analyzed: ${depth} generations · depth available: ${available} generations.<br>
            <strong>Data notice:</strong> ${data.data_notice || 'Pedigree-based estimate only. Not DNA or laboratory verification.'}
        </div>
        ${warningHtml}`;
}

//  COI Calculator
async function calculateCOI() {
    const sireId = document.getElementById('coiSireSelect').value;
    const damId = document.getElementById('coiDamSelect').value;
    if (!sireId || !damId) {
        showToast('Please select both a sire and a dam.', 'error'); return;
    }
    if (sireId === damId) {
        showToast('Sire and dam cannot be the same animal.', 'error'); return;
    }
    const btn = document.getElementById('calcCoiBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Calculating…';

    try {
        const data = await apiFetch(
            `/api/genetics/coi?sire_id=${sireId}&dam_id=${damId}`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const resultEl = document.getElementById('coiResult');
        resultEl.style.display = 'block';
        resultEl.style.opacity = '0';
        requestAnimationFrame(() => { resultEl.style.opacity = '1'; });

        document.getElementById('coiPctDisplay').textContent = data.coi_percent.toFixed(2) + '%';
        document.getElementById('coiPctDisplay').style.color = data.risk_color;
        document.getElementById('coiLevelDisplay').textContent = data.risk_level;
        document.getElementById('coiLevelDisplay').style.color = data.risk_color;
        document.getElementById('coiDescDisplay').textContent = data.description;
        document.getElementById('coiRecDisplay').textContent = '→ ' + data.recommendation;
        document.getElementById('coiRecDisplay').style.color = data.risk_color;
        const pedigreeNotice = document.getElementById('coiPedigreeNotice');
        if (pedigreeNotice) pedigreeNotice.innerHTML = renderPedigreeNotice(data);
        const pct = Math.min((data.coi_percent / 25) * 100, 100);
        const bar = document.getElementById('coiProgressBar');
        bar.style.width = pct + '%';
        bar.style.background = data.risk_color;
    } catch (e) {
        showToast('COI calculation failed: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-calculator"></i> Calculate COI';
    }
}

//  Animal COI Lookup
async function lookupAnimalCOI() {
    const id = document.getElementById('lookupAnimalSelect').value;
    if (!id) { showToast('Please select an animal.', 'error'); return; }
    const div = document.getElementById('lookupResult');
    div.innerHTML = '<div style="padding:12px 0;color:#64748b;font-size:13px;"><i class="fa fa-spinner fa-spin"></i> Looking up…</div>';

    try {
        const data = await apiFetch(`/api/genetics/animal-coi/${id}`,
            { headers: { Authorization: `Bearer ${getToken()}` } });
        if (data.coi === null || data.coi === undefined) {
            div.innerHTML = `
                <div class="alert-box alert-warn">
                    <i class="fa fa-triangle-exclamation"></i>
                    ${data.message || 'Cannot calculate COI — sire or dam is not registered in the system.'}
                    ${renderPedigreeNotice(data)}
                </div>`;
        } else {
            div.innerHTML = `
                <div class="lookup-box">
                    <span class="coi-val" style="color:${data.risk_color}">${data.coi_percent.toFixed(2)}%</span>
                    <div>
                        <strong style="font-size:14px;">${data.animal_id}</strong>
                        <span style="color:#94a3b8;"> — </span>
                        <span style="color:${data.risk_color};font-weight:700;font-size:13px;">${data.risk_level}</span><br>
                        <span style="color:#64748b;font-size:12px;">${data.description}</span>
                    </div>
                </div>
                ${renderPedigreeNotice(data)}`;
        }
    } catch (e) {
        div.innerHTML = `
            <div class="alert-box alert-err">
                <i class="fa fa-circle-xmark"></i>
                Error: ${e.message}
            </div>`;
    }
}

//  Sire Recommendations
async function getRecommendations() {
    const damId = document.getElementById('recDamSelect').value;
    if (!damId) { showToast('Please select a dam.', 'error'); return; }
    const btn = document.getElementById('getRecsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Analysing…';
    document.getElementById('recsResult').style.display = 'none';

    try {
        const data = await apiFetch(
            `/api/genetics/recommend-sires/${damId}?top_n=10`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
        );

        document.getElementById('recsResult').style.display = 'block';
        document.getElementById('recTableTitle').textContent =
            `Top ${data.total_candidates} Recommended Sire${data.total_candidates !== 1 ? 's' : ''} for ${data.dam_animal_id}`;
        document.getElementById('recTableSubtitle').textContent =
            `Animal type: ${data.animal_type}  ·  Dam breed: ${data.dam_breed}`;
        const tbody = document.getElementById('recTableBody');
        if (!data.recommendations || !data.recommendations.length) {
            tbody.innerHTML = `
                <tr><td colspan="9" style="text-align:center;padding:28px;color:#94a3b8;">
                    <i class="fa fa-circle-exclamation" style="display:block;font-size:22px;margin-bottom:8px;"></i>
                    No sires of the same animal type found in the system.
                </td></tr>`;
            return;
        }

        tbody.innerHTML = data.recommendations.map((s, i) => {
            const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
            const scorePct = (s.final_score * 100);
            const scoreW = Math.max(0, Math.min(100, Math.round(scorePct)));
            const confidence = Number(s.confidence_score || 0).toFixed(1);
            const risks = (s.risk_flags || []).length ? `<br><small style="color:#dc2626;">${s.risk_flags.slice(0, 3).join('; ')}</small>` : '';
            const pedigreeMeta = `Pedigree: ${Number(s.pedigree_completeness_percent || 0).toFixed(1)}% complete, ${s.pedigree_depth_available || 0}/${s.pedigree_depth_analyzed || 4} generations available`;
            return `<tr>
              <td><span class="rank-badge ${rankClass}">${i + 1}</span></td>
              <td><strong>${s.sire_animal_id}</strong></td>
              <td>${s.breed}</td>
              <td>${s.farm_name}</td>
              <td>
                <span class="coi-pill" style="background:${s.coi_color}22;color:${s.coi_color};">
                  ${Number(s.coi_percent).toFixed(2)}% — ${s.coi_level}
                </span>
              </td>
              <td>
                <strong>${scorePct.toFixed(1)}%</strong>
                <span class="score-bar-wrap"><span class="score-bar-fill" style="width:${scoreW}%"></span></span>
              </td>
              <td>${confidence}%</td>
              <td><strong>${s.recommendation_level}</strong>${risks}</td>
              <td style="min-width:260px;line-height:1.4;">${s.explanation || 'No explanation available.'}<br><small style="color:#64748b;">${pedigreeMeta}</small></td>
            </tr>`;
        }).join('');
    } catch (e) {
        showToast('Recommendation failed: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-star"></i> Get Recommendations';
    }
}
