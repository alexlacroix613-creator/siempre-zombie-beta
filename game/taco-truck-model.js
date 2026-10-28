import * as THREE from './vendor/three.module.min.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Detailed stationary step-van, modeled from the selected six-view reference.
// Front +Z, west (-X) service side. Static pieces batch by material, not one draw per rivet.
export function createTacoTruckModel(){
  const group=new THREE.Group();group.name='Reference taco stepvan v2';
  const materials=[],textures=[],buckets=new Map();
  function grain(name,base,range,directional=false){
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');let seed=1641;
    for(let y=0;y<128;y++)for(let x=0;x<(directional?1:128);x++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=base+seed%range-range/2;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,y,directional?128:1,1);
    }
    const t=new THREE.CanvasTexture(c);t.name=name;t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(directional?2:4,directional?2:4);textures.push(t);return t;
  }
  const paintNoise=grain('subtle painted sheet metal grain',246,5),metalGrain=grain('runtime brushed stainless grain',220,7,true),rubberGrain=grain('fine tire surface grain',225,16);
  function mat(name,color,roughness,metalness=0,map=null,extra={}){const m=new THREE.MeshStandardMaterial({name,color,roughness,metalness,map,...extra});materials.push(m);return m;}
  const paint=mat('taco truck ivory turquoise continuous painted shell',0xffffff,.44,.12,paintNoise);
  paint.onBeforeCompile=s=>{
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying float vTruckHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTruckHeight=position.y;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vTruckHeight;').replace('#include <map_fragment>',`#include <map_fragment>
      vec3 bodyPaint=vTruckHeight<1.52?vec3(.025,.43,.46):vec3(.89,.865,.79);
      if(vTruckHeight>1.53&&vTruckHeight<1.557)bodyPaint=vec3(.35,.18,.49);
      diffuseColor.rgb*=bodyPaint;`);
  };paint.customProgramCacheKey=()=> 'taco-stepvan-painted-shell-v2';
  const cream=mat('taco truck source ivory painted panel',0xe7dfc8,.44,.12,paintNoise),steel=mat('brushed stainless counter and hood',0xcbd0d0,.34,.76,metalGrain),rubber=mat('black road tire rubber',0x171a19,.93,0,rubberGrain),black=mat('window gaskets and cavity',0x101917,.82),glass=mat('inset tinted cab glass',0x243f3d,.16,.2,null,{transparent:true,opacity:.83,side:THREE.DoubleSide}),red=mat('rear red marker lenses',0xa91d14,.25,.12,null,{emissive:0x4b0804,emissiveIntensity:.25}),amber=mat('amber clearance lenses',0xc68522,.3,.1),warm=mat('service practical light',0xffecd1,.38,0,null,{emissive:0xffd09a,emissiveIntensity:1}),kraft=mat('kraft food trays',0x8a6542,.96),white=mat('squeeze bottle ivory',0xd9d3b7,.68);
  function put(geometry,material,position=[0,0,0],rotation=[0,0,0]){
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));
    geometry.applyMatrix4(matrix);if(geometry.index){const old=geometry;geometry=geometry.toNonIndexed();old.dispose();}
    if(!buckets.has(material))buckets.set(material,[]);buckets.get(material).push(geometry);return geometry;
  }
  function rounded(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
  function bevelBox(w,h,d,material,pos,rot=[0,0,0],r=.018){const shape=rounded(w,h,Math.min(r,w/4,h/4));const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:Math.min(r,d/3),bevelSize:Math.min(r,w/6,h/6),bevelSegments:2,steps:1,curveSegments:3});geo.translate(0,0,-d/2);return put(geo,material,pos,rot);}
  function rod(a,b,r,material,segments=6){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),mid=aa.clone().add(bb).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),bb.clone().sub(aa).normalize());const geo=new THREE.CylinderGeometry(r,r,aa.distanceTo(bb),segments);geo.applyQuaternion(q);return put(geo,material,mid.toArray());}
  function rivet(x,y,z,axis='x'){put(new THREE.SphereGeometry(.007,5,3),steel,[x,y,z],axis==='x'?[0,0,0]:[0,0,0]);}
  function sideProfile(){const s=new THREE.Shape();s.moveTo(-2.65,.59);s.lineTo(-2.65,2.65);s.quadraticCurveTo(-2.65,2.76,-2.54,2.76);s.lineTo(1.94,2.76);s.quadraticCurveTo(2.10,2.76,2.17,2.60);s.lineTo(2.60,1.70);s.quadraticCurveTo(2.75,1.60,2.76,1.47);s.lineTo(2.76,.59);s.lineTo(2.36,.59);s.absarc(1.80,.55,.56,.07,Math.PI-.07,false);s.lineTo(-1.15,.59);s.absarc(-1.70,.55,.55,.07,Math.PI-.07,false);s.lineTo(-2.65,.59);return s;}
  function holeFrom(shape,cx,cy,w,h,r=.025){const p=rounded(w,h,r);for(const curve of p.curves){for(const k of ['v0','v1','v2'])if(curve[k]){curve[k].x+=cx;curve[k].y+=cy;}}shape.holes.push(p);}
  for(const side of [-1,1]){
    const s=sideProfile();
    if(side<0)holeFrom(s,-.65,1.98,2.42,1.0);
    // Cab side-window follows the slanted front; opening is genuinely cut through the shell.
    const window=new THREE.Path();window.moveTo(.94,1.78);window.lineTo(2.44,1.78);window.lineTo(2.07,2.57);window.lineTo(.94,2.57);window.closePath();s.holes.push(window);
    const geo=new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:8});
    put(geo,paint,[side*1.105+.0225,0,0],[0,-Math.PI/2,0]);
    // Side glazing inset behind rubber extrusion frame.
    const sg=new THREE.Shape();sg.moveTo(.96,1.80);sg.lineTo(2.40,1.80);sg.lineTo(2.045,2.55);sg.lineTo(.96,2.55);sg.closePath();put(new THREE.ShapeGeometry(sg),glass,[side*1.09,0,0],[0,-Math.PI/2,0]);
    for(const yy of [1.63,2.64])for(let zz=-2.48;zz<.8;zz+=.32)rivet(side*1.133,yy,zz);
    for(const zz of [-2.52,.77])for(let yy=.72;yy<2.6;yy+=.28)rivet(side*1.133,yy,zz);
    // Door seam and steel pull handle; not decorative pipes.
    for(const [a,b] of [[[.86,.71],[.86,2.65]],[[.86,.71],[2.50,.71]]])rod([side*1.14,a[1],a[0]],[side*1.14,b[1],b[0]],.0035,black,4);
    bevelBox(.025,.035,.18,steel,[side*1.15,1.45,1.25]);
    rod([side*1.13,1.88,2.25],[side*1.38,1.90,2.26],.012,steel);
    bevelBox(.055,.36,.20,black,[side*1.39,2.02,2.26]);bevelBox(.008,.30,.16,steel,[side*1.425,2.02,2.26]);
  }
  // Continuous roof and rounded rear panel.
  bevelBox(2.20,.075,4.54,cream,[0,2.765,-.30],[0,0,0],.035);
  bevelBox(2.20,2.12,.065,paint,[0,1.65,-2.66],[0,0,0],.03);
  for(const points of [[[1.92,2.77],[2.18,2.63],[2.18,2.58],[1.92,2.70]],[[2.59,1.76],[2.77,1.54],[2.80,1.47],[2.61,1.68]]]){
    const profile=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));put(new THREE.ExtrudeGeometry(profile,{depth:2.20,bevelEnabled:false}),cream,[1.10,0,0],[0,-Math.PI/2,0]);
  }
  // Front is shaped as two lower panels plus a slanted split windshield, not a projecting slab.
  bevelBox(2.12,.91,.10,paint,[0,1.08,2.72],[0,0,0],.06);
  const frontQuad=(x0,x1,material,offset=0)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([x0,1.74,2.615+offset,x1,1.74,2.615+offset,x1,2.61,2.19+offset,x0,2.61,2.19+offset],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();put(g,material);};
  frontQuad(-1.04,1.04,black,.012);frontQuad(-.98,-.025,glass,.022);frontQuad(.025,.98,glass,.022);
  rod([0,1.73,2.65],[0,2.64,2.20],.018,steel);
  for(const side of [-1,1]){rod([side*.35,1.78,2.65],[side*.76,1.94,2.57],.012,black);bevelBox(.24,.28,.045,steel,[side*.82,1.12,2.80]);bevelBox(.17,.21,.015,warm,[side*.82,1.12,2.83]);bevelBox(.13,.085,.02,amber,[side*.82,.85,2.82]);}
  bevelBox(1.14,.55,.025,black,[0,1.08,2.79]);for(let i=0;i<8;i++)bevelBox(1.08,.023,.025,steel,[0,.86+i*.064,2.815],[0,0,0],.004);
  bevelBox(2.25,.19,.20,black,[0,.61,2.83],[0,0,0],.025);bevelBox(2.20,.10,.12,steel,[0,.68,2.89],[0,0,0],.02);
  // Solid chassis and interior cab silhouettes seen through inset glazing.
  bevelBox(1.82,.18,5.18,black,[0,.48,.03]);
  for(const xx of [-.55,.55]){bevelBox(.5,.12,.48,black,[xx,.93,1.54]);bevelBox(.48,.60,.11,black,[xx,1.25,1.30],[.12,0,0]);}
  bevelBox(1.9,.16,.4,black,[0,1.54,2.15]);put(new THREE.TorusGeometry(.16,.017,6,20),black,[-.55,1.55,1.92],[.6,0,0]);
  // Profiled black tires, real open vent/spoke faces and metallic hubs. Axles match shell arches.
  const tirePoints=[[.27,-.135],[.36,-.15],[.43,-.12],[.47,-.06],[.475,.04],[.44,.12],[.36,.15],[.27,.135]].map(p=>new THREE.Vector2(...p));
  const rimPoints=[[.265,-.135],[.295,-.13],[.31,-.11],[.31,-.085],[.28,-.07]].map(p=>new THREE.Vector2(...p));
  for(const zz of [-1.70,1.80])for(const side of [-1,1]){
    put(new THREE.LatheGeometry(tirePoints,32),rubber,[side*1.06,.48,zz],[0,0,Math.PI/2]);
    if(zz<0)put(new THREE.LatheGeometry(tirePoints,24),rubber,[side*.78,.48,zz],[0,0,Math.PI/2]);
    put(new THREE.LatheGeometry(rimPoints,32),steel,[side*1.21,.48,zz],[0,0,side>0?-Math.PI/2:Math.PI/2]);
    const disc=new THREE.Shape();disc.absarc(0,0,.272,0,Math.PI*2,false);
    for(let k=0;k<8;k++){const a=k*Math.PI/4,p=new THREE.Path();p.absarc(Math.cos(a)*.205,Math.sin(a)*.205,.037,0,Math.PI*2,true);disc.holes.push(p);}
    const dg=new THREE.ExtrudeGeometry(disc,{depth:.025,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:7});put(dg,steel,[side*1.21,.48,zz],[0,side*Math.PI/2,0]);
    put(new THREE.CylinderGeometry(.095,.10,.085,16),steel,[side*1.26,.48,zz],[0,0,Math.PI/2]);
    for(let k=0;k<6;k++){const a=k*Math.PI/3;put(new THREE.CylinderGeometry(.021,.021,.035,6),steel,[side*1.28,.48+Math.sin(a)*.135,zz+Math.cos(a)*.135],[0,0,Math.PI/2]);}
    for(let k=0;k<20;k++){const a=k*Math.PI/10;put(new THREE.BoxGeometry(.25,.018,.033),rubber,[side*1.06,.48+Math.sin(a)*.472,zz+Math.cos(a)*.472],[a,0,0]);}
    // Thin rolled arch trim follows the opening; it never covers the rubber wheel face.
    put(new THREE.TorusGeometry(.555,.012,4,24,Math.PI),steel,[side*1.14,.55,zz],[0,Math.PI/2,0]);
  }
  // True recessed kitchen aperture, fine stainless perimeter, hinged canopy and gas struts.
  for(const yy of [1.465,2.495])bevelBox(.07,.035,2.48,steel,[-1.142,yy,-.65],[0,0,0],.006);
  for(const zz of [-1.88,.58])bevelBox(.07,1.03,.035,steel,[-1.142,1.98,zz],[0,0,0],.006);
  bevelBox(.67,.048,2.48,steel,[-1.44,1.44,-.65],[0,0,0],.018);
  bevelBox(.045,.12,2.49,steel,[-1.79,1.41,-.65],[0,0,0],.013);
  bevelBox(1.05,.045,2.50,cream,[-1.60,2.57,-.65],[0,0,-.12],.018);
  bevelBox(1.02,.015,2.46,steel,[-1.60,2.539,-.65],[0,0,-.12],.009);
  for(const zz of [-1.73,.43]){rod([-1.15,1.72,zz],[-1.92,2.58,zz],.014,black);rod([-1.15,1.72,zz],[-1.52,2.14,zz],.021,steel);}
  // Stainless back wall and extractor hood sit INSIDE, with sufficient light and depth.
  bevelBox(.035,1.05,2.6,steel,[.88,1.99,-.65]);
  bevelBox(.60,.52,2.55,steel,[.50,1.14,-.65]);bevelBox(.65,.055,2.62,steel,[.49,1.42,-.65]);
  bevelBox(.62,.18,2.55,steel,[.53,2.38,-.65],[0,0,-.16]);
  for(let k=0;k<12;k++)bevelBox(.018,.28,.16,black,[.22,2.20,-1.68+k*.18],[0,0,-.28],.003);
  for(const zz of [-1.45,-.88,-.31,.26]){
    bevelBox(.31,.035,.43,steel,[-1.08,1.47,zz],[0,0,0],.014);
    bevelBox(.27,.035,.385,black,[-1.08,1.49,zz],[0,0,0],.01);
  }
  for(const zz of [-1.25,-.68]){put(new THREE.CylinderGeometry(.12,.115,.19,16),steel,[.30,1.55,zz]);put(new THREE.TorusGeometry(.12,.009,4,16),steel,[.30,1.65,zz],[Math.PI/2,0,0]);rod([.18,1.60,zz],[.11,1.60,zz],.012,steel);}
  for(const zz of [.12,.34]){put(new THREE.CylinderGeometry(.043,.043,.22,12),white,[-.47,1.57,zz]);put(new THREE.ConeGeometry(.015,.075,8),white,[-.47,1.72,zz]);}
  for(let k=0;k<8;k++)bevelBox(.18,.006,.22,kraft,[-.44,1.47+k*.014,-.20],[0,0,0],.008);
  for(const zz of [-1.42,-.6,.22])put(new THREE.CylinderGeometry(.025,.025,.012,10),warm,[-1.47,2.515,zz],[0,0,Math.PI/2]);
  // Roof exhaust, amber markers, rear steel door hardware and bumper.
  bevelBox(.65,.11,.68,steel,[.25,2.83,-.8],[0,0,0],.04);put(new THREE.CylinderGeometry(.20,.20,.24,20),steel,[.25,2.99,-.8]);put(new THREE.CylinderGeometry(.24,.24,.035,20),steel,[.25,3.12,-.8]);
  for(const xx of [-.84,-.42,0,.42,.84])bevelBox(.06,.045,.04,amber,[xx,2.68,2.08],[0,0,0],.012);
  for(const side of [-1,1]){
    bevelBox(1.035,1.88,.045,cream,[side*.535,1.70,-2.715],[0,0,0],.022);
    rod([side*.09,.89,-2.755],[side*.09,2.50,-2.755],.012,steel);
    for(const yy of [1.06,2.35]){bevelBox(.17,.05,.04,steel,[side*1.04,yy,-2.756],[0,0,0],.004);rivet(side*1.00,yy,-2.79,'z');}
    bevelBox(.11,.19,.035,red,[side*1.01,1.01,-2.76],[0,0,0],.015);bevelBox(.10,.065,.035,amber,[side*1.01,.84,-2.76],[0,0,0],.012);
  }
  bevelBox(2.24,.16,.22,black,[0,.58,-2.78],[0,0,0],.025);bevelBox(1.80,.055,.30,steel,[0,.64,-2.85],[0,0,0],.014);
  for(const [material,parts] of buckets){const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)throw new Error('Truck geometry batch failed: '+material.name);const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name=material.name;group.add(mesh);}
  const triangles=group.children.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);
  group.userData.modelStats={triangles,drawCalls:group.children.length,reference:'16-taco-truck/sheet.png',revision:2};
  let disposed=false;group.userData.dispose=()=>{if(disposed)return;disposed=true;group.children.forEach(m=>m.geometry.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
  return group;
}
