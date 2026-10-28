"""Reconcile read-only source snapshots into this project's game directory."""
from pathlib import Path
import hashlib, json, re, shutil

ROOT = Path(__file__).resolve().parents[1]
assert ROOT.name == 'siempre-zombie-reconciled-20261026'
WORK = Path('C:/Users/alexl/Documents/Codex/2026-09-01/i/work')
BASE = WORK / 'siempre-zombie-20261023/game'
MOBILE = WORK / 'siempre-zombie-manage/mobile-hud'
MAP = WORK / 'siempre-zombie-map-lab/structure-source-review-20261025/games/siempre-zombie-v1'
STAGE = WORK / 'siempre-zombie-preview/keith-source-v113-20261025T100539Z/.vercel/output/static/games/siempre-zombie-v1'
CONTACT = WORK / 'siempre-zombie-preview/keith-world116-local-20261025T142415Z/.vercel/output/static/games/siempre-zombie-v1'
SOUND = WORK / 'siempre-zombie-manage/sound'
records = []
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def copy(src, dest, status='existing runtime dependency'):
    src, target = Path(src), ROOT / dest
    assert target.is_relative_to(ROOT) and src.is_file(), str(src)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, target)
    records.append(dict(path=dest, source=str(src), sourceSha256=sha(src), sourceBytes=src.stat().st_size, status=status))

def edit(dest, change):
    p = ROOT / dest
    original = p.read_text(encoding='utf-8-sig')
    final = change(original)
    assert final != original, dest
    p.write_text(final, encoding='utf-8', newline='\n')

def replace(s, a, b):
    assert a in s, a[:100]
    return s.replace(a, b)

for name in ['index.html', 'siempre-zombie.js', 'mobile-hud.css', 'no-zoom.js']:
    copy(MOBILE / name, 'game/' + name, 'newer gameplay/HUD source; WIP')
copy(STAGE / 'siempre-zombie.css', 'game/siempre-zombie.css')
for p in (STAGE / 'vendor').glob('*.js'):
    copy(p, 'game/vendor/' + p.name, 'existing vendored library; unchanged')
for p in (MOBILE / 'weapons-plus-v1').iterdir():
    if p.is_file(): copy(p, 'game/assets/weapons/plus-v1/' + p.name, 'existing code-built weapon/pickup WIP; not approved artwork')
copy(MAP / 'distillery-world.js', 'game/distillery-world.js', 'v118 map loader; WIP')
copy(MAP / 'calibrated-minimap.js', 'game/calibrated-minimap.js', 'existing world-derived map renderer')
copy(MAP / 'assets/world-lawn-v118-d7c4d3e9.glb', 'game/assets/world-lawn-v118-d7c4d3e9.glb', 'WIP map; no geometry edits')
copy(STAGE / 'assets/keith-faithful/keith-source-combined-01-webp.glb', 'game/assets/keith-faithful/keith-source-combined-01-webp.glb', 'source-art combined01 WIP; not approved')
assert sha(ROOT / 'game/assets/world-lawn-v118-d7c4d3e9.glb') == 'd7c4d3e981d080c039154c432870f841d7088c845d4efb9c536637c46cc369be'
assert sha(ROOT / 'game/assets/keith-faithful/keith-source-combined-01-webp.glb') == 'c7bf81195396f3a2d38b98ad3b8325998c80d4cee55d5050cf93c4f7c8a7acf2'
for name in ['rose-decal.png', 'vivo-label.jpg', 'vm-fwd-vivo.webp', 'vm-fwd-muerto.webp', 'vm-reload.webp', 'vm-reload-muerto.webp', 'vm-pump.webp', 'vm-pump-muerto.webp', 'vm-aim.webp', 'spin-vivo.webp', 'spin-muerto.webp', 'card-vivo.webp', 'card-muerto.webp'] + [f'fx-{skin}-{mode}.webp' for skin in ['vivo','muerto'] for mode in ['low','full','empty']]:
    copy(BASE / 'assets' / name, 'game/assets/' + name, 'original runtime artwork; byte-preserved; provenance limited to supplied files')
for name in ['industrial-sunset.hdr', 'minimap-distillery-mobile.jpg', 'minimap-distillery-wip-3d-v80.webp', 'minimap-distillery-v76-candidate.jpg']:
    source = next((d / 'assets' / name for d in [MAP, STAGE, BASE] if (d / 'assets' / name).is_file()), None)
    assert source, name
    copy(source, 'game/assets/' + name)
