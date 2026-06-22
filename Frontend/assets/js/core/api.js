// Frontend/assets/js/core/api.js: controls frontend behavior for the Animal Breed Registry System.
window.LineageXApi = window.LineageXApi || {
  async request(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '');
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && payload.detail ? payload.detail : `Request failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  },
};
