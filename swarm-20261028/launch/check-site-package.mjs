import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./site-package/games-feature.mjs',import.meta.url),'utf8');
const review=await readFile(new URL('./games-banner-review.html',import.meta.url),'utf8');
for(const text of [source,review]){
  assert(!/leaderboard|ranking|podium|board-frame|data-leaderboard|credentials|setInterval|fetch\s*\(/i.test(text),'Games feature must contain no leaderboard or score client');
}
assert(source.includes("const GAME = 'https://siempre-zombie-beta.vercel.app/halloween/'"));
assert(source.includes('grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)'));
assert(source.includes('aspect-ratio:3/2'));
assert(source.includes('chrome-play-v1.webp'));
assert(source.indexOf('class="art"')<source.indexOf('class="intro"'));
console.log('PASS: standard art/text Games row, Halloween Play target, no outside leaderboard, score fetch, timer or credentials.');
