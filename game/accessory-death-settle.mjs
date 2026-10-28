// Decorative long hair settles against the floor after bone animation.
// Bind geometry/UVs stay untouched; each runtime instance gets its own clone.
const states = new WeakMap();
export function settleDeathAccessories(THREE, root, floorY = 0) {
  let parts = states.get(root);
  if (!parts) {
    parts = [];
    root.traverse(mesh => {
      if (!mesh.isMesh || mesh.isSkinnedMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!materials.some(m => m?.name?.includes('source-silhouette curved hair volume'))) return;
      const originalGeometry = mesh.geometry;
      const geometry = originalGeometry.clone();
      mesh.geometry = geometry;
      parts.push({mesh, geometry, originalGeometry, rest: geometry.attributes.position.array.slice()});
    });
    states.set(root, parts);
  }
  if (!parts.length) return;
  root.updateWorldMatrix(true, true);
  const point = new THREE.Vector3(), inverse = new THREE.Matrix4();
  for (const part of parts) {
    const {mesh, geometry, rest} = part;
    if (part.lastMatrix?.equals(mesh.matrixWorld) && part.lastFloor === floorY) continue;
    part.lastMatrix = mesh.matrixWorld.clone();
    part.lastFloor = floorY;
    const position = geometry.attributes.position;
    position.array.set(rest);
    inverse.copy(mesh.matrixWorld).invert();
    for (let i = 0; i < position.count; i++) {
      point.fromArray(rest, i * 3).applyMatrix4(mesh.matrixWorld);
      if (point.y < floorY + .001) {
        point.y = floorY + .001;
        point.applyMatrix4(inverse);
        position.setXYZ(i, point.x, point.y, point.z);
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }
}
export function resetDeathAccessories(root) {
  const parts = states.get(root);
  if (!parts) return;
  for (const part of parts) {
    const {geometry, rest} = part;
    part.lastMatrix = null;
    geometry.attributes.position.array.set(rest);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }
}
export function disposeDeathAccessories(root) {
  const parts = states.get(root);
  if (!parts) return;
  for (const {mesh, geometry, originalGeometry} of parts) {
    if (mesh.geometry === geometry) mesh.geometry = originalGeometry;
    geometry.dispose();
  }
  states.delete(root);
}