for name in ['embedded-nom1414-leaf-albedo-v84.jpg', 'nom1414-drone-ground-v90.jpg']:
    copy(MAP / 'assets/pbr' / name, 'game/assets/pbr/' + name, 'existing photographed map texture WIP')
copy(SOUND / 'siempre-audio.js', 'game/siempre-audio.js', 'supplied sample audio adapter; lifecycle patched locally')
for p in (SOUND / 'audio').glob('*.mp3'): copy(p, 'game/audio/' + p.name, 'existing supplied audio; no generation')

def world(s):
    # Pin this review candidate; do not carry other historical map meshes or review-only geometry branches.
    start = s.index('  const worldPath=')
    end = s.index('\n', start)
    s = s[:start] + "  const worldPath = './assets/world-lawn-v118-d7c4d3e9.glb';" + s[end:]
    s = replace(s, 'const review=new URLSearchParams(location.search);', "const review=new URLSearchParams('lawn118');")
    a = s.index("  if(review.get('worldReview')==='near-agave-surface-v83'")
    b = s.index("  if(review.get('worldReview')==='near-agave-fuller-v87'", a)
    s = s[:a] + s[b:]
    a = s.index("  if(review.get('worldReview')==='field-texture-candidate'")
    b = s.index('  let dryGrassMap', a)
    s = s[:a] + s[b:]
    a = s.index('  if(review.has(\'droneSoil\')')
    b = s.index('\n  const droneAgaveTone', a)
    s = s[:a] + "  droneSoilMap=await new THREE.TextureLoader().loadAsync('./assets/pbr/nom1414-drone-ground-v90.jpg');\n  droneSoilMap.wrapS=droneSoilMap.wrapT=THREE.RepeatWrapping;droneSoilMap.colorSpace=THREE.SRGBColorSpace;droneSoilMap.anisotropy=8;" + s[b:]
    a = s.index("  if(review.has('nom1414LeafNormal'))")
    b = s.index('  let collisionCount', a)
    s = s[:a] + s[b:]
    contact = (CONTACT / 'distillery-world.js').read_text(encoding='utf-8-sig')
    a = contact.index('  // Static walkable surfaces')
    sampler = contact[a:contact.index('  return { meshes:', a)]
    s = replace(s, '  return { world, meshes:bulletMeshes.length, blockers:blockers.length, bounds:[-40,50,-170,40], updateLighting };', sampler + '  return { world, mapRoot:world, worldPath, groundHeight, groundStats, meshes:bulletMeshes.length, blockers:blockers.length, bounds:[-40,50,-170,40], updateLighting };')
    return s
edit('game/distillery-world.js', world)

