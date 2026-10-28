import * as THREE from './vendor/three.module.min.js';

// Supplement the photographed lawn with curved, tapered geometry, not alpha cards.
// Existing ground/colliders stay authoritative; this layer is purely visual.
export function createGrassMotion({world,blockers,floors,maxBlades=100}) {
  // v118 has 149,469 reachable instanced triangles: at 5/blade, 100 adds
  // at most 500 and keeps this world+grass below the 150,000 world target.
  const limit=Math.min(100,Math.max(0,maxBlades|0));
  let seed=141427;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -.012,0,0, .012,0,0,
    -.004,.075,.004, .014,.075,.004,
    .010,.155,.012, .020,.155,.012,
    .037,.23,.020
  ],3));
  geometry.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);
  geometry.computeVertexNormals();
  const time={value:0};
  const material=new THREE.MeshStandardMaterial({name:'local tapered living lawn blades',color:0xffffff,roughness:1,metalness:0,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uGrassTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGrassTime;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        float tipWeight=pow(clamp(position.y/.23,0.0,1.0),2.0);
        float phase=instanceMatrix[3].x*.53+instanceMatrix[3].z*.29;
        float breeze=(sin(uGrassTime*1.65+phase)*.022+sin(uGrassTime*.72+phase*.41)*.014)*tipWeight;
        vec3 wind=vec3(.86,0.0,.36)*breeze;
        transformed.x+=dot(wind,normalize(instanceMatrix[0].xyz));
        transformed.z+=dot(wind,normalize(instanceMatrix[2].xyz));
      `);
  };
  material.customProgramCacheKey=()=> 'local-tapered-grass-tip-wind-v1';
  const mesh=new THREE.InstancedMesh(geometry,material,limit);
  mesh.name='decor_local_right_lawn_wind_blades';
  mesh.castShadow=false;mesh.receiveShadow=true;
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  ray.near=0;ray.far=5;
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  let count=0,clumps=0;
  const isSoil=hit=>{
    const materials=Array.isArray(hit.object.material)?hit.object.material:[hit.object.material];
    const mat=materials[hit.face?.materialIndex||0];
    if(mat?.name!=='CC0_PolyHaven_distillery_dirt_source_scale_v36')return false;
    let owner=hit.object;
    while(owner&&!owner.name.startsWith('decor_v113_compact_site_ground_parking_lawn'))owner=owner.parent;
    return !!owner&&hit.point.y<.035;
  };
  const blocked=(x,z)=>blockers.some(b=>x>b.minX-.3&&x<b.maxX+.3&&z>b.minZ-.3&&z<b.maxZ+.3);
  for(let trial=0;trial<2000&&count+10<=limit;trial++){
    const x=8.15+random()*27.0,z=-62.2+random()*84.0;
    if(blocked(x,z))continue;
    ray.set(new THREE.Vector3(x,4,z),down);
    const hit=ray.intersectObjects(floors,false)[0];
    if(!hit||!isSoil(hit))continue;
    clumps++;
    for(let blade=0;blade<10;blade++){
      const angle=random()*Math.PI*2,radius=Math.sqrt(random())*.24;
      const bx=x+Math.cos(angle)*radius,bz=z+Math.sin(angle)*radius;
      if(blocked(bx,bz))continue;
      dummy.position.set(bx,hit.point.y+.002,bz);
      dummy.rotation.set(0,random()*Math.PI*2,0);
      dummy.scale.set(.7+random()*.5,.45+random()*.55,.7+random()*.5);
      dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);
      color.setHSL(.25+random()*.035,.38+random()*.13,.15+random()*.065);
      mesh.setColorAt(count,color);count++;
    }
  }
  mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.computeBoundingSphere();world.add(mesh);
  world.userData.grassMotion={blades:count,clumps,triangles:count*5,drawCalls:1,source:'curved tapered blade geometry over existing photographed lawn',collision:false};
  return {mesh,update(seconds){time.value=seconds;},dispose(){world.remove(mesh);geometry.dispose();material.dispose();}};
}
