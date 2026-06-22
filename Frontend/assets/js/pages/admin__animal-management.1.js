// Fetch and load all animals
      async function loadAnimals() {
        try {
          const animals = await apiFetch('/api/admins/animals');
          const tableBody = document.getElementById('animalTableBody');
          tableBody.innerHTML = ''; // Clear loading message
          if (animals.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No animals found</td></tr>';
            return;
          }

          // Populate filter dropdowns with unique values
          const breeds = new Set();
          const breeders = new Set();

          animals.forEach(animal => {
            if (animal.breed) breeds.add(animal.breed);
            if (animal.breeder_name) breeders.add(animal.breeder_name);
          });

          // Update breed filter
          const breedSelect = document.getElementById('filterBreed');
          breeds.forEach(breed => {
            const option = document.createElement('option');
            option.value = breed.toLowerCase();
            option.textContent = breed;
            breedSelect.appendChild(option);
          });

          // Update breeder filter
          const breederSelect = document.getElementById('filterBreeder');
          breeders.forEach(breeder => {
            const option = document.createElement('option');
            option.value = breeder.toLowerCase();
            option.textContent = breeder;
            breederSelect.appendChild(option);
          });

          // Populate table rows
          animals.forEach(animal => {
            const row = document.createElement('tr');
            row.setAttribute('data-species', (animal.animal_type || '').toLowerCase());
            row.setAttribute('data-breed', (animal.breed || '').toLowerCase());
            row.setAttribute('data-gender', (animal.gender || '').toLowerCase());
            row.setAttribute('data-breeder', (animal.breeder_name || '').toLowerCase());

            row.innerHTML = `
              <td>${animal.animal_id || 'N/A'}</td>
              <td>${animal.animal_type || 'N/A'}</td>
              <td>${animal.breed || 'N/A'}</td>
              <td>${animal.gender || 'N/A'}</td>
              <td>${animal.breeder_name || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
          });
        } catch (error) {
          console.error('Error loading animals:', error);
          const tableBody = document.getElementById('animalTableBody');
          tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading animals: ${error.message}</td></tr>`;
        }
      }

      // Filter table function
      function filterTable() {
        const allValue = document.getElementById('filterAll').value;
        const speciesValue = document.getElementById('filterSpecies').value;
        const breedValue = document.getElementById('filterBreed').value;
        const genderValue = document.getElementById('filterGender').value;
        const breederValue = document.getElementById('filterBreeder').value;
        const rows = document.querySelectorAll('#animalTableBody tr');

        rows.forEach(row => {
          const rowSpecies = row.getAttribute('data-species');
          const rowBreed = row.getAttribute('data-breed');
          const rowGender = row.getAttribute('data-gender');
          const rowBreeder = row.getAttribute('data-breeder');
          const allMatch = allValue === 'all' || rowSpecies === allValue;
          const speciesMatch = speciesValue === 'all' || rowSpecies === speciesValue;
          const breedMatch = breedValue === 'all' || rowBreed === breedValue;
          const genderMatch = genderValue === 'all' || rowGender === genderValue;
          const breederMatch = breederValue === 'all' || rowBreeder === breederValue;
          if (allMatch && speciesMatch && breedMatch && genderMatch && breederMatch) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      }

      // Add event listeners to filters
      document.addEventListener('DOMContentLoaded', () => {
        loadAnimals();
        const filterAll = document.getElementById('filterAll');
        const filterSpecies = document.getElementById('filterSpecies');
        const filterBreed = document.getElementById('filterBreed');
        const filterGender = document.getElementById('filterGender');
        const filterBreeder = document.getElementById('filterBreeder');

        filterAll.addEventListener('change', filterTable);
        filterSpecies.addEventListener('change', filterTable);
        filterBreed.addEventListener('change', filterTable);
        filterGender.addEventListener('change', filterTable);
        filterBreeder.addEventListener('change', filterTable);
      });
