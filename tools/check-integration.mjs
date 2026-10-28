// Deterministic checks of the actual copied sampler and supplied audio adapter.
// No browser, headless renderer, media generation, network requests or new dependencies.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';

const worldSource=readFileSync(new URL('../game/distillery-world.js',import.meta.url),'utf8');
const start=worldSource.indexOf('  // Static walkable surfaces');
const end=worldSource.indexOf('  return { world,',start);
assert(start>0 && end>start);
const world=new THREE.Group();
const slab=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshBasicMaterial());
slab.name='floor-test-fixture'; slab.rotation.x=-Math.PI/2; slab.position.y=.2; world.add(slab);
// The copied source section now also constructs visual grass. Its fixture has no
// distillery soil/colliders; supply that independent collaborator without changing sampler code.
const {groundHeight,groundStats}=new Function('world','THREE','performance','createGrassMotion','blockers',worldSource.slice(start,end)+'return {groundHeight,groundStats};')(world,THREE,performance,()=>({update(){}}),[]);
assert(Math.abs(groundHeight(0,0,.55)-.2)<1e-5,'center-point contact finds raised floor');
assert.equal(groundHeight(10,10,.55),0,'no support uses existing baseline');
assert.equal(groundStats.queries,2);

const operations=[];
const param=()=>({value:0,setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}});
const gain=()=>({gain:param(),connect(){return this;}});
const context={currentTime:0,createGain:gain,createBufferSource(){return {playbackRate:param(),connect(){return this;},start(){operations.push('start');}};},decodeAudioData(b,ok){ok({duration:2});}};
const window={};
let requests=0;
vm.runInNewContext(readFileSync(new URL('../game/siempre-audio.js',import.meta.url),'utf8'),{window,Math,Promise,fetch:async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
assert.equal(requests,0,'no sample load before interaction initialization');
assert.equal(window.SZAudio.play('hit'),false,'uninitialized audio falls back');
const wind=gain(); wind.gain.value=.05;
window.SZAudio.init(context,gain(),wind);
window.SZAudio.setLoop('spray_loop',0);
for(let n=0;n<12;n++) await Promise.resolve();
assert.equal(window.SZAudio.loaded(),40);
assert.equal(wind.gain.value,0,'wind muted only after ambient sample loads');
assert.equal(window.SZAudio.play('hit'),true);
assert.equal(window.SZAudio.play('missing'),false,'missing sound uses synth fallback');
assert.equal(window.SZAudio.setLoop('spray_loop',1),true);
window.SZAudio.setActive(false);
window.SZAudio.setActive(true);
window.SZAudio.init(context,gain(),wind);
assert.equal(requests,40,'restart/resume does not duplicate fetches or loops');
assert.equal(operations.length,6,'five loop sources plus one shot; no duplicate loop sources');
console.log('PASS: center-point raised-floor contact, no-support fallback, interaction-only audio init, 40 sample decode paths, missing-sample fallback, pause/resume and duplicate-loop guards');
