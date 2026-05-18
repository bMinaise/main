(function () {
  'use strict';
  var STORAGE_KEY = 'theme';
  var v = localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark') {
    document.documentElement.setAttribute('data-theme', v);
  }
})();
