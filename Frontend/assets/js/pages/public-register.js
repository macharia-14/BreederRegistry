// Frontend/assets/js/pages/public-register.js: controls frontend behavior for the Animal Breed Registry System.
let currentStep = 1;
      const totalSteps = 4;

      // Handles update progress behavior for this page.
      function updateProgress(step) {
        for (let i = 1; i <= totalSteps; i++) {
          const dot = document.getElementById(`dot-${i}`);
          dot.classList.remove('active', 'done');
          if (i < step) dot.classList.add('done');
          else if (i === step) dot.classList.add('active');
        }
        const pct = ((step - 1) / (totalSteps - 1)) * 100;
        document.getElementById('progress-fill').style.width = pct + '%';
      }

      // Shows step feedback to the user.
      function showStep(step) {
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${step}`).classList.add('active');
        updateProgress(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Handles next step behavior for this page.
      function nextStep(from) {
        if (!validateStep(from)) return;
        currentStep = from + 1;
        showStep(currentStep);
      }

      // Handles prev step behavior for this page.
      function prevStep(from) {
        currentStep = from - 1;
        showStep(currentStep);
      }

      // Validates step before continuing.
      function validateStep(step) {
        const section = document.getElementById(`section-${step}`);
        const inputs = section.querySelectorAll('input[required], select[required]');
        let valid = true;
        inputs.forEach(input => {
          if (!input.value.trim()) {
            input.classList.add('input-error');
            valid = false;
          } else {
            input.classList.remove('input-error');
          }
        });
        if (!valid) showAlert('Please fill in all required fields.', 'error');
        else hideAlert();
        return valid;
      }

      // Handles check password strength behavior for this page.
      function checkPasswordStrength(val) {
        const wrap = document.getElementById('strength-bar-wrap');
        const fill = document.getElementById('strength-fill');
        const label = document.getElementById('strength-label');
        wrap.style.display = val.length ? 'block' : 'none';
        let score = 0;
        if (val.length >= 8)  score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        const levels = [
          { pct: '25%', color: '#E63946', text: 'Weak' },
          { pct: '50%', color: '#E9C46A', text: 'Fair' },
          { pct: '75%', color: '#74C69D', text: 'Good' },
          { pct: '100%',color: '#40916C', text: 'Strong' },
        ];
        const lvl = levels[score - 1] || levels[0];
        fill.style.width = lvl.pct;
        fill.style.background = lvl.color;
        label.textContent = lvl.text;
        label.style.color = lvl.color;
      }

      // Handles check password match behavior for this page.
      function checkPasswordMatch() {
        const pw = document.getElementById('password').value;
        const cpw = document.getElementById('confirmPassword').value;
        const hint = document.getElementById('match-hint');
        if (!cpw) { hint.textContent = ''; return; }
        if (pw === cpw) {
          hint.textContent = 'Passwords match';
          hint.className = 'field-hint success';
        } else {
          hint.textContent = 'Passwords do not match';
          hint.className = 'field-hint error';
        }
      }

      // Handles files user actions and events.
      function handleFiles(input) {
        const area = document.getElementById('file-upload-area');
        const list = document.getElementById('file-list');
        const files = Array.from(input.files);
        area.classList.toggle('has-files', files.length > 0);
        list.innerHTML = files.map(f =>
          `<span class="file-chip"><svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ${f.name}</span>`
        ).join('');
      }

      // Shows alert feedback to the user.
      function showAlert(msg, type = 'error') {
        const box = document.getElementById('alert-box');
        box.textContent = msg;
        box.className = `alert alert-${type} show`;
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      // Handles hide alert behavior for this page.
      function hideAlert() {
        document.getElementById('alert-box').className = 'alert';
      }

      document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const pw = document.getElementById('password').value;
        const cpw = document.getElementById('confirmPassword').value;
        if (pw !== cpw) { showAlert('Passwords do not match.'); return; }
        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        try {
          const fields = ['full_name','national_id','animal_type','farm_name','farm_location','county','phone','email','password'];
          const payload = {};
          fields.forEach(f => {
            const el = document.querySelector(`[name="${f}"]`);
            if (el) payload[f] = el.value;
          });
          const docs = document.getElementById('documents').files;
          if (docs.length) payload.documents = Array.from(docs).map(f => f.name).join(',');
          const res = await fetch('/api/breeders/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) {
            showAlert(data.detail || 'Registration failed. Please check your details.');
            return;
          }

          document.getElementById('register-form').style.display = 'none';
          document.querySelector('.progress-bar').style.display = 'none';
          document.getElementById('success-state').classList.add('show');

          setTimeout(() => { window.location.href = '/login.html'; }, 3500);
        } catch (err) {
          showAlert('Could not connect to the server. Please try again.');
        } finally {
          btn.disabled = false;
          btn.textContent = '🌿 Submit Application';
        }
      });
