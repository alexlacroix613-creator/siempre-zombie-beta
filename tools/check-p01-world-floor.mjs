import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../game/vendor/three.module.min.js';
import { GLTFLoader } from '../game/vendor/GLTFLoader.js';

// Load the actual release geometry without allocating its photographic textures.
const main=fs.readFileSync(new URL('../game/siempre-zombie.js',import.meta.url),'utf8');
const level=fs.readFileSync(new URL('../game/distillery-world.js',import.meta.url),'utf8');
const worldPath=level.match(/const worldPath = '\.\/([^']+)'/)[1];
const src=fs.readFileSync(new URL('../game/'+worldPath,import.meta.url));
const jsonLength=src.readUInt32LE(12),gltf=JSON.parse(src.toString('utf8',20,20+jsonLength));
gltf.materials=(gltf.materials||[]).map(m=>({name:m.name,doubleSided:m.doubleSided}));
delete gltf.images;delete gltf.textures;
const json=Buffer.from(JSON.stringify(gltf).padEnd(Math.ceil(Buffer.byteLength(JSON.stringify(gltf))/4)*4,' '));
const bin=src.subarray(20+jsonLength),bytes=Buffer.alloc(20+json.length+bin.length);
src.copy(bytes,0,0,12);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);bin.copy(bytes,20+json.length);
const {scene:world}=await new Promise((yes,no)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',yes,no));
world.updateMatrixWorld(true);
const floors=[];
world.traverse(o=>{if(o.isMesh&&!o.name.startsWith('col_')&&/ground|curb|apron|street|road|approach|dirt|yard|floor|lawn|parking|path/i.test(o.name))floors.push(o);});
function extract(source,name){const s=source.indexOf('function '+name+'('),b=source.indexOf('{',s);assert(s>=0);let d=1,e=b+1;for(;d;e++){if(source[e]==='{')d++;if(source[e]==='}')d--;}return source.slice(s,e);}
const ctx={THREE,performance,Math,Number,floors,groundRay:new THREE.Raycaster(),down:new THREE.Vector3(0,-1,0),normal:new THREE.Vector3(),normalMatrix:new THREE.Matrix3(),groundStats:{queries:0,totalMs:0,maxMs:0}};
const groundHeight=new Function('ctx','with(ctx){'+extract(level,'groundHeight')+'return groundHeight;}')(ctx);
const player={pos:new THREE.Vector3(),vel:new THREE.Vector3(),vy:0,grounded:false};
const lastSafeFootPosition=new THREE.Vector3(0,0,6);
const settle=new Function('ctx','with(ctx){'+extract(main,'settlePlayerFloor')+'return settlePlayerFloor;}')({THREE,Math,Number,player,lastSafeFootPosition,distilleryLevel:{groundHeight}});
const routes=[[0,6],[0,-10],[0,-35],[0,-70],[0,-110],[0,-150],[-25,12],[-25,-35],[-25,-90],[30,12],[30,-35],[30,-90],[38,11.35]];
const evidence=[];
for(const [x,z] of routes){
 const support=groundHeight(x,z,2);
 assert(Number.isFinite(support)&&support>=-3);
 player.pos.set(x,support-.15,z);player.vy=-2;player.grounded=false;settle(1/60);
 assert(player.grounded&&Math.abs(player.pos.y-support)<1e-5,`penetration at ${x},${z}: support=${support}, feet=${player.pos.y}, grounded=${player.grounded}, localQuery=${groundHeight(x,z,Math.max(.6,support+.25))}`);
 player.vy=5.6;player.grounded=false;
 let apex=player.pos.y;
 for(let n=0;n<150;n++){settle(1/60);apex=Math.max(apex,player.pos.y);}
 assert(apex>support+.5&&player.grounded&&Math.abs(player.pos.y-support)<1e-5,`jump landing at ${x},${z}`);
 evidence.push({x,z,support,apex});
}
const report={status:'PASS',worldPath,floorMeshes:floors.length,routeChecks:evidence,scope:'Actual release world geometry + production floor query and settlement. RZR exits separately covered by check-ground-and-rzr-exit.mjs; user hosted acceptance pending.'};
fs.writeFileSync(new URL('../P01-WORLD-FLOOR-EVIDENCE.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,floorMeshes:floors.length,actualWorldPositions:routes.length,checks:'penetration recovery and jump landing per position'}));
