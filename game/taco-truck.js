import { createTacoEatingView } from './taco-eating-view.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

export const TACO_TRUCK_MODEL_URL=new URL('./assets/taco-truck-approved-source.glb',import.meta.url).href;
export const TACO_HEAL=Object.freeze({amount:25,eatSeconds:2.6,cooldown:4.5,reach:2.5});
const overlap=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
export function tacoTruckSite(blockers,x=42,z=12) {
  for(const candidateZ of [z,22,32]) {
    const bounds={minX:x-1.33,maxX:x+1.33,minZ:candidateZ-2.97,maxZ:candidateZ+3.10};
    // Include the west serving aisle when testing a usable site.
    const clearance={...bounds,minX:x-3.8};
    if(!blockers.some(b=>overlap(clearance,b)))return{x,z:candidateZ,bounds,counter:{x:x-2.34,z:candidateZ-.65}};
  }
  throw new Error('No clear right-yard taco-truck site and serving aisle');
}

export function createTacoHealing() {
  let eating=0,cooldown=0;
  return {
    get eating(){return eating;},get cooldown(){return cooldown;},
    reset(){eating=0;cooldown=0;},
    start({hp,near,driving=false}){if(!near||driving||hp>=100||eating>0||cooldown>0)return false;eating=TACO_HEAL.eatSeconds;cooldown=TACO_HEAL.cooldown;return true;},
    update(dt,player){
      const step=Math.max(0,Math.min(.1,Number(dt)||0));cooldown=Math.max(0,cooldown-step);
      if(eating<=0)return false;
      eating=Math.max(0,eating-step);
      if(eating>0)return false;
      player.hp=Math.min(100,player.hp+TACO_HEAL.amount);return true;
    },
  };
}

// Separate local prop/interaction module. Root wires update and map icon; no vehicle AI.
export async function createTacoTruck({scene,blockers,parent=document.body,x=42,z=12,groundHeight=()=>0,onHeal=()=>{}}={}) {
  const site=tacoTruckSite(blockers,x,z);
  const eatingView=await createTacoEatingView(parent);
  // Exact source-textured dimensional truck from Alex's accepted screenshot.
  // Preserve its geometry, original RGB textures, material settings and lights.
  const gltf=await new GLTFLoader().loadAsync(TACO_TRUCK_MODEL_URL);
  const group=gltf.scene;group.name='Approved source-textured dimensional taco truck';
  group.position.set(site.x,groundHeight(site.x,site.z,.5),site.z);
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(group);
  // Keep collision data explicit so root can add/remove it once, without mutating
  // world/helper geometry or changing the authoritative floor sampler.
  const collision={...site.bounds};
  const counterCollision={minX:site.x-1.82,maxX:site.x-1.07,minZ:site.z-1.72,maxZ:site.z+.42};
  blockers.push(collision,counterCollision);
  const healing=createTacoHealing();let latest=null;
  const button=document.createElement('button');button.type='button';button.hidden=true;
  button.style.cssText='position:absolute;left:50%;bottom:126px;transform:translateX(-50%);padding:12px 16px;border:1px solid #cde4ac;background:#10201df0;color:#fff;font:700 14px Arial;pointer-events:auto;z-index:12';
  parent.append(button);
  function tryEat(){return !!latest?.playing&&healing.start(latest);}
  button.addEventListener('click',tryEat);
  let disposed=false;
  return {group,site,collision,mapPoint:{x:site.counter.x,z:site.counter.z,label:'TACOS +HP'},tryEat,get isEating(){return healing.eating>0;},
    reset(){healing.reset();eatingView.update({visible:false});},
    update({dt=0,player,playing=true,driving=false,skin='vivo'}){
      if(disposed||!player)return;
      const near=Math.hypot(player.pos.x-site.counter.x,player.pos.z-site.counter.z)<TACO_HEAL.reach;
      latest={hp:player.hp,near,driving,playing};button.hidden=!playing||!near||driving||healing.eating>0;
      if(playing&&healing.update(dt,player))onHeal(player.hp);
      button.disabled=player.hp>=100||healing.eating>0||healing.cooldown>0;
      button.textContent=player.hp>=100?'TACOS · HEALTH FULL':healing.eating>0?'EATING TACO…':healing.cooldown>0?`NEXT TACO IN ${healing.cooldown.toFixed(1)}s`:'EAT TACO · +25 HEALTH · T';
      eatingView.update({visible:playing&&healing.eating>0,progress:1-healing.eating/TACO_HEAL.eatSeconds,skin});
    },
    dispose(){if(disposed)return;disposed=true;scene.remove(group);for(const b of [collision,counterCollision]){const i=blockers.indexOf(b);if(i>=0)blockers.splice(i,1);}button.remove();eatingView.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
  };
}
