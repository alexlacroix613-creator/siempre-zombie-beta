# New held weapon integration, 27 October 2026

Actual game integration exists in isolated local-review game/siempre-zombie.js. This supersedes earlier sheet-only/Coa wiring-only handoffs. Root owns final browser visual QA. No source-original edits, publishing or paid/API generation.

## Authoritative inputs actually viewed
- Corrected balloon hand source: C:/Users/alexl/.codex/generated_images/01a17be7-894e-7b60-94f7-0b55195bb4e3/exec-f746e359-6823-4a99-910b-16fdf024d4e8.png. Supersedes earlier balloon third pose.
- Balloon object/burst: C:/Users/alexl/.codex/generated_images/01a17bcb-20f4-75b1-83f7-d6cfa1d02eee/exec-eacfa195-e12b-4be5-829f-07929f39add9.png.
- Gloves: C:/Users/alexl/.codex/generated_images/01a17bc8-d7fd-7a80-8a9e-ae1fb4bb050d/exec-cbe5d932-9a7b-462b-8442-c6ed8b19b1b3.png, top-row Vivo only.
- Glass/pour: outputs/game-asset-sheets-20261027/11-pour-throw/sheet.png; SHA256 matches latest explicitly supplied native source exec-f21e8eee-1c8a-40ea-ab3e-818ec92d9dd3.png (A43373A9109ABD21080E46287DB4D392CB96BD40AFEF8330C8D6D00EB37A2BD0). Object sheet10 also viewed.
- Axe: outputs/game-asset-sheets-20261027/13-axe/sheet.png; SHA256 matches user source exec-355dd743-998c-4697-85e1-e1d5413ef491.png (1066D434937C829C551328AE2BD639ECC3FBDB845C12D5240DE66E32C5321485).
- Coa: chat sheet12, documented separately assets/coa-new-sheet/review.md. Wrong v3 center-mounted blade excluded.
- Existing authentic assets/vivo-label.jpg viewed; pixels composited in canvas with 180-degree correction because original texture is upside down. No generated label text used; native glass edit has unprinted cream panels.

## Native alpha outputs (one edit each, no retry)
All in C:/Users/alexl/.codex/generated_images/01a17d3d-019b-74b1-98f2-62faea5e67c1/:
- balloon-alpha.png <- exec-2fc00f0b-a2b8-4825-871c-3315eab2b3e7.png.
- glass-alpha.png <- exec-b44f9062-ae76-4d84-80ea-0a59ea80952d.png.
- axe-alpha.png <- exec-af11e6bb-3240-4014-bec8-18a2bf36c1b2.png.
Actual PNGs1536x1024 RGBA8, native alpha0 backgrounds and near-opaque253/254 object interiors. Hidden RGB blur seen in some tool previews is alpha0; not painted background in game. Tests validate transparent-pixel count and solid interior count. Exact prompts are alongside this file.

## Implemented behavior
Starting kit5 native empty/full/pour/flick art with authentic label overlay; game tracks tank, glass level, pour/toss time and actual damage droplets. Old 3D kit arms/objects hidden. Balloon1 native corrected ready/empty-hand follow-through; immediate projectile release never coexists with held balloon. Matching blue tied-neck teardrop world projectile, water-colored splash, bending soft blue latex patches instead of glass shards. Coa2 uses native sheet12-derived two-key art, restored inventory/switching and field pickup. Axe6 uses native sheet13 ready/raise/chop keys with original attack clock/stats retained. Old Coa/axe arms hidden, other weapon/vehicle code not repurposed.

World pickups are newly authored small Three meshes based on selected object design: thin edge-socket circular Coa blade/wood shaft, aged-steel single axe head/wood handle. Procedural wood-grain/patina maps improve material separation. These are source-derived approximations, not an approved downloaded GLB or raster-only empty halo. Coa stays in agave anchor area; axe at oven/piña anchors. No generic-anywhere fallback for those tools. Nearby hint and automatic collection retained. Key1-7 supports all seven slots, touch Coa name restored.

## Checks and honest limits
check-authored-weapons.mjs PASS actual imports/behavior for pose selection, impact-phase key, empty hand after balloon launch, authentic label path/rotation, alpha pixels, portrait muzzle bounds, pickup dimensions and fragment bending/cleanup. check-coa-viewmodel.mjs PASS. Main syntax PASS. Root browser QA must establish actual drawing quality, cropping, label fit especially rotated pour panel, pickup visibility/access and hit timing feel. Discrete authored keys are not full skeletal animations; in-between glass fill is game state with coarse visual poses, and bottled liquid imagery is largely baked (HUD/tank state remains dynamic). Sleeve edges/label warp and scale may need visual adjustment. Do not claim final polished visual acceptance from these tests.
