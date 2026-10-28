import fs from 'node:fs';
import assert from 'node:assert/strict';
import { GLTFLoader } from '../game/vendor/GLTFLoader.js';
import { makeRzr6, RZR6_WHEEL_RADIUS, RZR6_URL, RZR6_FOOTPRINT } from '../game/rzr6-loader.js';
import * as THREE from '../game/vendor/three.module.min.js';
const raw = fs.readFileSync(new URL('../game/'+RZR6_URL, import.meta.url));
const jsonLength = raw.readUInt32LE(12), json = JSON.parse(raw.subarray(20, 20 + jsonLength));
// Node geometry/lifetime check only: omit image decoding; keep all actual GLB nodes and binary geometry.
delete json.images; delete json.textures;
for (const m of json.materials) {
  for (const key of Object.keys(m)) if (key.endsWith('Texture')) delete m[key];
  if (m.pbrMetallicRoughness) for (const key of Object.keys(m.pbrMetallicRoughness)) if (key.endsWith('Texture')) delete m.pbrMetallicRoughness[key];
}
const j = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(j.length / 4) * 4, 32); j.copy(padded);
const bin = raw.subarray(20 + jsonLength), head = Buffer.alloc(20);
head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + padded.length + bin.length, 8);
head.writeUInt32LE(padded.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
const b = Buffer.concat([head, padded, bin]);
const gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
gltf.scene.updateMatrixWorld(true);
const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
assert(Math.abs(size.z - RZR6_FOOTPRINT.halfLength*2) < .01); assert(Math.abs(size.x - RZR6_FOOTPRINT.halfWidth*2) < .01);
const a = makeRzr6(gltf), c = makeRzr6(gltf);
const aWheel=a.getObjectByName('driver_steering'),cWheel=c.getObjectByName('driver_steering');
assert(aWheel && cWheel);assert.equal(aWheel.visible,true);
const originalVisible=new Map();a.traverse(o=>originalVisible.set(o,o.visible));
a.userData.setDriverViewActive(true);assert.equal(aWheel.visible,false);assert.equal(cWheel.visible,true);
for(const [o,v]of originalVisible)if(o!==aWheel && o.name!=='driver_overlay_occluders')assert.equal(o.visible,v,'only wheel and dedicated cockpit occluders change visibility');
a.userData.setDriverViewActive(false);assert.equal(aWheel.visible,true);
const wheelBox=new THREE.Box3().setFromObject(aWheel),wheelCenter=wheelBox.getCenter(new THREE.Vector3());
assert(wheelCenter.distanceTo(new THREE.Vector3(...a.userData.driverWheelCenter))<.13,'wheel remains at declared driver reach');
const beforeSteer=aWheel.quaternion.clone();a.userData.setSteering(.5);assert(beforeSteer.angleTo(aWheel.quaternion)>.4,'wheel actually turns');a.userData.setSteering(0);assert(aWheel.quaternion.equals(beforeSteer),'zero steering restores exact authored base orientation');
assert.equal(a.userData.wheels.length, 4); assert.equal(a.userData.wheelRadius, RZR6_WHEEL_RADIUS);
assert.notEqual(a.userData.body, c.userData.body); assert.notEqual(a.userData.body, gltf.scene.getObjectByName('body')?.material);
for (const w of a.userData.wheels) {
  a.updateMatrixWorld(true);
  const wheelSize = new THREE.Box3().setFromObject(w.spin).getSize(new THREE.Vector3());
  assert(wheelSize.x < wheelSize.y && wheelSize.x < wheelSize.z, 'axle is X');
  const hub = w.pivot.position.clone(); w.spin.rotation.x += 1 / RZR6_WHEEL_RADIUS;
  if (w.front) w.pivot.rotation.y = .3;
  assert(w.pivot.position.equals(hub)); assert.equal(w.spin.position.length(), 0);
}
let geoDisposed = 0, instanceDisposed = 0, sourceDisposed = 0;
gltf.scene.traverse(o => { if(o.isMesh) { o.geometry.addEventListener('dispose', () => geoDisposed++); for(const m of [].concat(o.material)) m.addEventListener('dispose', () => sourceDisposed++); } });
a.userData.materials.forEach(m => m.addEventListener('dispose', () => instanceDisposed++));
a.userData.dispose(); a.userData.dispose();
assert.equal(instanceDisposed, a.userData.materials.length); assert.equal(geoDisposed, 0); assert.equal(sourceDisposed, 0);
const d = makeRzr6(gltf); assert.equal(d.userData.wheels.length, 4); c.userData.dispose(); d.userData.dispose();
console.log(JSON.stringify({ result: 'PASS', dimensions: size.toArray(), fourWheels: true, axle: 'X', instancesAndRespawn: true, cachedResourcesPreserved: true, textureDecoding: 'not tested in Node' }));
