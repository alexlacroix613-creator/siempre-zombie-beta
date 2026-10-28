import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
import { buildSiteMap } from '../game/calibrated-minimap.js';
globalThis.document = { createElement() { return { width: 0, height: 0, getContext() { return {
  createImageData(w,h) { return {data:new Uint8ClampedArray(w*h*4)}; }, putImageData() {}, drawImage() {},
}; }, toDataURL() { return 'data:image/webp;test-stub'; } }; } };
const world = new THREE.Group(), material = new THREE.MeshStandardMaterial();
const ground = new THREE.Mesh(new THREE.BoxGeometry(100, 2, 240), material); ground.position.set(6,-1,20); world.add(ground);
const building = new THREE.Mesh(new THREE.BoxGeometry(25,20,45), material); building.position.set(9,10,-35); world.add(building);
world.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(world), originalTarget = { original: true };
let target=originalTarget, viewport=new THREE.Vector4(1,2,3,4), scissor=new THREE.Vector4(5,6,7,8), scissors=true, color=new THREE.Color(0x111222), alpha=.5;
let renderedCamera, renderedScene, disposed=0;
ground.geometry.addEventListener('dispose',()=>disposed++); material.addEventListener('dispose',()=>disposed++);
const renderer = { toneMappingExposure: 1.7, autoClear:false,
  getRenderTarget:()=>target, setRenderTarget:v=>{target=v;}, getViewport:v=>v.copy(viewport), setViewport:v=>{viewport.copy(v);},
  getScissor:v=>v.copy(scissor), setScissor:v=>{scissor.copy(v);}, getScissorTest:()=>scissors, setScissorTest:v=>{scissors=v;},
  getClearColor:v=>v.copy(color), getClearAlpha:()=>alpha, setClearColor(c,a){color.set(c);alpha=a;},
  render(s,c){renderedCamera=c;renderedScene=s;}, readRenderTargetPixels(t,x,y,w,h,pixels){for(let i=3;i<pixels.length;i+=4)pixels[i]=255;},
};
const map=buildSiteMap({renderer,world});
assert.equal(map.aspect,.75); assert.equal(target,originalTarget);assert.equal(renderer.toneMappingExposure,1.7);assert.equal(renderer.autoClear,false);
assert.deepEqual(viewport.toArray(),[1,2,3,4]);assert.deepEqual(scissor.toArray(),[5,6,7,8]);assert.equal(scissors,true);assert.equal(alpha,.5);assert.equal(color.getHex(),0x111222);
assert.equal(disposed,0);assert.equal(world.parent,null);assert.notEqual(renderedScene.children[0],world);
const centre=bounds.getCenter(new THREE.Vector3());assert(renderedCamera.position.z>centre.z+10,'camera must reveal 3D depth from south');
const centrePoint=map.project(centre.x,centre.z), north=map.project(centre.x,centre.z-10), east=map.project(centre.x+10,centre.z), roof=map.project(centre.x,centre.z,20);
assert(north.v<centrePoint.v,'north up');assert(east.u>centrePoint.u,'east right');assert(roof.v<centrePoint.v,'elevation visible');
for(const x of [bounds.min.x,bounds.max.x])for(const z of [bounds.min.z,bounds.max.z])for(const y of [bounds.min.y,bounds.max.y]){
 const p=map.project(x,z,y);assert(p.u>0&&p.u<1&&p.v>0&&p.v<1,'full visible 3D box inside fit');
}
console.log('PASS: oblique camera, full projected bounds, north/east/elevation marker projection, renderer state restoration and source-resource preservation. Renderer/pixel stubs do not verify visual output.');
