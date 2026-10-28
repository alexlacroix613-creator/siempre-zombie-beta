import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
const start=source.indexOf('const player = ',source.indexOf('// ---------------- player & input'));
const end=source.indexOf('// touch controls',start);
assert.ok(start>=0 && end>start,'real player/input section found');
// Execute the unmodified production input section, not a reimplementation.
const inputSource=source.slice(start,end);
const resumeStart=source.indexOf('function resume('),resumeEnd=source.indexOf('function quit(',resumeStart);
const resumeSource=source.slice(resumeStart,resumeEnd);
function setup(query='',api='success',touch=false) {
  const events=new Map();
  const target=name=>({tagName:name.toUpperCase(),addEventListener(type,fn){events.set(name+':'+type,fn);}});
  const canvas=target('canvas'), document=target('document'), game={state:'play'};
  let requests=0,pauses=0,driveToggles=0;
  document.exitPointerLock=()=>{document.pointerLockElement=null;events.get('document:pointerlockchange')?.();};
  if(api!=='unsupported') canvas.requestPointerLock=()=>{
    requests++;
    if(api==='reject') return Promise.reject(new Error('denied'));
    if(api==='throw') throw new Error('unsupported context');
    document.pointerLockElement=canvas;
    return Promise.resolve();
  };
  class Vector3 { constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});} set(x,y,z){Object.assign(this,{x,y,z});return this;} }
  const context={canvas,document,game,app:{dataset:{}},buggy:null,THREE:{Vector3},PARAMS:new URLSearchParams(query),TOUCH:touch,
    store:{get:(_key,fallback)=>fallback},clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
    addEventListener:(type,fn)=>events.set('window:'+type,fn),
    pause:()=>{pauses++;game.state='pause';},initAudio:()=>{},setScreen:s=>{game.state=s;},setAim:()=>{},swap:()=>{},nextOwned:()=>0,toggleDrive:()=>{driveToggles++;},swapBottle:()=>{},WEAPONS:[{}],SLOT_ORDER:[0],$:()=>({classList:{toggle:()=>false}})};
  vm.createContext(context);
  vm.runInContext(inputSource+resumeSource+'\nglobalThis.testInput={player,input,keys,lockPointer,suspendReviewPointer,resume,get freeAim(){return freeAim;},get suspended(){return reviewPointerSuspended;}};',context);
  const fire=(scope,type,extra={})=>{const fn=events.get(scope+':'+type);assert.ok(fn,scope+':'+type);fn({target:canvas,movementX:10,movementY:5,button:0,preventDefault(){},...extra});};
  return {canvas,document,game,fire,input:context.testInput,requests:()=>requests,pauses:()=>pauses,driveToggles:()=>driveToggles,setApi:value=>{api=value;},setDriving:value=>{context.buggy=value?{state:'driving'}:null;}};
}
for(const query of ['', 'assetReview', 'p02Review']) {
  const t=setup(query); assert.equal(t.input.freeAim,false);
  t.fire('window','mousemove');assert.equal(t.input.player.yaw,0,'unlocked movement ignored before lock');
  t.fire('canvas','mousedown');assert.equal(t.requests(),1,'click requests pointer lock');
  t.fire('window','mousemove',{target:{tagName:'BODY'}});
  assert.ok(Math.abs(t.input.player.yaw+.022)<1e-12,query+' locked look');
  assert.ok(Math.abs(t.input.player.pitch+.011)<1e-12,query+' locked pitch');
  t.document.pointerLockElement=null;t.fire('document','pointerlockchange');assert.equal(t.pauses(),1,'lost lock pauses');
}
for(const [query,api] of [['nolock','success'],['','unsupported']]) {
  const t=setup(query,api); assert.equal(t.input.freeAim,true);
  t.fire('window','mousemove');assert.ok(t.input.player.yaw<0,'unlocked canvas fallback looks');
  const yaw=t.input.player.yaw;t.fire('window','mousemove',{target:{tagName:'BUTTON'}});assert.equal(t.input.player.yaw,yaw,'HUD movement cannot aim');
  t.game.state='pause';t.fire('window','mousemove');assert.equal(t.input.player.yaw,yaw,'pause blocks fallback look');
}
for(const api of ['reject','throw']) {
  const t=setup('assetReview',api);t.fire('canvas','mousedown');await Promise.resolve();assert.equal(t.input.freeAim,false,'desktop failure cannot silently switch to cursor-limited aiming');
  assert.equal(t.game.state,'pause','failed capture pauses safely');
  t.fire('window','mousemove');assert.equal(t.input.player.yaw,0,'uncaptured desktop movement cannot aim');
  t.setApi('success');t.input.resume();await Promise.resolve();
  assert.equal(t.game.state,'play');assert.equal(t.requests(),2,'Resume retries capture');
  t.fire('window','mousemove',{target:{tagName:'BODY'}});assert.ok(Math.abs(t.input.player.yaw+.022)<1e-12,'recovery retains original sensitivity');
}
const error=setup();error.fire('document','pointerlockerror');assert.equal(error.input.freeAim,false);assert.equal(error.game.state,'pause','pointerlockerror pauses desktop play');
const paused=setup();paused.fire('canvas','mousedown');paused.game.state='pause';paused.fire('window','mousemove');assert.equal(paused.input.player.yaw,0,'pause blocks locked look');
const clampTest=setup('nolock');clampTest.fire('window','mousemove',{movementY:1e6});assert.equal(clampTest.input.player.pitch,-1.45,'pitch safety clamp');
for(const query of ['assetReview','assetReview&nolock']){
  const t=setup(query);t.fire('canvas','mousedown');
  t.input.suspendReviewPointer();
  assert.equal(t.input.suspended,true);assert.equal(t.game.state,'play','intentional review unlock does not pause');
  assert.equal(t.input.freeAim,query.includes('nolock'),'toolbar does not permanently force free-mouse mode');
  const yaw=t.input.player.yaw,pitch=t.input.player.pitch,requests=t.requests();
  t.fire('window','mousemove',{target:{tagName:'BUTTON'},movementX:400,movementY:200});
  t.fire('window','mousemove',{target:t.canvas,movementX:400,movementY:200});
  t.input.lockPointer();assert.equal(t.requests(),requests,'review action/start cannot relock while toolbar active');
  assert.equal(t.input.player.yaw,yaw);assert.equal(t.input.player.pitch,pitch,'toolbar/cursor return has no calibration delta');
  t.fire('canvas','mousedown');assert.equal(t.input.suspended,false);
  if(!query.includes('nolock'))assert.equal(t.requests(),requests+1,'canvas click reacquires standard pointer lock');
  t.fire('window','mousemove',{movementX:10,movementY:5});
  assert.ok(Math.abs(t.input.player.yaw-yaw+.022)<1e-12,'after review same raw .0022 yaw sensitivity');
  assert.ok(Math.abs(t.input.player.pitch-pitch+.011)<1e-12,'after review same raw .0022 pitch sensitivity');
}
const retry=setup('assetReview','reject');retry.fire('canvas','mousedown');await Promise.resolve();
retry.input.suspendReviewPointer();const requests=retry.requests();retry.setApi('success');retry.input.resume();await Promise.resolve();
assert.equal(retry.requests(),requests+1,'Resume retries after refusal and clears stale review suspension');
assert.equal(retry.input.freeAim,false);assert.equal(retry.input.suspended,false);
const hybrid=setup('','reject',true);hybrid.fire('canvas','mousedown');await Promise.resolve();
assert.equal(hybrid.requests(),1,'coarse-pointer devices still request lock on mouse click');
hybrid.setApi('success');hybrid.input.resume();await Promise.resolve();
assert.equal(hybrid.requests(),2,'Resume retries after a prior refusal without the review toolbar');
hybrid.fire('window','mousemove',{movementX:4000,movementY:0});
assert.ok(hybrid.input.player.yaw < -2*Math.PI,'locked yaw allows a full 360-degree turn');
const vehicle=setup('p02Review');vehicle.fire('canvas','mousedown');
for(const driving of [true,false,true,false]){
  vehicle.setDriving(driving);const before=vehicle.input.player.yaw;
  vehicle.fire('window','mousemove',{target:{tagName:'BODY'},movementX:4000,movementY:0});
  assert.ok(Math.abs(vehicle.input.player.yaw-before+8.8)<1e-10,'same unrestricted rotation in cabin and after exit');
}
vehicle.fire('document','pointerlockerror');assert.equal(vehicle.game.state,'play','stale error cannot release a currently captured mouse');
const fixture=setup('p02Review');fixture.input.suspendReviewPointer();fixture.game.state='pause';fixture.input.resume(false);
assert.equal(fixture.requests(),0);assert.equal(fixture.input.suspended,true,'review fixture resumes without capturing from a toolbar click');
const touchInput=setup('','reject',true);touchInput.fire('window','pointerdown',{pointerType:'touch'});touchInput.input.lockPointer();
touchInput.fire('canvas','mousedown',{sourceCapabilities:{firesTouchEvents:true}});
assert.equal(touchInput.requests(),0);assert.equal(touchInput.game.state,'play','touch play does not request desktop capture or pause');
touchInput.setApi('success');touchInput.fire('window','pointerdown',{pointerType:'mouse'});touchInput.fire('canvas','mousedown');
assert.equal(touchInput.requests(),1,'real mouse on same hybrid device acquires capture');
const stuck=setup();stuck.fire('window','keydown',{code:'KeyE',repeat:false});stuck.fire('window','keydown',{code:'KeyE',repeat:true});assert.equal(stuck.driveToggles(),1,'held E toggles vehicle only once');
stuck.fire('window','keydown',{code:'KeyW',repeat:false});stuck.input.input.fire=true;stuck.input.input.moveX=1;stuck.fire('window','blur');
assert.equal(stuck.input.keys.KeyW,false,'blur clears held movement');assert.equal(stuck.input.input.fire,false);assert.equal(stuck.input.input.moveX,0);assert.equal(stuck.pauses(),1,'focus loss pauses play');
console.log('PASS actual source VM: desktop capture failure pauses, Resume retries, review resume isolation, unlimited 360 on foot/driving/exit, unchanged .0022 sensitivity, explicit fallback, blur and pitch clamp');
