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
    window.location.href = '/index.html';
}

// Registration Form Handling
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = {};
    const documentsInput = document.getElementById('documents');
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Handle document uploads
    if (documentsInput && documentsInput.files.length > 0) {
      const documents = Array.from(documentsInput.files).map(file => file.name);
      data.documents = documents.join(','); // Store document names as comma-separated string
    } else {
      // If no documents are uploaded, the 'documents' field from FormData is a File object
      // which stringifies to `{}`, causing a validation error.
      // We delete it so it's not included in the request payload.
      delete data.documents;
    }
    
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
    
    try {
      const res = await fetch('/api/breeders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      let result;
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        result = await res.json();
      } else {
        const text = await res.text();
        alert(`Server error: ${res.status} - Please check server logs`);
        return;
      }
      
      if (!res.ok) {
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
        alert(`Registration successful!\nYour farm prefix is: ${result.farm_prefix || 'Generated'}\nWe will be in contact for verification purposes.`);
        registerForm.reset();
        
        // Clean up any breeder type related elements if they exist
        const breederTypeSelect = document.getElementById('breederType');
        if (breederTypeSelect) {
          breederTypeSelect.value = '';
        }
        
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 3000);
      }
    } catch (err) {
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
                window.location.href = '/admin/admin.html';
                return;
            } else {
                const errorResult = await adminRes.json();
            }
        } catch (adminError) {
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
        window.location.href = '/breeders/dashboard.html';
        
    } catch (err) {
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
    
    resultsContainer.textContent = '';
    
    if (breeders.length === 0) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'alert alert-info';
      noResultsDiv.textContent = `No breeders found for breed: "${breedName}"`;
      resultsContainer.appendChild(noResultsDiv);
      return;
    }
    
    const header = document.createElement('h4');
    header.textContent = `Breeders for "${breedName}"`;
    resultsContainer.appendChild(header);
    
    const breedersGrid = document.createElement('div');
    breedersGrid.className = 'breeders-grid';
    resultsContainer.appendChild(breedersGrid);
    
    breeders.forEach(breeder => {
      const breederCard = document.createElement('div');
      breederCard.className = 'breeder-card';
      
      const farmName = document.createElement('h5');
      farmName.textContent = `🏠 ${breeder.farm_name || 'Unnamed Farm'}`;
      breederCard.appendChild(farmName);
      
      const farmPrefix = document.createElement('p');
      farmPrefix.innerHTML = `<strong>Farm Prefix:</strong> ${breeder.farm_prefix || 'Unknown'}`;
      breederCard.appendChild(farmPrefix);
      
      const location = document.createElement('p');
      location.innerHTML = `<strong>Location:</strong> ${breeder.farm_location || 'Unknown'}`;
      breederCard.appendChild(location);
      
      const county = document.createElement('p');
      county.innerHTML = `<strong>County:</strong> ${breeder.county || 'Unknown'}`;
      breederCard.appendChild(county);
      
      const phone = document.createElement('p');
      phone.innerHTML = `<strong>Phone:</strong> ${breeder.phone || 'Not provided'}`;
      breederCard.appendChild(phone);
      
      const email = document.createElement('p');
      email.innerHTML = `<strong>Email:</strong> ${breeder.email || 'Not provided'}`;
      breederCard.appendChild(email);
      
      breedersGrid.appendChild(breederCard);
    });
    
  } catch (error) {
    let resultsContainer = document.getElementById('breed-search-results');
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.id = 'breed-search-results';
      resultsContainer.className = 'search-results-container';
      breedSearchForm.parentNode.appendChild(resultsContainer);
    }
    
    resultsContainer.textContent = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = `Error searching for breed: ${error.message}`;
    resultsContainer.appendChild(errorDiv);
  }
}

