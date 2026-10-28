import * as THREE from './vendor/three.module.min.js';
// Original wheel/hands source; instruments are mapped onto a real dashboard.
// No photographed hood, windshield perimeter or dashboard fringe is retained.
export const DRIVER_POSES=Object.freeze({neutral:0,straight:1,left:2,right:3,gear:4,grip:5});
export const DRIVER_OPENING=Object.freeze([[89,0],[481,0],[458,62],[449,68],[442,88],[438,94],[418,91],[401,91],[385,93],[358,91],[311,88],[290,84],[249,82],[209,82],[189,84],[164,89],[156,88],[138,92],[126,69],[111,65]]);
export const DRIVER_OUTSIDE_LEFT=Object.freeze([[0,0],[3,0],[23,46],[23,59],[16,82],[10,103],[3,123],[0,130]]);
export const DRIVER_OUTSIDE_RIGHT=Object.freeze([[512,25],[509,25],[501,45],[495,61],[499,70],[503,83],[512,85]]);
const SOURCE_URL=new URL('./assets/rzr-cockpit-approved-vivo.png',import.meta.url);
export function createDriverViewmodel({parent=document.body,sourceUrls={vivo:SOURCE_URL,muerto:new URL('./assets/rzr-cockpit-approved-muerto.png',import.meta.url)}}={}){
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=512;
  canvas.setAttribute('aria-hidden','true');canvas.dataset.driverViewmodel='approved-six-pose-cockpit';canvas.style.display='none';parent.appendChild(canvas);
  const poseCanvas=document.createElement('canvas');poseCanvas.width=poseCanvas.height=512;
  const maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=512;const maskCtx=maskCanvas.getContext('2d');
  const ctx=poseCanvas.getContext('2d'),display=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.04,depthWrite:true,depthTest:true,toneMapped:false,side:THREE.FrontSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.85,1.48),material);mesh.name='Exact approved six-pose driver cockpit';mesh.visible=false;mesh.renderOrder=50;
  const images={},loadImage=(skin,url)=>new Promise((resolve,reject)=>{if(!url)return resolve();const image=new Image();images[skin]=image;image.onload=()=>image.naturalWidth===1536&&image.naturalHeight===1024?resolve():reject(new Error(skin+' cockpit must be original 1536x1024 six-panel source'));image.onerror=()=>reject(new Error(skin+' approved cockpit failed to load'));image.src=String(url);});
  const gripExtensions={vivo:new Image(),muerto:new Image()};const extensionReady=Promise.all(Object.entries(gripExtensions).map(([id,image])=>new Promise((resolve,reject)=>{image.onload=()=>image.naturalWidth===260&&image.naturalHeight===512?resolve():reject(new Error(id+' driver forearm continuation dimensions changed'));image.onerror=()=>reject(new Error(id+' driver forearm continuation failed to load'));image.src=new URL('./assets/rzr-'+id+'-grip-extension.png',import.meta.url).href;})));
  const foregroundMask=new Image();const foregroundReady=new Promise((resolve,reject)=>{foregroundMask.onload=()=>foregroundMask.naturalWidth===1536&&foregroundMask.naturalHeight===1024?resolve():reject(new Error('driver foreground matte dimensions changed'));foregroundMask.onerror=()=>reject(new Error('driver foreground matte failed to load'));foregroundMask.src=new URL('./assets/rzr-driver-foreground-mask.png?v=source-contours5',import.meta.url).href;});
  let loaded=false,disposed=false,lastPose=-1,lastSkin='',pose=1,wasVisible=false,gearTime=0,lastDriveSign=0,entryTime=0,lastUpdateTime=0;
  const ready=Promise.all([...Object.entries(sourceUrls).map(([skin,url])=>loadImage(skin,url)),extensionReady,foregroundReady]).then(()=>{if(!disposed)loaded=true;return true;});
  function update({visible=false,steer=0,vehicle=null,skin='vivo',action=null,dt=null,speed=0}={}){
    if(disposed)return;
    const now=performance.now(),step=typeof dt==='number'&&Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):lastUpdateTime?Math.max(0,Math.min(.1,(now-lastUpdateTime)/1000)):1/60;lastUpdateTime=now;
    if(vehicle&&mesh.parent!==vehicle){
      vehicle.add(mesh);
      // Eye [.33,1.569,-.06], front +Z: original cockpit remains in front of
      // the driver seat. Looking sideways/back reveals the dimensional cabin.
      const p=vehicle.userData.driverCockpitPose;
      mesh.position.fromArray(p?.position||[.43175,1.377218605,.347]);mesh.rotation.set(...(p?.rotation||[.62,Math.PI,0]));mesh.scale.setScalar((p?.width||1.0175)/1.85);
    }
    const selectedSkin=skin==='muerto'?'muerto':'vivo';
    mesh.visible=!!(visible&&loaded&&vehicle&&images[selectedSkin]);
    canvas.dataset.missingSkin=images[selectedSkin]?'':selectedSkin;
    if(!mesh.visible){wasVisible=false;lastDriveSign=0;gearTime=0;entryTime=0;return;}
    if(!wasVisible)entryTime=.18;
    else entryTime=Math.max(0,entryTime-step);
    const driveSign=Math.abs(speed)>.45?Math.sign(speed):0;
    if(driveSign&&driveSign!==lastDriveSign)gearTime=.34;
    if(driveSign)lastDriveSign=driveSign;
    gearTime=Math.max(0,gearTime-step);
    const turn=THREE.MathUtils.clamp(Number(steer)||0,-1,1);
    if(action&&Object.hasOwn(DRIVER_POSES,action))pose=DRIVER_POSES[action];
    else if(entryTime>0&&Math.abs(turn)<.14)pose=DRIVER_POSES.neutral;
    else if(gearTime>0&&Math.abs(turn)<.26)pose=DRIVER_POSES.gear;
    else if(turn<-.26)pose=DRIVER_POSES.left;
    else if(turn>.26)pose=DRIVER_POSES.right;
    else if(Math.abs(turn)<.14||pose>3)pose=DRIVER_POSES.straight;
    wasVisible=true;
    if(pose===lastPose&&selectedSkin===lastSkin)return;
    ctx.clearRect(0,0,512,512);
    ctx.drawImage(images[selectedSkin],pose%3*512,Math.floor(pose/3)*512,512,512,0,0,512,512);
    // Source-derived organic matte contains wheel and arms only.
    maskCtx.clearRect(0,0,512,512);maskCtx.drawImage(foregroundMask,pose%3*512,Math.floor(pose/3)*512,512,512,0,0,512,512);
    ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(maskCanvas,0,0);ctx.restore();
    ctx.clearRect(0,0,4,512);ctx.clearRect(510,0,2,512);ctx.clearRect(0,510,512,2);
    display.clearRect(0,0,640,512);
    // Native outpaint contributes only outside the original frame; its generated
    // core is discarded. Four pixels underlap the cleared sheet separator.
    if(pose===DRIVER_POSES.grip)display.drawImage(gripExtensions[selectedSkin],128,0,132,512,0,0,132,512);
    display.drawImage(poseCanvas,128,0);
    texture.needsUpdate=true;lastPose=pose;lastSkin=selectedSkin;canvas.dataset.steerPose=String(pose);canvas.dataset.skin=selectedSkin;
  }
  function dispose(){disposed=true;for(const image of [...Object.values(images),...Object.values(gripExtensions),foregroundMask])image.onload=image.onerror=null;mesh.removeFromParent();mesh.geometry.dispose();material.dispose();texture.dispose();canvas.remove();}
  return {canvas,mesh,ready,update,dispose,get pose(){return pose;},get skin(){return lastSkin;}};
}
