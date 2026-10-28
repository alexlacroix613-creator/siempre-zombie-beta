import assert from 'node:assert/strict';
import {readPng} from './png-read.mjs';
import {containSleeveCuts} from '../game/held-frame-layout.js';
let samples=0;
for(const skin of ['vivo','muerto'])for(const kind of ['axe','coa']){
 const png=readPng(new URL(kind==='axe'?`../game/assets/new-held-weapons/axe${skin==='muerto'?'-muerto':''}-alpha.png`:`../game/assets/coa-new-sheet/poses-${skin==='muerto'?'muerto':'native'}.png`,import.meta.url));
 for(const [W,H]of [[813,346],[2294,873],[1241,930],[390,844]])for(let pose=kind==='axe'?3:0;pose<(kind==='axe'?6:2);pose++)for(const motion of kind==='coa'?[-12,0,12]:[0]){
  const sw=kind==='axe'?512:1254,sh=kind==='axe'?512:735;
  const height=kind==='axe'?Math.min(H*.82,W*.94):Math.min(W*1.06/1254,H*1.1/735)*735,width=height*sw/sh;
  const left=kind==='axe'?W-width+width*.035:(W-width)/2,top=H-height+(kind==='axe'?height*.22:H*.18);
  const f=containSleeveCuts({viewportWidth:W,viewportHeight:H,left,top,width,height,sourceWidth:sw,sourceHeight:sh,leftCutY:kind==='axe'?276:668,rightCutY:kind==='axe'?272:618,motionX:motion,motionY:motion});
  const ox=kind==='axe'?pose%3*512:0,oy=kind==='axe'?512:pose?740:0,dy=kind==='coa'&&pose?221:0,scanH=kind==='coa'&&pose?514:sh;
  for(const x of [0,1,2,sw-3,sw-2,sw-1])for(let y=0;y<scanH;y++)if(png.pixel(ox+x,oy+y)[3]>32){
   const sx=f.left+motion+x/sw*f.width,sy=f.top+motion+(y+dy)/sh*f.height;
   assert(sx<0||sx>W||sy>H,`${kind}/${skin} pose${pose} ${W}x${H}: source cut visible at ${sx},${sy}`);samples++;
  }
  assert.equal(f.height,height,'source hand/tool scale preserved');
 }
}
console.log(`PASS: ${samples} actual alpha-border samples remain outside viewport across both skins, all axe/Coa poses, four viewport sizes and Coa sway; scale unchanged.`);
