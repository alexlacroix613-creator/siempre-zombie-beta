// Siempre Zombie: a jimador's axe, found stuck in a harvested piña by the ovens.
// Local axes like the Coa: +Y up, -Z toward the target, origin at the rear-hand grip.
export function createAxe(THREE) {
  const g = new THREE.Group(); g.name = 'axe';
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: .7 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb4bcc4, roughness: .38, metalness: .35 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xf2f5f7, roughness: .25, metalness: .4 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x1fb3ad, roughness: .55 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.016, .02, .82, 12), wood); handle.rotation.x = -Math.PI / 2; handle.position.z = -.33; g.add(handle);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .12, 12), wrap); grip.rotation.x = -Math.PI / 2; grip.position.z = .0; g.add(grip);
  // head: an eye round the handle and a wedge blade hanging below, edge down for the chop
  const head = new THREE.Group(); head.position.z = -.7; g.add(head);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(.045, .06, .07), steel); head.add(eye);
  const s = new THREE.Shape(); s.moveTo(-.035, .02); s.lineTo(.035, .02); s.lineTo(.06, -.13); s.quadraticCurveTo(0, -.16, -.06, -.13); s.lineTo(-.035, .02);
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .004, bevelSegments: 1 }), steel);
  blade.rotation.y = Math.PI / 2; blade.position.set(-.006, -.02, 0); head.add(blade);
  const bit = new THREE.Mesh(new THREE.BoxGeometry(.008, .012, .118), edge); bit.position.set(0, -.15, 0); head.add(bit);
  const poll = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, .05), steel); poll.position.y = .045; head.add(poll);
  const primary = new THREE.Object3D(); primary.name = 'grip_primary'; g.add(primary);
  const support = new THREE.Object3D(); support.name = 'grip_support'; support.position.z = -.24; g.add(support);
  g.userData = { gripPrimary: primary, gripSupport: support, head, aimAxis: new THREE.Vector3(0, 0, -1) };
  return g;
}
