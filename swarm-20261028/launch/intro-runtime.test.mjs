import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const code = readFileSync(new URL('../../game/zombie-intro.js', import.meta.url), 'utf8');
function fixture({ mobile = false, stored = false, storageBlocked = false, playFailure = null } = {}) {
  const make = () => ({
    handlers: {}, attrs: {},
    addEventListener(k, fn) { (this.handlers[k] ||= []).push(fn); },
    removeEventListener(k, fn) { this.handlers[k] = this.handlers[k]?.filter(f => f !== fn); },
    fire(k, e = {}) { for (const fn of [...(this.handlers[k] || [])]) fn(e); },
    dispatchEvent(e) { this.fire(e.type, e); },
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; if (k === 'src') delete this.src; },
    remove() { this.removed = true; },
  });
  const form = make(), app = { dataset: { screen: 'title' } }, handle = { value: '@valid.handle' };
  const window = make(), skip = make();
  let starts = 0, gesture = false, startGesture = false, endCount = 0, timerId = 0;
  const timers = new Map();
  const video = Object.assign(make(), {
    playCount: 0, pauseCount: 0,
    play() { this.playCount++; this.playInGesture = gesture; if (playFailure === 'throw') throw Error('unsupported'); return playFailure === 'reject' ? Promise.reject(Error('blocked')) : Promise.resolve(); },
    pause() { this.pauseCount++; }, load() {},
  });
  const overlay = Object.assign(make(), { querySelector(s) { return s === 'video' ? video : skip; } });
  const doc = Object.assign(make(), {
    readyState: 'complete', querySelector(s) { return s === '#start-form' ? form : app; },
    createElement() { return overlay; }, body: { append() {} },
  });
  doc.addEventListener('zombie-intro-end', () => { endCount++; });
  form.valid = true; form.checkValidity = () => form.valid; form.querySelector = () => handle;
  form.submit = () => {
    gesture = true;
    const event = { prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
    form.fire('submit', event);
    if (!event.stopped) { starts++; startGesture = gesture; app.dataset.screen = 'play'; }
    gesture = false; return event;
  };
  const sessionStorage = { getItem() { if (storageBlocked) throw Error(); return stored ? 'seen' : null; }, setItem(k, v) { if (storageBlocked) throw Error(); stored = true; assert.equal(k, 'siempre-zombie-intro:20261028-v2'); assert.equal(v, 'seen'); } };
  vm.runInNewContext(code, { document: doc, window, sessionStorage, Event: class { constructor(type) { this.type = type; } }, matchMedia: () => ({ matches: mobile }), setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); } });
  return { form, app, handle, video, skip, window, document: doc, overlay, timers,
    get starts() { return starts; }, get startGesture() { return startGesture; }, get endCount() { return endCount; },
    input(type, key) { const e = { type, key, cancelable: true, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } }; window.fire(type, e); return e; },
    expire() { for (const { fn } of [...timers.values()]) fn(); },
  };
}
test('Play starts one chosen video and original game synchronously in same gesture', () => {
  for (const mobile of [false, true]) {
    const f = fixture({ mobile }); const e = f.form.submit();
    assert.equal(e.prevented, false); assert.equal(e.stopped, false);
    assert.equal(f.starts, 1); assert.equal(f.startGesture, true);
    assert.equal(f.video.playCount, 1); assert.equal(f.video.playInGesture, true); assert.equal(f.video.muted, false);
    assert.equal(f.video.src, `halloween/media/intro-${mobile ? 'mobile' : 'desktop'}.mp4`);
    assert.equal(f.app.dataset.introPlaying, 'true');
    assert.doesNotMatch(f.overlay.innerHTML, /Welcome|Ready|Watch|Enter|controls|poster=/);
  }
});
test('ended thaws once, cleans source/listeners/timer, with no extra submit', () => {
  const f = fixture(); f.form.submit(); f.video.fire('ended'); f.video.fire('error'); f.skip.fire('click');
  assert.equal(f.starts, 1); assert.equal(f.endCount, 1); assert.equal(f.video.pauseCount, 1);
  assert.equal(f.app.dataset.introPlaying, undefined); assert.equal(f.video.src, undefined);
  assert.equal(f.overlay.removed, true); assert.equal(f.timers.size, 0);
  assert.equal(f.input('keydown', 'w').stopped, false);
});
test('down/mousedown swallowed; pointerup skips without stray gameplay down', () => {
  const f = fixture(); f.form.submit();
  assert.equal(f.input('pointerdown').stopped, true); assert.equal(f.app.dataset.introPlaying, 'true');
  assert.equal(f.input('mousedown').stopped, true); assert.equal(f.app.dataset.introPlaying, 'true');
  assert.equal(f.input('pointerup').stopped, true); assert.equal(f.app.dataset.introPlaying, undefined);
  assert.equal(f.endCount, 1);
});
test('movement, wheel and non-skip keys blocked; Space skips', () => {
  const f = fixture(); f.form.submit();
  for (const type of ['mousemove', 'wheel', 'contextmenu', 'keyup']) assert.equal(f.input(type, 'w').stopped, true);
  assert.equal(f.input('keydown', 'w').prevented, true); assert.equal(f.app.dataset.introPlaying, 'true');
  assert.equal(f.input('keydown', ' ').stopped, true); assert.equal(f.endCount, 1);
});
test('media error, sync play throw and async play rejection unblock game', async () => {
  const error = fixture(); error.form.submit(); error.video.fire('error'); assert.equal(error.endCount, 1);
  for (const playFailure of ['throw', 'reject']) {
    const f = fixture({ playFailure }); f.form.submit(); await Promise.resolve();
    assert.equal(f.app.dataset.introPlaying, undefined); assert.equal(f.starts, 1); assert.equal(f.endCount, 1);
  }
});
test('initial and later buffering timeouts unblock; playing clears timeout', () => {
  const f = fixture(); f.form.submit(); assert.equal([...f.timers.values()][0].ms, 8000);
  f.video.fire('playing'); assert.equal(f.timers.size, 0); assert.equal(f.app.dataset.introPlaying, 'true');
  f.video.fire('waiting'); assert.equal(f.timers.size, 1); f.expire(); assert.equal(f.endCount, 1);
  const load = fixture(); load.form.submit(); load.expire(); assert.equal(load.endCount, 1);
});
test('invalid input, non-title state and seen sessions bypass intro', () => {
  for (const value of ['', '@bad..handle', 'x'.repeat(31)]) {
    const f = fixture(); f.handle.value = value; f.form.submit(); assert.equal(f.video.playCount, 0);
  }
  const invalid = fixture(); invalid.form.valid = false; invalid.form.submit(); assert.equal(invalid.video.playCount, 0);
  const ended = fixture(); ended.app.dataset.screen = 'over'; ended.form.submit(); assert.equal(ended.video.playCount, 0);
  const saved = fixture({ stored: true }); saved.form.submit(); assert.equal(saved.video.playCount, 0); assert.equal(saved.starts, 1);
});
test('blocked storage safe; seen latch prevents replay on return to title', () => {
  const f = fixture({ storageBlocked: true }); f.form.submit(); f.video.fire('ended');
  f.app.dataset.screen = 'title'; f.form.submit(); assert.equal(f.video.playCount, 1); assert.equal(f.starts, 2);
});
test('hidden page and pointer lock failure clean up; fullscreen blur and acquired lock keep intro', () => {
  for (const cause of ['visibilitychange', 'pointerlockerror', 'pointerlockchange']) {
    const f = fixture(); f.form.submit();
    if (cause === 'visibilitychange') f.document.hidden = true;
    f.document.fire(cause);
    assert.equal(f.app.dataset.introPlaying, undefined); assert.equal(f.endCount, 1);
    assert.equal(f.document.handlers.visibilitychange.length, 0);
    assert.equal(f.document.handlers.pointerlockchange.length, 0);
    assert.equal(f.document.handlers.pointerlockerror.length, 0);
  }
  const f = fixture(); f.form.submit(); f.document.pointerLockElement = {};
  f.window.fire('blur'); assert.equal(f.app.dataset.introPlaying, 'true');
  f.document.hidden = false; f.document.fire('visibilitychange'); assert.equal(f.app.dataset.introPlaying, 'true');
  f.document.fire('pointerlockchange'); assert.equal(f.app.dataset.introPlaying, 'true');
  assert.equal(f.endCount, 0); f.video.fire('ended'); assert.equal(f.endCount, 1);
});
