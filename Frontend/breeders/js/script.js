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
  if (animalTypeSelect && breedSelect) {
    const breedsData = {
      cattle: ["Angus", "Hereford", "Holstein", "Brahman"],
      sheep: ["Merino", "Dorper", "Suffolk"],
      goat: ["Boer", "Saanen", "Nubian"],
      pig: ["Duroc", "Yorkshire", "Landrace"],
      horse: ["Thoroughbred", "Quarter Horse", "Arabian"],
      dog: ["German Shepherd", "Labrador Retriever", "Golden Retriever"],
      cat: ["Siamese", "Persian", "Maine Coon"],
    };

    animalTypeSelect.addEventListener("change", () => {
      const selectedType = animalTypeSelect.value;
      breedSelect.innerHTML = '<option value="">Select Breed</option>'; // Reset
      if (selectedType && breedsData[selectedType]) {
        breedSelect.disabled = false;
        breedsData[selectedType].forEach((breed) => {
          const option = document.createElement("option");
          option.value = breed.toLowerCase().replace(" ", "-");
          option.textContent = breed;
          breedSelect.appendChild(option);
        });
      } else {
        breedSelect.disabled = true;
        breedSelect.innerHTML =
          '<option value="">Select Animal Type First</option>';
      }
    });
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
});

// Dummy functions for onclick attributes in the HTML
function markAllAsRead() {
  console.log("Marking all as read...");
  // Add logic here to handle notifications
}

function logout() {
  console.log("Logging out...");
  // Add logic here to handle user logout
}