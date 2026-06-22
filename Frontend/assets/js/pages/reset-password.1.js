// Frontend/assets/js/pages/reset-password.1.js: controls frontend behavior for the Animal Breed Registry System.
const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const msg = document.getElementById('msg');
    // Shows show feedback to the user.
    function show(message, type='ok'){ msg.textContent=message; msg.className='msg '+(type==='ok'?'ok':'err'); msg.style.display='block'; }
    if(token){ document.getElementById('requestPanel').style.display='none'; document.getElementById('resetPanel').style.display='block'; }
    document.getElementById('forgotForm').addEventListener('submit', async e => {
      e.preventDefault();
      const identifier = document.getElementById('identifier').value.trim();
      const res = await fetch('/api/breeders/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier})});
      const data = await res.json().catch(()=>({}));
      show(data.message || 'If the account exists, a reset link has been sent.', res.ok?'ok':'err');
    });
    document.getElementById('resetForm').addEventListener('submit', async e => {
      e.preventDefault();
      const password = document.getElementById('newPassword').value;
      const res = await fetch('/api/breeders/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});
      const data = await res.json().catch(()=>({}));
      if(res.ok){ show('Password updated. Redirecting to login...', 'ok'); setTimeout(()=>location.href='/login.html',1500); }
      else show(data.detail || 'Password reset failed.', 'err');
    });
