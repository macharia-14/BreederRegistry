document.addEventListener("DOMContentLoaded", () => {
  // --- Sidebar and Page Navigation ---
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  // 1. Mobile Sidebar Toggle
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // 2. Page Switching Logic
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      // Deactivate all nav items
      navItems.forEach((nav) => nav.classList.remove("active"));
      // Activate the clicked one
      item.classList.add("active");

      const sectionId = item.getAttribute("data-section");

      // Hide all pages
      pages.forEach((page) => {
        if (!page.classList.contains("hidden")) {
          page.classList.add("hidden");
        }
      });

      // Show the target page
      const targetPage = document.getElementById(sectionId);
      console.log('🔍 Target page:', targetPage); // Debugging line
      if (targetPage) {
        console.log(`Removing 'hidden' class from: ${sectionId}`); // Debugging line
        targetPage.classList.remove("hidden");
      } else {
        console.error('Target page not found:', sectionId); // Debugging line
      }

      // Close sidebar on mobile after navigation
      if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
      }
    });
  });

  // --- Dynamic Form Logic ---

  // 3. Register Animal: Dynamic Breed Dropdown
  const animalTypeSelect = document.getElementById("animalType");
  const breedSelect = document.getElementById("breed");
  const genderSelect = document.getElementById("gender");
  
  if (animalTypeSelect && breedSelect && genderSelect) {
    const breedsData = {
      cattle: {
        male: ["Angus", "Hereford", "Holstein", "Charolais", "Limousin", "Brahman", "Simmental"],
        female: ["Holstein-Friesian", "Jersey", "Guernsey", "Ayrshire","Brown Swiss"],
      },
      sheep: {
        male: ["Merino", "Dorper", "Suffolk", "Rambouillet","Hampshire","Dorset"],
        female: ["Merino", "Dorper", "Suffolk", "Rambouillet","Hampshire","Dorset"],
      },
      goat: {
        male: ["Boer", "Saanen", "Nubian", "Alpine","Toggenburg","Kiko","LaMancha"],
        female: ["Boer", "Saanen", "Nubian", "Alpine","Toggenburg","Kiko","LaMancha"],
      },
      pig: {
        male: ["Duroc", "Large White", "Landrace", "Hampshire", "Berkshire", "Pietrain","Tamworth"],
        female: ["Duroc", "Large White", "Landrace", "Hampshire", "Berkshire", "Pietrain","Tamworth"],
      },
      horse: {
        male: ["Thoroughbred", "Quarter Horse", "Arabian","Mustang", "Shire", "Clydesdale"],
        female: ["Thoroughbred", "Quarter Horse", "Arabian","Mustang", "Shire", "Clydesdale"],
      },
      dog: {
        male: ["German Shepherd", "Labrador Retriever", "Golden Retriever", "Rottweiler", "Bulldog"],
        female: ["German Shepherd", "Labrador Retriever", "Golden Retriever", "Rottweiler", "Bulldog"],
      },
      
    };

    function updateBreedDropdown() {
      const selectedType = animalTypeSelect.value;
      const selectedGender = genderSelect.value;
      
      breedSelect.innerHTML = '<option value="">Select Breed</option>';
      
      if (selectedType && selectedGender && breedsData[selectedType] && breedsData[selectedType][selectedGender]) {
        breedSelect.disabled = false;
        breedsData[selectedType][selectedGender].forEach((breed) => {
          const option = document.createElement("option");
          option.value = breed.toLowerCase().replace(" ", "-");
          option.textContent = breed;
          breedSelect.appendChild(option);
        });
      } else {
        breedSelect.disabled = true;
        breedSelect.innerHTML = '<option value="">Select Animal Type and Gender First</option>';
      }
    }

    animalTypeSelect.addEventListener("change", updateBreedDropdown);
    genderSelect.addEventListener("change", updateBreedDropdown);
    
    // Add event listener for animal type dropdown to filter parent selection
    animalTypeSelect.addEventListener("change", updateParentSelection);
    
    // Function to update parent selection based on animal type
    function updateParentSelection() {
        const selectedType = animalTypeSelect.value;
        populateAnimalDropdowns(selectedType);
    }
  }

  // 4. Breeding Event: Conditional Fields
  const breedingMethodSelect = document.getElementById("breedingMethod");
  const sireSection = document.getElementById("sireSection");
  const aiFields = document.getElementById("aiFields");
  const etFields = document.getElementById("etFields");

  if (breedingMethodSelect && sireSection && aiFields && etFields) {
    breedingMethodSelect.addEventListener("change", () => {
      const method = breedingMethodSelect.value;
      // Reset all to hidden/default state first
      sireSection.classList.remove("hidden");
      aiFields.classList.add("hidden");
      etFields.classList.add("hidden");
      document.getElementById("sireLabel").textContent = "Sire/Father ID";

      if (method === "ai" || method === "et" || method === "ivf") {
        aiFields.classList.remove("hidden");
        document.getElementById("sireLabel").textContent =
          "Sire/Father ID (if known)";
      }
      if (method === "et" || method === "ivf") {
        etFields.classList.remove("hidden");
      }
    });
  }

  // --- Other UI elements ---
  const notificationBell = document.querySelector(".notification-bell");
  const notificationDropdown = document.querySelector(".notification-dropdown");

  if (notificationBell && notificationDropdown) {
    notificationBell.addEventListener("click", (event) => {
      event.stopPropagation();
      notificationDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (event) => {
      if (
        !notificationBell.contains(event.target) &&
        !notificationDropdown.contains(event.target)
      ) {
        notificationDropdown.classList.remove("show");
      }
    });
  }

  // --- Form Event Listeners ---
  const registerForm = document.getElementById("registerForm");
  const breedingForm = document.getElementById("breedingForm");

  if (registerForm) {
    registerForm.addEventListener("submit", handleAnimalRegistration);
  }

  if (breedingForm) {
    breedingForm.addEventListener("submit", handleBreedingEvent);
  }

// Add event listener for settings form if it exists
const settingsForm = document.getElementById("settingsForm");
if (settingsForm) {
  settingsForm.addEventListener("submit", handleSettingsUpdate);
}

// Add event listener for lineage query button
const queryBtn = document.getElementById("queryBtn");
const queryIdInput = document.getElementById("queryId");

if (queryBtn && queryIdInput) {
  queryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const animalId = queryIdInput.value.trim();
    if (animalId) {
      searchLineage(animalId, true);
    } else {
      showMessage("Please enter an Animal ID", "error");
    }
  });

  // Also allow Enter key to trigger search
  queryIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      queryBtn.click();
    }
  });
}

