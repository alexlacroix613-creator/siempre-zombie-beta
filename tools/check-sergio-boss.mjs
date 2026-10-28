import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../game/vendor/three.module.min.js';
import { SERGIO, tickBossMelee } from '../game/sergio-boss.js';

const source=readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
const makeStart=source.indexOf('function makeZombie(type)');
const makeEnd=source.indexOf('function spawnZombie(type)',makeStart);
assert.ok(makeStart>=0 && makeEnd>makeStart,'makeZombie extraction boundaries must exist and be ordered');
const scene=new THREE.Scene(),attached=[];
const characterArtwork={create(){return {sprite:new THREE.Sprite(),marker:new THREE.Sprite(),pose(){},fade(){},dispose(){}};}};
const context={THREE,TYPES:{walker:{hp:100,speed:[1.3,1.9],dmg:12,scale:1,points:100},runner:{hp:70,speed:[3.3,3.9],dmg:10,scale:.95,points:150},brute:SERGIO},scene,rand:(a,b)=>a,Math,
  ORIGINAL_ZOMBIE_ROSTER:['ken','monica','dan','alex','rick'],zombieVariantIndex:0,characterArtwork,
  attachZombieRig:(z,name)=>{z.modelPending=true;attached.push([z,name]);}};
vm.createContext(context);
vm.runInContext(source.slice(makeStart,makeEnd)+';globalThis.build=makeZombie;',context);
const boss=context.build('brute');
assert.equal(boss.hp,720);assert.equal(boss.name,'Sergio Cruz');
assert.equal(boss.character,'sergio');assert.equal(boss.isSergioBoss,true);
assert.equal(boss.visual.sprite.parent,boss.root,'Sergio remains on supplied original artwork');
assert.equal(attached.length,0,'Sergio does not fall back to a generic/Keith rig');
assert.ok(boss.speed>1.9,'faster than ordinary walker maximum');
assert.match(source,/const ZOMBIE_MODELS = \{ ken: '\.\/assets\/characters\/shared-zombie-body-ken-v1\.glb' \}/);
assert.doesNotMatch(source,/keith-faithful|ZOMBIE_MODELS\[variant\]\s*\|\|/);

const tick={attackT:0};assert.equal(tickBossMelee(tick,0,true),'windup');
assert.equal(tickBossMelee(tick,.3,true),null,'no immediate invisible hit');
assert.equal(tickBossMelee(tick,.16,true),'hit','wind-up completes');
assert.equal(tickBossMelee(tick,.1,true),null,'one hit per attack');
tickBossMelee(tick,1,true);assert.equal(tickBossMelee(tick,.46,false),'miss','moving out of reach avoids impact');

const waveStart=source.indexOf('function nextWave()');
const waveEnd=source.indexOf('// between waves:',waveStart);
assert.ok(waveStart>=0 && waveEnd>waveStart,'nextWave extraction boundaries must exist and be ordered');
const game={wave:0},events=[];
let buggySpawns=0;
const wc={game,BUGGY:{every:3},buggy:null,showBanner:(...x)=>events.push(x),sfx:()=>{},placeWeapons:()=>{},spawnBuggy:()=>{buggySpawns++;wc.buggy={state:'parked',id:buggySpawns};},TOUCH:false,
  rand:(min,max)=>{assert.equal(min,2);assert.equal(max,6);return 4;}};
vm.createContext(wc);
vm.runInContext(source.slice(waveStart,waveEnd)+';globalThis.next=nextWave;',wc);
for(let wave=1;wave<=9;wave++){
  wc.next();
  assert.equal(game.wave,wave);
  if(wave%3===0){
    assert.equal(game.toSpawn,1,`wave ${wave} waits for Sergio`);
    assert.equal(game.spawnT,4,`wave ${wave} gets randomized 2-6s arrival`);
    assert.match(events.at(-1)[0],/Solo encounter/);
    if(wave===3){assert.equal(buggySpawns,1,'RZR becomes available on first boss wave');assert.equal(wc.buggy.state,'parked');}
    else assert.equal(buggySpawns,1,`existing RZR is retained without duplication on wave ${wave}`);
  }else{
    assert.equal(game.toSpawn,5+wave*3,`wave ${wave} retains normal population`);
    assert.equal(game.spawnT,.5,`wave ${wave} retains normal start timing`);
  }
}
assert.equal(game.toSpawn,1,'pending final boss prevents premature wave completion');

const existingVehicle={state:'parked',id:'existing'};
const existingGame={wave:2},existingEvents=[];let duplicateSpawns=0;
const existingContext={game:existingGame,BUGGY:{every:3},buggy:existingVehicle,showBanner:(...x)=>existingEvents.push(x),sfx:()=>{},placeWeapons:()=>{},
  spawnBuggy(){duplicateSpawns++;},TOUCH:false,rand:(min,max)=>{assert.equal(min,2);assert.equal(max,6);return 3;}};
vm.createContext(existingContext);
vm.runInContext(source.slice(waveStart,waveEnd)+';nextWave();',existingContext);
assert.equal(existingContext.buggy,existingVehicle,'existing RZR remains available on boss wave');
assert.equal(duplicateSpawns,0,'boss wave does not duplicate an existing RZR');
assert.equal(existingGame.toSpawn,1);assert.equal(existingGame.spawnT,3);
assert.match(existingEvents.at(-1)[0],/Solo encounter/,'Sergio remains the boss-wave banner');
console.log('PASS Sergio original-art fixture, no Keith fallback, melee windup/dodge, waves 3/6/9, RZR spawn/retention, random boss delay and pending state; normal wave counts/timing preserved');
