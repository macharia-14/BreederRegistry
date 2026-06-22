// Frontend/assets/js/pages/public-login.js: controls frontend behavior for the Animal Breed Registry System.
function switchTab(role, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.getElementById('breeder-form').style.display = role === 'breeder' ? 'block' : 'none';
        document.getElementById('admin-form').style.display = role === 'admin'   ? 'block' : 'none';

        hideAlert();
      }

      // Shows alert feedback to the user.
      function showAlert(msg, type = 'error') {
        const box = document.getElementById('alert-box');
        box.textContent = msg;
        box.className = `alert alert-${type} show`;
      }

      // Handles hide alert behavior for this page.
      function hideAlert() {
        document.getElementById('alert-box').className = 'alert';
      }

      // Handles login user actions and events.
      async function handleLogin(e, role) {
        e.preventDefault();
        hideAlert();
        const btn = document.getElementById(`${role}-submit`);
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        try {
          let body, url;
          if (role === 'breeder') {
            url = '/api/breeders/login';
            body = {
              identifier: document.getElementById('breeder-identifier').value.trim(),
              password:   document.getElementById('breeder-password').value,
            };
          } else {
            url = '/api/admins/login';
            const adminIdentifier = document.getElementById('admin-email').value.trim();
            body = {
              email: adminIdentifier,
              identifier: adminIdentifier,
              password: document.getElementById('admin-password').value,
            };
          }
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const raw = await res.json();
          const data = raw && raw.data ? raw.data : raw;
          if (!res.ok) {
            const detail = raw?.detail;
            const message = Array.isArray(detail)
              ? detail.map(item => item.msg || item.message || JSON.stringify(item)).join(', ')
              : detail || raw?.message || 'Login failed. Please check your credentials.';
            showAlert(message);
            return;
          }
          if (!data?.access_token) {
            showAlert('Login response did not include an access token. Please contact the system administrator.');
            return;
          }

          localStorage.setItem('token', data.access_token);
          localStorage.setItem('role', role);
          if (role === 'breeder') localStorage.setItem('breeder_id', data.breeder_id);

          showAlert('Login successful! Redirecting...', 'success');

          setTimeout(() => {
            window.location.href = role === 'admin' ? 'admin/overview.html' : 'breeders/overview.html';
          }, 800);
        } catch (err) {
          showAlert('Could not connect to the server. Please try again.');
        } finally {
          btn.disabled = false;
          btn.textContent = role === 'breeder' ? 'Sign In as Breeder' : 'Sign In as Admin';
        }
      }
