export const SOFT_BOUNDARY=Object.freeze({grace:6,returnAfter:10,maxDepth:18,damagePerSecond:2,maxDamage:8});
export const boundaryDepth=(x,z,b)=>Math.hypot(Math.max(b.minX-x,0,x-b.maxX),Math.max(b.minZ-z,0,z-b.maxZ));

// Only the frozen v118 perimeter helpers: do not discard buildings or arbitrary
// thin walls. A named collider from a later loader can take the explicit route.
export function softMovementBlockers(blockers) {
  const names=new Set(['col_v113_side_boundary_50.0','col_boundary_40_-1','col_boundary_40_1']);
  const near=(a,b)=>Math.abs(a-b)<.002;
  return blockers.filter(b=>{
    if(names.has(b.sourceName))return false;
    const east=near(b.minX,49.825)&&near(b.maxX,50.175)&&near(b.minZ,-102)&&near(b.maxZ,40);
    const south=near(b.minZ,39.825)&&near(b.maxZ,40.175)&&((near(b.minX,-40)&&near(b.maxX,0))||(near(b.minX,10)&&near(b.maxX,50)));
    return !east&&!south;
  });
}

export function createBoundaryState(bounds) {
  let elapsed=0,totalDamage=0;
  return {reset(){elapsed=0;totalDamage=0;},
    step({x,z,dt,protectedHealth=false}){
      const depth=boundaryDepth(x,z,bounds);
      if(depth===0){elapsed=0;totalDamage=0;return{outside:false,depth:0,damage:0,returned:false,remaining:SOFT_BOUNDARY.returnAfter};}
      const before=elapsed;elapsed+=Math.max(0,Math.min(.1,dt||0));
      const exposed=Math.max(0,elapsed-SOFT_BOUNDARY.grace)-Math.max(0,before-SOFT_BOUNDARY.grace);
      const damage=protectedHealth?0:Math.min(SOFT_BOUNDARY.maxDamage-totalDamage,exposed*SOFT_BOUNDARY.damagePerSecond);
      totalDamage+=damage;
      return{outside:true,depth,damage,returned:elapsed>=SOFT_BOUNDARY.returnAfter||depth>=SOFT_BOUNDARY.maxDepth,remaining:Math.max(0,SOFT_BOUNDARY.returnAfter-elapsed),elapsed};
    },
  };
}

export function createOutOfBounds({bounds,parent=document.body}={}) {
  if(!document.getElementById('out-of-bounds-style')){const css=document.createElement('link');css.id='out-of-bounds-style';css.rel='stylesheet';css.href=new URL('./out-of-bounds.css',import.meta.url).href;document.head.append(css);}
  const overlay=document.createElement('div');overlay.className='out-of-bounds';overlay.hidden=true;
  const warning=document.createElement('div');warning.className='out-of-bounds-warning';warning.setAttribute('role','alert');
  const message=document.createElement('strong'),countdown=document.createElement('span');
  message.textContent='Go back to the game — you are out of bounds.';warning.append(message,countdown);overlay.append(warning);parent.append(overlay);
  const state=createBoundaryState(bounds);let safe={x:0,y:0,z:6},run=null,recoveryNotice=0,opacity=0;
  return {
    update({dt,player,vehicle=null,enabled=true,runId=null,protectedHealth=false}){
      if(runId!==run){run=runId;state.reset();safe={x:0,y:0,z:6};recoveryNotice=0;opacity=0;}
      if(!enabled){overlay.hidden=true;return{outside:false,returned:false};}
      const pos=vehicle?{x:vehicle.x,y:0,z:vehicle.z}:player.pos;
      const result=state.step({x:pos.x,z:pos.z,dt,protectedHealth});
      const inset=vehicle?3:1;
      if(!result.outside&&pos.x>bounds.minX+inset&&pos.x<bounds.maxX-inset&&pos.z>bounds.minZ+inset&&pos.z<bounds.maxZ-inset)safe={x:pos.x,y:pos.y,z:pos.z};
      if(result.damage>0)player.hp=Math.max(1,player.hp-result.damage);
      if(result.returned){
        Object.assign(player.pos,safe);player.vel?.set?.(0,0,0);player.vy=0;player.grounded=true;
        if(vehicle){vehicle.x=safe.x;vehicle.z=safe.z;vehicle.speed=0;vehicle.steer=0;if(vehicle.g?.position)vehicle.g.position.set(safe.x,0,safe.z);}
        state.reset();recoveryNotice=3;
      }
      recoveryNotice=Math.max(0,recoveryNotice-Math.max(0,dt||0));
      const target=result.outside?Math.min(.85,.25+result.depth*.035+(result.elapsed||0)*.03):0;
      opacity+=(target-opacity)*Math.min(1,(dt||0)*5);
      overlay.hidden=!result.outside&&recoveryNotice<=0&&opacity<.015;
      overlay.style.setProperty('--oob-opacity',String(opacity));
      warning.hidden=!result.outside&&recoveryNotice<=0;
      message.textContent=recoveryNotice>0?'Returned you to the safe game area.':'Go back to the game — you are out of bounds.';
      countdown.textContent=recoveryNotice>0?'You can play again.':'Turn back toward the yard now.';
      return result;
    },
    reset(){state.reset();safe={x:0,y:0,z:6};opacity=0;recoveryNotice=0;overlay.hidden=true;},
    dispose(){overlay.remove();},
  };
}
