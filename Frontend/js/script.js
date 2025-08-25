document.addEventListener('DOMContentLoaded', function () {
    // --- Mobile Sidebar Toggle ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const adminContent = document.querySelector('.admin-content');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            sidebar.classList.toggle('active');
        });
    }

    if (adminContent && sidebar) {
        adminContent.addEventListener('click', () => {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }

    // --- Dashboard Section Switching ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.admin-section');

    const firstSection = document.querySelector('.admin-section');
    if (firstSection && !document.querySelector('.admin-section.active')) {
        firstSection.classList.add('active');
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);

            if (targetSection) {
                sections.forEach(sec => sec.classList.remove('active'));
                navItems.forEach(nav => nav.classList.remove('active'));
                targetSection.classList.add('active');
                item.classList.add('active');

                if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    });

    
});



function logout() {
    localStorage.removeItem('admin');
    localStorage.removeItem('breeder');
    localStorage.removeItem('token');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('breeder_id');
    console.log('Logged out successfully');
    window.location.href = '/Frontend/index.html';
}



// Registration Form Handling
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    console.log('Form data collected:', data);
    
    if (!data.farm_name || data.farm_name.trim() === '') {
      data.farm_name = `${data.full_name}'s Farm`;
    }
    
    delete data.confirm_password;
    
    if (!data.farm_prefix || data.farm_prefix.trim() === '') {
      delete data.farm_prefix;
    }
    
    const requiredFields = ['full_name', 'national_id', 'animal_type', 'farm_name', 'farm_location', 'county', 'phone', 'email', 'password'];
    const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === '');
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    console.log('Sending registration data:', data);
    
    try {
      const res = await fetch('/api/breeders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log('Response status:', res.status);
      
      let result;
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        result = await res.json();
        console.log('Server response:', result);
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        alert(`Server error: ${res.status} - Please check server logs`);
        return;
      }
      
      if (!res.ok) {
        console.error('Registration failed:', result);
        let errorMessage = 'Registration failed';
        
        if (result.detail) {
          if (typeof result.detail === 'string') {
            errorMessage = result.detail;
          } else if (Array.isArray(result.detail)) {
            errorMessage = result.detail.map(err => {
              const field = err.loc ? err.loc[err.loc.length - 1] : 'unknown';
              return `${field}: ${err.msg}`;
            }).join('\n');
          }
        } else if (result.message) {
          errorMessage = result.message;
        }
        
        alert(errorMessage);
      } else {
        console.log('Registration successful:', result);
        alert(`Registration successful!\nYour farm prefix is: ${result.farm_prefix || 'Generated'}\nWe will be in contact for verification purposes.`);
        registerForm.reset();
        
        // Clean up any breeder type related elements if they exist
        const breederTypeSelect = document.getElementById('breederType');
        if (breederTypeSelect) {
          breederTypeSelect.value = '';
        }
        
        setTimeout(() => {
          window.location.href = './Frontend/index.html';
        }, 3000);
      }
    } catch (err) {
      console.error('Network or parsing error:', err);
      alert('Network error. Please check your connection and try again.');
    }
  });
}



// Simplified prefix validation
(function () {
  const farmPrefixInput = document.getElementById("farmPrefix");
  const validationMessage = document.getElementById("prefix-validation-message");
  
  if (farmPrefixInput && validationMessage) {
    farmPrefixInput.addEventListener("input", () => {
      const prefix = farmPrefixInput.value.toUpperCase();
      farmPrefixInput.value = prefix;
      
      if (prefix.length === 0) {
        validationMessage.textContent = "Farm prefix will be auto-generated if left empty";
        validationMessage.className = "validation-message";
      } else if (prefix.length === 3 && /^[A-Z]{3}$/.test(prefix)) {
        validationMessage.textContent = "Valid format! (Will be checked on submission)";
        validationMessage.className = "validation-message success";
        farmPrefixInput.setCustomValidity("");
      } else {
        validationMessage.textContent = "Must be exactly 3 uppercase letters";
        validationMessage.className = "validation-message error";
        farmPrefixInput.setCustomValidity("Must be exactly 3 uppercase letters");
      }
    });
  }
})();

