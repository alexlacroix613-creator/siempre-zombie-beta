// Local white/black TWO-seat reconstruction. Selected-reference review remains required.
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

export const RZR6_URL = './assets/rzr-white-black-two-seat.glb?v=d26f97dc-rzr4';
export const RZR6_WHEEL_RADIUS = 0.4064;
// Measured from the current GLB including tire lugs, bumpers and root transform.
export const RZR6_FOOTPRINT = Object.freeze({
  centerX:0,centerZ:0,halfWidth:.9450000524520874,halfLength:1.7407747507095337,
});
let pending = null;
export function preloadRzr6(url = RZR6_URL) {
  if (!pending) pending = new GLTFLoader().loadAsync(url).catch(error => { pending = null; throw error; });
  return pending;
}

export function makeRzr6(gltf, { mounts = [], mountMaterials = [] } = {}) {
  const g = new THREE.Group(); g.name = 'RZR white-black two-seat reconstruction';
  const src = gltf.scene.clone(true);
  const steering = src.getObjectByName('driver_steering');
  const cockpitOccluders=src.getObjectByName('driver_overlay_occluders');
  if (!steering) throw new Error('rzr6: missing isolated steering wheel and spokes');
  const wheels = ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR'].map(name => {
    const wheel = src.getObjectByName(name);
    if (!wheel) throw new Error('rzr6: missing ' + name);
    return wheel;
  });
  const materials = [], seen = new Map();
  src.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const clone = m => {
      if (!seen.has(m)) { const copy = m.clone(); seen.set(m, copy); materials.push(copy); }
      return seen.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
  });
  const body = materials.find(m => m.name === 'paint_white');
  if (!body) { materials.forEach(m => m.dispose()); throw new Error('rzr6: missing paint material'); }
  // Existing wreck code tints body.color. Keep authored paint surfaces on that
  // per-instance color, without touching the shared GLB or another vehicle.
  const measuredPaint=['measured original white door','measured original white black quarter graphic','measured original bonnet'];
  for(const material of materials)if(/^approved original (white-black side panels|formed bonnet|white nose surfaces|upper-quarter white-black graphic)/.test(material.name)||measuredPaint.includes(material.name))material.color=body.color;
  g.add(src);
  const wheelData = wheels.map((wheel, index) => {
    const pivot = new THREE.Group(); pivot.name = wheel.name + '_steer';
    pivot.position.copy(wheel.position); wheel.parent.add(pivot); pivot.add(wheel); wheel.position.set(0, 0, 0);
    return { pivot, spin: wheel, front: index < 2 };
  });
  const headlight = new THREE.SpotLight(0xe7f3ff, 34, 34, .44, .45, 1.1);
  headlight.position.set(0, 1, 1.9); headlight.target.position.set(0, .15, 14);
  g.add(headlight, headlight.target);
  const steeringBase=steering.quaternion.clone();
  // Exported rim lies in its local XZ plane: rotate about local Y after base tilt.
  const steeringAxis=new THREE.Vector3(0,1,0);
  const steeringTurn=new THREE.Quaternion();
  let disposed = false;
  g.userData = {
    wheels: wheelData, mounts:[], headlight, body, materials,
    wheelRadius: RZR6_WHEEL_RADIUS, rzr6: true,
    seats:2, wheelbase:2.65,
    footprint:RZR6_FOOTPRINT,
    driverSeat:[.33,1.5693746781349183,-.06],
    driverWheelPose:{position:[.33,1.3043746781349183,.365],rotation:[.62,Math.PI,0],width:.86},
    driverWheelCenter:[.33,1.3193746781349183,.3895],
    setSteering(value) {
      steering.quaternion.copy(steeringBase).multiply(steeringTurn.setFromAxisAngle(steeringAxis,THREE.MathUtils.clamp(value,-1,1)*1.0));
    },
    setDriverViewActive(active) { steering.visible = !active; if(cockpitOccluders)cockpitOccluders.visible=!active; },
    dispose() {
      if (disposed) return;
      disposed = true;
      // The cached GLB owns geometry/textures; disposal here must never invalidate another spawn.
      new Set(materials).forEach(m => m.dispose());
      headlight.dispose();
      // shortcut: mount geometries retain the existing game's ownership; audit that builder before disposing shared ribGeo.
    },
  };
  return g;
}
