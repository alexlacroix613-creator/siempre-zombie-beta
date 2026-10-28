// Play starts the film and captures controls in the same gesture. Simulation waits.
(() => {
  const init = () => {
    const form = document.querySelector('#start-form'), app = document.querySelector('#app');
    if (!form || !app) return;
    const key = 'siempre-zombie-intro:20261028-v2';
    let seen = false, active = null;
    try { seen = sessionStorage.getItem(key) === 'seen'; } catch {}
    form.addEventListener('submit', () => {
      if (seen || active || app.dataset.screen !== 'title') return;
      const normalized = form.querySelector('#name')?.value.trim().replace(/^@/, '') || '';
      if (!form.checkValidity() || !/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/i.test(normalized) || normalized.length > 30) return;
      const overlay = document.createElement('section');
      overlay.className = 'zombie-intro';
      overlay.setAttribute('aria-label', 'Siempre Zombie intro');
      overlay.innerHTML = `<video class="zombie-intro__video" playsinline preload="auto" aria-label="Siempre Zombie introduction"></video><button class="zombie-intro__skip" type="button">Skip <span>· Space</span></button>`;
      const video = overlay.querySelector('video'), skip = overlay.querySelector('button');
      const types = ['keydown', 'keyup', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'mousemove', 'wheel', 'contextmenu'];
      let waitTimer;
      const close = () => {
        if (active !== overlay) return;
        seen = true;
        try { sessionStorage.setItem(key, 'seen'); } catch {}
        active = null; clearTimeout(waitTimer);
        video.pause(); video.removeAttribute('src'); video.load(); overlay.remove();
        delete app.dataset.introPlaying;
        for (const type of types) window.removeEventListener(type, blockInput, true);
        document.removeEventListener('visibilitychange', visibilityChanged);
        document.removeEventListener('pointerlockchange', lockChanged);
        document.removeEventListener('pointerlockerror', close);
        document.dispatchEvent(new Event('zombie-intro-end'));
      };
      const lockChanged = () => { if (!document.pointerLockElement) close(); };
      const visibilityChanged = () => { if (document.hidden) close(); };
      const blockInput = event => {
        event.stopImmediatePropagation();
        if (event.cancelable) event.preventDefault();
        if ((event.type === 'keydown' && [' ', 'Spacebar', 'Enter', 'Escape'].includes(event.key)) || event.type === 'pointerup') close();
      };
      skip.addEventListener('click', close);
      video.addEventListener('ended', close);
      video.addEventListener('error', close);
      video.addEventListener('playing', () => { clearTimeout(waitTimer); });
      video.addEventListener('waiting', () => { clearTimeout(waitTimer); waitTimer = setTimeout(close, 8000); });
      active = overlay; app.dataset.introPlaying = 'true'; document.body.append(overlay);
      document.addEventListener('visibilitychange', visibilityChanged);
      document.addEventListener('pointerlockchange', lockChanged);
      document.addEventListener('pointerlockerror', close);
      for (const type of types) window.addEventListener(type, blockInput, { capture: true, passive: false });
      video.src = matchMedia('(max-width: 700px) and (orientation: portrait)').matches
        ? 'halloween/media/intro-mobile.mp4' : 'halloween/media/intro-desktop.mp4';
      video.muted = false;
      waitTimer = setTimeout(close, 8000);
      try { video.play()?.catch(close); } catch { close(); }
      // Submit continues synchronously: keep pointer lock, fullscreen and sound.
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
