// Source-profiled glass with actual supplied optical detail; white clear glass/liquid only.
export function createSourceGlassProjectiles(THREE){
  let optics=null;
  const ready=typeof Image==='undefined'?Promise.resolve():Promise.all(['new-held-weapons/glass-wide-full-vivo.png','source-vivo/hold-hand-mask-native.png'].map(async name=>{
    const image=new Image();image.src=new URL('./assets/'+name,import.meta.url).href;await image.decode();return image;
  })).then(([source,hand])=>{
    const c=document.createElement('canvas');c.width=278;c.height=410;const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(source,903,357,278,410,0,0,278,410);const pixels=x.getImageData(0,0,278,410);
    x.clearRect(0,0,278,410);x.drawImage(hand,903,357,278,410,0,0,278,410);const mask=x.getImageData(0,0,278,410);
    for(let i=0;i<pixels.data.length;i+=4){const p=pixels.data,l=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
      p[i]=p[i+1]=p[i+2]=255;p[i+3]=Math.round(p[i+3]*(1-mask.data[i+3]/255)*Math.pow(l/255,2)*.72);
    }x.putImageData(pixels,0,0);optics=new THREE.CanvasTexture(c);optics.colorSpace=THREE.SRGBColorSpace;
  });
  function create(){
    const g=new THREE.Group();g.name='Source-profiled clear cognac glass';
    const glass=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.055,metalness:0,transmission:.98,thickness:.002,ior:1.47,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide});
    const liquid=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.035,metalness:0,transmission:.99,thickness:.01,ior:1.36,transparent:true,opacity:.35,depthWrite:false});
    // Measured full-source silhouette: widest bowl below centre, narrow mouth and short stem.
    const V=(x,y)=>new THREE.Vector2(x,y),profile=[V(.006,0),V(.020,.004),V(.033,.014),V(.045,.030),V(.050,.047),V(.049,.063),V(.045,.080),V(.039,.096),V(.034,.101)];
    const bowl=new THREE.LatheGeometry(profile,64),outer=new THREE.Mesh(bowl,glass);g.add(outer);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.034,.0012,8,64),glass);lip.rotation.x=Math.PI/2;lip.position.y=.101;g.add(lip);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.0042,.005,.045,24),glass);stem.position.y=-.0225;g.add(stem);
    const foot=new THREE.Mesh(new THREE.LatheGeometry([V(0,-.052),V(.025,-.052),V(.037,-.050),V(.038,-.048),V(.029,-.045),V(.005,-.043)],64),glass);g.add(foot);
    const reflection=new THREE.MeshBasicMaterial({map:optics,color:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    for(const mesh of [outer,stem,foot]){
      const geo=mesh.geometry.clone(),p=geo.attributes.position,uv=geo.attributes.uv;
      for(let i=0;i<p.count;i++)uv.setXY(i,.5+p.getX(i)/.104,(p.getY(i)+mesh.position.y+.052)/.153);
      uv.needsUpdate=true;const layer=new THREE.Mesh(geo,reflection);layer.position.copy(mesh.position);layer.scale.setScalar(1.002);layer.renderOrder=2;g.add(layer);
    }
    const pool=new THREE.Mesh(new THREE.LatheGeometry([V(0,.003),V(.018,.005),V(.031,.014),V(.043,.030),V(.047,.041),V(0,.041)],48),liquid);pool.renderOrder=1;g.add(pool);
    g.userData={pool,rim:new THREE.Vector3(0,.101,0),setLevel(l){pool.visible=l>.02;pool.scale.y=Math.max(.02,Math.min(1,l));}};
    return g;
  }
  return{ready,create};
}
