import * as THREE from './vendor/three.module.min.js';
// Three authored steering poses mounted in the cabin, independent of head look.
export function createDriverViewmodel({ parent=document.body, zIndex=6 }={}) {
  const canvas=document.createElement('canvas');
  canvas.width=1024;canvas.height=512;
  canvas.setAttribute('aria-hidden','true');
  canvas.dataset.driverViewmodel='three-pose-native-alpha';
  canvas.style.display='none';
  parent.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.06,depthWrite:true,toneMapped:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.86,.43),material);
  mesh.name='Driver hands and steering poses';
  mesh.visible=false;
  // Atlas wheel center matches the physical steering-column center in metres.
  mesh.position.set(.33,1.295,.735);
  mesh.rotation.set(.50,Math.PI,0);
  const images={vivo:new Image(),muerto:new Image()};
  let loaded=false,disposed=false,lastPose=-1,lastSkin='',pose=1;
  const ready=Promise.all(Object.entries(images).map(([id,image])=>new Promise((resolve,reject)=>{
    image.onload=()=>{
      if(image.naturalWidth!==1024||image.naturalHeight!==1536){reject(new Error(id+' driver atlas dimensions changed'));return;}
      resolve(true);
    };
    image.onerror=()=>reject(new Error(id+' driver hand atlas failed to load'));
    image.src=new URL(id==='muerto'?'./assets/driver-hands-muerto-alpha.png':'./assets/driver-hands-alpha.png',import.meta.url).href;
  }))).then(()=>{if(!disposed)loaded=true;return true;});
  function update({visible=false,steer=0,vehicle=null,skin='vivo'}={}) {
    if(disposed)return;
    if(vehicle && mesh.parent!==vehicle){
      vehicle.add(mesh);
      const placement=vehicle.userData.driverWheelPose;
      mesh.position.fromArray(placement?.position || [.33,1.295,.735]);
      mesh.rotation.set(...(placement?.rotation || [.50,Math.PI,0]));
      mesh.scale.setScalar((placement?.width || .86)/.86);
    }
    mesh.visible=!!(visible&&loaded&&vehicle);
    if(!mesh.visible)return;
    // Hysteresis avoids flicker around the straight-ahead transition.
    const turn=Math.max(-1,Math.min(1,Number(steer)||0));
    if(turn<-.26)pose=0;
    else if(turn>.26)pose=2;
    else if(Math.abs(turn)<.14)pose=1;
    const selectedSkin=skin==='muerto'?'muerto':'vivo';
    if(pose!==lastPose||selectedSkin!==lastSkin){
      ctx.clearRect(0,0,1024,512);
      ctx.drawImage(images[selectedSkin],0,pose*512,1024,512,0,0,1024,512);
      texture.needsUpdate=true;
      lastPose=pose;lastSkin=selectedSkin;canvas.dataset.steerPose=String(pose);canvas.dataset.skin=selectedSkin;
    }
  }
  function dispose(){disposed=true;for(const image of Object.values(images))image.onload=image.onerror=null;mesh.removeFromParent();mesh.geometry.dispose();material.dispose();texture.dispose();canvas.remove();}
  return {canvas,mesh,ready,update,dispose,get pose(){return pose;},get skin(){return lastSkin;}};
}
