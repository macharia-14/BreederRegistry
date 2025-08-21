document.addEventListener('DOMContentLoaded', function () {
    // --- Mobile Sidebar Toggle ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const adminContent = document.querySelector('.admin-content');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (event) => {
            // Prevent this click from bubbling up to the adminContent listener
            event.stopPropagation();
            sidebar.classList.toggle('active');
        });
    }

    // Close the sidebar if user clicks on the main content area
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

    // Set the first section as active by default if none are
    const firstSection = document.querySelector('.admin-section');
    if (firstSection && !document.querySelector('.admin-section.active')) {
        firstSection.classList.add('active');
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent page reload

            const sectionId = item.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);

            if (targetSection) {
                // Hide all sections and deactivate all nav items
                sections.forEach(sec => sec.classList.remove('active'));
                navItems.forEach(nav => nav.classList.remove('active'));

                // Show the target section and activate the clicked nav item
                targetSection.classList.add('active');
                item.classList.add('active');

                // On mobile, hide the sidebar after clicking a nav item
                if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    });

    // --- Notification Dropdown ---
    const notificationBell = document.querySelector('.notification-bell');
    const notificationDropdown = document.querySelector('.notification-dropdown');

    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener('click', (event) => {
            event.stopPropagation();
            notificationDropdown.classList.toggle('show');
        });

        // Close dropdown if clicking outside of it
        document.addEventListener('click', (event) => {
            if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
                notificationDropdown.classList.remove('show');
            }
        });
    }
});

function markAllAsRead() {
    // Logic to mark all notifications as read
    console.log('Marking all notifications as read...');
}

function logout() {
    // Logic for user logout
    console.log('Logging out...');
}


// ===========================
// Mock Data / Placeholder Functions
// Replace these with real API calls
// ===========================
async function getAnimals() {
  const res = await fetch('/api/animals');
  return res.ok ? await res.json() : [];
}

async function getBreeders() {
  const res = await fetch('/api/breeders');
  return res.ok ? await res.json() : [];
}

async function getBreedingEvents() {
  const res = await fetch('/api/breeding-events');
  return res.ok ? await res.json() : [];
}

// ===========================
// Registration Form Handling
// ===========================
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm).entries());
    try {
      const res = await fetch('/api/breeders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      alert(result.message || 'Registration submitted!');
      registerForm.reset();
    } catch (err) {
      console.error(err);
      alert('Error submitting registration.');
    }
  });
}

// ===========================
// Login Form Handling
// ===========================
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm).entries());
    try {
      const res = await fetch('/api/breeders/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        window.location.href = '/dashboard.html';
      } else {
        alert(result.message || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error logging in.');
    }
  });
}

// Admin Sidebar Navigation
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    // Remove active from all nav-items and sections
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    // Add active to clicked nav-item and corresponding section
    this.classList.add('active');
    const sectionId = this.getAttribute('data-section');
    if (sectionId) {
      document.getElementById(sectionId).classList.add('active');
    }
  });
});

// ===========================
// Breeder Dashboard Forms
// ===========================
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

// ===========================
// Public Lineage Search Form
// ===========================
const publicLineageForm = document.getElementById('public-lineage-form');
if (publicLineageForm) {
  publicLineageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const animalId = document.getElementById('publicSearchId').value.trim();
    if (animalId) searchLineage(animalId, false);
  });
}

// ===========================
// Lineage Search & HTML Generator
// ===========================
async function searchLineage(animalId, isBreederSearch = false) {
  const animals = await getAnimals();
  const animal = animals.find(a => a.id === animalId);
  const resultsContainerId = isBreederSearch ? 'lineage-results' : 'public-lineage-results';
  const resultsContainer = document.getElementById(resultsContainerId);
  if (!resultsContainer) return;

  if (!animal) {
    resultsContainer.innerHTML = `<div class="alert alert-error">Animal with ID "${animalId}" not found in the blockchain.</div>`;
    return;
  }

  const breeders = await getBreeders();
  const breeder = breeders.find(b => b.id === animal.breederId);
  const farmPrefix = breeder?.prefix || 'Unknown';
  const breedingEvents = await getBreedingEvents();
  const lineageHtml = generateLineageHtml(animal, animals, farmPrefix, breedingEvents);

  resultsContainer.innerHTML = `<h4>Complete Lineage & Breeding Information for ${animalId}</h4>${lineageHtml}`;
}

