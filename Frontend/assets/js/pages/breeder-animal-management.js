// Frontend/assets/js/pages/breeder-animal-management.js: controls frontend behavior for the Animal Breed Registry System.
const modal = document.getElementById('animalModal');

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
        const pedigreeModal = document.getElementById('pedigreeModal');

        // Handles open pedigree modal behavior for this page.
        function openPedigreeModal() {
            pedigreeModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Handles close pedigree modal behavior for this page.
        function closePedigreeModal() {
            pedigreeModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            const resultContainer = document.getElementById('pedigreeResult');
            if(resultContainer) resultContainer.innerHTML = '';
        }

        pedigreeModal.addEventListener('click', function(e) {
            if (e.target === pedigreeModal) {
                closePedigreeModal();
            }
        });

        document.getElementById('qrModal').addEventListener('click', function(e) {
            if (e.target === this) closeQrModal();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (modal.classList.contains('active')) closeModal();
                if (pedigreeModal.classList.contains('active')) closePedigreeModal();
                closeQrModal();
                closeAnimalPopup();
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
