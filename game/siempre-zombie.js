// Siempre Zombie — Noche de Muertos. First-person wave shooter, Three.js, no build step.
// The player fights with a tequila soaker (stream weakens as the tank empties) and tequila water balloons.
// Global leaderboard follows the Agave Racing pattern (/api/siempre-zombie/{runs,scores,leaderboard});
// when the API is missing (file://, preview) it falls back to scores saved on this device.
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { LOCAL_SCORE_KEY } from './leaderboard-config.js';
import { REFILL_SPOTS } from './refill-layout.js';
import { SERGIO, tickBossMelee, createBossHud } from './sergio-boss.js';
import { createDualViewmodel } from './dual-viewmodel.js';
import { createDriverViewmodel } from './driver-viewmodel.js?v=20261028-rzr5';
import { createCoaViewmodel } from './coa-viewmodel.js';
import { createAuthoredWeaponViews } from './authored-weapon-views.js';
import { createGatlingSourceViews } from './gatling-source-views.js?v=20261028-source1';
import { createFieldProps } from './new-field-props.js';
import { createSourceGlassProjectiles } from './source-glass-projectile.js';
import {RPG,createRPGState,collectRPG,stepRPGState} from './muerto-rpg-combat.js';
import {createMuertoRPGSourceViews} from './muerto-rpg-source-views.js?v=actions4';
import {createMuertoRPGRuntime} from './muerto-rpg-runtime.js';
import {segmentBoxTime,segmentCylinderTime} from './combat-trace.js';
import { siteGpsPosition, gpsHeading } from './minimap-gps.js';
import { preloadRzr6, makeRzr6, RZR6_FOOTPRINT } from './rzr6-loader.js?v=20261028-rzr5';
import { createBoundaryFog } from './boundary-fog.js';
import { createOutOfBounds, softMovementBlockers } from './out-of-bounds.js';
import { createTacoTruck } from './taco-truck.js';
import { installDistilleryWorld } from './distillery-world.js';
import { createGlove, createGloveMaterials } from './assets/weapons/plus-v1/fp-hands.js?v=1';
import { createVivoGatling } from './assets/weapons/plus-v1/vivo-gatling.js?v=1';
import { createZombieBottle } from './assets/weapons/plus-v1/zombie-bottle.js?v=1';
import { createCognacGlass } from './assets/weapons/plus-v1/cognac-glass.js?v=1';
import { FITTED_ZOMBIE_VARIANTS, FITTED_ZOMBIE_ROSTER, preloadFittedZombieVariants, isOriginalHeadMesh, cloneFittedBodyMaterials, cloneFittedHead } from './fitted-zombie-variants.mjs?v=source-final28';
import { preloadPhysicalDeath, createPhysicalDeathClip } from './physical-death.mjs?v=contact-final28';
import { createCharacterLabels } from './character-labels.js';
import { settleDeathAccessories,resetDeathAccessories,disposeDeathAccessories } from './accessory-death-settle.mjs';
import { createAxe } from './assets/weapons/plus-v1/axe.js?v=1';
import { createPina } from './assets/weapons/plus-v1/pina.js?v=1';

const $ = s => document.querySelector(s);
// Loading screen (index.html): count the bytes three's loaders pull in (world, HDR, zombie models) and report them;
// LOAD.expect is the usual total so the number moves smoothly even when a server sends no Content-Length
const LOAD = { files: [], expect: 33e6 };
function loadReport() { let l = 0, t = 0; for (const f of LOAD.files) { l += f.l; t += f.t || f.l; } window.__szLoader?.progress(.08 + .84 * l / Math.max(LOAD.expect, t)); }
{ const fileLoad = THREE.FileLoader.prototype.load;
  THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    const f = { l: 0, t: 0 }; LOAD.files.push(f);
    return fileLoad.call(this, url, d => { f.l = f.t = Math.max(f.l, d?.byteLength || 0); loadReport(); onLoad?.(d); },
      e => { f.l = e.loaded; if (e.lengthComputable) f.t = e.total; loadReport(); onProgress?.(e); },
      error => { window.__szLoader?.fail({ message: error?.message || 'Could not load required game data.', filename: String(url) }); onError?.(error); });
  }; }
const app = $('#app');
const canvas = $('#scene');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PARAMS = new URLSearchParams(location.search);
const LOCAL_DIAGNOSTICS = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(location.href).hostname);
// A manual retry must refresh required GLB/HDR/texture requests as well as the entry module.
if (PARAMS.has('bootRetry')) THREE.DefaultLoadingManager.setURLModifier(url => {
  const resolved = new URL(url, location.href);
  if (resolved.origin !== location.origin || !/^https?:$/.test(resolved.protocol)) return url;
  resolved.searchParams.set('bootRetry', PARAMS.get('bootRetry'));
  return resolved.href;
});
const RZR6 = true; // The selected white/black two-seat RZR is the current vehicle.
let rzr6GLTF = null;
const TOUCH = matchMedia('(pointer: coarse)').matches || PARAMS.has('touch');
const AIM_ENABLED = PARAMS.has('aim');   // Alex 26 Oct: aim felt redundant, hip fire only (?aim brings it back for review)
const zombieGLTFLoader = new GLTFLoader();
const zombieGLTFs = new Map();
const FITTED_REVIEW = LOCAL_DIAGNOSTICS && PARAMS.has('fittedReview');
const SHARED_ZOMBIE_MODEL = './assets/characters/shared-zombie-body-ken-v1.glb';
const ZOMBIE_MODELS = {ken:SHARED_ZOMBIE_MODEL, ...Object.fromEntries(Object.keys(FITTED_ZOMBIE_VARIANTS).map(name=>[name,SHARED_ZOMBIE_MODEL]))};
const characterLabel = createCharacterLabels(THREE);
window.__zombieModelStatus = [];
let zombieVariantIndex = 0;
const ORIGINAL_ZOMBIE_ROSTER = [...FITTED_ZOMBIE_ROSTER];
function loadZombieGLTF(variant) {
  if (!ZOMBIE_MODELS[variant]) return Promise.reject(new Error(`No registered zombie model for ${variant}`));
  const url = ZOMBIE_MODELS[variant];
  if (!zombieGLTFs.has(url)) zombieGLTFs.set(url, zombieGLTFLoader.loadAsync(url).then(gltf => {
    const required = ['zombie_idle', 'zombie_walk', 'zombie_chase', 'zombie_attack', 'zombie_death'];
    const missing = required.filter(name => !THREE.AnimationClip.findByName(gltf.animations, name));
    if (missing.length) throw new Error(`${variant} model is missing required animations: ${missing.join(', ')}`);
    return gltf;
  }));
  return zombieGLTFs.get(url);
}

function cloneZombieRig(source, gltf) {
  const sourceToClone = new Map(), cloneToSource = new Map(), clone = source.clone(true);
  const pair = (a, b) => { sourceToClone.set(a, b); cloneToSource.set(b, a); for (let i = 0; i < a.children.length; i++) pair(a.children[i], b.children[i]); };
  pair(source, clone);
  const headIndex = gltf.parser.json.nodes.findIndex(node=>node.name === 'Head');
  const originalHead = [...sourceToClone.keys()].find(node=>gltf.parser.associations.get(node)?.nodes === headIndex);
  if (!originalHead) throw new Error('Approved common body Head node missing');
  clone.userData.zombieHeadBone = sourceToClone.get(originalHead);
  clone.traverse(node => {
    if (!node.isSkinnedMesh) return;
    const original = cloneToSource.get(node);
    node.skeleton = original.skeleton.clone();
    node.bindMatrix.copy(original.bindMatrix);
    node.skeleton.bones = original.skeleton.bones.map(bone => sourceToClone.get(bone));
    node.bind(node.skeleton, node.bindMatrix);
  });
  return clone;
}
function setZombieClip(z, name, timeScale = 1) {
  const next = z.animActions?.[name];
  if (!next) return;
  next.timeScale = timeScale;
  if (z.animClip === name) return;
  const previous = z.animActions[z.animClip];
  next.reset().play();
  if (name === 'zombie_attack' || name === 'zombie_death') { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
  else next.setLoop(THREE.LoopRepeat, Infinity);
  if (previous) previous.crossFadeTo(next, .16, true);
  z.animClip = name;
}
function attachZombieRig(z, variant) {
  z.modelPending = true;
  loadZombieGLTF(variant).then(gltf => {
    if (!zombies.includes(z) || z.state === 'dying') return;
    const rig = cloneZombieRig(gltf.scene, gltf), mixer = new THREE.AnimationMixer(rig);
    const actorClips = gltf.animations.map(clip=>clip.name === 'zombie_death' ? createPhysicalDeathClip(THREE,gltf,variant) : clip);
    const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'zombie_idle');
    mixer.clipAction(idleClip).play(); mixer.update(0);
    rig.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(rig, true), size = bounds.getSize(new THREE.Vector3());
    const fit = 1.8 / Math.max(size.y, .01);
    rig.scale.setScalar(fit);
    rig.position.y = -bounds.min.y * fit;
    if (variant !== 'ken') {
      rig.traverse(node=>{if(node.isMesh && isOriginalHeadMesh(node))node.visible=false;});
      const head = cloneFittedHead(variant);
      head.traverse(node=>{if(node.isMesh)node.userData.fittedCharacterHead=true;});
      rig.userData.zombieHeadBone.add(head);
    }
    rig.traverse(node => {
      if (!node.isMesh || !node.visible) return;
      node.castShadow = true; node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      const isHead = !!node.userData.fittedCharacterHead || isOriginalHeadMesh(node);
      node.userData.z = z; node.userData.head = isHead; node.userData.targetBody = true;
      if (isHead) z.headParts.push(node);
      const cloned = cloneFittedBodyMaterials(variant,materials);
      node.material = Array.isArray(node.material) ? cloned : cloned[0];
      z.mats.push(...cloned);
      z.parts.push(node);
    });
    z.body.add(rig);
    z.animMixer = mixer;
    z.animActions = Object.fromEntries(actorClips.map(clip => [clip.name, z.animMixer.clipAction(clip)]));
    z.animClip = 'zombie_idle'; z.modelRoot = rig; z.rigged = true;
    z.headBone = rig.userData.zombieHeadBone; z.headshotY = z.root.position.y + 1.62 * z.body.scale.x;
    if (z.headBone) { z.root.updateMatrixWorld(true); z.headBone.getWorldPosition(z.headPosition); z.headshotY = z.headPosition.y + .04 * z.body.scale.x; }
    z.modelPending = false;
    window.__zombieModelStatus.push(`${variant}:ok`);
    const status = document.getElementById('zombie-model-status'); if (status) status.textContent = window.__zombieModelStatus.join(' · ');
  }).catch(error => {
    z.modelPending = false; z.root.visible = false;
    console.error(`Zombie model ${variant} failed to load`, error); window.__zombieModelStatus.push(`${variant}: ${error.message}`);
    const status = document.getElementById('zombie-model-status'); if (status) status.textContent = window.__zombieModelStatus.join(' · ');
    showBanner(`${z.name} could not load · reload the game`, 'Character load error', 10); pause();
  });
}

// ---------------- settings ----------------
const RULES = 'courtyard-waves-v1';
const API_BASE = '/api/siempre-zombie';
const USE_DISTILLERY = true;
const RANKED = true;
const HALF = 30;              // courtyard half-size (metres)
const GATE = 2.6;             // half-width of each gate opening
const EYE = 1.65;
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('siempre-zombie:' + k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('siempre-zombie:' + k, JSON.stringify(v)); } catch {} },
};

// ---------------- renderer / scene ----------------
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch { document.body.innerHTML = '<p style="padding:2em;font-family:sans-serif;color:#fff">Siempre Zombie needs WebGL. Try another browser or device.</p>'; throw new Error('no webgl'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0716);
scene.fog = new THREE.FogExp2(0x1a0f2e, 0.026);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 500);
camera.rotation.order = 'YXZ';
scene.add(camera);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------------- procedural textures ----------------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function speckle(g, w, h, base, cols, n, rmax) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length]; g.globalAlpha = rand(.15, .6);
    g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rand(.5, rmax), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}
const earthTex = canvasTex(512, 512, (g, w, h) => speckle(g, w, h, '#4a2216', ['#6b3420', '#2c130c', '#7a4a2a', '#3a1a10', '#8a5a3a'], 5000, 3), [60, 60]);
const adobeTex = canvasTex(512, 256, (g, w, h) => {
  speckle(g, w, h, '#9a7458', ['#b48a68', '#7a5640', '#c4a080', '#5a3a28'], 2600, 4);
  g.strokeStyle = '#3a2418'; g.globalAlpha = .5; g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rand(-18, 18); y += rand(4, 16); g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = .35; g.fillStyle = '#2a1a10'; g.fillRect(0, h - 26, w, 26); g.globalAlpha = 1;
}, [6, 1]);
const stoneTex = canvasTex(256, 256, (g, w, h) => {
  speckle(g, w, h, '#77737a', ['#5a565e', '#9a96a0', '#46424a', '#6a7a5a'], 2200, 3);
  g.fillStyle = '#4a6a3a'; g.globalAlpha = .35; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(Math.random() * w, h - Math.random() * 70, rand(4, 16), 0, 7); g.fill(); }
  g.globalAlpha = 1;
});
function radialTex(stops) {
  return canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
}
const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,200,120,.8)'], [1, 'rgba(255,120,20,0)']]);
const moonGlowTex = radialTex([[0, 'rgba(220,230,255,.9)'], [.3, 'rgba(160,170,255,.25)'], [1, 'rgba(80,60,160,0)']]);
const mistTex = radialTex([[0, 'rgba(170,150,210,.55)'], [1, 'rgba(170,150,210,0)']]);
const signTex = canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = '#120a08'; g.fillRect(0, 0, w, h);
  g.font = 'italic 900 150px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff8a1c'; g.shadowBlur = 40; g.fillStyle = '#ffd9a0'; g.fillText('SIEMPRE', w / 2, h / 2 + 8);
});

// ---------------- world ----------------
const blockers = [];          // AABBs that stop players, zombies and bullets
const gateBars = [];          // invisible AABBs that stop only the player
const bulletMeshes = [];      // meshes that stop bullets
const tombs = [];             // tombstone positions zombies can rise from
const flickers = [];          // lanterns that flicker
const mats = {
  earth: new THREE.MeshStandardMaterial({ map: earthTex, roughness: 1 }),
  adobe: new THREE.MeshStandardMaterial({ map: adobeTex, roughness: .95 }),
  stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: .8 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x1c1c22, metalness: .8, roughness: .4 }),
};

function addBox(x, z, w, d, h, mat, { y = 0, block = true, ry = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true; scene.add(m);
  if (block) {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    blockers.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
    bulletMeshes.push(m);
  }
  return m;
}

// ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mats.earth);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
bulletMeshes.push(ground);

// sky dome, stars, moon
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x05040f) }, mid: { value: new THREE.Color(0x24123f) }, low: { value: new THREE.Color(0x6a2a2a) } },
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top, mid, low; varying vec3 v; void main(){ float h = v.y; vec3 c = mix(low, mid, smoothstep(-.02,.18,h)); c = mix(c, top, smoothstep(.18,.7,h)); gl_FragColor = vec4(c,1.); }',
  }));
  scene.add(sky);
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2, v = rand(.08, 1);
    const r = 300, y = v, s = Math.sqrt(1 - y * y);
    pos.set([Math.cos(u) * s * r, y * r, Math.sin(u) * s * r], i * 3);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe4ff, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: .85 })));
  const moonDir = new THREE.Vector3(-.45, .5, -.75).normalize();
  const lunarMap=new THREE.TextureLoader().load('./assets/moon/nasa-lroc-color-1k.jpg');
  lunarMap.colorSpace=THREE.SRGBColorSpace;lunarMap.anisotropy=4;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 48, 32), new THREE.MeshBasicMaterial({map:lunarMap,color:0xd8d8df,fog:false,toneMapped:false}));
  moon.name='Full moon · NASA LROC surface';moon.userData.skyMoon=true;
  moon.rotation.y=Math.PI*.5;
  moon.position.copy(moonDir).multiplyScalar(280); scene.add(moon);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonGlowTex, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(46); glow.material.opacity=.24;glow.userData.skyMoonHalo=true;glow.position.copy(moon.position);scene.add(glow);

  scene.add(new THREE.HemisphereLight(0x7a6ac0, 0x3a1a0c, 1.15));
  const moonLight = new THREE.DirectionalLight(0x9fb0ff, 1.25);
  moonLight.position.copy(moonDir).multiplyScalar(60);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
  Object.assign(moonLight.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  moonLight.shadow.bias = -0.0006; moonLight.shadow.normalBias = .03;
  scene.add(moonLight);
}

// cemetery walls with four gates
const WALL_H = 2.4;
for (const side of [-1, 1]) {
  const len = HALF - GATE;
  const mid = (GATE + HALF) / 2;
  for (const s of [-1, 1]) {
    addBox(s * mid, side * HALF, len, 1, WALL_H, mats.adobe);   // north/south
    addBox(side * HALF, s * mid, 1, len, WALL_H, mats.adobe);   // east/west
  }
  gateBars.push({ minX: -GATE, maxX: GATE, minZ: side * HALF - .5, maxZ: side * HALF + .5 });
  gateBars.push({ minX: side * HALF - .5, maxX: side * HALF + .5, minZ: -GATE, maxZ: GATE });
}
// corner caps
for (const x of [-1, 1]) for (const z of [-1, 1]) addBox(x * HALF, z * HALF, 1.6, 1.6, WALL_H + .5, mats.adobe);

// gate posts with jack-o'-lanterns and lantern lights
const GATES = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([gx, gz]) => ({
  out: new THREE.Vector3(gx * (HALF + 7), 0, gz * (HALF + 7)),
  inn: new THREE.Vector3(gx * (HALF - 4), 0, gz * (HALF - 4)),
  dir: new THREE.Vector3(gx, 0, gz),
}));
// Distillery world: hold the oven yard. Player, buggy and zombies stay inside this box,
// and the four entry lanes sit just outside it (measured against the v113 col_ blockers).
// Alex 26 Oct: the yard reaches east and south to take in the agave patch inside the compound walls (the Coa is found there)
const OVEN_YARD = { minX: -28, maxX: 50, minZ: -34, maxZ: 46 };
const outOfBounds = createOutOfBounds({bounds:OVEN_YARD,parent:$('#hud')});
const YARD_GATES = [[0, -39, 0, -31], [5, 54, 5, 42], [-35, 0, -25, 0], [56, 12, 46, 12]].map(([ox, oz, ix, iz]) => {
  const dir = new THREE.Vector3(ox - ix, 0, oz - iz).normalize();
  return { out: new THREE.Vector3(ox, 0, oz), inn: new THREE.Vector3(ix, 0, iz), dir };
});
const inYard = (x, z, m = 0) => x > OVEN_YARD.minX + m && x < OVEN_YARD.maxX - m && z > OVEN_YARD.minZ + m && z < OVEN_YARD.maxZ - m;
const fullSiteWorld = () => document.documentElement.dataset.world === 'viva-mexico';
// Flow field over the yard: a breadth-first walk out from the player's cell, so zombies go round walls instead of into them.
const NAV = { cell: .5, w: 0, h: 0, blocked: null, dist: null, from: -1, t: 0, n: 0 };
function navCell(x, z) {
  const i = Math.floor((x - OVEN_YARD.minX) / NAV.cell), j = Math.floor((z - OVEN_YARD.minZ) / NAV.cell);
  return i < 0 || j < 0 || i >= NAV.w || j >= NAV.h ? -1 : j * NAV.w + i;
}
function navBuild() {
  NAV.w = Math.ceil((OVEN_YARD.maxX - OVEN_YARD.minX) / NAV.cell); NAV.h = Math.ceil((OVEN_YARD.maxZ - OVEN_YARD.minZ) / NAV.cell);
  NAV.blocked = new Uint8Array(NAV.w * NAV.h); NAV.dist = new Float32Array(NAV.w * NAV.h); NAV.n = blockers.length;
  const pad = .45;
  for (const b of blockers) {
    for (let j = Math.max(0, Math.floor((b.minZ - pad - OVEN_YARD.minZ) / NAV.cell)); j <= Math.min(NAV.h - 1, Math.floor((b.maxZ + pad - OVEN_YARD.minZ) / NAV.cell)); j++)
      for (let i = Math.max(0, Math.floor((b.minX - pad - OVEN_YARD.minX) / NAV.cell)); i <= Math.min(NAV.w - 1, Math.floor((b.maxX + pad - OVEN_YARD.minX) / NAV.cell)); i++) NAV.blocked[j * NAV.w + i] = 1;
  }
  NAV.from = -1;
}
function navUpdate(dt) {
  if (!NAV.blocked || NAV.n !== blockers.length) navBuild();
  NAV.t -= dt;
  let c = navCell(player.pos.x, player.pos.z);
  if (c < 0 || (c === NAV.from && NAV.t > 0)) return;
  if (NAV.blocked[c]) {   // player hugging a wall: start from the nearest open cell
    let best = -1, bd = 1e9; const ci = c % NAV.w, cj = (c / NAV.w) | 0;
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const i = ci + di, j = cj + dj, k = j * NAV.w + i; if (i >= 0 && j >= 0 && i < NAV.w && j < NAV.h && !NAV.blocked[k] && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = k; } }
    if (best < 0) return; c = best;
  }
  NAV.from = c; NAV.t = .25;
  const D = NAV.dist; D.fill(Infinity); D[c] = 0;
  const q = NAV.q ||= new Int32Array(NAV.w * NAV.h * 6); let h = 0, t = 0; q[t++] = c;
  while (h < t) {
    const k = q[h++], i = k % NAV.w, j = (k / NAV.w) | 0, d = D[k];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NAV.w || nj >= NAV.h) continue;
      const nk = nj * NAV.w + ni; if (NAV.blocked[nk]) continue;
      if (di && dj && (NAV.blocked[j * NAV.w + ni] || NAV.blocked[nj * NAV.w + i])) continue;   // no corner cutting
      const nd = d + (di && dj ? 1.414 : 1);
      if (nd < D[nk] && t < q.length) { D[nk] = nd; q[t++] = nk; }
    }
  }
}
// direction down the flow field from (x,z), or null when the field can't help
function navDir(x, z) {
  const c = navCell(x, z); if (c < 0 || !NAV.dist) return null;
  const i = c % NAV.w, j = (c / NAV.w) | 0; let best = NAV.dist[c], bi = 0, bj = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const ni = i + di, nj = j + dj; if ((!di && !dj) || ni < 0 || nj < 0 || ni >= NAV.w || nj >= NAV.h) continue;
    const v = NAV.dist[nj * NAV.w + ni]; if (v < best) { best = v; bi = di; bj = dj; }
  }
  if (!bi && !bj) return null;
  const tx = OVEN_YARD.minX + (i + bi + .5) * NAV.cell - x, tz = OVEN_YARD.minZ + (j + bj + .5) * NAV.cell - z, l = Math.hypot(tx, tz) || 1;
  return [tx / l, tz / l];
}
const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xff7a10, emissive: 0xff5a00, emissiveIntensity: .9, roughness: .6 });
function pumpkin(x, y, z, s = .45) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 10), pumpkinMat);
  p.scale.y = .8; p.position.set(x, y + s * .8, z); p.castShadow = true; scene.add(p);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .18), mats.wood); stem.position.set(x, y + s * 1.6, z); scene.add(stem);
  return p;
}
for (const g of GATES) {
  const side = new THREE.Vector3(g.dir.z, 0, g.dir.x);
  for (const s of [-1, 1]) {
    const x = g.dir.x * HALF + side.x * s * (GATE + .4), z = g.dir.z * HALF + side.z * s * (GATE + .4);
    addBox(x, z, 1, 1, WALL_H + .9, mats.adobe);
    pumpkin(x, WALL_H + .9, z);
  }
  const light = new THREE.PointLight(0xff8a2a, 14, 18, 1.6);
  light.position.set(g.dir.x * (HALF - 1.5), 3.2, g.dir.z * (HALF - 1.5)); scene.add(light);
  flickers.push({ light, base: 14, seed: Math.random() * 100 });
}

// ofrenda altar with candles in the courtyard
{
  addBox(0, -9, 4.4, 1.6, 1.0, mats.adobe);
  addBox(0, -9.4, 3.2, .8, .7, mats.adobe, { y: 1.0, block: false });
  addBox(0, -9.6, 2.0, .5, .6, mats.adobe, { y: 1.7, block: false });
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: .6 });
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, rand(.15, .35)), candleMat);
    const tier = i % 3, y = [1.0, 1.7, 2.3][tier];
    c.position.set(rand(-1.9 + tier * .55, 1.9 - tier * .55), y + .12, -9 + [.5, -.1, -.5][tier] + rand(-.2, .2)); scene.add(c);
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb050, blending: THREE.AdditiveBlending, depthWrite: false }));
    f.scale.setScalar(.35); f.position.copy(c.position).y += .25; scene.add(f);
  }
  pumpkin(-2.6, 0, -8.4, .5); pumpkin(2.6, 0, -8.4, .55);
  const light = new THREE.PointLight(0xffa040, 16, 16, 1.5); light.position.set(0, 2.8, -7.8); scene.add(light);
  flickers.push({ light, base: 16, seed: 3 });
  // marigold petals on the ground
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 7, r = Math.sqrt(Math.random()) * 5; pos.set([Math.cos(a) * r * 1.4, .02, -7 + Math.sin(a) * r * .6], i * 3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xff9a1a, size: .09 })));
}

// tombstones and crosses
{
  const ok = (x, z) => Math.hypot(x, z) > 7 && Math.abs(x) < HALF - 3 && Math.abs(z) < HALF - 3 && Math.abs(x) > 4.5 && Math.abs(z) > 4.5 && !(Math.abs(x) < 4 && z < -5 && z > -13);
  let placed = 0, guard = 0;
  while (placed < 34 && guard++ < 1000) {
    const x = Math.round(rand(-HALF + 4, HALF - 4) / 3) * 3 + rand(-.3, .3), z = Math.round(rand(-HALF + 4, HALF - 4) / 3.5) * 3.5;
    if (!ok(x, z) || tombs.some(t => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
    const ry = rand(-.15, .15);
    if (Math.random() < .7) {
      const h = rand(.9, 1.5);
      const t = addBox(x, z, .9, .22, h, mats.stone, { ry });
      t.rotation.z = rand(-.08, .08);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .22, 16, 1, false, 0, Math.PI), mats.stone);
      top.rotation.set(Math.PI / 2, 0, Math.PI / 2 + ry); top.position.set(x, h, z); top.castShadow = true; scene.add(top);
    } else {
      addBox(x, z, .18, .18, 1.6, mats.wood, { ry });
      addBox(x, z, .8, .14, .14, mats.wood, { y: 1.1, block: false, ry });
    }
    // dirt mound in front of the stone
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.earth);
    mound.scale.set(.55, .18, 1.05); mound.position.set(x, 0, z + 1.2); mound.receiveShadow = true; scene.add(mound);
    tombs.push(new THREE.Vector3(x, 0, z + 1.2));
    placed++;
  }
}

// tequila barrels: cover, and the place to refill the soaker
const barrels = [];
{
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: .6, roughness: .4 });
  const markMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffc040, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const {x,z} of REFILL_SPOTS) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.2, 16), mats.wood);
    b.position.set(x, .6, z); b.castShadow = b.receiveShadow = true; scene.add(b); bulletMeshes.push(b);
    for (const y of [.2, 1.0]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(.57, .57, .07, 16), bandMat); ring.position.set(x, y, z); scene.add(ring); }
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .2, 8), mats.iron); tap.rotation.x = Math.PI / 2; tap.position.set(x, .35, z + .6); scene.add(tap);
    const mark = new THREE.Sprite(markMat); mark.scale.setScalar(.7); mark.position.set(x, 1.6, z); scene.add(mark);
    blockers.push({ minX: x - .55, maxX: x + .55, minZ: z - .55, maxZ: z + .55 });
    barrels.push({ x, z, mark });
  }
}

// papel picado strings over the courtyard
{
  const cols = [0xff3d7f, 0xff8a1c, 0x3cc6ff, 0x9dff6a, 0xb46aff, 0xffe14a];
  const lines = [[-HALF + 2, -HALF + 2, HALF - 2, HALF - 2], [-HALF + 2, HALF - 2, HALF - 2, -HALF + 2], [-HALF + 2, 0, HALF - 2, 0], [0, -HALF + 2, 0, HALF - 2]];
  const per = 40, geo = new THREE.PlaneGeometry(.34, .42);
  geo.translate(0, -.21, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x9a9a9a }), lines.length * per);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  let k = 0;
  for (const [x1, z1, x2, z2] of lines) {
    const ang = Math.atan2(z2 - z1, x2 - x1);
    for (let i = 0; i < per; i++) {
      const t = (i + .5) / per, sag = Math.sin(t * Math.PI) * 1.4;
      e.set(0, -ang, rand(-.1, .1)); q.setFromEuler(e);
      m.compose(new THREE.Vector3(x1 + (x2 - x1) * t, 5.2 - sag, z1 + (z2 - z1) * t), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(k, m); mesh.setColorAt(k, c.setHex(cols[k % cols.length])); k++;
    }
  }
  scene.add(mesh);
  for (const [x, z] of [[-HALF + 2, -HALF + 2], [HALF - 2, HALF - 2], [-HALF + 2, HALF - 2], [HALF - 2, -HALF + 2], [-HALF + 2, 0], [HALF - 2, 0], [0, -HALF + 2], [0, HALF - 2]])
    addBox(x, z, .16, .16, 5.4, mats.wood, { block: false });
}

// the hacienda / distillery beyond the north wall
{
  const hz = -HALF - 16;
  addBox(0, hz, 34, 12, 9, mats.adobe);
  addBox(-12, hz + 2, 5, 5, 14, mats.adobe); // bell tower
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 3, 4), new THREE.MeshStandardMaterial({ color: 0x7a2a1a, roughness: .9 }));
  roof.position.set(-12, 15.5, hz + 2); roof.rotation.y = Math.PI / 4; scene.add(roof);
  addBox(12, hz - 1, 2.4, 2.4, 18, new THREE.MeshStandardMaterial({ color: 0x6a3a28, roughness: .9 })); // chimney
  const archMat = new THREE.MeshBasicMaterial({ color: 0x1a0a06 });
  for (let i = -3; i <= 3; i++) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), archMat); a.position.set(i * 4, 1.8, hz + 6.02); scene.add(a);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), new THREE.MeshBasicMaterial({ color: 0xffa040 })); w.position.set(i * 4, 6.3, hz + 6.02); scene.add(w);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(2, 10.8, hz + 6.05); scene.add(sign);
  const light = new THREE.PointLight(0xffa040, 30, 40, 1.4); light.position.set(2, 7, hz + 9); scene.add(light);
}