// Password validation
(function () {
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  if (passwordInput && confirmPasswordInput) {
    const passwordMatchMessage = document.createElement("div");
    passwordMatchMessage.className = "validation-message";
    confirmPasswordInput.parentNode.insertBefore(
      passwordMatchMessage,
      confirmPasswordInput.nextSibling
    );

    function validatePasswords() {
      if (confirmPasswordInput.value === "") {
        passwordMatchMessage.textContent = "";
        confirmPasswordInput.setCustomValidity("");
        return;
      }
      if (passwordInput.value !== confirmPasswordInput.value) {
        const message = "Passwords do not match.";
        confirmPasswordInput.setCustomValidity(message);
        passwordMatchMessage.textContent = message;
        passwordMatchMessage.className = "validation-message error";
      } else {
        confirmPasswordInput.setCustomValidity("");
        passwordMatchMessage.textContent = "Passwords match!";
        passwordMatchMessage.className = "validation-message success";
      }
    }
    passwordInput.addEventListener("input", validatePasswords);
    confirmPasswordInput.addEventListener("input", validatePasswords);
  }
})();

// Login Form Handling
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm).entries());
    
    const loginIdentifier = data.loginEmail || data.email;
    const password = data.loginPassword || data.password;
    
    if (loginIdentifier && loginIdentifier.includes('@') && loginIdentifier.includes('.')) {
        try {
            const loginData = {
                email: loginIdentifier,
                password: password
            };
            
            const adminRes = await fetch('/api/admins/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            
            if (adminRes.ok) {
                const result = await adminRes.json();
                localStorage.setItem('token', 'admin-token-placeholder');
                localStorage.setItem('admin', 'true');
                localStorage.setItem('admin_id', result.admin_id);
                window.location.href = '/Frontend/admin/admin.html';
                return;
            } else {
                const errorResult = await adminRes.json();
                console.log('Admin login failed:', errorResult);
            }
        } catch (adminError) {
            console.log('Admin login error:', adminError);
        }
    }
    
    try {
        const loginData = {
            identifier: loginIdentifier,
            password: password
        };
        
        const breederRes = await fetch('/api/breeders/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });
        
        const result = await breederRes.json();
        
        if (!breederRes.ok) {
            const errorMessage = Array.isArray(result.detail)
                ? result.detail.map(err => `${err.loc.slice(-1)}: ${err.msg}`).join('\n')
                : result.detail;
            alert(errorMessage || 'Login failed. Please check your credentials.');
            return;
        }
        
        if (result.status === 'pending') {
            alert('Your application is still pending approval. Please wait for administrator approval.');
            return;
        }
        
        if (result.status === 'rejected') {
            alert('Your application has been rejected. Please contact support for more information.');
            return;
        }
        
        localStorage.setItem('token', 'breeder-token-placeholder');
        localStorage.setItem('breeder', JSON.stringify({ breeder_id: result.breeder_id }));
        window.location.href = '/Frontend/breeders/dashboard.html';
        
    } catch (err) {
        console.error(err);
        alert('Error logging in. Please try again.');
    }
  });
}

// Admin Sidebar Navigation
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    this.classList.add('active');
    const sectionId = this.getAttribute('data-section');
    if (sectionId) {
      document.getElementById(sectionId).classList.add('active');
    }
  });
});

// Breeder Dashboard Forms
const animalForm = document.getElementById('animal-form');
if (animalForm) {
  animalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(animalForm).entries());
    try {
      const res = await fetch('/api/animals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      alert(result.message || 'Animal registered!');
      animalForm.reset();
    } catch (err) {
      console.error(err);
      alert('Error registering animal.');
    }
  });
}

const breedingForm = document.getElementById('breeding-form');
if (breedingForm) {
  breedingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(breedingForm).entries());
    data.offspringIds = data.offspringIds.split(',').map(id => id.trim());
    try {
      const res = await fetch('/api/breeding-events/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      alert(result.message || 'Breeding event recorded!');
      breedingForm.reset();
    } catch (err) {
      console.error(err);
      alert('Error recording breeding event.');
    }
  });
}