def runtime(s):
    s = re.sub(r"import \{ createAgaveCoa \}[^\n]*\n", '', s)
    s = s.replace('./distillery-world.js?world113=8e13d04d1039', './distillery-world.js')
    s = replace(s, "const ZOMBIES_3D = PARAMS.has('zombies3d') || !PARAMS.has('classicZombies');", 'const ZOMBIES_3D = true; // This candidate never substitutes the rejected generic roster.')
    a = s.index('// Zombie roster:')
    b = s.index('window.__zombieModelStatus', a)
    s = s[:a] + "// Exact source-art candidate only. No recolours, hair hiding, or body proportion changes.\nconst ZOMBIE_MODELS = { keith: './assets/keith-faithful/keith-source-combined-01-webp.glb' };\n" + s[b:]
    s = replace(s, 'const fit = 1.8 / Math.max(size.y, .01), L = z.look || {};\n    rig.scale.setScalar(fit * z.body.scale.x); rig.scale.y *= L.h || 1; rig.scale.x *= L.w || 1; rig.scale.z *= L.w || 1;\n    rig.position.y = -bounds.min.y * fit * (L.h || 1);', 'const fit = 1.8 / Math.max(size.y, .01);\n    rig.scale.setScalar(fit * z.body.scale.x);\n    rig.position.y = -bounds.min.y * fit * z.body.scale.x;')
    a = s.index('      // per-zombie look:')
    b = s.index('      node.material =', a)
    s = s[:a] + s[b:]
    s = s.replace("`${variant}${L.hair ? '-' + L.hair : ''}:ok`", '`${variant}:ok`')
    a = s.index('    // runners lean')
    b = s.index('\n  }\n  return z;', a)
    s = s[:a] + "    z.legacyBody.visible = false;\n    attachZombieRig(z, 'keith');" + s[b:]
    s = replace(s, "const USE_DISTILLERY = !PARAMS.has('legacy');", 'const USE_DISTILLERY = true;')
    s = re.sub(r'const RANKED = .*?;', 'const RANKED = false; // Local review only; never contact the score API.', s, count=1)
    s = replace(s, "catch (error) { console.error('Distillery world failed to load',error); document.documentElement.dataset.world='load-error'; }", "catch (error) { window.__szLoader?.fail(); throw error; }")
    # Keep the existing shared melee implementation for the axe, without importing or displaying rejected Coa art.
    s = replace(s, 'const coaHold = new THREE.Group(), coaTool = createAgaveCoa(THREE);', 'const coaHold = new THREE.Group(); // Existing axe animation holder; rejected Coa v1 excluded.')
    s = replace(s, 'coaHold.position.set(.16, -.1, -.12); coaTool.rotation.set(.32, .38, 0); coaHold.add(coaTool); gunRig.add(coaHold);', 'coaHold.position.set(.16, -.1, -.12); gunRig.add(coaHold);')
    s = replace(s, 'axeTool.rotation.copy(coaTool.rotation)', 'axeTool.rotation.set(.32, .38, 0)')
    s = replace(s, 'const meleeTool = () => game.weapon === 6 ? axeTool : coaTool, MELEE = () => game.weapon === 6 ? AXE : COA;', 'const meleeTool = () => axeTool, MELEE = () => AXE;')
    s = replace(s, 'coaTool.visible = on && game.weapon !== 6; ', '')
    a = s.index('  } else if (id === 2) {')
    b = s.index('  } else if (id === 6) {', a)
    s = s[:a] + s[b:]
    s = replace(s, 'for (const id of [2, 6, 0, 3, 4, 1])', 'for (const id of [6, 0, 3, 4, 1])')
    s = replace(s, 'const SLOT_ORDER = [5, 0, 3, 4, 1, 2, 6];', 'const SLOT_ORDER = [5, 0, 3, 4, 1, 6];')
    s = replace(s, '/^Digit([1-7])$/', '/^Digit([1-6])$/')
    s = replace(s, 'function swap(i, force) {', "function swap(i, force) {\n  if (i === 2 || !WEAPONS[i]) return; // Rejected Coa stays unavailable, including forced switches.")
    # Bring the supplied center-point floor-contact logic forward after collision/clamp resolution.
    s = replace(s, '  player.vy -= 16 * dt; player.pos.y += player.vy * dt;\n  if (player.pos.y <= 0) { player.pos.y = 0; player.vy = 0; player.grounded = true; }', '')
    needle = '  const moving = Math.hypot(player.vel.x, player.vel.z);'
    floor = "  const floorY=distilleryLevel?.groundHeight(player.pos.x,player.pos.z,player.pos.y+.35)??0;\n  if(player.grounded&&Math.abs(floorY-player.pos.y)<=.35){player.pos.y=floorY;player.vy=0;}\n  else{const previousY=player.pos.y;player.grounded=false;player.vy-=16*dt;player.pos.y+=player.vy*dt;if(player.vy<=0&&previousY>=floorY-.00001&&player.pos.y<=floorY){player.pos.y=floorY;player.vy=0;player.grounded=true;}}\n"
    s = replace(s, needle, floor + needle)
    # Samples unlock on Play/Resume, load asynchronously, and fall back to existing synths.
    s = replace(s, 'if (audio.ctx) { audio.ctx.resume?.(); return; }', 'if (audio.ctx) { audio.ctx.resume?.(); window.SZAudio?.setActive(true); return; }')
    s = replace(s, 'wind.start();', 'wind.start(); audio.wind = wg;')
    s = replace(s, 'audio.engine.start();', 'audio.engine.start();\n  window.SZAudio?.init(ctx, audio.master, audio.wind);\n  window.SZAudio?.setActive(true);')
    s = replace(s, '  if (!audio.engine) return;', "  if (!audio.engine) return;\n  if (window.SZAudio?.setLoop('engine_loop', on ? .4 + .6 * Math.min(1, Math.abs(speed) / 15) : 0, .8 + .6 * Math.min(1, Math.abs(speed) / 15))) { audio.engineGain.gain.value = 0; return; }")
    s = replace(s, 'function sprayAudio(level, pressure) {\n  if (!audio.ctx) return;', "function sprayAudio(level, pressure) {\n  if (!audio.ctx) return;\n  if (window.SZAudio?.setLoop('spray_loop', level * (.3 + .7 * pressure), .8 + .3 * pressure)) { audio.spray.gain.value = 0; return; }")
    s = replace(s, 'const ctx = audio.ctx; if (!ctx) return;', 'const ctx = audio.ctx; if (!ctx) return;\n  if (window.SZAudio?.play(kind, vol)) return;')
    for name in ['pause', 'quit', 'gameOver']:
        s = replace(s, 'function ' + name + '() {', 'function ' + name + '() {\n  window.SZAudio?.setActive(false); audio.ctx?.suspend();')
    s = replace(s, 'function resume() {', 'function resume() {\n  initAudio();')
    # Only the normal playable route is delivered, no historical studio fixtures with missing assets.
    a = s.index('// Explicit local QA route;')
    b = s.index('requestAnimationFrame(frame);', a)
    s = s[:a] + "setScreen('title'); refreshBoard();\n" + s[b:]
    s = replace(s, "tick(loadZombieGLTF('keith')), tick(loadZombieGLTF('walker2'))", "tick(loadZombieGLTF('keith'))")
    s = replace(s, 'const tick = p => p.catch(() => {}).then(', 'const tick = p => p.then(')
    s = replace(s, '.then(() => window.__szLoader?.done());', '.then(() => window.__szLoader?.done()).catch(error => { console.error(error); window.__szLoader?.fail(); });')
    # Remove historical alternative minimap refs; retain current source image plus existing tactical mode.
    s = re.sub(r"  else if \(mapV75\) image.src = [^\n]+\n  else if \(mapV74\) image.src = [^\n]+\n", '', s)
    s = s.replace("if (PARAMS.has('calibratedMap') && distilleryLevel?.mapRoot)", 'if (distilleryLevel?.mapRoot)')
    s = s.replace('const mapHeightToWidth = map3D ? 4 / 3', 'const mapHeightToWidth = map3D && siteMap ? 1 / siteMap.aspect : map3D ? 4 / 3')
    s = replace(s, "    minimap.dataset.world = distilleryLevel.worldPath;", "    minimap.dataset.world = distilleryLevel.worldPath;\n    minimap.style.setProperty('--site-map-aspect', siteMap.aspect);")
    s = replace(s, "if (e.code === 'KeyP') pause();", "if (e.code === 'KeyP' || e.code === 'Escape') pause();")
    s = replace(s, '    const p = z.root.position;\n    z.t += dt;', '    const p = z.root.position;\n    const floorY = distilleryLevel?.groundHeight(p.x, p.z, Math.max(.6, p.y + .35)) ?? 0;\n    z.t += dt;')
    s = replace(s, 'p.y = Math.min(0, -2 + z.t * 1.6);', 'p.y = floorY + Math.min(0, -2 + z.t * 1.6);')
    s = replace(s, "if (p.y >= 0) { z.state = 'chase'", "if (p.y >= floorY) { z.state = 'chase'")
    needle = "    if (buggy && buggy.state !== 'broken' && buggy.state !== 'driving') pushOutOfRzr(p,z.r);"
    s = replace(s, needle, needle + '\n    p.y = distilleryLevel?.groundHeight(p.x, p.z, Math.max(.6, p.y + .35)) ?? 0;')
    return s
