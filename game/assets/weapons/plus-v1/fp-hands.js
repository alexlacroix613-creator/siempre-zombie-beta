// Siempre Zombie: first-person gloved hand, matched to the teal gloves in Alex's painted soaker plates.
// The hand closes around a handle that runs along local +Y through the origin; the palm sits on +Z
// (toward the player) and the fingers wrap round the front. `grip` is the handle radius in metres,
// `wrap` how far the fingers close (1 = a full fist round a shaft, ~.45 = cupping a balloon).
export function createGloveMaterials(THREE) {
  return {
    glove: new THREE.MeshPhysicalMaterial({ color: 0x17a8a2, roughness: .62, sheen: 1, sheenRoughness: .45, sheenColor: new THREE.Color(0x8ff3ea), clearcoat: .05 }),
    panel: new THREE.MeshPhysicalMaterial({ color: 0xece2cb, roughness: .7, sheen: .6, sheenColor: new THREE.Color(0xffffff) }),
    seam: new THREE.MeshStandardMaterial({ color: 0x0c6f6b, roughness: .8 }),
  };
}

export function createGlove(THREE, mats, { side = 1, grip = .019, wrap = 1, thumbOver = true } = {}) {
  const hand = new THREE.Group(); hand.name = 'glove';
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); hand.add(m); return m;
  };
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  // palm and back of the hand: a soft wedge behind the handle, thicker at the heel
  const palmZ = grip + .017;
  add(sphere, mats.glove, side * .004, -.004, palmZ, 0, 0, 0, .041, .05, .021);
  add(sphere, mats.glove, side * .006, -.038, palmZ + .002, 0, 0, 0, .036, .028, .022);          // heel of the hand
  add(sphere, mats.panel, side * .004, .004, palmZ + .0165, -.08, 0, 0, .026, .032, .005);       // cream back panel
  // four fingers: each is three tapering segments that bend round the handle, knuckle to tip
  const fingerY = [.03, .01, -.01, -.029], fingerLen = [.95, 1, .93, .78], fingerR = [.0098, .0102, .0098, .0086];
  for (let f = 0; f < 4; f++) {
    const r = fingerR[f], ring = grip + r * .95, y = fingerY[f], L = fingerLen[f];
    // phalanx lengths in metres, laid round the handle; on a ~2 cm shaft the three close about 190 degrees
    // like a real fist, on a big balloon the same fingers only cup it
    const arcs = [.044 * L, .028 * L, .022 * L].map(v => v / ring * wrap);
    let ang = Math.PI * .5 - .25;
    add(sphere, mats.glove, -side * Math.cos(ang) * ring, y, Math.sin(ang) * ring + .003, 0, 0, 0, r * 1.3, r * 1.15, r * 1.25);   // knuckle
    for (let s = 0; s < 3; s++) {
      const a0 = ang, a1 = ang + arcs[s]; ang = a1;
      const p0 = new THREE.Vector3(-side * Math.cos(a0) * ring, y, Math.sin(a0) * ring), p1 = new THREE.Vector3(-side * Math.cos(a1) * ring, y, Math.sin(a1) * ring);
      const rr = r * (1 - s * .09), len = p0.distanceTo(p1);
      const seg3 = new THREE.Mesh(new THREE.CapsuleGeometry(rr, Math.max(.001, len - rr * .3), 4, 10), mats.glove);
      seg3.position.copy(p0).add(p1).multiplyScalar(.5); seg3.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()); hand.add(seg3);
      if (s < 2) add(sphere, mats.glove, p1.x, p1.y, p1.z, 0, 0, 0, rr * 1.08, rr * 1.08, rr * 1.08);   // joint
    }
  }
  // seam on the back of the fingers' base
  add(new THREE.TorusGeometry(grip + .021, .0016, 6, 24, Math.PI * .5), mats.seam, 0, .001, 0, Math.PI / 2, 0, Math.PI * .27);
  // thumb: two segments from the side of the palm, over the index finger
  const tb = new THREE.Vector3(side * (grip + .012), .032, grip + .012);
  const tm = thumbOver ? new THREE.Vector3(side * (grip * .55), .05, -grip * .2) : new THREE.Vector3(side * (grip + .016), .052, .004);
  const tt = thumbOver ? new THREE.Vector3(-side * grip * .25, .052, -grip - .004) : new THREE.Vector3(side * (grip + .008), .064, -.014);
  for (const [a, b, r] of [[tb, tm, .0112], [tm, tt, .0098]]) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, a.distanceTo(b), 4, 10), mats.glove);
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); hand.add(m);
  }
  add(sphere, mats.glove, side * (grip + .012), .018, grip + .016, 0, 0, 0, .016, .024, .016);   // thumb muscle
  // cuff band at the wrist (the sleeve itself is the host's)
  add(new THREE.CylinderGeometry(.034, .036, .026, 18), mats.glove, side * .004, -.066, palmZ - .002, .12, 0, 0);
  add(new THREE.CylinderGeometry(.0365, .0375, .007, 18), mats.panel, side * .004, -.075, palmZ - .003, .12, 0, 0);
  hand.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  hand.userData.wrist = new THREE.Vector3(side * .004, -.08, palmZ - .004);
  return hand;
}
