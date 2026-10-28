// Siempre Zombie sample audio (ElevenLabs set). Drop-in over the synth sfx(): any kind with a loaded
// sample plays the file; anything else falls back to the existing synth code. No dependencies.
(() => {
  const BASE = 'audio/';
  const FILES = {
    spray_loop: .55, spray_start: .6, empty: .6, unclip: .6, reload: .7, glug: .5, clink: .5,
    throw: .5, splash: .8, coa_swing: .6, coa_hit: .7, gatling_spin: .6, gatling_loop: .55,
    groan_1: .5, groan_2: .5, groan_3: .5, hit: .5, zombie_death_1: .6, zombie_death_2: .6,
    zombie_attack: .6, hurt: .6, sergio_roar: .8, sergio_laugh: .7, sergio_stomp: .7, sergio_death: .8,
    engine_loop: .5, crash: .8, bell: .6, wave_card: .7, levelup: .6, pickup: .5, ui_tap: .4,
    loading_sting: .6, game_over: .7, amb_night_loop: .35, music_bed_loop: .3,
    vo_here_they_come: .9, vo_wave_cleared: .9, vo_final_wave: .9, vo_boss: .9,
  };
  const VARIANTS = { groan: 3, zombie_death: 2 };
  const LOOPS = ['spray_loop', 'gatling_loop', 'engine_loop', 'amb_night_loop', 'music_bed_loop'];
  const A = { ctx: null, buf: {}, bus: {}, loops: {}, last: {}, music: true, active: true, targets: {}, wind: null };

  function fetchBuf(name) {
    return fetch(BASE + name + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(b => new Promise((ok, no) => A.ctx.decodeAudioData(b, ok, no)))
      .then(b => { A.buf[name] = b; if (LOOPS.includes(name)) startLoop(name); })
      .catch(() => {});   // missing file: the synth fallback keeps working
  }
  function startLoop(name) {
    const b = A.buf[name], ctx = A.ctx; if (!b || A.loops[name]) return;
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
    s.loopStart = .03; s.loopEnd = Math.max(.1, b.duration - .03);   // skip mp3 encoder padding so the loop is seamless
    const g = ctx.createGain(); g.gain.value = 0;
    const bus = name === 'music_bed_loop' ? A.bus.music : name === 'amb_night_loop' ? A.bus.amb : A.bus.sfx;
    s.connect(g).connect(bus); s.start(0, .03);
    A.loops[name] = { s, g };
    if (name === 'amb_night_loop') { g.gain.value = FILES[name]; if (A.wind) A.wind.gain.value = 0; }
    if (name === 'music_bed_loop') g.gain.value = A.music ? FILES[name] : 0;
    const pending = A.targets[name]; if (pending) { g.gain.value = FILES[name] * pending.level; s.playbackRate.value = pending.rate; }
  }
  window.SZAudio = {
    // call at the end of initAudio(); returns true so the caller can mute the synth wind bed
    init(ctx, master, wind) {
      if (A.ctx) return true;
      A.ctx = ctx; A.wind = wind;
      for (const k of ['sfx', 'music', 'amb']) { A.bus[k] = ctx.createGain(); A.bus[k].connect(master); }
      // short sounds first, the big beds last
      Object.keys(FILES).sort((a, b) => LOOPS.includes(a) - LOOPS.includes(b)).forEach(fetchBuf);
      return true;
    },
    // returns true when a sample played, false to let the synth handle it
    play(kind, vol = 1, rate = 1) {
      if (!A.ctx) return false;
      let name = kind;
      if (VARIANTS[kind]) {
        const n = VARIANTS[kind]; let i = 1 + Math.floor(Math.random() * n);
        if (n > 1 && i === A.last[kind]) i = i % n + 1;
        A.last[kind] = i; name = kind + '_' + i;
      }
      const b = A.buf[name]; if (!b) return false;
      const s = A.ctx.createBufferSource(); s.buffer = b;
      s.playbackRate.value = rate * (VARIANTS[kind] || kind === 'hit' || kind === 'splash' ? .92 + Math.random() * .16 : 1);
      const g = A.ctx.createGain(); g.gain.value = FILES[name] * vol;
      s.connect(g).connect(A.bus.sfx); s.start();
      if (name.startsWith('vo_') || name.startsWith('sergio_roar') || name === 'wave_card') this.duck(.35, 1.6);
      return true;
    },
    // continuous sounds: level 0..1, rate = playback speed (pitch). Returns true when the sample is running.
    setLoop(name, level, rate = 1) {
      A.targets[name] = { level, rate };
      const l = A.loops[name]; if (!l) return false;
      const t = A.ctx.currentTime;
      l.g.gain.setTargetAtTime(FILES[name] * level, t, .05);
      l.s.playbackRate.setTargetAtTime(rate, t, .08);
      return true;
    },
    setActive(on) {
      A.active = on;
      for (const [name, bus] of Object.entries(A.bus)) { bus.gain.cancelScheduledValues(A.ctx.currentTime); bus.gain.value = on ? 1 : 0; }
      if (!on) for (const name of ['spray_loop','gatling_loop','engine_loop']) this.setLoop(name, 0);
    },
    setMusic(on) { A.music = on; this.setLoop('music_bed_loop', on ? 1 : 0); },
    duck(to, secs) {
      const g = A.bus.music; if (!g) return; const t = A.ctx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(to, t, .05); g.gain.setTargetAtTime(1, t + secs, .4);
    },
    loaded: () => Object.keys(A.buf).length,
  };
})();
