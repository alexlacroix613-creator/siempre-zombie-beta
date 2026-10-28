// Reference-shaped water balloon and bounded visual-only rupture. No combat state here.
export function createBalloonVisuals(THREE) {
  const bursts = [], dummy = new THREE.Object3D();
  const rand = (a,b) => a+Math.random()*(b-a);
  let sourceTexture=null;
  const ready=typeof Image==='undefined'?Promise.resolve():Promise.all(['balloon-reference.png','balloon-reference-alpha.png'].map(async name=>{const image=new Image();image.src=new URL('./assets/'+name,import.meta.url).href;await image.decode();return image;})).then(([source,mask])=>{
    const c=document.createElement('canvas');c.width=512;c.height=493;const x=c.getContext('2d');x.drawImage(source,0,0,512,493,0,0,512,493);x.globalCompositeOperation='destination-in';x.drawImage(mask,0,0,512,493,0,0,512,493);sourceTexture=new THREE.CanvasTexture(c);sourceTexture.colorSpace=THREE.SRGBColorSpace;
  });
  function balloon() {
    const root=new THREE.Group();root.name='Original supplied water balloon artwork';
    const material=new THREE.SpriteMaterial({map:sourceTexture,transparent:true,depthWrite:false,alphaTest:.03,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.scale.set(.41,.395,1);root.add(sprite);root.userData.sprite=sprite;root.userData.dispose=()=>material.dispose();return root;
  }
  function animateBalloon(root,t,v) {root.userData.sprite.material.rotation=t*2.1;const q=Math.sin(t*14)*.025;root.scale.set(1+q,1-q*.8,1);}
  function popLatex(scene,position) {
    if(bursts.length>=8) disposeBurst(bursts.shift());
    const root=new THREE.Group();root.position.copy(position);scene.add(root);
    const water=new THREE.MeshPhysicalMaterial({color:0xd5f4ff,roughness:.08,clearcoat:1,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false});
    // Uneven radial crown, with gaps and thin tendrils rather than an opaque impact ball.
    const p=[],idx=[];const n=44;
    for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=.22+.11*Math.sin(i*2.7),h=.08+.17*Math.pow((Math.sin(i*1.9)+1)/2,3);p.push(Math.cos(a)*.07,-.05,Math.sin(a)*.07,Math.cos(a)*r,h,Math.sin(a)*r);if(i<n&&i%7!==0){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();
    const sheet=new THREE.Mesh(geo,water);root.add(sheet);
    const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),water,64);dummy.position.set(0,0,0);dummy.scale.setScalar(.006);dummy.rotation.set(0,0,0);dummy.updateMatrix();for(let i=0;i<64;i++)drops.setMatrixAt(i,dummy.matrix);root.add(drops);
    const velocities=Array.from({length:64},()=>new THREE.Vector3(rand(-2.5,2.5),rand(.3,3.4),rand(-2.5,2.5)));
    const pieces=[];const latex=new THREE.MeshPhysicalMaterial({color:0x10a9e9,roughness:.3,clearcoat:.8,side:THREE.DoubleSide});
    for(let k=0;k<7;k++){const g=new THREE.BufferGeometry(),p=[];const r=rand(.03,.065);for(let j=0;j<6;j++){const a=j/6*Math.PI*2,b=(j+1)/6*Math.PI*2;p.push(0,0,.012,Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*3)*.02,Math.cos(b)*r,Math.sin(b)*r,Math.sin(b*3)*.02);}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();const m=new THREE.Mesh(g,latex);root.add(m);pieces.push({m,v:new THREE.Vector3(rand(-2,2),rand(.8,2.5),rand(-2,2)),phase:k});}
    bursts.push({root,water,sheet,drops,velocities,pieces,t:0});
  }
  function disposeBurst(b){b.root.removeFromParent();const mats=new Set();b.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.isInstancedMesh)o.dispose();mats.add(o.material);}});mats.forEach(m=>m.dispose());}
  function updateLatex(dt){for(const b of bursts.slice()){b.t+=dt;const t=b.t;b.sheet.scale.setScalar(.2+t*4);b.sheet.position.y=-t*t*.8;b.sheet.visible=t<.38;b.water.opacity=Math.max(0,.65*(1-t/.9));
    for(let i=0;i<64;i++){const v=b.velocities[i];dummy.position.copy(v).multiplyScalar(t);dummy.position.y-=3.5*t*t;const s=.005+(i%5)*.002;dummy.scale.set(s,s*(1+t*2),s);dummy.rotation.set(0,0,0);dummy.updateMatrix();b.drops.setMatrixAt(i,dummy.matrix);}b.drops.instanceMatrix.needsUpdate=true;
    for(const f of b.pieces){f.m.position.copy(f.v).multiplyScalar(t);f.m.position.y-=2.5*t*t;f.m.rotation.set(t*5+f.phase,t*3,0);const p=f.m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(t*8+i+f.phase)*.015);p.needsUpdate=true;}
    if(t>1.25){disposeBurst(b);bursts.splice(bursts.indexOf(b),1);}}}
  function clearLatex(){bursts.forEach(disposeBurst);bursts.length=0;}
  return {ready,balloon,animateBalloon,popLatex,updateLatex,clearLatex};
}
