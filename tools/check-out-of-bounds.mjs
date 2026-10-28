import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../game/vendor/three.module.min.js';
import {createBoundaryState,createOutOfBounds,softMovementBlockers,boundaryDepth} from '../game/out-of-bounds.js';
const bounds={minX:-28,maxX:50,minZ:-34,maxZ:46};
const east={minX:49.825,maxX:50.175,minZ:-102,maxZ:40};
const south={minX:10,maxX:50,minZ:39.825,maxZ:40.175};
const building={minX:54,maxX:56,minZ:0,maxZ:10};
assert.deepEqual(softMovementBlockers([east,south,building]),[building],'only known perimeter colliders ignored');
assert.equal(boundaryDepth(51,6,bounds),1);
const state=createBoundaryState(bounds);let damage=0;
for(let i=0;i<60;i++)damage+=state.step({x:51,z:6,dt:.1}).damage;
assert.ok(damage<1e-10,'six seconds free grace');
let returned=false;for(let i=0;i<42;i++){const r=state.step({x:51,z:6,dt:.1});damage+=r.damage;returned||=r.returned;}
assert.ok(returned);assert.ok(damage<=8.000001,'episode damage capped');
assert.equal(state.step({x:45,z:6,dt:.1}).outside,false,'walking back clears warning');
assert.equal(state.step({x:51,z:6,dt:.1}).elapsed,.1,'new excursion starts fresh grace');
assert.equal(state.step({x:69,z:6,dt:.1}).returned,true,'deep hazard requests recovery');
const element=()=>({style:{setProperty(name,value){this[name]=value;}},children:[],append(...x){this.children.push(...x);},setAttribute(){},remove(){}});
const document={head:element(),getElementById:()=>null,createElement:element,documentElement:{dataset:{world:'viva-mexico'}}};
globalThis.document=document;
const parent=element(),controller=createOutOfBounds({bounds,parent});
const player={pos:new THREE.Vector3(45,0,6),vel:new THREE.Vector3(),hp:5,vy:0,grounded:true};
controller.update({dt:.05,player,runId:1});player.pos.x=51;
for(let i=0;i<101;i++)controller.update({dt:.1,player,runId:1});
assert.equal(player.hp,1,'fog alone cannot kill');assert.equal(player.pos.x,45,'returns to actual last safe point');
const car={x:45,z:6,speed:12,steer:.5,g:{position:new THREE.Vector3()}};
controller.reset();controller.update({dt:.05,player,vehicle:car,runId:2});car.x=51;
const initial=controller.update({dt:.05,player,vehicle:car,runId:2});assert.equal(initial.returned,false);assert.equal(car.x,51,'vehicle can enter fog');
for(let i=0;i<101;i++)controller.update({dt:.1,player,vehicle:car,runId:2});
assert.equal(car.x,45);assert.equal(car.speed,0);assert.equal(car.steer,0);assert.equal(player.pos.x,45);

// Reproduce restarting while the previous run's choking vignette is visible.
const resetParent=element(),resetController=createOutOfBounds({bounds,parent:resetParent});
const resetPlayer={pos:new THREE.Vector3(0,0,6),vel:new THREE.Vector3(),hp:100,vy:0,grounded:true};
resetController.update({dt:.05,player:resetPlayer,runId:10});resetPlayer.pos.x=51;
for(let i=0;i<60;i++)resetController.update({dt:.1,player:resetPlayer,runId:10});
const overlay=resetParent.children[0],warning=overlay.children[0];
assert.ok(Number(overlay.style['--oob-opacity'])>.3,'old run really has visible red fog');
assert.equal(warning.children[1].textContent,'Turn back toward the yard now.','warning makes no contradictory timed-return promise');
resetPlayer.pos.set(0,0,6);resetPlayer.hp=100;
resetController.update({dt:.05,player:resetPlayer,runId:11});
assert.equal(Number(overlay.style['--oob-opacity']),0,'new safe run has no inherited red fog');
assert.equal(overlay.hidden,true,'new run does not display stale overlay');
assert.equal(warning.hidden,true,'new run does not display previous warning/recovery notice');
assert.equal(resetPlayer.hp,100);
resetPlayer.pos.x=51;const fresh=resetController.update({dt:.1,player:resetPlayer,runId:11});
assert.equal(fresh.elapsed,.1);assert.equal(fresh.damage,0,'new run starts with fresh grace');

// Run the actual production foot movement function and collision function.
const source=readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
function extract(name){const start=source.indexOf('function '+name+'(');assert(start>=0);const brace=source.indexOf('{',start);let depth=1,end=brace+1;for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end);}
const foot={pos:new THREE.Vector3(48,0,6),vel:new THREE.Vector3(),hp:100,r:.4,grounded:true,hurt:0,bob:0,yaw:0,pitch:0,vy:0};
const c={THREE,Math,lastSafeFootPosition:foot.pos.clone(),player:foot,game:{shake:0,started:3,invulnT:0},buggy:null,keys:{KeyD:true},input:{moveX:0,moveY:0},fwd:new THREE.Vector3(),right:new THREE.Vector3(),wish:new THREE.Vector3(),tmpV:new THREE.Vector3(),camera:new THREE.PerspectiveCamera(),gunRig:new THREE.Group(),EYE:1.6,HALF:20,document,
  blockers:[east,building],gateBars:[],distilleryLevel:{groundHeight:()=>0},fullSiteWorld:()=>true,softMovementBlockers,outOfBounds:createOutOfBounds({bounds,parent:element()}),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),rand:(a,b)=>(a+b)/2};
vm.createContext(c);vm.runInContext(extract('pushOut')+'\n'+extract('settlePlayerFloor')+'\n'+extract('updatePlayer')+'\nglobalThis.step=updatePlayer;',c);
for(let i=0;i<25;i++)c.step(.05);
assert.ok(foot.pos.x>50.5,'actual foot source crosses original50m clamp/perimeter');
assert.ok(foot.pos.x<54,'actual building collider remains solid');

// Run the actual vehicle swept movement block and its unchanged SAT collision.
const vs=source.indexOf('  const nx = b.x + Math.sin(b.h)'),ve=source.indexOf('  b.hitT -= dt;',vs);
const v={...c,b:{x:49,z:6,h:Math.PI/2,speed:10},dt:.1,tmpBug:new THREE.Vector3(),RZR_HALF_WIDTH:.941,RZR_HALF_LENGTH:2.105};
vm.createContext(v);vm.runInContext(extract('pushVehicleOutOfRects')+'\n'+source.slice(vs,ve),v);
assert.ok(v.b.x>49.8,'actual vehicle movement is not clamped1m inside fog');
console.log('PASS actual foot/vehicle movement across fog, retained building collision, six-second grace, bounded nonlethal damage, foot/vehicle last-safe recovery and stop');
