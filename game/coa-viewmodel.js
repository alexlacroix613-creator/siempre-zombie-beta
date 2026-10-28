// Native pose-key prototype from THIS chat's sheet12 edge-mounted Coa design.
// Two authored stills; not a skeletal or frame-complete animation. See asset provenance.
import {containSleeveCuts} from './held-frame-layout.js';
export function createCoaViewmodel(parent, { skin: initialSkin = 'vivo' } = {}) {
  const canvas=document.createElement('canvas');canvas.width=1254;canvas.height=735;
  canvas.setAttribute('aria-hidden','true');canvas.hidden=true;
  Object.assign(canvas.style,{position:'absolute',pointerEvents:'none',maxWidth:'none'});
  parent.append(canvas);const ctx=canvas.getContext('2d'),images={};
  for(const name of ['vivo','muerto']){const image=new Image();image.src=new URL('./assets/coa-new-sheet/'+(name==='muerto'?'poses-muerto.png':'poses-native.png'),import.meta.url).href;images[name]=image;}
  let disposed=false,pose=-1,selectedSkin=initialSkin;
  function setSkin(name){if(!images[name])throw new Error('Unknown operator skin: '+name);if(name!==selectedSkin)pose=-1;selectedSkin=name;if(canvas.dataset)canvas.dataset.skin=name;}
  setSkin(initialSkin);
  const ready=Promise.all(Object.values(images).map(image=>image.decode().then(()=>{
    if(image.naturalWidth!==1254||image.naturalHeight!==1254)throw new Error('New Coa atlas dimensions changed');
  })));
  function layout(x=0,y=0){
    const scale=Math.min(innerWidth*1.06/1254,innerHeight*1.1/735);
    const frame=containSleeveCuts({viewportWidth:innerWidth,viewportHeight:innerHeight,left:innerWidth/2-1254*scale/2,top:innerHeight-735*scale+innerHeight*.18,width:1254*scale,height:735*scale,sourceWidth:1254,sourceHeight:735,leftCutY:668,rightCutY:618,motionX:x,motionY:y});
    Object.assign(canvas.style,{width:frame.width+'px',height:frame.height+'px',left:frame.left+'px',top:frame.top+'px'});
  }
  const resize=()=>layout();layout();addEventListener('resize',resize);
  return {canvas,ready,setSkin,get skin(){return selectedSkin;},
    update({visible=false,swingPhase=0,x=0,y=0,skin=selectedSkin}={}){
      setSkin(skin);const image=images[selectedSkin];
      if(disposed)return;
      canvas.hidden=!visible;
      if(!visible)return;
      const next=swingPhase>=.30&&swingPhase<=.66?1:0;
      if(next!==pose&&image.complete&&image.naturalWidth){
        ctx.clearRect(0,0,1254,735);
        // Provider returned unequal pose rows. Preserve scale: lower pose is vertically placed, never stretched.
        if(next===0)ctx.drawImage(image,0,0,1254,735,0,0,1254,735);
        else ctx.drawImage(image,0,740,1254,514,0,221,1254,514);
        pose=next;
      }
      canvas.style.transform=`translate(${x}px,${y}px)`;
      layout(x,y);
    },
    hide(){canvas.hidden=true;},
    dispose(){if(disposed)return;disposed=true;removeEventListener('resize',resize);canvas.remove();},
  };
}
