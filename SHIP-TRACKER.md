# Siempre Zombie — working ship tracker



Updated 28 October 2026. Owner: main integration agent. This is the authoritative open list; earlier completion notes do not override it. The dedicated Vercel project is `siempre-zombie-beta`, ID `prj_OcfrCPlPeGKfWqsA9v5p2kTP62ze`. Current production deployment `dpl_8o8z5jsrReEFBWiGNPaGnPgirZfk` is READY at [siempre-zombie-beta.vercel.app](https://siempre-zombie-beta.vercel.app/); the existing Siempre main site is unchanged. Deployment is confirmed; Alex's gameplay approval remains pending.



**Standing workflow (Alex, 27 October): one item → fix/check → Vercel preview → Alex tests and approves or gives feedback → next item. Previously approved: P01–P04 and C02; P04 is now reopened on the latest user report.** Alex has temporarily expanded that rule for this batch: publish the latest integrated public beta while the submitted character-skin batch runs. This does not approve unfinished skins, weapons, truck gameplay, or other open rows. Production deployment is confirmed; root is finalizing the release receipt and screenshot. Alex gameplay approval remains pending. Review record: `ONE-ITEM-REVIEW.md`.



**Alex's hard rule, 27 October:** Use his supplied images as the actual visual source. Preserve their look, materials and texture. Do not recreate crude 3D versions or present reconstructed assets as approved artwork. Alex accepted the exact shared Ken body listed in A01 and wants all remaining characters skinned on that frozen body; do not polish or alter Ken further. Alex ACCEPTED the source-textured dimensional truck in `codex-clipboard-319aa0d0-5bb3-4f47-aeef-85a438cb3876.png`; the exact approved truck is restored and deployed. Hosted gameplay validation remains open. Gatling and balloon source art are approved; dimensional upgrades remain unaccepted.



Status: **OPEN** = unresolved; **BUILDING** = assigned and being changed; **VERIFY** = code/assets changed but gameplay/visual acceptance pending; **PASS** = evidence recorded. Source tests never close a visual issue. Every new user finding gets a row before another batch.



## Release blockers



| ID | Status | Owner | Defect / required result | Acceptance evidence required |

|---|---|---|---|---|

| P01 | PASS — ALEX APPROVED | Main | Ground/fall recovery and safe RZR exits accepted by Alex; preserve the approved correction. | Alex approved on 27 October 2026. Exact preview and evidence: `p01-review-evidence/REVIEW.json`. |

| P02 | PASS — ALEX APPROVED | Main | Desktop capture failure now pauses and Resume retries; unrestricted 360 and unchanged sensitivity accepted by Alex. | Alex approved on 27 October 2026. Capture failure/resume and 360 input regressions pass; preview identity: `p02-review-evidence/REVIEW.json`. |

| P03 | PASS — ALEX APPROVED | Agent 15 / Main | Title loading confirmed and item approved by Alex. Real error details, stalled-load guard and retry cache refresh retained. | Alex: The title loads, approved. Failure/retry checks pass in actual-source tests; deployment identity and limits: `p03-review-evidence/REVIEW.json`. |

| P04 | VERIFY - LIVE FIX | Main | Owned-only scroll switching, wrapping both ways, pause/resume and post-RZR-exit behaviour accepted by Alex.  Reproduce latest scroll-wheel failure in the current hosted build; earlier approval remains historical. | Alex approved on 27 October 2026. Preview and source/HTTP evidence: `p04-review-evidence/REVIEW.json`.  Side-chat source audit found the wheel handler still present; that does not establish working input. |

| P05 | OPEN — USER REPORT | Main | Retain collected weapons across wave transitions; reproduce the reported inventory regression without resetting the run. | Collect multiple weapons, cross normal and boss waves, scroll both directions, then distinguish a new-game reset. Source audit found no wave-level game.owned reset; gameplay remains unverified. |

| A01 | VERIFY | Main | Alex accepted and froze the exact common Ken hybrid body: `a01-work/corner-uv-test/ken-original-corner-uv-ONLY.glb`, SHA-256 `41fb25aa968684c22e04bc9b5063b7a5b9fb8c5c76c282bb3eee8c1bdce9cf17`. Runtime copy is `game/assets/characters/shared-zombie-body-ken-v1.glb`. Ken now uses the 69-bone rig and five supplied clips, including articulated death; do not polish or alter the body/UVs. | Local checks and production asset fetch pass; root reviewed the local Ken/truck counter render. Alex's normal-play/gameplay approval remains pending. Remaining characters are the A03 skin batch. |

| A02 | OPEN — NAME TAG DECISION | Main | Latest side-chat report: remove the Ken-only tag or give all characters smaller subtle name tags consistently. Side-chat recommendation is consistent subtle tags; no selection or implementation approval is inferred. | Runtime code and focused checks pass locally; root must validate normal encounter, idle/walk/chase/attack, articulated death, floor contact and restart in the browser.  Also reproduce reported stiff movement in the current hosted build; verify actual limb motion, not clip names alone. |

| A03 | BUILDING | Main / ChatGPT | Native ChatGPT skin batch submitted for Dan (trucker cap), Rick (bald), Alex (cowboy), Monica (woman), Keith Bogart and Sergio Cruz, all using the exact frozen common body. Keith's reference photo is confirmed and preserved with source hash at `a01-work/keith-bogart/`. | Batch returned locally; texture corrections and integration remain unfinished. Inspect each likeness/material/rig result, then integrate and validate front/side/back gameplay. Do not reopen Ken body polishing. |

| A04 | VERIFY | Main | Sergio remains original artwork until his returned shared-body skin is corrected, reviewed and integrated. Solo boss schedule is implemented on waves 3, 6, 9, etc.; arrival waits a random 2–6 seconds and uses the existing random spawn point. | `node tools/check-sergio-boss.mjs` passes; validate actual encounter, windup, death and next-wave flow in hosted gameplay. |

| A05 | VERIFY — DEPLOYED | Main | Source-image Gatling uses Alex's approved forward action art, source-RGB multi-angle pickup and both operator costumes. Alex removed cranking: one stable pose, immediate fire, no spin-up/run-down or Gatling firing camera shake. Production `dpl_F8g4Z7jBPuk2wnPGxrahdw7RXML2`. | Local actual-game registration/state checks and code review passed; public HTML/JS/images match local hashes. `gatling-repair/RELEASE.json`, `muerto-motion-report.json` and `LOCAL-IMPLEMENTATION.md` record evidence/limits. Alex's hosted gameplay approval remains pending; no foreground-FPS acceptance claimed. |

| A06 | OPEN — GATLING PART UPDATED | Main | Dual/soaker world pickups remain open. Gatling pickup now selects angles from the actual original source sheet; source comparison/hosted acceptance pending. | Same approved gun design in world and hand; pickup rotation/distance/light checks. |

| A07 | VERIFY - LIVE V7 | Bottle work | Vivo label looks pasted on an invented bottle. Genuine bottle photos found; isolated source-based bottle, clear optics and sleeve extensions under live runtime review.  Latest report: left pouring arm still cropped; lower pose/movement enough to hide the cut edge. | Authentic bottle/label wraps and shades naturally throughout ready/pour/release for both skins; clear Blanco, no crop, jump, gap, double label or hand artifacts.  Full pour sequence, both skins and narrow/wide views, with no visible rectangular sleeve edge. |

| A08 | VERIFY - LIVE SOURCE | Main | Balloon source art is approved; current supplied RGB/alpha wiring exists, but dimensional upgrades are not accepted.  Latest report requires balloons on the ground. | Inspect both skins, pickup, flight and impact in play; reconcile the procedural burst with the supplied splash image.  Inspect ground placement/contact and pickup in normal play. |

| A09 | PASS — ALEX APPROVED | Truck integration / Main | Alex explicitly ACCEPTED the latest source-textured dimensional truck shown in his approval screenshot. Exact approved dimensional truck is restored locally and deployed without redesign. | Alex, 28 October: The taco truck works well now, approved. Accepted truck/eating/healing frozen in swarm-20261028/APPROVED-TRUCK-FREEZE.json. |

| A10 | VERIFY | Agent 17 / Main | Axe/Coa sleeves visibly cut inside screen. New alpha-edge placement integrated. | Both skins, all swing frames, wide and narrow viewports; no rectangular arm edge, sensible size. |

| A11 | VERIFY - LIVE SOURCE | Main | Tossed cognac glass/liquid still uses a crude translucent 3D proxy, separate from the held-glass artwork. | A source-faithful dimensional glass and colorless liquid, with correct throw and impact appearance, checked in live play. |

| A12 | OPEN | Main | New side mission: Muerto RPG with a rocket impact blast radius that can kill multiple clustered zombies. Build after the current Gatling delivery. | Muerto-themed held/pickup/action artwork, projectile collision, radius damage with building/wall occlusion, ammo/reload and reset; verify a clustered multi-kill, distant survivors and blocked targets in the actual game, then Vercel review. |

| A13 | LIVE / USER REVIEW | Main | Always-visible landing-page global top 10 in imagegen green-gas/chrome frame matching the supplied logo. Instagram handle required. Private persistent shared storage; beta and official-launch seasons separate. | Actual landing page at desktop/phone sizes; two-client score persistence and ranking, concurrency/replay checks, real public-score save; official launch selects fresh season without deleting beta. Existing Siempre Neon Free database reused with isolated schema/runtime role. Concurrent real persistence and fresh-season checks pass. Live deployment dpl_8o8z5jsrReEFBWiGNPaGnPgirZfk verified: shared API, handle validation, impossible-score rejection, exact remote asset hashes. User gameplay approval pending. |

| A14 | INVESTIGATE | Main | Optional verified Meta/Facebook or Instagram sign-in with real profile photo, name and score, per Alex's conditional request. | Verify supported account types, existing Meta app, allowed callback domains, permissions and review. Never mark manual handles verified or fetch guessed profile photos. No non-working sign-in button in public UI. |



## Required features and checks still owed



| ID | Status | Owner | Item | Acceptance evidence required |

|---|---|---|---|---|

| V01 | VERIFY | Main | User-supplied final green logo, exact original file, now wired. | Actual title composition desktop/mobile; no crop or replacement lettering. |

| V02 | VERIFY | Main | Two original soldiers with clean alpha masks; chosen skin throughout game. | Actual menu edges and switching; Vivo/Muerto glass, balloons, duals, Coa, axe, Gatling, driving. |

| V03 | VERIFY - LIVE V7 | Main | Glass/bottle scale reduced and pour/throw exists; live Muerto pour still shows a vertical left-sleeve crop and amber liquid. | Full sequence in both skins; no sleeve crop or huge props; liquid remains colorless. |

| V04 | VERIFY | Main | Dual-pistol stream from **bottom nozzles**, top cylinders are cartridges. | Screen-aligned stream starts exactly at lower nozzle through animation, in both skins. |

| V05 | OPEN | Main | RZR still uses a reconstructed 3D exterior, contrary to Alex's hard rule. Source-authored driver hands are wired. | Replace exterior with supplied RZR imagery and generated missing angles; verify driving, steering hands and head look, no back-seat camera. |

| V06 | VERIFY | Main | RZR guns removed. Source tests passed. | Normal play driving cannot shoot/reload; exit restores selected weapon. |

| V07 | VERIFY | Agent 19 / Main | Collision bounds now match actual 3.482 m two-seat model. | Geometry regression passed; drive near walls/corners and check wreck/run-over contact live. |

| V08 | VERIFY | Main | 3D diorama minimap + GPS location/direction. Taco marker text enlarged for legibility. | Known locations across full map and four headings, on foot and driving; map toggle; check taco marker fits at small viewport sizes. |

| V09 | VERIFY | Main | Green flowing grass right, red dusty soil left, textured concrete center. | Actual scene matches three regions at normal play scale; no overbright material washout. |

| V10 | VERIFY | Main | Green boundary fog permeable; red choking edge and go-back warning, safe return. | All four edges; no invisible-wall surprise, below-floor return, blocked return or heal exploit. |

| V11 | OPEN | Main | Coa and axe held poses use authored imagery, but world pickups are reconstructed geometry. | Replace world pickups with supplied image-based designs, retain agave/piña location cues; inspect complete swings and both skins. |

| V12 | PASS — ALEX APPROVED | Main | Far-right taco now uses generated first-person eating poses from Alex's taco/glove references for both skins, including two bitten stages and an empty hand; old progress-card removed. | Alex, 28 October: The taco truck works well now, approved. Accepted truck/eating/healing frozen in swarm-20261028/APPROVED-TRUCK-FREEZE.json. |

| V13 | VERIFY - LIVE NASA | ChatGPT design / Main integration | Moon is a tiny featureless white dot. Alex requests a larger detailed full moon. | Lightweight authentic lunar albedo, visible maria/craters, sensible scale and restrained glow in actual game renderer and hosted build. |

| V14 | VERIFY - LIVE 4 SITES | Main | Reduce redundant refill barrels while preserving useful, reachable restock points. | Review distribution and routes in the actual level; confirm remaining barrels restock normally and the minimap stays accurate. |

| C01 | VERIFY | Agent 17 / Main | Combat fairness: swept drops/balloons, walls block splash and melee, hidden targets ignored. | Actual-source tests passed; thin wall and raised-floor gameplay checks. |

| C02 | PASS — ALEX APPROVED | Main | Interruption input reset and focus/touch cancellation accepted by Alex. | Alex approved 27 October 2026. Source regressions and exact preview identity: `c02-review-evidence/REVIEW.json`. |

| C03 | VERIFY | Main | The frozen Ken rig uses its supplied articulated `zombie_death` clip and holds its settled pose before cleanup. Other characters remain pending A03 skins. | Ken death/floor contact and complete roster deaths still need browser validation; no fading/sinking Ken path. |

| Q01 | OPEN | Main | Fresh normal-mode full play loop and restart, both soldiers. | Death/replay, pickups, ammo/refill, waves 1–6 including Sergio on waves 3 and 6 with random 2–6 second arrival; no console/asset errors. |

| Q02 | OPEN | Main | Responsive controls and performance. | Actual wide desktop and phone layout; measure FPS/drawcalls/triangles before optimizing. |

| Q03 | OPEN | Main | Inventory and handoff must distinguish generated sheets from implemented assets. | Current runtime asset manifest, source provenance, rollback copy, stale notes superseded. |

| Q04 | VERIFY — DEPLOYED | Main | Current public beta includes the no-crank source-image Gatling and shared landing leaderboard at [siempre-zombie-beta.vercel.app](https://siempre-zombie-beta.vercel.app/). Production deployment `dpl_8o8z5jsrReEFBWiGNPaGnPgirZfk` is READY. | Public HTML, runtime, leaderboard module/frame and Gatling view module match local hashes; `leaderboard-work/LIVE-VERIFICATION.json` and earlier `gatling-repair/RELEASE.json`. Earlier 27 October release evidence remains historical. Alex's full gameplay approval is separate and pending. |

| Q05 | VERIFY | Main | Recover/check complete audio event hookups; 40 sound files alone do not establish runtime playback. | Real browser audio unlock, weapon/pour/glass/balloon, footsteps/enemies/boss, vehicle/taco/UI events, mute/volume and remote loading. |

| Q06 | VERIFY | Main | Verify scoring submission, identity/replay persistence and local/offline fallback in the actual site wrapper. | Valid remote score path plus API failure/offline tests; scoreboard failure cannot prevent game start. |

| Q07 | VERIFY SCOPE | Main | Reconcile real launch route, wrapper/API/migrations and existing age gate against the isolated preview. Historical handoff claims are not proof of new required work. | Verify current destination and dependencies, preserve approved site behaviour; keep unrelated cross-game account work separate unless this launch depends on it. |

| Q08 | VERIFY | Main | Reconcile earlier Zombie-bottle pickup/temporary invincibility feature with current intended behaviour and runtime. | Source-matched pickup, activation/expiry and restart reset; historical claimed duration is not current acceptance evidence. |

| Q09 | PASS - LIVE TRAFFIC | Main | Set up Vercel Web Analytics for the public beta; Alex's 28 October screenshot shows the setup screen. Use integration appropriate to the actual game stack. | Deploy, visit the public game and verify visitor/page-view data in Vercel; analytics failure must not block loading or controls. No paid plan changes without authorization. |

| Q10 | VERIFY - GIT CONNECTED | Main | Put the authoritative game source/assets under the intended GitHub repository and connect it to the existing Vercel beta project; screenshot reports Missing GitHub Connection. | Review tracked content for secrets/generated bulk, verify repository identity and current assets, confirm Vercel repository link and reproducible deployment without losing approved work. Preserve repository visibility and access unless Alex authorizes changes. |



## Work routing



| ID | Status | Owner | Item | Acceptance evidence required |

|---|---|---|---|---|

| O01 | RETURNED / VERIFY | Main | Earlier ChatGPT design package receipt is confirmed. A new six-character shared-body skin batch is returned and in active local correction/review; do not duplicate or integrate unreviewed outputs. | Original dispatch/receipt remain at `chatgpt-design-handoff/`. Current skin-batch dispatch/receipt evidence should be added when returned. Ken runtime is integrated and the public beta is live; root owns remaining gameplay validation. |



Expanded acceptance details for all 47 checkpoint IDs: `REBUILT-SHIP-LIST-20261027.md`. Q09–Q10 came from Alex's Vercel screenshot; A12 is the Muerto RPG, A13 the shared framed top 10, and A14 optional verified social sign-in. This tracker remains the authoritative status list; receipt of a design package does not close its associated gameplay or visual rows.



## Recent evidence (does not close visual rows)



- ChatGPT design package receipt remains historical evidence, but the latest character batch is a separate native ChatGPT submission for six skins on the user-approved frozen Ken body. It has returned and been assembled locally; texture corrections are active before runtime integration. Ken runtime is already integrated locally with five clips and death; source checks pass, browser review remains root-owned. No further Ken mesh/UV work is authorized.



- Token routing requested by Alex: remaining substantial design work goes to ordinary ChatGPT Chat, using included membership; Codex retains local integration and testing. Prepared packet: `chatgpt-design-handoff/DESIGN-WORK-ORDER.md` plus an exact-source zip with 18 original images and hashes. Dispatch state and conversation URL are recorded separately in that folder; preparation is not submission or completion.

- Truck visual approval: Alex's attached `codex-clipboard-319aa0d0-5bb3-4f47-aeef-85a438cb3876.png`. This supersedes rejection of earlier truck candidates only; no permission to weaken the other acceptance checks.

- Scroll-wheel regression: actual source regression passed on 27 October; owned slots are cycled in both directions while paused and zero-delta events are ignored.



- Production release evidence from root: project `siempre-zombie-beta`, ID `prj_OcfrCPlPeGKfWqsA9v5p2kTP62ze`, deployment `dpl_4Q1AGosEPrbMwZMAQXvqHJPvRqmy` READY, canonical public URL [https://siempre-zombie-beta.vercel.app/](https://siempre-zombie-beta.vercel.app/). Unauthenticated curl fetched runtime JavaScript (SHA-256 `211d9ccbd586a43c4753fbec192e3aaa693b1ed769dd8d2128b1dbdf262056e9`), Ken GLB (`41fb25aa968684c22e04bc9b5063b7a5b9fb8c5c76c282bb3eee8c1bdce9cf17`) and truck GLB (`b8ea97dcc9633f7811534c8f7ab12174756d8a755eec06868c19eb11c818c64a`); local hashes match. Root reviewed local Ken/truck service-counter render and clean public title; no errors or diagnostic toolbar reported. Evidence files saved: `public-beta-20261027/RELEASE.json`, `public-beta-20261027/live-title.png`. Alex's user playthrough/feature approval remains pending; skin batch, Gatling and balloon work remain open. Existing Siempre site/domain unchanged.

- Latest hosted pointer status reported `locked` after the truck review button and after the RZR enter/exit sequence. Source tests cover retry on hybrid pointer devices and unrestricted yaw; actual 360-degree feel remains to be tested.

- Superseded Ken status: Alex accepted/froze the exact shared body at `a01-work/corner-uv-test/ken-original-corner-uv-ONLY.glb` (SHA-256 recorded in A01), explicitly requested all other characters be skinned on it, and said no more Ken polishing. The runtime copy is integrated and locally checked; browser play/visual evidence remains pending. The approved dimensional taco truck is restored and deployed; hosted gameplay validation remains open.

- Actual Vivo product images found; bottle pilot remains isolated while label integration, sleeve edges, and animation continuity are repaired. See `VIVO-BOTTLE-AUTHENTICITY-AUDIT.md` and `bottle-pilot/REVIEW.md`.

- `tools/check-mouse-look.mjs`: production input source; review unlock/relock and raw .0022 sensitivity.

- `checks/rzr-collision.mjs`: actual GLB bounds, four headings, wall clearance/run-over/wreck geometry.

- `tools/check-boot-loader.mjs`: inline error/retry paths.

- `tools/check-combat-fairness.mjs`: actual source thin-wall first-contact, visibility/height/LOS.

- `tools/check-held-frame-edges.mjs`: actual image alpha border samples at four viewport sizes.

- `tools/check-ground-and-rzr-exit.mjs`: actual source tests penetration, jump/landing, invalid/deep fall, raised floor, blocked exit and key repeat; local review also confirmed exit and visible mouse look.

- Local 8769 review server was stopped when checked and was restarted. The cause of the earlier 8% failure remains unconfirmed.

- Earlier checkpoint had no production publish or paid fallback. Superseded by Alex's publication authorization and the confirmed production release recorded above.



## Required update rule



When a row changes, keep its ID, status, exact evidence and any remaining limitation. A user screenshot rejecting the current result reopens the corresponding row immediately. Do not mark an issue PASS merely because a file exists, a model generated, or a test passed.



- Latest batch receipt: all six skins downloaded and assembled at a01-work/returned-shared-skins/siempre-six-skin-batch/. Local frozen-data validation confirms every original mesh/accessor/material binding/node/skin/clip and binary prefix is preserved. First-pass shoulder/side striping and Keith face skew remain owned by root; focused native ChatGPT correction is running in the same conversation. Runtime shared-material integration is being prepared outside game in a01-work/shared-skin-runtime/. None of these six skins is marked approved or abandoned. RZR availability on Sergio waves is fixed and deployed; scheduled vehicle spawn is independent and does not duplicate an existing vehicle.





- Full online migration is SUBMITTED/RUNNING: https://chatgpt.com/c/6ae14e9d-2250-83ea-831e-f4aeddbdaff5 . Five validated ZIP parts contain 1,331 project file entries, current runtime/assets, editable/source pilots, checklist/evidence and newest r2 skin correction. ChatGPT Pro confirmed file access and began commands. Ownership for substantive repair is now online at Alex's explicit request; local/Vercel execution remains an operator boundary if the online tools cannot perform it. Exact receipt: a01-work/ONLINE-MIGRATION-STATE.json. Do not restart the old Ken task or duplicate online repair here.





- A05 current direction, 28 October: the supplied six-view Gatling sheet is the ONLY approved design. Lock: gatling-repair/APPROVED-DESIGN.json. Current local procedural review/model and earlier blockouts are rejected. Source-texture replacement is being prepared in the focused online repair; no Gatling replacement deployed yet. Root owns actual held/pickup/fire/render comparison and Vercel integration.



- V05 source lock, 28 October: Alex re-supplied the exact approved RZR cockpit and six action poses. The project original `originals/vehicles/rzr-driving.png` is byte-identical to his supplied PNG (SHA-256 `0c8dd944088bab7cb4d4ad3441234eec34ad4ed56233ef1b1da0d4b1f2dca5ea`). Permanent acceptance record: `RZR-APPROVED-DESIGN.json`. Current three-pose hand viewmodel does not establish complete cockpit/gear-change acceptance. Root owns reconciliation and real-game/Vercel verification after the current Gatling item; no new RZR completion or deployment claimed.



- A05 return check, 28 October: focused online return contains source-art rotor/crank image animations, masks and scripts, but no game-ready dimensional factory or held/pickup integration. Safely extracted to `gatling-repair/returned-art-animation`; receipt/hash in `gatling-repair/RETURNED-ANIMATION-RECEIPT.json`. This does not close A05 or authorize presenting it as a completed game fix. Root still owns the working exact-design held/pickup asset, real-renderer comparison and Vercel review. Production remains unchanged by this return.





## Current root release receipt - 28 October
Production dpl_8o8z5jsrReEFBWiGNPaGnPgirZfk is READY. See public-beta-20261028-source-controls2/RELEASE.json and swarm-20261028/PROGRESS.md. Captured wheel/RZR-exit checks pass; source glass/balloons, detailed NASA moon and four refill sites are live. User acceptance remains open. Six corrected shared-body skins run only in local fittedReview until heads/hair/physical death pass final review. RZR broad Muerto arm rejected by Alex; narrow single-arm join and dimensional dashboard correction remain owned. Truck/eating/healing hashes unchanged. Private GitHub backup exists; Git connection still pending. Analytics script HTTP200; provider pageview pending. RPG artwork provider rejection and Facebook legal-terms gate remain explicit unresolved items.

Q09 verification: official analytics script HTTP200; authenticated Vercel query for 28-29 October reports1visitor/2pageviews. Receipt swarm-20261028/ANALYTICS-VERIFIED.json. No plan or billing changes.

Q10: private repo alexlacroix613-creator/siempre-zombie-beta contains source commit0b6f854; Vercel connection verified github/main/rootDirectory game. Reproducible Git deployment pending. No repository visibility/access expansion.
