import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../game/vendor/three.module.min.js';
const source=fs.readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
function extract(name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);const brace=source.indexOf('{',start);let depth=1,end=brace+1;for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end);}
const player={pos:new THREE.Vector3(0,0,6),vel:new THREE.Vector3(),vy:0,grounded:true,r:.4,yaw:.8,pitch:-.3};
const lastSafeFootPosition=new THREE.Vector3(0,0,6);
let floor=.2, probe;
const input={fire:true,firePressed:true,moveX:1,moveY:1};
const buggy={g:new THREE.Group(),state:'driving',hp:100,speed:8,steer:.8};
const ctx={THREE,Number,Math,player,lastSafeFootPosition,buggy,input,game:{state:'play'},blockers:[],gateBars:[],fullSiteWorld:()=>false,
  distilleryLevel:{groundHeight(x,z,maxY){probe=maxY;return floor<=maxY?floor:0;}},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),clearHeldInput(){input.fire=input.firePressed=false;input.moveX=input.moveY=0;},
  gunRig:{visible:false},engineAudio(){},hud(){},showBanner(){}};
const settle=new Function('scope','with(scope){'+extract('settlePlayerFloor')+'return settlePlayerFloor;}')(ctx);
const exit=new Function('scope','with(scope){'+extract('exitBuggy')+'return exitBuggy;}')(ctx);
player.pos.y=-.2;player.vy=-1;player.grounded=false;settle(.016);
assert.equal(player.pos.y,.2,'existing floor penetration lands');assert.equal(player.grounded,true);assert.ok(probe>=.6,'probe above surface');
player.pos.set(3,0,4);player.vy=5.6;player.grounded=false;settle(.05);
assert.ok(player.pos.y>0 && !player.grounded,'upward jump is not snapped to ground');
floor=0;player.pos.set(3,1,4);player.vy=-2;player.grounded=false;for(let i=0;i<30&&!player.grounded;i++)settle(.05);
assert.equal(player.pos.y,0,'fall lands at lower surface');assert.equal(player.grounded,true);
lastSafeFootPosition.set(2,.2,3);player.pos.set(8,-50,8);player.vy=-20;floor=.2;settle(.016);
assert.deepEqual(player.pos.toArray(),[2,.2,3],'deep fall recovers last safe foot location');
lastSafeFootPosition.set(2,.2,3);player.pos.set(NaN,0,0);settle(.016);assert.deepEqual(player.pos.toArray(),[2,.2,3],'non-finite position recovers');
buggy.g.position.set(10,0,10);buggy.g.updateMatrixWorld(true);floor=.2;
assert.equal(exit(),true);assert.equal(buggy.state,'parked');assert.equal(buggy.speed,0);assert.equal(player.pos.y,.2);
assert.equal(player.yaw,.8);assert.equal(player.pitch,-.3);assert.equal(player.vy,0);assert.equal(player.grounded,true);assert.equal(input.fire,false);
buggy.state='driving';ctx.blockers.push({minX:11,maxX:14,minZ:8,maxZ:12});assert.equal(exit(),true);assert.ok(player.pos.x<10,'blocked first door chooses opposite side');
buggy.state='driving';ctx.blockers.splice(0,1,{minX:0,maxX:20,minZ:0,maxZ:20});lastSafeFootPosition.set(2,.2,3);
assert.equal(exit(),false,'normal exit blocked safely');assert.equal(buggy.state,'driving');
assert.equal(exit(true),true,'wreck/removal can force safe fallback');assert.deepEqual(player.pos.toArray(),[2,.2,3]);
assert.match(source,/e\.code === 'KeyE' && !e\.repeat/,'holding E does not repeatedly toggle vehicle');
console.log('PASS actual source: floor penetration, jump/lower landing, invalid/deep-fall recovery, raised-floor vehicle exit, clear opposite door, blocked/forced exit, look preservation, held-E guard');
