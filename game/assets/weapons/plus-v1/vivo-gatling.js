import { mergeGeometries } from '../../../vendor/BufferGeometryUtils.js';
// Source-matched six-reservoir model, shared by held and world pickup. +Y up, -Z forward.
export function createVivoGatling(T,host={}){
 const g=new T.Group();g.name='vivo-gatling-reference';
 const mat=(color,r=.3,m=0)=>new T.MeshPhysicalMaterial({color,roughness:r,metalness:m,clearcoat:.35,clearcoatRoughness:.25});
 const cream=mat(0xeee0c7,.38),teal=mat(0x008e94,.23),rubber=mat(0x087f83,.62),lav=mat(0xad81cf,.4),metal=mat(0xb5b6b0,.22,.9),dark=mat(0x152326,.65),paper=mat(0xf0e7d4,.82);
 const glass=new T.MeshPhysicalMaterial({color:0xe7faf5,roughness:.065,transmission:.94,thickness:.006,ior:1.46,transparent:true,envMapIntensity:1.2});
 const water=new T.MeshPhysicalMaterial({color:0xd8eee6,roughness:.08,transmission:.75,thickness:.035,ior:1.333,transparent:true,opacity:.3});
 const add=(p,geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);p.add(o);return o;};
 const cyl=(p,r,len,m,x,y,z)=>{const o=add(p,new T.CylinderGeometry(r,r,len,48),m,x,y,z);o.rotation.x=Math.PI/2;return o;};
 const ring=(p,r,t,m,x,y,z)=>add(p,new T.TorusGeometry(r,t,10,64),m,x,y,z);
 const rod=(p,a,b,r,m)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=add(p,new T.CylinderGeometry(r,r,av.distanceTo(bv),12),m);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;};
 const tube=(p,points,r,m)=>add(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),48,r,12,false),m);
 const bolt=(p,x,y,z)=>{cyl(p,.0055,.003,metal,x,y,z);const slot=add(p,new T.BoxGeometry(.006,.0012,.0008),dark,x,y,z-.002);slot.rotation.z=.65;};
 const profile=(p,coords,m,x,y,z)=>{const o=add(p,new T.LatheGeometry(coords.map(v=>new T.Vector2(...v)),64),m,x,y,z);o.rotation.x=Math.PI/2;return o;};
 const grip=(x,y,z,angle=0)=>{const p=new T.Group();p.position.set(x,y,z);p.rotation.x=angle;g.add(p);add(p,new T.CapsuleGeometry(.027,.076,8,24),cream);const pad=add(p,new T.CapsuleGeometry(.022,.07,8,24),rubber,0,0,-.015);pad.scale.z=.48;for(let i=0;i<14;i++){const r=add(p,new T.CapsuleGeometry(.0015,.032,3,8),teal,0,-.044+i*.0065,-.027);r.rotation.z=Math.PI/2;}bolt(p,0,-.052,-.022);};
 profile(g,[[0,-.065],[.053,-.065],[.064,-.056],[.068,-.044],[.068,.035],[.061,.052],[.048,.058],[0,.058]],cream,0,.02,.018);
 cyl(g,.054,.012,teal,0,.02,.083);ring(g,.046,.0028,metal,0,.02,.091);cyl(g,.023,.018,metal,0,.02,.096);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;bolt(g,Math.sin(a)*.057,.02+Math.cos(a)*.057,.071);}
 grip(0,-.083,.038,-.27);grip(0,-.098,-.255,.08);
 tube(g,[[0,-.026,.021],[0,-.072,-.007],[0,-.092,-.048],[0,-.065,-.065],[0,-.024,-.051]],.007,cream);
 const trigger=add(g,new T.CapsuleGeometry(.004,.029,4,10),lav,0,-.053,-.028);trigger.rotation.x=-.3;
 tube(g,[[0,.082,-.001],[0,.154,-.045],[0,.161,-.13],[0,.154,-.226],[0,.102,-.276]],.013,teal);
 for(let i=0;i<12;i++){const r=ring(g,.014,.0014,rubber,0,.161,-.065-i*.011);r.rotation.x=Math.PI/2;}
 for(const z of [-.006,-.28]){add(g,new T.BoxGeometry(.042,.014,.032),cream,0,.094,z);bolt(g,0,.094,z-.017);}
 const rotor=new T.Group();rotor.position.set(0,.02,-.157);g.add(rotor);cyl(rotor,.017,.3,metal,0,0,-.128);
 for(const z of [.012,-.27]){cyl(rotor,.098,.014,teal,0,0,z);ring(rotor,.096,.004,metal,0,0,z-.008);}
 const chambers=[];
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=Math.sin(a)*.063,y=Math.cos(a)*.063,c=new T.Group();c.position.set(x,y,-.13);c.name='glass-reservoir-'+i;rotor.add(c);chambers.push(c);
  profile(c,[[0,-.115],[.018,-.115],[.025,-.107],[.028,-.093],[.028,.095],[.026,.11],[.021,.12],[.012,.128],[0,.128]],glass,0,0,0);
  cyl(c,.024,.183,water,0,-.002,-.001);
  const label=add(c,new T.CylinderGeometry(.0285,.0285,.106,32,1,true,-.66,1.32),paper,0,0,-.005);label.rotation.x=Math.PI/2;label.rotation.z=a;
  for(const z of [-.098,.096]){cyl(c,.03,.014,cream,0,0,z);ring(c,.028,.0022,metal,0,0,z-.008);}
  for(const z of [-.123,-.145]){cyl(c,.019,.014,teal,0,0,z);ring(c,.019,.0014,rubber,0,0,z-.008);}
  for(let k=0;k<24;k++){const a=k*Math.PI/12;rod(c,[Math.sin(a)*.019,Math.cos(a)*.019,-.143],[Math.sin(a)*.019,Math.cos(a)*.019,-.123],.0011,teal);}
  const face=new T.Shape();face.absarc(0,0,.014,0,Math.PI*2,false);
  for(let k=0;k<9;k++){const a=k*Math.PI/4,r=k===8?0:.008,hole=new T.Path();hole.absarc(Math.sin(a)*r,Math.cos(a)*r,.0017,0,Math.PI*2,true);face.holes.push(hole);}
  const screen=add(c,new T.ExtrudeGeometry(face,{depth:.001,bevelEnabled:false,curveSegments:24}),metal,0,0,-.154);screen.rotation.y=Math.PI;
  cyl(c,.013,.004,dark,0,0,-.15);ring(c,.0145,.0017,cream,0,0,-.154);
  for(const z of [-.073,.074]){ring(c,.03,.003,cream,0,0,z);bolt(c,.027,0,z-.004);}
  for(let k=0;k<20;k++){const a=k*2.399963,zz=-.085+(k%11)*.016,bead=add(c,new T.SphereGeometry(.0012+(k%3)*.00035,6,4),glass,Math.sin(a)*.0282,Math.cos(a)*.0282,zz);bead.scale.z=1.3;}
 }
 for(let i=0;i<5;i++){const a=(i+.5)*Math.PI*2/5,x=Math.sin(a)*.102,y=Math.cos(a)*.102;rod(g,[x,.02+y,-.435],[x,.02+y,-.13],.0055,cream);bolt(g,x,.02+y,-.446);}
 cyl(g,.021,.017,metal,0,.02,-.447);ring(g,.021,.003,teal,0,.02,-.46);cyl(g,.009,.018,metal,0,.02,-.459);
 const crank=new T.Group();crank.position.set(.075,.02,.027);g.add(crank);
 rod(crank,[0,0,0],[.015,0,0],.008,metal);rod(crank,[.015,0,0],[.02,-.057,0],.006,metal);rod(crank,[.02,-.057,0],[.044,-.057,0],.005,metal);
 const knob=add(crank,new T.CylinderGeometry(.014,.014,.032,32),lav,.049,-.057,0);knob.rotation.z=Math.PI/2;
 for(let k=0;k<24;k++){const a=k*Math.PI/12;rod(crank,[.034,-.057+Math.sin(a)*.014,Math.cos(a)*.014],[.064,-.057+Math.sin(a)*.014,Math.cos(a)*.014],.0009,lav);}
 // Bake the small details by material separately for the static body, rotating
 // barrel and crank. Hundreds of individual bolts otherwise become hundreds of
 // draw calls for every held weapon and world pickup.
 g.updateMatrixWorld(true);
 const buckets=new Map(),old=[];
 g.traverse(o=>{if(!o.isMesh)return;let parent=o.parent,target=g;while(parent&&parent!==g){if(parent===rotor||parent===crank){target=parent;break;}parent=parent.parent;}
  let byMaterial=buckets.get(target);if(!byMaterial)buckets.set(target,byMaterial=new Map());
  let parts=byMaterial.get(o.material);if(!parts)byMaterial.set(o.material,parts=[]);
  const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  for(const key of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(key))geo.deleteAttribute(key);
  geo.applyMatrix4(new T.Matrix4().copy(target.matrixWorld).invert().multiply(o.matrixWorld));parts.push(geo);old.push(o);
 });
 for(const o of old){o.removeFromParent();o.geometry.dispose();}
 for(const [target,byMaterial] of buckets)for(const [material,parts] of byMaterial){const geo=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!geo)throw new Error('Could not merge Gatling geometry');const mesh=new T.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;target.add(mesh);}
 g.userData={rotor,crank,chambers,muzzle:new T.Vector3(0,.02,-.465),gripPrimary:new T.Vector3(0,-.075,.038),gripSupport:new T.Vector3(0,-.09,-.255),reference:'06-vivo-gatling/sheet.png',dispose(){const gs=new Set(),ms=new Set();g.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);}});gs.forEach(o=>o.dispose());ms.forEach(o=>o.dispose());}};
 return g;
}
