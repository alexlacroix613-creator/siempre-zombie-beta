export const SOURCE_VIVO_REVISION='20261028-neutral-glass-seam-v7';
export const SOURCE_VIVO_PROFILE=Object.freeze({top:600,capReferenceTop:175,shoulder:1050,labelTop:1470,labelBottom:2940,base:3321,bodyMinX:690,bodyMaxX:1405});
// Source-faithful component. Generated RGB is limited to optics and missing sleeve outside source frame.
export function createSourceVivoCompositor({official,relight,labelAngle=official,sleeveExtensions={}}){
// Convert the native black-backed optical component to a transmissive reflection layer.
const optics=document.createElement('canvas');optics.width=relight.naturalWidth;optics.height=relight.naturalHeight;const oc=optics.getContext('2d',{willReadFrequently:true});oc.drawImage(relight,0,0);const op=oc.getImageData(0,0,optics.width,optics.height);
for(let i=0;i<op.data.length;i+=4){const l=.2126*op.data[i]+.7152*op.data[i+1]+.0722*op.data[i+2];op.data[i]=op.data[i+1]=op.data[i+2]=l;const a=Math.max(op.data[i],op.data[i+1],op.data[i+2])/255;if(a<=0){op.data[i+3]=0;continue;}for(let k=0;k<3;k++)op.data[i+k]=Math.min(255,op.data[i+k]/a);op.data[i+3]*=a;}
oc.putImageData(op,0,0);
// Pilot only: native optical RGB mapped inside the immutable official silhouette.
const glassBody=document.createElement('canvas');glassBody.width=2100;glassBody.height=3500;const gb=glassBody.getContext('2d');
// Optical components only; all label/body geometry comes from official alpha.
gb.drawImage(optics,420,150,140,330,925,720,270,330);
gb.drawImage(optics,311,480,350,200,690,1050,710,440);
gb.drawImage(optics,311,1360,350,182,690,2920,710,401);
gb.globalCompositeOperation='destination-in';gb.drawImage(official,0,0);gb.globalCompositeOperation='source-over';
// Exact original paper/printed RGB, with no recoloring or cylindrical warp.
gb.save();gb.beginPath();gb.moveTo(690,1490);gb.quadraticCurveTo(1045,1450,1405,1490);gb.lineTo(1405,2925);gb.quadraticCurveTo(1045,2965,690,2925);gb.closePath();gb.clip();gb.drawImage(labelAngle,0,0);
// Neutral scene-material lighting on the intact official base texture.
gb.globalCompositeOperation='source-atop';gb.fillStyle='rgba(0,0,0,.157)';gb.fillRect(624,1450,853,1530);gb.restore();gb.globalCompositeOperation='destination-in';gb.drawImage(official,0,0);gb.globalCompositeOperation='source-over';
const glassNeck=optics;

return function compose({original,mask,pose='full',skin='vivo'}){const pilot=document.createElement('canvas');pilot.width=1672;pilot.height=941;const p=pilot.getContext('2d');
const scale=.285,ox=308.75,oy=-103.35;
// Preserve official body geometry in one uniform 2D transform for each pose.
function bottle(){
 p.drawImage(glassBody,624,720,853,2601,624,720,853,2601);
 p.drawImage(glassNeck,420,85,140,65,925,600,270,120);
}
p.save();if(pose==='pour'){p.translate(315,173);p.rotate(1.6998);p.scale(.274,.274);p.translate(-1050,-3321);}else{p.translate(ox,oy);p.scale(scale,scale);}bottle();p.restore();
// Existing clear-glass prop: neutral optics only outside the original foreground hand matte.
const right=document.createElement('canvas');right.width=1672;right.height=941;const rc=right.getContext('2d',{willReadFrequently:true});rc.drawImage(original,0,0);
const matte=document.createElement('canvas');matte.width=1672;matte.height=941;const mc=matte.getContext('2d',{willReadFrequently:true});mc.drawImage(mask,0,0,1672,941);const ma=mc.getImageData(0,0,1672,941),ri=rc.getImageData(0,0,1672,941);
// One-pixel erosion removes registration fringe from native alpha; source RGB remains intact.
const originalAlpha=new Uint8ClampedArray(ma.data);for(let y=1;y<940;y++)for(let x=1;x<1671;x++){const i=(y*1672+x)*4;let a=255;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)a=Math.min(a,originalAlpha[((y+dy)*1672+x+dx)*4+3]);ma.data[i+3]=a;}mc.putImageData(ma,0,0);

// The generated hand mask mistakenly includes glass/liquid. Explicit optical contours stop its ivory/copper leaks.
const shapes={
 pour:[[[990,365],[1168,365],[1186,396],[1206,452],[1219,495],[1219,529],[1205,563],[1186,589],[1162,609],[1135,617],[1107,610],[1084,601],[1062,600],[1041,606],[1023,620],[1003,612],[978,592],[960,567],[949,538],[943,511],[950,469],[969,418]],[[1057,681],[1094,682],[1092,701],[1120,707],[1141,719],[1160,736],[1155,749],[1130,759],[1092,765],[1040,762],[996,752],[975,740],[975,729],[994,717],[1020,711],[1054,704]]],
 full:[[[947,361],[1138,361],[1159,405],[1175,459],[1182,505],[1174,548],[1153,582],[1124,607],[1096,616],[1075,604],[1054,599],[1029,601],[1010,611],[997,619],[970,603],[944,580],[924,551],[910,519],[908,477],[922,423]],[[1028,680],[1069,684],[1074,704],[1104,711],[1125,724],[1138,739],[1128,752],[1099,762],[1058,767],[1009,762],[964,752],[937,739],[940,727],[961,716],[992,709],[1027,703]]],
 flick:[[[918,348],[965,320],[1020,301],[1096,289],[1117,314],[1153,357],[1176,407],[1185,444],[1173,488],[1155,518],[1126,544],[1100,550],[1080,540],[1057,535],[1035,537],[1012,550],[998,561],[969,549],[943,529],[923,500],[913,461],[911,412]],[[1060,616],[1100,626],[1106,644],[1127,645],[1143,656],[1151,674],[1144,689],[1104,701],[1063,706],[1020,701],[992,691],[985,679],[996,662],[1023,648],[1053,636]]]
};
const optical=document.createElement('canvas');optical.width=1672;optical.height=941;const oxm=optical.getContext('2d',{willReadFrequently:true});oxm.fillStyle='#fff';
for(const points of (shapes[pose]||(pose==='empty'?shapes.full:[]))){oxm.beginPath();points.forEach(([x,y],i)=>i?oxm.lineTo(x,y):oxm.moveTo(x,y));oxm.closePath();oxm.fill();}
const forceOptics=oxm.getImageData(0,0,1672,941).data;
// Actual glove/finger RGB is protected outside the traced glass silhouette, including Muerto copper leather.
for(let y=0;y<775;y++)for(let x=900;x<1225;x++){if(pose==='release')continue;const i=(y*1672+x)*4,r=ri.data[i],g=ri.data[i+1],b=ri.data[i+2],teal=g>r*1.07&&b>r*1.15,black=Math.max(r,g,b)<120&&Math.max(r,g,b)-Math.min(r,g,b)<28,foreground=ma.data[i+3]>32;if(forceOptics[i+3]<=32&&(teal||black||foreground))continue;const l=.2126*r+.7152*g+.0722*b;ri.data[i]=ri.data[i+1]=ri.data[i+2]=l;}rc.putImageData(ri,0,0);
if(pose==='pour'){
 p.drawImage(right,800,354,872,587,800,354,872,587);
 // Preserve the existing physical stream from mouth to glass, without native bottle fragments.
 p.save();p.beginPath();p.moveTo(1043,285);p.lineTo(1075,285);p.lineTo(1100,354);p.lineTo(1058,354);p.closePath();p.clip();p.drawImage(right,0,0);p.restore();
}else p.drawImage(right,800,0,872,941,800,0,872,941);
// Native alpha only; every visible glove/sleeve RGB pixel comes from the original pose.
const hands=document.createElement('canvas');hands.width=1672;hands.height=941;const h=hands.getContext('2d');h.drawImage(original,0,0);h.globalCompositeOperation='destination-in';h.drawImage(matte,0,0);p.drawImage(hands,0,0,800,941,0,0,800,941);

let image=pilot;const cuts={full:[920,925],pour:[456,906],release:[926,933],flick:[924,883],empty:[920,931]};let layout={originX:0,originY:0,edgeCuts:cuts[pose]};
const extension=sleeveExtensions[skin];
if(pose==='pour'&&extension){
 const {image:outpaint,registration:r}=extension,w=Math.round(outpaint.naturalWidth/r.scale),height=Math.round(outpaint.naturalHeight/r.scale),ox=Math.round(r.tx/r.scale),oy=Math.round(r.ty/r.scale);
 image=document.createElement('canvas');image.width=w;image.height=height;const e=image.getContext('2d');e.drawImage(outpaint,0,0,w,height);e.clearRect(ox,oy,1672,941);
 // Clearing the native rectangle also cleared the inside half of its sleeve join. Rebuild ONLY that sleeve span.
 const sleeve=document.createElement('canvas');sleeve.width=outpaint.naturalWidth;sleeve.height=outpaint.naturalHeight;const sx=sleeve.getContext('2d',{willReadFrequently:true});sx.drawImage(outpaint,0,0);const pixels=sx.getImageData(0,0,sleeve.width,sleeve.height).data;
 function span(data,width,height,x){let top=-1,bottom=-1;for(let y=0;y<height;y++)if(data[(y*width+x)*4+3]>32){if(top<0)top=y;bottom=y;}return top<0?null:{top,bottom};}
 const scaleX=sleeve.width/w,scaleY=sleeve.height/height,seam=span(pixels,sleeve.width,sleeve.height,Math.round(ox*scaleX)),nativeSeam=span(ma.data,1672,941,0);
 if(seam&&nativeSeam){
   const reach=384,inside=256,first=Math.max(0,ox-reach),last=Math.min(w,ox+inside);
   const topDelta=oy+nativeSeam.top-seam.top/scaleY,bottomDelta=oy+nativeSeam.bottom-seam.bottom/scaleY;
   e.clearRect(first,0,last-first,height);
   for(let x=first;x<last;x++){
     const nativeX=x-ox,sourceX=Math.min(sleeve.width-1,Math.max(0,Math.floor((x+.5)*scaleX))),source=span(pixels,sleeve.width,sleeve.height,sourceX);if(!source)continue;
     let top,bottom;
     if(nativeX>=0){const native=span(ma.data,1672,941,nativeX);if(!native)continue;top=oy+native.top;bottom=oy+native.bottom;}
     else{const blend=Math.max(0,1+nativeX/reach);top=source.top/scaleY+topDelta*blend;bottom=source.bottom/scaleY+bottomDelta*blend;}
     e.drawImage(outpaint,sourceX,source.top,1,source.bottom-source.top+1,x,top,1,bottom-top+1);
   }
 }
 // Match only generated sleeve RGB to the intact native edge, with row-local tone and a soft outward falloff.
 if(seam&&nativeSeam){
   const joined=e.getImageData(0,0,w,height),data=joined.data,feather=72;
   for(let y=nativeSeam.top;y<=nativeSeam.bottom;y++){
     const yy=oy+y;if(yy<0||yy>=height)continue;
     const nativeRGB=[0,0,0],extensionRGB=[0,0,0];let nc=0,ec=0;
     for(let k=0;k<6;k++){
       const ni=(y*1672+k)*4,ei=(yy*w+ox-1-k)*4;
       if(ma.data[ni+3]>180&&ri.data[ni+3]>180){for(let c=0;c<3;c++)nativeRGB[c]+=ri.data[ni+c];nc++;}
       if(data[ei+3]>180){for(let c=0;c<3;c++)extensionRGB[c]+=data[ei+c];ec++;}
     }
     if(!nc||!ec)continue;
     const delta=nativeRGB.map((v,c)=>v/nc-extensionRGB[c]/ec),edge=(y*1672)*4;
     for(let distance=0;distance<feather;distance++){
       const x=ox-1-distance;if(x<0)break;const i=(yy*w+x)*4;if(data[i+3]<32)continue;
       const t=1-distance/feather,weight=t*t*(3-2*t),edgeBlend=ma.data[edge+3]>180?Math.max(0,1-distance/6):0;
       for(let c=0;c<3;c++){const registered=data[i+c]+delta[c]*weight;data[i+c]=registered*(1-edgeBlend)+ri.data[edge+c]*edgeBlend;}
     }
   }
   e.putImageData(joined,0,0);
 }
 // Exact native hands/bottle/glass remain on top at their original fixed anchor and scale.
 e.drawImage(pilot,ox,oy);layout={originX:ox,originY:oy,edgeCuts:r.nativeEdgeCuts.map(y=>y===null?undefined:Math.ceil(y/r.scale)),sleeveJoin:'alpha-and-row-RGB-registered-strip'};
}
image.frameLayout=layout;return image;};}
