// Siempre Zombie: a harvested agave piña (leaves trimmed off by the jimador), origin on the ground.
export function createPina(THREE) {
  const g = new THREE.Group(); g.name = 'pina';
  const flesh = new THREE.MeshStandardMaterial({ color: 0xb9a66a, roughness: .8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x6f8a5c, roughness: .75 });
  const cut = new THREE.MeshStandardMaterial({ color: 0xd8c690, roughness: .85 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(.32, 16, 12), skin); core.scale.set(1, .82, 1); core.position.y = .26; g.add(core);
  // the trimmed leaf bases: short flat-topped stubs all over, cut faces pale
  const stub = new THREE.CylinderGeometry(.05, .075, .1, 6);
  const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 46; i++) {
    const y = 1 - (i + .5) / 46 * 1.7, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    dir.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const m = new THREE.Mesh(stub, i % 3 ? flesh : skin);
    m.position.set(dir.x * .3, .26 + dir.y * .25, dir.z * .3); m.quaternion.setFromUnitVectors(up, dir); g.add(m);
    const c = new THREE.Mesh(new THREE.CircleGeometry(.05, 6), cut); c.position.set(0, .051, 0); c.rotation.x = -Math.PI / 2; m.add(c);
  }
  return g;
}
