// Source-authored operator variants. Wide glass frames extend real sleeves to viewport edges.
import {createSourceVivoCompositor,SOURCE_VIVO_REVISION} from './source-vivo-compositor.js';
import {containSleeveCuts} from './held-frame-layout.js';
export function createAuthoredWeaponViews(parent,{skin:initialSkin='vivo'}={}){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.hidden=true;
  canvas.setAttribute('aria-hidden','true');Object.assign(canvas.style,{position:'absolute',pointerEvents:'none',maxWidth:'none'});parent.append(canvas);
  const ctx=canvas.getContext('2d'),variants={vivo:{},muerto:{}},all=[];
  const load=file=>{const image=new Image();image.src=new URL('./assets/new-held-weapons/'+file,import.meta.url).href;all.push(image);return image;};
  const sourceImages=[];const extra=file=>{const i=new Image();i.src=new URL('./assets/source-vivo/'+file,import.meta.url).href;sourceImages.push(i);return i;};
  const official=extra('official-front.png'),labelAngle=extra('official-three-quarter-right.jpg'),relight=extra('glass-optics-native.png'),holdMask=extra('hold-hand-mask-native.png'),pourMask=extra('pour-hand-mask-native.png'),flickMask=extra('flick-hand-mask-native.png'),vivoSleeve=extra('pour-sleeve-vivo-native.png'),muertoSleeve=extra('pour-sleeve-muerto-native.png');
  const sourceReady=Promise.all([...sourceImages.map(i=>i.decode()),fetch(new URL('./assets/source-vivo/sleeve-registration.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Vivo source registration unavailable');return r.json();})]).then(values=>({registration:values.at(-1)}),error=>({error}));
  for(const name of ['vivo','muerto']){
    for(const key of ['balloon','axe'])variants[name][key]=load(key+(name==='muerto'?'-muerto':'')+'-alpha.png');
    variants[name].glass={};for(const state of ['empty','full','pour','flick','release'])variants[name].glass[state]=load(`glass-wide-${state}-${name}.png`);
  }
  let selectedSkin=initialSkin,activeWeapon=0,size=512,left=0,top=0,width=512,height=512,disposed=false,glassState='full',lastGlassFrame=null;
  function setSkin(name){if(!variants[name])throw new Error('Unknown operator skin: '+name);selectedSkin=name;canvas.dataset.skin=name;}
  setSkin(initialSkin);
  const ready=Promise.all(all.map(i=>i.decode())).then(async()=>{
    const originals={vivo:variants.vivo.glass,muerto:variants.muerto.glass},originalImages=[...Object.values(variants.vivo.glass),...Object.values(variants.muerto.glass)],state=await sourceReady;
    try{
      if(state.error)throw state.error;
      if(official.naturalWidth!==2100||official.naturalHeight!==3500||labelAngle.naturalWidth!==2100||labelAngle.naturalHeight!==3500||relight.naturalWidth!==971||relight.naturalHeight!==1619)throw new Error('Unexpected official Vivo source dimensions');
      const compose=createSourceVivoCompositor({official,labelAngle,relight,sleeveExtensions:{vivo:{image:vivoSleeve,registration:state.registration.vivo},muerto:{image:muertoSleeve,registration:state.registration.muerto}}}),frames={vivo:{},muerto:{}};
      for(const name of ['vivo','muerto'])for(const pose of ['empty','full','pour','flick','release'])frames[name][pose]=compose({original:originals[name][pose],mask:pose==='pour'?pourMask:pose==='flick'?flickMask:holdMask,pose,skin:name});
      for(const name of ['vivo','muerto'])variants[name].glass=frames[name];canvas.dataset.bottleSource=SOURCE_VIVO_REVISION;
    }catch(error){
      throw new Error('Authentic Vivo artwork could not load: '+error.message);
    }finally{
      for(const image of [...sourceImages,...originalImages])image.src='';all.length=0;
    }
  });
  function layout(){
    if(activeWeapon===5){const f=variants[selectedSkin].glass[glassState],m=f.frameLayout||{originX:0,originY:0,edgeCuts:[920,925]},sc=Math.min(innerWidth*1.15,innerHeight*.76*1672/941)/1672;width=f.width*sc;height=f.height*sc;left=(innerWidth-1672*sc)/2-m.originX*sc;top=innerHeight-941*sc+innerHeight*.08-m.originY*sc;({left,top,width,height}=containSleeveCuts({viewportWidth:innerWidth,viewportHeight:innerHeight,left,top,width,height,sourceWidth:f.width,sourceHeight:f.height,leftCutY:m.edgeCuts[0],rightCutY:m.edgeCuts[1]}));}
    else{width=height=Math.min(innerHeight*.82,innerWidth*.94);}
    size=width;
    // Single-hand balloon and axe cuffs exit beyond the right/bottom viewport, not inside a centred square.
    if(activeWeapon!==5){left=activeWeapon===1||activeWeapon===6?innerWidth-width+width*.035:(innerWidth-width)/2;
    top=innerHeight-height+(activeWeapon===5?innerHeight*.08:activeWeapon===1?height*.16:activeWeapon===6?height*.22:0);}
    if(activeWeapon===6)({left,top,width,height}=containSleeveCuts({viewportWidth:innerWidth,viewportHeight:innerHeight,left,top,width,height,sourceWidth:512,sourceHeight:512,leftCutY:276,rightCutY:272}));
    Object.assign(canvas.style,{width:width+'px',height:height+'px',left:left+'px',top:top+'px'});
  }
  layout();addEventListener('resize',layout);
  const atlas=(image,frame)=>ctx.drawImage(image,(frame%3)*512,Math.floor(frame/3)*512,512,512,0,0,512,512);
  return{canvas,ready,setSkin,get skin(){return selectedSkin;},
    update({visible=false,weapon,balloons=0,throwRemaining=0,glassLevel=0,pourPhase=-1,tossPhase=-1,swingPhase=0,skin=selectedSkin}={}){
      if(disposed)return;setSkin(skin);canvas.hidden=!visible;if(!visible)return;
      if(activeWeapon!==weapon){activeWeapon=weapon;canvas.width=weapon===5?1672:512;canvas.height=weapon===5?941:512;layout();}
      ctx.clearRect(0,0,canvas.width,canvas.height);const images=variants[selectedSkin];
      if(weapon===1){const frame=throwRemaining>0||balloons<=0?4:0;atlas(images.balloon,frame);canvas.dataset.pose='balloon-'+frame;}
      else if(weapon===5){
        glassState=tossPhase>=.35?'release':tossPhase>=0?'flick':pourPhase>=.28&&pourPhase<.78?'pour':glassLevel>=.99?'full':'empty';
        const frame=images.glass[glassState];if(lastGlassFrame!==frame||canvas.width!==frame.width||canvas.height!==frame.height){lastGlassFrame=frame;canvas.width=frame.width;canvas.height=frame.height;layout();}ctx.drawImage(frame,0,0);canvas.dataset.pose='glass-'+glassState;canvas.dataset.glassLevel=String(glassLevel);
      }else if(weapon===6){const frame=swingPhase>=.25&&swingPhase<.4?4:swingPhase>=.4&&swingPhase<.74?5:3;atlas(images.axe,frame);canvas.dataset.pose='axe-'+frame;}
    },
    muzzle(kind='balloon'){
      if(kind==='glass'){const p=glassState==='flick'?[1040,325]:[1040,365];const f=variants[selectedSkin].glass[glassState],m=f.frameLayout||{originX:0,originY:0};return[left+(p[0]+m.originX)/f.width*width,top+(p[1]+m.originY)/f.height*height];}
      return[left+210/512*size,top+190/512*height];
    },
    hide(){canvas.hidden=true;},
    dispose(){if(disposed)return;disposed=true;removeEventListener('resize',layout);canvas.remove();},
  };
}
