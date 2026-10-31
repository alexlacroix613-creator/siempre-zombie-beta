# Scores, playback, sharing and release

## Shared scores

Read `game/lib/score-service.js`, `game/api/siempre-zombie/`, `game/lib/`, `leaderboard-config.js` and `tools/leaderboard.test.mjs`.

HMAC-signed run tokens bind normalized handle, rule version, season and start time. Submission validates elapsed/stat bounds, records digests for idempotency and retries storage conflicts. Preserve deterministic best-score ordering. These are abuse barriers, not authoritative server simulation or proof that client scores cannot be cheated.

An entered Instagram handle is unverified player text. Do not claim authenticated Meta identity or invent profile photos. OAuth requires a separately configured/authorized integration.

Export includes no HMAC/database credentials and creates no service. A derivative needs its own provider-managed environment, storage namespace and credentials; never connect it to Siempre's live board. Unit checks use in-memory storage. Keep secrets out of source, skill files and logs.

Siempre's Top 10 belongs inside the game. A season change needs explicit launch/reset authorization and preserves history; a deployment alone does not justify another wipe. Label device/offline scores honestly.

## Intro and sharing

`zombie-intro.js` starts the film from the original valid Play gesture while retaining normal game start. Freeze simulation/input; natural end, Skip or failure reveals gameplay without a second welcome/enter step. Preserve capture/audio activation, clear listeners/timers and prevent skip-down becoming a stray shot. Actual phone autoplay still needs device validation.

`score-sharing.js` reads final stats and invokes native sharing directly inside a click. Preserve transient activation, quiet cancellation, clipboard and selectable-manual fallback. Opening the picker is not proof of publication. Never auto-post.

Static Open Graph/Twitter tags point to the authentic 1200x630 image. Verify absolute public image URLs, MIME and dimensions with crawler responses. Client-only metadata may be invisible to crawlers. Retarget canonical/share URLs for a derivative, or shares still lead to Siempre.

## Hosted release

Commit reviewed source/art to Git. The reference needs no frontend build; Node 22/`game/package-lock.json` support functions. Its project deploys from `game/`; another project must use its own verified target.

Siempre's official entry is `https://siempretequila.com/games/siempre-zombie/`. Its parent website forwards game/API paths to the canonical game deployment and owns the separate Games feature component. Verify both URLs serve the same updated bytes. Do not deploy an old whole-site build or overwrite newer production with a local copy.

Record target/revision/rollback, check changed hashes and exercise the actual normal hosted interaction. Keep review toolbars localhost-only. Siempre is live with no public-beta labels; technical repo/project names containing `beta` may remain.

Before derivative release, inspect `index.html`, `halloween/index.html`, `score-sharing.js`, `package.json`, `leaderboard-config.js`, API routes and storage keys for case-specific identity. Retain dependency/art credits. Check entry, capture/touch, death/retry, sharing and loading under the deployed route.

## Mobile performance

Separate startup transfer/decode from sustained frame lag. The October 28 source-only review found about 48.8 MiB in four eager GLBs, before other heads/textures, plus touch DPR 1.5, soft shadows and per-frame effects. These are plausible costs, not measured phone bottlenecks or proof compression fixes gameplay.

Measure cold/warm waterfalls separately from a repeatable multi-minute physical-phone route, frame-time percentiles and thermal drift. Trial one variable: backing resolution, shadows, texture size/formats, deferral or measured CPU hotspots. Compare approved visuals on the same device. Desktop touch emulation does not establish phone FPS. In Siempre, optimization was plan-only at this pin; skill invocation does not authorize executing it.
