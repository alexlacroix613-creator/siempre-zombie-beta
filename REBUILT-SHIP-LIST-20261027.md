# Siempre Zombie — recovered shipping checklist

**Standing sequential review gate:** Previously approved: P01–P04 and C02; P04 is now reopened on the latest user report. Alex temporarily expanded the gate for this batch and authorized publication of the latest integrated public beta while the submitted shared-body character-skin batch runs. Production deployment `dpl_4Q1AGosEPrbMwZMAQXvqHJPvRqmy` is READY at [siempre-zombie-beta.vercel.app](https://siempre-zombie-beta.vercel.app/). This is not approval of pending skins or other checklist work; Alex's gameplay approval remains pending. Current evidence: `ONE-ITEM-REVIEW.md`.

Recovered 27 October 2026 from SHIP-TRACKER.md, HANDOFF-RECONCILIATION.md, current source files and Alex's corrections, then reconciled by the main owner with the verified ChatGPT receipt. This is an expanded acceptance checklist, not evidence that pending tests passed. At that initial recovery point, runtime files were not changed; later runtime integration is recorded below.

**Status:** OPEN = unfinished; VERIFY = a change exists, but the required live check is outstanding; APPROVED / INTEGRATE = Alex accepted the visual, but game integration still needs verification; RETURNED / VERIFY = ChatGPT submission and returned local files verified; design acceptance, execution and integration remain open.

**Completion rule:** A generated sheet, model, passing source test or tracker entry is not completion. Preserve the supplied designs; correct failed geometry, texture registration and motion until the actual game meets the reference. Each row stays owned through integration and gameplay acceptance. Do not resurrect rejected work or silently replace authentic artwork.

## Immediate gameplay blockers

| ID | Status | Required result / next action | Finish evidence |
|---|---|---|---|
| P01 | PASS — ALEX APPROVED | Ground/fall recovery and safe RZR exits accepted by Alex; preserve the approved correction. | Alex approved on 27 October 2026. Exact preview and evidence: `p01-review-evidence/REVIEW.json`. |
| P02 | PASS — ALEX APPROVED | Desktop capture failure now pauses and Resume retries; unrestricted 360 and unchanged sensitivity accepted by Alex. | Alex approved on 27 October 2026. Capture failure/resume and 360 input regressions pass; preview identity: `p02-review-evidence/REVIEW.json`. |
| P03 | PASS — ALEX APPROVED | Title loading confirmed and item approved by Alex. Real error details, stalled-load guard and retry cache refresh retained. | Alex: The title loads, approved. Failure/retry checks pass in actual-source tests; deployment identity and limits: `p03-review-evidence/REVIEW.json`. |
| P04 | REOPENED — USER REPORT | Owned-only scroll switching, wrapping both ways, pause/resume and post-RZR-exit behaviour accepted by Alex.  Reproduce latest scroll-wheel failure in the current hosted build; earlier approval remains historical. | Alex approved on 27 October 2026. Preview and source/HTTP evidence: `p04-review-evidence/REVIEW.json`.  Side-chat source audit found the wheel handler still present; that does not establish working input. |
| P05 | OPEN — USER REPORT | Retain collected weapons across wave transitions; reproduce the reported inventory regression without resetting the run. | Collect multiple weapons, cross normal and boss waves, scroll both directions, then distinguish a new-game reset. Source audit found no wave-level game.owned reset; gameplay remains unverified. |
| C02 | PASS — ALEX APPROVED | Interruption input reset and focus/touch cancellation accepted by Alex. | Alex approved 27 October 2026. Source regressions and exact preview identity: `c02-review-evidence/REVIEW.json`. |

## Characters and animation

| ID | Status | Required result / next action | Finish evidence |
|---|---|---|---|
| A01 | VERIFY | Alex accepted and froze the exact shared Ken body, `a01-work/corner-uv-test/ken-original-corner-uv-ONLY.glb`, SHA-256 `41fb25aa968684c22e04bc9b5063b7a5b9fb8c5c76c282bb3eee8c1bdce9cf17`; runtime copy is `game/assets/characters/shared-zombie-body-ken-v1.glb`. Ken uses its 69-bone rig and five supplied clips, including death. No more Ken polishing or body/UV edits. | Local checks, production asset fetch and local Ken/truck counter render pass; root still owns gameplay validation. Remaining skin work is A03. |
| A02 | OPEN — NAME TAG DECISION | Latest side-chat report: remove the Ken-only tag or give all characters smaller subtle name tags consistently. Side-chat recommendation is consistent subtle tags; no selection or implementation approval is inferred. | Validate normal encounter, idle/walk/chase/attack, articulated death/floor contact and restart in browser.  Also reproduce reported stiff movement in the current hosted build; verify actual limb motion, not clip names alone. |
| A03 | BUILDING | Native ChatGPT skin batch submitted for Dan, Rick, Alex, Monica, Keith Bogart and Sergio Cruz, all using the exact frozen common body. **Dan = trucker cap; Rick = bald/sunglasses; Alex = cowboy; Monica = woman.** Keith's confirmed source photo remains at `a01-work/keith-bogart/`; preserve bald head, grey beard, face/proportions and black Siempre polo. | Batch returned locally; texture corrections and integration remain unfinished. Review each authentic likeness/material/rig before runtime use; do not reopen Ken polishing. |
| A04 | VERIFY | Sergio stays on original art until the submitted shared-body skin is returned. Solo boss now appears on waves 3, 6, 9, etc., waits a random 2–6 seconds and uses the existing random spawn point. | `node tools/check-sergio-boss.mjs` passes. Validate actual boss encounter, telegraphs, damage, death and next wave in hosted gameplay. RZR-mounted guns remain removed. |
| C03 | VERIFY | Ken now uses the supplied articulated `zombie_death` clip and holds the settled pose before cleanup; other characters await A03 skins. | Browser validation must confirm Ken's fall/ground contact and subsequent character deaths; no Ken fade/sink. |

## Weapons, hands and source artwork

| ID | Status | Required result / next action | Finish evidence |
|---|---|---|---|
| A05 | VERIFY — DEPLOYED | Source-image held Gatling uses the forward action artwork Alex approved on 28 October, both costumes and actual-source pickup views. Cranking removed at his request: one stable forward pose and immediate fire, without spin-up, run-down or firing camera shake. Production `dpl_F8g4Z7jBPuk2wnPGxrahdw7RXML2`. | Local actual-game registration/state checks and independent code review passed; remote code/image hashes match. `gatling-repair/RELEASE.json`, `muerto-motion-report.json` and `LOCAL-IMPLEMENTATION.md` record limits. Alex's live gameplay approval remains pending; no foreground-FPS acceptance claimed. |
| A12 | OPEN | New Muerto RPG side mission (28 October), owned by Main after current Gatling delivery: Muerto-styled launcher with rocket impact blast radius that can kill several clustered zombies. | Authored held/pickup/action visuals, collision, radius damage blocked by buildings/walls, ammo/reload/reset; verify multi-kill, survivors outside radius and occluded survivors in game, then Vercel review. |
| A13 | LIVE / USER REVIEW | Main: imagegen green-gas/chrome framed global top 10 directly on the landing page. Require an Instagram handle; use persistent shared scores, separate beta season and a clean official-launch season. | Desktop/phone layout, real two-client persistence and ranking, concurrency/replay checks, public save. Provisioning/cost approval pending; no new deployment yet. Launch changes season rather than deleting beta history. |
| A14 | INVESTIGATE | Main: optional real Meta/Facebook/Instagram sign-in showing actual profile photo and name where supported. | Confirm existing Meta app, supported account types, callback domains, permissions and app review; never label manual handles verified or use guessed profile pictures. |
| A06 | OPEN | Replace fake dual/soaker/Gatling world pickup appearances with the same approved designs used in hand. | Rotate/walk around pickups at normal game distance and lighting, then collect and compare. |
| A07 | VERIFY | Finish authentic Vivo bottle and label: natural curvature/shading, believable scale and the user-requested shorter neck. Source-vivo-compositor.js now declares **20261027-user-neck-v4**; old v3 long-neck approval/proportion notes are superseded.  Latest report: left pouring arm still cropped; lower pose/movement enough to hide the cut edge. | Actual main-game ready/pour/release sequence in both skins; genuine label, short neck, clear Blanco, no pasted panel, jumping grip or stream gap.  Full pour sequence, both skins and narrow/wide views, with no visible rectangular sleeve edge. |
| V03 | VERIFY | Finish starting bottle/cognac-glass kit: correct size, clear liquid, complete pour/toss/reset, no exposed sleeve crops. | Full normal gameplay sequence for Vivo and Muerto; verify the v4 integration rather than old isolated overlays. |
| A11 | OPEN | Replace the crude thrown cognac-glass/liquid proxy with a source-faithful dimensional glass and clear liquid. | Release, flight and impact at game scale; no giant opaque grey goblet or white liquid. |
| A08 | VERIFY | Balloon source art is approved; dimensional upgrades are not accepted. Reconcile the current procedural burst with the supplied splash reference.  Latest report requires balloons on the ground. | Both skins, pickup, toss/release, trajectory, impact and splash; no plain fake blue sphere.  Inspect ground placement/contact and pickup in normal play. |
| A10 | VERIFY | Remove rectangular sleeve/arm cutoffs from Coa/axe and every action frame. | All swing poses at wide and narrow viewports, both skins; keep props at sensible scale. |
| V04 | VERIFY | Dual-pistol liquid must originate at the **bottom nozzles**, aligned through animation; upper cylinders are cartridges. | Close gameplay view while firing/moving, both skins; no downward or detached spray. |
| V11 | OPEN | Finish authentic Coa and axe world pickups and discovery cues: Coa by agave; axe in/by a piña near ovens. Retain approved new tool designs. | Walk-up discovery, pickup and complete attacks; no rejected old Coa or crude world stand-ins. |
| V02 | VERIFY | Use the two original masked Siempre soldiers for selection; chosen skin determines arms, gloves and sleeves throughout. | Menu masks and every weapon, balloon, meal and RZR driving state in both skins, with no mixed skin or grey background. |

## Vehicles, taco truck and healing

| ID | Status | Required result / next action | Finish evidence |
|---|---|---|---|
| A09 | PASS � ALEX APPROVED | **Alex accepted the latest dimensional truck shown in codex-clipboard-319aa0d0-5bb3-4f47-aeef-85a438cb3876.png.** The exact approved truck is restored and deployed without redesign. | Alex, 28 October: The taco truck works well now, approved. Accepted truck/eating/healing frozen in swarm-20261028/APPROVED-TRUCK-FREEZE.json. |
| V12 | PASS � ALEX APPROVED | Keep the truck at the far right; player walks up, actually eats tacos in first person and replenishes health. | Alex, 28 October: The taco truck works well now, approved. Accepted truck/eating/healing frozen in swarm-20261028/APPROVED-TRUCK-FREEZE.json. |
| V05 | OPEN | Finish real dimensional RZR exterior using supplied render appearance and missing views as needed. Driver camera at the wheel, hands on it, animated left/right steering and independent look. | Walk around exterior, enter driver seat, steer, look around and exit; source likeness and no back-seat framing. |
| V06 | VERIFY | Keep RZR-mounted guns removed; restore selected weapon after exiting. | Driving cannot fire/reload; normal weapon operation returns on exit. |
| V07 | VERIFY | Validate RZR collision bounds, walls/corners, wreck contact and run-over behaviour. | Actual driving routes, not only geometry checks; no trapping, penetration or unsafe exit. |

## World, map and presentation

| ID | Status | Required result / next action | Finish evidence |
|---|---|---|---|
| V01 | VERIFY | Use Alex's supplied final green Siempre Zombie title artwork with a polished title/select screen. | Desktop and phone composition, correct hierarchy/scale, no crop or generic replacement lettering. |
| V08 | VERIFY | Preserve the original 3D diorama minimap and show GPS player position/direction, on foot and driving. | Recognizable landmarks and four headings across map bounds; collapsed/expanded toggle and readable taco marker. |
| V09 | VERIFY | Right = flowing green grass; left = dusty red soil; center = textured concrete. Recheck real-site world detail, repeated fields, angular leaves and washed-out materials against references. | Player-height and overhead views at normal lighting; measure whole-frame budget separately from world-only limits. |
| V10 | VERIFY | Permeable green boundary fog with red choking screen edges and an out-of-bounds/go-back warning. | All four edges, safe return and no invisible-wall surprise, floor fall, blocked return or healing exploit. |
| V13 | OPEN | Replace the tiny featureless moon with a larger, detailed full moon. Current inspected source still uses an untextured radius-9 sphere. | Actual sky in normal gameplay: clear surface detail, appropriate size, controlled brightness and no plain white dot. |
| V14 | OPEN — USER REQUEST | Reduce redundant refill barrels while preserving useful, reachable restock points. | Review distribution and routes in the actual level; confirm remaining barrels restock normally and the minimap stays accurate. |

## Gameplay and release verification

| ID | Status | Required result / next action | Finish evidence |
|---|---|---|---|
| C01 | VERIFY | Keep combat fair: projectile first contact, walls block splash/melee, hidden enemies are not hit and elevation is respected. | Thin-wall and raised-floor gameplay tests for drops, balloons, spray and melee. |
| Q01 | OPEN | Run the whole normal-mode loop with both soldiers: glass/bottle-only start, intended damage, pickups, owned-only slot bar, hidden weapon halos/relocation, reload/refill, health, waves 1–6, Sergio on waves 3 and 6 with random 2–6s arrival, scoring, death and replay. Earlier handoff feature claims need reconciliation with current source. | One recorded current-build play pass without review shortcuts or console/asset errors; failures return to this list. |
| Q02 | OPEN | Verify responsive HUD/touch controls and real-device performance; measure startup, FPS, draw calls and complete frame triangle count. | Actual wide desktop and physical phone acceptance, sustained play and usable touch targets; asset budgets are not FPS results. |
| Q03 | OPEN | Reconcile all work into one release source: actual runtime assets, original provenance, generated-but-unused sheets, rollback copies and stale notes. | Exact release manifest and build identity; no dropped Claude/Codex functionality, no claim that generated equals integrated. |
| Q04 | VERIFY — DEPLOYED | Latest production deployment `dpl_F8g4Z7jBPuk2wnPGxrahdw7RXML2` is READY at [siempre-zombie-beta.vercel.app](https://siempre-zombie-beta.vercel.app/), including the no-crank source-image Gatling. Public HTML, runtime, view module and both image hashes match local. | New evidence: `gatling-repair/RELEASE.json`. Earlier `public-beta-20261027/` evidence remains historical. Normal public route has no diagnostic toolbar; Alex's full gameplay approval remains pending. |
| Q05 | VERIFY | Recover/check the complete sound hookup: the older handoff claims 40 sounds, but that is not proof that the present release triggers all correctly. | Browser audio unlock, weapon/pour/glass/balloon, footsteps/zombies/boss, vehicle, taco and UI events; mute/volume and no missing remote files. |
| Q06 | VERIFY | Verify ranked/global score submission, API errors, local/offline fallback, identity and replay persistence in the actual site wrapper. | Valid remote score path plus outage/offline tests; no game-start dependency on a failed scoreboard. |
| Q07 | VERIFY SCOPE | Reconcile launch plumbing omitted from the isolated game preview: intended /games route, wrapper/API/migrations and existing age gate. Earlier handoff calls these pending; confirm current deployment and intended scope before declaring new work required. | Self-contained release checklist for the real destination, with existing approved site behaviour preserved. Cross-game r6/r7 accounts are a separate historical workstream unless this launch depends on them. |
| Q08 | VERIFY | Recover/check the earlier Zombie-bottle pickup / temporary invincibility feature, without treating the old claimed duration as current approval. | Confirm current intended behaviour, source-matched pickup appearance, activation/expiry and restart reset. |
| Q09 | OPEN | Set up Vercel Web Analytics for the public beta using the actual game stack. Added from Alex's 28 October screenshot of the analytics setup screen; do not assume the Next.js selector describes this game. Owner: Main. | Deploy, visit the live game and confirm visitor/page-view data in Vercel. Analytics failure cannot block game loading or controls; no paid plan changes without authorization. |
| Q10 | OPEN | Reconcile the authoritative game source/assets into the intended GitHub repository and link it to the existing Vercel beta project. Added from the screenshot's Missing GitHub Connection notice. Owner: Main. | Review tracked content for secrets and generated bulk; verify repository identity, current approved assets, Vercel repository connection and a reproducible deployment. Preserve repository visibility/access unless Alex authorizes changes. |

## Work routing and ownership

| ID | Status | Owner / next action | Finish evidence |
|---|---|---|---|
| O01 | RETURNED / VERIFY | Earlier ChatGPT design package receipt is confirmed. New native ChatGPT skin batch for six remaining characters is submitted against the frozen common body but has not returned or been integrated. Ken runtime is integrated and beta is live. | Keep the prior receipt at `chatgpt-design-handoff/RECEIPT.json`; add the current batch receipt when returned. Root owns remaining gameplay validation. |

Main-thread owner retains implementation/acceptance for all rows. This side-conversation recovery does not assign or interrupt agents, modify runtime files, deploy a build or close defects.

## Evidence and stale-note corrections

- Latest user decisions supersede earlier character notes: the exact Ken body is accepted/frozen; all remaining skins will use it; no more Ken polishing. Ken's five-clip runtime and death are locally integrated and focused checks pass. Sergio wave scheduling is implemented and its fixture passes. Six remaining character skins are submitted but not integrated. The approved truck is restored locally and root owns its runtime validation. All 47 checkpoint IDs, including Q09–Q10 and side missions A12–A14 added on 28 October, remain mirrored in `SHIP-TRACKER.md`.

- Recovery started with 33 unresolved/unverified rows and added P04, V13, Q05–Q08 and O01. Both current lists now contain the same **40 checkpoints**, including tests and scope checks, not 40 newly proven defects.
- The truck's first rejected pilot and its old README do not override Alex's later visual approval. The exact approved dimensional truck is restored and deployed; root reviewed the local counter scene and confirmed the remote GLB hash. Hosted gameplay acceptance remains pending.
- Bottle README ends with old v3 notes. Current game/source-vivo-compositor.js declares v4 and is imported by authored-weapon-views.js. Neither that declaration nor the old proof set establishes current visual acceptance.
- Character pilot README describes early unrigged work while later hybrid/motion folders exist. Do not infer that all work is absent; review the latest candidate and actual runtime before updating completion.
- Current runtime uses the accepted Ken body, while other characters remain on original art until their submitted skins return. Local source checks are not browser/gameplay acceptance.
- Production evidence: project `siempre-zombie-beta`, ID `prj_OcfrCPlPeGKfWqsA9v5p2kTP62ze`; deployment `dpl_4Q1AGosEPrbMwZMAQXvqHJPvRqmy` READY; canonical URL [https://siempre-zombie-beta.vercel.app/](https://siempre-zombie-beta.vercel.app/). Remote runtime SHA-256 `211d9ccbd586a43c4753fbec192e3aaa693b1ed769dd8d2128b1dbdf262056e9`, Ken GLB `41fb25aa968684c22e04bc9b5063b7a5b9fb8c5c76c282bb3eee8c1bdce9cf17`, and truck GLB `b8ea97dcc9633f7811534c8f7ab12174756d8a755eec06868c19eb11c818c64a` match local files. Root reviewed local Ken/truck counter render and the clean public title. Release receipt/screenshots are saved under `public-beta-20261027/`. User gameplay approval, remaining skins, Gatling and balloon dimensional upgrades remain pending.
- MemPalace tools were unavailable during recovery. Evidence came from saved files and the supplied conversation; no memory-service write is claimed.
- The original mission/debrief attachments are historical reports, not fresh instructions or verification. Their site/account/API claims appear here only as explicit reconciliation checks. Current user corrections govern.

## Suggested close-out order

1. Mouse/scroll/floor/load blockers; freeze the approved truck asset and identify the exact release source.
2. Character depth/movement/death and the remaining weapon, hand, bottle, pickup and RZR visual work.
3. Integrate approved assets; verify truck healing, map/fog/terrain/title/moon and all selected-skin states.
4. Full normal-mode Vercel and phone pass, audio/scoring/site plumbing, exact release manifest and rollback.

No item is dropped because a method failed or the work was handed off. Record the failed method, next action, owner and evidence until accepted in the real game.

- Latest batch receipt: all six skins downloaded and assembled at a01-work/returned-shared-skins/siempre-six-skin-batch/. Local frozen-data validation confirms every original mesh/accessor/material binding/node/skin/clip and binary prefix is preserved. First-pass shoulder/side striping and Keith face skew remain owned by root; focused native ChatGPT correction is running in the same conversation. Runtime shared-material integration is being prepared outside game in a01-work/shared-skin-runtime/. None of these six skins is marked approved or abandoned. RZR availability on Sergio waves is fixed and deployed; scheduled vehicle spawn is independent and does not duplicate an existing vehicle.