// agave fields outside the walls
{
  const leaf = new THREE.ConeGeometry(.12, 1.4, 4, 1);
  leaf.translate(0, .7, 0);
  const plants = [];
  for (let x = -78; x <= 78; x += 3.2) for (let z = -78; z <= 78; z += 2.6) {
    if (Math.abs(x) < HALF + 6 && Math.abs(z) < HALF + 6) continue;
    if (z < -HALF - 6 && z > -HALF - 26 && Math.abs(x) < 22) continue; // hacienda yard
    if (Math.hypot(x, z) > 80) continue;
    plants.push([x + rand(-.4, .4), z + rand(-.3, .3), rand(.7, 1.25)]);
  }
  const L = 9;
  const mesh = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: 0x5a8a9a, roughness: .7 }), plants.length * L);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  let k = 0;
  for (const [x, z, s] of plants) for (let i = 0; i < L; i++) {
    const a = i / L * Math.PI * 2 + rand(0, .4), tilt = i % 2 ? .95 : .55;
    e.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt, 'XYZ');
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * rand(.8, 1.1), s));
    mesh.setMatrixAt(k, m); mesh.setColorAt(k++, c.setHSL(.53 + rand(-.03, .03), .25, .38 + rand(-.05, .05)));
  }
  mesh.receiveShadow = true; scene.add(mesh);
}

// low ground mist
const mists = [];
for (let i = 0; i < 26; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: rand(.25, .5), color: 0x9f8acf }));
  m.rotation.x = -Math.PI / 2; m.position.set(rand(-60, 60), rand(.25, .7), rand(-60, 60)); m.userData.v = rand(.2, .6);
  scene.add(m); mists.push(m);
}

let distilleryLevel = null;
if (USE_DISTILLERY) {
  try { distilleryLevel = await installDistilleryWorld({scene,blockers,gateBars,bulletMeshes,tombs,barrels,ground}); }
  catch (error) { window.__szLoader?.fail(error); throw error; }
}

// ---------------- particles ----------------
const boundaryFog = distilleryLevel ? createBoundaryFog(scene, OVEN_YARD) : null;
const PMAX = 900;
const part = { pos: new Float32Array(PMAX * 3), col: new Float32Array(PMAX * 3), vel: new Float32Array(PMAX * 3), life: new Float32Array(PMAX), i: 0 };
const pgeo = new THREE.BufferGeometry();
pgeo.setAttribute('position', new THREE.BufferAttribute(part.pos, 3).setUsage(THREE.DynamicDrawUsage));
pgeo.setAttribute('color', new THREE.BufferAttribute(part.col, 3).setUsage(THREE.DynamicDrawUsage));
part.pos.fill(-999);
// Soft splash highlights, instead of the default opaque square point sprites.
const splashCanvas = document.createElement('canvas'); splashCanvas.width = splashCanvas.height = 32;
const splashContext = splashCanvas.getContext('2d'), splashGradient = splashContext.createRadialGradient(16, 16, 1, 16, 16, 16);
splashGradient.addColorStop(0, 'rgba(255,255,255,.9)'); splashGradient.addColorStop(.25, 'rgba(255,255,255,.65)'); splashGradient.addColorStop(1, 'rgba(255,255,255,0)');
splashContext.fillStyle = splashGradient; splashContext.fillRect(0, 0, 32, 32);
const splashTexture = new THREE.CanvasTexture(splashCanvas);
const points = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: .035, map: splashTexture, vertexColors: true, transparent: true, depthWrite: false }));
points.frustumCulled = false; scene.add(points);
const tmpC = new THREE.Color();
function burst(p, n, color, speed = 3, up = 2) {
  for (let k = 0; k < n; k++) {
    const i = part.i = (part.i + 1) % PMAX;
    part.pos.set([p.x, p.y, p.z], i * 3);
    part.vel.set([rand(-speed, speed), rand(0, up + speed), rand(-speed, speed)], i * 3);
    tmpC.set(Array.isArray(color) ? color[k % color.length] : color);
    part.col.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    part.life[i] = rand(.5, 1.1);
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    if (part.life[i] <= 0) continue;
    part.life[i] -= dt;
    const o = i * 3;
    part.vel[o + 1] -= 9 * dt;
    part.pos[o] += part.vel[o] * dt; part.pos[o + 1] += part.vel[o + 1] * dt; part.pos[o + 2] += part.vel[o + 2] * dt;
    if (part.pos[o + 1] < .02) { part.pos[o + 1] = .02; part.vel[o] *= .6; part.vel[o + 2] *= .6; part.vel[o + 1] = 0; }
    if (part.life[i] <= 0) part.pos[o + 1] = -999;
  }
  pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
}

// ---------------- audio (synthesised, no files) ----------------
const audio = { ctx: null, master: null, noise: null };
function initAudio() {
  if (audio.ctx) { audio.ctx.resume?.(); window.SZAudio?.setActive(true); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = audio.ctx = new AC();
  audio.master = ctx.createGain(); audio.master.gain.value = .6; audio.master.connect(ctx.destination);
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  audio.noise = buf;
  // night wind bed
  const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
  const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 380;
  const wg = ctx.createGain(); wg.gain.value = .05; wind.connect(wf).connect(wg).connect(audio.master); wind.start(); audio.wind = wg;
  // soaker stream: looped hiss whose level and pitch follow the tank pressure
  const spray = ctx.createBufferSource(); spray.buffer = buf; spray.loop = true;
  audio.sprayFilter = ctx.createBiquadFilter(); audio.sprayFilter.type = 'bandpass'; audio.sprayFilter.frequency.value = 1800; audio.sprayFilter.Q.value = .8;
  audio.spray = ctx.createGain(); audio.spray.gain.value = 0;
  spray.connect(audio.sprayFilter).connect(audio.spray).connect(audio.master); spray.start();
  // side-by-side engine
  audio.engine = ctx.createOscillator(); audio.engine.type = 'sawtooth'; audio.engine.frequency.value = 36;
  const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 520;
  audio.engineGain = ctx.createGain(); audio.engineGain.gain.value = 0;
  audio.engine.connect(ef).connect(audio.engineGain).connect(audio.master); audio.engine.start();
  window.SZAudio?.init(ctx, audio.master, audio.wind);
  window.SZAudio?.setActive(true);
}
function engineAudio(on, speed) {
  if (!audio.engine) return;
  if (window.SZAudio?.setLoop('engine_loop', on ? .4 + .6 * Math.min(1, Math.abs(speed) / 15) : 0, .8 + .6 * Math.min(1, Math.abs(speed) / 15))) { audio.engineGain.gain.value = 0; return; }
  const t = audio.ctx.currentTime, k = Math.min(1, Math.abs(speed) / 15);
  audio.engineGain.gain.setTargetAtTime(on ? .07 + .07 * k : 0, t, .1);
  audio.engine.frequency.setTargetAtTime(36 + 70 * k, t, .1);
}
function sprayAudio(level, pressure) {
  if (!audio.ctx) return;
  if (window.SZAudio?.setLoop('spray_loop', level * (.3 + .7 * pressure), .8 + .3 * pressure)) { audio.spray.gain.value = 0; return; }
  const t = audio.ctx.currentTime;
  audio.spray.gain.setTargetAtTime(level * (.1 + .25 * pressure), t, .04);
  audio.sprayFilter.frequency.setTargetAtTime(700 + 2200 * pressure, t, .08);
}
function sfx(kind, vol = 1) {
  const ctx = audio.ctx; if (!ctx) return;
  if (window.SZAudio?.play(kind, vol)) return;
  const t = ctx.currentTime, out = ctx.createGain(); out.connect(audio.master);
  const noise = (dur, f, type = 'lowpass') => { const s = ctx.createBufferSource(); s.buffer = audio.noise; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; s.connect(fl).connect(out); s.start(t, rand(0, 1), dur); };
  const tone = (f1, f2, dur, type = 'sine') => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); o.connect(out); o.start(t); o.stop(t + dur); };
  if (kind === 'throw') { out.gain.setValueAtTime(.3, t); out.gain.exponentialRampToValueAtTime(.001, t + .2); noise(.2, 900, 'bandpass'); }
  else if (kind === 'splash') { out.gain.setValueAtTime(.9 * vol, t); out.gain.exponentialRampToValueAtTime(.001, t + .5); noise(.5, 1400); tone(320, 90, .12, 'sine'); }
  else if (kind === 'crash') { out.gain.setValueAtTime(.9 * vol, t); out.gain.exponentialRampToValueAtTime(.001, t + .5); noise(.5, 900); tone(150, 55, .25, 'square'); }
  else if (kind === 'thump') { out.gain.setValueAtTime(.6 * vol, t); out.gain.exponentialRampToValueAtTime(.001, t + .18); noise(.18, 380); }
  else if (kind === 'glug') { out.gain.setValueAtTime(.3, t); out.gain.exponentialRampToValueAtTime(.001, t + .18); tone(180, 120, .18, 'sine'); }
  else if (kind === 'levelup') { out.gain.setValueAtTime(.4, t); out.gain.exponentialRampToValueAtTime(.001, t + 1.2); tone(523, 1046, .5, 'triangle'); tone(659, 1318, .9, 'sine'); }
  else if (kind === 'empty') { out.gain.setValueAtTime(.3, t); out.gain.exponentialRampToValueAtTime(.001, t + .05); noise(.05, 5000, 'highpass'); }
  else if (kind === 'unclip') { out.gain.setValueAtTime(.35, t); out.gain.exponentialRampToValueAtTime(.001, t + .08); tone(900, 420, .08, 'triangle'); }
  else if (kind === 'clink') { out.gain.setValueAtTime(.25, t); out.gain.exponentialRampToValueAtTime(.001, t + .35); tone(2350, 2300, .35, 'sine'); tone(3520, 3500, .2, 'sine'); }
  else if (kind === 'reload') { out.gain.setValueAtTime(.35, t); out.gain.exponentialRampToValueAtTime(.001, t + .12); noise(.12, 3200, 'bandpass'); }
  else if (kind === 'hit') { out.gain.setValueAtTime(.25 * vol, t); out.gain.exponentialRampToValueAtTime(.001, t + .08); tone(1400, 900, .08, 'square'); }
  else if (kind === 'hurt') { out.gain.setValueAtTime(.5, t); out.gain.exponentialRampToValueAtTime(.001, t + .3); tone(220, 80, .3, 'sawtooth'); }
  else if (kind === 'groan') {
    out.gain.setValueAtTime(.0001, t); out.gain.exponentialRampToValueAtTime(.22 * vol, t + .25); out.gain.exponentialRampToValueAtTime(.001, t + 1.4);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; const f = rand(70, 120); o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .7, t + 1.4);
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = rand(350, 650); fl.Q.value = 4;
    o.connect(fl).connect(out); o.start(t); o.stop(t + 1.4);
  }
  else if (kind === 'bell') { out.gain.setValueAtTime(.5, t); out.gain.exponentialRampToValueAtTime(.001, t + 2.4); tone(392, 390, 2.4); tone(587, 585, 2.0, 'triangle'); }
  else if (kind === 'pickup') { out.gain.setValueAtTime(.3, t); out.gain.exponentialRampToValueAtTime(.001, t + .3); tone(660, 1320, .25, 'triangle'); }
}

// ---------------- weapons: tequila soaker + tequila water balloons ----------------
const WEAPONS = [
  { id: 'soaker', name: 'Vivo Soaker' },
  { id: 'balloon', name: 'Tequila balloons' },
  { id: 'coa', name: 'Agave Coa' },
  { id: 'double', name: 'Double Soaker' },
  { id: 'gatling', name: 'Vivo Gatling' },
  { id: 'glass', name: 'Cognac glass' },
  { id: 'axe', name: 'Jimador axe' },
  { id: 'rpg', name: 'Muerto RPG' },
];
// Alex 26 Oct: every run starts with only the cognac glass and a bottle of Vivo; everything else is found in the yard
const START_WEAPON = 5;
const SLOT_ORDER = [5, 0, 3, 4, 1, 2, 6, 7];   // keys 1-8 and the touch bar, left to right
const TANK_WEAPONS = new Set([0, 3, 4, 5]);   // the weapons that run on the Vivo bottle
const GLASS = { shot: .05, pour: .62, toss: .34, drops: 24, dmg: 3.6, speed: 13, range: 9 };   // tank per shot; seconds; liquid per toss
const AXE = { swing: .4, hitAt: .4, reach: 2.4, cos: .6, dmg: 95, maxHits: 2 };
const GATLING = { rate: 2.2, drain: 1.6, spinUp: .35 };   // x soaker rate and drain; seconds to spin the barrels up
const SOAKER = { drain: .1, rate: 46, dmg: 3.4 };     // tank per second, droplets per second per soaker, damage per droplet at full pressure
const BALLOON = { rate: .55, radius: 3.2, dmg: 130, max: 12, start: 5 };
const COA = { swing: .5, hitAt: .42, reach: 2.7, cos: .55, dmg: 75, maxHits: 3 };   // jimador chop: seconds per swing, hit moment, reach in metres, cone, damage, zombies per chop
const newFieldProps = createFieldProps(THREE);
const sourceGlassProjectiles = createSourceGlassProjectiles(THREE);
// Vivo Soaker: cream toy blaster, Siempre Vivo blanco bottle as the reservoir, teal hose, gloved hands
const VIVO = { swap: 1.45, fill: .45, spare: 2, max: 4, restock: .6 };   // bottle swap seconds, point the new bottle is in, starting/max spare bottles, seconds per bottle at a barrel
const toyCream = new THREE.MeshStandardMaterial({ color: 0xefe5cf, roughness: .5 });
const toyTeal = new THREE.MeshStandardMaterial({ color: 0x1fb3ad, roughness: .38 });
const toyLav = new THREE.MeshStandardMaterial({ color: 0xa58ee6, roughness: .4 });
const toyMetal = new THREE.MeshStandardMaterial({ color: 0xc4c6cc, roughness: .3, metalness: .3 });
const toyHole = new THREE.MeshBasicMaterial({ color: 0x06302e });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xe6f6f3, roughness: .05, transparent: true, opacity: .28, depthWrite: false });
const blancoMat = new THREE.MeshStandardMaterial({ color: 0xeefaff, emissive: 0x2a4a50, roughness: .05, transparent: true, opacity: .55, depthWrite: false });
const hoseMat = new THREE.MeshStandardMaterial({ color: 0x35d3cb, emissive: 0x08403c, roughness: .25, transparent: true, opacity: .85 });
const dropMat = new THREE.MeshBasicMaterial({ color: 0x9fd2dc, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false });
const roseImg = new Image(); roseImg.src = 'assets/rose-decal.png';
const labelTex = new THREE.TextureLoader().load('assets/vivo-label.jpg');
labelTex.colorSpace = THREE.SRGBColorSpace; labelTex.center.set(.5, .5); labelTex.rotation = Math.PI;
const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: .55 });
const labelTexR = labelTex.clone(); labelTexR.wrapS = THREE.RepeatWrapping; labelTexR.repeat.x = -1;   // same label, wrapped round the right-hand side
const labelMatR = new THREE.MeshStandardMaterial({ map: labelTexR, roughness: .55 });
// cream side panel with rose-and-vine decals; redrawn once the rose art has loaded
function decalTex(w, h, draw) {
  const t = canvasTex(w, h, (g, w, h) => draw(g, w, h, false));
  roseImg.addEventListener('load', () => { draw(t.image.getContext('2d'), w, h, true); t.needsUpdate = true; });
  return t;
}
function vine(g, pts) {
  g.strokeStyle = '#4a3a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 4) g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
  g.stroke();
  g.fillStyle = '#3f8a4a';
  for (let i = 2; i < pts.length; i += 4) { g.beginPath(); g.ellipse(pts[i], pts[i + 1], 7, 3.5, .6, 0, 7); g.fill(); }
}
const sideTex = decalTex(512, 100, (g, w, h, art) => {
  g.fillStyle = '#efe5cf'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d6cab0'; g.lineWidth = 2; g.strokeRect(14, 12, w - 28, h - 24);
  vine(g, [70, 50, 130, 20, 190, 46, 250, 70, 300, 52]);
  vine(g, [470, 40, 430, 75, 390, 60]);
  if (art) { g.drawImage(roseImg, 28, 8, 84, 84); g.drawImage(roseImg, 432, 18, 66, 66); }
});
const sleeveTex = decalTex(128, 128, (g, w, h, art) => { g.clearRect(0, 0, w, h); if (art) g.drawImage(roseImg, 0, 0, w, h); });
const bodyMats = [new THREE.MeshStandardMaterial({ map: sideTex, roughness: .5 }), null, toyCream, toyCream, toyCream, toyCream];
bodyMats[1] = bodyMats[0];
const patchMat = new THREE.MeshStandardMaterial({ map: sleeveTex, transparent: true, roughness: .7, depthWrite: false });
const ribGeo = new THREE.LatheGeometry(Array.from({ length: 25 }, (_, i) => new THREE.Vector2(.031 + (i % 2 ? .004 : 0), -.075 + i * .00625)), 14);
function part3(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; }
function cylZ(g, r1, r2, len, mat, x, y, z, seg = 16) {   // cylinder along the gun's length, radius r1 at the front
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m;
}
// A Siempre Vivo blanco bottle lying along -z (neck forward). userData.liquid scales with the level.
function makeVivoBottle(right) {
  const b = new THREE.Group();
  cylZ(b, .05, .05, .2, glassMat, 0, 0, 0, 20);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.0515, .0515, .165, 24, 1, true, right ? -.45 : -Math.PI + .45, Math.PI), right ? labelMatR : labelMat);
  label.rotation.x = -Math.PI / 2; label.position.z = .005; b.add(label);
  const liquid = cylZ(b, .045, .045, .19, blancoMat, 0, 0, 0, 16); liquid.renderOrder = -1;
  cylZ(b, .02, .05, .04, glassMat, 0, 0, -.12, 16);       // shoulder
  cylZ(b, .019, .019, .05, glassMat, 0, 0, -.165, 12);    // neck
  cylZ(b, .05, .05, .012, glassMat, 0, 0, .104, 20);      // heavy base
  b.userData = { liquid };
  return b;
}
function setBottleLevel(b, level) {
  const l = b.userData.liquid; l.scale.z = Math.max(.02, level); l.position.y = -.045 * (1 - level);
}
// Arms: a teal-and-cream glove at the hand point, a sleeve running back out of view to a fixed shoulder
const UP = new THREE.Vector3(0, 1, 0), armDir = new THREE.Vector3();
// The glove (assets/weapons/plus-v1/fp-hands.js) closes round a handle of radius `grip`; `wrap` < 1 cups instead
const gloveMats = createGloveMaterials(THREE);
const sleeveMaterial = toyCream.clone();
const muertoSleevePatch = new THREE.TextureLoader().load('assets/hand-costume-reference.png');
muertoSleevePatch.colorSpace = THREE.SRGBColorSpace;
muertoSleevePatch.repeat.set(180/1536,170/1024);
muertoSleevePatch.offset.set(1300/1536,1-1000/1024);
function applyArmCostume(id) {
  const muerto=id==='muerto';
  gloveMats.glove.color.setHex(muerto?0x19191b:0x17a8a2);
  gloveMats.glove.sheenColor.setHex(muerto?0x77706b:0x8ff3ea);
  gloveMats.panel.color.setHex(muerto?0xb87442:0xece2cb);
  gloveMats.seam.color.setHex(muerto?0x8c522e:0x0c6f6b);
  sleeveMaterial.color.setHex(muerto?0x171719:0xefe5cf);
  patchMat.map=muerto?muertoSleevePatch:sleeveTex;
  patchMat.needsUpdate=true;
}
// `scale` sizes the glove up to match the big painted gloves; the fist still closes on the real handle radius
function buildArm(parent, side, shoulder, grip = .022, wrap = 1, scale = 1.35) {
  const hand = createGlove(THREE, gloveMats, { side, grip: grip / scale, wrap }); hand.scale.setScalar(scale); parent.add(hand);
  const frame = new THREE.Group(); parent.add(frame);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.044, .054, 1, 14).translate(0, .5, 0), sleeveMaterial); sleeve.position.y = .004; frame.add(sleeve);
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), patchMat); patch.position.set(side * .052, .1, 0); patch.rotation.y = side * Math.PI / 2; frame.add(patch);
  return { hand, frame, sleeve, shoulder, wrist: hand.userData.wrist.clone().multiplyScalar(scale) };
}
// axis: the handle's direction (the glove's +Y, index finger end); palm: which way from the handle the palm sits
// (defaults to toward the shoulder, so the back of the hand faces out)
const armX = new THREE.Vector3(), armY = new THREE.Vector3(), armZ = new THREE.Vector3(), armM = new THREE.Matrix4();
function poseArm(a, p, axis = UP, palm = null) {
  a.hand.position.copy(p);
  armY.copy(axis).normalize();
  if (palm) armZ.copy(palm); else armZ.copy(a.shoulder).sub(p);
  armZ.addScaledVector(armY, -armZ.dot(armY)).normalize();
  armX.crossVectors(armY, armZ);
  a.hand.quaternion.setFromRotationMatrix(armM.makeBasis(armX, armY, armZ));
  a.frame.position.copy(a.wrist).applyQuaternion(a.hand.quaternion).add(p);
  armDir.copy(a.shoulder).sub(a.frame.position);
  a.sleeve.scale.y = Math.max(.05, armDir.length() - .045);
  a.frame.quaternion.setFromUnitVectors(UP, armDir.normalize());
}
const HOSE_A = new THREE.Vector3(0, .05, -.3), BOTTLE_AT = new THREE.Vector3(0, .112, -.03), NECK = new THREE.Vector3(0, 0, -.19);
function poseHose(g, end, attached) {
  const d = g.userData;
  if (d.hoseEnd && d.hoseEnd.distanceToSquared(end) < 1e-8) return;
  (d.hoseEnd ||= new THREE.Vector3()).copy(end);
  const c2 = attached ? end.clone().add(tmpHose.set(0, 0, -.07)) : end.clone().add(tmpHose.set(0, -.04, -.04));
  const curve = new THREE.CubicBezierCurve3(HOSE_A, HOSE_A.clone().add(tmpHose.set(0, .07, -.08)), c2, end.clone());
  d.hose.geometry.dispose(); d.hose.geometry = new THREE.TubeGeometry(curve, 18, .009, 6);
  d.coupler.position.copy(end); d.coupler.lookAt(g.localToWorld(c2)); 
}
const tmpHose = new THREE.Vector3();
function buildSoaker(arms) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.07, .085, .44), bodyMats); body.position.set(0, 0, -.09); g.add(body);
  part3(g, .054, .02, .36, toyCream, 0, .05, -.1);                             // top ridge
  part3(g, .06, .03, .12, toyCream, 0, -.05, .02);                             // lower frame
  cylZ(g, .045, .045, .07, toyTeal, 0, .005, -.345, 20);                       // front housing
  cylZ(g, .034, .042, .022, toyTeal, 0, .005, -.39, 20);                       // nozzle ring
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.014, 14), toyHole); hole.position.set(0, .005, -.402); hole.rotation.y = Math.PI; g.add(hole);
  cylZ(g, .036, .036, .03, toyTeal, 0, .01, .145, 18);                         // rear cap
  const pump = new THREE.Mesh(ribGeo, toyTeal); pump.rotation.x = -Math.PI / 2; pump.position.set(0, -.072, -.245); g.add(pump);
  cylZ(g, .005, .005, .16, toyMetal, 0, -.04, -.17, 6);                        // pump rod
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.028, .007, 6, 14, Math.PI), toyCream); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, -.045, -.005); g.add(guard);
  part3(g, .014, .036, .016, toyLav, 0, -.06, -.008).rotation.x = .25;         // trigger
  part3(g, .05, .135, .062, toyTeal, 0, -.1, .07).rotation.x = -.3;           // grip
  for (const z of [.06, -.1]) {                                                // bottle cradles
    part3(g, .03, .04, .03, toyCream, 0, .06, z);
    const c = new THREE.Mesh(new THREE.TorusGeometry(.056, .008, 6, 16, Math.PI), toyCream); c.rotation.z = Math.PI; c.position.set(0, .112, z); g.add(c);
    for (const s of [-1, 1]) { const sc = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .008, 8), toyMetal); sc.rotation.z = Math.PI / 2; sc.position.set(s * .036, .045, z); g.add(sc); }
  }
  const bottle = makeVivoBottle(arms?.grip === -1); bottle.position.copy(BOTTLE_AT); g.add(bottle);
  const hose = new THREE.Mesh(new THREE.BufferGeometry(), hoseMat); g.add(hose);
  const coupler = new THREE.Group(); g.add(coupler);
  cylZ(coupler, .022, .022, .04, toyTeal, 0, 0, .0, 14).rotation.x = Math.PI / 2;
  cylZ(coupler, .024, .024, .008, toyMetal, 0, 0, -.022, 14).rotation.x = Math.PI / 2;
  g.userData = { muzzle: new THREE.Vector3(0, .005, -.41), bottle, liquid: bottle.userData.liquid, pump, hose, coupler, arms: {}, yaw: (arms?.grip || 0) * .42 };
  if (arms?.grip) g.userData.arms.grip = buildArm(g, arms.grip, new THREE.Vector3(arms.grip * .4, -.62, .55), .026);
  if (arms?.pump) g.userData.arms.pump = buildArm(g, -1, new THREE.Vector3(-.5, -.62, .42), .02);
  poseSoaker(g, -1, 1);
  return g;
}
// Bottle-swap reload, after Alex's loading sheets: unclip the hose, lift the bottle out,
// drop a fresh one in, reconnect the hose. t runs 0..1 through the swap; -1 is at rest.
const K = {
  pump: new THREE.Vector3(-.03, -.082, -.245), neck: new THREE.Vector3(-.035, .125, -.215), pull: new THREE.Vector3(-.11, .17, -.29),
  hoseRest: new THREE.Vector3(-.07, .15, -.27), grab: new THREE.Vector3(-.065, .165, -.03), away: new THREE.Vector3(-.3, -.6, .25),
  carry: new THREE.Vector3(.065, -.053, 0), grip: new THREE.Vector3(0, -.09, .075),
};
const SWAP_KEYS = [  // [t, hand from, hand to]
  [0, 'pump', 'neck'], [.12, 'neck', 'pull'], [.22, 'pull', 'grab'], [.28, 'grab', 'away'], [.45, 'away', 'grab'], [.62, 'grab', 'grab'],
  [.68, 'grab', 'hoseRest'], [.76, 'hoseRest', 'neck'], [.88, 'neck', 'pump'], [1, 'pump', 'pump'],
];
const handP = new THREE.Vector3(), hoseP = new THREE.Vector3();
const ease = x => x * x * (3 - 2 * x);
function poseSoaker(g, t, level = game.tank) {
  const d = g.userData;
  let carrying = false, hose = 'attached';
  if (t < 0) handP.copy(K.pump);
  else {
    let i = 0; while (i < SWAP_KEYS.length - 2 && t >= SWAP_KEYS[i + 1][0]) i++;
    const [t0, a, b] = SWAP_KEYS[i], t1 = SWAP_KEYS[i + 1][0];
    handP.lerpVectors(K[a], K[b], ease(clamp((t - t0) / (t1 - t0), 0, 1)));
    carrying = t >= .28 && t < .62;
    hose = t < .12 || t >= .88 ? 'attached' : t < .22 || t >= .76 ? 'hand' : 'loose';
  }
  if (carrying) d.bottle.position.copy(handP).add(K.carry); else d.bottle.position.copy(BOTTLE_AT);
  setBottleLevel(d.bottle, t >= VIVO.fill || t < 0 ? level : game.swapOld ?? level);
  if (hose === 'attached') poseHose(g, hoseP.copy(BOTTLE_AT).add(NECK), true);
  else poseHose(g, hose === 'hand' ? hoseP.copy(handP).add(tmpHose.set(.01, -.01, -.02)) : K.hoseRest, false);
  // the gun rolls toward the player so the bottle is in view
  if (g.parent === gunRig) {
    const env = t < 0 ? 0 : Math.min(1, t / .1, (1 - t) / .1);
    g.rotation.set(.1 * ease(env), d.yaw, .38 * ease(env) * Math.sign(d.yaw || 1));
  }
  if (d.arms.pump) poseArm(d.arms.pump, handP);
  if (d.arms.grip) poseArm(d.arms.grip, K.grip);
}
function buildBalloonHand() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 18, 14), new THREE.MeshStandardMaterial({ color: 0xff3d7f, roughness: .25, transparent: true, opacity: .9 }));
  b.scale.y = 1.15; g.add(b);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(.018, .035, 8), b.material); knot.position.y = -.115; knot.rotation.x = Math.PI; g.add(knot);
  // the gloved hand holds it in the palm from below, fingers up its side
  const arm = buildArm(g, 1, new THREE.Vector3(.35, -.7, .5), .084, 1.15);
  poseArm(arm, new THREE.Vector3(.01, -.02, .01), new THREE.Vector3(-.5, .6, -.4), new THREE.Vector3(.4, -.8, .4));
  g.userData = { balloon: b, arm };
  return g;
}
const gunRig = new THREE.Group(); gunRig.scale.setScalar(.62); camera.add(gunRig);
const soakerR = buildSoaker({ grip: 1, pump: true }), soakerL = buildSoaker({ grip: -1 }), balloonHand = buildBalloonHand();
soakerL.position.x = -.78; soakerL.visible = soakerR.visible = false;
soakerR.userData.sprite = 1; soakerL.userData.sprite = 2;   // 2: the mirrored left-hand plate
gunRig.add(soakerR, soakerL, balloonHand);
// Agave Coa (Codex's coa-v1 prop): both gloved hands on the shaft, round blade out front, chops straight down the crosshair
const coaHold = new THREE.Group(); // Existing axe animation holder; rejected Coa v1 excluded.
coaHold.position.set(.16, -.1, -.12); gunRig.add(coaHold);
const coaArms = [buildArm(gunRig, 1, new THREE.Vector3(.35, -.7, .5), .025), buildArm(gunRig, -1, new THREE.Vector3(-.4, -.7, .4), .022)];
const coaGrip = [new THREE.Vector3(), new THREE.Vector3()], coaAxis = new THREE.Vector3();
// the jimador axe (assets/weapons/plus-v1/axe.js) swings on the same hold and hands as the Coa
const axeTool = createAxe(THREE); axeTool.rotation.set(.32, .38, 0); axeTool.scale.setScalar(1.2); axeTool.visible = false; coaHold.add(axeTool);
const meleeTool = () => axeTool, MELEE = () => game.weapon === 2 ? COA : AXE;
const coaVis = on => { coaHold.visible = false; axeTool.visible = false; for (const a of coaArms) { a.hand.visible = a.frame.visible = false; } };
coaVis(false);
function poseCoa() {
  coaHold.updateMatrixWorld(true);
  [meleeTool().userData.gripPrimary, meleeTool().userData.gripSupport].forEach((g, k) => gunRig.worldToLocal(g.getWorldPosition(coaGrip[k])));
  coaAxis.subVectors(coaGrip[1], coaGrip[0]);   // along the shaft, toward the blade
  coaArms.forEach((a, k) => poseArm(a, coaGrip[k], coaAxis, UP));   // overhand: backs of both gloves up
}
// Vivo Gatling (assets/weapons/plus-v1/vivo-gatling.js): six Vivo bottles on a hand-cranked rotor, rear hand on the
// trigger grip, front hand over the carry handle
const gatHold = new THREE.Group(), gatling = createVivoGatling(THREE, { cream: toyCream, teal: toyTeal, lav: toyLav, metal: toyMetal, glass: glassMat, blanco: blancoMat, label: labelMat });
const GAT_REST = new THREE.Vector3(.1, -.065, -.03);
gatHold.position.copy(GAT_REST); gatling.rotation.set(0, .42, -.18); gatHold.add(gatling); gunRig.add(gatHold);
const gatArms = [buildArm(gunRig, 1, new THREE.Vector3(.45, -.75, .55), .026), buildArm(gunRig, -1, new THREE.Vector3(-.35, -.8, .35), .02)];
const gatGrip = new THREE.Vector3(), gatAxis = new THREE.Vector3(), gatQ = new THREE.Quaternion();
const gatVis = on => { gatHold.visible = false; for (const a of gatArms) a.hand.visible = a.frame.visible = false; };
gatling.userData.sprite = 4;
gatVis(false);
function poseGatling() {
  const d = gatling.userData;
  gatHold.updateMatrix(); gatling.updateMatrix();
  gatQ.copy(gatHold.quaternion).multiply(gatling.quaternion);
  const toRig = v => v.applyMatrix4(gatling.matrix).applyMatrix4(gatHold.matrix);
  poseArm(gatArms[0], toRig(gatGrip.copy(d.gripPrimary)), gatAxis.set(0, .96, -.28).applyQuaternion(gatQ));
  poseArm(gatArms[1], toRig(gatGrip.copy(d.gripSupport)), gatAxis.set(0, .99, .12).applyQuaternion(gatQ));
}
// Starting kit (Alex 26 Oct): a cognac glass in the right hand, a Vivo bottle in the left. Pour a shot, toss it.
const kitGlass = createCognacGlass(THREE, { glass: glassMat, liquid: blancoMat }), glassHold = new THREE.Group();
const GLASS_REST = new THREE.Vector3(.02, -.05, .02);
kitGlass.scale.setScalar(2); glassHold.add(kitGlass); glassHold.position.copy(GLASS_REST); gunRig.add(glassHold);
const kitBottle = makeVivoBottle(), bottleHold = new THREE.Group();
kitBottle.rotation.x = Math.PI / 2; kitBottle.scale.setScalar(1.15); bottleHold.add(kitBottle); gunRig.add(bottleHold);   // neck up
const BOTTLE_REST = new THREE.Vector3(-.5, -.07, .06), BOTTLE_NECK = new THREE.Vector3(0, .22, 0);
const kitArms = [buildArm(gunRig, 1, new THREE.Vector3(.42, -.75, .5), .085, 1.1), buildArm(gunRig, -1, new THREE.Vector3(-.5, -.75, .45), .058)];
const pourStream = new THREE.Mesh(new THREE.CylinderGeometry(.004, .006, 1, 8).translate(0, -.5, 0), blancoMat); pourStream.visible = false; gunRig.add(pourStream);
const tossBlob = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), blancoMat.clone()); tossBlob.visible = false; gunRig.add(tossBlob);
const kitVis = on => { glassHold.visible = bottleHold.visible = false; for (const a of kitArms) a.hand.visible = a.frame.visible = false; pourStream.visible = tossBlob.visible = false; };
kitVis(false);
const kitP = new THREE.Vector3(), kitQ = new THREE.Quaternion(), kitA = new THREE.Vector3(), rimP = new THREE.Vector3();
// pour: 0..1 through a pour (bottle over the glass, stream on in the middle); toss: 0..1 through a toss; dip: bottle swap
function poseKit(pour, toss, dip) {
  const lift = pour < 0 ? 0 : pour < .28 ? ease(pour / .28) : pour < .78 ? 1 : 1 - ease((pour - .78) / .22);
  const flick = toss < 0 ? 0 : toss < .35 ? ease(toss / .35) : 1 - ease((toss - .35) / .65);
  glassHold.position.copy(GLASS_REST); glassHold.position.y -= dip * .3;
  glassHold.position.z -= flick * .12; glassHold.position.y += flick * .05; glassHold.rotation.set(-flick * 1.05, 0, -lift * .12);
  rimP.copy(kitGlass.userData.rim).multiplyScalar(kitGlass.scale.x).applyEuler(glassHold.rotation).add(glassHold.position);
  // the bottle tips over the rim, neck down to the right
  const tilt = -2.1 * lift;
  bottleHold.rotation.set(0, 0, tilt);
  kitA.copy(BOTTLE_NECK).applyEuler(bottleHold.rotation);
  kitP.copy(rimP).add(tmpKit.set(-.004, .045, 0)).sub(kitA);
  bottleHold.position.lerpVectors(BOTTLE_REST, kitP, lift); bottleHold.position.y -= dip * .45;
  setBottleLevel(kitBottle, game.tank);
  pourStream.visible = pour >= .3 && pour < .76 && glassHold.visible;
  if (pourStream.visible) { const top = kitA.add(bottleHold.position); pourStream.position.copy(top); pourStream.scale.y = Math.max(.01, top.y - rimP.y + .02); }
  // right glove cups the bowl, left glove round the bottle
  poseArm(kitArms[0], kitP.copy(glassHold.position).add(tmpKit.set(0, .06, 0)), kitA.set(0, 1, 0).applyEuler(glassHold.rotation));
  kitQ.setFromEuler(bottleHold.rotation);
  poseArm(kitArms[1], kitP.copy(bottleHold.position).add(tmpKit.set(0, -.02, 0).applyQuaternion(kitQ)), kitA.set(0, 1, 0).applyQuaternion(kitQ));
}
const tmpKit = new THREE.Vector3();
// First-person view: Alex's painted plates, shown exactly as drawn. The firing pose is his forward aiming plate
// for the chosen skin (1536 x 1024, registered so a full-pressure stream lands on its centre, 768 x 512);
// aim (Aim button, right click or F) raises the Vivo blaster to the eye with his painted aim pose.
// Until there is a painted two-blaster pose, the Double Soaker level shows the same plate.
// Each pose sits so the painted barrel points straight at the centred crosshair (axis: the barrel's on-screen
// direction), so the stream leaves the nozzle in line with the barrel.
const SKINS = {
  // Muzzle centres are measured from Alex's transparent forward plates. The axis follows each painted barrel.
  vivo: { name: 'Vivo', plate: 'assets/vm-fwd-vivo.webp', fx: 'vivo', muzzle: [973, 529], axis: [-267, -421], aim: true,
    reload: { swap: 'assets/vm-reload.webp', pump: 'assets/vm-pump.webp' } },
  muerto: { name: 'Muerto', plate: 'assets/vm-fwd-muerto.webp', fx: 'muerto', muzzle: [972, 530], axis: [-267, -421], aim: false,
    reload: { swap: 'assets/vm-reload-muerto.webp', pump: 'assets/vm-pump-muerto.webp' } },
};
let skin = SKINS[store.get('skin')] ? store.get('skin') : 'vivo';
const VM = {
  hip: { img: SKINS[skin].plate, muzzle: SKINS[skin].muzzle, axis: [0, -1] },
  aim: { img: 'assets/vm-aim.webp', muzzle: [768, 165], axis: [0, -1], nozzleAt: .6 },
  w: 1536, h: 1024,
  // Alex's liquid frames for the forward plates (6 x 4 per sheet, 24 fps): the part of his 3840 x 2160 frames
  // around the stream, as a box on the plate
  fx: { cols: 6, rows: 4, frames: 24, box: [828, 372, 185, 237] },
  // Alex's 24-frame bottle swap, then his 24-frame pump to pressurise, for the skin (SKINS[].reload), each cut out
  // of its frame (4 x 6 per sheet, sleeves carried on past the frame sides; the pump frames are lined up with the swap's last frame)
  // Times are fractions of VIVO.swap: lower the blaster, swap,
  // pump, raise it again; kicks are the bottle seating and the two pump strokes.
  reload: { cols: 4, rows: 6, frames: 24, w: 1098, h: 600, height: .72,
    down: .07, swapAt: .06, pumpAt: .69, pumpEnd: .95, up: .95, kicks: [[.455, 1], [.776, -.7], [.83, .8]] },
};
const vmEl = document.createElement('div'); vmEl.className = 'vm'; vmEl.setAttribute('aria-hidden', 'true');
const dualVM = createDualViewmodel(vmEl);
const newCoaVM = createCoaViewmodel($('#hud'));
const authoredVM = createAuthoredWeaponViews($('#hud'));
const gatlingVM = createGatlingSourceViews(THREE, $('#hud'));
const rpgVM=createMuertoRPGSourceViews(THREE,$('#hud'));
const rpgRuntime=createMuertoRPGRuntime(THREE,{scene,views:rpgVM,firstHit:firstCombatHit,lineClear:combatLineClear,
  targets:()=>zombies.map(z=>({id:z,position:z.root.position,radius:z.r*1.15,minY:z.root.position.y,maxY:z.root.position.y+2.1*z.body.scale.x,active:activeCombatTarget(z)})),
  damage:(target,damage,point)=>damageZombie(target.id,damage,false,new THREE.Vector3(point.x,point.y,point.z)),
  onBlast:origin=>{sfx('splash',clamp(1.6-Math.hypot(origin.x-player.pos.x,origin.y-player.pos.y,origin.z-player.pos.z)/35,.2,1));game.shake=Math.max(game.shake,.35);hud(true);},
});
function updateRPGView(){rpgVM.update({visible:game.state==='play'&&game.weapon===7&&buggy?.state!=='driving'&&!tacoTruck?.isEating,skin,aim:input.aim,loaded:game.rpg.loaded,
  firing:game.rpg.cooldown>RPG.cooldown-.12,reload:game.rpg.reload>0?1-game.rpg.reload/RPG.reload:-1,bob:player.bob,moving:Math.min(1,Math.hypot(player.vel.x,player.vel.z)/5)});}
