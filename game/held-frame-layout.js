// Measured opaque runs at the authored sprite borders (both operators, every pose).
// If a source side lies inside the viewport, move its first cut pixel below the screen.
export function containSleeveCuts({viewportWidth,viewportHeight,left,top,width,height,sourceWidth,sourceHeight,leftCutY,rightCutY,motionX=0,motionY=0}) {
  const scale=height/sourceHeight,guard=8;
  const constraints=[];
  // Include two source pixels inward: antialiased cuts need overscan too.
  if(left+motionX+2*width/sourceWidth>=0 && left+motionX-2*width/sourceWidth<=viewportWidth && Number.isFinite(leftCutY)) constraints.push(leftCutY);
  if(left+motionX+width+2*width/sourceWidth>=0 && left+motionX+width-2*width/sourceWidth<=viewportWidth && Number.isFinite(rightCutY)) constraints.push(rightCutY);
  if(constraints.length)top=Math.max(top,viewportHeight+guard-Math.min(...constraints)*scale-motionY);
  return {left,top,width,height};
}
