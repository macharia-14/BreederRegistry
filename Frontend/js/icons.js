// Frontend/js/icons.js: controls frontend behavior for the Animal Breed Registry System.
/**
 * icons.js — Central SVG Icon Library for BreedRegistry
 * 
 *
 * All icons return inline SVG strings. Colors default to currentColor
 * so they inherit from parent CSS.
 */
(function (global) {
  'use strict';
  const DEFAULT_SIZE = 24;
  const DEFAULT_COLOR = 'currentColor';

  // Handles svg behavior for this page.
  function svg(path, opts) {
    opts = opts || {};
    var size = opts.size || DEFAULT_SIZE;
    var color = opts.color || DEFAULT_COLOR;
    var cls = opts.className || 'icon-svg';
    var attrs = opts.attrs || '';
    return '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' + attrs + '>' + path + '</svg>';
  }

  global.Icons = {
    // ── Animals ──
    cow: function(o){o=o||{};return svg('<path d="M4 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><path d="M6 10v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6"/><path d="M4 14h16"/><path d="M10 6V4a2 2 0 0 1 4 0v2"/><path d="M2 10h2"/><path d="M20 10h2"/>',o);},
    bull: function(o){o=o||{};return svg('<path d="M4 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><path d="M6 10v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6"/><path d="M4 14h16"/><path d="M10 6V4a2 2 0 0 1 4 0v2"/><path d="M2 10h2"/><path d="M20 10h2"/><path d="M8 18l-2 3"/><path d="M16 18l2 3"/>',o);},
    sheep: function(o){o=o||{};return svg('<circle cx="12" cy="14" r="6"/><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="16" r="2"/><path d="M12 8V6"/>',o);},
    goat: function(o){o=o||{};return svg('<path d="M6 14a4 4 0 0 0 4 4h2"/><path d="M14 14a4 4 0 0 1 4 4"/><path d="M10 18v-4l-2-2 2-2"/><path d="M12 14V8l2-2-2-2"/><circle cx="10" cy="6" r="1"/>',o);},
    dog: function(o){o=o||{};return svg('<path d="M10 12a2 2 0 0 0-2 2v4"/><path d="M14 12a2 2 0 0 1 2 2v4"/><path d="M6 16v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/><path d="M9 6h6v4H9z"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M12 6V4"/>',o);},
    pig: function(o){o=o||{};return svg('<rect x="6" y="8" width="12" height="10" rx="4"/><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M12 18v2"/>',o);},
    chicken: function(o){o=o||{};return svg('<circle cx="12" cy="11" r="5"/><path d="M12 6V4"/><path d="M8 8L6 6"/><path d="M16 8l2-2"/><path d="M12 16v3"/><path d="M10 19h4"/>',o);},

    // ── UI / Actions ──
    check: function(o){o=o||{};return svg('<path d="M20 6L9 17l-5-5"/>',o);},
    x: function(o){o=o||{};return svg('<path d="M18 6L6 18M6 6l12 12"/>',o);},
    xCircle: function(o){o=o||{};return svg('<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',o);},
    lock: function(o){o=o||{};return svg('<rect x="5" y="11" width="14" height="10" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',o);},
    eye: function(o){o=o||{};return svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',o);},
    eyeOff: function(o){o=o||{};return svg('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',o);},
    trash: function(o){o=o||{};return svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',o);},
    search: function(o){o=o||{};return svg('<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',o);},
    download: function(o){o=o||{};return svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',o);},
    arrowRight: function(o){o=o||{};return svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',o);},
    arrowLeft: function(o){o=o||{};return svg('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',o);},
    menu: function(o){o=o||{};return svg('<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',o);},
    star: function(o){o=o||{};return svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',o);},

    // ── Communication ──
    mail: function(o){o=o||{};return svg('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',o);},
    phone: function(o){o=o||{};return svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',o);},
    mapPin: function(o){o=o||{};return svg('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',o);},

    // ── Farm / Agriculture ──
    wheat: function(o){o=o||{};return svg('<path d="M12 2v20"/><path d="M8 6l4-2 4 2"/><path d="M8 10l4-2 4 2"/><path d="M8 14l4-2 4 2"/>',o);},
    leaf: function(o){o=o||{};return svg('<path d="M11 20A7 7 0 0 1 9.8 6.6C13.5 5.7 17 8 17 12a7 7 0 0 1-6 8z"/><path d="M11 20v-8"/><path d="M11 12c-1.5-1-3-1-4.5-.5"/>',o);},
    home: function(o){o=o||{};return svg('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',o);},

    // ── Science / Medical ──
    dna: function(o){o=o||{};return svg('<path d="M2 15c3.3-3.3 5-7 5-10"/><path d="M22 15c-3.3-3.3-5-7-5-10"/><path d="M2 9c3.3 3.3 5 7 5 10"/><path d="M22 9c-3.3 3.3-5 7-5 10"/><ellipse cx="12" cy="12" rx="3" ry="1.5"/>',o);},
    shield: function(o){o=o||{};return svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',o);},
    shieldCheck: function(o){o=o||{};return svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 16 10"/>',o);},
    calendar: function(o){o=o||{};return svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',o);},
    target: function(o){o=o||{};return svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',o);},
    timer: function(o){o=o||{};return svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',o);},

    // ── Gender ──
    male: function(o){o=o||{};return svg('<circle cx="12" cy="8" r="5"/><path d="M12 13v8"/><path d="M9 18h6"/>',o);},
    female: function(o){o=o||{};return svg('<circle cx="12" cy="9" r="5"/><path d="M12 14v7"/><path d="M9 21h6"/>',o);},

    // ── Status ──
    alertTriangle: function(o){o=o||{};return svg('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',o);},
    helpCircle: function(o){o=o||{};return svg('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',o);},
    info: function(o){o=o||{};return svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',o);},
    party: function(o){o=o||{};return svg('<path d="M12 2v20"/><path d="M2 12h20"/><path d="M4.93 4.93l14.14 14.14"/><path d="M19.07 4.93L4.93 19.07"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',o);},

    // ── Files ──
    fileText: function(o){o=o||{};return svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',o);},
    paperclip: function(o){o=o||{};return svg('<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',o);},

    // ── Device ──
    smartphone: function(o){o=o||{};return svg('<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',o);},
    qrCode: function(o){o=o||{};return svg('<rect x="2" y="2" width="8" height="8"/><rect x="14" y="2" width="8" height="8"/><rect x="2" y="14" width="8" height="8"/><rect x="14" y="14" width="8" height="8"/>',o);},

    // ── Person ──
    user: function(o){o=o||{};return svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',o);},

    // ── Kenya Badge ──
    kenyaBadge: function(o){o=o||{};return svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M8 12h8"/><path d="M12 8v8"/>',o);},
  };
})(typeof window !== 'undefined' ? window : this);