function launchRPG(){
  updateRPGView();const [px,py]=rpgVM.muzzle();
  vmNdc.set(px/innerWidth*2-1,-(py/innerHeight*2-1),.5).unproject(camera).sub(camera.position).normalize();
  const origin=camera.position.clone().addScaledVector(vmNdc,.6);findAimPoint();
  const direction=aimPoint.clone().sub(origin).normalize();rpgRuntime.launch(origin,direction,camera.position);sfx('throw');game.shake=Math.max(game.shake,.1);hud(true);
}
function requestRPGReload(){
  if(game.state!=='play'||buggy?.state==='driving'||tacoTruck?.isEating)return false;
  const result=stepRPGState(game.rpg,0,{reload:true});const changed=result.state.reload>game.rpg.reload;game.rpg=result.state;if(changed){sfx('reload');hud(true);}return changed;
}
const newToolHint = document.createElement('div'); newToolHint.id = 'new-tool-nearby';
newToolHint.style.cssText = 'position:absolute;left:50%;top:63%;transform:translateX(-50%);font:700 12px Arial;color:#eff5df;text-shadow:0 2px 4px #000;pointer-events:none';
$('#hud').append(newToolHint);
function updateAuthoredWeapons() {
  const visible = game.state === 'play' && buggy?.state !== 'driving' && !tacoTruck?.isEating;
  updateGatlingView();updateRPGView();
  newCoaVM.update({ visible: visible && game.weapon === 2, skin, swingPhase: game.coaT > 0 ? 1 - game.coaT / COA.swing : 0 });
  authoredVM.update({ visible: visible && [1,5,6].includes(game.weapon), weapon: game.weapon, skin,
    balloons: game.balloons, throwRemaining: game.fireT,
    glassLevel: game.glassLevel, pourPhase: game.pourT > 0 ? 1 - game.pourT / GLASS.pour : -1,
    tossPhase: game.tossT > 0 ? 1 - game.tossT / GLASS.toss : -1,
    swingPhase: game.coaT > 0 ? 1 - game.coaT / AXE.swing : 0 });
  const nearby = visible ? pickups.filter(k=>k.kind==='weapon' && (k.id===2 || k.id===6))
    .map(k=>({k,d:Math.hypot(k.m.position.x-player.pos.x,k.m.position.z-player.pos.z)})).filter(p=>p.d<5).sort((a,b)=>a.d-b.d)[0] : null;
  newToolHint.textContent = nearby ? WEAPONS[nearby.k.id].name + ' · walk closer to collect' : '';
}
function updateGatlingView() {
  gatlingVM.update({visible:game.state==='play' && game.weapon===4 && buggy?.state!=='driving' && !tacoTruck?.isEating,
    skin,firing:input.fire && game.tank>0 && game.swapT<=0,
    reload:game.swapT>0?1-game.swapT/VIVO.swap:-1,bob:player.bob,moving:Math.min(1,Math.hypot(player.vel.x,player.vel.z)/5)});
}
const driverVM = createDriverViewmodel({ parent: $('#hud') });
const vmImgs = {};
for (const k of ['hip', 'aim']) {
  const box = document.createElement('div'), im = new Image(); box.className = 'vm-img';
  im.src = VM[k].img; im.alt = ''; im.draggable = false; box.append(im); vmEl.append(box); vmImgs[k] = box;
}
// Double Soaker: the other skin's forward plate, mirrored, in the left hand (Vivo right + Muerto left, or the reverse)
{ const box = document.createElement('div'), im = new Image(); box.className = 'vm-img vm-left'; box.hidden = true;
  im.alt = ''; im.draggable = false; box.append(im); vmEl.append(box); vmImgs.left = box; }
const otherSkin = () => skin === 'vivo' ? 'muerto' : 'vivo';
const DUAL_DX = .11;   // Double Soaker: each plate slides this share of the screen width outward (the CSS mask drops each plate's support arm)
// the liquid rides on the firing plate, so it moves with it
const vmFx = document.createElement('div'); vmFx.className = 'vm-fx'; vmImgs.hip.append(vmFx);
{ const [x, y, w, h] = VM.fx.box; Object.assign(vmFx.style, { left: x / VM.w * 100 + '%', top: y / VM.h * 100 + '%', width: w / VM.w * 100 + '%', height: h / VM.h * 100 + '%', backgroundSize: `${VM.fx.cols * 100}% ${VM.fx.rows * 100}%` }); }
function applySkin(id) {
  skin = SKINS[id] ? id : 'vivo'; store.set('skin', skin);
  authoredVM.setSkin(skin); newCoaVM.setSkin(skin);
  applyArmCostume(skin);
  const S = SKINS[skin], m = S.muzzle;
  Object.assign(VM.hip, { img: S.plate, muzzle: m, axis: S.axis });
  vmImgs.hip.firstChild.src = S.plate; vmImgs.left.firstChild.src = SKINS[otherSkin()].plate;
  for (const mode of ['empty']) new Image().src = `assets/fx-${S.fx}-${mode}.webp`;
  if (S.reload) for (const src of [S.reload.swap, S.reload.pump]) new Image().src = src;   // load them before the first swap
  WEAPONS[0].name = S.name + ' Soaker';
  for (const el of [$('#aim-btn'), $('#t-aim')]) el.hidden = !(game.weapon===7 || (AIM_ENABLED && S.aim));
  if (game.weapon!==7 && !S.aim) setAim(false);
  layoutVM();
}
// two layers so each painted frame dissolves into the next instead of stepping
const vmReload = document.createElement('div'); vmReload.className = 'vm-reload'; vmEl.append(vmReload);
const vmLayers = [0, 1].map(() => { const d = document.createElement('div'); vmReload.append(d); return d; });
$('#hud').prepend(vmEl);
const vm = { pose: 'hip', blend: 0, x: 0, y: 0, rects: {}, lastSwap: -1, fxT: 0, dryT: 0, fxSheet: '' };
function vmRect(k) {
  const W = innerWidth, H = innerHeight, m = VM[k].muzzle;
  let sc, top;
  if (k === 'hip') {
    // The measured barrel axis, actual jet and reticle use one screen registration.
    sc = H / VM.h; top = 0;
    if (W < H) {
      // portrait: keep the blaster itself (about x 570-1510 on the plate) in view; the 3D jet carries the stream here
      sc = Math.min(sc, 1.1 * W / 940); top = H - VM.h * sc;
      return { sc, w: VM.w * sc, h: VM.h * sc, left: W * .62 - 1040 * sc, top };
    }
    // Keep the sleeves grounded at the bottom and leave a visible sight-aligned jet.
    sc = H * .4 / (VM.h - m[1]); top = H - VM.h * sc;
  } else {
    // aim: the sleeves leave through the sides, so keep it full width and lower it until the nozzle lands at nozzleAt
    sc = Math.max(W / VM.w, H / VM.h);
    top = VM.aim.nozzleAt * H - m[1] * sc;
  }
  // slide sideways until the barrel line runs through the centre of the screen
  const a = VM[k].axis, nx = W / 2 + (top + m[1] * sc - H / 2) * a[0] / a[1];
  return { sc, w: VM.w * sc, h: VM.h * sc, left: nx - m[0] * sc, top };
}
function layoutVM() {
  for (const k of ['hip', 'aim']) {
    const r = vm.rects[k] = vmRect(k);
    Object.assign(vmImgs[k].style, { width: r.w + 'px', height: r.h + 'px', left: r.left + 'px', top: r.top + 'px' });
    vmImgs[k].style.transformOrigin = k === 'hip' && innerWidth < innerHeight ? `${VM[k].muzzle[0] * r.sc}px ${VM[k].muzzle[1] * r.sc}px` : '';
  }
  // the left plate is the hip plate mirrored across the screen centre
  const hr = vm.rects.hip;
  Object.assign(vmImgs.left.style, { width: hr.w + 'px', height: hr.h + 'px', left: (innerWidth - hr.left - hr.w) + 'px', top: hr.top + 'px',
    transformOrigin: innerWidth < innerHeight ? `${hr.w - VM.hip.muzzle[0] * hr.sc}px ${VM.hip.muzzle[1] * hr.sc}px` : '30% 100%' });
  const R = VM.reload, H = innerHeight, h = Math.min(H * R.height, innerWidth * R.h / R.w * 1.15), w = h * R.w / R.h;
  Object.assign(vmReload.style, { width: w + 'px', height: h + 'px', left: (innerWidth / 2 + H * .05 - w / 2) + 'px', top: (H - h) + 'px' });
  for (const d of vmLayers) d.style.backgroundSize = `${R.cols * 100}% ${R.rows * 100}%`;
}
addEventListener('resize', layoutVM);
$('#aim-btn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); setAim(!input.aim); });
// world-space point just in front of the painted nozzle, so the stream leaves the muzzle on screen
const vmNdc = new THREE.Vector3();
function vmMuzzle(out, which = 1) {
  if (game.weapon === 4) {
    const [px,py]=gatlingVM.muzzle();
    vmNdc.set(px/innerWidth*2-1,-(py/innerHeight*2-1),.5).unproject(camera).sub(camera.position).normalize();
    return out.copy(camera.position).addScaledVector(vmNdc,.6);
  }
  if (game.weapon === 3) {
    const [px, py] = dualVM.muzzle(which);
    vmNdc.set(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1), .5).unproject(camera).sub(camera.position).normalize();
    return out.copy(camera.position).addScaledVector(vmNdc, .6);
  }
  const k = vm.blend > .5 ? 'aim' : 'hip', r = vm.rects[k], m = VM[k].muzzle;
  const slide = (k === 'aim' ? 1 - vm.blend : vm.blend) * innerHeight * .15;   // matches the pose cross-fade in updateVM
  let px = r.left + m[0] * r.sc + vm.x + (game.weapon === 3 ? innerWidth * DUAL_DX : 0); if (which === 2) px = innerWidth - px;
  const py = r.top + m[1] * r.sc + vm.y + slide;
  vmNdc.set(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1), .5).unproject(camera).sub(camera.position).normalize();
  return out.copy(camera.position).addScaledVector(vmNdc, .6);
}
function setAim(on) {
  input.aim = game.weapon===7 ? !!on && buggy?.state !== 'driving' && !tacoTruck?.isEating : AIM_ENABLED && on && SKINS[skin].aim && buggy?.state !== 'driving';
  for (const el of [$('#t-aim'), $('#aim-btn')]) el.classList.toggle('on', input.aim);
}
function updateVM(dt, spraying, swapPhase) {
  const show = game.state !== 'title' && (game.weapon === 0 || game.weapon === 3) && buggy?.state !== 'driving' && !tacoTruck?.isEating;
  vmEl.hidden = !show; vmImgs.left.hidden = true;
  dualVM.hide();
  if (!show) { vm.blend = 0; return; }
  if (game.weapon === 3) {
    vmImgs.hip.style.opacity = vmImgs.aim.style.opacity = vmReload.style.opacity = '0';
    vm.blend = 0;
    const moving = Math.min(1, Math.hypot(player.vel.x, player.vel.z) / 5);
    vm.x += (Math.cos(player.bob) * 6 * moving - vm.x) * Math.min(1, 14 * dt);
    vm.y += (Math.abs(Math.sin(player.bob)) * 5 * moving - vm.y) * Math.min(1, 14 * dt);
    dualVM.update({ firing: spraying || input.aim, reloading: swapPhase >= 0, phase: swapPhase, x: vm.x, y: vm.y, skin });
    return;
  }
  vm.pose = input.aim && SKINS[skin].aim ? 'aim' : 'hip';
  vm.blend += ((vm.pose === 'aim' ? 1 : 0) - vm.blend) * Math.min(1, 14 * dt);
  // sway with the walk cycle, shake with the spray
  const moving = Math.min(1, Math.hypot(player.vel.x, player.vel.z) / 5);
  const H = innerHeight;
  let x = Math.cos(player.bob) * 10 * moving, y = Math.abs(Math.sin(player.bob)) * 8 * moving;
  if (spraying) { x += rand(-1.5, 1.5); y += rand(-1, 2); }
  vm.x += (x - vm.x) * Math.min(1, 14 * dt); vm.y += (y - vm.y) * Math.min(1, 14 * dt);
  const t = `translate(${vm.x.toFixed(1)}px, ${vm.y.toFixed(1)}px)`;
  // bottle swap: the blaster tips down out of view, Alex's swap and pump frames play (each dissolving into the next,
  // with a kick as the bottle seats and on each pump stroke), then the blaster comes back up
  const R = VM.reload, inSwap = swapPhase >= 0, frames = !!SKINS[skin].reload;
  const ease = v => 1 - (1 - Math.min(1, Math.max(0, v))) ** 3;
  let down = 0, rin = 0, ky = 0, kr = 0;
  if (inSwap) {
    down = swapPhase < .5 ? ease(swapPhase / R.down) : 1 - ease((swapPhase - R.up) / (1 - R.up));
    rin = swapPhase < .5 ? ease((swapPhase - .02) / R.down) : 1 - ease((swapPhase - R.up + .02) / (1 - R.up));
    for (const [at, amp] of R.kicks) {
      const d = (swapPhase - at) * VIVO.swap;
      if (d > 0 && d < .5) { const w = Math.exp(-d * 12) * Math.sin(d * 34); ky += amp * w * H * .025; kr += amp * w * 1.6; }
      if (vm.lastSwap < at && swapPhase >= at) game.shake = Math.max(game.shake, .05 * Math.abs(amp));
    }
    // no painted reload for this skin yet: the plate dips, kicks as the bottle seats and the pump strokes, and comes back
    if (!frames) { down *= .35; rin = 0; }
  }
  if (inSwap && frames) {
    const pumping = swapPhase >= R.pumpAt, sheet = pumping ? SKINS[skin].reload.pump : SKINS[skin].reload.swap;
    const t = pumping ? (swapPhase - R.pumpAt) / (R.pumpEnd - R.pumpAt) : (swapPhase - R.swapAt) / (R.pumpAt - R.swapAt);
    const ff = Math.min(1, Math.max(0, t)) * (R.frames - 1), f0 = Math.floor(ff), f1 = Math.min(R.frames - 1, f0 + 1);
    const pos = f => `${(f % R.cols) / (R.cols - 1) * 100}% ${Math.floor(f / R.cols) / (R.rows - 1) * 100}%`;
    vmLayers.forEach((d, k) => {
      if (d.dataset.sheet !== sheet) { d.dataset.sheet = sheet; d.style.backgroundImage = `url(${sheet})`; }
      d.style.backgroundPosition = pos(k ? f1 : f0);
    });
    vmLayers[1].style.opacity = Math.min(1, Math.max(0, (ff - f0 - .6) / .4)).toFixed(3);   // hold each frame, dissolve at the end
    vmReload.style.transform = `translate(${vm.x.toFixed(1)}px, ${(vm.y + ky + (1 - rin) * H * .35).toFixed(1)}px) rotate(${(kr + (1 - rin) * 10).toFixed(2)}deg)`;
    vm.blend = 0;
  }
  vm.lastSwap = swapPhase;
  vmReload.style.opacity = Math.min(1, rin * 1.5).toFixed(3);
  // the firing pose tips down and right, pivoting at the grip, and comes back up the same way
  const kick = frames ? 0 : 1;
  const drop = `translateY(${(down * H * .55 + ky * kick).toFixed(1)}px) rotate(${(down * 16 + kr * kick).toFixed(2)}deg)`;
  // Alex's liquid frames: full pressure, low once the bottle runs down, then the dry sputter when it runs out
  // Real-time liquid shares the collision/reticle solution; retain the authored dry sputter.
  const mode = innerWidth >= innerHeight && vm.dryT > 0 ? 'empty' : '';
  vm.dryT = Math.max(0, vm.dryT - dt); vm.fxT += dt;
  if (mode) {
    const F = VM.fx, sheet = `assets/fx-${SKINS[skin].fx}-${mode}.webp`;
    const f = mode === 'empty' ? Math.min(F.frames - 1, Math.floor((1 - vm.dryT) * 24)) : Math.floor(vm.fxT * 24) % F.frames;
    if (vm.fxSheet !== sheet) { vm.fxSheet = sheet; vmFx.style.backgroundImage = `url(${sheet})`; }
    vmFx.style.backgroundPosition = `${(f % F.cols) / (F.cols - 1) * 100}% ${Math.floor(f / F.cols) / (F.rows - 1) * 100}%`;
  }
  vmFx.style.opacity = mode ? 1 : 0;
  vmImgs.hip.style.opacity = ((1 - vm.blend) * (1 - down * down)).toFixed(3); vmImgs.aim.style.opacity = (vm.blend * (1 - down)).toFixed(3);
  // Portrait framing kept the muzzle visible but left the painted barrel off the
  // reticle. A muzzle-pivot rotation preserves the artwork and emitter position.
  const hip = vm.rects.hip, hm = VM.hip.muzzle;
  const hipX = hip.left + hm[0] * hip.sc + vm.x;
  const hipY = hip.top + hm[1] * hip.sc + vm.y + vm.blend * H * .15;
  const turn = innerWidth < innerHeight ? Math.atan2(H / 2 - hipY, innerWidth / 2 - hipX) - Math.atan2(VM.hip.axis[1], VM.hip.axis[0]) : 0;
  // sg -1 is the mirrored left-hand plate: same moves, sideways ones and turns reversed
  const dropY = (down * H * .55 + ky * kick).toFixed(1), dropR = down * 16 + kr * kick;
  const dx = game.weapon === 3 ? innerWidth * DUAL_DX : 0;
  const hipT = sg => `translate(${(sg * (vm.x + dx)).toFixed(1)}px, ${vm.y.toFixed(1)}px) translateY(${(vm.blend * H * .15).toFixed(1)}px) translateY(${dropY}px) rotate(${(sg * dropR).toFixed(2)}deg) rotate(${sg * turn}rad)`;
  vmImgs.hip.style.transform = hipT(1);
  if (game.weapon === 3) { vmImgs.left.style.transform = hipT(-1); vmImgs.left.style.opacity = vmImgs.hip.style.opacity; }
  vmImgs.aim.style.transform = `${t} translateY(${((1 - vm.blend) * H * .15).toFixed(1)}px) ${drop}`;
}
// What the crosshair is on: the first zombie, wall or ground along the view, up to 30 m out.
const aimPoint = new THREE.Vector3(), aimDir = new THREE.Vector3();
function findAimPoint() {
  camera.getWorldDirection(aimDir);
  const o = camera.position;
  let d = .5;
  for (; d < 30; d += .25) {
    const x = o.x + aimDir.x * d, y = o.y + aimDir.y * d, z = o.z + aimDir.z * d;
    if (y <= 0 || zombieAt(x, y, z, 0) || inBlocker(x, y, z)) break;
  }
  return aimPoint.copy(o).addScaledVector(aimDir, d);
}
// hand-held torch: lights what the player looks at, plus a soft fill so the gun reads at night
const torch = new THREE.SpotLight(0xfff0d8, 12, 38, .42, .55, 1.4);
torch.position.set(0, .08, .05); camera.add(torch); camera.add(torch.target); torch.target.position.set(0, 0, -10);
const gunFill = new THREE.PointLight(0xfff0e0, .9, 1.6, 1); gunFill.position.set(0, .2, -.15); camera.add(gunFill);

