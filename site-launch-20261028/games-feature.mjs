const ASSET = name => new URL('./launch-assets/' + name, import.meta.url).href;
const GAME = '/games/siempre-zombie/';

class SiempreZombieFeature extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;margin:40px 0 56px;color:#f3e9d2;font-family:Arial,system-ui,sans-serif}
        *{box-sizing:border-box}a{color:inherit}button{font:inherit}button,a{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
        .hero{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:48px;align-items:center}
        .art{position:relative;display:block;aspect-ratio:3/2;overflow:hidden;background:#030906}
        .fog{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .lockup{position:absolute;inset:4% 15%;width:70%;height:92%;object-fit:contain;filter:drop-shadow(0 8px 14px #0009)}
        h2{font-family:"Cantina La Rosa",Georgia,serif;font-synthesis:none;font-weight:800;line-height:1.1;letter-spacing:-.025em;font-size:48px;margin:0;padding:.1em 0 .2em;background:linear-gradient(112deg,#eef2f8,#d5dce5 28%,#b2becd 39%,#fdfefe 46%,#fff 49%,#b9c6d5 55%,#edf2f8 64%,#eef2f8);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .eyebrow{font-size:11px;line-height:1.5;letter-spacing:.14em;text-transform:uppercase;color:#c5dfac;margin:0 0 12px}
        .description{max-width:34ch;margin:20px 0 0;font-size:14px;line-height:1.65;color:#f3e9d2a6}
        .play{position:relative;display:inline-flex;align-items:center;justify-content:center;width:176px;max-width:100%;min-height:56px;padding:0;margin-top:28px;border:0;border-radius:50%;background:transparent;line-height:0;text-decoration:none;transition:transform .18s ease-out,filter .18s ease-out}
        .play img{display:block;width:100%;height:auto;pointer-events:none}
        .play-fallback{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
        .play:hover{filter:brightness(1.06);transform:translateY(-1px)}.play:active{transform:translateY(1px)}
        .play[data-image-error] {border:1px solid #d9b879;background:#090807;min-height:56px;color:#eee4d0;border-radius:2px}
        .play[data-image-error] img{display:none}.play[data-image-error] .play-fallback{position:static;width:auto;height:auto;clip-path:none;overflow:visible;line-height:1.25;font-size:18px;font-weight:700}
        .support{margin:12px 0 0;font-size:11px;line-height:1.5;color:#aab3a1}
        :focus-visible{outline:2px solid #ff4582;outline-offset:7px}
        @media(max-width:767px){:host{margin:40px 0 56px}.hero{grid-template-columns:1fr;gap:32px}h2{font-size:36px}.description{max-width:46ch}}
        @media(prefers-reduced-motion:reduce){.play{transition:none}.play:hover,.play:active{transform:none}}
        @media(forced-colors:active){h2{background:none;color:CanvasText;-webkit-text-fill-color:currentColor}.play{border:2px solid ButtonText;background:ButtonFace;color:ButtonText;border-radius:2px}.play img{display:none}.play-fallback{position:static;width:auto;height:auto;clip-path:none;overflow:visible;line-height:1.25;font-size:18px;font-weight:700}}
      </style>
      <article aria-labelledby="zombie-heading">
        <div class="hero">
          <a class="art" href="${GAME}" aria-label="Play Ken and Keith’s Siempre Zombie">
            <img class="fog" src="${ASSET('halloween-fog-20261028.png')}" width="1536" height="1024" alt="" aria-hidden="true">
            <img class="lockup" src="${ASSET('main-lockup-20261028.png')}" width="1330" height="1182" alt="Ken &amp; Keith’s Siempre Tequila Zombie!" fetchpriority="high">
          </a>
          <div class="intro">
            <p class="eyebrow">This Halloween</p>
            <h2 id="zombie-heading">Siempre Zombie</h2>
            <p class="description">Ken and Keith brought Vivo and Muerto together. Now their creation has a game of its own. Defend the distillery and survive the horde.</p>
            <a class="play" href="${GAME}" aria-label="Play Siempre Zombie"><span class="play-fallback">Play</span><img src="${ASSET('chrome-play-v1.webp')}" width="640" height="256" alt="" aria-hidden="true" draggable="false"></a>
            <p class="support">Public beta · Desktop &amp; mobile</p>
          </div>
        </div>
      </article>`;
    this.shadowRoot.querySelector('.play img').addEventListener('error',()=>this.shadowRoot.querySelector('.play').setAttribute('data-image-error','true'));
  }
}
if(!customElements.get('siempre-zombie-feature'))customElements.define('siempre-zombie-feature',SiempreZombieFeature);
