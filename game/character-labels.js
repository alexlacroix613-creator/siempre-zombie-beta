// Small, consistent names above the shared character rigs.
export function createCharacterLabels(THREE) {
  const textures = new Map();
  return function label(name, scale = 1) {
    if (!textures.has(name)) {
      const c = document.createElement('canvas'); c.width = 384; c.height = 80;
      const x = c.getContext('2d'); x.font = '600 34px Arial';
      const width = Math.min(360, x.measureText(name).width + 36);
      x.fillStyle = 'rgba(6,16,12,.72)'; x.roundRect((384-width)/2, 8, width, 64, 10); x.fill();
      x.fillStyle = '#edf1da'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 192, 40);
      const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; textures.set(name, texture);
    }
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({map:textures.get(name), transparent:true, depthWrite:false, toneMapped:false}));
    marker.scale.set(1.05*scale, .22*scale, 1); marker.position.y = 2.03*scale;
    return {marker, dispose(){marker.material.dispose();}};
  };
}
