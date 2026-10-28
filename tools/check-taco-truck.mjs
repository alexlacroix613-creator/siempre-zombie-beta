import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import * as THREE from '../game/vendor/three.module.min.js';
import {GLTFLoader} from '../game/vendor/GLTFLoader.js';
import {createHash} from 'node:crypto';
import {createTacoHealing,tacoTruckSite,createTacoTruck} from '../game/taco-truck.js';
const state=createTacoHealing(),player={hp:90,pos:{x:39.9,z:11.35}};
assert.equal(state.start({hp:90,near:false}),false);
assert.equal(state.start({hp:90,near:true,driving:true}),false);
assert.equal(state.start({hp:90,near:true}),true);
assert.equal(state.start({hp:90,near:true}),false,'no repeated healing while eating');
for(let i=0;i<25;i++)state.update(.1,player);
assert.equal(player.hp,90,'healing occurs after visible eating');
state.update(.1,player);state.update(.1,player);assert.equal(player.hp,100,'health capped at100');
assert.ok(state.cooldown>0,'cooldown retained');
assert.equal(state.start({hp:50,near:true}),false,'cooldown blocks repeat');
for(let i=0;i<50;i++)state.update(.1,player);
assert.equal(state.start({hp:50,near:true}),true);
assert.throws(()=>tacoTruckSite([{minX:0,maxX:60,minZ:-100,maxZ:100}]),/No clear/);
// Check the actual selected scene's transformed collision helpers, so a blocked
// site cannot unexpectedly reject the mandatory startup Promise.all.
const blob=readFileSync(new URL('../game/assets/world-lawn-v118-d7c4d3e9.glb',import.meta.url));
const gltf=JSON.parse(blob.subarray(20,20+blob.readUInt32LE(12))),actualBlockers=[];
function visit(index,parent=new THREE.Matrix4()){
 const n=gltf.nodes[index],local=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation||[0,0,0])),new THREE.Quaternion(...(n.rotation||[0,0,0,1])),new THREE.Vector3(...(n.scale||[1,1,1])));
 const matrix=new THREE.Matrix4().multiplyMatrices(parent,local);
 if(n.name?.startsWith('col_')&&n.mesh!==undefined){const box=new THREE.Box3();for(const p of gltf.meshes[n.mesh].primitives){const a=gltf.accessors[p.attributes.POSITION];box.union(new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max)).applyMatrix4(matrix));}actualBlockers.push({minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z});}
 for(const child of n.children||[])visit(child,matrix);
}
for(const n of gltf.scenes[gltf.scene||0].nodes)visit(n);
const actualSite=tacoTruckSite(actualBlockers);assert.equal(actualSite.x,42);assert.equal(actualSite.z,12);
const main=readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
assert.match(main,/createTacoTruck\(\{scene, blockers,[\s\S]*?\.then\(truck=>\{tacoTruck=truck;\}\)/,'startup promises keep truck creation failure visible');
assert.match(main,/tacoTruck\?\.update\(\{dt, player, playing:game\.state==='play', driving:buggy\?\.state==='driving', skin\}\)/);
assert.ok(statSync(new URL('../game/assets/taco-truck-reference.png',import.meta.url)).size>0);
const blocked=[{minX:40,maxX:44,minZ:8,maxZ:16}];assert.equal(tacoTruckSite(blocked).z,22);
// Exercise the same circle/box clearance used by player movement, on the real world.
const counterBox={minX:actualSite.x-1.82,maxX:actualSite.x-1.07,minZ:actualSite.z-1.72,maxZ:actualSite.z+.42};
const obstacles=[...actualBlockers,actualSite.bounds,counterBox];
const radius=.42;
function free(x,z){return obstacles.every(b=>Math.hypot(x-Math.max(b.minX,Math.min(x,b.maxX)),z-Math.max(b.minZ,Math.min(z,b.maxZ)))>=radius-1e-6);}
assert.ok(free(actualSite.counter.x,actualSite.counter.z),'map marker is a physically reachable standing position');
for(let x=37;x<=actualSite.counter.x;x+=.05)assert.ok(free(x,actualSite.counter.z),'west serving approach stays clear');
const element=()=>({style:{},dataset:{},hidden:false,children:[],append(...x){this.children.push(...x);},setAttribute(){},addEventListener(){},remove(){},getContext(){return {drawImage(){},clearRect(){},fillRect(){}};}});
globalThis.document={createElement:element};globalThis.innerHeight=900;globalThis.innerWidth=1400;
globalThis.Image=class{async decode(){[this.naturalWidth,this.naturalHeight]=this.src.includes('front-back')?[2172,724]:[1536,1024];}};
const scene=new THREE.Scene(),blockers=[],parent=element();
const approved=readFileSync(new URL('../game/assets/taco-truck-approved-source.glb',import.meta.url));
assert.equal(createHash('sha256').update(approved).digest('hex'),'b8ea97dcc9633f7811534c8f7ab12174756d8a755eec06868c19eb11c818c64a','approved GLB must remain byte-identical');
const approvedJson=JSON.parse(approved.subarray(20,20+approved.readUInt32LE(12)));
assert.equal(approvedJson.images.length,1,'original embedded source image');
assert.ok(approvedJson.materials.some(m=>m.name==='Original RGB paint'));
// Loading seam only is stubbed; immutable real GLB is checked above. GPU decode/render
// belongs to the real browser acceptance pass, not this interaction fixture.
const loadAsync=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async url=>{assert.match(url,/taco-truck-approved-source\.glb$/);const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));return{scene:group};};
const truck=await createTacoTruck({scene,blockers,parent,referenceImage:{naturalWidth:1536,naturalHeight:1024}});
GLTFLoader.prototype.loadAsync=loadAsync;
assert.equal(blockers.length,2);
player.pos={...truck.mapPoint};player.hp=50;
truck.update({dt:.016,player,playing:false});assert.equal(truck.tryEat(),false,'cannot start eating while paused');
truck.update({dt:.016,player,playing:true});assert.equal(truck.tryEat(),true,'reachable marker can start meal');
for(let i=0;i<27;i++)truck.update({dt:.1,player,playing:true});assert.equal(player.hp,75);
assert.ok(truck.group.children[0].isMesh,'dimensional GLB scene is retained');
assert.ok(!truck.group.children.some(o=>o.isSprite),'no angle-switching truck cards');
assert.equal(truck.group.children[0].castShadow,true);
truck.dispose();truck.dispose();assert.equal(blockers.length,0);assert.equal(scene.children.length,0);
console.log('PASS: approved GLB identity, dimensional loader hookup, real world west approach and counter marker clearance, paused guard, meal timing, disposal. Browser appearance remains to be reviewed.');

