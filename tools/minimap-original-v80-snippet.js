const minimap = $('#minimap'), minimapPlayer = $('#minimap-player'), minimapToggle = $('#minimap-toggle'), minimapMode = $('#minimap-mode');
// shortcut: photographic perspective is approximate; recalibrate these three anchors after final world placement.
// World (x,z) -> image (u,v): ovens (-16,-26)->(.35,.57), north yard (0,-145)->(.47,.22), south gate (5,40)->(.49,.75).
const mapFlags = new URLSearchParams(location.search), mapV74 = mapFlags.has('map-v74'), mapV75 = mapFlags.has('map-v75'), mapV76 = mapFlags.has('map-v76');
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
  $('#minimap-location').textContent = map3D ? 'FIXED 3D OVERVIEW' : 'YOU · DISTILLERY';
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
  return { u: MINIMAP.ux * x + MINIMAP.uz * z + MINIMAP.u0, v: MINIMAP.vx * x + MINIMAP.vz * z + MINIMAP.v0 };
}
function updateMinimap() {
  const x = clamp(player.pos.x, MINIMAP.minX, MINIMAP.maxX), z = clamp(player.pos.z, MINIMAP.minZ, MINIMAP.maxZ);
  const p = minimapPosition(x, z), dx = -Math.sin(player.yaw), dz = -Math.cos(player.yaw);
  // Convert world-facing direction through the map projection into CSS pixel space.
  const mapHeightToWidth = fullSiteMap ? 1400 / 768 : 4 / 3;
  const angle = Math.atan2(MINIMAP.ux * dx + MINIMAP.uz * dz, -(MINIMAP.vx * dx + MINIMAP.vz * dz) * mapHeightToWidth);
  minimapPlayer.style.left = `${clamp(p.u, .025, .975) * 100}%`;
  minimapPlayer.style.top = `${clamp(p.v, .025, .975) * 100}%`;
  minimapPlayer.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
  const outside = x !== player.pos.x || z !== player.pos.z;
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

