export const SOURCE_VIVO_REVISION='20261027-user-neck-v4';
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

// Limit optical neutralization to the bowl. Palms, sleeves and the stem keep original RGB.
for(let y=0;y<590;y++)for(let x=900;x<1180;x++){if(pose==='release')continue;const i=(y*1672+x)*4,r=ri.data[i],g=ri.data[i+1],b=ri.data[i+2],teal=g>r*1.07&&b>r*1.15,black=Math.max(r,g,b)<120&&Math.max(r,g,b)-Math.min(r,g,b)<28,foreground=ma.data[i+3]>32&&(x>1160||(pose==='flick'&&x<1120&&y>530));if(teal||black||foreground)continue;const l=.2126*r+.7152*g+.0722*b;ri.data[i]=ri.data[i+1]=ri.data[i+2]=l;}rc.putImageData(ri,0,0);
if(pose==='pour'){
 p.drawImage(right,800,354,872,587,800,354,872,587);
 // Preserve the existing physical stream from mouth to glass, without native bottle fragments.
 p.save();p.beginPath();p.moveTo(1043,285);p.lineTo(1075,285);p.lineTo(1100,354);p.lineTo(1058,354);p.closePath();p.clip();p.drawImage(right,0,0);p.restore();
}else p.drawImage(right,800,0,872,941,800,0,872,941);
// Native alpha only; every visible glove/sleeve RGB pixel comes from the original pose.
const hands=document.createElement('canvas');hands.width=1672;hands.height=941;const h=hands.getContext('2d');h.drawImage(original,0,0);h.globalCompositeOperation='destination-in';h.drawImage(matte,0,0);p.drawImage(hands,0,0,800,941,0,0,800,941);

let image=pilot;const cuts={full:[920,925],pour:[456,906],release:[926,933],flick:[924,883],empty:[920,931]};let layout={originX:0,originY:0,edgeCuts:cuts[pose]};
const extension=sleeveExtensions[skin];
if(pose==='pour'&&extension){const {image:outpaint,registration:r}=extension;const w=Math.round(outpaint.naturalWidth/r.scale),h=Math.round(outpaint.naturalHeight/r.scale),ox=Math.round(r.tx/r.scale),oy=Math.round(r.ty/r.scale);image=document.createElement('canvas');image.width=w;image.height=h;const e=image.getContext('2d');e.drawImage(outpaint,0,0,w,h);e.clearRect(ox,oy,1672,941);e.drawImage(pilot,ox,oy);layout={originX:ox,originY:oy,edgeCuts:r.nativeEdgeCuts.map(y=>y===null?undefined:Math.ceil(y/r.scale))};}
image.frameLayout=layout;return image;};}