edit('game/siempre-zombie.js', runtime)

def html(s):
    s = replace(s, '<body>', '<body>\n<div class="review-status" data-od-id="review-status">LOCAL WIP <span>· map + source-art character unapproved · boss / vehicle rejected art retained for mechanics</span></div>')
    s = replace(s, '<script type="module" src=', '<script src="siempre-audio.js"></script>\n<script type="module" src=')
    s = s.replace('<kbd>7</kbd>', '<kbd>6</kbd>')
    s = s.replace('id="t-slot-2" aria-label="Agave Coa"', 'id="t-slot-2" aria-label="Agave Coa unavailable" hidden')
    s = replace(s, "window.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'SCRIPT') window.__szLoader.fail(); }, true);", "window.addEventListener('error', function () { window.__szLoader.fail(); }, true);\n  window.addEventListener('unhandledrejection', function () { window.__szLoader.fail(); });")
    for tag in ['section', 'h1', 'h2', 'button', 'input', 'canvas']:
        s = re.sub(r'<'+tag+r'\b([^>]*?)\bid="([^"]+)"([^>]*)>', lambda m:'<'+tag+m[1]+'id="'+m[2]+'" data-od-id="'+m[2]+'"'+m[3]+'>', s)
    return s
edit('game/index.html', html)