const breederLineageForm = document.getElementById('breeder-lineage-form');
if (breederLineageForm) {
  breederLineageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const animalId = document.getElementById('searchAnimalId').value.trim();
    if (animalId) searchLineage(animalId, true);
  });
}

// Public Lineage Search Form
const publicLineageForm = document.getElementById('public-lineage-form');
if (publicLineageForm) {
  publicLineageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const animalId = document.getElementById('publicSearchId').value.trim();
    if (animalId) searchLineage(animalId, false);
  });
}

// Hero Search Form (Breed Search on index.html)
const heroSearchForm = document.getElementById('hero-search-form');
if (heroSearchForm) {
  heroSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const breedName = document.getElementById('hero-search-input').value.trim();
    if (breedName) searchBreed(breedName);
  });
}

// Lineage Search Form (on lineage_search.html)
const lineageSearchForm = document.getElementById('lineage-search-form');
if (lineageSearchForm) {
  lineageSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const animalId = document.getElementById('lineage-search-input').value.trim();
    if (animalId) searchLineage(animalId, false);
  });
}

// Breed Search Function
async function searchBreed(breedName) {
  try {
    const response = await fetch(`/api/public/animals/breed/${encodeURIComponent(breedName)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const breeders = await response.json();
    
    // Create a results container or use existing one
    let resultsContainer = document.getElementById('breed-search-results');
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.id = 'breed-search-results';
      resultsContainer.className = 'search-results-container';
      heroSearchForm.parentNode.appendChild(resultsContainer);
    }
    
    if (breeders.length === 0) {
      resultsContainer.innerHTML = `
        <div class="alert alert-info">
          No breeders found for breed: "${breedName}"
        </div>
      `;
      return;
    }
    
    let html = `
      <h4>Breeders for "${breedName}"</h4>
      <div class="breeders-grid">
    `;
    
    breeders.forEach(breeder => {
      html += `
        <div class="breeder-card">
          <h5>🏠 ${breeder.farm_name || 'Unnamed Farm'}</h5>
          <p><strong>Farm Prefix:</strong> ${breeder.farm_prefix || 'Unknown'}</p>
          <p><strong>Location:</strong> ${breeder.farm_location || 'Unknown'}</p>
          <p><strong>County:</strong> ${breeder.county || 'Unknown'}</p>
          <p><strong>Phone:</strong> ${breeder.phone || 'Not provided'}</p>
          <p><strong>Email:</strong> ${breeder.email || 'Not provided'}</p>
        </div>
      `;
    });
    
    html += '</div>';
    resultsContainer.innerHTML = html;
    
  } catch (error) {
    console.error('Error searching breed:', error);
    let resultsContainer = document.getElementById('breed-search-results');
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.id = 'breed-search-results';
      resultsContainer.className = 'search-results-container';
      breedSearchForm.parentNode.appendChild(resultsContainer);
    }
    resultsContainer.innerHTML = `
      <div class="alert alert-error">
        Error searching for breed: ${error.message}
      </div>
    `;
  }
}

// Lineage Search & HTML Generator
async function searchLineage(animalId, isBreederSearch = false) {
  console.log('🔍 searchLineage called with animalId:', animalId);
  
  const resultsContainerId = isBreederSearch ? 'lineage-results' : 'lineage-results';
  const resultsContainer = document.getElementById(resultsContainerId);
  
  if (!resultsContainer) {
    console.error('❌ Results container not found:', resultsContainerId);
    return;
  }

  // Show loading state
  resultsContainer.innerHTML = '<div class="loading">Searching lineage...</div>';
  console.log('📊 Showing loading state');

  try {
    // Call the new backend endpoint
    const url = `/api/public/animals/lineage/${encodeURIComponent(animalId)}`;
    console.log('🌐 Making API request to:', url);
    
    const response = await fetch(url);
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Animal with ID "${animalId}" not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const lineageData = await response.json();
    console.log('✅ Received lineage data:', lineageData);
    
    if (!lineageData || lineageData.length === 0) {
      resultsContainer.innerHTML = `<div class="no-results">No lineage information found for animal ID "${animalId}"</div>`;
      console.log('ℹ️ No lineage data found');
      return;
    }

    const lineageHtml = generateLineageHtmlFromPostgres(lineageData);
    resultsContainer.innerHTML = `<h4 class="lineage-header">Complete Lineage for ${animalId}</h4>${lineageHtml}`;
    console.log('🎉 Lineage search completed successfully');
    
  } catch (error) {
    console.error('❌ Error searching lineage:', error);
    resultsContainer.innerHTML = `<div class="error-message">${error.message}</div>`;
  }
}

function generateLineageHtmlFromPostgres(lineageData) {
  // Group by generation
  const generations = {};
  lineageData.forEach(animal => {
    const gen = animal.generation;
    if (!generations[gen]) {
      generations[gen] = [];
    }
    generations[gen].push(animal);
  });

  let html = '<div class="lineage-tree">';
  
  // Sort generations in descending order (foundation first)
  const sortedGenerations = Object.keys(generations).sort((a, b) => parseInt(a) - parseInt(b));
  
  sortedGenerations.forEach(gen => {
    const animals = generations[gen];
    html += `<div class="generation">
      <h5>Generation ${gen}</h5>
      <div class="generation-animals">`;
    
    animals.forEach(animal => {
      const isFoundation = parseInt(gen) === 0;
      html += `
        <div class="animal-card ${isFoundation ? 'foundation' : ''}">
          <h3>${animal.animal_id}</h3>
          <p><strong>Breed:</strong> ${animal.breed || 'Unknown'}</p>
          <p><strong>Gender:</strong> ${animal.gender || 'Unknown'}</p>
          <p><strong>Date of Birth:</strong> ${animal.date_of_birth ? new Date(animal.date_of_birth).toLocaleDateString() : 'Unknown'}</p>
          ${animal.sire_id ? `<p><strong>Sire:</strong> ${animal.sire_id}</p>` : ''}
          ${animal.dam_id ? `<p><strong>Dam:</strong> ${animal.dam_id}</p>` : ''}
        </div>
      `;
    });
    
    html += `</div></div>`;
    
    // Add connector between generations (except after the last generation)
    if (parseInt(gen) < Math.max(...sortedGenerations.map(g => parseInt(g)))) {
      html += '<div class="generation-connector"></div>';
    }
  });
  
  // Add summary
  html += `
    <div class="summary-card">
      <h4>Lineage Summary</h4>
      <div class="summary-stats">
        <div class="stat-item">
          <div class="stat-value">${lineageData.length}</div>
          <div class="stat-label">Total Animals</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${sortedGenerations.length}</div>
          <div class="stat-label">Generations</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${generations[0]?.length || 0}</div>
          <div class="stat-label">Foundation Animals</div>
        </div>
      </div>
    </div>
  `;
  
  html += '</div>';
  return html;
}


// Admin functions
async function fetchPendingApplications() {
  const res = await fetch('/api/admins/applications');
  if (!res.ok) return [];
  return await res.json();
}

async function renderPendingApplications() {
  const tbody = document.getElementById('applications-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
  const applications = await fetchPendingApplications();
  if (applications.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No pending applications.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  applications.forEach(app => {
    tbody.innerHTML += `
      <tr>
        <td>${app.full_name}</td>
        <td>${app.national_id}</td>
        <td><span class="badge badge-individual">${app.animal_type || 'Unknown'}</span></td>
        <td>${app.farm_name || '-'}</td>
        <td>${app.county || '-'}</td>
        <td>${app.phone}</td>
        <td>${app.email}</td>
        <td>${new Date(app.created_at).toLocaleDateString()}</td>
        <td>
          <button class="action-btn approve-btn" onclick="approveApplication(${app.id})">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="action-btn reject-btn" onclick="rejectApplication(${app.id})">
            <i class="fas fa-times"></i> Reject
          </button>
          <button class="action-btn view-btn" onclick="viewApplication(${app.id})">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
      </tr>
    `;
  });
}

async function approveApplication(breederId) {
  if (!confirm('Approve this breeder?')) return;
  const res = await fetch(`/api/admins/approve/${breederId}`, { method: 'POST' });
  if (res.ok) {
    alert('Breeder approved!');
    renderPendingApplications();
    renderApprovedBreeders();
    renderStats();
  } else {
    alert('Error approving breeder.');
  }
}

async function rejectApplication(breederId) {
  if (!confirm('Reject this application?')) return;
  const res = await fetch(`/api/admins/reject/${breederId}`, { method: 'POST' });
  if (res.ok) {
    alert('Application rejected!');
    renderPendingApplications();
    renderStats();
  } else {
    alert('Error rejecting application.');
  }
}

function viewApplication(breederId) {
  alert(`Viewing application details for breeder ID: ${breederId}\nThis would show complete application data in a modal.`);
}

async function deleteBreeder(breederId) {
  if (!confirm('Are you sure you want to delete this breeder? This action cannot be undone.')) return;
  const res = await fetch(`/api/admins/breeders/${breederId}`, { method: 'DELETE' });
  if (res.ok) {
    alert('Breeder deleted successfully!');
    renderApprovedBreeders();
    renderStats();
  } else {
    alert('Error deleting breeder.');
  }
}

async function fetchStats() {
  const res = await fetch('/api/admins/stats');
  if (!res.ok) return {};
  return await res.json();
}

async function fetchApprovedBreeders() {
  const res = await fetch('/api/admins/approved-breeders');
  if (!res.ok) return [];
  return await res.json();
}

async function renderApprovedBreeders() {
  const tbody = document.getElementById('farmers-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
  const breeders = await fetchApprovedBreeders();
  if (breeders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No approved breeders found.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  breeders.forEach(breeder => {
    tbody.innerHTML += `
      <tr>
        <td>${breeder.full_name}</td>
        <td>${breeder.farm_prefix || '-'}</td>
        <td>${breeder.farm_name || '-'}</td>
        <td>${breeder.county || '-'}</td>
        <td><span class="badge badge-individual">${breeder.animal_type || 'Unknown'}</span></td>
        <td>${breeder.phone}</td>
        <td><span class="status-approved">Approved</span></td>
        <td>${breeder.approved_at ? new Date(breeder.approved_at).toLocaleDateString() : '-'}</td>
        <td>
          <button class="action-btn delete-btn" onclick="deleteBreeder(${breeder.id})">
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  });
}

