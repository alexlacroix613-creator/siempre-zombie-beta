import fs from 'node:fs';import assert from 'node:assert/strict';import * as THREE from '../game/vendor/three.module.min.js';
const source=fs.readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
const begin=source.indexOf('function updateWeapon(dt)'),end=source.indexOf('function updateZombies(',begin);assert(begin>=0&&end>begin);
for(const weapon of [0,1,2,3,4,5,6]){
 let attacks=0,audio=[];const jets=[{visible:true},{visible:true}];
 const game={weapon,fireT:0,spare:2,swapT:0,tank:.7,sprayAcc:0,spin:.6};
 const scope={game,tacoTruck:null,gunRig:{visible:false},hitSoundT:0,VIVO:{max:4,restock:.6},barrels:[],player:{pos:{x:0,z:0}},buggy:{state:'driving',g:{userData:{mounts:[]}}},jets,input:{fire:true,firePressed:true},
 TANK_WEAPONS:new Set([0,3,4,5]),sprayAudio:(...a)=>audio.push(a),updateVM(){},updateDrops(){},updateBalloons(){},emitDrop(){attacks++;},throwBalloon(){attacks++;},updateGlass(){attacks++;},updateCoa(){attacks++;},
 gatling:{userData:{rotor:{rotation:{z:0}},crank:{rotation:{x:0}}}},gatHold:new THREE.Group(),GAT_REST:new THREE.Vector3(),poseGatling(){},tmpV:new THREE.Vector3()};
 const run=new Function('scope','with(scope){'+source.slice(begin,end)+';return updateWeapon;}')(scope);run(.016);
 assert.equal(attacks,0,'driving must not attack with slot '+weapon);assert.equal(game.tank,.7);assert.equal(game.sprayAcc,0);assert.equal(scope.input.fire,false);assert.equal(scope.input.firePressed,false);assert(jets.every(j=>!j.visible));assert(audio.some(a=>a[0]===0));
}
function extract(name){const start=source.indexOf('function '+name+'(');assert(start>=0);const brace=source.indexOf('{',start);let depth=1,end=brace+1;for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end);}
const input={fire:true,firePressed:true},player={pos:new THREE.Vector3(),vel:new THREE.Vector3(),r:.4},buggy={state:'parked',h:0,hp:100,g:new THREE.Group()};
let sprays=0;const transitions={THREE,Math,game:{state:'play'},tacoTruck:null,buggy,player,input,nearBuggy:()=>true,gunRig:{visible:true},setAim(){},clearHeldInput(){input.fire=input.firePressed=false;},sprayAudio(){sprays++;},sfx(){},hud(){},tmpBug:new THREE.Vector3(),pushOut(){},blockers:[],gateBars:[],fullSiteWorld:()=>false,distilleryLevel:null,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lastSafeFootPosition:new THREE.Vector3(0,0,6),engineAudio(){}};
new Function('scope','with(scope){'+extract('toggleDrive')+'\n'+extract('exitBuggy')+'\ntoggleDrive();}')(transitions);
assert.equal(buggy.state,'driving');assert.equal(input.fire,false);assert.equal(input.firePressed,false);assert.equal(transitions.gunRig.visible,false);assert.equal(sprays,1);
input.fire=input.firePressed=true;
new Function('scope','with(scope){'+extract('exitBuggy')+'\nexitBuggy();}')(transitions);
assert.equal(buggy.state,'parked');assert.equal(input.fire,false);assert.equal(input.firePressed,false);assert.equal(transitions.gunRig.visible,true);
const refill={game:{state:'play',swapT:0,spare:2,tank:.1},buggy:{state:'driving'}};
assert.equal(new Function('scope','with(scope){'+extract('swapBottle')+'return swapBottle();}')(refill),false,'R handler target refuses in-vehicle bottle refill');
assert.equal(refill.game.spare,2);assert.equal(refill.game.swapT,0);
assert.match(source,/if \(e\.code === 'KeyR'\) swapBottle\(\)/,'actual R key still routes through guarded function');
assert.match(source,/const RZR6 = true/,'selected vehicle now default');
const loader=fs.readFileSync(new URL('../game/rzr6-loader.js',import.meta.url),'utf8');assert.match(loader,/RZR6_URL = '\.\/assets\/rzr-white-black-two-seat\.glb'/);
assert.ok(fs.statSync(new URL('../game/assets/rzr-white-black-two-seat.glb',import.meta.url)).size>0);
const html=fs.readFileSync(new URL('../game/index.html',import.meta.url),'utf8');
for(const selector of ['#t-fire','#t-fire-l','#t-reload','#t-aim','#t-swap','#crosshair'])assert.ok(html.includes('.driving '+selector),'source hidden driving control '+selector);
assert.match(source,/app\.classList\.toggle\('driving', driving\)/);
const ra=source.indexOf('  // run zombies over'),rb=source.indexOf('  // pose',ra);assert(ra>0&&rb>ra);
for(const speed of [5,1]){
 const hits=[],crashes=[],b={x:0,z:0,speed,state:'driving'},z={state:'chase',type:'walker',r:.4,root:{position:new THREE.Vector3(0,0,.2)}};
 let pushed=0;const s={b,zombies:[z],Math,tmpV:new THREE.Vector3(),pointInRzr:()=>true,damageZombie:(...x)=>hits.push(x),damageBuggy:(...x)=>crashes.push(x),pushOutOfRzr:()=>pushed++};
 new Function('scope','with(scope){'+source.slice(ra,rb)+'}')(s);
 if(speed>3){assert.equal(hits.length,1);assert.equal(hits[0][1],90);assert.equal(crashes[0][0],2);}else{assert.equal(hits.length,0);assert.equal(pushed,1);}
}
console.log('PASS actual source: all slots0-6 including Gatling unarmed/no drain, held-fire clear on entry/exit, R refill guard, driving CSS source selectors, default two-seat loader, run-over/low-speed push mechanics. No browser rendering claimed.');
