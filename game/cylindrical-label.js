// Project the ORIGINAL label pixels onto the native bottle's visible cylinder, then inherit its lighting.
export const cylinderU=u=>(Math.sin((u-.5)*2*1.34)/Math.sin(1.34)+1)/2;
export function triangleTransform(s,d){
  const [p,q,r]=s,den=p[0]*(q[1]-r[1])+q[0]*(r[1]-p[1])+r[0]*(p[1]-q[1]);
  const solve=k=>[(d[0][k]*(q[1]-r[1])+d[1][k]*(r[1]-p[1])+d[2][k]*(p[1]-q[1]))/den,
    (d[0][k]*(r[0]-q[0])+d[1][k]*(p[0]-r[0])+d[2][k]*(q[0]-p[0]))/den,
    (d[0][k]*(q[0]*r[1]-r[0]*q[1])+d[1][k]*(r[0]*p[1]-p[0]*r[1])+d[2][k]*(p[0]*q[1]-q[0]*p[1]))/den];
  const [a,c,e]=solve(0),[b,f,g]=solve(1);return[a,b,c,f,e,g];
}
export function shadeLabelPixel(label,paper){
  const high=Math.max(...paper.slice(0,3)),low=Math.min(...paper.slice(0,3));
  if(paper[3]<210||paper[0]<185||paper[1]<165||paper[2]<135||high-low>95)return[0,0,0,0];
  return[label[0]*Math.min(1.08,Math.max(.55,paper[0]/244)),label[1]*Math.min(1.08,Math.max(.55,paper[1]/237)),label[2]*Math.min(1.08,Math.max(.55,paper[2]/219)),label[3]];
}
export function compositeCylinderLabel(image,label,quad){
  const base=document.createElement('canvas');base.width=1672;base.height=941;base.dataset.sourceAtlas=image.src;base.dataset.labelProjection='cylindrical-native-lit';
  const ctx=base.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const layer=document.createElement('canvas');layer.width=1672;layer.height=941;const g=layer.getContext('2d',{willReadFrequently:true});
  const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const point=u=>{const s=cylinderU(u),top=lerp(quad[0],quad[1],s),bottom=lerp(quad[3],quad[2],s);top[1]-=5*Math.sin(Math.PI*s);bottom[1]+=3*Math.sin(Math.PI*s);return[top,bottom];};
  function tri(source,dest){g.save();g.beginPath();g.moveTo(...dest[0]);g.lineTo(...dest[1]);g.lineTo(...dest[2]);g.closePath();g.clip();g.transform(...triangleTransform(source,dest));g.drawImage(label,0,0);g.restore();}
  const w=label.naturalWidth,h=label.naturalHeight;
  for(let i=0;i<64;i++){
    const u0=i/64,u1=(i+1)/64,[t0,b0]=point(u0),[t1,b1]=point(u1);
    // Source image is upside down: invert both UV axes, not the official artwork itself.
    const s0=[(1-u0)*w,h],s1=[(1-u1)*w,h],s2=[(1-u1)*w,0],s3=[(1-u0)*w,0];
    tri([s0,s1,s2],[t0,t1,b1]);tri([s0,s2,s3],[t0,b1,b0]);
  }
  const minX=Math.max(0,Math.floor(Math.min(...quad.map(p=>p[0])))-1),minY=Math.max(0,Math.floor(Math.min(...quad.map(p=>p[1])))-6);
  const width=Math.ceil(Math.max(...quad.map(p=>p[0])))-minX+2,height=Math.ceil(Math.max(...quad.map(p=>p[1])))-minY+5;
  const native=ctx.getImageData(minX,minY,width,height),print=g.getImageData(minX,minY,width,height);
  for(let i=0;i<print.data.length;i+=4){if(!print.data[i+3])continue;print.data.set(shadeLabelPixel([...print.data.subarray(i,i+4)],[...native.data.subarray(i,i+4)]),i);}
  g.putImageData(print,minX,minY);ctx.drawImage(layer,0,0);return base;
}
