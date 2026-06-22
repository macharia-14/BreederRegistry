// Frontend/assets/js/pages/admin-reports-analytics.js: controls frontend behavior for the Animal Breed Registry System.
(function(){
        const btn = document.getElementById('logoutBtn');
        if (btn) {
          btn.addEventListener('click', function(e){
            localStorage.removeItem('admin');
            localStorage.removeItem('breeder');
            localStorage.removeItem('token');
            localStorage.removeItem('admin_id');
            localStorage.removeItem('breeder_id');
            window.location.href = '/index.html';
          });
        }
      })();
