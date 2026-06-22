// Frontend/assets/js/pages/public-lineage-search.js: controls frontend behavior for the Animal Breed Registry System.
document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const animal = urlParams.get('animal');
        if (animal) {
          document.getElementById('lineage-search-input').value = animal;
          performLineageSearch(animal);
          return;
        }
        const breed = urlParams.get('breed');
        if (breed) {
          document.getElementById('lineage-search-input').value = breed;
          handleBreederSearch(breed);
        }
      });

      // Handles fill example behavior for this page.
      function fillExample(id) {
        document.getElementById('lineage-search-input').value = id;
        document.getElementById('lineage-search-form').dispatchEvent(new Event('submit'));
      }

      // Handles lineage search user actions and events.
      async function handleLineageSearch(e) {
        e.preventDefault();
        const input = document.getElementById('lineage-search-input').value.trim();
        if (!input) return;
        if (/^[A-Z]{2,5}-\d+$/i.test(input) || /^\d+$/.test(input)) {
          performLineageSearch(input);
        } else {
          handleBreederSearch(input);
        }
      }

      // Handles perform lineage search behavior for this page.
      async function performLineageSearch(animalId) {
        const resultsEl = document.getElementById('lineage-results');
        const howTo = document.getElementById('how-to-section');
        const btn = document.getElementById('search-btn');

        howTo.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Searching...';

        resultsEl.innerHTML = `
          <div class="result-loading">
            <div class="spinner"></div>
            Looking up animal record...
          </div>`;

        try {
          const res = await fetch(`/api/public/animals/lineage/${encodeURIComponent(animalId)}`);
          if (!res.ok) {
            resultsEl.innerHTML = `
              <div class="result-empty">
                <div class="result-empty-icon">🔍</div>
                <h3>No record found</h3>
                <p>We couldn't find an animal with ID <strong>${animalId}</strong>. Please check the ID and try again.</p>
              </div>`;
            return;
          }
          const json = await res.json();
          const data = json.data ?? json;
          if (!data || (Array.isArray(data) && data.length === 0)) {
            throw new Error("Not found");
          }

          renderResult(Array.isArray(data) ? data[0] : data);
        } catch (err) {
          resultsEl.innerHTML = `
            <div class="result-empty">
              <div class="result-empty-icon">⚠️</div>
              <h3>Something went wrong</h3>
              <p>Could not connect to the server. Please try again shortly.</p>
            </div>`;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Search Lineage';
          howTo.style.display = 'block';
        }
      }

      // Renders result content in the page.
      function renderResult(a) {
        const sireId = a.sire_id || null;
        const damId = a.dam_id || null;
        const hasGrandparents = false;

        document.getElementById('lineage-results').innerHTML = `
          <div class="animal-card">
            <div class="animal-card-header">
              <div>
                <div class="animal-id-badge">${a.animal_id}</div>
                <div class="animal-name" style="margin-top:0.5rem">${a.breed} ${a.animal_type}</div>
              </div>
              <div class="animal-type-badge">${a.gender === 'male' ? '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg> Male' : '<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg> Female'}</div>
            </div>
            <div class="animal-card-body">
              <div class="detail-grid">
                <div class="detail-item">
                  <div class="detail-label">Animal ID</div>
                  <div class="detail-value">${a.animal_id}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Breed</div>
                  <div class="detail-value">${a.breed}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Animal Type</div>
                  <div class="detail-value">${a.animal_type}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Date of Birth</div>
                  <div class="detail-value">${formatDate(a.date_of_birth)}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Gender</div>
                  <div class="detail-value">${capitalize(a.gender)}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Registered</div>
                  <div class="detail-value">${formatDate(a.created_at)}</div>
                </div>
              </div>

              <!-- PEDIGREE TREE -->
              <div class="pedigree-section">
                <div class="pedigree-section-title">🧬 Pedigree Chart</div>
                <div class="pedigree-tree" id="pedigree-tree">

                  ${hasGrandparents ? `
                  <!-- Grandparent row -->
                  <div class="pedigree-row grandparent-row">
                    ${buildNode(patGrandsire, 'Pat. Grandsire', 'grand', 'sire')}
                    ${buildNode(patGranddam,  'Pat. Granddam',  'grand', 'dam')}
                    ${buildNode(matGrandsire, 'Mat. Grandsire', 'grand', 'sire')}
                    ${buildNode(matGranddam,  'Mat. Granddam',  'grand', 'dam')}
                  </div>
                  <div class="pedigree-connectors">
                    <svg class="connector-svg" id="conn-grand"></svg>
                  </div>` : ''}

                  <!-- Parent row -->
                  <div class="pedigree-row" id="parent-row">
                    ${buildNode(sireId ? { animal_id: sireId } : null, 'Sire', 'sire', 'sire')}
                    ${buildNode(damId ? { animal_id: damId } : null,  'Dam',  'dam',  'dam')}
                  </div>

                  <!-- Connector row -->
                  <div class="pedigree-connectors">
                    <svg class="connector-svg" id="conn-parents"></svg>
                  </div>

                  <!-- Self row -->
                  <div class="pedigree-row">
                    ${buildNode(a, 'Self', 'self', a.gender === 'male' ? 'sire' : 'dam')}
                  </div>
                </div>
              </div>

              ${a.breeder ? `
              <div class="breeder-section">
                <div class="breeder-info">
                  <div class="breeder-label">Registered By</div>
                  <div class="breeder-name">${a.breeder.full_name}</div>
                  <div class="breeder-farm">${a.breeder.farm_name ? a.breeder.farm_name + ' · ' : ''}${a.breeder.farm_location}</div>
                </div>
                <div class="verified-badge">✅ Verified Breeder</div>
              </div>` : ''}
            </div>
          </div>`;

        requestAnimationFrame(drawConnectors);
      }

      // Handles build node behavior for this page.
      function buildNode(animal, roleLabel, roleKey, genderHint) {
        if (!animal) {
          return `
            <div class="pedigree-node" onclick="openModal(null, '${roleLabel}')">
              <div class="node-avatar unknown-avatar">❓</div>
              <div class="node-label">Unknown</div>
              <div class="node-role-tag tag-unknown">${roleLabel}</div>
            </div>`;
        }
        const emoji = genderHint === 'sire' ? '🐂' : '🐄';
        const avCls = roleKey === 'self' ? 'self-avatar' : roleKey === 'sire' ? 'sire-avatar' : roleKey === 'dam' ? 'dam-avatar' : '';
        const tagCls = roleKey === 'self' ? 'tag-self' : roleKey === 'sire' ? 'tag-sire' : roleKey === 'dam' ? 'tag-dam' : 'tag-grand';
        const safeData = encodeURIComponent(JSON.stringify(animal));
        return `
          <div class="pedigree-node" onclick="openModal(decodeURIComponent('${safeData}'), '${roleLabel}')">
            <div class="node-avatar ${avCls}">${emoji}</div>
            <div class="node-label">${animal.animal_id || animal.name || '—'}</div>
            <div class="node-role-tag ${tagCls}">${roleLabel}</div>
          </div>`;
      }

      // Handles draw connectors behavior for this page.
      function drawConnectors() {
        const tree = document.getElementById('pedigree-tree');
        if (!tree) return;
        const parentRow = document.getElementById('parent-row');
        const connSvg = document.getElementById('conn-parents');
        if (parentRow && connSvg) {
          const nodes = parentRow.querySelectorAll('.pedigree-node');
          const svgRect = connSvg.getBoundingClientRect();
          let paths = '';
          if (nodes.length === 2) {
            const r1 = nodes[0].getBoundingClientRect();
            const r2 = nodes[1].getBoundingClientRect();
            const x1 = r1.left + r1.width / 2 - svgRect.left;
            const x2 = r2.left + r2.width / 2 - svgRect.left;
            const midX = (x1 + x2) / 2;
            const midY = svgRect.height / 2;

            paths = `
              <line x1="${x1}" y1="0" x2="${x2}" y2="0" stroke="#d0e8d8" stroke-width="2"/>
              <line x1="${midX}" y1="0" x2="${midX}" y2="${svgRect.height}" stroke="#d0e8d8" stroke-width="2"/>
            `;
          }
          connSvg.innerHTML = paths;
        }
      }

      // Handles open modal behavior for this page.
      function openModal(animalJson, role) {
        const modal = document.getElementById('animal-modal');
        const animal = animalJson ? JSON.parse(animalJson) : null;

        document.getElementById('modal-name').textContent = animal ? (animal.animal_id || '—') : 'Unknown';
        document.getElementById('modal-role').textContent = role;
        document.getElementById('modal-avatar').textContent = !animal ? '❓' : (animal.gender === 'female' ? '🐄' : '🐂');
        let fields = '';
        if (animal) {
          const rows = [
            ['Animal ID',    animal.animal_id],
            ['Breed',        animal.breed],
            ['Animal Type',  animal.animal_type],
            ['Gender',       capitalize(animal.gender)],
            ['Date of Birth', formatDate(animal.date_of_birth)],
          ].filter(r => r[1] && r[1] !== '—' && r[1] !== 'undefined');

          fields = rows.map(([label, val]) => `
            <div class="modal-field">
              <div class="modal-field-label">${label}</div>
              <div class="modal-field-value ${label === 'Gender' ? (val.toLowerCase() === 'male' ? 'badge-male' : 'badge-female') : ''}">${val}</div>
            </div>`).join('');
        } else {
          fields = `<div style="text-align:center; color:var(--muted); font-size:0.9rem; padding:1rem 0">No record available for this ancestor.</div>`;
        }

        document.getElementById('modal-fields').innerHTML = fields;
        modal.classList.add('open');
      }

      // Handles close modal behavior for this page.
      function closeModal() {
        document.getElementById('animal-modal').classList.remove('open');
      }

      // Handles close modal on overlay behavior for this page.
      function closeModalOnOverlay(e) {
        if (e.target === document.getElementById('animal-modal')) closeModal();
      }

      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

      // Handles breeder search user actions and events.
      async function handleBreederSearch(breed) {
        const resultsEl = document.getElementById('lineage-results');
        const howTo = document.getElementById('how-to-section');
        const btn = document.getElementById('search-btn');

        howTo.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Searching...';

        resultsEl.innerHTML = `
          <div class="result-loading">
            <div class="spinner"></div>
            Searching for breeders...
          </div>`;

        try {
          const res = await fetch(`/api/public/animals/breed/${encodeURIComponent(breed)}`);
          const data = await res.json();
          if (!data.length) {
            resultsEl.innerHTML = `
              <div class="result-empty">
                <div class="result-empty-icon">🔍</div>
                <h3>No breeders found</h3>
                <p>We couldn't find approved breeders for <strong>${breed}</strong>. Please check the breed name and try again.</p>
              </div>`;
            return;
          }

          resultsEl.innerHTML = `
            <div class="breeder-results">
              <h3>Approved Breeders for ${breed}</h3>
              <div class="breeder-list">
                ${data.map(b => `
                  <div class="breeder-card">
                    <div class="breeder-name">${b.breeder_name}</div>
                    <div class="breeder-details">
                      <div> ${b.farm_location}${b.county ? ', ' + b.county : ''}</div>
                      <div> ${b.phone}</div>
                      <div> ${b.animal_count || 0} animals registered</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>`;
        } catch (err) {
          resultsEl.innerHTML = `
            <div class="result-empty">
              <div class="result-empty-icon">⚠️</div>
              <h3>Something went wrong</h3>
              <p>Could not connect to the server. Please try again shortly.</p>
            </div>`;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Search';
          howTo.style.display = 'block';
        }
      }

      // Handles format date behavior for this page.
      function formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
      }

      // Handles capitalize behavior for this page.
      function capitalize(str) {
        if (!str) return '—';
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
