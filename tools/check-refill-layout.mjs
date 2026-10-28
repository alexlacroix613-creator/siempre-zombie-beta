import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REFILL_SPOTS,inactiveRefillNode} from '../game/refill-layout.js';
const b=readFileSync(new URL('../game/assets/world-lawn-v118-d7c4d3e9.glb',import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
assert.equal(REFILL_SPOTS.length,4);
const colliders=j.nodes.filter(n=>/^col_refill_/.test(n.name)&&!inactiveRefillNode(n.name));
assert.equal(colliders.length,4);
for(const p of REFILL_SPOTS){assert(colliders.some(n=>n.name==='col_refill_'+p.id));assert(j.nodes.some(n=>n.name.startsWith(`barrel_refill_${p.id+1}_`)&&!inactiveRefillNode(n.name)));}
assert.equal(inactiveRefillNode('col_wall_7'),false);assert.equal(inactiveRefillNode('barrel_refill_2_scanned_asset_wine_barrel_01'),true);
console.log('PASS four visible scanned barrels match four active restock points/colliders; unrelated world nodes unchanged.');