// Lineage Search & HTML Generator
async function searchLineage(animalId, isBreederSearch = false) {
  const resultsContainerId = isBreederSearch ? 'lineage-results' : 'lineage-results';
  const resultsContainer = document.getElementById(resultsContainerId);
  
  if (!resultsContainer) {
    return;
  }

  // Show loading state - use textContent instead of innerHTML
  resultsContainer.textContent = '';
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.textContent = 'Searching lineage...';
  resultsContainer.appendChild(loadingDiv);

  try {
    // Call the new backend endpoint
    const url = `/api/public/animals/lineage/${encodeURIComponent(animalId)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Animal with ID "${animalId}" not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const lineageData = await response.json();
    
    if (!lineageData || lineageData.length === 0) {
      resultsContainer.textContent = '';
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'no-results';
      noResultsDiv.textContent = `No lineage information found for animal ID "${animalId}"`;
      resultsContainer.appendChild(noResultsDiv);
      return;
    }

    const lineageHtml = generateLineageHtmlFromPostgres(lineageData);
    resultsContainer.textContent = '';
    
    const header = document.createElement('h4');
    header.className = 'lineage-header';
    header.textContent = `Complete Lineage for ${animalId}`;
    resultsContainer.appendChild(header);
    
    // Create a temporary container to parse the HTML safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = lineageHtml;
    while (tempDiv.firstChild) {
      resultsContainer.appendChild(tempDiv.firstChild);
    }
    
  } catch (error) {
    resultsContainer.textContent = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = error.message;
    resultsContainer.appendChild(errorDiv);
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
  
  // Clear existing content safely
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 9;
  loadingCell.textContent = 'Loading...';
  loadingRow.appendChild(loadingCell);
  tbody.appendChild(loadingRow);
  
  const applications = await fetchPendingApplications();
  
  // Clear loading row
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  if (applications.length === 0) {
    const noAppsRow = document.createElement('tr');
    const noAppsCell = document.createElement('td');
    noAppsCell.colSpan = 9;
    noAppsCell.textContent = 'No pending applications.';
    noAppsRow.appendChild(noAppsCell);
    tbody.appendChild(noAppsRow);
    return;
  }
  
  applications.forEach(app => {
    const row = document.createElement('tr');
    
    const fullNameCell = document.createElement('td');
    fullNameCell.textContent = app.full_name;
    row.appendChild(fullNameCell);
    
    const nationalIdCell = document.createElement('td');
    nationalIdCell.textContent = app.national_id;
    row.appendChild(nationalIdCell);
    
    const animalTypeCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge badge-individual';
    badge.textContent = app.animal_type || 'Unknown';
    animalTypeCell.appendChild(badge);
    row.appendChild(animalTypeCell);
    
    const farmNameCell = document.createElement('td');
    farmNameCell.textContent = app.farm_name || '-';
    row.appendChild(farmNameCell);
    
    const countyCell = document.createElement('td');
    countyCell.textContent = app.county || '-';
    row.appendChild(countyCell);
    
    const phoneCell = document.createElement('td');
    phoneCell.textContent = app.phone;
    row.appendChild(phoneCell);
    
    const emailCell = document.createElement('td');
    emailCell.textContent = app.email;
    row.appendChild(emailCell);
    
    const createdAtCell = document.createElement('td');
    createdAtCell.textContent = new Date(app.created_at).toLocaleDateString();
    row.appendChild(createdAtCell);
    
    const actionsCell = document.createElement('td');
    
    const approveBtn = document.createElement('button');
    approveBtn.className = 'action-btn approve-btn';
    approveBtn.onclick = () => approveApplication(app.id);
    approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
    actionsCell.appendChild(approveBtn);
    
    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'action-btn reject-btn';
    rejectBtn.onclick = () => rejectApplication(app.id);
    rejectBtn.innerHTML = '<i class="fas fa-times"></i> Reject';
    actionsCell.appendChild(rejectBtn);
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'action-btn view-btn';
    viewBtn.onclick = () => viewApplication(app.id);
    viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
    actionsCell.appendChild(viewBtn);
    
    row.appendChild(actionsCell);
    tbody.appendChild(row);
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

function createModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content"></div>`;
  return modal;
}

function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    document.body.removeChild(modal);
  }
}

async function approveAndClose(breederId) {
  // The approveApplication function already has a confirm dialog
  await approveApplication(breederId);
  closeModal();
}

async function rejectAndClose(breederId) {
  // The rejectApplication function already has a confirm dialog
  await rejectApplication(breederId);
  closeModal();
}

