import {RPG,stepRocket,planRPGBlast} from './muerto-rpg-combat.js';

// All damage goes through the game's existing trace/LOS and damageZombie adapters.
export function createMuertoRPGRuntime(T,{scene,views,firstHit,targets,lineClear,damage,onBlast=()=>{}}){
  const rockets=[],effects=[],viewDirection=new T.Vector3(),inverseCamera=new T.Quaternion();
  const ringGeo=new T.RingGeometry(.965,1,64),dropletGeo=new T.IcosahedronGeometry(.045,0);
  function removeRocket(r){scene.remove(r.m);r.m.userData.dispose?.();rockets.splice(rockets.indexOf(r),1);}
  function removeEffect(e){scene.remove(e.group);e.materials.forEach(m=>m.dispose());effects.splice(effects.indexOf(e),1);}
  function blast(origin){
    for(const h of planRPGBlast(origin,targets(),lineClear))damage(h.target,h.damage,h.point);
    const group=new T.Group();group.position.set(origin.x,origin.y,origin.z);
    const ringMat=new T.MeshBasicMaterial({color:0xa9fff1,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
    const ring=new T.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;group.add(ring);
    const liquidMat=new T.MeshBasicMaterial({color:0x52e8cd,transparent:true,opacity:1,depthWrite:false}),bits=[];
    // Deterministic radial liquid shards; radius is the actual damage radius.
    for(let i=0;i<40;i++){const a=i*2.3999632297,y=.2+(i%7)/7,v=new T.Vector3(Math.cos(a),y,Math.sin(a)).normalize().multiplyScalar(5+(i%5));const m=new T.Mesh(dropletGeo,liquidMat);group.add(m);bits.push({m,v});}
    scene.add(group);effects.push({group,ring,bits,materials:[ringMat,liquidMat],age:0});onBlast(origin);
  }
  return{rockets,effects,
    launch(origin,direction,from=null){
      // A wall between the eye and rendered muzzle must block the round too.
      if(from){
        const near=stepRocket({position:from,velocity:{x:origin.x-from.x,y:origin.y-from.y,z:origin.z-from.z},t:0},1,firstHit);
        if(near.hit){blast(near.blastOrigin);return;}
      }
      const m=views.rocket(),velocity={x:direction.x*RPG.speed,y:direction.y*RPG.speed,z:direction.z*RPG.speed};m.position.set(origin.x,origin.y,origin.z);
      // Point the original bottle's neck along its screen-projected flight direction.
      m.onBeforeRender=(renderer,world,camera)=>{inverseCamera.copy(camera.quaternion).invert();viewDirection.set(velocity.x,velocity.y,velocity.z).applyQuaternion(inverseCamera);if(Math.hypot(viewDirection.x,viewDirection.y)>.001)m.material.rotation=Math.atan2(viewDirection.y,viewDirection.x)-Math.PI/2;};
      scene.add(m);rockets.push({m,position:{x:origin.x,y:origin.y,z:origin.z},velocity,t:0});
    },
    update(dt){
      for(const r of rockets.slice()){
        const result=stepRocket(r,dt,firstHit);r.position=result.position;r.t=result.t;r.m.position.set(r.position.x,r.position.y,r.position.z);
        if(result.hit){blast(result.blastOrigin);removeRocket(r);}else if(result.expired)removeRocket(r);
      }
      for(const e of effects.slice()){
        e.age+=dt;const phase=Math.min(1,e.age/.6),radius=RPG.radius*(1-Math.pow(1-phase,2));e.ring.scale.setScalar(Math.max(.01,radius));
        e.materials[0].opacity=(1-phase)*.9;e.materials[1].opacity=Math.max(0,1-e.age/.8);
        for(const b of e.bits){b.v.y-=6*dt;b.m.position.addScaledVector(b.v,dt);b.m.rotation.x+=dt*3;}
        if(e.age>=.8)removeEffect(e);
      }
    },
    clear(){for(const r of rockets.slice())removeRocket(r);for(const e of effects.slice())removeEffect(e);},
    dispose(){this.clear();ringGeo.dispose();dropletGeo.dispose();},
  };
}
