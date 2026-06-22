// Frontend/assets/js/pages/public-home.js: controls frontend behavior for the Animal Breed Registry System.
async function loadStats() {
        try {
          const res = await fetch('/api/public/stats');
          const json = await res.json();
          const data = json.data ?? json;
          if (data.total_breeders !== undefined)
            document.getElementById('stat-breeders').textContent = data.total_breeders;
          if (data.total_animals !== undefined)
            document.getElementById('stat-animals').textContent = data.total_animals;
          if (data.total_breeds !== undefined)
            document.getElementById('stat-breeds').textContent = data.total_breeds;
        } catch (e) {
        }
      }

      // Handles search user actions and events.
      async function handleSearch(e) {
        e.preventDefault();
        const query = document.getElementById('hero-search-input').value.trim();
        if (!query) return;
        const resultsEl = document.getElementById('search-results');
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = '<div class="result-item" style="color:rgba(255,255,255,0.6);font-style:italic;"><svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Searching for "<strong style="color:#fff">' + query + '</strong>"…</div>';

        try {
          const res = await fetch(`/api/public/breed-summary?breed=${encodeURIComponent(query)}`);
          const json = await res.json();
          const data = json.data ?? json;
          if (!res.ok || !data || (Array.isArray(data) && data.length === 0)) {
            resultsEl.innerHTML = `<div class="result-item" style="color:rgba(255,255,255,0.55);">No approved breeders found for "<strong style="color:#fff">${query}</strong>".</div>`;
            return;
          }
          const header = `<div class="result-item" style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.4);padding-bottom:0.5rem;">
            Breeders for "<strong style="color:var(--tan)">${query}</strong>" — ${data.length} result${data.length !== 1 ? 's' : ''}
          </div>`;
          const cards = data.map(b => `
            <div class="result-item" style="display:grid;gap:0.2rem;">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <span style="font-size:1rem;"><svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
                <strong style="font-size:0.95rem;">${b.farm_name && b.farm_name !== '—' ? b.farm_name : b.breeder_name}</strong>
                ${b.farm_name && b.farm_name !== '—' ? `<span style="font-size:0.82rem; color:rgba(255,255,255,0.5); font-weight:400;">(${b.breeder_name})</span>` : ''}
                ${b.farm_prefix && b.farm_prefix !== 'Unknown' ? `<span style="font-size:0.75rem;background:rgba(212,169,106,0.2);color:var(--tan-light);padding:1px 7px;border-radius:10px;">${b.farm_prefix}</span>` : ''}
              </div>
              <div style="font-size:0.82rem;color:rgba(255,255,255,0.55);padding-left:1.5rem;">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${b.farm_location}${b.county && b.county !== '—' ? ', ' + b.county : ''} &nbsp;·&nbsp;
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${b.phone} &nbsp;·&nbsp;
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${b.email}
                ${b.animal_count ? `&nbsp;·&nbsp; <span style="color:var(--tan-light);">${b.animal_count} animal${b.animal_count !== 1 ? 's' : ''}</span>` : ''}
              </div>
            </div>
          `).join('');

          resultsEl.innerHTML = header + cards;
        } catch (err) {
          resultsEl.innerHTML = '<div class="result-item" style="color:#f87171;">Search failed. Please try again.</div>';
        }
      }

      loadStats();