// ---------------- zombies ----------------
const zombies = [];
const TYPES = {
  walker: { hp: 100, speed: [1.3, 1.9], dmg: 12, scale: 1, points: 100 },
  runner: { hp: 70, speed: [3.3, 3.9], dmg: 10, scale: .95, points: 150 },
  brute: SERGIO,
};
const bossHud = createBossHud($('#hud'));
function makeZombie(type) {
  const T = TYPES[type], root = new THREE.Group(), body = new THREE.Group();
  root.add(body); body.scale.setScalar(T.scale);
  const z = { type, name: type === 'brute' ? 'Sergio Cruz' : type, root, body, mats: [], hp: T.hp, maxHp: T.hp, speed: rand(...T.speed), dmg: T.dmg, points: T.points,
    r: .38 * T.scale, phase: Math.random() * 7, state: 'rise', t: 0, attackT: 0, groanT: rand(2, 8), flashT: 0, yaw: 0, gate: null, parts: [], headParts: [], headPosition: new THREE.Vector3() };
  const character = type === 'brute' ? 'sergio' : ORIGINAL_ZOMBIE_ROSTER[zombieVariantIndex++ % ORIGINAL_ZOMBIE_ROSTER.length];
  z.name = character === 'sergio' ? 'Sergio Cruz' : character[0].toUpperCase() + character.slice(1);
  z.isSergioBoss = type === 'brute'; z.character = character;
  for (const key of ['legL', 'legR', 'torso', 'head', 'armL', 'armR']) z[key] = new THREE.Group();
  scene.add(root);
  z.visual = characterLabel(z.name,T.scale); root.add(z.visual.marker);
  attachZombieRig(z, character);
  return z;
}
function spawnZombie(type) {
  const z = makeZombie(type);
  const fromGrave = type !== 'brute' && Math.random() < .35;
  const graves = fromGrave ? tombs.filter(t => t.distanceTo(player.pos) > 9) : [];
  if (graves.length) {
    const g = graves[(Math.random() * graves.length) | 0];
    z.root.position.set(g.x, -2, g.z); z.state = 'rise'; z.t = 0;
    burst(new THREE.Vector3(g.x, .1, g.z), 30, ['#3a1a10', '#6b3420'], 1.5, 2);
  } else {
    const lanes = fullSiteWorld() ? YARD_GATES : GATES, gate = lanes[(Math.random() * lanes.length) | 0];
    const side = new THREE.Vector3(gate.dir.z, 0, gate.dir.x).multiplyScalar(rand(-GATE + .6, GATE - .6));
    z.root.position.copy(gate.out).add(side).addScaledVector(gate.dir, rand(0, fullSiteWorld() ? 2 : 6));
    z.gate = gate; z.state = 'enter';
  }
  z.yaw = Math.atan2(player.pos.x - z.root.position.x, player.pos.z - z.root.position.z);
  zombies.push(z);
}
function reenterNearPlayer(z) {
  // pop back up from a grave (or a yard lane) 9-22 m from the player, so nobody hides behind a wall all wave
  const spots = [...tombs.map(t => ({ p: t, grave: true })), ...(fullSiteWorld() ? YARD_GATES : GATES).map(g => ({ p: g.inn }))]
    .map(o => ({ ...o, d: Math.hypot(o.p.x - player.pos.x, o.p.z - player.pos.z) }))
    .filter(o => { const c = navCell(o.p.x, o.p.z); return o.d > 6 && (c < 0 || !NAV.dist || isFinite(NAV.dist[c])); });
  // 9-22 m when there is one; from a far corner of the yard, the nearest reachable spot instead (never leave one stuck)
  const mid = spots.filter(o => o.d > 9 && o.d < 22);
  const o = mid.length ? mid[(Math.random() * mid.length) | 0] : spots.sort((a, b) => a.d - b.d)[0] || null;
  z.stuckN = 0; z.detourT = 0; z.lastTo = undefined;
  if (!o && NAV.dist) {
    // the player is in a pocket no lane or grave reaches: rise from open ground 8-20 m away by path inside that pocket
    const ok = []; for (let k = 0; k < NAV.dist.length; k++) { const d = NAV.dist[k]; if (d >= 16 && d <= 40) ok.push(k); }
    if (!ok.length) for (let k = 0; k < NAV.dist.length; k++) if (NAV.dist[k] >= 6 && isFinite(NAV.dist[k])) ok.push(k);
    if (ok.length) {
      const k = ok[(Math.random() * ok.length) | 0], x = OVEN_YARD.minX + (k % NAV.w + .5) * NAV.cell, zz = OVEN_YARD.minZ + (((k / NAV.w) | 0) + .5) * NAV.cell;
      z.root.position.set(x, -2, zz); z.state = 'rise'; z.t = 0; burst(new THREE.Vector3(x, .1, zz), 30, ['#3a1a10', '#6b3420'], 1.5, 2);
    }
    return;
  }
  if (!o) return;
  z.root.position.set(o.p.x, o.grave ? -2 : 0, o.p.z);
  if (o.grave) { z.state = 'rise'; z.t = 0; burst(new THREE.Vector3(o.p.x, .1, o.p.z), 30, ['#3a1a10', '#6b3420'], 1.5, 2); }
}
function removeZombie(z) {
  scene.remove(z.root);
  z.visual?.dispose();
  z.animMixer?.stopAllAction();
  if (z.modelRoot) {z.animMixer?.uncacheRoot(z.modelRoot);disposeDeathAccessories(z.modelRoot);}
  for (const skeleton of new Set(z.parts.filter(part => part.isSkinnedMesh).map(part => part.skeleton))) skeleton.dispose();
  z.mats.forEach(m => m.dispose());
  zombies.splice(zombies.indexOf(z), 1);
}

// ---------------- pickups ----------------
const pickups = [];
const skullMat = new THREE.MeshStandardMaterial({ color: 0xf6f0e0, emissive: 0xff3d7f, emissiveIntensity: .35, roughness: .5 });
const balloonPickMat = new THREE.MeshStandardMaterial({ color: 0x3cc6ff, emissive: 0x1a5a8a, roughness: .3 });
function vivoPickup() {
  const g = new THREE.Group(), b = makeVivoBottle(); b.scale.setScalar(2.2); b.rotation.x = -Math.PI / 2; setBottleLevel(b, 1); g.add(b);
  return g;
}
// The rare zombie bottle: a Siempre bottle of glowing green wearing the "SIEMPRE ZOMBIE!" sticker Keith and friends made
// for the Vivo + Muerto bundle. One at a time, every 35-60 s from wave 1, somewhere the player has already walked
// (so it is always reachable) 8-20 m away, with a green beam to find it by. Picking it up: 10 s of zombie mode.
const ZBOTTLE = { first: 25, min: 35, max: 60, life: 25, invuln: 10 };
const zLabelTex = new THREE.TextureLoader().load('assets/weapons/plus-v1/zombie-label.webp'); zLabelTex.colorSpace = THREE.SRGBColorSpace;
const zHaloTex = canvasTex(128, 128, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, '#9dffa8'); r.addColorStop(.3, '#2bd83a88'); r.addColorStop(1, '#00000000'); g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const zBeamTex = canvasTex(4, 128, (g, w, h) => {
  const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#000'); r.addColorStop(1, '#3dff4a'); g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const trail = [];   // where the player has been, sampled every 1.5 s
function zombiePickup() {
  const g = new THREE.Group(), b = createZombieBottle(THREE, zLabelTex); b.scale.setScalar(1.25); b.position.y = -.32; g.add(b);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: zHaloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(1.7); g.add(halo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.16, .32, 10, 16, 1, true).translate(0, 4.7, 0),
    new THREE.MeshBasicMaterial({ map: zBeamTex, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(beam);
  g.userData.halo = halo;
  return g;
}
function zombieMode(on) {
  app.classList.toggle('zombie-mode', on); app.classList.remove('zombie-ending');
  for (const m of [gloveMats.glove, toyCream, toyTeal, toyLav]) { m.emissive.setHex(on ? 0x2bff40 : 0); m.emissiveIntensity = on ? .35 : 1; }
  torch.color.setHex(on ? 0xb4ffbc : 0xfff0d8);
}
// Weapons hidden in the yard (Alex 26 Oct): the Coa somewhere in the agave patch, the axe stuck in a harvested piña by
// the ovens, the soakers, the Gatling and the balloons tucked into corners. Unfound ones move to new spots every wave.
const WEAPON_SPOTS = {
  field: [],
  ovens: [[1.5, -16], [2.5, -21], [3, -12], [-1, -10.5], [4.5, -17], [1, -24]],
  hide: [[-24, -30], [-24, 25], [-12, 26], [12, 40], [30, 22], [44, 30], [44, -2], [36, 6], [16, -30], [-20, 8], [8, -4], [40, 42], [-6, -30], [26, -4]],
};
for (let x = 19; x <= 47; x += 3) for (let z = 29; z <= 44; z += 3) WEAPON_SPOTS.field.push([x, z]);
const spotOK = ([x, z]) => (fullSiteWorld() ? inYard(x, z, 1.5) : Math.max(Math.abs(x), Math.abs(z)) < HALF - 2)
  && ![[0, 0], [.9, 0], [-.9, 0], [0, .9], [0, -.9]].some(([dx, dz]) => inBlocker(x + dx, 1, z + dz));
const goldHaloTex = canvasTex(128, 128, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, '#ffe7a0'); r.addColorStop(.3, '#ffb52e77'); r.addColorStop(1, '#00000000'); g.fillStyle = r; g.fillRect(0, 0, w, h);
});
function weaponPickup(id) {
  const g = new THREE.Group();
  if (id === 0 || id === 3) for (const k of id === 3 ? [-1, 1] : [0]) { const s = buildSoaker(); s.scale.setScalar(1.7); s.position.set(k * .18, .32, 0); s.rotation.y = k * .35; g.add(s); }
  else if (id === 7) { const t=rpgVM.pickup();g.add(t);g.userData.dispose=()=>{t.userData.dispose?.();halo.material.dispose();}; }
  else if (id === 4) { const t = gatlingVM.pickup(); g.add(t); g.userData.dispose = () => { t.userData.dispose?.(); halo.material.dispose(); }; }
  else if (id === 1) {
    balloonCols.forEach((c, k) => { const b = newFieldProps.balloon({ground:true}); b.scale.setScalar(.8); b.position.set(Math.cos(k * 1.6) * .22, 0, Math.sin(k * 1.6) * .22); g.add(b); });
  } else if (id === 2) {
    const t = newFieldProps.coa(); t.rotation.z = -.23; g.add(t);
  } else if (id === 6) {
    g.add(createPina(THREE));
    const t = newFieldProps.axe(); t.rotation.set(.05, .5, -.2); t.position.set(0,.15,0); g.add(t);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldHaloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(1.3); halo.position.y = .5; g.add(halo); g.userData.halo = halo;
  if(id===1)g.userData.dispose=()=>{for(const child of g.children){if(child.userData.dispose)child.userData.dispose();else if(child.isMesh)child.geometry.dispose();}halo.material.dispose();};
  if(id===2 || id===6)g.userData.dispose=()=>g.traverse(o=>{if(o.isMesh)o.geometry.dispose();if(o.isSprite)o.material.dispose();});
  return g;
}
function placeWeapons() {
  for (const k of pickups.filter(k => k.kind === 'weapon')) { scene.remove(k.m); k.m.userData.dispose?.(); pickups.splice(pickups.indexOf(k), 1); }
  const used = [];
  for (const id of [2, 6, 0, 3, 4, 1, 7]) {
    if (game.owned.has(id) && (id!==7 || game.rpg.reserve>=RPG.maxReserve)) continue;
    const free = p => spotOK(p) && !used.some(u => Math.hypot(u[0] - p[0], u[1] - p[1]) < 4) && Math.hypot(p[0] - player.pos.x, p[1] - player.pos.z) > 3;
    let list = (id === 2 ? WEAPON_SPOTS.field : id === 6 ? WEAPON_SPOTS.ovens : WEAPON_SPOTS.hide).filter(free);
    for (let n = 0; !list.length && n < 60 && id !== 2 && id !== 6; n++) {   // Field tools stay at agave/oven locations.
      const p = fullSiteWorld() ? [rand(OVEN_YARD.minX, OVEN_YARD.maxX), rand(OVEN_YARD.minZ, OVEN_YARD.maxZ)] : [rand(-HALF, HALF), rand(-HALF, HALF)];
      if (free(p)) list = [p];
    }
    if (!list.length) continue;
    const p = list[(Math.random() * list.length) | 0]; used.push(p);
    const m = weaponPickup(id); m.position.set(p[0], (id===1 || id===2 || id===6 || id===7) ? (distilleryLevel?.groundHeight(p[0],p[1],2) || 0) : 0, p[1]); m.rotation.y = rand(0, Math.PI * 2); scene.add(m);
    pickups.push({ m, kind: 'weapon', id, t: Infinity, still: id === 1 || id === 2 || id === 6 || id === 7 });
  }
}
function dropPickup(p, kind) {
  const m = kind === 'health' ? new THREE.Mesh(new THREE.SphereGeometry(.25, 14, 10), skullMat)
    : kind === 'bottle' ? vivoPickup()
    : kind === 'zombie' ? zombiePickup()
    : newFieldProps.balloon({ground:true});
  m.position.set(p.x, kind==='balloons' ? (distilleryLevel?.groundHeight(p.x,p.z,2) || 0) : .55, p.z); scene.add(m);
  pickups.push({ m, kind, t: kind === 'zombie' ? ZBOTTLE.life : 25, still:kind==='balloons' });
}

// ---------------- player & input ----------------
const player = { pos: new THREE.Vector3(0, 0, 6), vel: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, hp: 100, r: .4, grounded: true, hurt: 0, bob: 0 };
let tacoTruck = null;
const keys = {};
// Desktop play requires captured mouse movement; free aiming is explicit or API-unavailable only.
const forcedFreeAim = PARAMS.has('nolock') || !canvas.requestPointerLock;
let freeAim = forcedFreeAim, reviewPointerSuspended = false, pointerLockStatusNode = null, pointerLockFailure = '';
let lastPointerType = 'mouse';
addEventListener('pointerdown', e => { lastPointerType = e.pointerType || 'mouse'; });
let pointerLockStatus = forcedFreeAim ? 'free aim forced' : 'not requested';
function setPointerLockStatus(status) {
  pointerLockStatus = status;
  if (pointerLockStatusNode) pointerLockStatusNode.textContent = `Pointer lock: ${status}`;
}
function suspendReviewPointer() {
  reviewPointerSuspended = true;
  clearHeldInput();
  setPointerLockStatus('review toolbar active');
  if (document.pointerLockElement === canvas) document.exitPointerLock?.();
}
function lockPointer() {
  if (lastPointerType === 'touch') { setPointerLockStatus('touch controls'); return; }
  if (reviewPointerSuspended || forcedFreeAim || !canvas.requestPointerLock) {
    setPointerLockStatus(reviewPointerSuspended ? 'skipped: review toolbar active' : forcedFreeAim ? 'free aim forced' : 'skipped: API unavailable');
    return;
  }
  freeAim = false;
  pointerLockFailure = '';
  setPointerLockStatus('requesting');
  try {
    const p = canvas.requestPointerLock();
    if (p?.then) p.then(() => { setPointerLockStatus(document.pointerLockElement === canvas ? 'locked' : 'request fulfilled; awaiting lockchange'); }, error => failPointerLock(`request rejected: ${error?.name || 'Error'}: ${error?.message || error}`));
  } catch (error) { failPointerLock(`request threw: ${error?.name || 'Error'}: ${error?.message || error}`); }
}
function failPointerLock(reason) {
  if (document.pointerLockElement === canvas || reviewPointerSuspended || lastPointerType === 'touch') return;
  pointerLockFailure = reason; freeAim = forcedFreeAim;
  setPointerLockStatus(reason);
  if (!forcedFreeAim && game.state === 'play') {
    pause();
    const help = $('#pointer-help'); if (help) help.hidden = false;
  }
}
document.addEventListener('pointerlockerror', () => failPointerLock(pointerLockFailure || 'pointerlockerror event (reason unavailable)'));
const input = { fire: false, firePressed: false, aim: false, moveX: 0, moveY: 0 };
let releaseTouchInput = () => {};
function clearHeldInput() {
  for (const code of Object.keys(keys)) keys[code] = false;
  input.fire = input.firePressed = false;
  input.moveX = input.moveY = 0;
  weaponWheelDelta = 0; weaponWheelAt = -Infinity;
  player.vel.set(0,0,0);
  setAim(false);
  releaseTouchInput();
}
document.addEventListener('zombie-intro-end', clearHeldInput);
addEventListener('blur', () => { clearHeldInput(); if (game.state === 'play' && app.dataset.introPlaying !== 'true') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearHeldInput(); if (game.state === 'play') pause(); } });
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (game.state !== 'play') return;
  keys[e.code] = true;
  const dg = /^Digit([1-8])$/.exec(e.code); if (dg) swap(SLOT_ORDER[dg[1] - 1]);
  if (e.code === 'KeyQ' && !e.repeat) swap(nextOwned());
  if (e.code === 'Space') e.preventDefault();
  if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) pause();
  if (e.code === 'KeyE' && !e.repeat) toggleDrive();
  if (e.code === 'KeyT' && !e.repeat) tacoTruck?.tryEat();
  if (e.code === 'KeyR') game.weapon===7?requestRPGReload():swapBottle();
  if (e.code === 'KeyF' && !e.repeat) setAim(!input.aim);
  if (e.code === 'KeyH' && !e.repeat) { const shown = !$('#keyhint').classList.toggle('off'); store.set('keyhint', shown ? 1 : 0); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousedown', e => {
  if (e.sourceCapabilities?.firesTouchEvents) return;
  if (game.state !== 'play') return;
  if (reviewPointerSuspended) { reviewPointerSuspended = false; freeAim = forcedFreeAim; setPointerLockStatus('canvas clicked'); }
  if (!forcedFreeAim && document.pointerLockElement !== canvas) { freeAim = false; lockPointer(); return; }
  if (buggy?.state === 'driving') return;
  if (e.button === 0) { input.fire = true; input.firePressed = true; }
  if (e.button === 2) setAim(!input.aim);
});
// Review buttons release pointer lock so they remain usable. Restore normal
// aiming on the next gameplay-surface click too, not only a click on the canvas.
document.addEventListener('mousedown', e => {
  if (!reviewPointerSuspended || game.state !== 'play' || e.target === canvas || e.target.closest('.asset-review-tools')) return;
  reviewPointerSuspended = false;
  freeAim = forcedFreeAim;
  lockPointer();
}, true);
addEventListener('mouseup', e => { if (e.button === 0) input.fire = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (game.state !== 'play' || reviewPointerSuspended || (document.pointerLockElement !== canvas && !freeAim)) return;
  // Unlocked embeds still support looking, without moving the camera over HUD buttons.
  if (document.pointerLockElement !== canvas && e.target !== canvas) return;
  const s = store.get('sens', 1) * .0022;
  player.yaw -= e.movementX * s; player.pitch = clamp(player.pitch - e.movementY * s, -1.45, 1.45);
});
let weaponWheelDelta = 0, weaponWheelAt = -Infinity;
addEventListener('wheel', e => {
  if (game.state !== 'play' || !e.deltaY) return;
  e.preventDefault();
  if (buggy?.state === 'driving') return;
  // High-resolution wheels emit several tiny events for one gesture.
  const now = performance.now(), delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
  if (now - weaponWheelAt > 180 || Math.sign(delta) !== Math.sign(weaponWheelDelta)) weaponWheelDelta = 0;
  weaponWheelAt = now;
  weaponWheelDelta += delta;
  if (Math.abs(weaponWheelDelta) < 40) return;
  weaponWheelDelta = 0;
  swap(nextOwned(delta > 0 ? 1 : -1));
}, { passive: false });
document.addEventListener('pointerlockchange', () => {
  setPointerLockStatus(document.pointerLockElement === canvas ? 'locked' : 'unlocked');
  if (document.pointerLockElement !== canvas && game.state === 'play' && !freeAim && !reviewPointerSuspended) pause();
});

// touch controls
if (TOUCH) {
  $('#touch').hidden = false;
  const stick = $('#stick'), knob = $('#stick-knob');
  let sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
  stick.addEventListener('pointerdown', e => { if (game.state !== 'play') return; sid = e.pointerId; const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; stick.setPointerCapture(sid); });
  stick.addEventListener('pointermove', e => {
    if (game.state !== 'play' || e.pointerId !== sid) return;
    let dx = e.clientX - sx, dy = e.clientY - sy; const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; input.moveX = dx / max; input.moveY = -dy / max;
  });
  const endStick = e => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; input.moveX = input.moveY = 0; };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick); stick.addEventListener('lostpointercapture', endStick);
  canvas.addEventListener('pointerdown', e => { if (game.state === 'play' && e.pointerType === 'touch' && lid === null) { lid = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(lid); } });
  canvas.addEventListener('pointermove', e => {
    if (game.state !== 'play' || e.pointerId !== lid) return;
    player.yaw -= (e.clientX - lx) * .005; player.pitch = clamp(player.pitch - (e.clientY - ly) * .005, -1.4, 1.4);
    lx = e.clientX; ly = e.clientY;
  });
  const endLook = e => { if (e.pointerId === lid) lid = null; };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook); canvas.addEventListener('lostpointercapture', endLook);
  const hold = (el, on, off) => { el.addEventListener('pointerdown', e => { if (game.state !== 'play') return; e.preventDefault(); on(); }); if (off) { el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); } };
  app.classList.add('touch-ui');
  // fire buttons also steer the view while held, like console shooters on phones
  let fireIds = new Set();
  for (const el of [$('#t-fire'), $('#t-fire-l')]) {
    let fx = 0, fy = 0;
    el.addEventListener('pointerdown', e => { if (game.state !== 'play' || buggy?.state === 'driving') return; e.preventDefault(); el.setPointerCapture(e.pointerId); fireIds.add(e.pointerId); fx = e.clientX; fy = e.clientY; input.fire = true; input.firePressed = true; el.classList.add('pressed'); });
    el.addEventListener('pointermove', e => {
      if (game.state !== 'play' || !fireIds.has(e.pointerId)) return;
      player.yaw -= (e.clientX - fx) * .005; player.pitch = clamp(player.pitch - (e.clientY - fy) * .005, -1.4, 1.4);
      fx = e.clientX; fy = e.clientY;
    });
    const up = e => { const held = fireIds.delete(e.pointerId); el.classList.remove('pressed'); if (!fireIds.size) { input.fire = false; if (held && e.type !== 'pointerup') input.firePressed = false; } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  }
  // never leave fire, look or the stick stuck when the page loses focus
  releaseTouchInput = () => { fireIds.clear(); input.fire = input.firePressed = false; sid = lid = null; knob.style.transform = ''; input.moveX = input.moveY = 0; document.querySelectorAll('#touch .pressed').forEach(el => el.classList.remove('pressed')); $('#t-sprint').classList.remove('on'); };
  app.addEventListener('contextmenu', e => e.preventDefault());
  // Android: go full screen and landscape from the Play tap (iPhone Safari ignores both)
  $('#start-form').addEventListener('submit', () => {
    try { const r = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); r?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {}); } catch {}
  });
  hold($('#t-swap'), () => swap(nextOwned()));
  hold($('#t-reload'), () => game.weapon===7?requestRPGReload():swapBottle());
  hold($('#t-sprint'), () => { keys.ShiftLeft = !keys.ShiftLeft; $('#t-sprint').classList.toggle('on', !!keys.ShiftLeft); });
  hold($('#t-pause'), () => pause());
  WEAPONS.forEach((w, i) => hold($('#t-slot-' + i), () => swap(i)));
  hold($('#t-jump'), () => { keys.Space = true; setTimeout(() => keys.Space = false, 120); });
  hold($('#t-drive'), () => toggleDrive());
  hold($('#t-aim'), () => setAim(!input.aim));
}

// ---------------- collision ----------------
function pushOut(p, r, list) {
  for (const b of list) {
    const cx = clamp(p.x, b.minX, b.maxX), cz = clamp(p.z, b.minZ, b.maxZ);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
    else {
      const l = p.x - b.minX, rr = b.maxX - p.x, t = p.z - b.minZ, bb = b.maxZ - p.z, m = Math.min(l, rr, t, bb);
      if (m === l) p.x = b.minX - r; else if (m === rr) p.x = b.maxX + r; else if (m === t) p.z = b.minZ - r; else p.z = b.maxZ + r;
    }
  }
}
// Current white/black TWO-seat GLB footprint, in vehicle-local metres (+Z front).
// Includes the outer tire lugs and front bumper, not just the chassis.
const RZR_HALF_WIDTH = RZR6_FOOTPRINT.halfWidth, RZR_HALF_LENGTH = RZR6_FOOTPRINT.halfLength;
function pushVehicleOutOfRects(p, heading, list) {
  const hx = RZR_HALF_WIDTH, hz = RZR_HALF_LENGTH, c = Math.cos(heading), s = Math.sin(heading);
  const axes = [[1,0], [0,1], [c,-s], [s,c]];
  let moved = false;
  for (let pass=0; pass<2; pass++) for (const b of list) {
    const cx=(b.minX+b.maxX)*.5, cz=(b.minZ+b.maxZ)*.5, bx=(b.maxX-b.minX)*.5, bz=(b.maxZ-b.minZ)*.5;
    const dx=p.x-cx, dz=p.z-cz; let best=Infinity, bestAxis=null, bestSign=1, separated=false;
    for(const [ax,az] of axes) {
      const rVehicle=hx*Math.abs(ax*c-az*s)+hz*Math.abs(ax*s+az*c);
      const rBlock=bx*Math.abs(ax)+bz*Math.abs(az), d=dx*ax+dz*az, overlap=rVehicle+rBlock-Math.abs(d);
      if(overlap<=0){separated=true;break;}
      if(overlap<best){best=overlap;bestAxis=[ax,az];bestSign=d<0?-1:1;}
    }
    if(separated||!bestAxis) continue;
    p.x+=bestAxis[0]*bestSign*(best+.008); p.z+=bestAxis[1]*bestSign*(best+.008); moved=true;
  }
  return moved;
}
function pointInRzr(p, radius=0) {
  const dx=p.x-buggy.x, dz=p.z-buggy.z, c=Math.cos(buggy.h), s=Math.sin(buggy.h);
  const x=dx*c-dz*s, z=dx*s+dz*c;
  return Math.abs(x)<=RZR_HALF_WIDTH+radius && Math.abs(z)<=RZR_HALF_LENGTH+radius;
}
function pushOutOfRzr(p, radius=0) {
  if(!buggy || !pointInRzr(p,radius)) return false;
  const dx=p.x-buggy.x, dz=p.z-buggy.z, c=Math.cos(buggy.h), s=Math.sin(buggy.h);
  const local={x:dx*c-dz*s,z:dx*s+dz*c};
  pushOut(local,radius,[{minX:-RZR_HALF_WIDTH,maxX:RZR_HALF_WIDTH,minZ:-RZR_HALF_LENGTH,maxZ:RZR_HALF_LENGTH}]);
  p.x=buggy.x+local.x*c+local.z*s; p.z=buggy.z-local.x*s+local.z*c;
  return true;
}

