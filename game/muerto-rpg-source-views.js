import {containSleeveCuts} from './held-frame-layout.js';

export function rpgSourcePose({skin='muerto',firing=false,reload=-1,aim=false,loaded=1}={}){
  const row=skin==='muerto'?1:0;
  // Aimed firing keeps its registered camera; reloading then uses the actual bottle-insertion action.
  if(firing)return{sheet:aim?'aim':'forward',column:aim?1:2,row};
  if(reload>=0)return{sheet:'loading',column:reload<.18?1:reload<.84?2:0,row};
  if(aim)return{sheet:'aim',column:loaded<=0?2:0,row};
  return{sheet:'forward',column:loaded<=0?2:aim?1:0,row};
}
export function normalizeRPGAlpha(pixels){
  let max=0;for(let i=3;i<pixels.length;i+=4)max=Math.max(max,pixels[i]);
  if(max>0&&max<255)for(let i=3;i<pixels.length;i+=4)pixels[i]=Math.round(pixels[i]*255/max);
  return max;
}
// Bottle-neck / empty forward mouth, never the large near-camera exhaust bell.
export const RPG_FORWARD_REGISTRATION=Object.freeze([
  [{muzzle:[152,64],cuts:[495,302],axis:.76},{muzzle:[250,110],cuts:[449,NaN],clip:[56,480],axis:.12},{muzzle:[114,105],cuts:[452,NaN],axis:.82}],
  [{muzzle:[151,54],cuts:[448,289],axis:.76},{muzzle:[250,110],cuts:[431,446],clip:[48,480],axis:.12},{muzzle:[114,99],cuts:[382,NaN],axis:.82}],
]);
// Same far-iron feature matched across all six native aimed plates; rear exhaust never sets launch origin.
export const RPG_AIM_REGISTRATION=Object.freeze([
  [{muzzle:[264,120],cuts:[NaN,NaN]},{muzzle:[258,131],cuts:[NaN,NaN]},{muzzle:[250,130],cuts:[NaN,NaN]}],
  [{muzzle:[264,97],cuts:[NaN,494]},{muzzle:[258,104],cuts:[485,480]},{muzzle:[251,100],cuts:[477,NaN]}],
]);
export function rpgForwardLayout({viewportWidth:W,viewportHeight:H,row,column,motionX=0,motionY=0,registration=RPG_FORWARD_REGISTRATION[row][column],fixed=column===1,cuts=registration.cuts,cutXs=registration.clip||[0,512]}){
  const muzzle=registration.muzzle,width=fixed?H*.82:Math.min(H*.82,W*.98),height=width,scale=width/512;
  let left=W*.5-256*scale,top=H*.55-muzzle[1]*scale;
  if(fixed){
    // The sight registration is fixed. Art defects must not move it away from the crosshair.
    left=W*.5-muzzle[0]*scale-motionX;top=H*.5-muzzle[1]*scale-motionY;
  }else{
    for(let i=0;i<3;i++){
      ({top}=containSleeveCuts({viewportWidth:W,viewportHeight:H,left,top,width,height,sourceWidth:512,sourceHeight:512,leftCutY:cuts[0],rightCutY:cuts[1],motionX,motionY}));
      left=W*.5+(top+motionY+muzzle[1]*scale-H*.5)*registration.axis-muzzle[0]*scale-motionX;
    }
  }
  const screenMuzzle=[left+motionX+muzzle[0]*scale,top+motionY+muzzle[1]*scale];
  const sideCuts=cuts.map((y,i)=>({side:i?'right':'left',sourceY:Number.isFinite(y)?y:null,x:left+motionX+cutXs[i]*scale,y:Number.isFinite(y)?top+motionY+y*scale:null}));
  for(const cut of sideCuts)cut.visible=cut.y!==null&&cut.x>=0&&cut.x<=W&&cut.y>=0&&cut.y<H;
  return{left,top,width,height,muzzle,screenMuzzle,sideCuts};
}
export function rpgAimLayout(options){return rpgForwardLayout({...options,registration:RPG_AIM_REGISTRATION[options.row][options.column],fixed:true,cutXs:[0,512]});}
export function inspectRPGSideCuts(pixels,width=512,height=512,edges=[0,width-1]){
  return edges.map((edge,i)=>{
    let first=null,last=null,count=0;
    for(let y=0;y<height;y++)if([edge,edge+(i?-2:2)].some(x=>pixels[(y*width+x)*4+3]>32)){if(first===null)first=y;last=y;count++;}
    return{first,last,count};
  });
}
// Native action pixels and the untouched approved turnaround remain separate sources.
export function createMuertoRPGSourceViews(T,parent){
  const source=new Image();source.src=new URL('./assets/weapons/muerto-rpg/approved-original.png',import.meta.url).href;
  const load=file=>{const image=new Image();image.src=new URL('./assets/weapons/muerto-rpg/'+file,import.meta.url).href;return image;};
  const loading=load('loading-sheet.png'),forward=load('forward-actions.png'),aimed=load('aim-actions.png');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.hidden=true;
  canvas.setAttribute('aria-hidden','true');canvas.dataset.weapon='muerto-rpg';
  Object.assign(canvas.style,{position:'absolute',pointerEvents:'none',maxWidth:'none'});parent.append(canvas);
  const ctx=canvas.getContext('2d'),textures=[],instances=new Set(),frames={loading:[],forward:[],aim:[]},cutReports={loading:[],forward:[],aim:[]};let readyToDraw=false,disposed=false,left=0,top=0,width=512,height=512,dx=0,dy=0,lastPose=null,lastPaint='',muzzlePoint=[248,120],lastLayout=null;
  const outline=(c,points)=>{c.beginPath();for(let i=0;i<points.length;i++)c[i?'lineTo':'moveTo'](...points[i]);c.closePath();c.clip();};
  function plate(crop,points){
    const [x,y,w,h]=crop,c=document.createElement('canvas');c.width=w;c.height=h;
    const p=c.getContext('2d');p.save();outline(p,points.map(([a,b])=>[a-x,b-y]));p.drawImage(source,x,y,w,h,0,0,w,h);p.restore();return c;
  }
  const ready=Promise.all([source,loading,forward,aimed].map(i=>i.decode())).then(()=>{
    if(disposed)return;
    if(source.naturalWidth!==1536||source.naturalHeight!==1024)throw new Error('Muerto RPG approved source dimensions changed');
    const side=plate([0,498,750,252],[[18,575],[56,574],[76,563],[95,548],[132,539],[187,540],[211,552],[270,554],[271,504],[288,503],[289,550],[512,554],[514,537],[530,528],[541,528],[544,550],[602,553],[637,546],[692,528],[711,533],[727,560],[738,599],[736,638],[719,668],[699,670],[649,655],[601,643],[441,648],[456,733],[448,743],[404,747],[389,736],[373,687],[334,684],[333,657],[204,651],[196,730],[181,742],[165,742],[161,730],[160,651],[104,644],[79,626],[62,606],[21,606],[17,598]]);
    const bottle=plate([826,51,103,431],[[857,56],[866,53],[888,53],[898,58],[897,86],[893,97],[893,166],[905,181],[917,204],[925,228],[925,464],[920,474],[905,480],[850,479],[834,471],[829,459],[829,227],[835,205],[846,185],[856,173],[858,101],[852,94],[854,63]]);
    for(const c of [side,bottle]){const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);}
    for(const [name,image] of [['loading',loading],['forward',forward],['aim',aimed]]){
      if(image.naturalWidth!==1536||image.naturalHeight!==1024)throw new Error('Muerto RPG '+name+' sheet dimensions changed');
      for(let row=0;row<2;row++)for(let column=0;column<3;column++){
        const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d',{willReadFrequently:true}),clip=name==='forward'?RPG_FORWARD_REGISTRATION[row][column].clip:null;
        // Exclude neighboring source poses that intrude into nominal atlas tiles. Retained pixels stay exact.
        if(clip){x.beginPath();x.rect(clip[0],0,clip[1]-clip[0],512);x.clip();}
        if(name==='aim'&&row===1){x.beginPath();x.rect(0,8,512,504);x.clip();}
        x.drawImage(image,column*512,row*512,512,512,0,0,512,512);
        const pixels=x.getImageData(0,0,512,512);normalizeRPGAlpha(pixels.data);cutReports[name].push(inspectRPGSideCuts(pixels.data,512,512,clip?[clip[0],clip[1]-1]:[0,511]));x.putImageData(pixels,0,0);frames[name].push(c);
      }
    }
    readyToDraw=true;canvas.dataset.source='native-forward-aim-loading-original-world';canvas.dataset.actionArt='separate-hip-aim-loading';canvas.dataset.sourceCutReport=JSON.stringify(cutReports);
  });
  function layout(){
    width=height=Math.min(innerHeight*.82,innerWidth*.98);
    left=innerWidth*.5-256/512*width;top=innerHeight-height;
    if(lastPose?.sheet==='loading'){
      lastLayout=null;
      left=innerWidth-width*.90;top=innerHeight-height*.66;
      ({top}=containSleeveCuts({viewportWidth:innerWidth,viewportHeight:innerHeight,left,top,width,height,sourceWidth:512,sourceHeight:512,leftCutY:295,rightCutY:295,motionX:dx,motionY:dy}));
    }else{
      const row=lastPose?.row||0,column=lastPose?.column||0,sheet=lastPose?.sheet||'forward',cuts=cutReports[sheet][row*3+column]?.map(c=>c.first??NaN),options={viewportWidth:innerWidth,viewportHeight:innerHeight,row,column,motionX:dx,motionY:dy,cuts};
      lastLayout=sheet==='aim'?rpgAimLayout(options):rpgForwardLayout(options);
      ({left,top,width,height}=lastLayout);muzzlePoint=lastLayout.muzzle;
      canvas.dataset.muzzle=lastLayout.screenMuzzle.map(n=>n.toFixed(2)).join(',');canvas.dataset.visibleSideCuts=String(lastLayout.sideCuts.filter(c=>c.visible).length);
    }
    Object.assign(canvas.style,{left:(left+dx)+'px',top:(top+dy)+'px',width:width+'px',height:height+'px'});
  }
  function update({visible=false,skin='muerto',firing=false,reload=-1,aim=false,loaded=1,bob=0,moving=0}={}){
    if(disposed)return;canvas.hidden=!(visible&&readyToDraw);if(canvas.hidden)return;
    lastPose=rpgSourcePose({skin,firing,reload,aim,loaded});dx=Math.cos(bob)*Math.min(1,moving)*3;dy=Math.abs(Math.sin(bob))*Math.min(1,moving)*3;
    layout();const key=lastPose.sheet+':'+lastPose.row+':'+lastPose.column;
    if(key!==lastPaint){ctx.clearRect(0,0,512,512);ctx.drawImage(frames[lastPose.sheet][lastPose.row*3+lastPose.column],0,0);lastPaint=key;}
    canvas.dataset.skin=skin;canvas.dataset.pose=lastPose.sheet==='aim'?['aim-loaded','aim-fired-empty','aim-recover-empty'][lastPose.column]:lastPose.sheet==='loading'?'reload-'+lastPose.column:firing?'fired-empty':loaded<=0?'empty':'forward-ready';
  }
  function sprite(texture,w,h){
    const mat=new T.SpriteMaterial({map:texture,transparent:true,alphaTest:.07,depthWrite:true,toneMapped:false}),m=new T.Sprite(mat);m.scale.set(w,h,1);instances.add(m);
    m.userData.dispose=()=>{instances.delete(m);mat.dispose();};return m;
  }
  function pickup(){
    if(!readyToDraw)throw new Error('Muerto RPG artwork must load before creating pickups');
    const g=new T.Group(),m=sprite(textures[0],1.55,1.55*252/750);m.position.y=.36;g.add(m);g.name='Muerto RPG approved source pickup';g.userData.dispose=()=>m.userData.dispose();return g;
  }
  function rocket(){
    if(!readyToDraw)throw new Error('Muerto bottle artwork must load before firing');
    const m=sprite(textures[1],.15,.63);m.name='Original Muerto bottle projectile';return m;
  }
  addEventListener('resize',layout);
  return{canvas,ready,update,pickup,rocket,muzzle:()=>[left+dx+muzzlePoint[0]/512*width,top+dy+muzzlePoint[1]/512*height],review:()=>({sourceCuts:cutReports,layout:lastLayout,pose:lastPose}),hide(){canvas.hidden=true;},dispose(){disposed=true;removeEventListener('resize',layout);canvas.remove();for(const m of [...instances])m.userData.dispose();textures.forEach(t=>t.dispose());}};
}
