// Navigation highlighting
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", function (e) {
          // Remove active class from all items
          document.querySelectorAll(".nav-item").forEach((nav) => {
            nav.classList.remove("active");
          });
          // Add active class to clicked item
          this.classList.add("active");
        });
      });

      // Role switching
      document.querySelectorAll(".role-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          document.querySelectorAll(".role-btn").forEach((b) => {
            b.classList.remove("active");
          });
          this.classList.add("active");

          // Here you would redirect to breeder dashboard if needed
          if (this.textContent === "Breeder") {
            // window.location.href = 'breeder-dashboard.html';
            alert("Breeder dashboard coming soon!");
          }
        });
      });

      // Filter functionality
        const filterAll = document.getElementById('filterAll');
        const filterSpecies = document.getElementById('filterSpecies');
        const filterBreed = document.getElementById('filterBreed');
        const filterGender = document.getElementById('filterGender');
        const filterBreeder = document.getElementById('filterBreeder');

        function filterTable() {
            const allValue = filterAll.value;
            const speciesValue = filterSpecies.value;
            const breedValue = filterBreed.value;
            const genderValue = filterGender.value;
            const breederValue = filterBreeder.value;
            
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

        // Add event listeners to all filters
        filterAll.addEventListener('change', filterTable);
        filterSpecies.addEventListener('change', filterTable);
        filterBreed.addEventListener('change', filterTable);
        filterGender.addEventListener('change', filterTable);
        filterBreeder.addEventListener('change', filterTable);

        // Click row to view details
        document.querySelectorAll('#animalTableBody tr').forEach(row => {
            row.addEventListener('click', function() {
                const animalId = this.cells[0].textContent;
                alert(`Viewing details for ${animalId}\n(Animal detail view coming soon)`);
            });
        });

        // Filter functionality
        const statusFilter = document.getElementById('filterStatus');
        const speciesFilter = document.getElementById('filterSpecies');

        function filterTable() {
            const statusValue = statusFilter.value;
            const speciesValue = speciesFilter.value;
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

        statusFilter.addEventListener('change', filterTable);
        speciesFilter.addEventListener('change', filterTable);

        // Approve breeder
        function approveBreeder(button) {
            const row = button.closest('tr');
            const breederName = row.cells[0].textContent;
            
            if (confirm(`Approve breeder: ${breederName}?`)) {
                // Update status
                const statusCell = row.querySelector('.status-badge');
                statusCell.textContent = 'approved';
                statusCell.className = 'status-badge status-approved';
                
                // Update actions
                const actionsCell = row.cells[5];
                actionsCell.innerHTML = '<span class="action-approved">approved</span>';
                
                // Update data attribute
                row.setAttribute('data-status', 'approved');
                
                alert(`${breederName} has been approved!`);
            }
        }

        // Reject breeder
        function rejectBreeder(button) {
            const row = button.closest('tr');
            const breederName = row.cells[0].textContent;
            
            if (confirm(`Reject breeder: ${breederName}?`)) {
                alert(`${breederName} has been rejected!`);
                // In a real app, you might want to remove the row or update status
                row.style.display = 'none';
            }
        }

        // Export functions
        function exportCSV() {
            alert('Exporting breeder data as CSV...');
            // Here you would implement actual CSV export logic
        }

        function exportPDF() {
            alert('Exporting breeder data as PDF...');
            // Here you would implement actual PDF export logic
        }

        // Toggle mobile menu
        function toggleMenu() {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar) return;
            sidebar.classList.toggle('active');
        }

        // Close menu when clicking outside on mobile
        document.addEventListener('click', function(event) {
            const sidebar = document.querySelector('.sidebar');
            const menuToggle = document.querySelector('.menu-toggle');
            if (!sidebar) return;

            if (window.innerWidth <= 768) {
                const clickedInsideSidebar = sidebar.contains(event.target);
                const clickedToggle = menuToggle ? menuToggle.contains(event.target) : false;
                if (!clickedInsideSidebar && !clickedToggle) {
                    sidebar.classList.remove('active');
                }
            }
        });

       

        

        // Click row to view event details
        document.querySelectorAll('tbody tr').forEach(row => {
            row.addEventListener('click', function() {
                const eventId = this.cells[0].textContent;
                alert(`Viewing details for ${eventId}\n(Event detail view coming soon)`);
            });
        });

        // Export functions
        function exportBreedersCSV() {
            alert('Exporting Breeders CSV...\n\nThis will generate a CSV file containing:\n- Breeder information\n- Farm details\n- Species managed\n- Verification status');
            // Here you would implement actual CSV export logic
            // Example: window.location.href = '/api/export/breeders/csv';
        }

        function exportSystemPDF() {
            alert('Exporting System PDF Report...\n\nThis will generate a comprehensive PDF including:\n- System overview\n- Breeder statistics\n- Animal inventory\n- Breeding events\n- Success rates');
            // Here you would implement actual PDF export logic
            // Example: window.location.href = '/api/export/system/pdf';
        }

        // Toggle switch
        function toggleSwitch(element) {
            element.classList.toggle('active');
        }

        // Save settings
        function saveSettings() {
            // Collect all settings
            const emailNotifications = document.querySelectorAll('.toggle-switch')[0].classList.contains('active');
            const autoApproval = document.querySelectorAll('.toggle-switch')[1].classList.contains('active');
            const dataRetention = document.querySelectorAll('.setting-select')[0].value;
            const language = document.querySelectorAll('.setting-select')[1].value;
            const adminEmail = document.querySelector('.setting-input').value;
            const backupFrequency = document.querySelectorAll('.setting-select')[2].value;

            const settings = {
                emailNotifications,
                autoApproval,
                dataRetention,
                language,
                adminEmail,
                backupFrequency
            };

            console.log('Saving settings:', settings);
            alert('Settings saved successfully!\n\nEmail Notifications: ' + (emailNotifications ? 'Enabled' : 'Disabled') + 
                  '\nAuto-Approval: ' + (autoApproval ? 'Enabled' : 'Disabled') +
                  '\nData Retention: ' + dataRetention + ' year(s)' +
                  '\nLanguage: ' + language +
                  '\nAdmin Email: ' + adminEmail +
                  '\nBackup Frequency: ' + backupFrequency);

            // Here you would send settings to backend
            // Example: fetch('/api/settings', { method: 'POST', body: JSON.stringify(settings) });
        }