// ---------------- game state ----------------
const game = {
  state: 'title', score: 0, wave: 0, kills: 0, heads: 0, toSpawn: 0, alive: 0, spawnT: 0, breakT: 0,
  rpg:createRPGState(), weapon: 0, coaT: 0, tank: 1, spare: 0, swapT: 0, swapOld: null, restockT: 0, balloons: 0, spin: 0, invulnT: 0, zbT: 0, owned: new Set([START_WEAPON]), glassLevel: 1, pourT: 0, tossT: 0, refilling: false, sprayAcc: 0, shake: 0, fireT: 0, started: 0, runId: null, banner: 0,
};
function setScreen(s) {
  app.dataset.screen = s;
  if (s !== 'play') $('#interlude').classList.remove('on');
  $('#screen-title').hidden = s !== 'title';
  $('#screen-pause').hidden = s !== 'pause';
  $('#screen-over').hidden = s !== 'over';
}
function startGame(capturePointer = true) {
  initAudio();
  clearHeldInput();
  zombieVariantIndex=0;
  removeBuggy();
  tacoTruck?.reset();
  const kh = $('#keyhint'); kh.classList.toggle('off', store.get('keyhint', 1) === 0); kh.style.animation = 'none'; void kh.offsetWidth; kh.style.animation = '';
  zombies.slice().forEach(removeZombie);
  pickups.splice(0).forEach(p => {scene.remove(p.m);p.m.userData.dispose?.();});
  Object.assign(player, { hp: 100, vy: 0, yaw: 0, pitch: 0, grounded: true }); player.pos.set(0, 0, 6); player.vel.set(0, 0, 0);
  lastSafeFootPosition.set(0, 0, 6);
  Object.assign(game, { state: 'play', score: 0, wave: 0, kills: 0, heads: 0, toSpawn: 0, spawnT: 0, breakT: 2.5, breakLen: 2.5, fireT: 0, started: performance.now(), runId: null,
    tank: 1, spare: VIVO.spare, swapT: 0, swapOld: null, restockT: 0, balloons: 0, spin: 0, invulnT: 0, zbT: ZBOTTLE.first, refilling: false, sprayAcc: 0,
    rpg:createRPGState(), owned: new Set([START_WEAPON]), glassLevel: 1, pourT: 0, tossT: 0 });
  trail.length = 0; zombieMode(false); placeWeapons();
  clearProjectiles();
  setAim(false);
  swap(START_WEAPON, true);
  setScreen('play');
  if (capturePointer) { reviewPointerSuspended = false; freeAim = forcedFreeAim; $('#pointer-help').hidden = true; lockPointer(); }
  store.set('plays', store.get('plays', 0) + 1);
  const runStarted=game.started;
  game.runReady=RANKED?api('/runs',{name:prefs.name,rulesVersion:RULES}).then(d=>{if(game.started===runStarted)game.runId=d.runId;return d;},()=>null):Promise.resolve(null);
  hud(true);
}
function pause() {
  window.SZAudio?.setActive(false); audio.ctx?.suspend();
  if (game.state !== 'play') return;
  game.state = 'pause'; setScreen('pause'); clearHeldInput(); sprayAudio(0, 0); engineAudio(false, 0);
  if (document.pointerLockElement) document.exitPointerLock();
}
function resume(capturePointer = true) {
  initAudio();
  game.state = 'play'; setScreen('play');
  if (capturePointer) { reviewPointerSuspended = false; freeAim = forcedFreeAim; $('#pointer-help').hidden = true; lockPointer(); }
}
function quit() {
  clearHeldInput();
  window.SZAudio?.setActive(false); audio.ctx?.suspend();
  game.state = 'title'; setScreen('title');
  if (document.pointerLockElement) document.exitPointerLock();
  refreshBoard();
}
function nextWave() {
  game.wave++;
  if (game.wave > 1) placeWeapons();
  const bossWave = game.wave % 3 === 0;
  game.toSpawn = bossWave ? 1 : 5 + game.wave * 3;
  game.spawnT = bossWave ? rand(2, 6) : .5;
  const buggyReady = game.wave % BUGGY.every === 0 && (!buggy || buggy.state === 'broken');
  if (buggyReady) spawnBuggy();
  if (bossWave) {
    showBanner('Solo encounter · watch the hands before the strike', 'SERGIO CRUZ', 3.2); sfx('sergio_roar');
  } else if (buggyReady) {
    showBanner(TOUCH ? 'RZR ready · tap Drive beside it' : 'RZR ready · press E beside it', 'Wave ' + game.wave, 3.2); sfx('levelup');
  } else showBanner('Noche de Muertos', 'Wave ' + game.wave, 2.6);
  sfx('bell');
}
// between waves: a short card that says what just happened and counts down to the next wave (play carries on)
function interlude(on) {
  const el = $('#interlude');
  if (!on) { el.classList.remove('on'); return; }
  if (!el.classList.contains('on')) {
    $('#banner').classList.remove('on'); game.banner = 0;
    $('#il-sub').textContent = game.wave ? '+' + game.bonus + ' · +1 Vivo bottle · +3 balloons' : 'Hold the yard till dawn';
    $('#il-main').textContent = game.wave ? 'Wave ' + game.wave + ' cleared' : 'Get ready';
    el.classList.add('on');
  }
  setText('#il-next', 'Wave ' + (game.wave + 1) + ' in ' + Math.ceil(game.breakT));
  $('#il-bar').style.transform = 'scaleX(' + clamp(game.breakT / game.breakLen, 0, 1) + ')';
}
function nextOwned(direction = 1) {
  const k = SLOT_ORDER.indexOf(game.weapon);
  for (let n = 1; n < SLOT_ORDER.length; n++) { const w = SLOT_ORDER[(k + direction * n + SLOT_ORDER.length) % SLOT_ORDER.length]; if (game.owned.has(w)) return w; }
  return game.weapon;
}
function showBanner(sub, main, t) { $('#banner-sub').textContent = sub; $('#banner-main').textContent = main; $('#banner').classList.add('on'); game.banner = t; }
function swap(i, force) {
  if (!WEAPONS[i]) return;
  if (!force && (i === game.weapon || game.state !== 'play' || !game.owned.has(i))) return;
  const leavingRPG=game.weapon===7&&i!==7;
  game.weapon = i; game.fireT = Math.max(game.fireT, .25);
  soakerR.visible = soakerL.visible = false; balloonHand.visible = false; coaVis(false); gatVis(i === 4); kitVis(false); game.coaT = 0; game.spin = 0;
  game.tossT = 0; if (game.pourT > 0) { game.pourT = 0; game.glassLevel = 1; }
  if (i === 3 || leavingRPG) setAim(false);
  for(const el of [$('#aim-btn'),$('#t-aim')])el.hidden=!(i===7 || (AIM_ENABLED && SKINS[skin].aim));
  app.classList.toggle('dual', i === 3);
  gunRig.position.y = -.22;
  hud(true);
}
function gameOver() {
  window.SZAudio?.setActive(false); audio.ctx?.suspend();
  game.state = 'over'; game.invulnT = 0; zombieMode(false);
  if (document.pointerLockElement) document.exitPointerLock();
  input.fire = false; sprayAudio(0, 0); engineAudio(false, 0);
  const result = { score: game.score, wave: game.wave, kills: game.kills, headshots: game.heads, durationMs: Math.round(performance.now() - game.started) };
  $('#over-score').textContent = result.score.toLocaleString();
  $('#over-wave').textContent = result.wave; $('#over-kills').textContent = result.kills; $('#over-heads').textContent = result.headshots;
  const local = store.get(LOCAL_SCORE_KEY, []);
  local.push({ name: prefs.name, ...result, at: Date.now() }); local.sort((a, b) => b.score - a.score);
  store.set(LOCAL_SCORE_KEY, local.slice(0, 20));
  const save = $('#over-save'); save.className = 'save';
  if (RANKED && result.wave >= 1) {
    save.textContent = 'Saving to the global leaderboard…';
    const completedRun=game.runReady,runName=prefs.name,runStarted=game.started;
    Promise.resolve(completedRun).then(d=>{if(!d?.runId)throw new Error('The global leaderboard is unavailable.');return api('/scores', { runId:d.runId, name:runName, rulesVersion:RULES, ...result });})
      .then(d => { if(game.started!==runStarted)return;save.className = 'save ok'; save.textContent = d.rank ? `Global rank #${d.rank}${d.newBest ? ' · new personal best' : ''}` : 'Saved to the global leaderboard.';refreshBoard(); })
      .catch(e => { if(game.started!==runStarted)return;save.className = 'save bad'; save.textContent = e.message + ' Your score is saved on this device.'; });
  } else save.textContent = RANKED ? 'Global leaderboard unavailable. Your score is saved on this device.' : 'Score saved on this device.';
  setTimeout(() => setScreen('over'), 900);
}

// ---------------- soaker droplets and balloons ----------------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), muzzleW = new THREE.Vector3();
let hitmarkT = 0, hitSoundT = 0;
const knock = new THREE.Vector3();
const DMAX = 700;
const drops = { p: new Float32Array(DMAX * 3), v: new Float32Array(DMAX * 3), life: new Float32Array(DMAX), dmg: new Float32Array(DMAX), i: 0 };
const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.006, 6, 4), dropMat, DMAX);
dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dropMesh.frustumCulled = false; scene.add(dropMesh);
const balloons = [];
const thrownGlasses = [];
function removeThrownGlass(item) {
  scene.remove(item.m); const materials = new Set();
  item.m.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material))materials.add(m);}});
  materials.forEach(m=>m.dispose()); thrownGlasses.splice(thrownGlasses.indexOf(item),1);
}
const balloonGeo = new THREE.SphereGeometry(.13, 14, 10);
const balloonCols = [0xff3d7f, 0xff8a1c, 0x3cc6ff, 0xb46aff];
const dropM = new THREE.Matrix4(), zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
const dropDir = new THREE.Vector3(), dropP = new THREE.Vector3(), dropS = new THREE.Vector3(), dropQ = new THREE.Quaternion(), Z_AXIS = new THREE.Vector3(0, 0, 1);
function clearProjectiles() {
  rpgRuntime.clear();
  drops.life.fill(0);
  balloons.splice(0).forEach(b => { scene.remove(b.m); b.m.userData?.dispose?.(); });
  newFieldProps.clearLatex();
  for (const item of thrownGlasses.slice()) removeThrownGlass(item);
}
// The pressurized jet and damage droplets share one straight path and range.
// Low pressure shortens that path and reduces damage; it cannot draw a false hit.
function sprayRange(pressure) { return 12 + 18 * pressure; }

