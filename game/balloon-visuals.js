// Original supplied RGB for flight, ground contact and rupture. No replacement balloon geometry.
export function createBalloonVisuals(THREE) {
  const bursts=[],textures={flight:null,ground:null,splash:null};
  const ready=typeof Image==='undefined'?Promise.resolve():Promise.all(['balloon-reference.png','balloon-reference-alpha.png'].map(async name=>{
    const image=new Image();image.src=new URL('./assets/'+name,import.meta.url).href;await image.decode();return image;
  })).then(([source,mask])=>{
    function frame(key,sx,sy,sw,sh){
      const c=document.createElement('canvas');c.width=sw;c.height=sh;const x=c.getContext('2d',{willReadFrequently:true});
      x.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
      if(key!=='splash'){x.globalCompositeOperation='destination-in';x.drawImage(mask,sx,sy,sw,sh,0,0,sw,sh);}
      else{
        // The supplied mask omitted the splash. Keep its exact bright water/blue latex RGB; remove the neutral studio backdrop.
        const data=x.getImageData(0,0,sw,sh),p=data.data;
        for(let i=0;i<p.length;i+=4){const hi=Math.max(p[i],p[i+1],p[i+2]),lo=Math.min(p[i],p[i+1],p[i+2]),blue=p[i+2]-p[i]>18&&p[i+1]>p[i]+12;
          p[i+3]=Math.round(255*Math.min(1,Math.max(0,blue?(hi-lo-15)/45:(hi-104)/80)));
        }x.putImageData(data,0,0);
      }
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures[key]=t;
    }
    frame('flight',0,0,512,493);frame('ground',1024,0,512,493);frame('splash',1024,493,512,531);
  });
  function balloon({ground=false}={}){
    const root=new THREE.Group();root.name=ground?'Original supplied grounded water balloon':'Original supplied water balloon artwork';
    const material=new THREE.SpriteMaterial({map:textures[ground?'ground':'flight'],transparent:true,depthWrite:false,alphaTest:.03,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.scale.set(.41,.395,1);
    if(ground)sprite.center.set(.5,.15);
    root.add(sprite);root.userData.sprite=sprite;root.userData.ground=ground;root.userData.dispose=()=>material.dispose();return root;
  }
  function animateBalloon(root,t,v){
    if(root.userData.ground)return;
    root.userData.sprite.material.rotation=t*2.1;const q=Math.sin(t*14)*.025;root.scale.set(1+q,1-q*.8,1);
  }
  function disposeBurst(b){b.root.removeFromParent();b.sprite.material.dispose();}
  function popLatex(scene,position){
    if(bursts.length>=8)disposeBurst(bursts.shift());
    const root=new THREE.Group();root.position.copy(position);scene.add(root);
    const material=new THREE.SpriteMaterial({map:textures.splash,transparent:true,depthWrite:false,alphaTest:.025,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.scale.set(.42,.436,1);root.add(sprite);bursts.push({root,sprite,t:0});
  }
  function updateLatex(dt){for(const b of bursts.slice()){
    b.t+=dt;const t=b.t,s=.42+Math.min(t,.25)*2.6;b.sprite.scale.set(s,s*531/512,1);
    b.root.position.y-=dt*t*.32;b.sprite.material.opacity=Math.min(1,Math.max(0,(.8-t)/.42));
    if(t>.8){disposeBurst(b);bursts.splice(bursts.indexOf(b),1);}
  }}
  function clearLatex(){bursts.forEach(disposeBurst);bursts.length=0;}
  return{ready,balloon,animateBalloon,popLatex,updateLatex,clearLatex};
}
