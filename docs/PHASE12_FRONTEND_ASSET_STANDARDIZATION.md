# Phase 12: Frontend CSS/JS Standardization

## Goal
Make the frontend easy to maintain by moving scattered CSS and JavaScript into a uniform asset structure.

## New Standard Structure

```text
Frontend/assets/
  css/
    app.css
    public.css
    breeders.css
    admin.css
    pages/
  js/
    core/
      config.js
      api.js
      ui.js
      common.js
    public.js
    breeders.js
    admin.js
    pages/
```

## What Changed
- Introduced global design tokens and utility classes in `assets/css/app.css`.
- Consolidated role-level styles into `assets/css/public.css`, `assets/css/breeders.css`, and `assets/css/admin.css`.
- Consolidated role-level JavaScript into `assets/js/public.js`, `assets/js/breeders.js`, and `assets/js/admin.js`.
- Extracted inline `<style>` blocks from HTML pages into `assets/css/pages/`.
- Extracted inline `<script>` blocks from HTML pages into `assets/js/pages/` while preserving load order.
- Updated HTML references to use `/assets/...` paths.
- Added shared frontend helpers under `assets/js/core/`.

## Development Rules
1. Do not add large inline CSS or JavaScript in HTML pages.
2. Put reusable UI rules in the role-level CSS file or `app.css`.
3. Put page-specific styling in `assets/css/pages/`.
4. Put page-specific behavior in `assets/js/pages/`.
5. Keep backend API calls through shared helper patterns where practical.
6. Keep static asset paths absolute from the frontend root, for example `/assets/css/app.css`.

## Compatibility
The old folders are not deleted yet:

```text
Frontend/css
Frontend/js
Frontend/breeders/css
Frontend/breeders/js
Frontend/admin/css
Frontend/admin/js
```

They are retained temporarily to avoid breaking any untracked references. Future development should use `Frontend/assets`.