const SPLASH = ['#eafcff', '#bfe9f0', '#ffffff'];
function aimVelocity(m, pressure, out) {
  const speed = 8 + 16 * pressure;
  out.copy(aimPoint).sub(m);
  out.normalize().multiplyScalar(speed);
  return out;
}
// The jet is a straight ribbon from the painted nozzle toward the sight point.
const JET_N = 36;
// across the ribbon: soft edges, a bright core and two glints; along it: streaks that scroll to show the flow
const jetTex = canvasTex(64, 256, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const across = g.createLinearGradient(0, 0, w, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)'); across.addColorStop(.3, 'rgba(170,215,225,.55)');
  across.addColorStop(.42, 'rgba(255,255,255,1)'); across.addColorStop(.5, 'rgba(210,240,248,.8)');
  across.addColorStop(.62, 'rgba(255,255,255,.95)'); across.addColorStop(.75, 'rgba(150,200,215,.45)'); across.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = across; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'multiply';
  for (let y = 0; y < h; y += 2) { const v = 150 + Math.random() * 105; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 2 + Math.random() * 6); }
  g.globalCompositeOperation = 'source-over';
}, [1, 1]);
jetTex.wrapS = THREE.ClampToEdgeWrapping;
const jetMat = new THREE.MeshBasicMaterial({ map: jetTex, color: 0xf0fdff, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
function makeJet() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(JET_N * 6), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(JET_N * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const uv = new Float32Array(JET_N * 4);
  for (let i = 0; i < JET_N; i++) uv.set([0, i / (JET_N - 1) * 3, 1, i / (JET_N - 1) * 3], i * 4);
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const idx = [];
  for (let i = 0; i < JET_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  const m = new THREE.Mesh(g, jetMat); m.frustumCulled = false; m.visible = false; m.renderOrder = 2; scene.add(m);
  return m;
}
const jets = [makeJet(), makeJet()];
const jetM = new THREE.Vector3(), jetP = new THREE.Vector3(), jetT = new THREE.Vector3(), jetSide = new THREE.Vector3(), jetV = new THREE.Vector3(), jetEye = new THREE.Vector3();
function drawJet(jet, m, pressure, dt) {
  jetV.copy(aimPoint).sub(m);
  const sightDistance = jetV.length();
  if (sightDistance < .01) { jet.visible = false; return; }
  let reach = Math.min(sightDistance, sprayRange(pressure));
  jetV.divideScalar(sightDistance);
  for (let d = .08; d < reach; d += .08) {
    const x = m.x + jetV.x * d, y = m.y + jetV.y * d, z = m.z + jetV.z * d;
    if (y <= 0 || zombieAt(x, y, z, .05) || inBlocker(x, y, z)) { reach = d; break; }
  }
  const pos = jet.geometry.attributes.position.array, col = jet.geometry.attributes.color.array, now = performance.now() / 1000;
  const bright = .55 + .45 * pressure;
  for (let i = 0; i < JET_N; i++) {
    const f = i / (JET_N - 1);
    jetP.set(m.x + jetV.x * reach * f, m.y + jetV.y * reach * f, m.z + jetV.z * reach * f);
    // Only a trace of turbulence, so the stream stays visibly straight.
    const wob = f * f * .004 * (1 - pressure);
    jetP.x += Math.sin(now * 37 + f * 11) * wob; jetP.y += Math.sin(now * 29 + f * 13 + 1) * wob;
    jetT.copy(jetV);
    const half = .012 + .008 * pressure + f * (.016 + .024 * (1 - pressure));
    jetSide.crossVectors(jetT, jetEye.copy(jetP).sub(camera.position)).normalize().multiplyScalar(half);
    pos.set([jetP.x - jetSide.x, jetP.y - jetSide.y, jetP.z - jetSide.z, jetP.x + jetSide.x, jetP.y + jetSide.y, jetP.z + jetSide.z], i * 6);
    const c = bright * Math.min(1, .35 + f * 30) * (1 - .5 * f * f);
    col.fill(c, i * 6, i * 6 + 6);
  }
  jet.geometry.attributes.position.needsUpdate = jet.geometry.attributes.color.needsUpdate = true;
  jetTex.offset.y = -now * (2 + 4 * pressure);
  jet.visible = true;
  // Splashes are emitted by actual droplet impacts, never at an empty endpoint.
}
function emitDrop(gun, pressure) {
  if (gun.userData.sprite) vmMuzzle(muzzleW, gun.userData.sprite); else gun.localToWorld(muzzleW.copy(gun.userData.muzzle));
  aimVelocity(muzzleW, pressure, tmpV2).multiplyScalar(rand(.95, 1.05));
  const spread = (.01 + .05 * (1 - pressure)) * tmpV2.length();
  tmpV2.x += rand(-spread, spread); tmpV2.y += rand(-spread, spread); tmpV2.z += rand(-spread, spread);
  const i = drops.i = (drops.i + 1) % DMAX, o = i * 3;
  drops.p.set([muzzleW.x, muzzleW.y, muzzleW.z], o);
  drops.v.set([tmpV2.x, tmpV2.y, tmpV2.z], o);
  drops.life[i] = sprayRange(pressure) / tmpV2.length(); drops.dmg[i] = SOAKER.dmg * (.3 + .7 * pressure);
}
function zombieAt(x, y, z, pad) {
  for (const zb of zombies) {
    if (zb.modelPending || !zb.root.visible || zb.state === 'dying') continue;
    const p = zb.root.position, s = zb.body.scale.x;
    if (y < p.y || y > p.y + 2.1 * s) continue;
    if (Math.hypot(x - p.x, z - p.z) < zb.r * 1.15 + pad) return zb;
  }
  return null;
}
function inBlocker(x, y, z) {
  if (y > WALL_H) return false;
  for (const b of blockers) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
  return false;
}
function activeCombatTarget(z) {
  return !z.modelPending && z.root.visible && z.state !== 'dying';
}
function combatLineClear(a, b) {
  return !blockers.some(box => segmentBoxTime(a, b, box, WALL_H) <= 1);
}
function firstCombatHit(start, end, targetPad = .06, wallPad = 0, ground = .02) {
  let nearest = Infinity, hit = null;
  const surface = t => { if (t < nearest) { nearest = t; hit = {t}; } };
  if (start.y <= ground) surface(0);
  else if (end.y <= ground) surface((ground-start.y)/(end.y-start.y));
  for (const box of blockers) surface(segmentBoxTime(start, end, box, WALL_H, wallPad));
  for (const z of zombies) {
    if (!activeCombatTarget(z)) continue;
    const p = z.root.position, s = z.body.scale.x;
    const t = segmentCylinderTime(start, end, p, z.r*1.15+targetPad, p.y, p.y+2.1*s);
    // World surfaces win coincident contact, including thin-wall edge cases.
    if (t < nearest-1e-8) { nearest = t; hit = {t,z}; }
  }
  return hit;
}
function zombieCanMelee(z, reach) {
  if (!activeCombatTarget(z)) return false;
  const p = z.root.position, s = z.body.scale.x;
  const from = {x:p.x,y:p.y+1.1*s,z:p.z};
  const to = {x:player.pos.x,y:player.pos.y+1.1,z:player.pos.z};
  return Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z) < reach+.25 && combatLineClear(from,to);
}
function updateDrops(dt) {
  for (let i = 0; i < DMAX; i++) {
    if (drops.life[i] <= 0) { dropMesh.setMatrixAt(i, zeroM); continue; }
    const o = i * 3;
    const step = Math.min(dt, drops.life[i]);
    drops.life[i] -= dt;
    const start = {x:drops.p[o],y:drops.p[o+1],z:drops.p[o+2]};
    const end = {x:start.x+drops.v[o]*step,y:start.y+drops.v[o+1]*step,z:start.z+drops.v[o+2]*step};
    const hit=firstCombatHit(start,end,.06),fraction=hit?hit.t:1;
    const x=drops.p[o]=start.x+(end.x-start.x)*fraction,y=drops.p[o+1]=start.y+(end.y-start.y)*fraction,z=drops.p[o+2]=start.z+(end.z-start.z)*fraction;
    const zb=hit?.z;
    if (zb) {
      const head = y > (zb.headshotY ?? zb.root.position.y + 1.62 * zb.body.scale.x);
      damageZombie(zb, drops.dmg[i] * (head ? 2 : 1), head, tmpV.set(x, y, z));
      if (Math.random() < .3) burst(tmpV, 2, SPLASH, 1.2, 1);
      drops.life[i] = 0;
    } else if (hit) {
      if (Math.random() < .25) burst(tmpV.set(x, Math.max(y, .03), z), 2, SPLASH, .8, .8);
      drops.life[i] = 0;
    }
    // right off the nozzle the jet ribbon is the stream; a drop that close would fill the screen
    if (drops.life[i] <= 0 || camera.position.distanceToSquared(dropP.set(x, y, z)) < 2.5) { dropMesh.setMatrixAt(i, zeroM); continue; }
    // each drop is drawn as a streak along its flight so the stream reads as one continuous jet
    const sp = Math.hypot(drops.v[o], drops.v[o + 1], drops.v[o + 2]);
    dropDir.set(drops.v[o] / sp, drops.v[o + 1] / sp, drops.v[o + 2] / sp);
    dropQ.setFromUnitVectors(Z_AXIS, dropDir);
    dropS.set(1, 1, 1 + sp * .25);
    dropM.compose(dropP.set(x, y, z), dropQ, dropS);
    dropMesh.setMatrixAt(i, dropM);
  }
  dropMesh.instanceMatrix.needsUpdate = true;
}
function throwBalloon() {
  if (game.fireT > 0) return;
  input.firePressed = false;
  if (game.balloons <= 0) { sfx('empty'); return; }
  game.balloons--; game.fireT = BALLOON.rate; sfx('throw');
  const m = newFieldProps.balloon();
  const [px,py] = authoredVM.muzzle('balloon');
  vmNdc.set(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1), .5).unproject(camera).sub(camera.position).normalize();
  m.position.copy(camera.position).addScaledVector(vmNdc,.6);
  camera.getWorldDirection(tmpV);
  const v = tmpV.clone().multiplyScalar(15).add(new THREE.Vector3(player.vel.x * .5, 3.2, player.vel.z * .5));
  scene.add(m); balloons.push({ m, v, t: 0 });
  balloonHand.position.z = -.25;
  hud(true);
}
function popBalloon(b) {
  const c = b.m.position;
  sfx('splash', clamp(1.4 - c.distanceTo(player.pos) / 30, .2, 1));
  newFieldProps.popLatex(scene,c);
  for (const zb of zombies.slice()) {
    if (!activeCombatTarget(zb)) continue;
    const p=zb.root.position,s=zb.body.scale.x,target={x:p.x,y:clamp(c.y,p.y+.2*s,p.y+1.8*s),z:p.z};
    const d = Math.hypot(target.x-c.x,target.y-c.y,target.z-c.z);
    if (d < BALLOON.radius && combatLineClear(c,target)) damageZombie(zb, BALLOON.dmg * (1 - .6 * d / BALLOON.radius), false, tmpV2.set(target.x,target.y,target.z));
  }
  scene.remove(b.m); b.m.userData?.dispose?.();
  balloons.splice(balloons.indexOf(b), 1);
}
function updateBalloons(dt) {
  newFieldProps.updateLatex(dt);
  for (const item of thrownGlasses.slice()) {
    item.t += dt; item.v.y -= 8 * dt; item.m.position.addScaledVector(item.v,dt); item.m.rotation.x += dt * 2;
    const p=item.m.position;
    if(item.t>1.2 || p.y<.1 || inBlocker(p.x,p.y,p.z) || zombieAt(p.x,p.y,p.z,.08)) removeThrownGlass(item);
  }
  for (const b of balloons.slice()) {
    b.t += dt; b.v.y -= 12 * dt;
    const start={x:b.m.position.x,y:b.m.position.y,z:b.m.position.z};
    const end={x:start.x+b.v.x*dt,y:start.y+b.v.y*dt,z:start.z+b.v.z*dt};
    const hit=firstCombatHit(start,end,.1,.1,.12),f=hit?hit.t:1;
    b.m.position.set(start.x+(end.x-start.x)*f,start.y+(end.y-start.y)*f,start.z+(end.z-start.z)*f); newFieldProps.animateBalloon(b.m,b.t,b.v);
    const p = b.m.position;
    if (hit || b.t > 4) popBalloon(b);
  }
}
// hold Fire to keep chopping; each chop hits up to COA.maxHits zombies in front, inside reach
function updateCoa(dt) {
  const M = MELEE();
  if (game.coaT > 0) {
    const before = game.coaT;
    game.coaT = Math.max(0, game.coaT - dt);
    const t = 1 - game.coaT / M.swing, was = 1 - before / M.swing;
    if (was < M.hitAt && t >= M.hitAt) coaStrike();
  } else if (input.fire && game.state === 'play') { game.coaT = M.swing; sfx('throw'); }
  const t = game.coaT > 0 ? 1 - game.coaT / M.swing : 0;
  if (game.weapon === 2 || game.weapon === 6) return; // Authored new-tool keys render in updateAuthoredWeapons.
  // wind-up (blade lifts), chop (blade drives down through the crosshair), recover
  const lift = t < .3 ? ease(t / .3) : t < COA.hitAt + .08 ? 1 - ease((t - .3) / (COA.hitAt + .08 - .3)) * 1.9 : -.9 + ease((t - COA.hitAt - .08) / (1 - COA.hitAt - .08)) * .9;
  coaHold.rotation.x = lift * .75; coaHold.rotation.z = -lift * .12;
  coaHold.position.z = -.12 - Math.max(0, -lift) * .14;
  poseCoa();
}
function coaStrike() {
  const COA = MELEE();
  camera.getWorldDirection(tmpV).normalize();
  const origin={x:player.pos.x,y:player.pos.y+1.1,z:player.pos.z};
  const hits = zombies.filter(z => activeCombatTarget(z) && z.state !== 'rise').map(z => {
    const target={x:z.root.position.x,y:z.root.position.y+1.1*z.body.scale.x,z:z.root.position.z};
    const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z,d=Math.hypot(dx,dy,dz)||1e-3;
    return { z, d, target, c:(dx*tmpV.x+dy*tmpV.y+dz*tmpV.z)/d };
  }).filter(h => h.d < COA.reach * (h.z.type === 'brute' ? 1.15 : 1) && (h.c > COA.cos || h.d < .9) && combatLineClear(origin,h.target)).sort((a, b) => a.d - b.d).slice(0, COA.maxHits);
  if (!hits.length) return;
  game.shake = Math.max(game.shake, .06); sfx('splash', .5);
  for (const h of hits) damageZombie(h.z, COA.dmg, false, tmpV2.set(h.target.x,h.target.y,h.target.z));
}
function damageZombie(z, dmg, head, point) {
  z.hp -= dmg; z.flashT = .08;
  hitmarkT = .12; $('#hitmarker').classList.toggle('head', head);
  if (hitSoundT <= 0) { sfx('hit', head ? 1.4 : 1); hitSoundT = .09; }
  // the stream pushes zombies back in proportion to the hit
  if (z.state === 'chase' || z.state === 'enter') z.root.position.addScaledVector(knock.set(Math.sin(z.yaw), 0, Math.cos(z.yaw)), -Math.min(.6, .012 * dmg) * (z.type === 'brute' ? .3 : 1));
  if (z.hp > 0) return;
  z.reviewClip = null;
  z.state = 'dying'; z.t = 0;
  // Keep the last animated pose while the visible rig falls, instead of resetting to rest pose.
  if (z.rigged) {
    z.animMixer.timeScale = 1;
    setZombieClip(z, 'zombie_death');
    z.deathDuration = z.animActions.zombie_death.getClip().duration;
  } else if (z.animMixer) z.animMixer.timeScale = 0;
  game.kills++; if (head) game.heads++;
  game.score += z.points + (head ? 50 : 0);
  burst(point, 40, ['#ff8a1c', '#ff3d7f', '#ffd23a', '#f3e9d2'], 3, 3);   // cempasúchil petals instead of gore
  const roll = Math.random();
  if (roll < .12 || (z.type === 'brute' && roll < .6)) dropPickup(z.root.position, 'health');
  else if (roll < .26) dropPickup(z.root.position, 'bottle');
  else if (roll < .36) dropPickup(z.root.position, 'balloons');
}


// ---------------- side-by-side (from wave 3): drive and run zombies over ----------------
// Crashes into walls, stones and barrels wear the damage meter down; at zero it breaks for good.
// A broken one is replaced on the next wave that is a multiple of 3.
const BUGGY = { accel: 12, max: 15, reverse: 6, turn: 1.9, every: 3 };
const buggyDark = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: .6, metalness: .3 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9 });
const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 2 });
const tmpBug = new THREE.Vector3();
let buggy = null;
function buildBuggy() {
  const g = new THREE.Group(); g.name = 'Polaris RZR Pro R 4 - red';
  const materials = [];
  const mat = (name, color, roughness = .6, metalness = 0, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }); m.name = name; materials.push(m); return m;
  };
  const paint = new THREE.MeshPhysicalMaterial({ name: 'Polaris red metallic body paint', color: 0xd91620, roughness: .24, metalness: .18, clearcoat: .82, clearcoatRoughness: .16 }); materials.push(paint);
  const black = mat('textured graphite polymer', 0x17191b, .67, .18);
  const rail = mat('powder coated steel cage', 0x4d5053, .34, .82);
  const tire = mat('deep black all terrain rubber', 0x111212, .93, 0);
  const rubber = mat('suspension and trim rubber', 0x242628, .82, .04);
  const alloy = mat('machined forged alloy', 0x92989b, .28, .86);
  const alloyDark = mat('dark wheel alloy', 0x45494c, .42, .8);
  const seatMat = mat('black seat vinyl', 0x121619, .79, .04);
  const seatRed = mat('seat red piping and hardware', 0x7d1820, .62, .08);
  const glass = mat('smoked gauge glass', 0x27313a, .2, .25, { transparent: true, opacity: .75 });
  const lightLens = mat('clear LED lens', 0xe3e8e5, .16, .22, { emissive: 0xe7f4ff, emissiveIntensity: .55 });
  const amber = mat('amber reflector', 0xf28a23, .35, .18, { emissive: 0xe46812, emissiveIntensity: .3 });
  const screw = mat('stainless hardware', 0x8f9495, .24, .93);
  const upholstery = mat('dark seat stitching', 0x414344, .95, 0);
  const box = (w, h, d, material, x, y, z, parent = g, seg = 1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, seg, seg, seg), material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const sphere = (sx, sy, sz, material, x, y, z, parent = g, u = 20, v = 14) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, u, v), material); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const tube = (a0, b0, radius, material, parent = g, radial = 12) => {
    const a = new THREE.Vector3(...a0), b = new THREE.Vector3(...b0), delta = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), radial, 1), material);
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const bolt = (x, y, z, parent = g, r = .026) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .025, 8), screw); m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  // Central ladder chassis, underbody, skid plate and transverse cross-members.
  box(1.42, .15, 3.35, black, 0, .54, -.22);
  box(1.16, .055, 3.12, alloyDark, 0, .43, -.22);
  for (const x of [-.59, .59]) {
    tube([x, .49, -1.92], [x, .58, 1.45], .055, black);
    tube([x, .48, -1.3], [x, .48, 1.22], .035, alloyDark);
  }
  for (const z of [-1.75, -1.0, -.45, .45, 1.18]) tube([-.69, .5, z], [.69, .5, z], .045, black);
  // Tapered red front clip and rear quarter panels. Extruded side profiles give the
  // pointed hood, raised fender line and stepped rear body from the supplied Pro R refs.
  const sideProfile = [
    [-1.94, .58], [-1.90, .98], [-1.72, 1.13], [-1.38, 1.20], [-.94, 1.11],
    [-.54, 1.02], [-.24, 1.12], [.22, 1.18], [.48, 1.42], [.93, 1.47],
    [1.34, 1.37], [1.62, 1.17], [1.70, .88], [1.38, .68], [.52, .64],
    [-.52, .64], [-1.86, .58],
  ];
  const sidePanel = (side, points, material, depth = .085, bevel = .04) => {
    const s = new THREE.Shape();
    points.forEach(([z, y], i) => { const xx = side > 0 ? -z : z; if (!i) s.moveTo(xx, y); else s.lineTo(xx, y); }); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: true, bevelSegments: 3, bevelSize: bevel, bevelThickness: bevel });
    geo.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
    const m = new THREE.Mesh(geo, material); m.position.x = side * (.82 - depth); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  for (const side of [-1, 1]) {
    sidePanel(side, sideProfile, paint, .09, .035);
    // Black rocker, lower aero and wheel arch guards.
    sidePanel(side, [[-1.88,.55],[-1.74,.68],[-.72,.73],[.25,.76],[.57,.91],[.44,.57],[-.5,.47],[-1.78,.48]], black, .11, .025);
    // Large front/rear fender lips, with dark wheel-well liners beneath them.
    for (const wz of [-1.69, 1.69]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(.46, .055, 10, 40, Math.PI), black);
      arch.rotation.y = Math.PI / 2; arch.scale.y = 1 / .9; arch.position.set(side * .94, .45, wz); g.add(arch); arch.castShadow = true;
      const liner = new THREE.Mesh(new THREE.TorusGeometry(.41, .032, 8, 36, Math.PI), rubber);
      liner.rotation.y = Math.PI / 2; liner.scale.y = 1 / .9; liner.position.set(side * .96, .45, wz); g.add(liner);
    }
  }
  // A continuous sloped bonnet closes the center of the front clip and follows the Pro R nose.
  const hoodGeo = new THREE.BufferGeometry();
  hoodGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -.66,1.22,.72,  .66,1.22,.72,  -.72,1.28,1.10,
     .66,1.22,.72,  .72,1.28,1.10, -.72,1.28,1.10,
    -.72,1.28,1.10, .72,1.28,1.10, -.55,1.12,1.63,
     .72,1.28,1.10, .55,1.12,1.63, -.55,1.12,1.63,
  ], 3)); hoodGeo.setIndex([0,2,1,3,5,4,6,8,7,9,11,10]); hoodGeo.computeVertexNormals();
  const hood = new THREE.Mesh(hoodGeo, paint); hood.name = 'sculpted red RZR hood'; hood.castShadow = true; hood.receiveShadow = true; g.add(hood);
  for (const side of [-1, 1]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(.12,.012,.30), black); vent.position.set(side*.40,1.287,1.04); vent.rotation.x=-.08; g.add(vent);
    for (let k=0;k<3;k++) { const louver=new THREE.Mesh(new THREE.BoxGeometry(.105,.009,.018),alloyDark); louver.position.set(side*.40,1.297,.94+k*.09); g.add(louver); }
  }
  // Front fascia with the broad hex grille, lower bumper, twin hook points and split LEDs.
  box(1.08, .22, .10, black, 0, 1.06, 1.68);
  box(1.10, .08, .11, alloyDark, 0, .89, 1.70);
  for (let row = 0; row < 3; row++) for (let col = -4; col <= 4; col++) {
    const x = col * .105 + (row % 2) * .052;
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(.037, .037, .015, 6), rubber);
    hex.rotation.x = Math.PI / 2; hex.position.set(x, 1.055 - row * .061, 1.742); g.add(hex);
  }
  const bumper = new THREE.Group(); g.add(bumper);
  tube([-.78,.91,1.70],[-.92,.96,1.92],.055,rail,bumper);
  tube([-.92,.96,1.92],[.92,.96,1.92],.055,rail,bumper);
  tube([.92,.96,1.92],[.78,.91,1.70],.055,rail,bumper);
  tube([-.65,.9,1.93],[-.65,.76,1.95],.045,rail,bumper);
  tube([.65,.9,1.93],[.65,.76,1.95],.045,rail,bumper);
  box(.18,.05,.06,rubber,0,.81,1.98);
  for (const side of [-1, 1]) {
    const head = new THREE.Group(); head.position.set(side * .47, 1.30, 1.62); head.rotation.y = side * -.12; g.add(head);
    const outline = new THREE.Mesh(new THREE.BoxGeometry(.43,.15,.075), black); outline.rotation.z = side * -.25; head.add(outline);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(.34,.07,.045), lightLens); lens.rotation.z = side * -.25; lens.position.z = .05; head.add(lens);
    for (let k = 0; k < 3; k++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(.045,.035,.02), lightLens);
      led.position.set(side * (-.10 + k * .09), .004, .078); head.add(led);
    }
    const ledPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side*.25,1.18,1.704), new THREE.Vector3(side*.32,1.39,1.704),
      new THREE.Vector3(side*.52,1.43,1.704), new THREE.Vector3(side*.69,1.27,1.704),
      new THREE.Vector3(side*.73,1.12,1.704),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(ledPath,20,.014,6,false),lightLens));
    const marker = new THREE.Mesh(new THREE.BoxGeometry(.075,.032,.03), amber); marker.position.set(side * .185,-.035,.05); head.add(marker);
  }
  const headlight = new THREE.SpotLight(0xe7f3ff, 34, 34, .44, .45, 1.1);
  headlight.position.set(0, 1.15, 1.78); headlight.target.position.set(0, .15, 14); g.add(headlight, headlight.target);
  const fogLeft = new THREE.Mesh(new THREE.BoxGeometry(.21,.045,.035), lightLens); fogLeft.position.set(-.48,.88,1.76); g.add(fogLeft);
  const fogRight = fogLeft.clone(); fogRight.position.x = .48; g.add(fogRight);
  // Braced rollover cage: forward A-pillars, double roof rails, rear stays and cross braces.
  const cage = new THREE.Group(); cage.name = 'RZR welded rollover cage'; g.add(cage);
  const posts = [-.77,.77];
  for (const x of posts) {
    tube([x,.94,1.08],[x*.94,2.08,.57],.052,rail,cage,16);
    tube([x*.94,2.08,.57],[x*.94,2.15,-1.35],.054,rail,cage,16);
    tube([x*.94,2.15,-1.35],[x,.91,-1.92],.052,rail,cage,16);
    tube([x*.94,2.08,.57],[x*.72,1.24,-.18],.034,rail,cage,12);
    tube([x*.94,2.15,-1.35],[x*.66,1.23,-1.05],.034,rail,cage,12);
  }
  tube([-.77,.94,1.08],[.77,.94,1.08],.055,rail,cage,16);
  tube([-.74,2.08,.57],[.74,2.08,.57],.055,rail,cage,16);
  tube([-.74,2.15,-1.35],[.74,2.15,-1.35],.055,rail,cage,16);
  tube([-.72,2.12,-.35],[.72,2.12,-.35],.036,rail,cage,12);
  tube([-.74,2.08,.57],[.74,2.15,-1.35],.03,rail,cage,10);
  tube([.74,2.08,.57],[-.74,2.15,-1.35],.03,rail,cage,10);
  // Open cockpit, two deeply bolstered seats, red stitching, wheel, dash and instruments.
  const dash = box(1.23,.22,.15,black,0,1.33,.58); dash.rotation.x = -.10;
  box(.93,.08,.13,alloyDark,0,1.46,.58);
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.025,32), glass); gauge.rotation.x = Math.PI/2; gauge.position.set(0,1.42,.68); g.add(gauge);
  for (const x of [-.36,-.18,.18,.36]) {
    const gage = new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.026,24), glass); gage.rotation.x = Math.PI/2; gage.position.set(x,1.40,.68); g.add(gage);
  }
  for (const [x, rowZ] of [[-.37,.20],[.37,.20],[-.37,-.72],[.37,-.72]]) {
    const seat = new THREE.Group(); seat.position.set(x,.77,rowZ); g.add(seat);
    const base = sphere(.28,.11,.35,seatMat,0,.03,0,seat,24,16); base.rotation.x=-.1;
    const back = new THREE.Mesh(new THREE.BoxGeometry(.47,.76,.18,3,5,2),seatMat); back.position.set(0,.38,-.18); back.rotation.x=-.11; seat.add(back);
    for (const side of [-1,1]) {
      const bolster=sphere(.075,.30,.12,seatMat,side*.19,.38,-.17,seat,16,10); bolster.rotation.x=-.1;
      const piping=tube([side*.255,.16,-.16],[side*.255,.58,-.16],.009,seatRed,seat,6);
      const stitch=tube([side*.13,.13,-.16],[side*.13,.57,-.16],.009,upholstery,seat,6);
    }
    const cushion = sphere(.23,.03,.29,seatMat,0,.105,.005,seat,20,12);
  }
  const steering = new THREE.Group(); steering.position.set(-.37,1.32,.29); steering.rotation.x=.14; steering.rotation.z=-.12; g.add(steering);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(.16,.022,10,32),black); steering.add(wheelRim);
  tube([0,0,0],[0,.14,0],.018,alloyDark,steering,8); tube([0,0,0],[-.12,-.08,0],.018,alloyDark,steering,8); tube([0,0,0],[.12,-.08,0],.018,alloyDark,steering,8);
  sphere(.045,.045,.025,paint,0,0,.012,steering,16,10);
  // Sculpted side doors and thick lower sills, with original Pro R red-black contrast.
  for (const side of [-1,1]) {
    sidePanel(side, [[-.47,.7],[-.42,1.12],[-.16,1.20],[.30,1.19],[.44,.75],[.18,.67],[-.34,.65]], paint, .08, .028);
    tube([side*.91,.62,-.48],[side*.93,.62,.44],.05,rail);
    // Paired side-by-side intake grilles behind the passenger compartment.
    for(let i=0;i<7;i++) tube([side*.89,.79,-1.30+i*.07],[side*.89,.96,-1.30+i*.07],.012,alloyDark,g,6);
    const decalCanvas=document.createElement('canvas'); decalCanvas.width=1024; decalCanvas.height=256;
    const ctx=decalCanvas.getContext('2d'); ctx.clearRect(0,0,1024,256);
    ctx.fillStyle='rgba(15,17,19,.92)'; ctx.beginPath(); ctx.moveTo(560,34); ctx.lineTo(1010,34); ctx.lineTo(850,102); ctx.lineTo(1024,118); ctx.lineTo(1024,182); ctx.lineTo(645,182); ctx.lineTo(740,125); ctx.lineTo(510,125); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#c9cdd0'; ctx.font='italic 900 140px Arial'; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.shadowColor='rgba(255,255,255,.2)'; ctx.shadowBlur=3; ctx.fillText('RZR',48,112); ctx.shadowBlur=0;
    ctx.fillStyle='#111315'; ctx.font='italic 900 54px Arial'; ctx.fillText('PRO R',770,216);
    const decalTex=new THREE.CanvasTexture(decalCanvas); decalTex.colorSpace=THREE.SRGBColorSpace;
    const decalMat=mat('RZR Pro R factory side decal',0xffffff,.48,.08,{map:decalTex,transparent:true,alphaTest:.03,side:THREE.DoubleSide,depthWrite:false});
    const decal=new THREE.Mesh(new THREE.PlaneGeometry(1.48,.34),decalMat); decal.position.set(side*.875,1.075,.03); decal.rotation.y=side>0?Math.PI/2:-Math.PI/2; g.add(decal);
  }
  // Rear engine cover, cooling vents, exhaust and taillights.
  box(1.16,.28,.52,black,0,1.02,-1.75);
  for(let x=-.48;x<=.49;x+=.12) box(.025,.08,.06,alloyDark,x,1.10,-1.77);
  for(const side of [-1,1]) {
    const tail=new THREE.Mesh(new THREE.BoxGeometry(.20,.10,.06),amber); tail.position.set(side*.48,1.02,-1.94); g.add(tail);
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.34,16),alloy); pipe.rotation.x=Math.PI/2; pipe.position.set(side*.43,.68,-1.79); g.add(pipe);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(.067,.067,.03,16),black); tip.rotation.x=Math.PI/2; tip.position.set(side*.43,.68,-1.96); g.add(tip);
  }
  // Four independent suspension arms, coil-over shocks, cast alloy wheels and block tread.
  const wheels=[];
  for(const [x,wz,front] of [[-1.03,1.695,true],[1.03,1.695,true],[-1.03,-1.695,false],[1.03,-1.695,false]]) {
    const side=Math.sign(x), pivot=new THREE.Group(); pivot.position.set(x,.45,wz); pivot.name=front?'front wheel pivot':'rear wheel pivot'; g.add(pivot);
    const spin=new THREE.Group(); spin.scale.set(1,.836,.7524); pivot.add(spin);
    const tireMesh=new THREE.Mesh(new THREE.CylinderGeometry(.54,.54,.32,40,1),tire); tireMesh.rotation.z=Math.PI/2; tireMesh.castShadow=true; tireMesh.receiveShadow=true; spin.add(tireMesh);
    const treadGeo=new THREE.BoxGeometry(.085,.08,.14);
    const treadMat=mat('deep molded all terrain tire lugs',0x1b1c1d,.96,0);
    const count=36*3, tread=new THREE.InstancedMesh(treadGeo,treadMat,count); const dummy=new THREE.Object3D(); let k=0;
    for(let row=-1;row<=1;row++) for(let i=0;i<36;i++) {
      const a=(i/36)*Math.PI*2, stagger=row===0?0:.045;
      dummy.position.set(row*.115,.50*Math.cos(a),.50*Math.sin(a)+stagger);
      dummy.rotation.set(a,0,0); dummy.updateMatrix(); tread.setMatrixAt(k++,dummy.matrix);
    }
    tread.castShadow=true; tread.receiveShadow=true; spin.add(tread);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.32,40),alloyDark); rim.rotation.z=Math.PI/2; rim.castShadow=true; spin.add(rim);
    const rotor=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.028,40),alloy); rotor.rotation.z=Math.PI/2; rotor.position.x=side*.171; rotor.castShadow=true; spin.add(rotor);
    const caliper=new THREE.Mesh(new THREE.BoxGeometry(.075,.16,.08),seatRed); caliper.position.set(side*.19,.09,.12); spin.add(caliper);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.30,24),alloy); hub.rotation.z=Math.PI/2; hub.castShadow=true; spin.add(hub);
    for(const face of [-1,1]) {
      const sidewall=new THREE.Mesh(new THREE.TorusGeometry(.47,.009,6,40),rubber); sidewall.rotation.y=Math.PI/2; sidewall.position.x=face*.164; spin.add(sidewall);
      const tor=new THREE.Mesh(new THREE.TorusGeometry(.25,.025,10,40),side*face>0?paint:alloyDark); tor.rotation.y=Math.PI/2; tor.position.x=face*.155; spin.add(tor);
      const lugGeo=new THREE.BoxGeometry(.032,.075,.040), sideLugs=new THREE.InstancedMesh(lugGeo,tire,24), lugObj=new THREE.Object3D();
      for(let j=0;j<24;j++) { const a=j/24*Math.PI*2; lugObj.position.set(face*.166,.405*Math.cos(a),.36*Math.sin(a)); lugObj.rotation.set(Math.PI/2+a,0,0); lugObj.updateMatrix(); sideLugs.setMatrixAt(j,lugObj.matrix); }
      sideLugs.castShadow=true; spin.add(sideLugs);
      for(let j=0;j<12;j++) {
        const a=j/12*Math.PI*2, stud=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),screw);
        stud.position.set(face*.16,.25*Math.cos(a),.25*Math.sin(a)); spin.add(stud);
      }
    }
    for(const face of [-1,1]) for(let j=0;j<12;j++) {
      const a=j/12*Math.PI*2, x=face*.155, inner=.105, outer=j%2===0?.255:.235;
      tube([x,inner*Math.cos(a),inner*Math.sin(a)],[x,outer*Math.cos(a),outer*Math.sin(a)],.014,alloy,spin,8);
      const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.018,8),screw); bolt.rotation.z=Math.PI/2; bolt.position.set(face*.176,.29*Math.cos(a),.29*Math.sin(a)); spin.add(bolt);
    }
    const knuckle=sphere(.13,.15,.14,alloyDark,side*.05,0,0,pivot,16,10);
    // Control arms in the open wheel well; paired arms make the scale read like a real UTV.
    const zInner=wz+(front?-.22:.22);
    tube([side*.60,.53,zInner],[side*.91,.42,wz-.10],.042,alloyDark);
    tube([side*.60,.53,zInner],[side*.91,.42,wz+.10],.042,alloyDark);
    tube([side*.62,.72,zInner],[side*.90,.61,wz-.12],.034,alloy);
    tube([side*.62,.72,zInner],[side*.90,.61,wz+.12],.034,alloy);
    // Coil spring wraps the exposed damper; local spring follows the shock axis.
    const shockA=new THREE.Vector3(side*.62,1.13,wz-.17), shockB=new THREE.Vector3(side*.91,.61,wz-.13);
    tube(shockA.toArray(),shockB.toArray(),.041,alloyDark);
    const axis=shockB.clone().sub(shockA), dir=axis.clone().normalize(), u=new THREE.Vector3(1,0,0).cross(dir).normalize(); if(u.lengthSq()<.1)u.set(0,0,1);
    const v=dir.clone().cross(u).normalize(), pts=[];
    for(let h=0;h<=40;h++){const t=h/40,ang=t*Math.PI*14,center=shockA.clone().addScaledVector(axis,t); center.addScaledVector(u,Math.cos(ang)*.063).addScaledVector(v,Math.sin(ang)*.063); pts.push(center);}
    const coil=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,.012,6,false),paint); coil.castShadow=true; g.add(coil);
    wheels.push({pivot,spin,front});
  }
  // Small practical details: mirrors, belt tabs, license plate and antenna base.
  for(const side of [-1,1]) {
    tube([side*.68,1.43,.37],[side*.91,1.64,.27],.025,black);
    const mirror=new THREE.Mesh(new THREE.BoxGeometry(.19,.11,.07),rubber); mirror.position.set(side*.93,1.65,.25); mirror.rotation.z=side*-.16; g.add(mirror);
    box(.06,.16,.035,seatRed,side*.50,.97,-.38);
  }
  const mounts = []; // Alex: vehicle is for driving, with no mounted weapons.
  // Calibrated to the supplied four-seat RZR reference: 4.20 m long, 1.88 m wide,
  // 1.94 m tall; the 32-inch tire diameter and 15-inch beadlock wheel stay in metre scale.
  g.scale.set(.91,.9,1);
  g.userData={wheels,mounts,headlight,body:paint,materials};
  return g;
}
function nextBuggyWave() { return (Math.floor(game.wave / BUGGY.every) + 1) * BUGGY.every; }
function spawnBuggy() {
  removeBuggy();
  let g;
  if (RZR6) {
    if (!rzr6GLTF) { showBanner('Vehicle asset still loading', 'RZR', 2); return; }
    g = makeRzr6(rzr6GLTF);
  } else g = buildBuggy();
  scene.add(g);
  // The UTV is staged on its suspension in the yard; it never drops out of the sky.
  buggy = { g, x: 0, z: 1.5, h: Math.PI, speed: 0, steer: 0, hp: 100, state: 'parked', hitT: 0, blocker: null };
}
function removeBuggy() {
  if (!buggy) return;
  if (buggy.state === 'driving') exitBuggy(true);
  scene.remove(buggy.g);
  if (buggy.g.userData.dispose) buggy.g.userData.dispose();
  else (buggy.g.userData.materials||[buggy.g.userData.body]).forEach(m=>{m.dispose();m.map?.dispose();});
  if (buggy.blocker) blockers.splice(blockers.indexOf(buggy.blocker), 1);
  buggy = null; gunRig.visible = true;
}
const nearBuggy = () => buggy && buggy.state === 'parked' && Math.hypot(player.pos.x - buggy.x, player.pos.z - buggy.z) < 3.2;
function toggleDrive() {
  if (game.state !== 'play' || !buggy || tacoTruck?.isEating) return;
  if (buggy.state === 'driving') return exitBuggy();
  if (!nearBuggy()) return;
  clearHeldInput();
  buggy.state = 'driving'; player.yaw = buggy.h - Math.PI; player.pitch = -.08; player.vy = 0;
  input.fire = input.firePressed = false; setAim(false); sprayAudio(0, 0);
  gunRig.visible = false; sfx('pickup'); hud(true);
}
function exitBuggy(force = false) {
  const b = buggy;
  if (!b || b.state !== 'driving') return false;
  // Check both doors, then behind/in front. Never put the player inside a wall
  // or below a raised yard surface just because the vehicle's origin is y=0.
  b.g.updateMatrixWorld();
  const obstacles = fullSiteWorld() ? softMovementBlockers(blockers).concat(gateBars) : blockers.concat(gateBars);
  let landing = null;
  for (const offset of [[2.2,0,0],[-2.2,0,0],[2.2,0,-1.5],[-2.2,0,-1.5],[0,0,-3],[0,0,3]]) {
    const candidate = b.g.localToWorld(new THREE.Vector3(...offset));
    const blocked = obstacles.some(w => {
      const x=clamp(candidate.x,w.minX,w.maxX), z=clamp(candidate.z,w.minZ,w.maxZ);
      return Math.hypot(candidate.x-x,candidate.z-z) < player.r + .05;
    });
    if (blocked) continue;
    candidate.y = distilleryLevel?.groundHeight(candidate.x,candidate.z,Math.max(.6,candidate.y+.6)) ?? 0;
    if (Number.isFinite(candidate.y)) { landing = candidate; break; }
  }
  if (!landing && force) landing = lastSafeFootPosition.clone();
  if (!landing) { showBanner('Move the RZR clear of the walls first', 'No room to get out', 2); return false; }
  b.state = b.hp > 0 ? 'parked' : 'broken';
  b.speed = 0; b.steer = 0;
  clearHeldInput();
  player.pos.copy(landing); player.vel.set(0, 0, 0); player.vy = 0; player.grounded = true;
  lastSafeFootPosition.copy(landing);
  // Keep the driver's world look direction and current pointer-lock mode.
  gunRig.visible = true; engineAudio(false, 0); hud(true);
  return true;
}
function damageBuggy(amount, kind) {
  const b = buggy;
  b.hp = Math.max(0, b.hp - amount); sfx(kind, clamp(amount / 20, .3, 1)); game.shake = Math.min(.25, .04 + amount / 80);
  burst(tmpBug.set(b.x + Math.sin(b.h) * 1.8, .5, b.z + Math.cos(b.h) * 1.8), 6 + amount / 2 | 0, ['#ffd23a', '#8a6a50', '#333'], 2.5, 2);
  if (b.hp > 0) return;
  // broken for good: smoking wreck that blocks like any obstacle
  if (b.state === 'driving') exitBuggy(true);
  b.state = 'broken'; b.speed = 0;
  b.g.userData.body.color.setHex(0x3a2a22); b.g.userData.headlight.intensity = 0;
  const ex = Math.abs(Math.cos(b.h)) * RZR_HALF_WIDTH + Math.abs(Math.sin(b.h)) * RZR_HALF_LENGTH;
  const ez = Math.abs(Math.sin(b.h)) * RZR_HALF_WIDTH + Math.abs(Math.cos(b.h)) * RZR_HALF_LENGTH;
  b.blocker = { minX: b.x - ex, maxX: b.x + ex, minZ: b.z - ez, maxZ: b.z + ez }; blockers.push(b.blocker);
  sfx('crash'); showBanner('Damaged · replacement ready on wave ' + nextBuggyWave(), 'RZR', 3);
}
function updateBuggy(dt) {
  const b = buggy; if (!b) return;
  const { wheels } = b.g.userData;
  if (b.state === 'broken') {
    if (Math.random() < dt * 14) burst(tmpBug.set(b.x + rand(-.5, .5), 1.3, b.z + rand(-.5, .5)), 2, ['#222', '#444', '#ff8a1c'], .4, 2.5);
    b.g.position.set(b.x, 0, b.z); b.g.rotation.set(0, b.h, .08);
    return;
  }
  const driving = b.state === 'driving';
  if (driving) {
    const thr = clamp((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + input.moveY, -1, 1);
    const str = clamp((keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0) - input.moveX, -1, 1);
    if (thr) b.speed += BUGGY.accel * thr * dt * (Math.sign(thr) !== Math.sign(b.speed) ? 2 : 1);
    else b.speed -= Math.sign(b.speed) * Math.min(Math.abs(b.speed), 5 * dt);
    b.speed = clamp(b.speed, -BUGGY.reverse, BUGGY.max * (b.hp < 30 ? .7 : 1));
    b.steer += (str - b.steer) * Math.min(1, 6 * dt);
  } else { b.speed -= Math.sign(b.speed) * Math.min(Math.abs(b.speed), 9 * dt); b.steer *= .9; }
  const dh = b.steer * BUGGY.turn * clamp(b.speed / 6, -1, 1) * dt;
  b.h += dh;
  const nx = b.x + Math.sin(b.h) * b.speed * dt, nz = b.z + Math.cos(b.h) * b.speed * dt;
  const startX = b.x, startZ = b.z, moveX = nx - startX, moveZ = nz - startZ;
  const steps = Math.max(1, Math.ceil(Math.hypot(moveX, moveZ) / .22));
  const p = tmpBug.set(startX, 0, startZ);
  const fullSite = document.documentElement.dataset.world === 'viva-mexico';
  const movementBlockers = fullSite ? softMovementBlockers(blockers) : blockers;
  let px = startX, pz = startZ;
  for (let i = 1; i <= steps; i++) {
    const tx = startX + moveX * i / steps, tz = startZ + moveZ * i / steps;
    p.set(tx, 0, tz);
    pushVehicleOutOfRects(p, b.h, movementBlockers); pushVehicleOutOfRects(p, b.h, gateBars);
    if (!fullSite) { p.x = clamp(p.x,-HALF+1.5,HALF-1.5); p.z = clamp(p.z,-HALF+1.5,HALF-1.5); }
    const correction = Math.hypot(p.x - tx, p.z - tz);
    px = p.x; pz = p.z;
    if (correction > .01) break; // short swept steps stop the RZR crossing thin obstacles
  }
  const pen = Math.hypot(px - nx, pz - nz);
  b.x = px; b.z = pz;
  b.hitT -= dt;
  if (pen > .01 && Math.abs(b.speed) > 2.5 && b.hitT <= 0) { const hit = Math.abs(b.speed) * 1.2; b.speed *= -.3; b.hitT = .5; damageBuggy(hit, 'crash'); }
  else if (pen > .01) b.speed *= .94;
  if (b.state !== 'driving' && driving) return;    // broke down this frame
  // run zombies over
  for (const z of zombies) {
    if (z.state === 'dying' || z.state === 'rise') continue;
    const zp = z.root.position, dx = zp.x - b.x, dz = zp.z - b.z, d = Math.hypot(dx, dz) || 1;
    if (!pointInRzr(zp,z.r)) continue;
    if (Math.abs(b.speed) > 3) {
      damageZombie(z, 40 + Math.abs(b.speed) * 10, false, tmpV.set(zp.x, 1, zp.z));
      zp.x += dx / d * 1.2; zp.z += dz / d * 1.2;
      b.speed *= z.type === 'brute' ? .3 : .85;
      damageBuggy(z.type === 'brute' ? 12 : 2, 'thump');
      if (b.state === 'broken') return;
    } else pushOutOfRzr(zp,z.r);
  }
  // pose
  b.g.position.set(b.x, 0, b.z); b.g.rotation.set(0, b.h, -b.steer * clamp(b.speed / BUGGY.max, -1, 1) * .05);
  for (const w of wheels) { w.spin.rotation.x += b.speed * dt / (b.g.userData.wheelRadius || .45); if (w.front) w.pivot.rotation.y = b.steer * .45; }
  b.g.userData.setSteering?.(b.steer);
  if (Math.abs(b.speed) > 6 && Math.random() < dt * 20) burst(tmpBug.set(b.x - Math.sin(b.h) * 1.3, .2, b.z - Math.cos(b.h) * 1.3), 2, ['#6b3420', '#8a5a3a'], 1, 1);
  if (b.hp < 40 && Math.random() < dt * 6) burst(tmpBug.set(b.x + Math.sin(b.h) * 1.1, 1.3, b.z + Math.cos(b.h) * 1.1), 2, ['#333', '#555'], .3, 2);
  if (!driving) return;
  // The cabin follows the vehicle; mouse look turns the driver's head independently.
  player.yaw += dh;
  player.pos.set(b.x, 0, b.z); player.vel.set(Math.sin(b.h) * b.speed, 0, Math.cos(b.h) * b.speed);
  b.g.updateMatrixWorld();
  const seat = b.g.localToWorld(tmpBug.fromArray(b.g.userData.driverSeat || [.33, 1.60, .26]));
  camera.position.copy(seat);
  camera.rotation.set(player.pitch, player.yaw, 0);
  engineAudio(true, b.speed);
}

// ---------------- update ----------------
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
const lastSafeFootPosition = new THREE.Vector3(0,0,6);
function settlePlayerFloor(dt) {
  if (![player.pos.x,player.pos.y,player.pos.z,player.vy].every(Number.isFinite) || player.pos.y < -3) {
    player.pos.copy(lastSafeFootPosition); player.vel.set(0,0,0); player.vy=0; player.grounded=true;
  }
  // The support probe must start above the ground even after a bad exit or
  // penetration; a downward ray starting underneath a floor cannot find it.
  const sampled=distilleryLevel?.groundHeight(player.pos.x,player.pos.z,Math.max(.6,player.pos.y+.4)) ?? 0;
  const floorY=Number.isFinite(sampled)?sampled:0;
  if (player.grounded && Math.abs(floorY-player.pos.y)<=.4) {
    player.pos.y=floorY; player.vy=0;
  } else {
    player.grounded=false; player.vy-=16*dt; player.pos.y+=player.vy*dt;
    // Also resolve an existing penetration. The former previousY>=floorY
    // guard made a player already below the surface fall forever.
    if (player.vy<=0 && player.pos.y<=floorY) { player.pos.y=floorY; player.vy=0; player.grounded=true; }
  }
  if (player.grounded && player.pos.x>-39 && player.pos.x<49 && player.pos.z>-169 && player.pos.z<39) lastSafeFootPosition.copy(player.pos);
}
function updatePlayer(dt) {
  player.hurt = Math.max(0, player.hurt - dt);
  game.shake = Math.max(0, game.shake - dt);
  if (buggy?.state === 'driving') {
    const ox=buggy.x,oz=buggy.z;
    const zone=outOfBounds.update({dt,player,vehicle:buggy,enabled:fullSiteWorld(),runId:game.started,protectedHealth:game.invulnT>0});
    if(zone.returned){camera.position.x+=buggy.x-ox;camera.position.z+=buggy.z-oz;}
    if (game.shake) camera.position.add(tmpV.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(game.shake * .3));
    return;
  }
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + input.moveX;
  let my = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + input.moveY;
  const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
  const speed = (keys.ShiftLeft || keys.ShiftRight) && my > 0 ? 8 : 5.2;
  wish.copy(fwd).multiplyScalar(my * speed).addScaledVector(right, mx * speed);
  const accel = player.grounded ? 14 : 4;
  player.vel.x += (wish.x - player.vel.x) * Math.min(1, accel * dt);
  player.vel.z += (wish.z - player.vel.z) * Math.min(1, accel * dt);
  player.pos.x += player.vel.x * dt; player.pos.z += player.vel.z * dt;
  if (keys.Space && player.grounded) { player.vy = 5.6; player.grounded = false; }

  if (player.pos.y < 1.2) { pushOut(player.pos, player.r, fullSiteWorld()?softMovementBlockers(blockers):blockers); pushOut(player.pos, player.r, gateBars); }
  if (buggy && buggy.state === 'parked') pushOutOfRzr(player.pos,player.r);
  const fullSite = document.documentElement.dataset.world === 'viva-mexico';
  if(!fullSite){player.pos.x=clamp(player.pos.x,-HALF+.9,HALF-.9);player.pos.z=clamp(player.pos.z,-HALF+.9,HALF-.9);}
  const zone=outOfBounds.update({dt,player,enabled:fullSite,runId:game.started,protectedHealth:game.invulnT>0});
  if(zone.outside)game.edgeT=1.6;
  game.edgeT = Math.max(0, (game.edgeT || 0) - dt);
  settlePlayerFloor(dt);
  const moving = Math.hypot(player.vel.x, player.vel.z);
  if (player.grounded) player.bob += moving * dt * 1.6;
  camera.position.set(player.pos.x, player.pos.y + EYE + Math.sin(player.bob * 2) * .035 * Math.min(1, moving / 5), player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  if (game.shake) camera.position.add(tmpV.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(game.shake * .3));
  // gun sway, recoil recovery, reload dip
  const dip = 0;
  gunRig.position.x += (.22 + Math.cos(player.bob) * .012 - gunRig.position.x) * Math.min(1, 12 * dt);
  gunRig.position.y += (-.22 - Math.abs(Math.sin(player.bob)) * .012 - dip - gunRig.position.y) * Math.min(1, 12 * dt);
  gunRig.position.z += (-.5 - gunRig.position.z) * Math.min(1, 10 * dt);
  gunRig.rotation.x += (dip * 1.2 - gunRig.rotation.x) * Math.min(1, 10 * dt);
}
function swapBottle() {
  if (game.state !== 'play' || buggy?.state === 'driving' || game.swapT > 0 || game.spare <= 0 || game.tank >= .98) return false;
  if (!TANK_WEAPONS.has(game.weapon) && buggy?.state !== 'driving') swap(game.owned.has(0) ? 0 : START_WEAPON);
  game.swapT = VIVO.swap; game.swapOld = game.tank; game.swapFilled = false; game.spare--; sfx('unclip');
  hud(true);
  return true;
}
// Cognac glass: fire tosses the shot at what the crosshair is on, then the left hand pours the next one from the Vivo bottle
function updateGlass(dt, swapping, swapPhase) {
  if (game.tossT > 0) {
    const before = game.tossT; game.tossT = Math.max(0, game.tossT - dt);
    if (before > GLASS.toss * .65 && game.tossT <= GLASS.toss * .65) tossShot();
  } else if (game.pourT > 0) {
    game.pourT = Math.max(0, game.pourT - dt);
    const p = 1 - game.pourT / GLASS.pour;
    game.glassLevel = clamp((p - .3) / .45, 0, 1);
    if (game.pourT === 0) { game.glassLevel = 1; sfx('clink'); }
  } else if (!swapping) {
    if (game.glassLevel >= 1 && input.fire) { game.tossT = GLASS.toss; sfx('throw'); }
    else if (game.glassLevel < 1) {
      if (game.tank >= GLASS.shot - 1e-6) { game.pourT = GLASS.pour; game.tank = Math.max(0, game.tank - GLASS.shot); sfx('glug'); hud(); }
      else if (input.firePressed && !swapBottle()) { sfx('empty'); showBanner('Out of ' + SKINS[skin].name, 'Restock at a barrel', 1.6); }
    }
  }
  input.firePressed = false;
  kitGlass.userData.setLevel(game.glassLevel);
  const pour = game.pourT > 0 ? 1 - game.pourT / GLASS.pour : -1, toss = game.tossT > 0 ? 1 - game.tossT / GLASS.toss : -1;
  poseKit(pour, toss, swapPhase < 0 ? 0 : Math.sin(Math.PI * swapPhase));
  // the shot leaving the glass, until the drops are far enough out to be drawn
  tossBlob.visible = false; // New authored kit carries its visible pour/flick keys.
  if (tossBlob.visible) { const k = (toss - .35) / .27; tossBlob.position.copy(rimP).add(tmpKit.set(-.05 * k, .06 * k, -.5 * k)); tossBlob.scale.set(1 + k, 1 + k, 1 + 4 * k); tossBlob.material.opacity = .6 * (1 - k); }
}
function tossShot() {
  game.glassLevel = 0;
  const [px,py] = authoredVM.muzzle('glass');
  vmNdc.set(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1), .5).unproject(camera).sub(camera.position).normalize();
  muzzleW.copy(camera.position).addScaledVector(vmNdc,.6);
  findAimPoint();
  tmpV2.copy(aimPoint).sub(muzzleW).normalize();
  const released = sourceGlassProjectiles.create();
  released.scale.setScalar(1.4); released.userData.setLevel(1); released.rotation.set(.1,player.yaw,.25);
  released.position.copy(muzzleW).sub(released.userData.rim.clone().multiplyScalar(1.4).applyEuler(released.rotation));
  scene.add(released); thrownGlasses.push({m:released,v:tmpV2.clone().multiplyScalar(GLASS.speed).add(new THREE.Vector3(0,.8,0)),t:0});
  for (let n = 0; n < GLASS.drops; n++) {
    const i = drops.i = (drops.i + 1) % DMAX, o = i * 3, sp = GLASS.speed * rand(.85, 1.1), spread = .11;
    drops.p.set([muzzleW.x, muzzleW.y, muzzleW.z], o);
    drops.v.set([(tmpV2.x + rand(-spread, spread)) * sp, (tmpV2.y + rand(-spread * .6, spread)) * sp, (tmpV2.z + rand(-spread, spread)) * sp], o);
    drops.life[i] = GLASS.range / sp; drops.dmg[i] = GLASS.dmg;
  }
}
function setPumpHand(on) { const a = soakerR.userData.arms.pump; a.hand.visible = a.frame.visible = on; }
function updateWeapon(dt) {
  game.fireT = Math.max(0, game.fireT - dt);
  hitSoundT -= dt;
  const rpgStep=stepRPGState(game.rpg,dt,{fire:game.state==='play'&&game.weapon===7&&game.fireT<=0&&buggy?.state!=='driving'&&!tacoTruck?.isEating&&input.firePressed});
  game.rpg=rpgStep.state;if(rpgStep.fired)launchRPG();if(rpgStep.reloaded){sfx('reload');hud(true);}if(rpgStep.empty)sfx('empty');
  rpgRuntime.update(dt);
  if (tacoTruck?.isEating) {
    gunRig.visible=false; input.fire=input.firePressed=false; sprayAudio(0,0);
    for (const jet of jets) jet.visible=false;
    vmEl.hidden=true;dualVM.hide();updateDrops(dt);updateBalloons(dt);return;
  }
  if (buggy?.state !== 'driving') gunRig.visible=true;
  // restock spare Vivo bottles at any barrel
  game.refilling = game.spare < VIVO.max && barrels.some(b => Math.hypot(b.x - player.pos.x, b.z - player.pos.z) < 2);
  if (game.refilling) {
    game.restockT += dt;
    if (game.restockT >= VIVO.restock) { game.restockT = 0; game.spare++; sfx('glug'); hud(true); }
  } else game.restockT = 0;
  // bottle swap in progress
  let swapping = false, swapPhase = -1;
  if (game.swapT > 0) {
    const before = 1 - game.swapT / VIVO.swap;
    game.swapT = Math.max(0, game.swapT - dt);
    swapPhase = 1 - game.swapT / VIVO.swap; swapping = game.swapT > 0;
    if (!game.swapFilled && (swapPhase >= VIVO.fill || !swapping)) { game.tank = 1; game.swapFilled = true; sfx('clink'); }
    for (const at of [.22, .776, .83]) if (before < at && swapPhase >= at) sfx('reload');   // hose off, pump back, pump home
    if (!swapping) { swapPhase = -1; game.swapOld = null; hud(true); }
  }
  let spraying = false;
  const driving = buggy?.state === 'driving';
  for (const j of jets) j.visible = false;
  const gat = game.weapon === 4 && !driving;
  if (driving) {
    input.fire = input.firePressed = false;
    sprayAudio(0, 0);
  } else if (game.weapon === 7) {
    sprayAudio(0,0);input.firePressed=false;
  } else if (game.weapon === 5) {
    sprayAudio(0, 0);
    updateGlass(dt, swapping, swapPhase);
  } else if (TANK_WEAPONS.has(game.weapon)) {
    // Gatling fires immediately; Alex removed cranking, spin-up and run-down.
    if (gat) game.spin = 0;
    if (input.fire && game.tank > 0 && !swapping) {
      spraying = true;
      // Register the visible pose before emitting from its muzzle on the first firing frame.
      if (game.weapon === 3 && !driving) updateVM(dt, true, swapPhase);
      if (gat) updateGatlingView();
      const guns = game.weapon === 3 ? [soakerR, soakerL] : gat ? [gatling] : [soakerR];
      const pressure = .25 + .75 * game.tank;     // weaker stream as the bottle empties
      game.sprayAcc += SOAKER.rate * (gat ? GATLING.rate : 1) * (.5 + .5 * pressure) * dt;
      findAimPoint();
      while (game.sprayAcc >= 1) { game.sprayAcc--; for (const g of guns) emitDrop(g, pressure); }
      guns.forEach((g, k) => drawJet(jets[k], g.userData.sprite ? vmMuzzle(jetM, g.userData.sprite) : g.localToWorld(jetM.copy(g.userData.muzzle)), pressure, dt));
      game.tank = Math.max(0, game.tank - SOAKER.drain * (gat ? GATLING.drain : 1) * dt);
      if (!gat) gunRig.position.z += rand(-.004, .004) * pressure;
      if (game.tank === 0) { if (!driving) vm.dryT = 1; if (!swapBottle()) { sfx('empty'); showBanner('Out of ' + SKINS[skin].name, 'Restock at a barrel', 1.6); } }
    } else if (input.firePressed && game.tank <= .02 && !swapping && !swapBottle()) { sfx('empty'); showBanner('Out of ' + SKINS[skin].name, 'Restock at a barrel', 1.6); }
    input.firePressed = false;
    sprayAudio(spraying ? 1 : 0, .25 + .75 * game.tank);
  } else if (game.weapon === 2 || game.weapon === 6) {
    sprayAudio(0, 0); input.firePressed = false;
    updateCoa(dt);
  } else {
    sprayAudio(0, 0);
    if (input.firePressed && !driving) throwBalloon();
    balloonHand.visible = false;
    balloonHand.userData.balloon.material.color.setHex(balloonCols[game.balloons % 4]);
    balloonHand.position.z += (0 - balloonHand.position.z) * Math.min(1, 8 * dt);
  }
  if (game.weapon === 4) {
    const d = gatling.userData, dip = swapPhase < 0 ? 0 : Math.sin(Math.PI * swapPhase);   // lowered while a fresh bottle goes in
    gatHold.position.copy(GAT_REST); gatHold.position.y -= dip * .4;
    if (spraying) gatHold.position.add(tmpV.set(rand(-.004, .004), 0, rand(0, .012)));
    gatHold.rotation.x = -dip * .7;
    poseGatling();
  }
  // the bottle on every soaker shows the level, and plays the swap
  if (!(game.weapon === 3 && !driving && spraying)) updateVM(dt, spraying, swapPhase);
  updateDrops(dt); updateBalloons(dt);
}
function updateZombies(dt) {
  bossHud.update(zombies.find(z => z.isSergioBoss && z.state !== 'dying'));
  const navOn = fullSiteWorld() && blockers.length > 0 && inYard(player.pos.x, player.pos.z, -1);
  if (navOn) navUpdate(dt);
  for (const z of zombies.slice()) {
    // Pending rigs cannot move, attack invisibly, or enter the primitive gait path.
    if (z.modelPending) continue;
    const p = z.root.position;
    const floorY = distilleryLevel?.groundHeight(p.x, p.z, Math.max(.6, p.y + .35)) ?? 0;
    z.t += dt;
    if (FITTED_REVIEW && z.reviewClip && z.animMixer && z.state !== 'dying') {
      setZombieClip(z,z.reviewClip); z.animMixer.update(dt);
      if(z.reviewClip==='zombie_death')settleDeathAccessories(THREE,z.modelRoot,floorY);else resetDeathAccessories(z.modelRoot);
      if(z.headBone){z.root.updateMatrixWorld(true);z.headBone.getWorldPosition(z.headPosition);z.headshotY=z.headPosition.y+.04*z.body.scale.x;}
      continue;
    }
    z.flashT = Math.max(0, z.flashT - dt);
    const fl = z.flashT > 0 ? .9 : 0;
    z.mats.forEach(m => m.emissive.setScalar(fl));
    if (z.state === 'dying') {
      if (z.rigged) {
        z.animMixer.update(dt);
        settleDeathAccessories(THREE,z.modelRoot,floorY);
        if (z.t > z.deathDuration + 1) removeZombie(z);
      } else {
        z.visual?.fade(Math.min(1,z.t/1.8));
        z.body.rotation.x = -Math.min(1, z.t / .5) * Math.PI / 2;
        z.body.position.y = Math.min(1, z.t / .5) * .2 * z.body.scale.x;
        if (z.t > 1.1) p.y -= dt * 1.2;
        if (z.t > 2) removeZombie(z);
      }
      continue;
    }
    if (z.state === 'rise') {
      p.y = floorY + Math.min(0, -2 + z.t * 1.6);
      z.body.rotation.x = Math.sin(z.t * 9) * .08;
      if (z.animMixer) {
        setZombieClip(z, 'zombie_idle'); z.animMixer.update(dt);
        if (z.headBone) { z.root.updateMatrixWorld(true); z.headBone.getWorldPosition(z.headPosition); z.headshotY = z.headPosition.y + .04 * z.body.scale.x; }
      }
      if (Math.random() < dt * 20) burst(tmpV.set(p.x, .05, p.z), 1, '#4a2216', 1, 1);
      if (p.y >= floorY) { z.state = 'chase'; z.body.rotation.x = 0; }
      continue;
    }
    // steering
    let tx = player.pos.x, tz = player.pos.z;
    if (z.state === 'enter') {
      tx = z.gate.inn.x; tz = z.gate.inn.z;
      if (Math.hypot(p.x - tx, p.z - tz) < 1.5 || (fullSiteWorld() ? inYard(p.x, p.z, 2) : Math.max(Math.abs(p.x), Math.abs(p.z)) < HALF - 2)) z.state = 'chase';
    }
    const dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz) || 1;
    const toPlayer = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
    const inBuggy = buggy?.state === 'driving';
    const reach = 1.1 * z.body.scale.x + (inBuggy ? 1 : 0);
    // zombies hunt: they speed up when far away and when only a few are left
    const fewLeft = game.toSpawn + (game.alive || 0) <= 3 ? 1.5 : 1;
    const speed = z.speed * (1 + Math.min(game.wave, 15) * .025) * fewLeft * (z.state === 'chase' ? 1 + clamp((toPlayer - 10) / 20, 0, 1) * .9 : 1);
    let mx = dx / dist, mz = dz / dist;
    if (z.state === 'chase' && navOn) {
      // follow the flow field round walls; straight at the player only when close
      const nd = toPlayer > 1.6 ? navDir(p.x, p.z) : null;
      if (nd) { z.navX = (z.navX ?? nd[0]) + (nd[0] - (z.navX ?? nd[0])) * Math.min(1, 10 * dt); z.navZ = (z.navZ ?? nd[1]) + (nd[1] - (z.navZ ?? nd[1])) * Math.min(1, 10 * dt); const l = Math.hypot(z.navX, z.navZ) || 1; mx = z.navX / l; mz = z.navZ / l; }
      // still no progress (pinned in a crowd or cut off): come back in near the player
      z.checkT = (z.checkT ?? 1) - dt;
      if (z.checkT <= 0) {
        z.checkT = 1;
        const c = navCell(p.x, p.z), cut = c >= 0 && NAV.dist && !isFinite(NAV.dist[c]);
        if (toPlayer > reach + 1.5 && (cut || (z.lastTo !== undefined && z.lastTo - toPlayer < .3))) z.stuckN = (z.stuckN || 0) + 1; else z.stuckN = 0;
        z.lastTo = toPlayer;
        if (z.stuckN >= (cut ? 2 : 5)) reenterNearPlayer(z);
      }
    }
    if ((!z.isSergioBoss || !z.bossHitPending) && (toPlayer > reach || z.state === 'enter')) {
      p.x += mx * speed * dt; p.z += mz * speed * dt;
    }
    for (const o of zombies) {
      if (o === z || o.state === 'dying') continue;
      const ox = p.x - o.root.position.x, oz = p.z - o.root.position.z, d = Math.hypot(ox, oz), min = z.r + o.r;
      if (d > 0 && d < min) { p.x += ox / d * (min - d) * .5; p.z += oz / d * (min - d) * .5; }
    }
    if (z.state === 'chase') { pushOut(p, z.r, blockers); if (fullSiteWorld()) { p.x = clamp(p.x, OVEN_YARD.minX, OVEN_YARD.maxX); p.z = clamp(p.z, OVEN_YARD.minZ, OVEN_YARD.maxZ); } }
    if (buggy && buggy.state !== 'broken' && buggy.state !== 'driving') pushOutOfRzr(p,z.r);
    p.y = distilleryLevel?.groundHeight(p.x, p.z, Math.max(.6, p.y + .35)) ?? 0;
    const target = Math.atan2(mx, mz);
    let dy = target - z.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    z.yaw += dy * Math.min(1, 6 * dt); z.root.rotation.y = z.yaw;
    // animation
    if (z.animMixer) {
      const clip = z.attackT > .7 ? 'zombie_attack' : (z.state === 'chase' && toPlayer > 6 ? 'zombie_chase' : 'zombie_walk');
      setZombieClip(z, clip, clip === 'zombie_chase' ? speed / 4.03 : clip === 'zombie_walk' ? speed / 1.10 : 1);
      z.animMixer.update(dt);
      if (z.headBone) { z.root.updateMatrixWorld(true); z.headBone.getWorldPosition(z.headPosition); z.headshotY = z.headPosition.y + .04 * z.body.scale.x; }
    } else {
      z.phase += dt * speed * (z.isSergioBoss ? 1.65 : 2.6);
      const s = Math.sin(z.phase);
      const gait = z.isSergioBoss ? .34 : .6;
      z.legL.rotation.x = s * gait; z.legR.rotation.x = -s * gait;
      z.body.position.y = Math.abs(Math.cos(z.phase)) * (z.isSergioBoss ? .025 : .05);
      z.torso.rotation.z = s * (z.isSergioBoss ? .035 : .06); z.head.rotation.z = Math.sin(z.phase * .5) * (z.isSergioBoss ? .1 : .25) + .15;
    }
    // attack
    let bossAttack = null;
    const meleeClear = zombieCanMelee(z, reach);
    if (z.isSergioBoss) {
      bossAttack = tickBossMelee(z, dt, meleeClear);
    } else z.attackT = Math.max(0, z.attackT - dt);
    const lunge = z.attackT > .7 ? (1 - (z.attackT - .7) / .3) : 0;
    if(z.visual?.pose){
      if(z.character==='sergio')z.visual.pose(z.bossHitPending?2:z.state==='chase'?1:0);
      else if(z.character==='ken')z.visual.pose(z.attackT>.7?1:0);
    }
    if (!z.animMixer) {
      const guardPose = z.isSergioBoss ? -1.05 : -1.35;
      z.armL.rotation.x = guardPose + Math.sin(z.phase * .7) * .12 - lunge * .5;
      z.armR.rotation.x = guardPose - Math.sin(z.phase * .7) * .12 - lunge * .5;
    }
    if (meleeClear && (z.isSergioBoss ? bossAttack === 'hit' : z.attackT <= 0)) {
      if (!z.isSergioBoss) z.attackT = 1.0;
      if (game.invulnT > 0) {
        // zombie mode: the bite slides off and the zombie is shoved back
        p.addScaledVector(tmpV.set(p.x - player.pos.x, 0, p.z - player.pos.z).normalize(), 1.4);
        burst(tmpV2.copy(p).setY(1.2), 10, '#3dff4a', 2, 1.5);
      } else {
        player.hp -= inBuggy ? z.dmg / 2 : z.dmg; player.hurt = .5; sfx('hurt');
        if (!inBuggy) player.vel.addScaledVector(tmpV.set(player.pos.x - p.x, 0, player.pos.z - p.z).normalize(), 5);
        hud();
        if (player.hp <= 0) { player.hp = 0; gameOver(); return; }
      }
    }
    z.groanT -= dt;
    if (z.groanT <= 0) { z.groanT = rand(4, 10); sfx('groan', clamp(1 - toPlayer / 30, .05, 1)); }
  }
}
function updateWaves(dt) {
  const alive = zombies.filter(z => z.state !== 'dying').length;
  if (LOCAL_DIAGNOSTICS && PARAMS.has('sprayReview')) { game.alive = alive; return; }
  if (game.toSpawn > 0) {
    game.spawnT -= dt;
    const cap = Math.min(10 + game.wave * 2, 28);
    if (game.spawnT <= 0 && alive < cap) {
      game.toSpawn--;
      const brute = game.wave % 3 === 0 && game.toSpawn === 0;
      const runner = !brute && game.wave >= 3 && Math.random() < Math.min(.45, .1 + game.wave * .04);
      spawnZombie(brute ? 'brute' : runner ? 'runner' : 'walker');
      game.spawnT = Math.max(.3, 1.6 - game.wave * .1);
    }
  } else if (alive === 0) {
    if (game.breakT <= 0) {
      if (game.wave > 0) { const bonus = 250 * game.wave; game.score += bonus; game.spare = Math.min(VIVO.max, game.spare + 1); game.balloons = Math.min(BALLOON.max, game.balloons + 3); game.bonus = bonus; }
      game.breakT = game.breakLen = game.wave > 0 ? 5 : 2.5;
    }
    game.breakT -= dt;
    interlude(game.breakT > 0);
    if (game.breakT <= 0) nextWave();
  }
  game.alive = alive;
}
function updatePickups(dt) {
  if ((game.trailT = (game.trailT || 0) - dt) <= 0) { game.trailT = 1.5; trail.push(player.pos.clone()); if (trail.length > 160) trail.shift(); }
  if (game.wave >= 1 && !pickups.some(k => k.kind === 'zombie') && (game.zbT -= dt) <= 0) {
    const spots = trail.filter(p => { const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z); return d > 8 && d < 20; });
    if (spots.length) { dropPickup(spots[(Math.random() * spots.length) | 0], 'zombie'); game.zbT = rand(ZBOTTLE.min, ZBOTTLE.max); showBanner('Find the green light', 'Zombie bottle', 2.4); }
    else game.zbT = 3;
  }
  if (game.invulnT > 0) {
    game.invulnT = Math.max(0, game.invulnT - dt);
    setText('#zglow-t', String(Math.ceil(game.invulnT)));
    app.classList.toggle('zombie-ending', game.invulnT < 3);
    gloveMats.glove.emissiveIntensity = .3 + .15 * Math.sin(clock.elapsedTime * 9);
    if (game.invulnT === 0) zombieMode(false);
  }
  for (const k of pickups.slice()) {
    if (k.kind === 'weapon') { k.m.userData.halo.material.opacity = .55 + .3 * Math.sin(clock.elapsedTime * 3 + k.id); if (!k.still) k.m.rotation.y += dt * .7; }
    else { k.t -= dt; if(!k.still){k.m.rotation.y += dt * 2; k.m.position.y = .55 + Math.sin(k.t * 3) * .1;} }
    if (k.kind === 'zombie') k.m.userData.halo.material.opacity = .75 + .25 * Math.sin(k.t * 6);
    const d = Math.hypot(k.m.position.x - player.pos.x, k.m.position.z - player.pos.z);
    if (d < 1.3) {
      if (k.kind === 'weapon') {
        if(k.id===7)game.rpg=collectRPG(game.rpg,game.owned.has(7));
        game.owned.add(k.id); if (k.id === 1) game.balloons = Math.max(game.balloons, BALLOON.start + 3);
        swap(k.id, true); showBanner('Found', WEAPONS[k.id].name, 2); sfx('levelup');
      } else if (k.kind === 'zombie') { game.invulnT = ZBOTTLE.invuln; zombieMode(true); showBanner('Nothing can bite you for 10 seconds', 'Zombie mode', 2.4); sfx('levelup'); }
      else if (k.kind === 'health') player.hp = Math.min(100, player.hp + 30);
      else if (k.kind === 'bottle') game.spare = Math.min(VIVO.max, game.spare + 1);
      else game.balloons = Math.min(BALLOON.max, game.balloons + 3);
      sfx('pickup'); burst(k.m.position, k.kind === 'zombie' || k.kind === 'weapon' ? 40 : 16, k.kind === 'weapon' ? '#ffc34a' : k.kind === 'zombie' ? '#3dff4a' : k.kind === 'health' ? '#ff3d7f' : k.kind === 'bottle' ? '#bff4ef' : '#3cc6ff', 1.5, 2);
    }
    if (d < 1.3 || k.t <= 0) { scene.remove(k.m); k.m.userData.dispose?.(); pickups.splice(pickups.indexOf(k), 1); hud(true); }
  }
}