// Add event listener for records page navigation
const recordsNavItem = document.querySelector('[data-section="records-page"]');
if (recordsNavItem) {
  console.log('Records navigation item found:', recordsNavItem);
  recordsNavItem.addEventListener('click', () => {
    console.log('Records page clicked, loading animal records...');
    // Load animal records when navigating to records page
    setTimeout(loadAnimalRecords, 100); // Small delay to ensure page is visible
  });
} else {
  console.error('Records navigation item NOT found!');
  // Debug: Log all navigation items to see what's available
  const allNavItems = document.querySelectorAll('.nav-item');
  console.log('All navigation items found:', allNavItems.length);
  allNavItems.forEach((item, index) => {
    console.log(`Nav item ${index}:`, item.textContent.trim(), item.getAttribute('data-section'));
  });
}

// Check if user is logged in and populate dropdowns
const savedBreeder = localStorage.getItem('breeder');
if (savedBreeder) {
  try {
    currentBreeder = JSON.parse(savedBreeder);
    // Validate that breeder_id exists
    if (!currentBreeder || !currentBreeder.breeder_id) {
      console.error('Invalid breeder data in localStorage:', currentBreeder);
      localStorage.removeItem('breeder');
      currentBreeder = null;
      showMessage('Please log in again', 'error');
      return;
    }
    
    // Get breeder details including animal_type
    getBreederDetails().then(() => {
      populateAnimalDropdowns();
      loadDashboardData();
    });
  } catch (error) {
    console.error('Error parsing breeder data:', error);
    localStorage.removeItem('breeder');
    currentBreeder = null;
    showMessage('Session expired. Please log in again.', 'error');
  }
}
});