async function viewApplication(breederId) {
  const modal = createModal();
  const modalContent = modal.querySelector('.modal-content');
  modalContent.innerHTML = '<div class="loading">Loading application...</div>';
  document.body.appendChild(modal);

  try {
    const res = await fetch(`/api/admins/applications/${breederId}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Failed to load application details.' }));
      throw new Error(errorData.detail || `Error: ${res.status}`);
    }
    const app = await res.json();

    let documentsHtml = 'Not provided';
    if (app.documents) {
      const docList = app.documents.split(',').map(doc => `<li>${doc.trim()}</li>`).join('');
      documentsHtml = `<ul class="document-list">${docList}</ul>`;
    }

    modalContent.innerHTML = `
      <span class="close-button">&times;</span>
      <h2>Application Details</h2>
      <div class="application-details">
        <p><strong>Full Name:</strong> ${app.full_name}</p>
        <p><strong>National ID:</strong> ${app.national_id}</p>
        <p><strong>Animal Type:</strong> <span class="badge badge-individual">${app.animal_type}</span></p>
        <p><strong>Farm Name:</strong> ${app.farm_name}</p>
        <p><strong>Farm Prefix:</strong> ${app.farm_prefix || 'N/A'}</p>
        <p><strong>Farm Location:</strong> ${app.farm_location}</p>
        <p><strong>County:</strong> ${app.county}</p>
        <p><strong>Phone:</strong> ${app.phone}</p>
        <p><strong>Email:</strong> ${app.email}</p>
        <p><strong>Submitted On:</strong> ${new Date(app.created_at).toLocaleString()}</p>
        <div><strong>Uploaded Documents:</strong> ${documentsHtml}</div>
      </div>
      <div class="modal-actions">
        <button class="action-btn approve-btn" onclick="approveAndClose(${app.id})"><i class="fas fa-check"></i> Approve</button>
        <button class="action-btn reject-btn" onclick="rejectAndClose(${app.id})"><i class="fas fa-times"></i> Reject</button>
      </div>
    `;

    modal.querySelector('.close-button').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

  } catch (error) {
    modalContent.innerHTML = `<span class="close-button">&times;</span><div class="error-message">${error.message}</div>`;
    modal.querySelector('.close-button').addEventListener('click', closeModal);
  }
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
  
  // Clear existing content safely
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 9;
  loadingCell.textContent = 'Loading...';
  loadingRow.appendChild(loadingCell);
  tbody.appendChild(loadingRow);
  
  const breeders = await fetchApprovedBreeders();
  
  // Clear loading row
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  if (breeders.length === 0) {
    const noBreedersRow = document.createElement('tr');
    const noBreedersCell = document.createElement('td');
    noBreedersCell.colSpan = 9;
    noBreedersCell.textContent = 'No approved breeders found.';
    noBreedersRow.appendChild(noBreedersCell);
    tbody.appendChild(noBreedersRow);
    return;
  }
  
  breeders.forEach(breeder => {
    const row = document.createElement('tr');
    
    const fullNameCell = document.createElement('td');
    fullNameCell.textContent = breeder.full_name;
    row.appendChild(fullNameCell);
    
    const farmPrefixCell = document.createElement('td');
    farmPrefixCell.textContent = breeder.farm_prefix || '-';
    row.appendChild(farmPrefixCell);
    
    const farmNameCell = document.createElement('td');
    farmNameCell.textContent = breeder.farm_name || '-';
    row.appendChild(farmNameCell);
    
    const countyCell = document.createElement('td');
    countyCell.textContent = breeder.county || '-';
    row.appendChild(countyCell);
    
    const animalTypeCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge badge-individual';
    badge.textContent = breeder.animal_type || 'Unknown';
    animalTypeCell.appendChild(badge);
    row.appendChild(animalTypeCell);
    
    const emailCell = document.createElement('td');
    emailCell.textContent = breeder.email || 'Not provided';
    row.appendChild(emailCell);
    
    const phoneCell = document.createElement('td');
    phoneCell.textContent = breeder.phone;
    row.appendChild(phoneCell);
    
    const statusCell = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status-approved';
    statusSpan.textContent = 'Approved';
    statusCell.appendChild(statusSpan);
    row.appendChild(statusCell);
    
    const approvedAtCell = document.createElement('td');
    approvedAtCell.textContent = breeder.approved_at ? new Date(breeder.approved_at).toLocaleDateString() : '-';
    row.appendChild(approvedAtCell);
    
    const actionsCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.onclick = () => deleteBreeder(breeder.id);
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);
    
    tbody.appendChild(row);
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
  
  // Clear existing content safely
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 9;
  loadingCell.textContent = 'Loading...';
  loadingRow.appendChild(loadingCell);
  tbody.appendChild(loadingRow);
  
  const applications = await fetchRejectedApplications();
  
  // Clear loading row
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  if (applications.length === 0) {
    const noAppsRow = document.createElement('tr');
    const noAppsCell = document.createElement('td');
    noAppsCell.colSpan = 9;
    noAppsCell.textContent = 'No rejected applications.';
    noAppsRow.appendChild(noAppsCell);
    tbody.appendChild(noAppsRow);
    return;
  }
  
  applications.forEach(app => {
    const row = document.createElement('tr');
    
    const fullNameCell = document.createElement('td');
    fullNameCell.textContent = app.full_name;
    row.appendChild(fullNameCell);
    
    const nationalIdCell = document.createElement('td');
    nationalIdCell.textContent = app.national_id;
    row.appendChild(nationalIdCell);
    
    const animalTypeCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge badge-individual';
    badge.textContent = app.animal_type || 'Unknown';
    animalTypeCell.appendChild(badge);
    row.appendChild(animalTypeCell);
    
    const farmNameCell = document.createElement('td');
    farmNameCell.textContent = app.farm_name || '-';
    row.appendChild(farmNameCell);
    
    const countyCell = document.createElement('td');
    countyCell.textContent = app.county || '-';
    row.appendChild(countyCell);
    
    const phoneCell = document.createElement('td');
    phoneCell.textContent = app.phone;
    row.appendChild(phoneCell);
    
    const emailCell = document.createElement('td');
    emailCell.textContent = app.email;
    row.appendChild(emailCell);
    
    const createdAtCell = document.createElement('td');
    createdAtCell.textContent = new Date(app.created_at).toLocaleDateString();
    row.appendChild(createdAtCell);
    
    const rejectedAtCell = document.createElement('td');
    rejectedAtCell.textContent = app.rejected_at ? new Date(app.rejected_at).toLocaleDateString() : '-';
    row.appendChild(rejectedAtCell);
    
    tbody.appendChild(row);
  });
}
