import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
const begin=source.indexOf('const player = ',source.indexOf('// ---------------- player & input'));
const end=source.indexOf('// ---------------- collision',begin);
function extract(name){const s=source.indexOf('function '+name+'('),b=source.indexOf('{',s);let d=1,e=b+1;for(;d;e++){if(source[e]==='{')d++;if(source[e]==='}')d--;}return source.slice(s,e);}
const nodes=new Map(),events=new Map();
function node(id){if(nodes.has(id))return nodes.get(id);const classes=new Set();const n={tagName:'CANVAS',style:{},hidden:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x);return on;}},addEventListener(type,fn){const key=id+':'+type;events.set(key,[...(events.get(key)||[]),fn]);},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){},closest:()=>null};nodes.set(id,n);return n;}
const canvas=node('canvas'),app=node('app'),document=node('document'),window=node('window');
document.querySelectorAll=()=>[...nodes.values()].filter(n=>n.classList.contains('pressed'));
document.documentElement={};document.exitPointerLock=()=>{document.pointerLockElement=null;emit('document','pointerlockchange');};
canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;return Promise.resolve();};
class Vector3{constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}}
const game={state:'play'},context={game,window,document,canvas,app,THREE:{Vector3},PARAMS:new URLSearchParams(),TOUCH:true,Math,Number,screen:{},audio:{ctx:{suspend(){}}},initAudio(){},setScreen:s=>{game.state=s;},sprayAudio(){},engineAudio(){},store:{get:(_k,d)=>d,set(){}},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),buggy:null,WEAPONS:[],SLOT_ORDER:[],swap(){},nextOwned(){},swapBottle(){},toggleDrive(){},setTimeout(){},$:node,addEventListener:(type,fn)=>window.addEventListener(type,fn),setAim(){if(context.test)context.test.input.aim=false;}};
vm.createContext(context);vm.runInContext(source.slice(begin,end)+extract('pause')+extract('resume')+'\nglobalThis.test={player,input,keys,clearHeldInput,pause,resume};',context);
const t=context.test;
function emit(id,type,extra={}){const event={type,target:node(id),pointerId:1,pointerType:'touch',clientX:50,clientY:50,button:0,movementX:0,movementY:0,preventDefault(){},...extra};for(const fn of events.get(id+':'+type)||[])fn(event);}
const idle=()=>{assert.equal(t.input.fire,false);assert.equal(t.input.firePressed,false);assert.equal(t.input.moveX,0);assert.equal(t.input.moveY,0);assert(Object.values(t.keys).every(v=>!v));assert.deepEqual([t.player.vel.x,t.player.vel.y,t.player.vel.z],[0,0,0]);};
emit('window','keydown',{code:'KeyW'});emit('window','keydown',{code:'ShiftLeft'});t.player.vel.set(3,0,4);t.input.fire=t.input.firePressed=true;
t.pause();idle();emit('window','keydown',{code:'KeyD'});assert.notEqual(t.keys.KeyD,true,'paused key presses cannot queue movement');t.resume();idle();
emit('window','keydown',{code:'KeyA'});t.input.fire=t.input.firePressed=true;emit('window','blur');assert.equal(game.state,'pause');idle();t.resume();
emit('#stick','pointerdown',{pointerId:11});emit('#stick','pointermove',{pointerId:11,clientX:100});assert.equal(t.input.moveX,1);
emit('#stick','lostpointercapture',{pointerId:11});assert.equal(t.input.moveX,0);emit('#stick','pointermove',{pointerId:11,clientX:0});assert.equal(t.input.moveX,0,'stale stick pointer ignored');
emit('canvas','pointerdown',{pointerId:12});emit('canvas','pointermove',{pointerId:12,clientX:80});const look=t.player.yaw;
document.hidden=true;emit('document','visibilitychange');assert.equal(game.state,'pause');idle();
emit('canvas','pointermove',{pointerId:12,clientX:100});assert.equal(t.player.yaw,look,'paused touch cannot turn camera');document.hidden=false;t.resume();
emit('canvas','pointermove',{pointerId:12,clientX:120});assert.equal(t.player.yaw,look,'old touch ID cannot resume looking');
emit('canvas','pointerdown',{pointerId:13});emit('canvas','pointermove',{pointerId:13,clientX:80});assert.notEqual(t.player.yaw,look,'fresh touch works after Resume');emit('canvas','lostpointercapture',{pointerId:13});
emit('#t-fire','pointerdown',{pointerId:20});assert(t.input.fire&&t.input.firePressed);emit('#t-fire','lostpointercapture',{pointerId:20});assert(!t.input.fire&&!t.input.firePressed,'cancelled capture cannot queue a shot');
const yaw=t.player.yaw;emit('#t-fire','pointermove',{pointerId:20,clientX:200});assert.equal(t.player.yaw,yaw);
emit('#t-fire','pointerdown',{pointerId:21});emit('#t-fire','pointerup',{pointerId:21});emit('#t-fire','lostpointercapture',{pointerId:21});assert.equal(t.input.fire,false);assert.equal(t.input.firePressed,true,'normal quick tap remains a valid shot');t.clearHeldInput();
emit('#t-fire','pointerdown',{pointerId:30});emit('#t-fire-l','pointerdown',{pointerId:31});emit('#t-fire','pointercancel',{pointerId:30});assert.equal(t.input.fire,true,'other held fire finger stays active');emit('#t-fire-l','pointercancel',{pointerId:31});idle();
emit('#t-sprint','pointerdown');assert(t.keys.ShiftLeft&&node('#t-sprint').classList.contains('on'));t.pause();idle();assert(!node('#t-sprint').classList.contains('on'),'sprint appearance resets with input');
emit('#stick','pointerdown',{pointerId:40});emit('#stick','pointermove',{pointerId:40,clientX:100});emit('#t-fire','pointerdown',{pointerId:41});idle();
t.resume();context.buggy={state:'driving'};emit('window','keydown',{code:'KeyW'});emit('window','keydown',{code:'KeyA'});t.input.moveX=1;emit('window','blur');idle();assert.equal(game.state,'pause');
console.log('PASS actual input/pause source: blur, hidden tab, paused keys, velocity, touch capture loss, stale IDs, multi-touch fire, valid quick taps and sprint reset');
