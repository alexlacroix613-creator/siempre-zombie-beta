import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(process.argv[2] || new URL('../game/siempre-zombie.js', import.meta.url), 'utf8');
const nextStart = source.indexOf('function nextOwned(');
const nextEnd = source.indexOf('\nfunction showBanner', nextStart);
const wheelStart = source.indexOf('let weaponWheelDelta');
const wheelEnd = source.indexOf('\ndocument.addEventListener(\'pointerlockchange\'', wheelStart);
assert.ok(nextStart >= 0 && nextEnd > nextStart && wheelStart >= 0 && wheelEnd > wheelStart);
const game = { state: 'play', weapon: 5, owned: new Set([5, 3, 1]) };
let handler, options;
const ctx = { game, buggy: null, SLOT_ORDER: JSON.parse(source.match(/const SLOT_ORDER = (\[[^\]]+\])/)[1]),
  performance:{now:()=>100},innerHeight:800,
  swap: id => { if (game.owned.has(id)) game.weapon = id; },
  addEventListener: (type, fn, opts) => { assert.equal(type, 'wheel'); handler = fn; options = opts; } };
vm.runInNewContext(source.slice(nextStart, nextEnd) + '\n' + source.slice(wheelStart, wheelEnd), ctx);
const scroll = deltaY => { let prevented = false; handler({ deltaY, preventDefault() { prevented = true; } }); return prevented; };
assert.equal(options.passive, false);
assert.equal(scroll(120), true); assert.equal(game.weapon, 3, 'forward skips unowned slots');
scroll(120); assert.equal(game.weapon, 1, 'forward reaches next owned weapon');
scroll(120); assert.equal(game.weapon, 5, 'forward wraps');
scroll(-120); assert.equal(game.weapon, 1, 'reverse wraps to owned weapon');
scroll(-120); assert.equal(game.weapon, 3, 'reverse skips multiple unowned slots');
scroll(-120); assert.equal(game.weapon, 5, 'reverse completes the sparse inventory loop');
ctx.buggy={state:'driving'};assert.equal(scroll(120),true);assert.equal(game.weapon,5,'driving scroll preserves weapon selected for exit');
ctx.buggy.state='parked';scroll(120);assert.equal(game.weapon,3,'scroll resumes immediately after exit');
game.state='pause';assert.equal(scroll(120),false);game.state='play';scroll(120);assert.equal(game.weapon,1,'scroll resumes after pause');
ctx.buggy=null;game.owned=new Set(ctx.SLOT_ORDER);game.weapon=5;
const allForward=[0,3,4,1,2,6,7,5];for(const expected of allForward){scroll(120);assert.equal(game.weapon,expected,'all-owned order matches keyboard slot order');}
const allReverse=[7,6,2,1,4,3,0,5];for(const expected of allReverse){scroll(-120);assert.equal(game.weapon,expected,'all-owned reverse order');}
game.owned = new Set([5]); game.weapon = 5; scroll(120); assert.equal(game.weapon, 5, 'single weapon remains selected');
scroll(-120);assert.equal(game.weapon,5,'single weapon is stable in reverse too');
game.state = 'pause'; assert.equal(scroll(-120), false, 'paused scroll is untouched');
game.state = 'play'; assert.equal(scroll(0), false, 'zero delta does nothing');
game.owned=new Set([5,3,1]);game.weapon=5;
for(let i=0;i<3;i++)scroll(.1);
assert.equal(game.weapon,5,'subpixel event burst cannot cycle the inventory before a frame');
for(let i=0;i<4;i++)scroll(10);
assert.equal(game.weapon,3,'trackpad movement accumulates to one selection');
console.log('PASS actual source: sparse/all-owned forward and reverse order, wrapping, single weapon, pause/resume and post-RZR-exit switching; driving preserves selection');

