import * as THREE from './vendor/three.module.min.js';

// Permeable visual threshold. The out-of-bounds controller warns/recoveries beyond
// these planes; the mist itself never creates a collider or immediate wall.
export function createBoundaryFog(scene, bounds) {
  const { minX, maxX, minZ, maxZ } = bounds;
  if (![minX, maxX, minZ, maxZ].every(Number.isFinite) || minX >= maxX || minZ >= maxZ) throw new Error('Boundary fog needs valid movement bounds');
  const group = new THREE.Group(); group.name = 'Movement limit green mist';
  const geometry = new THREE.PlaneGeometry(1, 1);
  const time = { value: 0 };
  const materials = [0, 1, 2].map(layer => new THREE.ShaderMaterial({
    name: 'Boundary mist depth ' + layer,
    uniforms: { uTime: time, uPhase: { value: layer * 2.71 } },
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 world = modelMatrix * vec4(position, 1.0); vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }`,
    fragmentShader: `uniform float uTime; uniform float uPhase; varying vec2 vUv; varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main() {
        vec2 flow = vec2(vWorld.x + vWorld.z, vWorld.y * 1.7) * .48 + vec2(uTime * .045 + uPhase, -uTime * .025);
        float n = .57*noise(flow) + .29*noise(flow*2.07+5.1) + .14*noise(flow*4.13+9.3);
        float vertical = smoothstep(0.0,.12,vUv.y) * (1.0-smoothstep(.34,1.0,vUv.y));
        float ends = smoothstep(0.0,.055,vUv.x) * (1.0-smoothstep(.945,1.0,vUv.x));
        float proximity = 1.0-smoothstep(8.0,22.0,distance(cameraPosition.xz,vWorld.xz));
        float density = smoothstep(.22,.8,n);
        float alpha = .24 * density * vertical * ends * proximity;
        if (alpha < .002) discard;
        gl_FragColor = vec4(mix(vec3(.12,.32,.055),vec3(.34,.63,.13),n),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const edges = [
    { name: 'north', length: maxX-minX, x:(minX+maxX)/2, z:minZ, angle:0, nx:0, nz:1 },
    { name: 'south', length: maxX-minX, x:(minX+maxX)/2, z:maxZ, angle:Math.PI, nx:0, nz:-1 },
    { name: 'west', length: maxZ-minZ, x:minX, z:(minZ+maxZ)/2, angle:Math.PI/2, nx:1, nz:0 },
    { name: 'east', length: maxZ-minZ, x:maxX, z:(minZ+maxZ)/2, angle:-Math.PI/2, nx:-1, nz:0 },
  ];
  edges.forEach(edge => materials.forEach((material, layer) => {
    const inset = (layer-1)*.65, mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Boundary ${edge.name} layer ${layer}`;
    mesh.position.set(edge.x+edge.nx*inset,2.15,edge.z+edge.nz*inset);
    mesh.rotation.y = edge.angle; mesh.scale.set(edge.length,5.5,1);
    mesh.renderOrder = 1; group.add(mesh);
  }));
  scene.add(group);
  let disposed = false;
  return {
    group,
    update(dt) { if (!disposed && Number.isFinite(dt) && dt > 0) time.value += Math.min(dt,.1); },
    dispose() { if (disposed) return; disposed=true; group.removeFromParent(); geometry.dispose(); materials.forEach(m=>m.dispose()); },
  };
}
