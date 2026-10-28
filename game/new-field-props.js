import {createBalloonVisuals} from './balloon-visuals.js';
// Pickups retain the supplied sheet's exact aged-steel/wood RGB, including its edge-mounted Coa socket.
export function createFieldProps(THREE){
  const balloonVisuals=createBalloonVisuals(THREE),textures={};
  const outlines={
    coa:[[455,14],[463,15],[468,21],[465,31],[167,361],[184,380],[188,400],[180,425],[164,446],[142,460],[114,467],[88,465],[66,456],[48,440],[40,419],[43,397],[54,377],[71,361],[91,350],[113,344],[134,345],[151,353]],
    axe:[[81,23],[133,31],[197,50],[196,79],[182,107],[186,123],[220,174],[279,245],[347,321],[412,386],[467,432],[468,447],[458,463],[446,469],[431,466],[391,414],[337,355],[279,291],[221,222],[167,159],[144,130],[127,145],[112,173],[98,198],[79,218],[66,212],[57,196],[49,172],[45,144],[46,116],[52,84],[64,48]],
  };
  const toolsReady=typeof Image==='undefined'?Promise.resolve():Promise.all(Object.keys(outlines).map(async kind=>{
    const image=new Image();image.src=new URL('./assets/source-field-props/'+kind+'-sheet.png',import.meta.url).href;await image.decode();
    const c=document.createElement('canvas');c.width=512;c.height=493;const x=c.getContext('2d');
    x.beginPath();outlines[kind].forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py));x.closePath();x.clip();
    x.drawImage(image,0,0,512,493,0,0,512,493);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures[kind]=texture;
  }));
  function tool(kind){
    const g=new THREE.Group();g.name='Original supplied '+kind+' pickup';
    const material=new THREE.SpriteMaterial({map:textures[kind],transparent:true,depthWrite:false,alphaTest:.025,toneMapped:false});
    const sprite=new THREE.Sprite(material);const height=kind==='coa'?1.45:.95;sprite.scale.set(height*512/493,height,1);sprite.center.set(.5,.05);g.add(sprite);
    g.userData.dispose=()=>material.dispose();return g;
  }
  return{...balloonVisuals,ready:Promise.all([balloonVisuals.ready,toolsReady]),coa:()=>tool('coa'),axe:()=>tool('axe')};
}