async function renderStats() {
  const stats = await fetchStats();
  
  if (document.getElementById('total-breeders-stat')) {
    document.getElementById('total-breeders-stat').textContent = stats.total_breeders || 0;
    document.getElementById('pending-count-stat').textContent = stats.pending_applications || 0;
    document.getElementById('total-animals-stat').textContent = stats.total_animals || 0;
  }
  
  if (document.getElementById('total-breeders')) {
    document.getElementById('total-breeders').textContent = stats.total_breeders || 0;
    document.getElementById('pending-count').textContent = stats.pending_applications || 0;
    document.getElementById('total-animals').textContent = stats.total_animals || 0;
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  renderPendingApplications();
  renderApprovedBreeders();
  renderStats();
  renderRejectedApplications();
  
  // Add logout event listener
  const adminLogoutBtn = document.getElementById('logout-btn');
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});

// Rejected Applications Functions
async function fetchRejectedApplications() {
  const res = await fetch('/api/admins/rejected-applications');
  if (!res.ok) return [];
  return await res.json();
}

async function renderRejectedApplications() {
  const tbody = document.getElementById('rejected-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
  const applications = await fetchRejectedApplications();
  if (applications.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No rejected applications.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  applications.forEach(app => {
    tbody.innerHTML += `
      <tr>
        <td>${app.full_name}</td>
        <td>${app.national_id}</td>
        <td><span class="badge badge-individual">${app.animal_type || 'Unknown'}</span></td>
        <td>${app.farm_name || '-'}</td>
        <td>${app.county || '-'}</td>
        <td>${app.phone}</td>
        <td>${app.email}</td>
        <td>${new Date(app.created_at).toLocaleDateString()}</td>
        <td>${app.rejected_at ? new Date(app.rejected_at).toLocaleDateString() : '-'}</td>
      </tr>
    `;
  });
}
