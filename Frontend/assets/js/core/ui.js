// Frontend/assets/js/core/ui.js: controls frontend behavior for the Animal Breed Registry System.
window.LineageXUI = window.LineageXUI || {
  formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  },
  safeText(value, fallback = '—') {
    return value === null || value === undefined || value === '' ? fallback : String(value);
  },
};

window.toggleSwitch = function toggleSwitch(element) {
  element?.classList.toggle('active');
};
