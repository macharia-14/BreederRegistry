// Frontend/assets/js/pages/breeders__breeding_events.1.js: controls frontend behavior for the Animal Breed Registry System.
const modal = document.getElementById('eventModal');
        const outcomeModal = document.getElementById('outcomeModal');
        // Handles close outcome modal behavior for this page.
        function closeOutcomeModal() { outcomeModal.classList.remove('active'); document.body.style.overflow = 'auto'; }

        // Handles open modal behavior for this page.
        function openModal() {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Handles close modal behavior for this page.
        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        outcomeModal.addEventListener('click', function(e) {
            if (e.target === outcomeModal) {
                closeOutcomeModal();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });

        // Handles toggle menu behavior for this page.
        function toggleMenu() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('active');
        }

        // Handles switch to admin behavior for this page.
        function switchToAdmin() {
            window.location.href = 'overview.html';
        }

        document.addEventListener('click', function(event) {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.querySelector('.menu-toggle');
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