def sound(s):
    s = replace(s, 'music: true', 'music: true, active: true, targets: {}, wind: null')
    s = replace(s, "    if (name === 'amb_night_loop') g.gain.value = FILES[name];", "    if (name === 'amb_night_loop') { g.gain.value = FILES[name]; if (A.wind) A.wind.gain.value = 0; }")
    s = replace(s, "    if (name === 'music_bed_loop') g.gain.value = A.music ? FILES[name] : 0;", "    if (name === 'music_bed_loop') g.gain.value = A.music ? FILES[name] : 0;\n    const pending = A.targets[name]; if (pending) { g.gain.value = FILES[name] * pending.level; s.playbackRate.value = pending.rate; }")
    s = replace(s, 'init(ctx, master) {', 'init(ctx, master, wind) {')
    s = replace(s, 'A.ctx = ctx;', 'A.ctx = ctx; A.wind = wind;')
    s = replace(s, 'setLoop(name, level, rate = 1) {', 'setLoop(name, level, rate = 1) {\n      A.targets[name] = { level, rate };')
    s = replace(s, '    setMusic(on)', "    setActive(on) {\n      A.active = on;\n      for (const [name, bus] of Object.entries(A.bus)) { bus.gain.cancelScheduledValues(A.ctx.currentTime); bus.gain.value = on ? 1 : 0; }\n      if (!on) for (const name of ['spray_loop','gatling_loop','engine_loop']) this.setLoop(name, 0);\n    },\n    setMusic(on)")
    return s
edit('game/siempre-audio.js', sound)

with (ROOT / 'game/mobile-hud.css').open('a', encoding='utf-8') as f:
        f.write('\n/* Local reconciliation status and calibrated map: no artwork changes. */\n.review-status{position:fixed;top:0;left:50%;right:auto;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);z-index:30;padding:8px 12px;background:#0b0716ed;color:#f3e9d2;text-align:center;font:11px/1.4 system-ui,sans-serif;pointer-events:none}\n.minimap.map-calibrated.map-3d .minimap-view{aspect-ratio:var(--site-map-aspect)}\n.minimap.map-calibrated.map-3d img{object-fit:contain}\n:focus-visible{outline:3px solid var(--bone);outline-offset:3px}\n@media(max-width:900px){.review-status{padding:8px 12px;font-size:11px}.review-status span{display:none}}\n.screen.title .board-note,.screen.title .board li.empty,.screen.title .skin-name,.loader-note{color:var(--bone)}\n.keyhint{background:oklch(from var(--night) l c h / .9);padding:8px;opacity:1}\n@keyframes keyhint-dim{to{opacity:.9}}\n')

def save_manifest():
    for r in records:
        p = ROOT / r['path']
        r.update(sha256=sha(p), bytes=p.stat().st_size, modified=sha(p)!=r['sourceSha256'])
    evidence = Path('C:/Users/alexl/Documents/Codex/2026-10-26/ok/work/reconciliation')
    consulted = [evidence/n for n in ['asset-evidence.md','asset-inventory.json','production-checklist.md']] + [MOBILE/n for n in ['MOBILE-HUD-HANDOFF.md','FIX-LIST.md']] + [CONTACT/'distillery-world.js', CONTACT/'siempre-zombie.js']
    data = dict(candidate='Siempre Zombie local reconciliation 2026-10-26', status='LOCAL WIP REVIEW CANDIDATE - not approved', scope=dict(spend=0, generation=False, deployment=False, credentials=False, sourceTreesModified=False), files=records, consulted=[dict(source=str(p), sha256=sha(p)) for p in consulted], distinctions=dict(character='Exact c7bf8119 combined01 WIP only; no recolours or separate grey/bald character claims.', map='Exact d7c4d3e9 v118 WIP mesh; no geometry changes.', retainedRejected='Existing procedural Sergio boss and RZR remain rejected artwork; retained only to avoid deleting gameplay mechanics.', excluded=['Coa v1: rejected; no asset/import/pickup', 'Generic stillhouse/jimador/guard GLBs', 'Keith R2 and neck02', 'Separate 2.79 MB Keith export', 'RZR v4/v5/v6 GLBs; v6 unapproved WIP, others rejected']), acceptance='Syntax/assets/source checks do not establish gameplay or visual acceptance.')
    (ROOT/'SOURCE-MANIFEST.json').write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')

save_manifest()
print(json.dumps(dict(copiedFiles=len(records), copiedBytes=sum(r['bytes'] for r in records), status='staged'), indent=2))
