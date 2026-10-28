import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../game/minimap-gps.js', import.meta.url), 'utf8');
const { siteGpsPosition, gpsHeading, SITE_GPS_ANCHORS } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
for (const a of SITE_GPS_ANCHORS) {
  const p = siteGpsPosition(a.x, a.z);
  assert.ok(Math.abs(p.u * 1024 - a.px) < .01, a.name + ' horizontal registration');
  assert.ok(Math.abs(p.v * 1365 - a.py) < .01, a.name + ' vertical registration');
}
const spawn = siteGpsPosition(0, 6);
assert.ok(spawn.u > .43 && spawn.u < .48 && spawn.v > .60 && spawn.v < .64, 'spawn on open south courtyard');
for (const [name, dx, dz, sx, sy] of [['north',0,-1, -1,-1], ['south',0,1,1,1], ['east',1,0,1,-1], ['west',-1,0,-1,1]]) {
  const p=siteGpsPosition(0,6), q=siteGpsPosition(dx,6+dz);
  assert.equal(Math.sign(q.u-p.u), sx, name+' image horizontal direction');
  assert.equal(Math.sign(q.v-p.v), sy, name+' image vertical direction');
  const angle=gpsHeading(siteGpsPosition,0,6,dx,dz,186,186*4/3);
  const wide=gpsHeading(siteGpsPosition,0,6,dx,dz,540,540*4/3);
  assert.ok(Math.abs(angle-wide)<1e-12, name+' expanded heading consistency');
}
const tactical=(x,z)=>({u:x/198+.5,v:z/360+171/360});
assert.ok(Math.abs(gpsHeading(tactical,0,6,0,-1,186,339))<1e-12, 'tactical north unchanged');
assert.ok(Math.abs(gpsHeading(tactical,0,6,1,0,186,339)-Math.PI/2)<1e-12, 'tactical east unchanged');
console.log(JSON.stringify({pass:true,spawnPixels:{x:spawn.u*1024,y:spawn.v*1365},anchors:SITE_GPS_ANCHORS.length}));
