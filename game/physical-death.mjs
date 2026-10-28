// Separate shared physical death animation. The approved GLB is never modified.
const dataUrl = new URL('./assets/characters/physical-death-v1.json', import.meta.url).href;
let data = null;
let pending = null;
const clips = new Map();

function validateData(candidate) {
  if (candidate?.schemaVersion !== 1 || candidate.boneCount !== 69 || candidate.name !== 'zombie_death') throw new Error('Physical death data has the wrong rig contract');
  const times = candidate.times;
  if (!Array.isArray(times) || times.length < 2 || times[0] !== 0 || Math.abs(times.at(-1) - candidate.duration) > 1e-5) throw new Error('Physical death time range invalid');
  if (times.some((t, i) => !Number.isFinite(t) || (i > 0 && t <= times[i - 1]))) throw new Error('Physical death times must increase');
  for (const [name, overrides] of Object.entries(candidate.variants || {})) {
    const tracks = [...candidate.common, ...overrides];
    if (tracks.length !== 69 || new Set(tracks.map(t => t.nodeIndex)).size !== 69) throw new Error(`${name} physical death must bind 69 unique bones`);
    for (const track of tracks) {
      for (const [field, width] of [['positions',3],['rotations',4],['scales',3]]) {
        if (track[field]?.length !== times.length * width || !track[field].every(Number.isFinite)) throw new Error(`${name} ${track.nodeName} ${field} malformed`);
      }
      for (let i = 0; i < track.rotations.length; i += 4) {
        if (Math.abs(Math.hypot(...track.rotations.slice(i, i + 4)) - 1) > 1e-3) throw new Error(`${name} ${track.nodeName} rotation not normalized`);
      }
    }
  }
  return candidate;
}

export function preloadPhysicalDeath(THREE) {
  if (pending) return pending;
  const loader = new THREE.FileLoader();
  loader.setResponseType('json');
  pending = loader.loadAsync(dataUrl).then(candidate => { data = validateData(candidate); return data; }).catch(error => { pending = null; data = null; clips.clear(); throw error; });
  return pending;
}

export function createPhysicalDeathClip(THREE, gltf, variant) {
  if (!data) throw new Error('Physical death data was not preloaded');
  if (!Object.hasOwn(data.variants, variant)) throw new Error(`No physical death head support for ${variant}`);
  const cacheKey = `${gltf.scene.uuid}:${variant}`;
  if (clips.has(cacheKey)) return clips.get(cacheKey);
  const nodes = new Map();
  gltf.scene.traverse(node => {
    const index = gltf.parser.associations.get(node)?.nodes;
    if (Number.isInteger(index)) nodes.set(index, node);
  });
  const tracks = [];
  for (const source of [...data.common, ...data.variants[variant]]) {
    const node = nodes.get(source.nodeIndex);
    if (!node?.isBone || gltf.parser.json.nodes[source.nodeIndex]?.name !== source.nodeName) throw new Error(`Physical death bone mismatch: ${source.nodeName}`);
    tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, data.times, source.positions));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, data.times, source.rotations));
    tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.scale`, data.times, source.scales));
  }
  const clip = new THREE.AnimationClip('zombie_death', data.duration, tracks);
  clips.set(cacheKey, clip);
  return clip;
}

export function physicalDeathEvidence() {
  return data ? { ready: true, duration: data.duration, frames: data.times.length, bones: data.boneCount, variants: Object.keys(data.variants), approvedSourceSha256: data.approvedSourceSha256 } : { ready: false };
}