// API Base URL - Use the same origin as the current page to avoid CORS issues
const API_BASE_URL = `${window.location.origin}/api`;

// Store authentication state
let currentBreeder = null;

// API Utility Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    if (options.body) {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            // Handle 422 validation errors specifically
            if (response.status === 422 && data.detail) {
                let errorMessage = 'Validation error: ';
                if (Array.isArray(data.detail)) {
                    errorMessage += data.detail.map(err => {
                        // Handle different error object structures
                        if (err.loc && err.msg) {
                            return `${err.loc.join('.')}: ${err.msg}`;
                        } else if (err.field && err.message) {
                            return `${err.field}: ${err.message}`;
                        } else {
                            return JSON.stringify(err);
                        }
                    }).join(', ');
                } else if (typeof data.detail === 'string') {
                    errorMessage += data.detail;
                } else {
                    errorMessage += JSON.stringify(data.detail);
                }
                throw new Error(errorMessage);
            }
            throw new Error(data.detail || data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        // Handle cases where error.message might be an object
        const errorMsg = error.message && typeof error.message === 'object' 
            ? JSON.stringify(error.message) 
            : error.message || 'Unknown error occurred';
        showMessage(errorMsg, 'error');
        throw error;
    }
}

// Authentication functions
async function login(identifier, password) {
    try {
        const response = await apiRequest('/breeders/login', {
            method: 'POST',
            body: { identifier, password }
        });
        
        // The backend returns {success: true, breeder_id: X, status: "active"}
        // We need to store the breeder_id for API calls
        currentBreeder = { breeder_id: response.breeder_id };
        localStorage.setItem('breeder', JSON.stringify(currentBreeder));
        showMessage('Login successful!', 'success');
        return currentBreeder;
    } catch (error) {
        throw error;
    }
}

function logout() {
    currentBreeder = null;
    localStorage.removeItem('breeder');
    showMessage('Logged out successfully', 'success');
    // Redirect to index.html after logout
    window.location.href = '/Frontend/index.html';
}

// Breeder API functions
async function getBreederDetails() {
    if (!currentBreeder) {
        throw new Error('Not authenticated');
    }
    
    const breederData = await apiRequest(`/breeders/${currentBreeder.breeder_id}`);
    // Store the breeder's animal type for filtering
    currentBreeder.animal_type = breederData.animal_type;
    localStorage.setItem('breeder', JSON.stringify(currentBreeder));
    return breederData;
}

// Animal API functions
async function getAnimals() {
    if (!currentBreeder) {
        throw new Error('Not authenticated');
    }
    
    return await apiRequest(`/breeders/${currentBreeder.breeder_id}/animals`);
}

async function createAnimal(animalData) {
    if (!currentBreeder) {
        throw new Error('Not authenticated');
    }
    
    return await apiRequest(`/breeders/${currentBreeder.breeder_id}/animals`, {
        method: 'POST',
        body: animalData
    });
}

// Breeding Event API functions
async function getBreedingEvents() {
    if (!currentBreeder) {
        throw new Error('Not authenticated');
    }
    
    return await apiRequest(`/breeders/${currentBreeder.breeder_id}/breeding-events`);
}

async function createBreedingEvent(eventData) {
    if (!currentBreeder) {
        throw new Error('Not authenticated');
    }
    
    return await apiRequest(`/breeders/${currentBreeder.breeder_id}/breeding-events`, {
        method: 'POST',
        body: eventData
    });
}

