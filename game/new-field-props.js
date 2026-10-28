import { createBalloonVisuals } from './balloon-visuals.js';
// Small world pickups follow THIS chat's wood/aged-steel objects; no old Coa imports.
export function createFieldProps(THREE){
  const texture=(w,h,pixel)=>{const data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=pixel(x,y);data.set([...c,255],(y*w+x)*4);}const t=new THREE.DataTexture(data,w,h);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;};
  const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const grain=texture(128,512,(x,y)=>{const n=noise(x,y),g=.75+.17*Math.sin(x*.67+Math.sin(y*.025)*.8)+.08*n;return[145*g,92*g,48*g];});
  const patina=texture(256,256,(x,y)=>{const p=.58+.30*noise(x,y)+.12*Math.sin(x*.08)*Math.cos(y*.06);return[145*p,148*p,143*p];});
  const steel=new THREE.MeshStandardMaterial({color:0x777875,metalness:.82,roughness:.48});
  const edge=new THREE.MeshStandardMaterial({color:0xc1c3bd,metalness:.9,roughness:.26});
  const wood=new THREE.MeshStandardMaterial({color:0x855631,roughness:.7});
  const socket=new THREE.MeshStandardMaterial({color:0x444849,metalness:.8,roughness:.5});
  wood.map=grain;wood.color.setHex(0xffffff);steel.map=patina;steel.color.setHex(0xffffff);
  const balloonVisuals=createBalloonVisuals(THREE);
  const part=(g,geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  function coa(){const g=new THREE.Group();g.name='New sheet12 edge-socket Coa pickup';
    // Blade face in XY; shaft joins its upper edge instead of passing through its centre.
    part(g,new THREE.CylinderGeometry(.14,.14,.003,96),steel,0,.17,0).rotation.x=Math.PI/2;
    const rim=part(g,new THREE.TorusGeometry(.1375,.0025,4,96),edge,0,.17,0);rim.scale.z=.32;
    part(g,new THREE.CylinderGeometry(.017,.02,1.18,24),wood,0,.9,0);
    part(g,new THREE.CylinderGeometry(.022,.019,.095,24),socket,0,.355,0);
    part(g,new THREE.CylinderGeometry(.007,.007,.045,12),edge,0,.35,.002).rotation.x=Math.PI/2;
    part(g,new THREE.SphereGeometry(.017,16,10),wood,0,1.49,0);return g;}
  function axe(){const g=new THREE.Group();g.name='New sheet13 wood-and-steel axe pickup';
    const shaft=part(g,new THREE.CylinderGeometry(.025,.035,.82,24),wood,0,.51,0);shaft.rotation.z=-.10;
    const shape=new THREE.Shape();shape.moveTo(-.23,.98);shape.quadraticCurveTo(-.28,.84,-.20,.69);shape.lineTo(-.11,.82);shape.lineTo(.08,.86);shape.lineTo(.08,.97);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.046,bevelEnabled:true,bevelSize:.005,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:18});geo.translate(0,0,-.023);
    part(g,geo,steel,0,0,0);return g;}
  return{coa,axe,...balloonVisuals};
}
