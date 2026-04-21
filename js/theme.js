(function () {
  'use strict';

  // Sun + Moon paths from Griddy Icons (MIT) — icons-src/regular/sun.svg & moon.svg
  // https://github.com/griddy-icons/griddy-icons
  var STORAGE_KEY = 'theme';
  var docEl = document.documentElement;

  var SVG_WRAP =
    '<svg class="navbar-theme-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  var SUN =
    SVG_WRAP +
    '<path fill="currentColor" d="M12.75 1h-1.5v3h1.5V1ZM23 11.25h-3v1.5h3v-1.5Zm-19 0H1v1.5h3v-1.5Zm15.246-7.557-2.121 2.12 1.06 1.062 2.122-2.122-1.061-1.06ZM4.75 3.685 3.69 4.746l2.12 2.121 1.062-1.06L4.75 3.685Zm1.06 13.448-2.12 2.12 1.06 1.061 2.122-2.12-1.061-1.061ZM12 18.5A6.506 6.506 0 0 1 5.5 12c0-3.585 2.915-6.5 6.5-6.5s6.5 2.915 6.5 6.5-2.915 6.5-6.5 6.5ZM12 7c-2.755 0-5 2.245-5 5s2.245 5 5 5 5-2.245 5-5-2.245-5-5-5Zm.75 13h-1.5v3h1.5v-3Zm5.435-2.875-1.06 1.061 2.12 2.122 1.061-1.061-2.12-2.122Z"/>' +
    '</svg>';
  var MOON =
    SVG_WRAP +
    '<path fill="currentColor" d="M12 22C6.485 22 2 17.515 2 12c0-5.02 3.755-9.28 8.735-9.91l1.11-.14-.29 1.08c-.2.75-.305 1.495-.305 2.225 0 4.685 3.815 8.5 8.5 8.5a8.78 8.78 0 0 0 1.075-.075l1.11-.14-.29 1.08A10.01 10.01 0 0 1 12 22.005V22ZM9.865 3.78C6.17 4.735 3.5 8.1 3.5 12c0 4.685 3.815 8.5 8.5 8.5 3.46 0 6.55-2.11 7.845-5.25h-.095c-5.515 0-10-4.485-10-10 0-.485.04-.975.115-1.47Z"/>' +
    '</svg>';

  function getStored() {
    var v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
    return null;
  }

  function effectiveTheme() {
    var t = docEl.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyStored() {
    var s = getStored();
    if (s) docEl.setAttribute('data-theme', s);
    else docEl.removeAttribute('data-theme');
  }

  function updateButtons() {
    var eff = effectiveTheme();
    var aria =
      eff === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    var icon = eff === 'dark' ? SUN : MOON;
    document.querySelectorAll('.navbar-theme').forEach(function (btn) {
      btn.innerHTML = icon;
      btn.setAttribute('aria-label', aria);
    });
  }

  function toggle() {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    docEl.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    updateButtons();
  }

  applyStored();
  updateButtons();

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.navbar-theme')) {
      e.preventDefault();
      toggle();
    }
  });
})();
