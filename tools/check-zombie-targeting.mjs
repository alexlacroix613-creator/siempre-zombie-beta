import fs from 'node:fs';import assert from 'node:assert/strict';
// Evaluate the actual local game's bounded query function without booting DOM/WebGL.
const source=fs.readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
const begin=source.indexOf('function zombieAt('),end=source.indexOf('function inBlocker(',begin);
assert(begin>=0&&end>begin);const zombies=[];
const query=new Function('zombies',source.slice(begin,end)+';return zombieAt;')(zombies);
const make=(options={})=>({state:'chase',modelPending:false,root:{visible:true,position:{x:0,y:0,z:0}},body:{scale:{x:1}},r:.5,...options});
const pending=make({modelPending:true}),hidden=make({root:{visible:false,position:{x:0,y:0,z:0}}}),dying=make({state:'dying'}),visible=make();
zombies.push(pending,hidden,dying,visible);assert.equal(query(0,1,0,0),visible,'pending/hidden/dead rigs never block real target');
zombies.splice(3,1);assert.equal(query(0,1,0,0),null,'no invisible fallback hit');
pending.modelPending=false;assert.equal(query(0,1,0,0),pending,'loaded visible rig becomes target');
assert.equal(query(0,3,0,0),null);assert.equal(query(2,1,0,0),null);
console.log('PASS: actual zombieAt ignores pending, hidden and dying rigs; visible loaded target still resolves, height/radius miss paths remain.');
