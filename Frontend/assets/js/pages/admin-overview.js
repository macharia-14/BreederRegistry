// Frontend/assets/js/pages/admin-overview.js: controls frontend behavior for the Animal Breed Registry System.
async function loadDashboardData() {
        try {
          const stats = await apiFetch('/api/admins/stats');

          document.getElementById('totalBreeders').textContent = stats.total_breeders || 0;
          document.getElementById('pendingApprovals').textContent = stats.pending_applications || 0;
          document.getElementById('totalAnimals').textContent = stats.total_animals || 0;
          const approvedBreeders = await apiFetch('/api/admins/approved-breeders');
          document.getElementById('approvedBreeders').textContent = approvedBreeders.length || 0;
          const rejectedBreeders = await apiFetch('/api/admins/rejected-applications');
          document.getElementById('rejectedBreeders').textContent = rejectedBreeders.length || 0;
          const animals = await apiFetch('/api/public/animals');
          const maleCount = animals.filter(a => a.gender?.toLowerCase() === 'm' || a.gender?.toLowerCase() === 'male').length;
          const femaleCount = animals.filter(a => a.gender?.toLowerCase() === 'f' || a.gender?.toLowerCase() === 'female').length;
          document.getElementById('genderRatio').textContent = `${maleCount}/${femaleCount}`;
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          showToast?.(error.message || 'Failed to load admin dashboard data', 'error');
        }
      }

      // Runs page setup after the HTML document is ready.
      document.addEventListener('DOMContentLoaded', loadDashboardData);