// ---------------- HUD ----------------
// ---------------- distillery minimap ----------------
const minimap = $('#minimap'), minimapPlayer = $('#minimap-player'), minimapToggle = $('#minimap-toggle'), minimapMode = $('#minimap-mode');
// shortcut: photographic perspective is approximate; recalibrate these three anchors after final world placement.
// World (x,z) -> image (u,v): ovens (-16,-26)->(.35,.57), north yard (0,-145)->(.47,.22), south gate (5,40)->(.49,.75).
const mapFlags = LOCAL_DIAGNOSTICS ? new URLSearchParams(location.search) : new URLSearchParams(), mapV74 = mapFlags.has('map-v74'), mapV75 = mapFlags.has('map-v75'), mapV76 = mapFlags.has('map-v76');
let map3D = mapFlags.has('map-3d') || (!mapFlags.has('legacy-map') && !mapV74 && !mapV75 && !mapV76);
const fullSiteMap = mapFlags.has('map-3d') || mapV76 || (!mapV74 && !mapV75 && !mapFlags.has('legacy-map'));
minimap.classList.toggle('full-site-map', fullSiteMap);
function setMinimapMode(use3D) {
  map3D = use3D;
  minimap.classList.toggle('map-3d', map3D);
  const image = minimap.querySelector('img'), heading = minimap.querySelector('.minimap-heading');
  if (map3D) image.src = './assets/minimap-distillery-wip-3d-v80.webp?art-review=20261025-map3d-v80';
  else if (fullSiteMap) image.src = './assets/minimap-distillery-v76-candidate.jpg?art-review=20261024-full-site-map-default';
  else if (mapV75) image.src = './assets/minimap-distillery-v75-candidate.jpg?art-review=20261024-map-v75';
  else if (mapV74) image.src = './assets/minimap-distillery-v74-candidate.jpg?art-review=20261024-map-v74';
  heading.querySelector('span').textContent = map3D ? 'Site model' : 'Distillery';
  heading.querySelector('b').hidden = map3D;
  minimapMode.textContent = map3D ? 'TACTICAL' : '3D VIEW';
  minimapMode.setAttribute('aria-label', map3D ? 'Switch to tactical map' : 'Switch to 3D site overview');
  $('#minimap-location').textContent = 'YOU · DISTILLERY';
}
setMinimapMode(map3D);
minimapMode.addEventListener('click', () => setMinimapMode(!map3D));
const MINIMAP = fullSiteMap ? { minX: -99, maxX: 99, minZ: -171, maxZ: 189,
  ux: 1/198, uz: 0, u0: .5,
  vx: 0, vz: 1/360, v0: 171/360 } : (mapV74 || mapV75) ? { minX: -40, maxX: 50, minZ: -170, maxZ: 40,
  ux: 1/157.5, uz: 0, u0: 73.75/157.5,
  vx: 0, vz: 1/210, v0: 170/210 } : { minX: -40, maxX: 50, minZ: -170, maxZ: 40,
  ux: .006914205344585091, uz: -.00007876230661040787, u0: .4585794655414908,
  vx: -.00047257383966244716, vz: .002877637130801688, v0: .6372573839662448 };
function minimapPosition(x, z) {
  if (map3D) return siteGpsPosition(x, z);
  return { u: MINIMAP.ux * x + MINIMAP.uz * z + MINIMAP.u0, v: MINIMAP.vx * x + MINIMAP.vz * z + MINIMAP.v0 };
}
function updateMinimap() {
  const driving = buggy?.state === 'driving';
  const rawX = driving ? buggy.x : player.pos.x, rawZ = driving ? buggy.z : player.pos.z;
  const x = clamp(rawX, MINIMAP.minX, MINIMAP.maxX), z = clamp(rawZ, MINIMAP.minZ, MINIMAP.maxZ);
  const p = minimapPosition(x, z);
  const dx = driving ? Math.sin(buggy.h) : -Math.sin(player.yaw);
  const dz = driving ? Math.cos(buggy.h) : -Math.cos(player.yaw);
  const view = minimap.querySelector('.minimap-view'), width = view.clientWidth || 186;
  const height = view.clientHeight || width * (map3D ? 4 / 3 : fullSiteMap ? 1400 / 768 : 4 / 3);
  const angle = gpsHeading(minimapPosition, x, z, dx, dz, width, height);
  minimapPlayer.style.left = `${clamp(p.u, .025, .975) * 100}%`;
  minimapPlayer.style.top = `${clamp(p.v, .025, .975) * 100}%`;
  minimapPlayer.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
  const tacoMarker = $('#minimap-tacos');
  tacoMarker.hidden = !tacoTruck;
  if (tacoTruck) {
    const tp = minimapPosition(tacoTruck.mapPoint.x, tacoTruck.mapPoint.z);
    tacoMarker.style.left = `${tp.u * 100}%`; tacoMarker.style.top = `${tp.v * 100}%`;
  }
  const outside = x !== rawX || z !== rawZ;
  minimapPlayer.classList.toggle('outside', outside);
  $('#minimap-location').textContent = outside ? 'YOU · SITE EDGE' : 'YOU · DISTILLERY';
}
function toggleMinimap() {
  const open = minimap.classList.toggle('expanded');
  minimapToggle.setAttribute('aria-expanded', String(open));
  minimapToggle.setAttribute('aria-label', open ? 'Close expanded distillery map' : 'Expand distillery map');
  $('#minimap-toggle-label').textContent = open ? 'M · CLOSE ↙' : 'M · MAP ↗';
}
minimapToggle.addEventListener('click', toggleMinimap);
addEventListener('keydown', e => {
  if (e.code === 'KeyM' && !e.repeat && e.target.tagName !== 'INPUT' && (game.state === 'play' || game.state === 'pause')) {
    e.preventDefault(); toggleMinimap();
  }
});


