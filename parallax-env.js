(function () {
  'use strict';

  const root = document.getElementById('parallax-env');
  if (!root) return;

  const layers = root.querySelectorAll('.parallax-layer__inner');
  if (!layers.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const maxShift = [28, 52]; // back, main — pixels at full deflection
  const lerp = 0.08;
  const orientScale = 0.85; // slightly gentler than pointer for gyro

  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;
  let rafId = null;

  let baseGamma = null;
  let baseBeta = null;
  let useOrient = false;
  let motionSetup = false;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function setTargets(nx, ny) {
    targetX = clamp(nx, -1, 1);
    targetY = clamp(ny, -1, 1);
    startRaf();
  }

  function onPointerMove(e) {
    if (useOrient) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    const nx = ((e.clientX ?? w / 2) / w - 0.5) * 2;
    const ny = ((e.clientY ?? h / 2) / h - 0.5) * 2;
    setTargets(nx, ny);
  }

  function onOrientation(e) {
    if (e.gamma == null || e.beta == null) return;
    useOrient = true;
    root.setAttribute('data-motion', 'gyro');
    if (baseGamma == null) {
      baseGamma = e.gamma;
      baseBeta = e.beta;
    }
    const dg = 35;
    const nx = clamp(((e.gamma - baseGamma) / dg) * orientScale, -1, 1);
    const ny = clamp(((e.beta - baseBeta) / dg) * orientScale, -1, 1);
    setTargets(nx, ny);
  }

  function applyTransforms() {
    layers.forEach((el, i) => {
      const m = maxShift[i] ?? maxShift[maxShift.length - 1];
      el.style.transform =
        'translate3d(' + (curX * m).toFixed(2) + 'px,' + (curY * m).toFixed(2) + 'px,0)';
    });
  }

  function tick() {
    curX += (targetX - curX) * lerp;
    curY += (targetY - curY) * lerp;
    applyTransforms();
    if (
      Math.abs(targetX - curX) > 0.002 ||
      Math.abs(targetY - curY) > 0.002
    ) {
      rafId = requestAnimationFrame(tick);
    } else {
      curX = targetX;
      curY = targetY;
      applyTransforms();
      rafId = null;
    }
  }

  function startRaf() {
    if (reduceMotion) {
      curX = targetX;
      curY = targetY;
      applyTransforms();
      return;
    }
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function tryEnableOrientation() {
    const DO = window.DeviceOrientationEvent;
    if (!DO || motionSetup) return;
    motionSetup = true;

    const finish = function () {
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
    };

    if (typeof DO.requestPermission === 'function') {
      DO.requestPermission()
        .then(function (state) {
          if (state === 'granted') finish();
        })
        .catch(function () {});
    } else {
      finish();
    }
  }

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  if (!reduceMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    if (coarsePointer && window.DeviceOrientationEvent) {
      document.body.addEventListener('click', tryEnableOrientation, {
        once: true,
        passive: true,
      });
      document.body.addEventListener(
        'touchend',
        function onceTouch() {
          tryEnableOrientation();
          document.body.removeEventListener('touchend', onceTouch);
        },
        { once: true, passive: true }
      );
      if (!window.DeviceOrientationEvent.requestPermission) {
        tryEnableOrientation();
      }
    }
  } else {
    applyTransforms();
  }
})();
