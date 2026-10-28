// Continuous segment tests: thin walls and elevated targets cannot be skipped by a long frame.
export function segmentBoxTime(a,b,box,wallHeight=2.4,pad=0){
  let enter=0,leave=1;
  for(let axis=0;axis<3;axis++){
    const p=axis===0?a.x:axis===1?a.y:a.z,d=(axis===0?b.x:axis===1?b.y:b.z)-p;
    const lo=axis===0?box.minX-pad:axis===1?(box.minY??-Infinity)-pad:box.minZ-pad;
    const hi=axis===0?box.maxX+pad:axis===1?(box.maxY??wallHeight)+pad:box.maxZ+pad;
    if(Math.abs(d)<1e-12){if(p<lo||p>hi)return Infinity;continue;}
    let t0=(lo-p)/d,t1=(hi-p)/d;if(t0>t1)[t0,t1]=[t1,t0];
    enter=Math.max(enter,t0);leave=Math.min(leave,t1);if(enter>leave)return Infinity;
  }
  return enter;
}
export function segmentCylinderTime(a,b,centre,radius,minY,maxY){
  const dx=b.x-a.x,dz=b.z-a.z,ox=a.x-centre.x,oz=a.z-centre.z,A=dx*dx+dz*dz,C=ox*ox+oz*oz-radius*radius;
  let enter=0,leave=1;
  if(A<1e-12){if(C>0)return Infinity;}
  else{const B=2*(ox*dx+oz*dz),disc=B*B-4*A*C;if(disc<0)return Infinity;
    const root=Math.sqrt(disc);enter=Math.max(enter,(-B-root)/(2*A));leave=Math.min(leave,(-B+root)/(2*A));}
  const dy=b.y-a.y;
  if(Math.abs(dy)<1e-12){if(a.y<minY||a.y>maxY)return Infinity;}
  else{let lo=(minY-a.y)/dy,hi=(maxY-a.y)/dy;if(lo>hi)[lo,hi]=[hi,lo];enter=Math.max(enter,lo);leave=Math.min(leave,hi);}
  return enter<=leave?enter:Infinity;
}
