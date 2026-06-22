// Frontend/assets/js/sidebar-standard.js: controls frontend behavior for the Animal Breed Registry System.
(function () {
  // Handles parts behavior for this page.
  function parts() {
    return {
      sidebar: document.getElementById('sidebar') || document.querySelector('.sidebar'),
      overlay: document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay'),
      toggle: document.getElementById('menu-toggle') || document.getElementById('menuToggle') || document.querySelector('.menu-toggle')
    };
  }

  // Handles set open behavior for this page.
  function setOpen(open) {
    const { sidebar, overlay, toggle } = parts();
    if (!sidebar) return;
    const isOpen = Boolean(open);

    // Toggle classes on existing DOM nodes
    sidebar.classList.toggle('active', isOpen);
    overlay?.classList.toggle('active', isOpen);
    toggle?.setAttribute('aria-expanded', String(isOpen));

    // If overlay exists but sidebar state didn't change, force reflow by setting explicit states
    // (helps when multiple CSS files set transform on .sidebar)
    if (overlay) overlay.style.pointerEvents = isOpen ? 'auto' : 'none';
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
    document.body.classList.toggle('sidebar-open', Boolean(open));
  }

  window.openSidebar = function () { setOpen(true); };
  window.closeSidebar = function () { setOpen(false); };
  window.toggleMenu = function () {
    const { sidebar } = parts();
    setOpen(!sidebar?.classList.contains('active'));
  };

  // Handles bind behavior for this page.
  function bind() {
    const { toggle, overlay } = parts();
    if (toggle && !toggle.dataset.standardSidebarBound) {
      toggle.dataset.standardSidebarBound = 'true';
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.toggleMenu();
      });
    }
    if (overlay && !overlay.dataset.standardSidebarBound) {
      overlay.dataset.standardSidebarBound = 'true';
      overlay.addEventListener('click', window.closeSidebar);
    }
    const fileName = window.location.pathname.split('/').pop() || 'overview.html';
    document.querySelectorAll('.sidebar .nav-item').forEach(function (item) {
      // Highlight active link
      const href = item.getAttribute('href');
      if (href === fileName || (fileName === 'animal_profile.html' && href === 'animal_management.html')) {
        item.classList.add('active');
      }
      if (item.dataset.standardSidebarBound) return;
      item.dataset.standardSidebarBound = 'true';
      item.addEventListener('click', function () {
        if (window.innerWidth <= 1100) window.closeSidebar();
      });
    });
    const logout = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
    if (logout && !logout.dataset.standardLogoutBound && typeof window.logout === 'function') {
      logout.dataset.standardLogoutBound = 'true';
      logout.addEventListener('click', function (event) {
        event.preventDefault();
        window.logout();
      });
    }
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') window.closeSidebar();
  });

  // Runs page setup after the HTML document is ready.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
