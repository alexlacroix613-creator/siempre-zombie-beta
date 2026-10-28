// Siempre Zombie: the Vivo Gatling, a hand-cranked toy soaker with six Siempre Vivo bottles as its barrels.
// Local axes: +Y up, -Z toward the target, origin at the rear (trigger) grip. Same cream / teal / lavender
// toy palette as the Vivo Soaker in Alex's paintings. The host passes its own materials so both match.
export function createVivoGatling(THREE, { cream, teal, lav, metal, glass, blanco, label }) {
  const g = new THREE.Group(); g.name = 'vivo-gatling';
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const cyl = (p, r1, r2, len, m, x, y, z, seg = 20) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), m); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); p.add(o); return o; };
  // body: a rounded cream receiver with a teal top rail and a lavender trigger
  cyl(g, .06, .066, .15, cream, 0, .02, -.01, 28);
  cyl(g, .066, .066, .016, teal, 0, .02, -.085, 28);
  cyl(g, .066, .066, .016, teal, 0, .02, .065, 28);
  box(.03, .02, .26, teal, 0, .102, -.06);
  const grip = box(.042, .12, .055, teal, 0, -.085, .045); grip.rotation.x = -.28;
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.03, .007, 6, 14, Math.PI), cream); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, -.05, .0); g.add(guard);
  box(.014, .034, .016, lav, 0, -.055, -.004).rotation.x = .25;
  // foregrip under the front of the body, where the support hand goes
  box(.032, .09, .036, teal, 0, -.075, -.12).rotation.x = .12;
  // carry handle on top
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.055, .011, 8, 20, Math.PI), teal); handle.position.set(0, .11, -.09); handle.rotation.y = Math.PI / 2; g.add(handle);
  // rotor: six Vivo bottles round a teal hub, necks forward; spins when firing
  const rotor = new THREE.Group(); rotor.position.set(0, .02, -.16); g.add(rotor);
  cyl(rotor, .028, .028, .36, teal, 0, 0, -.16, 18);
  for (const z of [-.02, -.3]) cyl(rotor, .082, .082, .014, cream, 0, 0, z, 30);
  const R = .055;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R;
    const b = new THREE.Group(); b.position.set(x, y, -.15); b.rotation.z = a - Math.PI / 2; rotor.add(b);
    cyl(b, .024, .024, .2, glass, 0, 0, 0, 16);
    const liq = cyl(b, .02, .02, .19, blanco, 0, 0, 0, 12); liq.renderOrder = -1;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.0245, .0245, .12, 18, 1, true, -Math.PI * .45, Math.PI * .9), label);
    l.rotation.x = -Math.PI / 2; l.position.z = .01; b.add(l);
    cyl(b, .012, .024, .025, glass, 0, 0, -.112, 12);
    cyl(b, .01, .01, .04, glass, 0, 0, -.14, 10);
    cyl(b, .012, .012, .012, teal, 0, 0, -.165, 12);       // nozzle cap
  }
  // front ring and a crank on the side
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.083, .009, 8, 32), teal); ring.position.set(0, .02, -.47); g.add(ring);
  const crank = new THREE.Group(); crank.position.set(.08, .02, -.03); g.add(crank);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.012, .07, .012), metal); arm.position.y = -.03; crank.add(arm);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .03, 10), lav); knob.rotation.z = Math.PI / 2; knob.position.set(.016, -.064, 0); crank.add(knob);
  g.userData = {
    rotor, crank,
    muzzle: new THREE.Vector3(0, .02, -.49),
    gripPrimary: new THREE.Vector3(0, -.075, .05),     // rear hand on the trigger grip
    gripSupport: new THREE.Vector3(0, -.085, -.12),     // front hand on the foregrip
  };
  return g;
}
