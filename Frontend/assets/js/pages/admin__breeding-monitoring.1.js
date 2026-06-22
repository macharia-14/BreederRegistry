// Fetch and load all breeding events
      async function loadBreedingEvents() {
        try {
          // Get all breeders first to fetch their breeding events
          const approvedBreeders = await apiFetch('/api/admins/approved-breeders');
          let allEvents = [];

          // Fetch breeding events for each breeder
          for (const breeder of approvedBreeders) {
            try {
              const events = await apiFetch(`/api/breeders/${breeder.id}/breeding-events`);
              allEvents = allEvents.concat(events.map(e => ({...e, breeder_id: breeder.id})));
            } catch (err) {
              console.warn(`Failed to fetch events for breeder ${breeder.id}:`, err);
            }
          }
          const tableBody = document.getElementById('eventsTableBody');
          tableBody.innerHTML = ''; // Clear loading message
          if (allEvents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No breeding events found</td></tr>';
            updateHighlights([]);
            return;
          }

          // Populate table rows
          allEvents.forEach((event, index) => {
            const row = document.createElement('tr');
            const dueDate = event.expected_due_date ? new Date(event.expected_due_date).toLocaleDateString() : '-';

            row.innerHTML = `
              <td>E-${String(index + 1).padStart(3, '0')}</td>
              <td>${event.breeding_method || 'N/A'}</td>
              <td>${event.dam_id || 'N/A'}</td>
              <td>${event.sire_id || 'N/A'}</td>
              <td>${dueDate}</td>
              <td>${event.offspring_id || '-'}</td>
            `;
            tableBody.appendChild(row);
          });

          updateHighlights(allEvents);
        } catch (error) {
          console.error('Error loading breeding events:', error);
          const tableBody = document.getElementById('eventsTableBody');
          tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error loading events: ${error.message}</td></tr>`;
        }
      }

      // Update highlights based on events
      function updateHighlights(events) {
        // Calculate upcoming due (events with expected_due_date in the future)
        const now = new Date();
        const upcomingDue = events.filter(e => {
          if (!e.expected_due_date) return false;
          const dueDate = new Date(e.expected_due_date);
          return dueDate > now;
        }).length;

        document.getElementById('upcomingDueCount').textContent = upcomingDue;

        // Calculate top performers (sires/dams with most breeding events)
        const performerCounts = {};
        events.forEach(e => {
          if (e.sire_id) performerCounts[e.sire_id] = (performerCounts[e.sire_id] || 0) + 1;
          if (e.dam_id) performerCounts[e.dam_id] = (performerCounts[e.dam_id] || 0) + 1;
        });
        const topPerformers = Object.entries(performerCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([id, count]) => `${id}(${count})`)
          .join(', ');

        document.getElementById('topPerformers').textContent = topPerformers || 'None';

        // Calculate success rate (events with offspring divided by total events)
        const successfulEvents = events.filter(e => e.offspring_id).length;
        const successRate = events.length > 0
          ? Math.round((successfulEvents / events.length) * 100) + '%'
          : '-';

        document.getElementById('successRate').textContent = successRate;
      }

      // Load data when page loads
      document.addEventListener('DOMContentLoaded', loadBreedingEvents);
