// Fetch admin statistics on page load
      async function loadDashboardData() {
        try {
          const stats = await apiFetch('/api/admins/stats');

          // Update stats cards
          document.getElementById('totalBreeders').textContent = stats.total_breeders || 0;
          document.getElementById('pendingApprovals').textContent = stats.pending_applications || 0;
          document.getElementById('totalAnimals').textContent = stats.total_animals || 0;

          // Fetch additional data for approved/rejected counts
          const approvedBreeders = await apiFetch('/api/admins/approved-breeders');
          document.getElementById('approvedBreeders').textContent = approvedBreeders.length || 0;
          const rejectedBreeders = await apiFetch('/api/admins/rejected-applications');
          document.getElementById('rejectedBreeders').textContent = rejectedBreeders.length || 0;

          // Fetch animals for gender ratio. This public endpoint does not require auth,
          // but apiFetch also works because it safely includes the admin token when present.
          const response = await apiFetch('/api/public/animals');
          // Unwrap data from success envelope
          const animals = response.data || response || [];
          const maleCount = animals.filter(a => a.gender?.toLowerCase() === 'm' || a.gender?.toLowerCase() === 'male').length;
          const femaleCount = animals.filter(a => a.gender?.toLowerCase() === 'f' || a.gender?.toLowerCase() === 'female').length;
          document.getElementById('genderRatio').textContent = `${maleCount}/${femaleCount}`;
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          showToast?.(error.message || 'Failed to load admin dashboard data', 'error');
        }
      }

      // Load data when page loads
      document.addEventListener('DOMContentLoaded', loadDashboardData);
