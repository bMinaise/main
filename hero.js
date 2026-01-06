// Lightweight parallax for hero background
(function () {
  const section = document.querySelector('.hero-section');
  if (!section) return;

  const img = section.querySelector('.hero-bg img');
  if (!img) return;

  const maxTranslate = 18; // pixels max vertical shift
  let targetX = 0;
  let targetY = 0;
  let currentX = 0; // will remain 0 to preserve full width
  let currentY = 0;

  let rafId = null;

  function onPointerMove(e) {
    const rect = section.getBoundingClientRect();
    // only compute vertical offset so full image width remains visible
    const py = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    targetX = 0;
    targetY = -py * maxTranslate;
    startRaf();
  }

  function onLeave() {
    targetX = 0;
    targetY = 0;
    startRaf();
  }

  function update() {
    // simple lerp
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;
    img.style.transform = `translate(-50%, -50%) translate(${currentX}px, ${currentY}px) scale(1)`;
    if (Math.abs(currentX - targetX) > 0.01 || Math.abs(currentY - targetY) > 0.01) {
      rafId = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRaf() {
    if (!rafId) rafId = requestAnimationFrame(update);
  }

  section.addEventListener('pointermove', onPointerMove, { passive: true });
  section.addEventListener('pointerleave', onLeave);
  section.addEventListener('pointerdown', onPointerMove);
})();
