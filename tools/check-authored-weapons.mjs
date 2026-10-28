import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
import { createAuthoredWeaponViews } from '../game/authored-weapon-views.js';
import { createFieldProps } from '../game/new-field-props.js';
import { readPng } from './png-read.mjs';
import {cylinderU,triangleTransform,shadeLabelPixel} from '../game/cylindrical-label.js';
const draws=[],rotations=[],events=new Map();let removed=0;
const canvas={style:{},dataset:{},setAttribute(){},remove(){removed++;},getContext(){return{drawImage:(...a)=>draws.push(a),clearRect(){},save(){},restore(){},translate(){},rotate:a=>rotations.push(a),beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(){},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}};
let created=0;
globalThis.innerWidth=1920;globalThis.innerHeight=1080;globalThis.document={createElement:()=>created++?{...canvas,style:{},dataset:{}}:canvas};
globalThis.addEventListener=(n,f)=>events.set(n,f);globalThis.removeEventListener=(n,f)=>{if(events.get(n)===f)events.delete(n);};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=1536;this.naturalHeight=1024;}decode(){return Promise.resolve();}};
const vm=createAuthoredWeaponViews({append:c=>assert.equal(c,canvas)});await vm.ready;assert.equal(canvas.dataset.bottleSource,'legacy-reference-fallback','headless mock deliberately exercises retained fallback; primary source pixels are verified in actual runtime proofs');
assert.equal(canvas.hidden,true);
vm.update({visible:true,weapon:1,balloons:5,throwRemaining:0});assert.equal(canvas.dataset.pose,'balloon-0');
vm.update({visible:true,weapon:1,balloons:4,throwRemaining:.55});assert.equal(canvas.dataset.pose,'balloon-4','release immediately selects empty hand');
vm.update({visible:true,weapon:1,balloons:0,throwRemaining:0});assert.equal(canvas.dataset.pose,'balloon-4');
vm.update({visible:true,weapon:5,glassLevel:1});assert.equal(canvas.dataset.pose,'glass-full');assert.equal(draws.at(-1)[0].dataset.labelProjection,'cylindrical-native-lit');
assert.equal(canvas.width,1672);assert.equal(canvas.height,941);assert(parseFloat(canvas.style.height)<=1080*.76+.001);assert(parseFloat(canvas.style.top)+parseFloat(canvas.style.height)>1080);
assert(draws.some(a=>a[0]?.src?.endsWith('/assets/vivo-label.jpg')),'authentic local label supplied');
vm.update({visible:true,weapon:5,glassLevel:0});assert.equal(canvas.dataset.pose,'glass-empty');
vm.update({visible:true,weapon:5,glassLevel:.5,pourPhase:.5});assert.equal(canvas.dataset.pose,'glass-pour');
vm.update({visible:true,weapon:5,glassLevel:1,tossPhase:.2});assert.equal(canvas.dataset.pose,'glass-flick');
vm.update({visible:true,weapon:5,glassLevel:0,tossPhase:.35});assert.equal(canvas.dataset.pose,'glass-release','empty hand exactly at shot release');
vm.setSkin('muerto');vm.update({visible:true,weapon:5,glassLevel:0,tossPhase:.5});assert.equal(canvas.dataset.pose,'glass-release');assert.equal(canvas.dataset.skin,'muerto');
assert(draws.some(a=>a[0]?.dataset?.sourceAtlas?.endsWith('glass-wide-release-muerto.png')));assert.throws(()=>vm.setSkin('other'));
for(const [p,frame]of [[0,3],[.3,4],[.4,5],[.8,3]]){vm.update({visible:true,weapon:6,swingPhase:p});assert.equal(canvas.dataset.pose,'axe-'+frame);}
for(const kind of ['balloon','glass']){vm.update({visible:true,weapon:kind==='glass'?5:1,balloons:5});const[x,y]=vm.muzzle(kind);assert(x>0&&x<1920&&y>0&&y<1080);}
for(const [w,h]of [[2294,873],[1241,930],[390,844]]){
 globalThis.innerWidth=w;globalThis.innerHeight=h;events.get('resize')();
 for(const kind of ['balloon','glass']){vm.update({visible:true,weapon:kind==='glass'?5:1,balloons:5});const[x,y]=vm.muzzle(kind);assert(x>0&&x<w&&y>0&&y<h);}
 vm.update({visible:true,weapon:5,glassLevel:1});const top=parseFloat(canvas.style.top),height=parseFloat(canvas.style.height);assert(height<=h*.76+.001);assert(top+66/941*height>=20,'mouth remains inside viewport even at2294x873');assert(top+height>h);
}
vm.update({visible:false});assert.equal(canvas.hidden,true);vm.dispose();vm.dispose();assert.equal(removed,1);assert.equal(events.size,0);
for(const file of ['balloon','balloon-muerto','glass','glass-muerto','axe','axe-muerto']){
 const image=readPng(new URL('../game/assets/new-held-weapons/'+file+'-alpha.png',import.meta.url));assert.equal(image.w,1536);assert.equal(image.h,1024);assert.equal(image.channels,4);
 let zero=0,solid=0;for(let i=3;i<image.data.length;i+=4){if(image.data[i]===0)zero++;if(image.data[i]>245)solid++;}assert(zero>500000);assert(solid>50000,'visible opaque object interiors');
}
const framing=[];
for(const skin of ['vivo','muerto'])for(const state of ['empty','full','pour','flick','release']){
 const image=readPng(new URL(`../game/assets/new-held-weapons/glass-wide-${state}-${skin}.png`,import.meta.url));assert(Math.abs(image.w-1672)<=1);assert(Math.abs(image.h-941)<=1);assert.equal(image.channels,4);
 let top=941;const[x0,x1]=state==='pour'?[950,1100]:[540,680];for(let y=0;y<350;y++)for(let x=x0;x<x1;x++)if(image.pixel(x,y)[3]>128)top=Math.min(top,y);
 assert(top>=20&&top<350,'full bottle opening has >=20px headroom');framing.push({skin,state,width:image.w,height:image.h,bottleNeckTop:top});
}
console.log('Measured bottle opening bounds:',JSON.stringify(framing));
assert.equal(cylinderU(0),0);assert.equal(cylinderU(.5),.5);assert.equal(cylinderU(1),1);assert(cylinderU(.05)-cylinderU(0)<cylinderU(.55)-cylinderU(.5),'UV strips compress at cylindrical edges');
const src=[[0,0],[2,0],[0,3]],dst=[[5,7],[8,9],[3,13]],m=triangleTransform(src,dst);src.forEach(([x,y],i)=>{assert(Math.abs(m[0]*x+m[2]*y+m[4]-dst[i][0])<1e-8);assert(Math.abs(m[1]*x+m[3]*y+m[5]-dst[i][1])<1e-8);});
assert.deepEqual(shadeLabelPixel([200,190,180,255],[30,30,30,255]),[0,0,0,0],'black glove occludes print');assert.deepEqual(shadeLabelPixel([200,190,180,255],[244,237,219,255]),[200,190,180,255],'native paper light preserved');assert(shadeLabelPixel([200,190,180,255],[210,200,180,255])[0]<200,'native shade multiplies printed label');
const props=createFieldProps(THREE),coa=props.coa(),axe=props.axe(),balloon=props.balloon();
for(const g of [coa,axe,balloon]){const box=new THREE.Box3().setFromObject(g),s=box.getSize(new THREE.Vector3());assert(s.x>0&&s.y>0&&(g===balloon||s.z>0));assert(Number.isFinite(s.length()));}
const coaSize=new THREE.Box3().setFromObject(coa).getSize(new THREE.Vector3());assert(coaSize.y>1.4&&coaSize.y<1.6);assert(coaSize.x>.27&&coaSize.x<.3);assert(coaSize.z<.06,'thin circular blade, no central mushroom');
assert(balloon.userData.sprite?.isSprite,'source artwork is the visible balloon');const scene=new THREE.Scene();props.popLatex(scene,new THREE.Vector3());assert.equal(scene.children.length,1,'one managed burst root');const droplets=scene.children[0].children.find(x=>x.isInstancedMesh),before=droplets.instanceMatrix.array.slice();props.updateLatex(.1);assert.notDeepEqual(Array.from(droplets.instanceMatrix.array),Array.from(before),'splash droplets move');props.updateLatex(2);assert.equal(scene.children.length,0);
props.popLatex(scene,new THREE.Vector3());props.clearLatex();assert.equal(scene.children.length,0);
console.log('PASS: native alpha pixels, selected ready/pour/shot/strike keys, authentic label path/rotation, empty hand after balloon launch, projected origins, portrait bounds, source-shaped pickup geometry and soft latex lifecycle. Actual game visual review remains root-owned.');
