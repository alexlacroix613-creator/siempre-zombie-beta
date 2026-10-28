import * as THREE from './vendor/three.module.min.js';

// Use RGB from Alex's unchanged original reference. The generated companion is
// used solely as transparency; its regenerated vehicle pixels are never shown.
export async function createTacoTruckPhoto(reference) {
  const mask=new Image();mask.src=new URL('./assets/taco-truck-three-view-alpha.png',import.meta.url).href;await mask.decode();
  const ends=new Image();ends.src=new URL('./assets/taco-truck-front-back-generated.png',import.meta.url).href;await ends.decode();
  if(reference.naturalWidth!==1536||reference.naturalHeight!==1024||mask.naturalWidth!==1536||mask.naturalHeight!==1024)throw new Error('Unexpected taco truck source or mask size');
  const frames=[[0,522,4.6,408],[521,527,5.5,360],[1050,486,4.6,404]].map(([x,w,worldWidth,bottom])=>{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=450;const ctx=canvas.getContext('2d');
    ctx.drawImage(reference,x,0,w,450,0,0,w,450);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,x,0,w,450,0,0,w,450);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return{texture,worldWidth,height:worldWidth*450/w,bottom};
  });
  if(ends.naturalWidth!==2172||ends.naturalHeight!==724)throw new Error('Unexpected taco truck front/rear sheet size');
  for(const x of [0,1086]){
    const canvas=document.createElement('canvas');canvas.width=1086;canvas.height=724;
    canvas.getContext('2d').drawImage(ends,x,0,1086,724,0,0,1086,724);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    frames.push({texture,worldWidth:5,height:5*724/1086,bottom:667/724*450});
  }
  const material=new THREE.SpriteMaterial({map:frames[0].texture,transparent:true,depthWrite:false,toneMapped:false});
  const sprite=new THREE.Sprite(material);sprite.name='Taco truck — original supplied image';let current=-1;
  function update(player,site){
    const dx=player.pos.x-site.x,dz=player.pos.z-site.z;
    const index=Math.abs(dx)<Math.abs(dz)*.35?(dz>=0?3:4):dx>=0?1:dz>=0?0:2;
    if(index===current)return;current=index;const f=frames[index];material.map=f.texture;material.needsUpdate=true;
    sprite.scale.set(f.worldWidth,f.height,1);sprite.position.set(0,f.height*(f.bottom/450-.5),0);
  }
  return {sprite,update,dispose(){material.dispose();frames.forEach(f=>f.texture.dispose());}};
}
