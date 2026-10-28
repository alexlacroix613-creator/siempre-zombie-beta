// The existing yellow source-family rig is the user-selected Zombie-bottle Sergio.
// Baseline HP is retained; there is no verified 100x-HP instruction in the handoffs.
export const SERGIO = Object.freeze({ hp:720, speed:[2.5,2.7], dmg:30, scale:1.12, points:900, cooldown:1.35, windup:.45 });

export function tickBossMelee(z, dt, inReach) {
  z.attackT=Math.max(0,z.attackT-dt);
  if(z.bossHitPending && z.attackT<=SERGIO.cooldown-SERGIO.windup) {
    z.bossHitPending=false;
    return inReach ? 'hit' : 'miss';
  }
  if(inReach && z.attackT<=0) {
    z.attackT=SERGIO.cooldown;z.bossHitPending=true;
    return 'windup';
  }
  return null;
}

export function createBossHud(parent) {
  const box=document.createElement('div');box.hidden=true;
  box.setAttribute('role','status');box.setAttribute('aria-label','Sergio Cruz boss health');
  box.style.cssText='position:absolute;left:50%;top:30px;transform:translateX(-50%);width:min(360px,60vw);padding:9px 12px;background:#08130ee8;border:1px solid #a2bf75;pointer-events:none;font:700 12px Arial;color:#f1f3db';
  const title=document.createElement('div'),track=document.createElement('div'),fill=document.createElement('div');
  title.textContent='SERGIO CRUZ · ZOMBIE BOTTLE';
  track.style.cssText='height:8px;margin-top:7px;background:#27301e';fill.style.cssText='height:100%;background:#c8e865;transform-origin:left';
  track.append(fill);box.append(title,track);parent.append(box);
  return {update(boss){box.hidden=!boss||boss.state==='dying';if(box.hidden)return;fill.style.transform=`scaleX(${Math.max(0,boss.hp/boss.maxHp)})`;title.textContent=`SERGIO CRUZ · ${Math.max(0,Math.ceil(boss.hp))} / ${boss.maxHp}${boss.bossHitPending?' · WATCH THE HANDS':''}`;},dispose(){box.remove();}};
}
