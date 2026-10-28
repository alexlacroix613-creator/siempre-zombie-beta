import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
const sourcePath='C:/Users/alexl/Documents/Codex/2026-09-01/i/work/siempre-zombie-20261023/game/vehicle-wip/candidates/rzr-pro-r-6/rzr-pro-r-6-source.glb';
const inputPath=new URL('../game/assets/rzr-pro-r-6.glb',import.meta.url),outputPath=new URL('../game/assets/rzr-pro-r-6-steering-separated.glb',import.meta.url);
function read(path){const bytes=fs.readFileSync(path),length=bytes.readUInt32LE(12);return{json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};}
function accessor(asset,index){const a=asset.json.accessors[index],v=asset.json.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];assert(!a.sparse);const stride=v.byteStride||n*({5126:4,5125:4,5123:2,5121:1}[a.componentType]);return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>{const p=(v.byteOffset||0)+(a.byteOffset||0)+i*stride+k*({5126:4,5125:4,5123:2,5121:1}[a.componentType]);return a.componentType===5126?asset.bin.readFloatLE(p):a.componentType===5125?asset.bin.readUInt32LE(p):a.componentType===5123?asset.bin.readUInt16LE(p):asset.bin.readUInt8(p);}));}
function matrices(asset){const matrices=new Map();const visit=(i,parent)=>{const node=asset.json.nodes[i],m=node.matrix?new THREE.Matrix4().fromArray(node.matrix):new THREE.Matrix4().compose(new THREE.Vector3().fromArray(node.translation||[0,0,0]),new THREE.Quaternion().fromArray(node.rotation||[0,0,0,1]),new THREE.Vector3().fromArray(node.scale||[1,1,1]));m.premultiply(parent);matrices.set(i,m);for(const c of node.children||[])visit(c,m);};for(const i of asset.json.scenes[asset.json.scene||0].nodes)visit(i,new THREE.Matrix4());return matrices;}
const source=read(sourcePath),final=read(inputPath),sourceMatrices=matrices(source),finalMatrices=matrices(final);
const quant=p=>p.map(n=>Math.round(n*1e5)).join(','),key=points=>points.map(quant).sort().join('|');
const expected=new Map(),bounds=new THREE.Box3();let sourceTriangles=0;
for(const name of ['steering_wheel','steering_spokes']){
 const ni=source.json.nodes.findIndex(n=>n.name===name);assert(ni>=0);
 for(const primitive of source.json.meshes[source.json.nodes[ni].mesh].primitives){
  const positions=accessor(source,primitive.attributes.POSITION).map(p=>new THREE.Vector3().fromArray(p).applyMatrix4(sourceMatrices.get(ni)).toArray());
  const indices=accessor(source,primitive.indices).flat();
  for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3).map(n=>positions[n]);for(const p of tri)bounds.expandByPoint(new THREE.Vector3().fromArray(p));const k=key(tri);expected.set(k,(expected.get(k)||0)+1);sourceTriangles++;}
 }
}
const bodyIndex=final.json.nodes.findIndex(n=>n.name==='rzr_body');assert(bodyIndex>=0);
const bodyNode=final.json.nodes[bodyIndex],body=final.json.meshes[bodyNode.mesh],isolated=[];
const originalPrimitiveCounts=body.primitives.map(p=>final.json.accessors[p.indices].count);
let offset=Math.ceil(final.bin.length/4)*4;const appended=[Buffer.alloc(offset-final.bin.length)];
function newIndices(indices){const data=Buffer.alloc(indices.length*4);indices.forEach((v,i)=>data.writeUInt32LE(v,i*4));const view=final.json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34963})-1;offset+=data.length;appended.push(data);return final.json.accessors.push({bufferView:view,componentType:5125,count:indices.length,type:'SCALAR',min:[Math.min(...indices)],max:[Math.max(...indices)]})-1;}
let matched=0;const retained=[];
function compactPrimitive(primitive,indices){
 const unique=[...new Set(indices)],remap=new Map(unique.map((n,i)=>[n,i])),attributes={};
 for(const [name,index]of Object.entries(primitive.attributes)){
  const original=final.json.accessors[index];assert.equal(original.componentType,5126,'float vertex attribute expected');
  const values=accessor(final,index),components=values[0].length,data=Buffer.alloc(unique.length*components*4);
  const min=Array(components).fill(Infinity),max=Array(components).fill(-Infinity);
  unique.forEach((n,i)=>values[n].forEach((v,k)=>{data.writeFloatLE(v,(i*components+k)*4);min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}));
  const view=final.json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34962})-1;offset+=data.length;appended.push(data);
  attributes[name]=final.json.accessors.push({bufferView:view,componentType:5126,count:unique.length,type:original.type,min,max})-1;
 }
 return{...primitive,attributes,indices:newIndices(indices.map(n=>remap.get(n)))};
}
for(const primitive of body.primitives){
 const positions=accessor(final,primitive.attributes.POSITION).map(p=>new THREE.Vector3().fromArray(p).applyMatrix4(finalMatrices.get(bodyIndex)).toArray());
 const indices=accessor(final,primitive.indices).flat(),keep=[],move=[];
 for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3),k=key(tri.map(n=>positions[n])),count=expected.get(k)||0;if(count){move.push(...tri);expected.set(k,count-1);matched++;}else keep.push(...tri);}
 if(move.length)isolated.push(compactPrimitive(primitive,move));
 if(keep.length)retained.push(move.length?{...primitive,indices:newIndices(keep)}:primitive);
}
assert.equal(matched,sourceTriangles,'every exact source steering triangle must match once');assert([...expected.values()].every(n=>n===0));assert(isolated.length>0);assert(matched>100);
body.primitives=retained;
const wheelMesh=final.json.meshes.push({name:'steering_wheel_and_spokes',primitives:isolated})-1;
const wheelNode=final.json.nodes.push({...bodyNode,name:'steering_wheel_and_spokes',mesh:wheelMesh,children:undefined})-1;
const parent=final.json.nodes.find(n=>n.children?.includes(bodyIndex));if(parent)parent.children.push(wheelNode);else final.json.scenes[final.json.scene||0].nodes.push(wheelNode);
final.bin=Buffer.concat([final.bin,...appended]);final.json.buffers[0].byteLength=final.bin.length;
const j=Buffer.from(JSON.stringify(final.json)),padded=Buffer.alloc(Math.ceil(j.length/4)*4,32);j.copy(padded);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+final.bin.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(final.bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
const output=Buffer.concat([header,padded,binHeader,final.bin]);fs.writeFileSync(outputPath,output);
const remainingTriangles=retained.reduce((n,p)=>n+final.json.accessors[p.indices].count/3,0),originalTriangles=originalPrimitiveCounts.reduce((n,c)=>n+c/3,0);
assert.equal(remainingTriangles+matched,originalTriangles);
const report={inputBytes:fs.statSync(inputPath).size,outputBytes:output.length,sourceTriangles,matchedExactTriangles:matched,bodyOriginalTriangles:originalTriangles,bodyRetainedTriangles:remainingTriangles,steeringBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},method:'exact source triangle-coordinate multiset at 1e-5 m; no bounding-box deletion; all original final attributes/materials/textures retained',node:'steering_wheel_and_spokes'};
fs.writeFileSync(new URL('./rzr6-steering-split-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
