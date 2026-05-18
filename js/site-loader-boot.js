(function () {
  'use strict';
  if (sessionStorage.getItem('siteLoaderSeen')) return;
  document.documentElement.classList.add('site-loader-pending', 'site-loader-active');
})();
