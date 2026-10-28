import * as THREE from './vendor/three.module.min.js';

// Restore the original v80 oblique site-model composition using the current loaded GLB.
// Geometry and materials are shared with the game; only the render target is temporary.
export function buildSiteMap({ renderer, world, environment }) {
  const scene = new THREE.Scene();
  scene.background = null;
  scene.environment = environment || null;
  if (environment) scene.environmentIntensity = .32;

  const model = world.clone(true);
  model.updateMatrixWorld(true);
  scene.add(model);

  const bounds = new THREE.Box3();
  model.traverse(object => {
    if (!object.isMesh || !object.visible || object.name.startsWith('col_') || object.name.startsWith('grave_')) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  if (bounds.isEmpty()) throw new Error('No visible distillery geometry for site map');

  const centre = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const width = 768, height = 1024, aspect = width / height, padding = 1.06;
  const cameraHeight = Math.max(size.x, size.y, size.z) * 1.6 + 20;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, cameraHeight * 3 + size.y + 100);
  // South-facing oblique camera reveals roofs, walls and terrain depth; north remains at the top.
  camera.position.set(centre.x, centre.y + cameraHeight, centre.z + cameraHeight * .62);
  camera.lookAt(centre.x, centre.y, centre.z);
  camera.updateMatrixWorld(true);
  const viewBounds = new THREE.Box3(), corner = new THREE.Vector3();
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    viewBounds.expandByPoint(corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  }
  const viewSize = viewBounds.getSize(new THREE.Vector3());
  const halfHeight = Math.max(viewSize.y / 2, viewSize.x / (2 * aspect)) * padding;
  const halfWidth = halfHeight * aspect;
  const viewCentre = viewBounds.getCenter(new THREE.Vector3());
  Object.assign(camera, { left: viewCentre.x - halfWidth, right: viewCentre.x + halfWidth,
    top: viewCentre.y + halfHeight, bottom: viewCentre.y - halfHeight });
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const ambient = new THREE.HemisphereLight(0xf0efe6, 0x716351, 2.25);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffefd6, 2.5);
  sun.position.set(centre.x - 90, bounds.max.y + cameraHeight * .8, centre.z + 70);
  sun.target.position.copy(centre);
  sun.castShadow = true;
  const span = Math.max(size.x, size.z) * .65;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: .1, far: cameraHeight + size.y + 100 });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -.0003;
  scene.add(sun, sun.target);

  const target = new THREE.WebGLRenderTarget(width, height);
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const oldTarget = renderer.getRenderTarget();
  const oldViewport = renderer.getViewport(new THREE.Vector4());
  const oldScissor = renderer.getScissor(new THREE.Vector4());
  const oldScissorTest = renderer.getScissorTest();
  const oldExposure = renderer.toneMappingExposure;
  const oldAutoClear = renderer.autoClear;
  const oldClearColor = renderer.getClearColor(new THREE.Color()).clone();
  const oldClearAlpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(width * height * 4);
  try {
    renderer.setRenderTarget(target);
    renderer.setScissorTest(false);
    renderer.setClearColor(0x25251f, 0);
    renderer.toneMappingExposure = 1;
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  } finally {
    renderer.setRenderTarget(oldTarget);
    renderer.setViewport(oldViewport);
    renderer.setScissor(oldScissor);
    renderer.setScissorTest(oldScissorTest);
    renderer.toneMappingExposure = oldExposure;
    renderer.autoClear = oldAutoClear;
    renderer.setClearColor(oldClearColor, oldClearAlpha);
    target.dispose();
    sun.shadow.map?.dispose();
  }

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const image = context.createImageData(width, height), stride = width * 4;
  for (let y = 0; y < height; y++) image.data.set(pixels.subarray((height - 1 - y) * stride, (height - y) * stride), y * stride);
  context.putImageData(image, 0, 0);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (image.data[(y * width + x) * 4 + 3] <= 12) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) throw new Error('Rendered site map is fully transparent');
  const contentWidth = maxX - minX + 1, contentHeight = maxY - minY + 1;
  const padX = Math.max(16, Math.round(contentWidth * .035)), padY = Math.max(20, Math.round(contentHeight * .025));
  const cropX = Math.max(0, minX - padX), cropY = Math.max(0, minY - padY);
  const cropWidth = Math.min(width, maxX + padX + 1) - cropX;
  const cropHeight = Math.min(height, maxY + padY + 1) - cropY;
  const cropped = document.createElement('canvas');
  cropped.width = cropWidth; cropped.height = cropHeight;
  cropped.getContext('2d').drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const point = new THREE.Vector3();
  return {
    url: cropped.toDataURL('image/webp', .9),
    width: cropWidth,
    height: cropHeight,
    aspect: cropWidth / cropHeight,
    bounds: { minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z },
    project(x, z, y = 0) {
      point.set(x, y, z).project(camera);
      const rawX = ((point.x + 1) / 2) * width, rawY = ((1 - point.y) / 2) * height;
      return { u: (rawX - cropX) / cropWidth, v: (rawY - cropY) / cropHeight };
    },
  };
}
