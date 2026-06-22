// Admin breeder-management page helpers
function getToken() {
  return localStorage.getItem('token')
    || sessionStorage.getItem('token')
    || localStorage.getItem('access_token')
    || sessionStorage.getItem('access_token');
}

// Handles auth headers behavior for this page.
function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

// Handles admin api fetch behavior for this page.
async function adminApiFetch(url, options = {}) {
  const headers = authHeaders({ ...(options.headers || {}) });
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
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.message || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Handles notify behavior for this page.
function notify(message, type = 'info') {
  if (typeof showToast === 'function') {
    showToast(message, type);
    return;
  }
  alert(message);
}

// Toggle action menu dropdown
      function toggleActionMenu(event) {
        event.stopPropagation();
        const dropdown = event.target.nextElementSibling;

        // Close all other dropdowns
        document.querySelectorAll('.action-dropdown').forEach(menu => {
          if (menu !== dropdown) menu.classList.remove('show');
        });

        dropdown.classList.toggle('show');
      }

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        document.querySelectorAll('.action-dropdown').forEach(menu => {
          menu.classList.remove('show');
        });
      });

      // Open breeder info modal
      async function openBreederInfo(breederId) {
        document.querySelectorAll('.action-dropdown').forEach(menu => {
          menu.classList.remove('show');
        });

        try {
          const breeder = await adminApiFetch(`/api/breeders/${breederId}`);
          const modal = document.getElementById('breederInfoModal');
          const content = document.getElementById('breederInfoContent');
          let docsHtml = '<p>No documents uploaded</p>';
          if (breeder.documents) {
            const docs = breeder.documents.split(',').filter(doc => doc.trim());
            if (docs.length > 0) {
              docsHtml = '<ul class="docs-list">';
              docs.forEach(doc => {
                const docName = doc.trim();
                docsHtml += `<li><span>${docName}</span><i class="fas fa-file"></i></li>`;
              });
              docsHtml += '</ul>';
            }
          }

          content.innerHTML = `
            <div class="info-group">
              <label>Full Name</label>
              <p>${breeder.full_name || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>Email</label>
              <p>${breeder.email || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>Phone</label>
              <p>${breeder.phone || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>Farm Name</label>
              <p>${breeder.farm_name || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>Farm Location</label>
              <p>${breeder.farm_location || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>County</label>
              <p>${breeder.county || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>Animal Type</label>
              <p>${breeder.animal_type || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>Farm Prefix</label>
              <p>${breeder.farm_prefix || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>National ID</label>
              <p>${breeder.national_id || 'N/A'}</p>
            </div>
            <div class="info-group">
              <label>Status</label>
              <p><span class="status-badge status-${breeder.status || 'pending'}">${breeder.status || 'pending'}</span></p>
            </div>
            <div class="info-group">
              <label>Uploaded Documents</label>
              ${docsHtml}
            </div>
          `;

          modal.classList.add('show');
        } catch (error) {
          console.error('Error opening breeder info:', error);
          alert('Error loading breeder information: ' + error.message);
        }
      }

      // Close breeder info modal
      function closeBreederInfo() {
        document.getElementById('breederInfoModal').classList.remove('show');
      }

      // Delete breeder
      async function deleteBreeder(breederId) {
        if (!confirm('Are you sure you want to delete this breeder? This action cannot be undone.')) return;

        try {
          await adminApiFetch(`/api/admins/breeders/${breederId}`, { method: 'DELETE' });

          notify('Breeder deleted successfully!', 'success');
          loadBreeders(); // Reload the table
        } catch (error) {
          console.error('Error deleting breeder:', error);
          notify('Error deleting breeder: ' + error.message, 'error');
        }
      }
      // Fetch and load all breeders
      async function loadBreeders() {
        try {
          const approvedBreeders = await adminApiFetch('/api/admins/approved-breeders');
          const pendingBreeders = await adminApiFetch('/api/admins/applications');
          const rejectedBreeders = await adminApiFetch('/api/admins/rejected-applications');

          // Combine all breeders
          const allBreeders = [
            ...approvedBreeders.map(b => ({...b, status: 'approved'})),
            ...pendingBreeders.map(b => ({...b, status: 'pending'})),
            ...rejectedBreeders.map(b => ({...b, status: 'rejected'}))
          ];
          const tableBody = document.getElementById('breederTableBody');
          tableBody.innerHTML = ''; // Clear loading message
          if (allBreeders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No breeders found</td></tr>';
            return;
          }

          // Populate table rows
          allBreeders.forEach(breeder => {
            const row = document.createElement('tr');
            row.setAttribute('data-status', breeder.status);
            row.setAttribute('data-species', (breeder.animal_type || '').toLowerCase());
            let actionsHtml = '';
            if (breeder.status === 'pending') {
              actionsHtml = `
                <div style="display: flex; gap: 10px; align-items: center;">
                  <div class="action-buttons">
                    <button class="action-btn btn-approve" onclick="approveBreeder(this, ${breeder.id})">Approve</button>
                    <button class="action-btn btn-reject" onclick="rejectBreeder(this, ${breeder.id})">Reject</button>
                  </div>
                  <div class="action-menu-container">
                    <button class="action-menu-btn" onclick="toggleActionMenu(event)" title="More actions">⋮</button>
                    <div class="action-dropdown">
                      <a onclick="openBreederInfo(${breeder.id})"><i class="fas fa-info-circle"></i> View Info</a>
                      <a class="delete" onclick="deleteBreeder(${breeder.id})"><i class="fas fa-trash"></i> Remove Breeder</a>
                    </div>
                  </div>
                </div>
              `;
            } else if (breeder.status === 'approved') {
              actionsHtml = `
                <div style="display: flex; gap: 10px; align-items: center;">
                  <div class="action-menu-container">
                    <button class="action-menu-btn" onclick="toggleActionMenu(event)" title="More actions">⋮</button>
                    <div class="action-dropdown">
                      <a onclick="openBreederInfo(${breeder.id})"><i class="fas fa-info-circle"></i> View Info</a>
                      <a class="delete" onclick="deleteBreeder(${breeder.id})"><i class="fas fa-trash"></i> Remove Breeder</a>
                    </div>
                  </div>
                </div>
              `;
            } else if (breeder.status === 'rejected') {
              actionsHtml = `
                <div style="display: flex; gap: 10px; align-items: center;">
                  <span class="action-rejected">rejected</span>
                  <div class="action-menu-container">
                    <button class="action-menu-btn" onclick="toggleActionMenu(event)" title="More actions">⋮</button>
                    <div class="action-dropdown">
                      <a onclick="openBreederInfo(${breeder.id})"><i class="fas fa-info-circle"></i> View Info</a>
                      <a class="delete" onclick="deleteBreeder(${breeder.id})"><i class="fas fa-trash"></i> Remove Breeder</a>
                    </div>
                  </div>
                </div>
              `;
            }
            const statusClass = `status-${breeder.status}`;
            row.innerHTML = `
              <td>${breeder.full_name || 'N/A'}</td>
              <td>${breeder.farm_name || 'N/A'}</td>
              <td>${breeder.county || 'N/A'}</td>
              <td>${breeder.animal_type || 'N/A'}</td>
              <td><span class="status-badge ${statusClass}">${breeder.status}</span></td>
              <td>${actionsHtml}</td>
            `;
            tableBody.appendChild(row);
          });
        } catch (error) {
          console.error('Error loading breeders:', error);
          const tableBody = document.getElementById('breederTableBody');
          tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error loading breeders: ${error.message}</td></tr>`;
        }
      }

      // Approve breeder function
      async function approveBreeder(button, breederId) {
        if (!confirm('Are you sure you want to approve this breeder?')) return;

        try {
          await adminApiFetch(`/api/admins/approve/${breederId}`, { method: 'POST' });

          notify('Breeder approved successfully!', 'success');
          loadBreeders(); // Reload the table
        } catch (error) {
          console.error('Error approving breeder:', error);
          notify('Error approving breeder: ' + error.message, 'error');
        }
      }

      // Reject breeder function
      async function rejectBreeder(button, breederId) {
        if (!confirm('Are you sure you want to reject this breeder?')) return;

        try {
          await adminApiFetch(`/api/admins/reject/${breederId}`, { method: 'POST' });

          notify('Breeder rejected successfully!', 'success');
          loadBreeders(); // Reload the table
        } catch (error) {
          console.error('Error rejecting breeder:', error);
          notify('Error rejecting breeder: ' + error.message, 'error');
        }
      }

      // Filter table function
      function filterTable() {
        const statusValue = document.getElementById('filterStatus').value;
        const speciesValue = document.getElementById('filterSpecies').value;
        const rows = document.querySelectorAll('#breederTableBody tr');

        rows.forEach(row => {
          const rowStatus = row.getAttribute('data-status');
          const rowSpecies = row.getAttribute('data-species');
          const statusMatch = statusValue === 'all' || rowStatus === statusValue;
          const speciesMatch = speciesValue === 'all' || rowSpecies === speciesValue;
          if (statusMatch && speciesMatch) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      }

      // Export functions
      function exportCSV() {
        alert('Exporting breeder data as CSV...');
        // Implementation would go here
      }

      // Handles export pdf behavior for this page.
      function exportPDF() {
        alert('Exporting breeder data as PDF...');
        // Implementation would go here
      }

      // Add event listeners to filters
      document.addEventListener('DOMContentLoaded', () => {
        loadBreeders();
        const filterStatus = document.getElementById('filterStatus');
        const filterSpecies = document.getElementById('filterSpecies');

        filterStatus.addEventListener('change', filterTable);
        filterSpecies.addEventListener('change', filterTable);
      });

      (function(){
        const btn = document.getElementById('logoutBtn');
        if (btn) {
          btn.addEventListener('click', function(e){
            localStorage.removeItem('admin');
            localStorage.removeItem('breeder');
            localStorage.removeItem('token');
            localStorage.removeItem('admin_id');
            localStorage.removeItem('breeder_id');
            window.location.href = '/index.html';
          });
        }
      })();
