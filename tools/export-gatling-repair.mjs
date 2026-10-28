import * as T from '../game/vendor/three.module.min.js';
import {createVivoGatling} from '../game/assets/weapons/plus-v1/vivo-gatling.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const root=createVivoGatling(T);root.updateMatrixWorld(true);
const meshes=[];
root.traverse(o=>{if(!o.isMesh)return;let p=o.parent,part='body';while(p&&p!==root){if(p===root.userData.rotor)part='rotor';if(p===root.userData.crank)part='crank';p=p.parent;}
meshes.push({part,matrix:o.matrixWorld.toArray(),position:Array.from(o.geometry.attributes.position.array),normal:Array.from(o.geometry.attributes.normal.array),uv:Array.from(o.geometry.attributes.uv.array),index:o.geometry.index?Array.from(o.geometry.index.array):null,material:{color:o.material.color.getHexString(),transmission:o.material.transmission||0,roughness:o.material.roughness,metalness:o.material.metalness}});});
mkdirSync('gatling-repair',{recursive:true});writeFileSync('gatling-repair/current-geometry.json',JSON.stringify({meshes,rotorOrigin:root.userData.rotor.position.toArray(),crankOrigin:root.userData.crank.position.toArray(),muzzle:root.userData.muzzle.toArray(),gripPrimary:root.userData.gripPrimary.toArray(),gripSupport:root.userData.gripSupport.toArray()}));console.log('Exported',meshes.length,'merged meshes for source-texture repair');
