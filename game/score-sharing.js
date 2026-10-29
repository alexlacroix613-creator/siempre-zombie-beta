/* User-initiated sharing only. Reads the finished run; never touches gameplay. */
(() => {
  'use strict';
  const GAME_URL = 'https://siempretequila.com/games/siempre-zombie/';
  const screen = document.getElementById('screen-over');
  const shareButton = document.getElementById('share-score');
  const copyButton = document.getElementById('copy-game-link');
  const status = document.getElementById('share-status');
  const manual = document.getElementById('share-manual');
  const manualText = document.getElementById('share-text');
  if (!screen || !shareButton || !copyButton) return;

  const read = id => document.getElementById(id).textContent.trim();
  const payload = () => ({
    title: 'Siempre Zombie',
    text: `I scored ${read('over-score')} in Siempre Zombie — wave ${read('over-wave')}, ${read('over-kills')} kills. Can you beat me?`,
    url: GAME_URL
  });
  let pending = false;

  function reset() {
    status.textContent = '';
    manual.hidden = true;
    manualText.value = '';
  }
  async function copy(text, successMessage) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = successMessage;
    } catch {
      manualText.value = text;
      manual.hidden = false;
      manualText.focus();
      manualText.select();
      status.textContent = 'Select and copy the text below.';
    }
  }
  shareButton.addEventListener('click', async () => {
    if (screen.hidden || pending) return;
    reset();
    const data = payload();
    // Invoke the native picker directly in the click, preserving user activation.
    if (typeof navigator.share === 'function') {
      pending = true;
      try {
        await navigator.share(data);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          await copy(`${data.text}\n${data.url}`, 'Score and link copied. Paste them into your social app.');
        }
      } finally { pending = false; }
    } else {
      await copy(`${data.text}\n${data.url}`, 'Score and link copied. Paste them into your social app.');
    }
  });
  copyButton.addEventListener('click', () => {
    if (screen.hidden) return;
    reset();
    copy(GAME_URL, 'Game link copied.');
  });
  new MutationObserver(reset).observe(screen, { attributes: true, attributeFilter: ['hidden'] });
})();