function generateLineageHtml(animal, allAnimals, farmPrefix, breedingEvents) {
  let html = `
    <div class="lineage-item">
      <h5>🐄 ${animal.id}</h5>
      <p><strong>Breed:</strong> ${animal.breed}</p>
      <p><strong>Date of Birth:</strong> ${new Date(animal.dob).toLocaleDateString()}</p>
      <p><strong>Farm Prefix:</strong> ${farmPrefix}</p>
      <p><strong>Registered:</strong> ${new Date(animal.registeredAt).toLocaleDateString()}</p>
    </div>
  `;

  // Parent Information
  if (animal.parentIds.length > 0) {
    html += '<h5>👨‍👩‍👧‍👦 Parent Lineage</h5>';
    animal.parentIds.forEach(pid => {
      const parent = allAnimals.find(a => a.id === pid);
      if (parent) {
        const pBreeder = getBreeders().then(b => b.find(b => b.id === parent.breederId));
        html += `
          <div class="lineage-item">
            <h6>🐄 ${parent.id}</h6>
            <p><strong>Breed:</strong> ${parent.breed}</p>
            <p><strong>Date of Birth:</strong> ${new Date(parent.dob).toLocaleDateString()}</p>
            <p><strong>Farm:</strong> ${pBreeder?.prefix || 'Unknown'}</p>
          </div>
        `;
      } else {
        html += `<div class="lineage-item"><h6>🐄 ${pid}</h6><p><em>Parent info not available</em></p></div>`;
      }
    });
  } else {
    html += '<div class="lineage-item"><p><em>No parent information available</em></p></div>';
  }

  // Breeding events & offspring
  const asParentEvents = breedingEvents.filter(ev => ev.parent1Id === animal.id || ev.parent2Id === animal.id);
  if (asParentEvents.length > 0) {
    html += '<h5>🍼 Breeding Events (As Parent)</h5>';
    asParentEvents.forEach(ev => {
      const otherParentId = ev.parent1Id === animal.id ? ev.parent2Id : ev.parent1Id;
      html += `<div class="lineage-item">
        <h6>💕 Event - ${new Date(ev.recordedAt).toLocaleDateString()}</h6>
        <p><strong>Partners:</strong> ${animal.id} × ${otherParentId}</p>
        <p><strong>Offspring:</strong> ${ev.offspringIds.join(', ')}</p>
      </div>`;
    });
  }

  const offspring = asParentEvents.flatMap(ev => ev.offspringIds);
  const uniqueOffspring = [...new Set(offspring)];
  if (uniqueOffspring.length > 0) {
    html += '<h5>👶 Known Offspring</h5>';
    uniqueOffspring.forEach(cid => {
      const child = allAnimals.find(a => a.id === cid);
      if (child) html += `<div class="lineage-item"><h6>🐄 ${child.id}</h6><p><strong>Breed:</strong> ${child.breed}</p></div>`;
      else html += `<div class="lineage-item"><h6>🐄 ${cid}</h6><p><em>Details not available</em></p></div>`;
    });
  }

  html += `<div class="lineage-item" style="background:#e8f4fd;border-left-color:#3498db;">
    <h6>📊 Summary</h6>
    <p><strong>Total Parents:</strong> ${animal.parentIds.length}</p>
    <p><strong>Breeding Events (as parent):</strong> ${asParentEvents.length}</p>
    <p><strong>Total Offspring:</strong> ${uniqueOffspring.length}</p>
    <p><strong>Generation Status:</strong> ${animal.parentIds.length === 0 ? 'Foundation Animal' : 'Descendant'}</p>
  </div>`;

  return html;
}
