import {containSleeveCuts} from './held-frame-layout.js';

// Authored viewmodel, using the same transparent-image path as the other weapons.
// World views retain the approved source RGB; only edge-connected studio pixels are cleared.
export function createGatlingSourceViews(T,parent){
  const load=file=>{const i=new Image();i.src=new URL('./assets/gatling-source/'+file,import.meta.url).href;return i;};
  const original=load('approved-original.png'),forward=load('forward-fire.png');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.hidden=true;
  canvas.setAttribute('aria-hidden','true');canvas.dataset.weapon='gatling';
  Object.assign(canvas.style,{position:'absolute',pointerEvents:'none',maxWidth:'none'});parent.append(canvas);
  const ctx=canvas.getContext('2d'),textures=[],pickups=new Set();
  let loaded=false,disposed=false,left=0,top=0,size=512,frame=0,selected='vivo',lastPaint='',motionX=0,motionY=0;
  const ready=Promise.all([original,forward].map(i=>i.decode())).then(()=>{
    if(disposed)return;
    if(forward.naturalWidth!==1536||forward.naturalHeight!==1024)throw new Error('Gatling atlas dimensions changed');
    // Original panels have unequal boundaries. Never sample across their separators.
    const panels=[[0,0,512,482],[512,0,566,482],[1079,0,457,482],[0,483,568,541],[569,483,406,541]];
    for(const [x,y,w,h] of panels){
      const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(original,x,y,w,h,0,0,w,h);
      const pixels=cx.getImageData(0,0,w,h),a=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
      const push=p=>{if(seen[p])return;seen[p]=1;const k=p*4,max=Math.max(a[k],a[k+1],a[k+2]),min=Math.min(a[k],a[k+1],a[k+2]);if(max-min<17&&max<173){queue[tail++]=p;a[k+3]=0;}};
      for(let xx=0;xx<w;xx++){push(xx);push((h-1)*w+xx);}for(let yy=1;yy<h-1;yy++){push(yy*w);push(yy*w+w-1);}
      while(head<tail){const p=queue[head++],xx=p%w,yy=Math.floor(p/w);if(xx)push(p-1);if(xx<w-1)push(p+1);if(yy)push(p-w);if(yy<h-1)push(p+w);}
      cx.putImageData(pixels,0,0);
      const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
    }
    loaded=true;for(const p of pickups)p.material.map=textures[0];canvas.dataset.source='approved-six-view-plus-native-held-frames';
  });
  function layout(){
    // One camera and one scale for idle, spin-up, firing, spin-down and reload.
    // The discarded high-hand column has an internal sleeve cut; use the two bottom-exiting poses.
    size=Math.min(innerHeight*.68,innerWidth*.94);
    left=innerWidth*.5-264/512*size;
    top=innerHeight*.5-70/512*size;
    ({top}=containSleeveCuts({viewportWidth:innerWidth,viewportHeight:innerHeight,left,top,width:size,height:size,sourceWidth:512,sourceHeight:512,leftCutY:500,rightCutY:480,motionX,motionY}));
    Object.assign(canvas.style,{width:size+'px',height:size+'px',left:(left+motionX)+'px',top:(top+motionY)+'px'});
  }
  function update({visible=false,skin='vivo',spin=0,firing=false,reload=-1,bob=0,moving=0}={}){
    if(disposed)return;canvas.hidden=!(visible&&loaded);if(canvas.hidden)return;
    selected=skin==='muerto'?'muerto':'vivo';
    // Alex removed the cranking mechanic. Idle/fire/release use one registered pose.
    frame=0;
    motionX=Math.cos(bob)*3*moving;
    motionY=Math.abs(Math.sin(bob))*3*moving+(reload>=0?Math.sin(reload*Math.PI)*innerHeight*.72:0);
    layout();const key=selected+':'+frame;if(key!==lastPaint){ctx.clearRect(0,0,512,512);if(selected==='muerto')ctx.drawImage(forward,0,536,512,488,0,60,512,488);else ctx.drawImage(forward,0,0,512,512,0,0,512,512);lastPaint=key;}
    canvas.dataset.skin=selected;canvas.dataset.pose=reload>=0?'reload-lowered':firing?'firing-straight':'idle';
  }
  // Far end of the six-barrel assembly, not the metal rear crank spindle at y360.
  // Muerto source nozzle y588 - crop y536 + registration 60 = Vivo source nozzle y112.
  const muzzle=()=>[left+motionX+264/512*size,top+motionY+112/512*size];
  function pickup(){
    const g=new T.Group();g.name='Gatling approved source views';const mat=new T.SpriteMaterial({map:textures[0]||null,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false});
    const sprite=new T.Sprite(mat);sprite.scale.set(.85,.85,1);sprite.position.y=.46;g.add(sprite);pickups.add(sprite);
    const pos=new T.Vector3(),view=new T.Vector3(),q=new T.Quaternion();
    sprite.onBeforeRender=(renderer,scene,camera)=>{
      if(!loaded)return;g.getWorldPosition(pos);view.copy(camera.position).sub(pos);g.getWorldQuaternion(q);view.applyQuaternion(q.invert());
      const yaw=Math.atan2(view.x,-view.z),a=Math.abs(yaw);const index=a<.42?2:a<1.12?0:a<2.08?1:a<2.72?3:4;
      mat.map=textures[index];const image=mat.map.image;sprite.scale.set(.85,.85*image.height/image.width,1);sprite.position.y=sprite.scale.y*.5+.09;
      g.userData.sourceView=index;
    };
    g.userData.dispose=()=>{pickups.delete(sprite);mat.dispose();};return g;
  }
  addEventListener('resize',layout);
  return{canvas,ready,update,muzzle,pickup,hide(){canvas.hidden=true;},dispose(){disposed=true;removeEventListener('resize',layout);canvas.remove();textures.forEach(t=>t.dispose());for(const p of pickups)p.material.dispose();pickups.clear();}};
}
