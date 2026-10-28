// Stop the browser zooming the game: double-tap zoom, pinch zoom and iOS Safari gesture zoom.
// Typing in the name field still works.
(() => {
  const typing = e => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  let lastEnd = 0;
  document.addEventListener('touchend', e => {
    const now = e.timeStamp;
    if (now - lastEnd < 350 && !typing(e)) e.preventDefault();   // second tap of a double tap
    lastEnd = now;
  }, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', e => { if (!typing(e)) e.preventDefault(); }, { passive: false });
})();
