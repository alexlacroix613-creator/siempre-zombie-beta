import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScoreService,instagramHandle,RULES} from '../game/lib/score-service.js';
const secret='local-unit-test-key-not-a-production-secret';
function memory(){const rows=new Map();let version=0;return{async read(path){const r=rows.get(path);return r?structuredClone(r):null;},async write(path,state,etag){if((rows.get(path)?.etag||null)!==etag)throw Object.assign(new Error('conflict'),{conflict:true});rows.set(path,{state:structuredClone(state),etag:String(++version)});},isConflict:e=>e.conflict};}
function setup(){let time=1_800_000_000_000;const storage=memory(),now=()=>time,s=createScoreService({storage,secret,now});return{s,storage,now,advance:()=>{time+=60000;}};}
function result(run,name,score=750){return{runId:run.runId,name,rulesVersion:RULES,score,wave:1,kills:5,headshots:0,durationMs:60000};}
test('normalizes handles and rejects spaces, markup, consecutive dots and overlong names',()=>{
  assert.equal(instagramHandle('@Alex.Lacroix'),'alex.lacroix');assert.equal(instagramHandle('__proto__'),'__proto__');
  for(const bad of ['','@two words','<script>','a..b','.abc','abc.','a'.repeat(31)])assert.throws(()=>instagramHandle(bad));
});
test('scores persist across service instances; best per handle only; exact replay idempotent',async()=>{
  const f=setup(),run=f.s.start({name:'@alex',rulesVersion:RULES});f.advance();
  assert.equal((await f.s.submit(result(run,'alex'))).rank,1);
  assert.equal((await f.s.submit(result(run,'alex'))).newBest,false);
  const second=createScoreService({storage:f.storage,secret,now:f.now});assert.equal((await second.leaderboard('alex')).player.bestScore,750);
  const low=second.start({name:'alex',rulesVersion:RULES});f.advance();await second.submit(result(low,'alex',100));
  assert.equal((await second.leaderboard('alex')).entries.length,1);assert.equal((await second.leaderboard('alex')).player.bestScore,750);
});
test('concurrent writes preserve both players',async()=>{
  const f=setup(),a=f.s.start({name:'first',rulesVersion:RULES}),b=f.s.start({name:'second',rulesVersion:RULES});f.advance();
  await Promise.all([f.s.submit(result(a,'first',500)),f.s.submit(result(b,'second',900))]);
  assert.deepEqual((await f.s.leaderboard('first')).entries.map(r=>r.handle),['second','first']);
});
test('rejects forged runs, changed handles, altered replay and impossible statistics',async()=>{
  const f=setup(),run=f.s.start({name:'alex',rulesVersion:RULES});f.advance();
  await assert.rejects(f.s.submit({...result(run,'alex'),runId:run.runId+'x'}));
  await assert.rejects(f.s.submit(result(run,'another')));
  await assert.rejects(f.s.submit({...result(run,'alex'),headshots:6}));
  await assert.rejects(f.s.submit(result(run,'alex',999999)));
  await f.s.submit(result(run,'alex'));
  await assert.rejects(f.s.submit(result(run,'alex',800)),e=>e.code==='ALREADY_SUBMITTED');
});
test('launch season begins empty without deleting beta history',async()=>{
  const f=setup(),run=f.s.start({name:'alex',rulesVersion:RULES});f.advance();await f.s.submit(result(run,'alex'));
  const launch=createScoreService({storage:f.storage,secret,season:'launch-1',now:f.now});
  assert.equal((await launch.leaderboard('alex')).entries.length,0);
  assert.equal((await f.s.leaderboard('alex')).entries.length,1);
  await assert.rejects(launch.submit(result(run,'alex')));
});
