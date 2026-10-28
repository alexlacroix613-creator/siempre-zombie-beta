// Native generated frames from Alex's taco and glove references; no placeholder UI.
export async function createTacoEatingView(parent) {
  const images = {};
  await Promise.all(['vivo','muerto'].map(async skin => {
    const image = new Image(); image.src = new URL('./assets/taco-eating/'+skin+'.png',import.meta.url).href;
    await image.decode();
    if (image.naturalWidth!==1536 || image.naturalHeight!==1024) throw new Error('Invalid taco-eating sheet: '+skin);
    images[skin]=image;
  }));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.hidden=true;canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',right:'0',bottom:'0',pointerEvents:'none',zIndex:'25',transformOrigin:'right bottom'});parent.append(canvas);
  const ctx=canvas.getContext('2d');let previous='';
  return {
    update({visible=false,progress=0,skin='vivo'}={}) {
      canvas.hidden=!visible;if(!visible)return;
      const p=Math.max(0,Math.min(1,progress));
      // Skip the isolated close-up whose left edge is cut. Move the intact taco
      // toward the mouth, then show the two actual bite states and empty hand.
      const frame=p<.18?0:p<.44?1:p<.64?3:p<.83?4:5;
      const variant=skin==='muerto'?'muerto':'vivo',key=variant+':'+frame;
      if(key!==previous){const sx=(frame%3)*512,sy=Math.floor(frame/3)*512+(frame>=3?2:0),h=frame>=3?510:512;ctx.clearRect(0,0,512,512);ctx.drawImage(images[variant],sx,sy,512,h,0,0,512,512);previous=key;}
      const size=Math.min(innerHeight*.65,innerWidth*.85),lift=p<.44?Math.sin(Math.PI*Math.min(1,p/.44))*0.1:0;
      // Keep the sleeve anchored to the bottom edge while bringing the taco
      // toward the mouth; translating the entire image exposed a cut cuff.
      canvas.style.width=size+'px';canvas.style.height=size+'px';canvas.style.transform=`scale(${1+lift})`;
      canvas.dataset.pose=String(frame);canvas.dataset.skin=variant;
    },
    dispose(){canvas.remove();}
  };
}
