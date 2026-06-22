// Logic for toggling breeder action menus
function toggleActionMenu(event) {
  event.stopPropagation();
  const dropdown = event.target.nextElementSibling;
  document.querySelectorAll('.action-dropdown').forEach(menu => {
    if (menu !== dropdown) menu.classList.remove('show');
  });
  dropdown.classList.toggle('show');
}
// Global listener to close dropdowns on outer click
document.addEventListener('click', () => {
  document.querySelectorAll('.action-dropdown').forEach(menu => menu.classList.remove('show'));
});
// Fetch and show breeder details in a modal
async function openBreederInfo(breederId) {
  document.querySelectorAll('.action-dropdown').forEach(menu => menu.classList.remove('show'));
  try {
    const breeder = await apiFetch(`/api/breeders/${breederId}`);
    const modal = document.getElementById('breederInfoModal');
    const content = document.getElementById('breederInfoContent');
    let docsHtml = '<p>No documents uploaded</p>';
    if (breeder.documents) {
      const docs = breeder.documents.split(',').filter(doc => doc.trim());
      if (docs.length > 0) {
        docsHtml = '<ul class="docs-list">' + docs.map(doc => `<li><span>${doc.trim()}</span><i class="fas fa-file"></i></li>`).join('') + '</ul>';
      }
    }
    content.innerHTML = `
      <div class="info-group"><label>Full Name</label><p>${breeder.full_name || 'N/A'}</p></div>
      <div class="info-group"><label>Email</label><p>${breeder.email || 'N/A'}</p></div>
      <div class="info-group"><label>Phone</label><p>${breeder.phone || 'N/A'}</p></div>
      <div class="info-group"><label>Farm Name</label><p>${breeder.farm_name || 'N/A'}</p></div>
      <div class="info-group"><label>Farm Location</label><p>${breeder.farm_location || 'N/A'}</p></div>
      <div class="info-group"><label>County</label><p>${breeder.county || 'N/A'}</p></div>
      <div class="info-group"><label>Animal Type</label><p>${breeder.animal_type || 'N/A'}</p></div>
      <div class="info-group"><label>Farm Prefix</label><p>${breeder.farm_prefix || 'N/A'}</p></div>
      <div class="info-group"><label>National ID</label><p>${breeder.national_id || 'N/A'}</p></div>
      <div class="info-group"><label>Status</label><p><span class="status-badge status-${breeder.status || 'pending'}">${breeder.status || 'pending'}</span></p></div>
      <div class="info-group"><label>Uploaded Documents</label>${docsHtml}</div>
    `;
    modal.classList.add('show');
  } catch (error) {
    console.error('Error opening breeder info:', error);
    alert('Error loading breeder information: ' + error.message);
  }
}
// Handles close breeder info behavior for this page.
function closeBreederInfo() {
  document.getElementById('breederInfoModal').classList.remove('show');
}
// Permanently delete a breeder record
async function deleteBreeder(breederId) {
  if (!confirm('Are you sure you want to delete this breeder? This action cannot be undone.')) return;
  try {
    await apiFetch(`/api/admins/breeders/${breederId}`, { method: 'DELETE' });
    showToast('Breeder deleted successfully!', 'success');
    loadBreeders();
  } catch (error) {
    console.error('Error deleting breeder:', error);
    showToast('Error deleting breeder: ' + error.message, 'error');
  }
}
// Aggregated view of all breeders by status
async function loadBreeders() {
  try {
    const [approved, pending, rejected] = await Promise.all([
      apiFetch('/api/admins/approved-breeders').then(ensureArray),
      apiFetch('/api/admins/applications').then(ensureArray),
      apiFetch('/api/admins/rejected-applications').then(ensureArray)
    ]);
    const allBreeders = [
      ...approved.map(b => ({...b, status: 'approved'})),
      ...pending.map(b => ({...b, status: 'pending'})),
      ...rejected.map(b => ({...b, status: 'rejected'}))
    ];
    const tableBody = document.getElementById('breederTableBody');
    tableBody.innerHTML = '';
    if (allBreeders.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No breeders found</td></tr>';
      return;
    }
    allBreeders.forEach(breeder => {
      const row = document.createElement('tr');
      row.setAttribute('data-status', breeder.status);
      row.setAttribute('data-species', (breeder.animal_type || '').toLowerCase());
      let actionsHtml = '';
      if (breeder.status === 'pending') {
        actionsHtml = `<div style="display: flex; gap: 10px; align-items: center;"><div class="action-buttons"><button class="action-btn btn-approve" onclick="approveBreeder(this, ${breeder.id})">Approve</button><button class="action-btn btn-reject" onclick="rejectBreeder(this, ${breeder.id})">Reject</button></div><div class="action-menu-container"><button class="action-menu-btn" onclick="toggleActionMenu(event)" title="More actions">⋮</button><div class="action-dropdown"><a onclick="openBreederInfo(${breeder.id})"><i class="fas fa-info-circle"></i> View Info</a><a class="delete" onclick="deleteBreeder(${breeder.id})"><i class="fas fa-trash"></i> Remove Breeder</a></div></div></div>`;
      } else {
        actionsHtml = `<div style="display: flex; gap: 10px; align-items: center;">${breeder.status === 'rejected' ? '<span class="action-rejected">rejected</span>' : ''}<div class="action-menu-container"><button class="action-menu-btn" onclick="toggleActionMenu(event)" title="More actions">⋮</button><div class="action-dropdown"><a onclick="openBreederInfo(${breeder.id})"><i class="fas fa-info-circle"></i> View Info</a><a class="delete" onclick="deleteBreeder(${breeder.id})"><i class="fas fa-trash"></i> Remove Breeder</a></div></div></div>`;
      }
      row.innerHTML = `<td>${breeder.full_name || 'N/A'}</td><td>${breeder.farm_name || 'N/A'}</td><td>${breeder.county || 'N/A'}</td><td>${breeder.animal_type || 'N/A'}</td><td><span class="status-badge status-${breeder.status}">${breeder.status}</span></td><td>${actionsHtml}</td>`;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading breeders:', error);
    const tableBody = document.getElementById('breederTableBody');
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error loading breeders: ${error.message}</td></tr>`;
  }
}
// Approval/Rejection triggers
async function approveBreeder(button, breederId) {
  if (!confirm('Are you sure you want to approve this breeder?')) return;
  try {
    await apiFetch(`/api/admins/approve/${breederId}`, { method: 'POST' });
    showToast('Breeder approved successfully!', 'success');
    loadBreeders();
  } catch (error) {
    console.error('Error approving breeder:', error);
    showToast('Error approving breeder: ' + error.message, 'error');
  }
}
// Handles reject breeder behavior for this page.
async function rejectBreeder(button, breederId) {
  if (!confirm('Are you sure you want to reject this breeder?')) return;
  try {
    await apiFetch(`/api/admins/reject/${breederId}`, { method: 'POST' });
    showToast('Breeder rejected successfully!', 'success');
    loadBreeders();
  } catch (error) {
    console.error('Error rejecting breeder:', error);
    showToast('Error rejecting breeder: ' + error.message, 'error');
  }
}
// Frontend filtering for breeder table
function filterTable() {
  const statusValue = document.getElementById('filterStatus').value;
  const speciesValue = document.getElementById('filterSpecies').value;
  document.querySelectorAll('#breederTableBody tr').forEach(row => {
    const statusMatch = statusValue === 'all' || row.getAttribute('data-status') === statusValue;
    const speciesMatch = speciesValue === 'all' || row.getAttribute('data-species') === speciesValue;
    row.style.display = (statusMatch && speciesMatch) ? '' : 'none';
  });
}
// Initialization and auth session management
document.addEventListener('DOMContentLoaded', () => {
  loadBreeders();
  document.getElementById('filterStatus')?.addEventListener('change', filterTable);
  document.getElementById('filterSpecies')?.addEventListener('change', filterTable);
});
(function(){
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    ['admin', 'breeder', 'token', 'admin_id', 'breeder_id'].forEach(k => localStorage.removeItem(k));
    ['admin', 'breeder', 'token', 'admin_id', 'breeder_id'].forEach(k => sessionStorage.removeItem(k));
    window.location.href = '/index.html';
  });
})();
