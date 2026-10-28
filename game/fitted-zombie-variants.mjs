// Staged source-faithful character parts. Root owns visual acceptance and copying.
const asset = path => new URL(path, import.meta.url).href;
export const FITTED_ZOMBIE_VARIANTS = Object.freeze(Object.fromEntries(
  ['dan', 'rick', 'alex', 'monica', 'keith', 'sergio'].map(name => [name, {
    body: asset(`./assets/characters/fitted-20261028/${name}/body_albedo.png?v=source-final28`),
    head: asset(`./assets/characters/fitted-20261028/${name}/head.glb?v=source-final28`),
  }]),
));
export const FITTED_ZOMBIE_ROSTER = Object.freeze(['ken','monica','dan','alex','rick','keith']);
const BODY_MATERIAL = 'Ken baked observed source PBR.001';
const HEAD_MATERIAL = 'Ken intact head calibrated original source atlas';
const SAMPLER_FIELDS = ['wrapS','wrapT','minFilter','magFilter','anisotropy','generateMipmaps','channel'];
let loaded = null;
let promise = null;
export function isOriginalHeadMesh(mesh) {
  return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).some(m => m.name === HEAD_MATERIAL);
}
export function preloadFittedZombieVariants(THREE, gltfLoader, basePromise) {
  if (promise) return promise;
  const textureLoader = new THREE.TextureLoader();
  promise = Promise.all([basePromise, ...Object.entries(FITTED_ZOMBIE_VARIANTS).map(async ([name, paths]) => {
    const [body, head] = await Promise.all([textureLoader.loadAsync(paths.body), gltfLoader.loadAsync(paths.head)]);
    return [name, {body, head}];
  })]).then(([base, ...entries]) => {
    let sourceMap;
    base.scene.traverse(node => {
      if (!node.isMesh) return;
      for (const m of Array.isArray(node.material) ? node.material : [node.material]) if (m.name === BODY_MATERIAL) sourceMap = m.map;
    });
    if (!sourceMap) throw new Error('Approved common body albedo map missing');
    for (const [, resources] of entries) {
      for (const field of SAMPLER_FIELDS) resources.body[field] = sourceMap[field];
      resources.body.flipY = false;
      resources.body.colorSpace = THREE.SRGBColorSpace;
      resources.body.needsUpdate = true;
    }
    loaded = new Map(entries);
    return loaded;
  }).catch(error => { loaded = null; promise = null; throw error; });
  return promise;
}
export function cloneFittedBodyMaterials(name, materials) {
  if (name === 'ken') return materials.map(m => m.clone());
  const resources = loaded?.get(name);
  if (!resources) throw new Error(`Fitted character ${name} was not preloaded`);
  return materials.map(source => {
    const copy = source.clone();
    if (source.name === BODY_MATERIAL) { copy.map = resources.body; copy.needsUpdate = true; }
    return copy;
  });
}
export function cloneFittedHead(name) {
  if (name === 'ken') return null;
  const resources = loaded?.get(name);
  if (!resources) throw new Error(`Fitted head ${name} was not preloaded`);
  const head = resources.head.scene.clone(true);
  head.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    // Actor material collection clones once, after attaching this head.
  });
  return head;
}
