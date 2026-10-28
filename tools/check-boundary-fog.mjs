import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
import { createBoundaryFog } from '../game/boundary-fog.js';
const scene=new THREE.Scene(), original=new THREE.Group();scene.add(original);
const bounds=Object.freeze({minX:-28,maxX:50,minZ:-34,maxZ:46});
const fog=createBoundaryFog(scene,bounds), meshes=fog.group.children;
assert.equal(scene.children.length,2);assert.equal(scene.children[0],original);assert.equal(meshes.length,12);
const geometry=new Set(meshes.map(m=>m.geometry)), materials=new Set(meshes.map(m=>m.material));
assert.equal(geometry.size,1);assert.equal(materials.size,3);
for(const side of ['north','south','west','east']) {
  const layer=meshes.find(m=>m.name===`Boundary ${side} layer 1`);
  assert(layer);const box=new THREE.Box3().setFromObject(layer);
  if(side==='north'||side==='south'){
    assert.equal(layer.position.z,side==='north'?bounds.minZ:bounds.maxZ);
    assert(Math.abs(box.min.x-bounds.minX)<1e-10);assert(Math.abs(box.max.x-bounds.maxX)<1e-10);
  }else{
    assert.equal(layer.position.x,side==='west'?bounds.minX:bounds.maxX);
    assert(Math.abs(box.min.z-bounds.minZ)<1e-10);assert(Math.abs(box.max.z-bounds.maxZ)<1e-10);
  }
}
for(const mesh of meshes){assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.depthTest,true);assert.equal(mesh.material.side,THREE.DoubleSide);assert(mesh.scale.y<6);}
const uniform=meshes[0].material.uniforms.uTime;
fog.update(.05);assert.equal(uniform.value,.05);assert([...materials].every(m=>m.uniforms.uTime===uniform));
fog.update(NaN);fog.update(-1);assert.equal(uniform.value,.05);fog.update(30);assert(Math.abs(uniform.value-.15)<1e-10);
let disposals=0;for(const resource of [...geometry,...materials])resource.addEventListener('dispose',()=>disposals++);
fog.dispose();fog.dispose();assert.equal(disposals,4);assert.equal(scene.children.length,1);assert.equal(scene.children[0],original);
fog.update(.05);assert(Math.abs(uniform.value-.15)<1e-10);
assert.throws(()=>createBoundaryFog(scene,{minX:2,maxX:1,minZ:0,maxZ:3}));
assert.throws(()=>createBoundaryFog(scene,{minX:0,maxX:1,minZ:0,maxZ:Infinity}));
console.log('PASS: all four actual clamp planes, 3 bounded layers each, shared resources, dt handling, no collision writes, idempotent cleanup. Shader appearance/compilation still needs actual browser review.');
