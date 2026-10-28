// Siempre Zombie: the starting kit's cognac glass (a snifter). Origin at the bottom of the bowl, +Y up.
// userData.setLevel(0..1) fills it; userData.rim is the pour/toss point.
export function createCognacGlass(THREE, { glass, liquid }) {
  const g = new THREE.Group(); g.name = 'cognac-glass';
  const V = (x, y) => new THREE.Vector2(x, y);
  // bowl: wide belly, narrowing to the rim
  const bowl = [V(0, 0), V(.022, .002), V(.04, .016), V(.05, .04), V(.048, .064), V(.04, .085), V(.032, .1)];
  const outer = new THREE.Mesh(new THREE.LatheGeometry(bowl, 30), glass); outer.renderOrder = 2; g.add(outer);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.032, .0016, 6, 30), glass); lip.rotation.x = Math.PI / 2; lip.position.y = .1; g.add(lip);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.0045, .006, .05, 10), glass); stem.position.y = -.025; g.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.036, .038, .004, 26), glass); foot.position.y = -.052; g.add(foot);
  // liquid: the lower belly of the bowl, scaled up from the bottom as it fills
  const fill = [V(0, .002), V(.02, .004), V(.037, .016), V(.0465, .04), V(.0465, .04), V(0, .04)];
  const pool = new THREE.Mesh(new THREE.LatheGeometry(fill, 24), liquid); pool.renderOrder = 1; g.add(pool);
  g.userData = {
    pool, rim: new THREE.Vector3(0, .1, 0),
    setLevel(l) { pool.visible = l > .02; pool.scale.set(.6 + .4 * Math.min(1, l), Math.max(.02, l), .6 + .4 * Math.min(1, l)); },
  };
  g.userData.setLevel(0);
  return g;
}