const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function hud(force) {
  updateMinimap();
  if (force) for (const k in hudCache) delete hudCache[k];
  const i = game.weapon, w = WEAPONS[i];
  const tankPct = Math.round(game.tank * 100);
  setText('#hud-score', game.score.toLocaleString());
  setText('#hud-wave', String(game.wave || 1));
  setText('#hud-left', String(game.toSpawn + game.alive));
  const tk = TANK_WEAPONS.has(i);
  setText('#hud-weapon', w.name);
  setText('#hud-ammo', i===7?game.rpg.loaded+' / '+game.rpg.reserve:tk ? tankPct + '%' : i === 1 ? String(game.balloons) : '∞');
  setText('#hud-reserve', i===7?'Muerto bottle rockets · '+(game.rpg.reload>0?'reloading':game.rpg.loaded?'ready':'empty'):tk ? (game.tank < .25 ? 'low pressure' : SKINS[skin].name) + ' · ' + game.spare + (game.spare === 1 ? ' spare bottle' : ' spare bottles') : i === 1 ? 'balloons' : 'hold to chop');
  $('#hud-ammo').parentElement.classList.toggle('low', i===7?game.rpg.loaded===0:tk ? game.tank < .25 : i === 1 && game.balloons === 0);
  $('#hud-tank').style.width = (i===7?(game.rpg.reload>0?100*(1-game.rpg.reload/RPG.reload):game.rpg.loaded*100):tankPct) + '%';
  setText('#hud-reload', i===7?'Loading Muerto bottle…':game.swapT > 0 ? 'Swapping bottle…' : 'Restocking Vivo at the barrel…');
  $('#hud-reload').classList.toggle('on', i===7?game.rpg.reload>0:game.refilling || game.swapT > 0);
  $('#hud-hp').style.width = Math.max(0, player.hp) + '%';
  $('#hud-veh').hidden = !buggy;
  if (buggy) {
    $('#hud-veh-bar').style.width = buggy.hp + '%';
    setText('#hud-veh-label', buggy.state === 'broken' ? 'RZR damaged · wave ' + nextBuggyWave() : 'RZR · two seats');
    $('#hud-veh').classList.toggle('broken', buggy.state === 'broken');
  }
  const driving = buggy?.state === 'driving';
  app.classList.toggle('driving', driving);
  setText('#hint', game.edgeT > 0 ? 'Hold the oven yard' : driving ? (TOUCH ? 'Stick to drive · Drag to look · Drive to get out' : 'W/S drive · A/D steer · Mouse to look · E to get out')
    : nearBuggy() ? (TOUCH ? 'Tap Drive to get in' : 'Press E to drive')
    : tk && game.tank < .3 && game.swapT <= 0 ? (game.spare > 0 ? (TOUCH ? 'Tap Fire when empty to swap bottles' : 'Press R to swap bottles') : 'Out of spare bottles · restock at a barrel') : '');
  $('#keyhint-drive').classList.toggle('on', !!(driving || nearBuggy()));
  if (TOUCH) {
    $('#t-drive').hidden = !(driving || nearBuggy());
    setText('#t-ammo', i===7?game.rpg.loaded+' / '+game.rpg.reserve:tk ? tankPct + '%' : i === 1 ? String(game.balloons) : '∞');
    setText('#t-spare', String(game.spare));
    setText('#t-balloons', String(game.balloons));
    $('#t-ammo').parentElement.classList.toggle('low', i===7?game.rpg.loaded===0:tk ? game.tank < .25 : i === 1 && game.balloons === 0);
    WEAPONS.forEach((w, n) => { const el = $('#t-slot-' + n); el.classList.toggle('on', n === i); el.hidden = !game.owned.has(n); });
    const art = 'url(assets/card-' + skin + '.webp)';
    if ($('#t-slot-art').style.backgroundImage !== art) {
      $('#t-slot-art').style.backgroundImage = art;
      $('#t-slot-art-r').style.backgroundImage = art; $('#t-slot-art-l').style.backgroundImage = 'url(assets/card-' + otherSkin() + '.webp)';
    }
    $('#t-reload').setAttribute('aria-label',i===7?'Reload rocket':'Swap Vivo bottle');
    $('#t-reload').classList.toggle('busy', i===7?game.rpg.reload>0:game.swapT > 0 || game.refilling);
    $('#t-reload').classList.toggle('low', i===7?game.rpg.loaded===0&&game.rpg.reserve>0:tk && game.tank < .25 && game.spare > 0);
  }
}

// ---------------- leaderboard ----------------
const prefs = { name: store.get('instagramHandle', '') };
async function api(path, body) {
  const init = body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(10000);
  let r;
  try { r = await fetch(API_BASE + path, init); }
  catch { const e = new Error('Cannot reach the global leaderboard.'); e.code = 'NETWORK'; throw e; }
  let data = null; try { data = await r.json(); } catch {}
  if (!r.ok || !data || data.scope !== 'shared') {
    const e = new Error(data?.error?.message || 'The global leaderboard is unavailable right now.');
    e.code = data?.error?.code || 'HTTP_' + r.status; throw e;
  }
  return data;
}
async function refreshBoard() {
  const board = $('#board'), note = $('#board-note');
  const paint=(rows,me)=>{
    board.innerHTML=Array.from({length:10},(_,k)=>{
      const r=rows[k];if(!r)return `<li class="vacant"><span class="rk">${k+1}</span><span class="board-avatar" aria-hidden="true"></span><span class="nm"><b>—</b></span><span class="sc">—</span></li>`;
      return `<li class="${me&&r.rank===me.rank?'me':''}"><span class="rk">${r.rank}</span><span class="board-avatar" aria-hidden="true">${esc(r.displayName.replace(/^@/,'').slice(0,1).toUpperCase())}</span><span class="nm"><b title="${esc(r.displayName)}">${esc(r.displayName)}</b><small>Wave ${r.bestWave} · ${r.kills} kills</small></span><span class="sc">${Number(r.bestScore).toLocaleString()}</span></li>`;
    }).join('');
    $('#player-rank').textContent=me?.rank>10?`Your rank #${me.rank} · ${Number(me.bestScore).toLocaleString()} points`:rows.length?'Best score per player':'Be the first to survive a night.';
  };
  if (RANKED) {
    try {
      const data = await api('/leaderboard?name=' + encodeURIComponent(prefs.name || 'guest'));
      const rows = (data.entries || []).slice(0, 10), me = data.player;
      $('#board-title').textContent = 'Top 10'; note.textContent = data.season.startsWith('beta-')?'Beta · global · player-submitted':'Global · player-submitted';
      paint(rows,me);return;
    } catch {}
  }
  const seenHandles=new Set();
  const local=store.get(LOCAL_SCORE_KEY,[]).filter(r=>{const handle=String(r.name).replace(/^@/,'').toLowerCase();if(seenHandles.has(handle))return false;seenHandles.add(handle);return true;}).slice(0,10);
  $('#board-title').textContent = 'Top 10';note.textContent='Global board offline · device scores';
  paint(local.map((r,k)=>({rank:k+1,displayName:r.name,bestScore:r.score,bestWave:r.wave,kills:r.kills})),null);
}

// ---------------- UI wiring ----------------
$('#name').value = prefs.name;
$('#name').addEventListener('input',()=>$('#name').setCustomValidity(''));
applySkin(skin);
for (const r of document.querySelectorAll('input[name="skin"]')) { r.checked = r.value === skin; r.addEventListener('change', () => r.checked && applySkin(r.value)); }
$('#start-form').addEventListener('submit', e => {
  e.preventDefault();
  const handle=$('#name').value.trim().replace(/^@/,'').toLowerCase();
  if(!/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(handle)||handle.length>30){$('#name').setCustomValidity('Enter a valid Instagram handle.');$('#name').reportValidity();return;}
  const name='@'+handle;$('#name').value=name;
  prefs.name = name; store.set('instagramHandle', name);
  startGame();
});
app.addEventListener('click', e => {
  const a = e.target.closest('[data-action]')?.dataset.action;
  if (a === 'resume') resume();
  else if (a === 'quit') quit();
  else if (a === 'again') startGame();
});

// Title screen: each soaker floats (CSS) and turns through Alex's views, one sheet of six per skin
// (left side, front three-quarter, front, right side, rear three-quarter / rear, back round to the left side)
const SPIN = { views: 6, hold: .75, turn: .3 }, stillSpin = matchMedia('(prefers-reduced-motion: reduce)').matches;
const spins = [...document.querySelectorAll('.spin')].map(el => {
  for (const l of el.children) Object.assign(l.style, { backgroundImage: `url(${el.dataset.sheet})`, backgroundSize: `${SPIN.views * 100}% 100%` });
  return { layers: [...el.children], i: 0, t: Math.random() * SPIN.hold };
});
let spinNow = 0;
function updateSpins() {
  // wall-clock time, so the turn keeps its pace even when the scene behind it runs slowly
  const now = performance.now() / 1000, dt = spinNow ? Math.min(.25, now - spinNow) : 0; spinNow = now;
  for (const s of spins) {
    if (!stillSpin) s.t += dt;
    if (s.t >= SPIN.hold + SPIN.turn) { s.t -= SPIN.hold + SPIN.turn; s.i = (s.i + 1) % SPIN.views; }
    // the view narrows as it turns away and the next one widens in
    const k = Math.max(0, (s.t - SPIN.hold) / SPIN.turn), e = k * k * (3 - 2 * k), [a, b] = s.layers;
    const pos = i => `${i / (SPIN.views - 1) * 100}% 0`;
    Object.assign(a.style, { backgroundPosition: pos(s.i), opacity: 1 - e, transform: `scaleX(${1 - .45 * e})` });
    Object.assign(b.style, { backgroundPosition: pos((s.i + 1) % SPIN.views), opacity: e, transform: `scaleX(${.55 + .45 * e})` });
  }
}

// ---------------- main loop ----------------
const clock = new THREE.Clock();
let titleT = 0;
const titlePointer = { x: 0, y: 0 }, titleLook = { x: 0, y: 0 };
let gatlingCapture = null;
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) addEventListener('pointermove', e => { if (game.state === 'title') { titlePointer.x = e.clientX / innerWidth * 2 - 1; titlePointer.y = e.clientY / innerHeight * 2 - 1; } }, { passive: true });
function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  const now = clock.elapsedTime;
  if (app.dataset.introPlaying === 'true') { requestAnimationFrame(frame); return; }
  if (game.state === 'play') {
    updateBuggy(dt); updatePlayer(dt); updateWeapon(dt); updateZombies(dt);
    if (game.state === 'play') { updateWaves(dt); updatePickups(dt); }
    hud();
  } else if (game.state === 'title') {
    // slow orbit over the courtyard behind the menu
    titleT += dt * .035;
    const k = 1 - Math.pow(1 - .05, dt * 60);
    titleLook.x += (titlePointer.x - titleLook.x) * k; titleLook.y += (titlePointer.y - titleLook.y) * k;
    camera.position.set(Math.sin(titleT) * 20, 6.5 - titleLook.y * 1.2, Math.cos(titleT) * 20);
    camera.lookAt(titleLook.x * 4, 1.5 - titleLook.y * 1.5, -6);
    updateSpins();
  } else if (game.state === 'zombie-review') {
    for (const z of zombies) if (z.animMixer) { setZombieClip(z, 'zombie_idle'); z.animMixer.update(dt); }
  } else if (game.state === 'over') {
    updateZombies(0);
    camera.position.y += (player.pos.y + .4 - camera.position.y) * Math.min(1, dt * 3);
    camera.rotation.z += (.5 - camera.rotation.z) * Math.min(1, dt * 3);
  }
  updateParticles(dt);
  updateAuthoredWeapons();
  tacoTruck?.update({dt, player, playing:game.state==='play', driving:buggy?.state==='driving', skin});
  for (const f of flickers) f.light.intensity = f.base * (.82 + Math.sin(now * 11 + f.seed) * .08 + Math.sin(now * 23.7 + f.seed * 3) * .06 + Math.random() * .06);
  for (const m of mists) { m.position.x += m.userData.v * dt; if (m.position.x > 70) m.position.x = -70; }
  hitmarkT = Math.max(0, hitmarkT - dt); $('#hitmarker').style.opacity = hitmarkT > 0 ? 1 : 0;
  $('#vignette').style.opacity = game.state === 'play' || game.state === 'over' ? Math.max(player.hurt * 1.6, player.hp < 35 ? .45 : 0) : 0;
  if (game.banner > 0) { game.banner -= dt; if (game.banner <= 0) $('#banner').classList.remove('on'); }
  distilleryLevel?.updateLighting(camera.position);
  buggy?.g.userData.setDriverViewActive?.(game.state === 'play' && buggy.state === 'driving');
  driverVM.update({ visible: game.state === 'play' && buggy?.state === 'driving', steer: -(buggy?.steer || 0), vehicle: buggy?.g, skin, dt, speed:buggy?.speed||0, action:game.shake>.15?'grip':null });
  boundaryFog?.update(dt);
  renderer.render(scene, camera);
  if (gatlingCapture) gatlingCapture(dt);
  requestAnimationFrame(frame);
}
setScreen('title'); refreshBoard();
requestAnimationFrame(frame);
{ const img = src => { const im = new Image(); im.src = src; return im.decode().catch(() => {}); };
  const tick = p => p.then(() => { LOAD.files.push({ l: 1.5e6, t: 1.5e6 }); loadReport(); });
  Promise.all([tick(loadZombieGLTF('ken')), dualVM.ready, driverVM.ready, newCoaVM.ready, authoredVM.ready, gatlingVM.ready, rpgVM.ready, newFieldProps.ready, sourceGlassProjectiles.ready,
    tick(preloadFittedZombieVariants(THREE,zombieGLTFLoader,loadZombieGLTF('ken'))),tick(preloadPhysicalDeath(THREE)),
    createTacoTruck({scene, blockers, parent:$('#hud'), groundHeight:(x,z,y)=>distilleryLevel?.groundHeight(x,z,y) ?? 0, onHeal:()=>{sfx('pickup');hud(true);}}).then(truck=>{tacoTruck=truck;}),
    RZR6 ? preloadRzr6().then(gltf => { rzr6GLTF = gltf; }) : null,
    ...Object.values(vmImgs).map(b => b.firstChild.decode().catch(() => {})),
    ...[...document.querySelectorAll('.spin')].map(e => img(e.dataset.sheet)),
    renderer.compileAsync ? renderer.compileAsync(scene, camera).catch(() => {}) : null])
    .then(() => window.__szLoader?.done()).catch(error => { console.error(error); window.__szLoader?.fail(error); }); }

// test hook for automated screenshots (no effect on normal play)
window.__siempreZombie = { placeWeapons, WEAPON_SPOTS, spotOK, kitGlass, glassHold, bottleHold, axeTool, coaHold, coaStrike, gatling, gatHold, dropPickup, pickups, trail, poseArm, poseGatling, GAT_REST, coaArms, coaGrip, gatArms, balloonHand, THREE, COA, blockers, tombs, barrels, GATES, render: () => renderer.render(scene, camera), game, player, zombies, startGame, spawnZombie, renderer, input, swap, swapBottle, gunRig, camera, keys, toggleDrive, spawnBuggy, get buggy() { return buggy; }, get pointerLockStatus() { return pointerLockStatus; }, get freeAim() { return freeAim; }, get touchMode() { return TOUCH; }, step: dt => { updateBuggy(dt); updatePlayer(dt); updateWeapon(dt); updateZombies(dt); if (game.state === 'play') { updateWaves(dt); updatePickups(dt); } } };

// Local-only asset fixture; normal Play keeps the original wave/pickup progression.
if (LOCAL_DIAGNOSTICS && (PARAMS.has('assetReview') || PARAMS.has('p01Review') || PARAMS.has('p02Review') || PARAMS.has('p03Review') || PARAMS.has('p04Review') || PARAMS.has('c02Review'))) {
  $('#interlude').style.display = 'none';
  const row = document.createElement('div');
  row.setAttribute('aria-label', 'Local asset review');
  row.className = 'asset-review-tools';
  row.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:90;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;background:#101514e8;padding:8px;max-width:90vw';
  pointerLockStatusNode = document.createElement('span');
  pointerLockStatusNode.id = 'review-pointer-status';
  pointerLockStatusNode.setAttribute('aria-live', 'polite');
  pointerLockStatusNode.style.cssText = 'font:12px system-ui;color:#fff;align-self:center';
  if (!PARAMS.has('p03Review')) row.append(pointerLockStatusNode);
  setPointerLockStatus(pointerLockStatus);
  function reviewStart() {
    // Temporary review unlock never changes aiming mode/sensitivity. Clicking the
    // game canvas requests normal pointer lock again when the browser supports it.
    suspendReviewPointer();
    if (game.state === 'title' || game.state === 'over') startGame(false);
    if (game.state === 'pause') resume(false);
    zombies.slice().forEach(removeZombie);
    game.breakT = game.breakLen = 99999;
    game.toSpawn = 0;
  }
  const actions = {
    'Sergio boss': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); zombies.slice().forEach(removeZombie); player.pos.set(0,0,6); player.yaw=player.pitch=0; player.hp=100; game.wave=3; spawnZombie('brute'); const boss=zombies.at(-1); boss.root.position.x=0; boss.root.position.z=-10; showBanner('Solo boss review', 'SERGIO CRUZ', 3); },
    'Ken artwork': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); zombies.slice().forEach(removeZombie); player.pos.set(0,0,6); player.yaw=player.pitch=0; player.hp=100; zombieVariantIndex=0; spawnZombie('walker'); const ken=zombies.at(-1); ken.root.position.set(0,0,1); ken.state='chase'; ken.speed=0; ken.dmg=0; },
    'Zombie lineup': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); zombies.slice().forEach(removeZombie); player.pos.set(0,0,6); player.yaw=player.pitch=0; player.hp=100; zombieVariantIndex=0; for(let i=0;i<ORIGINAL_ZOMBIE_ROSTER.length;i++){spawnZombie('walker');const z=zombies.at(-1);z.root.position.set((i-(ORIGINAL_ZOMBIE_ROSTER.length-1)/2)*1.65,0,-2);z.state='chase';z.speed=0;z.dmg=0;} },
    'Muerto RPG': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); game.owned.add(7);game.rpg=createRPGState();game.fireT=0;input.fire=input.firePressed=false;swap(7,true);player.pos.set(0,0,6);player.yaw=player.pitch=0;player.hp=100;zombieVariantIndex=0;for(let i=0;i<3;i++){spawnZombie('walker');const z=zombies.at(-1);z.root.position.set((i-1)*1.1,0,-4.5-(i%2)*.6);z.state='chase';z.speed=z.dmg=0;} },
    'Gatling': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); game.owned.add(4); game.tank=1; game.spare=2; input.fire=false; swap(4,true); const m=weaponPickup(4); m.position.set(player.pos.x+1.2,0,player.pos.z-2.5); scene.add(m); pickups.push({m,kind:'weapon',id:4,t:9999}); },
    'Dual pistols': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); game.owned.add(3); game.tank = 1; game.spare = 2; swap(3, true); },
    'Glass kit': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); input.fire = false; game.owned.add(5); game.tank = 1; game.glassLevel = 1; game.pourT = game.tossT = 0; swap(5,true); },
    'Blue balloons': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); input.fire = false; game.owned.add(1); game.balloons = 8; swap(1,true); },
    'New Coa': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); input.fire = false; game.owned.add(2); swap(2,true); },
    'New axe': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); input.fire = false; game.owned.add(6); swap(6,true); },
    'Taco truck': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); if (!tacoTruck) return; player.pos.set(tacoTruck.mapPoint.x-.8,0,tacoTruck.mapPoint.z); player.yaw=-Math.PI/2; player.pitch=0; player.hp=55; input.fire=false; },
    'Spray': () => { game.tank = 1; input.fire = true; },
    'Stop spray': () => { input.fire = false; },
    'Refill': () => { input.fire = false; game.tank = .4; game.spare = 2; swapBottle(); },
    'RZR': () => { reviewStart(); spawnBuggy(); player.pos.set(0, 0, 6); player.yaw = 0; player.pitch = -.1; if (buggy) { buggy.x = 0; buggy.z = 1.5; buggy.h = 0; } },
    'Enter / exit': () => { if (buggy?.state === 'parked') player.pos.set(buggy.x + 1.5, 0, buggy.z + .5); toggleDrive(); },
    'Drive forward': () => { if (buggy?.state === 'driving') { keys.KeyW = true; setTimeout(() => { keys.KeyW = false; }, 1200); } },
    'Steer left': () => { if (buggy?.state === 'driving') input.moveX = -1; },
    'Straight': () => { input.moveX = 0; },
    'Steer right': () => { if (buggy?.state === 'driving') input.moveX = 1; },
    'Boundary fog': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(); input.moveX = 0; player.pos.set(OVEN_YARD.maxX - 4, 0, 30); player.yaw = -Math.PI / 2; player.pitch = 0; },
    'Pause': pause,
  };
  if(FITTED_REVIEW){
    for(const [label,clip] of Object.entries({'Fitted idle':'zombie_idle','Fitted walk':'zombie_walk','Fitted chase':'zombie_chase','Fitted attack':'zombie_attack','Fitted death':'zombie_death'}))actions[label]=()=>{for(const z of zombies){z.reviewClip=clip;z.visual?.marker&&(z.visual.marker.visible=clip!=='zombie_death');}};
    actions['Record character motion']=()=>{
      actions['Zombie lineup']();
      const output=document.createElement('output');output.textContent='Preparing character motion recording…';row.append(output);
      function begin(){
        if(zombies.some(z=>z.modelPending)){requestAnimationFrame(begin);return;}
        const stream=canvas.captureStream(24),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
        const actors=[...zombies],started=performance.now();let falling=false;
        for(const z of actors)z.reviewClip='zombie_chase';
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const link=document.createElement('a');link.textContent='Download character motion';link.download='shared-character-motion.webm';link.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));row.append(link);output.textContent='Recorded actual renderer: shared chase → articulated fall → ground contact';};
        recorder.start();
        function sample(){const t=(performance.now()-started)/1000;
          if(t>=2.5&&!falling){falling=true;for(const z of actors){z.reviewClip='zombie_death';z.visual.marker.visible=false;}}
          if(t>=7){recorder.stop();return;}
          output.textContent=`Recording ${t.toFixed(1)}s · ${falling?'fall/settle':'shared chase'}`;requestAnimationFrame(sample);
        }requestAnimationFrame(sample);
      }begin();
    };
  }
  if(PARAMS.has('gatlingReview')){
    const result=document.createElement('output');result.id='gatling-motion-result';result.style.cssText='font:12px system-ui;color:white;padding:8px';row.append(result);
    actions['Vivo hands']=()=>applySkin('vivo');actions['Muerto hands']=()=>applySkin('muerto');
    actions['Record motion check']=()=>{
      reviewStart();clearHeldInput();game.shake=0;player.pos.set(0,0,6);player.vel.set(0,0,0);player.yaw=player.pitch=0;player.hp=100;
      game.owned.add(4);game.tank=1;game.spare=2;game.swapT=0;swap(4,true);
      const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;const cx=c.getContext('2d'),stream=c.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[],samples=[];
      const started=performance.now();let reloadStarted=false;
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const a=document.createElement('a');a.id='gatling-capture-download';a.textContent='Download motion recording';a.download='gatling-no-crank-'+skin+'.webm';a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.style.cssText='color:white;padding:8px;font:13px system-ui';row.append(a);};
      recorder.start();result.textContent='Recording actual game: fire → release → reload';
      gatlingCapture=()=>{
        const t=(performance.now()-started)/1000,n=samples.length;input.fire=n>=2&&n<14;
        if(n>=26&&!reloadStarted){reloadStarted=true;swapBottle();}
        cx.drawImage(renderer.domElement,0,0,c.width,c.height);
        const vm=gatlingVM.canvas,r=vm.getBoundingClientRect();if(!vm.hidden)cx.drawImage(vm,r.left,r.top,r.width,r.height);
        const data=vm.getContext('2d').getImageData(190,90,130,300).data;let hash=2166136261;for(let i=0;i<data.length;i+=37)hash=Math.imul(hash^data[i],16777619)>>>0;
        samples.push({t,n,hash,left:r.left,top:r.top,pose:vm.dataset.pose,tank:game.tank});
        if(n>=59){
          input.fire=false;gatlingCapture=null;recorder.stop();
          const steady=samples.filter(s=>s.n>=2&&s.n<26),hashes=new Set(steady.map(s=>s.hash)),xs=steady.map(s=>s.left),ys=steady.map(s=>s.top);
          const report={skin,frames:samples.length,steadyFrames:steady.length,warmupFrames:2,bodyImageVariants:hashes.size,horizontalJitter:Math.max(...xs)-Math.min(...xs),verticalJitter:Math.max(...ys)-Math.min(...ys),fired:steady.some(s=>s.pose==='firing-straight'),released:steady.some(s=>s.n>=18&&s.pose==='idle'),reload:samples.some(s=>s.pose==='reload-lowered')};
          result.textContent=JSON.stringify(report);result.dataset.result=JSON.stringify(report);result.dataset.samples=JSON.stringify(samples);
        }
      };
    };
  }
  const p01Actions = {
    'Start ground test': () => { actions.RZR(); clearHeldInput(); },
    'Recover fall': () => { reviewStart(); if (buggy?.state === 'driving') exitBuggy(true); clearHeldInput(); player.pos.y = -8; player.vy = -20; player.grounded = false; },
    'Enter / exit RZR': actions['Enter / exit'],
  };
  if (PARAMS.has('p01Review')) {
    row.setAttribute('aria-label', 'P01 floor and exit review');
    const status = document.createElement('span');
    status.id = 'p01-floor-status'; status.style.cssText = 'font:13px system-ui;color:#fff;align-self:center';
    row.append(status);
    function updateFloorStatus() {
      status.textContent = `P01 · feet ${player.pos.y.toFixed(2)} m · ${buggy?.state === 'driving' ? 'driving' : player.grounded ? 'grounded' : 'airborne'}`;
      requestAnimationFrame(updateFloorStatus);
    }
    updateFloorStatus();
  }
  const p02Actions = {
    'Start mouse test': () => { actions.RZR(); clearHeldInput(); },
    'Enter / exit RZR': actions['Enter / exit'],
  };
  if (PARAMS.has('p02Review')) {
    row.setAttribute('aria-label', 'P02 mouse look review');
    const status = document.createElement('span');
    status.id = 'p02-mouse-status'; status.style.cssText = 'font:13px system-ui;color:#fff;align-self:center';
    row.append(status);
    function updateMouseStatus() {
      status.textContent = `P02 · yaw ${(player.yaw * 180 / Math.PI).toFixed(0)}° · pitch ${(player.pitch * 180 / Math.PI).toFixed(0)}° · ${buggy?.state === 'driving' ? 'driving' : 'on foot'}`;
      requestAnimationFrame(updateMouseStatus);
    }
    updateMouseStatus();
  }
  const p03Actions = {
    'Reload game': () => location.reload(),
    'Test loading error': () => { const url = new URL(location.href); url.searchParams.delete('bootRetry'); url.searchParams.set('p03Failure','1'); location.assign(url.href); },
  };
  if (PARAMS.has('p03Review')) row.setAttribute('aria-label', 'P03 loading and retry review');
  function startScrollTest(bottleOnly = false) {
    actions.RZR(); clearHeldInput();
    game.owned = new Set(bottleOnly ? [5] : [5,3,1]);
    game.tank = 1; game.spare = 2; game.balloons = 8; swap(5,true);
  }
  const p04Actions = {
    'Start scroll test': () => startScrollTest(),
    'Bottle only': () => startScrollTest(true),
    'Enter / exit RZR': actions['Enter / exit'],
  };
  if (PARAMS.has('p04Review')) {
    row.setAttribute('aria-label', 'P04 scroll weapon review');
    const status = document.createElement('span');
    status.id = 'p04-weapon-status'; status.style.cssText = 'font:13px system-ui;color:#fff;align-self:center';
    row.append(status);
    function updateWeaponStatus() {
      status.textContent = `P04 · ${WEAPONS[game.weapon].name} · ${game.owned.size} owned`;
      requestAnimationFrame(updateWeaponStatus);
    }
    updateWeaponStatus();
  }
  const c02Actions = {
    'Start input test': () => { actions.RZR(); clearHeldInput(); game.owned.add(3); game.tank = 1; game.spare = 2; swap(3,true); },
    'Enter / exit RZR': actions['Enter / exit'],
  };
  if (PARAMS.has('c02Review')) {
    row.setAttribute('aria-label', 'C02 input release review');
    const status = document.createElement('span');
    status.id = 'c02-input-status'; status.style.cssText = 'font:13px system-ui;color:#fff;align-self:center';
    row.append(status);
    function updateInputStatus() {
      status.textContent = `C02 · ${game.state} · keys ${Object.values(keys).filter(Boolean).length} · fire ${input.fire ? 'on' : 'off'} · stick ${input.moveX.toFixed(1)},${input.moveY.toFixed(1)}`;
      requestAnimationFrame(updateInputStatus);
    }
    updateInputStatus();
  }
  for (const [label, action] of Object.entries(PARAMS.has('p01Review') ? p01Actions : PARAMS.has('p02Review') ? p02Actions : PARAMS.has('p03Review') ? p03Actions : PARAMS.has('p04Review') ? p04Actions : PARAMS.has('c02Review') ? c02Actions : actions)) {
    const button = document.createElement('button'); button.textContent = label;
    button.style.cssText = 'font:13px system-ui;padding:8px;color:#fff;background:#19352e;border:1px solid #87bdb0';
    button.onclick = event => { event.stopPropagation(); suspendReviewPointer(); action(); hud(true); };
    row.append(button);
  }
  if(PARAMS.has('rpgReview')){
    const status=document.createElement('output');status.id='rpg-review-status';status.style.cssText='color:#fff;font:13px system-ui;width:100%;text-align:center';row.append(status);
    function updateRPGReviewStatus(){status.textContent=`RPG · ${game.rpg.loaded} loaded · ${game.rpg.reserve} reserve · ${game.rpg.reload>0?'reloading':'ready'} · ${zombies.filter(z=>z.state!=='dying').length} live · ${zombies.filter(z=>z.state==='dying').length} falling · ${zombies.filter(z=>z.rigged).length} rigged · ${rpgRuntime.rockets.length} bottles · ${game.score} score`;requestAnimationFrame(updateRPGReviewStatus);}updateRPGReviewStatus();
  }
  document.body.append(row);
}









// Local interactive fixture: exercise the real weapon loop at chosen pressure.
if (LOCAL_DIAGNOSTICS && PARAMS.has('sprayReview')) {
  const row = document.createElement('div');
  row.setAttribute('aria-label', 'Spray review controls');
  row.style.cssText = 'position:fixed;bottom:4px;left:4px;right:4px;z-index:90;display:flex;gap:4px;justify-content:center;background:#07100fee;padding:4px';
  const actions = {
    'Start combat proof': () => {
      if (game.state !== 'zombie-review') return;
      game.state = 'play'; game.spare = 2; game.fireT = 0;
      setAim(false); swap(0, true); hud(true);
    },
    'Full spray': () => { game.tank = 1; input.fire = true; },
    'Low spray': () => { game.tank = .2; input.fire = true; },
    'Stop spray': () => { input.fire = false; },
  };
  for (const [label, action] of Object.entries(actions)) {
    const button = document.createElement('button');button.textContent = label;
    button.style.cssText = 'font:10px Arial;padding:8px;color:#fff;background:#19352e;border:1px solid #87bdb0';
    button.onclick = event => { event.stopPropagation(); suspendReviewPointer(); action(); hud(true); };
    row.append(button);
  }
  document.body.append(row);
}
