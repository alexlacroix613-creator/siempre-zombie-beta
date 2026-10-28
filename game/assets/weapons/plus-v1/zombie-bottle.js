// Siempre Zombie: the rare glowing bottle. A Siempre bottle wearing the "SIEMPRE ZOMBIE!" sticker that
// Keith and friends made for the Vivo + Muerto bundle, filled with glowing green. Origin at the base.
export function createZombieBottle(THREE, labelTex) {
  const g = new THREE.Group(); g.name = 'zombie-bottle';
  const lathe = (pts, m) => { const o = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28), m); g.add(o); return o; };
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfffe8, roughness: .08, transmission: .55, transparent: true, opacity: .55, thickness: .02, depthWrite: false });
  const glow = new THREE.MeshStandardMaterial({ color: 0x5dff6a, emissive: 0x3dff4a, emissiveIntensity: 2.4, roughness: .3 });
  const cap = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .55 });
  const profile = [[0, 0], [.08, 0], [.085, .01], [.085, .3], [.07, .36], [.03, .42], [.028, .5], [0, .5]];
  const liquid = lathe(profile.map(([r, y]) => [r * .9, Math.min(y, .4) * .98 + .006]), glow);
  lathe(profile, glass).renderOrder = 2;
  const capM = new THREE.Mesh(new THREE.CylinderGeometry(.031, .031, .09, 20), cap); capM.position.y = .52; g.add(capM);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.0865, .0865, .19, 28, 1, true, -Math.PI * .42, Math.PI * .84),
    new THREE.MeshStandardMaterial({ map: labelTex, roughness: .6, emissive: 0xffffff, emissiveMap: labelTex, emissiveIntensity: .35 }));
  label.position.y = .17; label.renderOrder = 3; g.add(label);
  g.userData = { liquid, glow };
  return g;
}
