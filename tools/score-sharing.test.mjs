import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../game/score-sharing.js',import.meta.url),'utf8');
const canonical='https://siempretequila.com/games/siempre-zombie/';
function setup(navigator={}) {
  const elements={};
  for(const id of ['screen-over','share-score','copy-game-link','share-status','share-manual','share-text','over-score','over-wave','over-kills']) {
    elements[id]={hidden:false,textContent:'',value:'',listeners:{},addEventListener(event,callback){this.listeners[event]=callback;},focus(){this.focused=true;},select(){this.selected=true;}};
  }
  elements['over-score'].textContent='12,450';
  elements['over-wave'].textContent='6';elements['over-kills'].textContent='42';
  let observer;
  vm.runInNewContext(source,{navigator,document:{getElementById:id=>elements[id]},MutationObserver:class {constructor(cb){observer=cb;}observe(){}}});
  return {elements,click:id=>elements[id].listeners.click(),visibility:()=>observer()};
}
test('native share receives final stats and canonical public URL immediately, never auto-shares',async()=>{
  let data,calls=0;
  const ui=setup({share:payload=>{data=payload;calls++;return Promise.resolve();}});
  assert.equal(calls,0);
  const clicked=ui.click('share-score');
  assert.equal(calls,1);assert.equal(data.url,canonical);
  assert.match(data.text,/12,450.*wave 6, 42 kills/);
  await clicked;
  assert.equal(ui.elements['share-status'].textContent,''); // Never falsely announce delivery.
});
test('native cancellation is quiet and duplicate clicks do not open another picker',async()=>{
  let reject,calls=0,copies=0;
  const ui=setup({share:()=>{calls++;return new Promise((_,r)=>reject=r);},clipboard:{writeText:async()=>copies++}});
  const first=ui.click('share-score');await ui.click('share-score');assert.equal(calls,1);
  reject({name:'AbortError'});await first;assert.equal(copies,0);assert.equal(ui.elements['share-status'].textContent,'');
});
test('unsupported or blocked native sharing copies score and link',async()=>{
  for(const native of [undefined,()=>Promise.reject({name:'NotAllowedError'})]) {
    let copied;
    const ui=setup({share:native,clipboard:{writeText:async text=>copied=text}});
    await ui.click('share-score');
    assert.match(copied,/12,450/);assert.ok(copied.endsWith(canonical));
    assert.match(ui.elements['share-status'].textContent,/copied/);
  }
});
test('clipboard failure provides selected, editable-by-copy text without blocking replay',async()=>{
  const ui=setup({clipboard:{writeText:async()=>{throw Error('Denied');}}});
  await ui.click('share-score');
  assert.equal(ui.elements['share-manual'].hidden,false);
  assert.equal(ui.elements['share-text'].selected,true);
  assert.match(ui.elements['share-text'].value,/12,450/);
  ui.visibility();assert.equal(ui.elements['share-manual'].hidden,true);
  assert.equal(ui.elements['share-status'].textContent,'');
});
test('copy game link excludes stats and hidden game-over cannot initiate sharing',async()=>{
  let copied,calls=0;
  const ui=setup({share:async()=>calls++,clipboard:{writeText:async text=>copied=text}});
  await ui.click('copy-game-link');assert.equal(copied,canonical);
  ui.elements['screen-over'].hidden=true;
  await ui.click('share-score');assert.equal(calls,0);
});
test('main game serves static social metadata and original banner at crawler dimensions',()=>{
  const html=readFileSync(new URL('../game/index.html',import.meta.url),'utf8');
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
  assert.ok(html.includes('property="og:image" content="'+canonical+'assets/social/siempre-zombie-share-v1.jpg"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  const jpeg=readFileSync(new URL('../game/assets/social/siempre-zombie-share-v1.jpg',import.meta.url));
  assert.equal(jpeg.readUInt16BE(0),0xffd8);assert.ok(jpeg.length<400_000);
  let dimensions;
  for(let at=2;at<jpeg.length;) {
    assert.equal(jpeg[at],0xff);const marker=jpeg[at+1],length=jpeg.readUInt16BE(at+2);
    if([0xc0,0xc1,0xc2].includes(marker)){dimensions=[jpeg.readUInt16BE(at+7),jpeg.readUInt16BE(at+5)];break;}
    at+=2+length;
  }
  assert.deepEqual(dimensions,[1200,630]);
});
