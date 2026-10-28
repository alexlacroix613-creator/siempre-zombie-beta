import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RGBELoader } from './vendor/RGBELoader.js';
import { createGrassMotion } from './grass-motion.js';
import { inactiveRefillNode } from './refill-layout.js';

// The expanded site uses local scores; legacy ranked rules remain available with ?legacy.
export async function installDistilleryWorld({ scene, blockers, gateBars, bulletMeshes, tombs, barrels, ground }) {
  const previous = [...scene.children];
  const review=new URLSearchParams('lawn118');
  // This preview opens on the latest usable WIP; the source snapshot stays unchanged.
  if (!review.has('stableWorld') && !review.has('worldReview')) {
    review.set('worldReview', 'near-agave-mature-v96');
  }
  if (!review.has('stableWorld')) {
    review.set('droneSoil', '');
    if (!review.has('soilMap')) review.set('soilMap', 'nom1414-drone-ground-v90');
    if (!review.has('soilBlend')) review.set('soilBlend', '0.35');
  }

  const droneSoilBlend = review.has('soilBlend') ? Math.max(0, Math.min(0.8, Number(review.get('soilBlend')) || 0.42)) : review.get('soilMap')==='nom1414-drone-ground-v89'?0.22:review.get('soilMap')==='nom1414-drone-ground-v90'?0.25:0.42;
  const worldPath = './assets/world-lawn-v118-d7c4d3e9.glb';
  const { scene: world } = await new GLTFLoader().loadAsync(worldPath);
  if(review.get('worldReview')==='near-agave-fuller-v87'||review.get('worldReview')==='near-agave-v94'||review.get('worldReview')==='near-agave-basal-v95'||review.get('worldReview')==='near-agave-mature-v96'){
    const plantGroup=world.getObjectByName('decor_near_field_agave_rosettes_3d_v69');
    if(!plantGroup) throw new Error('Staged NOM1414 agave geometry is missing.');
    const leafMap=await new THREE.TextureLoader().loadAsync('./assets/pbr/embedded-nom1414-leaf-albedo-v84.jpg?art-review=20261025-v87-field-leaf-albedo');
    leafMap.colorSpace=THREE.SRGBColorSpace;leafMap.wrapS=leafMap.wrapT=THREE.ClampToEdgeWrapping;leafMap.anisotropy=8;
    plantGroup.traverse(o=>{
      if(!o.isMesh) return;
      o.geometry.computeVertexNormals();
      o.material=new THREE.MeshStandardMaterial({name:'review photographed NOM1414 agave leaf v87',map:leafMap,color:new THREE.Color(.64,.72,.67),roughness:.92,metalness:0,side:THREE.DoubleSide});
    });
  }
  let dryGrassMap=null,droneSoilMap=null;
  droneSoilMap=await new THREE.TextureLoader().loadAsync('./assets/pbr/nom1414-drone-ground-v90.jpg');
  droneSoilMap.wrapS=droneSoilMap.wrapT=THREE.RepeatWrapping;droneSoilMap.colorSpace=THREE.SRGBColorSpace;droneSoilMap.anisotropy=8;
  const droneAgaveTone=review.has('droneAgaveTone');
  // Source photograph atlas from the existing v118 lawn, not a generated texture.
  const siteGrassMap=await new THREE.TextureLoader().loadAsync('./assets/pbr/review-source-64.jpg');
  siteGrassMap.wrapS=siteGrassMap.wrapT=THREE.RepeatWrapping;
  siteGrassMap.colorSpace=THREE.SRGBColorSpace;siteGrassMap.anisotropy=8;
  let siteSurfaceCount=0,siteConcreteCount=0;
  let nom1414LeafNormal=null;
  let collisionCount = 0;
  world.traverse(o => { if (o.isMesh && o.name.startsWith('col_')) collisionCount++; });
  if (!collisionCount) throw new Error('World has no collision helpers; keeping the original level.');
  const marks = new Set(barrels.map(b => b.mark));
  for (const o of previous) {
    if (o === ground) { o.visible = false; continue; }
    if (o.isCamera || o.isDirectionalLight || o.isHemisphereLight) continue;
    if (o.isPoints && o.geometry.attributes.position.count === 1800) { o.material.opacity = .4; o.material.size = .85; continue; }
    if (o.isMesh && o.material.side === THREE.BackSide) continue;
    if (o.userData.skyMoon || o.userData.skyMoonHalo) continue;
    if (marks.has(o)) continue;
    if (o.isMesh || o.isSprite || o.isPointLight || o.isPoints) o.visible = false;
  }
  blockers.length = 0; gateBars.length = 0; bulletMeshes.length = 0; tombs.length = 0;
  bulletMeshes.push(ground);
  world.updateMatrixWorld(true);
  world.traverse(o => {
    if(inactiveRefillNode(o.name)){o.visible=false;return;}
    if (o.name.startsWith('grave_')) tombs.push(o.getWorldPosition(new THREE.Vector3()));
    if (!o.isMesh) return;
    let siteParent=o;
    while(siteParent&&!siteParent.name.startsWith('decor_v113_compact_site_ground_parking_lawn'))siteParent=siteParent.parent;
    if(siteParent){
      const originalMaterials=Array.isArray(o.material)?o.material:[o.material];
      const surfaceMaterials=originalMaterials.map(source=>{
        if(source.name==='CC0_PolyHaven_distillery_dirt_source_scale_v36'){
          const material=source.clone();material.color.setRGB(1,1,1);
          material.onBeforeCompile=shader=>{
            shader.uniforms.uSiteGrass={value:siteGrassMap};shader.uniforms.uSiteSoil={value:droneSoilMap};
            shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n varying vec3 vSiteSurface;')
              .replace('#include <project_vertex>','vSiteSurface=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <project_vertex>');
            shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n uniform sampler2D uSiteGrass; uniform sampler2D uSiteSoil; varying vec3 vSiteSurface;')
              .replace('#include <map_fragment>',`#include <map_fragment>
                vec3 siteSoil=texture2D(uSiteSoil,vSiteSurface.xz*.22).rgb;
                vec3 siteLawn=texture2D(uSiteGrass,vSiteSurface.xz/4.2).rgb;
                float lawnEdge=7.5+0.10*sin(vSiteSurface.z*1.7)+0.05*sin(vSiteSurface.z*4.1);
                float lawnMask=smoothstep(lawnEdge-.12,lawnEdge+.12,vSiteSurface.x)*smoothstep(-63.0,-62.7,vSiteSurface.z);
                diffuseColor.rgb=mix(siteSoil,siteLawn,lawnMask);
              `);
            shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
              normal=normalize(mix(normal,nonPerturbedNormal,lawnMask));
            `);
          };
          material.customProgramCacheKey=()=> 'local-source-ground-soil-lawn-20261027-v1';
          material.needsUpdate=true;siteSurfaceCount++;return material;
        }
        if(source.name==='CC0_PolyHaven_worn_concrete_floor'){
          const material=source.clone();material.color.setRGB(1,1,1);
          material.roughness=.94;material.normalScale?.set(.55,.55);
          material.needsUpdate=true;siteConcreteCount++;return material;
        }
        return source;
      });
      o.material=Array.isArray(o.material)?surfaceMaterials:surfaceMaterials[0];
    }
    if(nom1414LeafNormal){
      const mats=Array.isArray(o.material)?o.material:[o.material];
      if(mats.some(m=>m.name.startsWith('nom1414_source_agave_leaf_')||m.name==='review photographed NOM1414 agave leaf v87')){
        const fitted=mats.map(m=>{const c=m.clone();c.normalMap=nom1414LeafNormal;c.normalScale.set(.28,.28);c.needsUpdate=true;return c;});
        o.material=Array.isArray(o.material)?fitted:fitted[0];
      }
    }
    if(review.has('hideFarAgave')&&o.name==='decor_far_agave_mobile_773'){o.visible=false;return;}
    if(review.has('toneFarAgave')&&o.name==='decor_far_agave_mobile_773'){
      const toned=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
      for(const m of Array.isArray(toned)?toned:[toned])m.color.multiply(new THREE.Color(0.91,0.94,0.82));
      o.material=toned;
    }
    if(review.has('toneFarAgaveWarm')&&o.name==='decor_far_agave_mobile_773'){
      const toned=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
      for(const m of Array.isArray(toned)?toned:[toned])m.color.multiply(new THREE.Color(1.16,1.08,0.82));
      o.material=toned;
    }
    if(droneAgaveTone&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name==='Agave rosette foliage v69 fitted to candidate'))for(const m of Array.isArray(o.material)?o.material:[o.material]){m.color.multiplyScalar(.78);m.needsUpdate=true;}
    if (o.name.startsWith('col_')) {
      const b = new THREE.Box3().setFromObject(o);
      blockers.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});
      o.visible = false; return;
    }
    if(o.name==='decor_CC0_PolyHaven_distillery_dirt'&&dryGrassMap){
      const m=o.material.clone();
      m.onBeforeCompile=shader=>{
        shader.uniforms.uDryGrassMap={value:dryGrassMap};
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundWorldPos;\n          float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n          float valueNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y);}').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGroundWorldPos = worldPosition.xyz;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uDryGrassMap;\nvarying vec3 vGroundWorldPos;\n          float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n          float valueNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y);}').replace('#include <map_fragment>',`#include <map_fragment>
          float edgeNoise=texture2D(uDryGrassMap,vGroundWorldPos.xz/3.0).r;\n          float edgeNoiseFine=texture2D(uDryGrassMap,vGroundWorldPos.xz/1.05+vec2(0.37,0.21)).g;\n          float noiseBroad=valueNoise(vGroundWorldPos.xz*0.035);float noiseFine=valueNoise(vGroundWorldPos.xz*0.13);\n          float grassEdge=66.0-0.20*(vGroundWorldPos.x+31.0)+3.2*sin(vGroundWorldPos.x*0.045)+1.2*sin(vGroundWorldPos.x*0.16)+0.6*sin(vGroundWorldPos.z*0.10+vGroundWorldPos.x*0.3)+(noiseBroad-0.5)*22.0+(noiseFine-0.5)*8.0+(edgeNoise-0.5)*3.0+(edgeNoiseFine-0.5)*1.5;
          float grassBlend=1.0-smoothstep(grassEdge-9.0,grassEdge+9.0,vGroundWorldPos.z);
          vec3 dryGrass=texture2D(uDryGrassMap,vGroundWorldPos.xz/9.0).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,dryGrass,grassBlend);`);
      };
      m.customProgramCacheKey=()=> 'field-ground-grass-blend-v3';m.needsUpdate=true;o.material=m;
    }
    if(o.name==='decor_CC0_PolyHaven_distillery_dirt'&&droneSoilMap){
      const m=o.material.clone();
      m.onBeforeCompile=shader=>{
        shader.uniforms.uDroneSoilMap={value:droneSoilMap};
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vDroneSoilPos;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvDroneSoilPos=worldPosition.xyz;');
        const soilScale=review.get('soilMap')==='nom1414-drone-ground-v89'||review.get('soilMap')==='nom1414-drone-ground-v90'?'0.22':'0.085';
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uDroneSoilMap;\nvarying vec3 vDroneSoilPos;').replace('#include <map_fragment>',`#include <map_fragment>\nvec3 droneSoil=texture2D(uDroneSoilMap,vDroneSoilPos.xz*${soilScale}).rgb;\ndiffuseColor.rgb=mix(diffuseColor.rgb,droneSoil,${droneSoilBlend.toFixed(2)});`);
      };
      m.customProgramCacheKey=()=> `drone-red-earth-review-${droneSoilBlend.toFixed(2)}-${review.get('soilMap')||'default'}`;m.needsUpdate=true;o.material=m;
    }
    o.castShadow = !o.material.transparent || o.material.name === 'source_fitted_woven_screen';
    o.receiveShadow = true;
    if(o.material.map&&o.material.name.includes('Original oven004')){o.material.emissiveMap=o.material.map;o.material.emissive.setRGB(1,1,1);o.material.emissiveIntensity=review.has('neutralReview')?.65:0;o.material.needsUpdate=true;}
    if(o.material.name==='source_fitted_woven_screen'){const porous=o.material.userData.porousCloth===true;Object.assign(o.material,{transparent:porous,alphaHash:false,alphaToCoverage:!porous,depthWrite:!porous,forceSinglePass:true});o.material.needsUpdate=true;}
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const key of ['map','normalMap','roughnessMap']) if (material[key]) material[key].anisotropy = 4;
    }
    bulletMeshes.push(o);
  });
  world.userData.localSurfaceReview={siteSurfaceCount,siteConcreteCount,grassSource:'embedded v118 real DJI_0037-40s four-crop atlas',geometryChanged:false};
  scene.add(world);
  let moon = null;
  for (const light of previous) {
    if (light.isHemisphereLight) { light.intensity = .65; light.color.setHex(0xa5b6c2); light.groundColor.setHex(0x3e3429); }
    if (light.isDirectionalLight) { light.color.setHex(0xc4d2df); light.intensity = 1.7; moon = light; scene.add(light.target); }
  }
  try {
    const environment = await new RGBELoader().loadAsync('./assets/industrial-sunset.hdr');
    environment.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = environment;
    scene.environmentIntensity = .45;
  } catch (error) { console.warn('Environment lighting unavailable', error); }
  scene.fog.density = .0055;
  const fill = new THREE.SpotLight(0xffd9ae, 170, 35, 1.25, .7, 2);
  fill.position.set(-16,6,-16); fill.target.position.set(-16,0,-26);
  fill.castShadow = true; fill.shadow.mapSize.set(1024,1024); fill.shadow.bias = -.0003;
  scene.add(fill,fill.target);
  if(review.has('neutralReview')){for(const o of previous){if(o.isPoints||(o.isMesh&&o.material?.side===THREE.BackSide)||(o.isMesh&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters.radius===9))o.visible=false;}scene.background=new THREE.Color(0xbcc9cb);scene.fog.color.setHex(0xbcc9cb);scene.fog.density=.0018;scene.environment=null;for(const light of previous){if(light.isHemisphereLight){light.color.setHex(0xd4dfdf);light.groundColor.setHex(0x87705a);light.intensity=1.2;}if(light.isDirectionalLight){light.color.setHex(0xffeed9);light.intensity=3.2;}}fill.intensity=0;}
  document.documentElement.dataset.world = 'viva-mexico';
  const intro = document.querySelector('#screen-title .sub');
  if (intro) intro.textContent = intro.textContent.replace('The old hacienda cemetery wakes at midnight. Hold the courtyard', 'Viva México wakes at midnight. Hold the distillery');
  const moonOffset = moon?.position.clone();
  function updateLighting(position) {
    grassMotion.update(performance.now()*.001);
    if (!moon) return;
    const grid = 90 / moon.shadow.mapSize.x * 32;
    moon.target.position.set(Math.round(position.x/grid)*grid,0,Math.round(position.z/grid)*grid);
    moon.position.copy(moon.target.position).add(moonOffset);
  }
  // Static walkable surfaces provide foot height; collider helpers remain walls.
  world.updateMatrixWorld(true);
  const floors=[];
  world.traverse(o=>{if(o.isMesh&&!o.name.startsWith('col_')&&/ground|curb|apron|street|road|approach|dirt|yard|floor|lawn|parking|path/i.test(o.name))floors.push(o);});
  const grassMotion=createGrassMotion({world,blockers,floors,maxBlades:6000});
  const groundRay=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  const groundStats={meshes:floors.length,queries:0,totalMs:0,maxMs:0};
  function groundHeight(x,z,maxY){
    const started=performance.now();groundRay.set(new THREE.Vector3(x,maxY,z),down);groundRay.near=0;groundRay.far=3;
    const hit=groundRay.intersectObjects(floors,false).find(h=>h.face&&normal.copy(h.face.normal).applyNormalMatrix(normalMatrix.getNormalMatrix(h.object.matrixWorld)).y>.6);
    const elapsed=performance.now()-started;groundStats.queries++;groundStats.totalMs+=elapsed;groundStats.maxMs=Math.max(groundStats.maxMs,elapsed);
    return hit?hit.point.y:0;
  }
  return { world, mapRoot:world, worldPath, groundHeight, groundStats, meshes:bulletMeshes.length, blockers:blockers.length, bounds:[-40,50,-170,40], updateLighting };
}


