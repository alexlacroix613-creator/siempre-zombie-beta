# Siempre Zombie publishing

Alex's current instruction, 29 October 2026: the game is live. Remove public-facing "Public beta" and beta labels; present it as Siempre Games / Siempre Zombie. This supersedes the older public-beta presentation rule below. Preserve technical project/repository names and historical release records.

Alex's explicit instruction, 27 October 2026: publish every Vercel build with the presentation of a **public beta**. Use normal gameplay links without diagnostic query parameters. Do not show LOCAL WIP, test/review instructions, development banners or diagnostic controls to public players. Keep internal checks and review fixtures limited to localhost.

Publish the latest integrated game when requested; unfinished source assets and ongoing character work are not automatically integrated or approved. Preserve item-by-item feature acceptance and the statuses in SHIP-TRACKER.md. A beta publication is not approval of pending characters, weapons or other checklist items.

Alex temporarily authorized publishing the latest integrated public beta while the current native ChatGPT skin batch runs. This exception applies to this batch only. Production deployment `dpl_4Q1AGosEPrbMwZMAQXvqHJPvRqmy` is READY at [https://siempre-zombie-beta.vercel.app/](https://siempre-zombie-beta.vercel.app/) in project `siempre-zombie-beta`, ID `prj_OcfrCPlPeGKfWqsA9v5p2kTP62ze`. Root confirmed clean public title and remote runtime/Ken/truck GLB fetches matching local hashes. Release record/screenshot are being saved in `public-beta-20261027/`; Alex's gameplay approval remains pending. Use the normal public URL without review/test query parameters; diagnostic controls stay localhost-only.

## Accepted shared character body — 27 October 2026

- Alex accepted and froze `a01-work/corner-uv-test/ken-original-corner-uv-ONLY.glb`, SHA-256 `41fb25aa968684c22e04bc9b5063b7a5b9fb8c5c76c282bb3eee8c1bdce9cf17`. Runtime copy: `game/assets/characters/shared-zombie-body-ken-v1.glb`.
- Skin all remaining characters using this exact body. Do not alter or polish Ken's mesh, UVs, textures or anatomy further.
- Ken's 69-bone rig and idle/walk/chase/attack/death clips are locally integrated and focused checks pass. Browser/gameplay validation is still pending.
- Native ChatGPT skin batch for Dan, Rick, Alex, Monica, Keith Bogart and Sergio Cruz is submitted but not yet returned or integrated. Keep original art for pending characters; review likeness and source fidelity before integration.
- Sergio's approved solo waves are 3, 6, 9, etc., with a random 2–6 second arrival delay and existing random spawn point. Implemented; `node tools/check-sergio-boss.mjs` passes. Browser validation remains open.

The approved dimensional taco truck is restored and deployed; root reviewed the local service-counter render and confirmed the remote GLB hash. Hosted truck gameplay approval remains pending. Gatling and balloon source art is approved, while their dimensional upgrades remain unaccepted. The six-character skin batch is returned and assembled locally, but not yet visually accepted or integrated; do not mark those skins approved or completed.

Use the dedicated zombie Vercel project `prj_OcfrCPlPeGKfWqsA9v5p2kTP62ze` under team `team_lEsgHm86PzVNhPOdFpJmxOIN`. The current canonical production URL is `https://siempre-zombie-beta.vercel.app/`. Verify the exact target before any future deploy. Keep raw work-in-progress references and character repair files outside `game/` and outside the deployment.

- Latest batch receipt: all six skins downloaded and assembled at a01-work/returned-shared-skins/siempre-six-skin-batch/. Local frozen-data validation confirms every original mesh/accessor/material binding/node/skin/clip and binary prefix is preserved. First-pass shoulder/side striping and Keith face skew remain owned by root; focused native ChatGPT correction is running in the same conversation. Runtime shared-material integration is being prepared outside game in a01-work/shared-skin-runtime/. None of these six skins is marked approved or abandoned. RZR availability on Sergio waves is fixed and deployed; scheduled vehicle spawn is independent and does not duplicate an existing vehicle.