// UI Utility Functions
function showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        ${type === 'error' ? 'background: #dc3545;' : ''}
        ${type === 'success' ? 'background: #28a745;' : ''}
        ${type === 'info' ? 'background: #17a2b8;' : ''}
    `;

    document.body.appendChild(messageEl);

    // Remove after 5 seconds
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Processing...';
    } else {
        button.disabled = false;
        button.innerHTML = button.getAttribute('data-original-text');
    }
}

// Form submission handlers
async function handleAnimalRegistration(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.setAttribute('data-original-text', originalText);
    
    setLoading(submitButton, true);

    try {
        // Debug: Check if form elements exist and have values
        console.log('Form elements:');
        const breed = document.getElementById('breed');
        const gender = document.getElementById('gender');
        const dob = document.getElementById('dob');
        const parent1 = document.getElementById('parent1');
        const parent2 = document.getElementById('parent2');
        
        console.log('breed:', breed?.value);
        console.log('gender:', gender?.value);
        console.log('dob:', dob?.value);
        console.log('parent1:', parent1?.value);
        console.log('parent2:', parent2?.value);
        
        // Use breeder's animal type instead of user selection
        if (!currentBreeder || !currentBreeder.animal_type) {
            throw new Error('Breeder animal type not available. Please refresh the page.');
        }
        
        // Manually extract values instead of using FormData
        const animalData = {
            animal_type: currentBreeder.animal_type,
            breed: breed.value,
            gender: gender.value,
            date_of_birth: dob.value,
            sire_id: parent1.value ? parseInt(parent1.value) : null,
            dam_id: parent2.value ? parseInt(parent2.value) : null
        };

        console.log('Animal data being sent:', animalData); // Log the animal data
        const result = await createAnimal(animalData);
        showMessage(`Animal ${result.animal_id} registered successfully!`, 'success');
        form.reset();
        
        // Refresh animal lists for dropdowns
        await populateAnimalDropdowns();
        
    } catch (error) {
        console.error('Animal registration failed:', error);
    } finally {
        setLoading(submitButton, false);
    }
}

async function handleBreedingEvent(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.setAttribute('data-original-text', originalText);
    
    setLoading(submitButton, true);

    try {
        const formData = new FormData(form);
        const eventData = {
            breeding_method: formData.get('breedingMethod'),
            dam_id: parseInt(formData.get('dam')),
            sire_id: formData.get('sire') ? parseInt(formData.get('sire')) : null,
            breeding_date: formData.get('eventDate'),
            expected_due_date: formData.get('expectedDue') || null,
            offspring_id: formData.get('offspring') ? parseInt(formData.get('offspring')) : null,
            semen_source: formData.get('semenSource') || null,
            ai_technician: formData.get('aiTechnician') || null,
            batch_number: formData.get('batchNumber') || null,
            donor_dam: formData.get('donorDam') || null,
            embryo_id: formData.get('embryoId') || null,
            notes: formData.get('notes') || null
        };

        const result = await createBreedingEvent(eventData);
        showMessage('Breeding event logged successfully!', 'success');
        form.reset();
        
    } catch (error) {
        console.error('Breeding event creation failed:', error);
    } finally {
        setLoading(submitButton, false);
    }
}

// Function to populate animal dropdowns with real data
async function populateAnimalDropdowns(animalType = null) {
    try {
        const animals = await getAnimals();
        
        // Use breeder's animal type for filtering if not explicitly provided
        const filterType = animalType || (currentBreeder ? currentBreeder.animal_type : null);
        
        // Update parent dropdowns in animal registration form
        const parent1Select = document.getElementById('parent1');
        const parent2Select = document.getElementById('parent2');
        
        if (parent1Select && parent2Select) {
            parent1Select.innerHTML = '<option value="">Select Sire (Optional)</option>';
            parent2Select.innerHTML = '<option value="">Select Dam (Optional)</option>';
            
            animals.forEach(animal => {
                // Filter animals based on the breeder's animal type
                if (filterType === null || animal.animal_type === filterType) {
                    const option = document.createElement('option');
                    option.value = animal.id;
                    option.textContent = `${animal.animal_id} (${animal.gender} ${animal.breed})`;
                    
                    if (animal.gender === 'male') {
                        parent1Select.appendChild(option.cloneNode(true));
                    } else if (animal.gender === 'female') {
                        parent2Select.appendChild(option.cloneNode(true));
                    }
                }
            });
        }
        
        // Update dam and sire dropdowns in breeding event form
        const damSelect = document.getElementById('dam');
        const sireSelect = document.getElementById('sire');
        
        if (damSelect && sireSelect) {
            damSelect.innerHTML = '<option value="">Select Dam</option>';
            sireSelect.innerHTML = '<option value="">Select Sire (Optional)</option>';
            
            animals.forEach(animal => {
                // Filter animals based on the breeder's animal type
                if (filterType === null || animal.animal_type === filterType) {
                    const option = document.createElement('option');
                    option.value = animal.id;
                    option.textContent = `${animal.animal_id} (${animal.gender} ${animal.breed})`;
                    
                    if (animal.gender === 'female') {
                        damSelect.appendChild(option.cloneNode(true));
                    } else if (animal.gender === 'male') {
                        sireSelect.appendChild(option.cloneNode(true));
                    }
                }
            });
        }
        
        // Update offspring dropdown if it exists
        const offspringSelect = document.getElementById('offspring');
        if (offspringSelect) {
            offspringSelect.innerHTML = '<option value="">Select Offspring (Optional)</option>';
            animals.forEach(animal => {
                // Filter animals based on the breeder's animal type
                if (filterType === null || animal.animal_type === filterType) {
                    const option = document.createElement('option');
                    option.value = animal.id;
                    option.textContent = `${animal.animal_id} (${animal.breed})`;
                    offspringSelect.appendChild(option);
                }
            });
        }
        
        console.log('Animal dropdowns populated successfully with', animals.length, 'animals filtered by type:', filterType);
        
    } catch (error) {
        console.error('Failed to populate animal dropdowns:', error);
        showMessage('Failed to load animal data. Please refresh the page.', 'error');
    }
}

// Dashboard data loading function
async function loadDashboardData() {
    try {
        // Get animals count
        const animals = await getAnimals();
        const animalsCount = animals.length;
        
        // Get breeding events count
        const breedingEvents = await getBreedingEvents();
        const eventsCount = breedingEvents.length;
        
        // Update dashboard stats
        const animalsCountEl = document.getElementById('animalsCount');
        const eventsCountEl = document.getElementById('eventsCount');
        
        if (animalsCountEl) animalsCountEl.textContent = animalsCount;
        if (eventsCountEl) eventsCountEl.textContent = eventsCount;
        
        // Update recent animals list
        const recentAnimalsList = document.getElementById('recentAnimalsList');
        if (recentAnimalsList) {
            recentAnimalsList.innerHTML = '';
            const recentAnimals = animals.slice(-5).reverse(); // Get 5 most recent
            recentAnimals.forEach(animal => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="animal-id">${animal.animal_id}</span>
                    <span class="animal-breed">${animal.breed}</span>
                    <span class="animal-gender">${animal.gender}</span>
                `;
                recentAnimalsList.appendChild(li);
            });
        }
        
        // Update upcoming events
        const upcomingEventsList = document.getElementById('upcomingEventsList');
        if (upcomingEventsList) {
            upcomingEventsList.innerHTML = '';
            const upcomingEvents = breedingEvents
                .filter(event => event.expected_due_date)
                .sort((a, b) => new Date(a.expected_due_date) - new Date(b.expected_due_date))
                .slice(0, 5);
                
            upcomingEvents.forEach(event => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="event-date">${new Date(event.expected_due_date).toLocaleDateString()}</span>
                    <span class="event-dam">Dam: ${event.dam_id}</span>
                `;
                upcomingEventsList.appendChild(li);
            });
        }
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Animal records loading function
async function loadAnimalRecords() {
    console.log('🔍 loadAnimalRecords() called');
    
    try {
        // Check authentication first
        console.log('🔐 Checking authentication...');
        if (!currentBreeder) {
            const errorMsg = 'User not authenticated. Please log in.';
            console.error('❌ Authentication error:', errorMsg);
            showMessage(errorMsg, 'error');
            return;
        }
        
        console.log('✅ Authenticated with breeder_id:', currentBreeder.breeder_id);
        
        // Fetch animals from API
        console.log('🌐 Fetching animals from API...');
        const animals = await getAnimals();
        console.log('📊 API response received:', animals);
        
        const recordsTableBody = document.getElementById('recordsTableBody');
        
        if (!recordsTableBody) {
            const errorMsg = 'Records table body not found in DOM';
            console.error('❌ DOM error:', errorMsg);
            showMessage(errorMsg, 'error');
            return;
        }
        
        console.log('✅ Records table body found');
        
        // Clear existing rows
        recordsTableBody.innerHTML = '';
        console.log('🧹 Cleared existing table rows');
        
        if (animals.length === 0) {
            console.log('ℹ️ No animals found for this breeder');
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    No animals registered yet. <a href="#" onclick="document.querySelector('[data-section=\"register-page\"]').click(); return false;">Register your first animal</a>
                </td>
            `;
            recordsTableBody.appendChild(emptyRow);
            showMessage('No animals registered yet. Please register your first animal.', 'info');
            return;
        }
        
        console.log(`📋 Found ${animals.length} animals to display`);
        
        // Populate table with animal data
        animals.forEach((animal, index) => {
            console.log(`🐄 Processing animal ${index + 1}:`, animal);
            
            const row = document.createElement('tr');
            
            // Format parents information
            let parentsInfo = 'Sire: -, Dam: -';
            if (animal.sire_id || animal.dam_id) {
                const sireInfo = animal.sire_id ? `Sire: ${animal.sire_id}` : 'Sire: -';
                const damInfo = animal.dam_id ? `Dam: ${animal.dam_id}` : 'Dam: -';
                parentsInfo = `${sireInfo}, ${damInfo}`;
            }
            
            // Determine status (simple logic for now)
            const status = animal.created_at ? 'Verified' : 'Pending';
            const statusClass = status === 'Verified' ? 'status-verified' : 'status-pending';
            
            row.innerHTML = `
                <td>${animal.animal_id}</td>
                <td>${animal.animal_type}</td>
                <td>${animal.breed}</td>
                <td>${animal.gender}</td>
                <td>${new Date(animal.date_of_birth).toLocaleDateString()}</td>
                <td>${parentsInfo}</td>
                <td>
                    <span class="status-badge ${statusClass}">${status}</span>
                </td>
            `;
            
            recordsTableBody.appendChild(row);
            console.log('Current records table body:', recordsTableBody.innerHTML); // Debugging line
            console.log(`✅ Added row for animal ${animal.animal_id}`);
        });
        
        console.log('🎉 Animal records loaded successfully!');
        showMessage(`Loaded ${animals.length} animal records successfully!`, 'success');
        
        // Check if animals array is empty
        if (animals.length === 0) {
            console.warn('No animals found in the response.');
        } else {
            console.log('Animals data:', animals);
        }
        
        // Final visibility check
        const recordsPage = document.getElementById('records-page');
        if (recordsPage) {
            console.log('📋 Records page visibility check:');
            console.log('   - Has "hidden" class:', recordsPage.classList.contains('hidden'));
            console.log('   - Computed display style:', window.getComputedStyle(recordsPage).display);
            console.log('   - Computed visibility style:', window.getComputedStyle(recordsPage).visibility);
        }
        
    } catch (error) {
        console.error('❌ Failed to load animal records:', error);
        
        // More detailed error handling
        let errorMessage = 'Failed to load animal records. ';
        
        if (error.message.includes('Not authenticated')) {
            errorMessage += 'Please log in again.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage += 'Network error. Please check your connection.';
        } else if (error.message.includes('404')) {
            errorMessage += 'API endpoint not found.';
        } else if (error.message.includes('500')) {
            errorMessage += 'Server error. Please try again later.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }
        
        showMessage(errorMessage, 'error');
        
        // Also show error in table for better UX
        const recordsTableBody = document.getElementById('recordsTableBody');
        if (recordsTableBody) {
            const errorRow = document.createElement('tr');
            errorRow.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i> Error loading records: ${errorMessage}
                </td>
            `;
            recordsTableBody.appendChild(errorRow);
        }
    }
}



// Settings form handler (placeholder)
async function handleSettingsUpdate(event) {
    event.preventDefault();
    showMessage('Settings updated successfully!', 'success');
}

// Lineage Search & HTML Generator
async function searchLineage(animalId, isBreederSearch = false) {
  console.log('🔍 searchLineage called with animalId:', animalId);
  
  const resultsContainerId = isBreederSearch ? 'lineageResult' : 'lineage-results';
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
