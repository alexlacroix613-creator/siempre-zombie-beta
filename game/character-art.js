import * as THREE from './vendor/three.module.min.js';

// Exact supplied RGB. Ken and Sergio use generated alpha only; the four
// turnaround sheets already have transparency. Frames are cropped at runtime.
const configs={
  ken:{sheet:'ken.png',mask:'ken-alpha.png',frames:[[0,0,512,489],[1024,512,512,500]]},
  monica:{sheet:'monica.png',frames:[[62,0,320,875]]},
  dan:{sheet:'dan.png',frames:[[24,0,348,937]]},
  alex:{sheet:'alex.png',frames:[[12,0,351,937]]},
  rick:{sheet:'rick.png',frames:[[7,0,379,1024]]},
  sergio:{sheet:'sergio.png',mask:'sergio-alpha.png',frames:[[0,0,512,500],[0,512,512,512],[512,512,512,512],[1024,512,512,512]]},
};
const directory=new URL('./assets/character-originals/',import.meta.url);
const load=async name=>{const image=new Image();image.src=new URL(name,directory).href;await image.decode();return image;};
export async function loadCharacterArtwork(){
  const sheets={};
  await Promise.all(Object.entries(configs).map(async([name,c])=>{
    const [original,mask,motion]=await Promise.all([load(c.sheet),c.mask?load(c.mask):null,c.motion?load(c.motion):null]);
    const makeFrame=(source,matte,[x,y,w,h])=>{
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
      ctx.drawImage(source,x,y,w,h,0,0,w,h);
      if(matte){ctx.globalCompositeOperation='destination-in';ctx.drawImage(matte,x,y,w,h,0,0,w,h);}
      const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return{tex,aspect:w/h};
    };
    sheets[name]=c.frames.map(box=>makeFrame(original,mask,box));
    if(motion)sheets[name].push(...c.motionFrames.map(box=>makeFrame(motion,null,box)));
  }));
  let labelTexture;
  function label(){if(!labelTexture){const c=document.createElement('canvas');c.width=256;c.height=72;const x=c.getContext('2d');x.fillStyle='rgba(7,18,14,.85)';x.roundRect(38,6,180,56,12);x.fill();x.font='bold 38px Arial';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#f4f3df';x.fillText('Ken',128,35);labelTexture=new THREE.CanvasTexture(c);labelTexture.colorSpace=THREE.SRGBColorSpace;}return labelTexture;}
  return {create(name,scale=1){
    const frames=sheets[name];if(!frames)throw new Error('Missing source character '+name);
    const material=new THREE.SpriteMaterial({map:frames[0].tex,transparent:true,depthWrite:false,alphaTest:.035,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.position.y=-.025*scale;sprite.name='Original art: '+name;
    let current=-1;const h=1.92*scale;
    function pose(index){index=Math.max(0,Math.min(frames.length-1,index));if(index===current)return;current=index;const f=frames[index];material.map=f.tex;material.needsUpdate=true;sprite.scale.set(h*f.aspect,h,1);}
    pose(0);let marker=null;
    if(name==='ken'){marker=new THREE.Sprite(new THREE.SpriteMaterial({map:label(),transparent:true,depthWrite:false,toneMapped:false}));marker.scale.set(.88*scale,.25*scale,1);marker.position.set(0,2.05*scale,0);}
    return {sprite,marker,pose,fade(t){material.opacity=Math.max(0,1-t);if(marker)marker.material.opacity=Math.max(0,1-t);},dispose(){material.dispose();marker?.material.dispose();}};
  }};
}
