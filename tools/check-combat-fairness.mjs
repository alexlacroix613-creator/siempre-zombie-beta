import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
import {segmentBoxTime,segmentCylinderTime} from '../game/combat-trace.js';
const source=fs.readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf('function '+start+'('),source.indexOf('function '+end+'(',source.indexOf('function '+start+'(')));
const blockers=[],zombies=[],player={pos:new THREE.Vector3(0,0,0)};
const wall={minX:.4,maxX:.6,minZ:-1,maxZ:1};
const target=(x,y=0,z=0)=>({root:{position:new THREE.Vector3(x,y,z),visible:true},body:{scale:{x:1}},r:.15,state:'chase',type:'walker'});
let hits=[];
const scope={segmentBoxTime,segmentCylinderTime,blockers,zombies,player,WALL_H:2.4,Math,Infinity,
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),tmpV:new THREE.Vector3(),tmpV2:new THREE.Vector3(),
  camera:{getWorldDirection(v){return v.set(1,0,0);}},MELEE:()=>({reach:2.7,cos:.55,dmg:75,maxHits:3}),
  game:{shake:0},sfx(){},damageZombie(z,damage){hits.push({z,damage});},burst(){},SPLASH:[],
  DMAX:1,drops:{p:new Float32Array([0,1,0]),v:new Float32Array([24,0,0]),life:new Float32Array([1]),dmg:[5]},
  dropMesh:{setMatrixAt(){},instanceMatrix:{}},zeroM:{},dropP:new THREE.Vector3(),
  BALLOON:{radius:2.5,dmg:50},newFieldProps:{popLatex(){}},scene:{remove(){}},balloons:[]};
const functions=new Function('scope','with(scope){'+extract('activeCombatTarget','updateDrops')+extract('updateDrops','throwBalloon')+extract('popBalloon','updateBalloons')+extract('coaStrike','damageZombie')+';return {firstCombatHit,combatLineClear,zombieCanMelee,updateDrops,coaStrike,popBalloon};}')(scope);
const a={x:0,y:1,z:0},b={x:1.2,y:1,z:0};
blockers.push(wall);zombies.push(target(1.2));
assert.equal(functions.firstCombatHit(a,b).z,undefined,'thin wall wins before target beyond endpoint');
functions.updateDrops(.05);assert.equal(hits.length,0);assert.equal(scope.drops.life[0],0);assert(Math.abs(scope.drops.p[0]-.4)<1e-6,'actual 24m/s drop stops at wall, not endpoint 1.2');
zombies[0]=target(.15);assert.equal(functions.firstCombatHit(a,b).z,zombies[0],'nearer target before wall wins');
blockers.length=0;zombies[0].modelPending=true;assert.equal(functions.firstCombatHit(a,b),null);zombies[0].modelPending=false;zombies[0].root.visible=false;assert.equal(functions.firstCombatHit(a,b),null);
zombies[0]=target(1);blockers.push(wall);functions.coaStrike();assert.equal(hits.length,0,'Coa cannot strike through thin wall');
blockers.length=0;zombies[0].root.position.y=4;functions.coaStrike();assert.equal(hits.length,0,'Coa cannot strike upstairs');
zombies[0].root.position.y=0;functions.coaStrike();assert.equal(hits.length,1,'visible reachable Coa target takes damage');
hits=[];zombies[0].modelPending=true;functions.coaStrike();assert.equal(hits.length,0);zombies[0].modelPending=false;
assert(functions.zombieCanMelee(zombies[0],1.1));blockers.push(wall);assert(!functions.zombieCanMelee(zombies[0],1.1),'ordinary and boss melee blocked by wall');
blockers.length=0;player.pos.y=4;assert(!functions.zombieCanMelee(zombies[0],1.1),'no melee across floors');zombies[0].root.position.y=4;assert(functions.zombieCanMelee(zombies[0],1.1),'same elevated floor remains playable');player.pos.y=0;
const pop=()=>{const balloon={m:{position:new THREE.Vector3(0,1,0),traverse(){}}};scope.balloons.push(balloon);functions.popBalloon(balloon);};
zombies[0].root.position.y=0;blockers.push(wall);pop();assert.equal(hits.length,0,'balloon splash cannot cross wall');blockers.length=0;pop();assert.equal(hits.length,1,'unobstructed splash damages target');hits=[];zombies[0].root.position.y=5;pop();assert.equal(hits.length,0,'splash cannot reach another floor');
assert.equal(segmentBoxTime({x:0,y:3,z:0},{x:1,y:3,z:0},wall),Infinity,'shot above wall clears it');
assert.equal(segmentCylinderTime({x:0,y:4,z:0},{x:2,y:4,z:0},{x:1,z:0},.3,0,2.1),Infinity);
console.log('PASS: actual-source fast drops stop at first thin wall; nearer targets win; hidden/pending rigs ignored; Coa/axe reach and LOS; ordinary/boss melee wall and floor guards; balloon splash obstruction and height.');
