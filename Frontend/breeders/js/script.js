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
      if (targetPage) {
        targetPage.classList.remove("hidden");
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
      populateAnimalDropdowns();
      loadDashboardData();
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
        const animalType = document.getElementById('animalType');
        const breed = document.getElementById('breed');
        const gender = document.getElementById('gender');
        const dob = document.getElementById('dob');
        const parent1 = document.getElementById('parent1');
        const parent2 = document.getElementById('parent2');
        
        console.log('animalType:', animalType?.value);
        console.log('breed:', breed?.value);
        console.log('gender:', gender?.value);
        console.log('dob:', dob?.value);
        console.log('parent1:', parent1?.value);
        console.log('parent2:', parent2?.value);
        
        // Manually extract values instead of using FormData
        const animalData = {
            animal_type: animalType.value,
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
        
        // Update parent dropdowns in animal registration form
        const parent1Select = document.getElementById('parent1');
        const parent2Select = document.getElementById('parent2');
        
        if (parent1Select && parent2Select) {
            parent1Select.innerHTML = '<option value="">Select Sire (Optional)</option>';
            parent2Select.innerHTML = '<option value="">Select Dam (Optional)</option>';
            
            animals.forEach(animal => {
                // Filter animals based on the selected animal type
                if (animalType === null || animal.animal_type === animalType) {
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
                // Filter animals based on the selected animal type
                if (animalType === null || animal.animal_type === animalType) {
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
                // Filter animals based on the selected animal type
                if (animalType === null || animal.animal_type === animalType) {
                    const option = document.createElement('option');
                    option.value = animal.id;
                    option.textContent = `${animal.animal_id} (${animal.breed})`;
                    offspringSelect.appendChild(option);
                }
            });
        }
        
        console.log('Animal dropdowns populated successfully with', animals.length, 'animals');
        
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



// Settings form handler (placeholder)
async function handleSettingsUpdate(event) {
    event.preventDefault();
    showMessage('Settings updated successfully!', 'success');
}
