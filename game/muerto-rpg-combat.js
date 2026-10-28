// Pure gameplay planning. The caller supplies the game's swept firstCombatHit/combatLineClear helpers.
export const RPG=Object.freeze({slot:7,speed:26,life:2.5,radius:6,damage:280,minDamage:150,reload:1.65,cooldown:.35,maxReserve:6,pickupReserve:2});
export function createRPGState(){return{loaded:1,reserve:RPG.pickupReserve,reload:0,cooldown:0};}
export function collectRPG(previous,owned){return owned?{...previous,reserve:Math.min(RPG.maxReserve,previous.reserve+RPG.pickupReserve)}:createRPGState();}
export function stepRPGState(previous,dt,{fire=false,reload=false}={}){
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('RPG step must be finite and nonnegative');
  const state={...previous,cooldown:Math.max(0,previous.cooldown-dt)},wasReloading=previous.reload>0;
  state.reload=Math.max(0,previous.reload-dt);let fired=false,reloaded=false,empty=false;
  if(wasReloading&&state.reload===0&&state.loaded===0&&state.reserve>0){state.loaded=1;state.reserve--;reloaded=true;}
  if(reload&&state.loaded===0&&state.reserve>0&&state.reload===0)state.reload=RPG.reload;
  if(fire&&state.reload===0&&state.cooldown===0){
    if(state.loaded>0){state.loaded--;state.cooldown=RPG.cooldown;fired=true;if(state.reserve>0)state.reload=RPG.reload;}
    else empty=true;
  }
  return{state,fired,reloaded,empty};
}
export function stepRocket(rocket,dt,firstHit){
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('Rocket step must be finite and nonnegative');
  const remaining=Math.max(0,RPG.life-rocket.t),step=Math.min(dt,remaining),start=rocket.position;
  const end={x:start.x+rocket.velocity.x*step,y:start.y+rocket.velocity.y*step,z:start.z+rocket.velocity.z*step};
  const hit=step>0?firstHit(start,end,.12,.12):null;
  const fraction=hit?Math.max(0,Math.min(1,hit.t)):1;
  const position={x:start.x+(end.x-start.x)*fraction,y:start.y+(end.y-start.y)*fraction,z:start.z+(end.z-start.z)*fraction};
  if(hit){
    const speed=Math.hypot(rocket.velocity.x,rocket.velocity.y,rocket.velocity.z)||1;
    // Stay on the incoming side of contact so wall padding cannot put a blast origin inside cover.
    const blastOrigin={x:position.x-rocket.velocity.x/speed*.03,y:position.y-rocket.velocity.y/speed*.03,z:position.z-rocket.velocity.z/speed*.03};
    return{position,t:rocket.t+step*fraction,hit,blastOrigin,expired:false};
  }
  return{position,t:rocket.t+step,hit:null,blastOrigin:null,expired:rocket.t+step>=RPG.life};
}
export function planRPGBlast(origin,targets,lineClear){
  const hits=[];
  for(const target of targets){
    if(!target.active)continue;
    const p=target.position,dx=origin.x-p.x,dz=origin.z-p.z,horizontal=Math.hypot(dx,dz),r=Math.max(0,target.radius);
    const k=horizontal>r?r/horizontal:1;
    const point={x:p.x+dx*k,y:Math.max(target.minY,Math.min(target.maxY,origin.y)),z:p.z+dz*k};
    const distance=Math.hypot(point.x-origin.x,point.y-origin.y,point.z-origin.z);
    if(distance>RPG.radius||!lineClear(origin,point,target))continue;
    const damage=RPG.damage-(RPG.damage-RPG.minDamage)*distance/RPG.radius;
    hits.push({target,point,distance,damage});
  }
  return hits;
}
