(function () {
  'use strict';

  var SESSION_KEY = 'siteLoaderSeen';
  var DURATION_MS = 2000;
  var FADE_MS = 500;
  var STAR_COUNT = 600;
  var SPEED = 0.003;
  var REDUCED_MOTION_MS = 300;

  function clearPending() {
    document.documentElement.classList.remove(
      'site-loader-pending',
      'site-loader-active'
    );
  }

  if (sessionStorage.getItem(SESSION_KEY)) {
    clearPending();
    return;
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--loader-bg').trim() || s.getPropertyValue('--color-bg').trim(),
      dim: s.getPropertyValue('--loader-star-dim').trim() || '#777',
      bright: s.getPropertyValue('--loader-star-bright').trim() || '#222',
      accent: s.getPropertyValue('--loader-star-accent').trim() || '#1eaedb',
    };
  }

  function parseRgb(color) {
    var m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    if (color.charAt(0) === '#') {
      var hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return { r: 128, g: 128, b: 128 };
  }

  function mixRgb(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  function rgba(c, alpha) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  var overlay = document.getElementById('site-loader');
  var canvas = document.getElementById('site-loader-canvas');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'site-loader';
    overlay.setAttribute('role', 'presentation');
    overlay.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    canvas.id = 'site-loader-canvas';
    overlay.appendChild(canvas);
    document.documentElement.classList.add('site-loader-pending', 'site-loader-active');
    if (document.body) document.body.insertBefore(overlay, document.body.firstChild);
  }

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'site-loader-canvas';
    overlay.appendChild(canvas);
  }

  overlay.setAttribute('role', 'presentation');
  overlay.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.add('site-loader-active');

  var colors = readColors();
  var dimRgb = parseRgb(colors.dim);
  var brightRgb = parseRgb(colors.bright);
  var accentRgb = parseRgb(colors.accent);

  var ctx;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var stars = [];
  var rafId = null;
  var startTime = null;
  var finished = false;

  function resetStar(star) {
    star.x = Math.random() * 2 - 1;
    star.y = Math.random() * 2 - 1;
    star.z = Math.random() * 0.7 + 0.3;
    star.phase = Math.random() * Math.PI * 2;
    star.accent = Math.random() < 0.06;
  }

  function initStars() {
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      var s = {};
      resetStar(s);
      stars.push(s);
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(now) {
    if (!ctx || finished) return;

    if (!startTime) startTime = now;
    var t = (now - startTime) / 1000;

    colors = readColors();
    dimRgb = parseRgb(colors.dim);
    brightRgb = parseRgb(colors.bright);
    accentRgb = parseRgb(colors.accent);

    ctx.fillStyle = colors.bg || '#f2f0ef';
    ctx.fillRect(0, 0, width, height);

    var cx = width * 0.5;
    var cy = height * 0.5;
    var maxDim = Math.max(width, height);

    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      star.z -= SPEED;

      if (star.z <= 0.02) {
        resetStar(star);
        continue;
      }

      var invZ = 1 / star.z;
      var sx = cx + star.x * maxDim * 0.5 * invZ;
      var sy = cy + star.y * maxDim * 0.5 * invZ;

      if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) {
        resetStar(star);
        continue;
      }

      var depth = 1 - star.z;
      var size = Math.max(0.3, depth * 1.6);
      var twinkle = 0.82 + 0.18 * Math.sin(t * 0.65 + star.phase);
      var alpha = Math.min(1, depth * 1.15 * twinkle);

      var base = star.accent ? accentRgb : mixRgb(dimRgb, brightRgb, depth);
      ctx.fillStyle = rgba(base, alpha * (star.accent ? 1 : 0.95));
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();

      if (depth > 0.5 && star.z < 0.4) {
        var streak = depth * 8 * invZ * 0.03;
        ctx.strokeStyle = rgba(base, alpha * 0.28);
        ctx.lineWidth = Math.max(0.4, size * 0.45);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - star.x * streak, sy - star.y * streak);
        ctx.stroke();
      }
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  function teardown() {
    finished = true;
    if (rafId) cancelAnimationFrame(rafId);
    overlay.classList.add('site-loader--exiting');
    clearPending();
    sessionStorage.setItem(SESSION_KEY, '1');
    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, FADE_MS);
  }

  function finishAfter(ms) {
    window.setTimeout(teardown, ms);
  }

  if (reducedMotion) {
    finishAfter(REDUCED_MOTION_MS);
    return;
  }

  initStars();
  resize();
  window.addEventListener('resize', resize);
  rafId = requestAnimationFrame(drawFrame);
  finishAfter(DURATION_MS);
})();
