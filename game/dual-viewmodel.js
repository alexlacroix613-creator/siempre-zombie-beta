// Wide poses extend sleeves past the viewport instead of exposing atlas-cell cuts.
export function createDualViewmodel(parent) {
  const images=Object.fromEntries(['vivo','muerto'].map(skin=>[skin,['ready','reload'].map(pose=>{
    const image=new Image();image.src=new URL('./assets/dual-'+skin+'-'+pose+'-alpha.png',import.meta.url).href;return image;
  })]));
  const ready=Promise.all(Object.values(images).flat().map(async image=>{
    await image.decode();
    if(image.naturalWidth!==1672||image.naturalHeight!==941)throw new Error('Dual uniform pose dimensions changed');
  }));
  const canvas = document.createElement('canvas');
  canvas.width = 1672; canvas.height = 941;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;pointer-events:none;max-width:none';
  canvas.hidden = true; parent.append(canvas);
  const ctx = canvas.getContext('2d');
  let scale = 1, left = 0, top = 0, pose = -1, lastSkin='', swayX = 0, swayY = 0;
  function layout() {
    // Measured intersection of both barrel axes sits at the reticle.
    scale = Math.max(innerWidth / (2 * 836), innerHeight / (2 * (941 - 348))) * 1.035;
    left = innerWidth / 2 - 836 * scale;
    top = innerHeight / 2 - 348 * scale;
    Object.assign(canvas.style, { width: 1672 * scale + 'px', height: 941 * scale + 'px', left: left + 'px', top: top + 'px' });
  }
  layout(); addEventListener('resize', layout);
  return {
    ready,
    hide() { canvas.hidden = true; },
    update({ reloading=false, phase=0, x=0, y=0, skin='vivo' }={}) {
      canvas.hidden = false;
      const next = reloading && phase >= .12 && phase <= .9 ? 1 : 0;
      const selectedSkin=skin==='muerto'?'muerto':'vivo',image=images[selectedSkin][next];
      if ((pose !== next||lastSkin!==selectedSkin) && image.complete && image.naturalWidth) {
        ctx.clearRect(0, 0, 1672, 941);
        ctx.drawImage(image, 0, 0, 1672, 941);
        pose = next;lastSkin=selectedSkin;canvas.dataset.skin=selectedSkin;
      }
      swayX = x; swayY = y;
      canvas.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    },
    muzzle(which) {
      // The upper tubes are cartridges. Emit only from the lower barrel outlets.
      const p = which === 2 ? [716, 405] : [956, 405];
      return [left + p[0] * scale + swayX, top + p[1] * scale + swayY];
    },
    dispose() {removeEventListener('resize',layout);canvas.remove();},
  };
}
