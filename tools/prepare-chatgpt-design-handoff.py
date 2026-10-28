from pathlib import Path
import hashlib,json,zipfile

root=Path(__file__).resolve().parents[1]
out=root/'chatgpt-design-handoff'
out.mkdir(exist_ok=True)
assets=root/'game/assets'
files={f'characters/{n}.png':assets/'character-originals'/f'{n}.png' for n in ['ken','sergio','dan','rick','alex','monica']}
files.update({
 'players/vivo.png':assets/'player-vivo.png',
 'players/muerto.png':assets/'player-muerto.png',
 'players/gloves-sleeves.png':assets/'hand-costume-reference.png',
 'props/balloons.png':assets/'balloon-reference.png',
 'props/vivo-authentic-front.png':assets/'source-vivo/official-front.png',
 'approved-truck/reference.png':assets/'taco-truck-reference.png',
})
native=Path('C:/Users/alexl/.codex/generated_images')
for name,folder,file in [
 ('props/gatling-original.png','01a17bcf-abca-7913-a345-2f4606311773','exec-c6aac8eb-ef7c-4e31-ad5a-de5e92891456.png'),
 ('vehicles/rzr-original.png','01a17bc8-3ff3-7001-b362-38f2637c291b','exec-7cb4c171-4b9d-4396-9ea6-196fac93f7f1.png'),
 ('vehicles/rzr-driving.png','01a17bef-c338-7512-bdfd-62943da413c3','exec-6caddf1b-d87d-4bbb-ad46-7bab2895a306.png'),
 ('props/coa-original.png','01a17c0c-f0eb-77b1-8d5f-e2ef0107bed9','exec-e6e7aaa5-52a8-46dd-866e-21a4fbf545af.png'),
 ('props/axe-original.png','01a17c16-6b24-7fa1-b1d3-d2f838e36236','exec-355dd743-998c-4697-85e1-e1d5413ef491.png'),
 ('props/glass-pour-throw.png','01a17bf3-5415-7561-a24d-0e0dabbdec87','exec-f21e8eee-1c8a-40ea-ab3e-818ec92d9dd3.png'),
]: files[name]=native/folder/file
brief='''# Siempre Zombie: design completion work order

Alex requests that substantial remaining design work run in ordinary ChatGPT Chat using his included membership, conserving Codex for local integration and testing. This packet contains the actual approved artwork, not substitutes. Do useful work now, not only a plan.

## Non-negotiable acceptance criteria
- Preserve supplied identities, silhouettes, proportions, original texture/material detail and labels. Missing views may be generated from the original references; never replace them with generic remakes. Real dimensional meshes and reusable skeletal animation are required for characters and world objects; flat camera-facing sprites do not meet the brief.
- Name mapping: Ken = older gray-haired/bearded man; Sergio Cruz = yellow bottle zombie and boss; Dan = trucker cap; Rick = bald sunglasses; Alex = cowboy hat; Monica = woman.
- Selected player Vivo wears ivory sleeves/purple rose and teal/ivory gloves; Muerto wears black sleeves/white rose-web and black/tan gloves. Match the source throughout.
- Taco truck visual in the attached approved screenshot is ACCEPTED by Alex on Oct 27. Preserve it. No truck redesign. Runtime walk-up/eat/heal verification remains Codex work.
- Authentic Vivo front photograph is authoritative. Never invent/reletter the label; preserve native printed pixels. A shorter bottle neck is being corrected locally: do not redo that work. Colorless Blanco and transparent glass, plausible cylindrical perspective.
- No paid generation/API, credit purchases, uploads to other services, public publishing, or engine migration. If a tool/membership limit blocks an asset, state it; no bypass or unapproved fallback. No retries to evade a moderation refusal.
- Prepared, generated, reviewed, integrated and tested are different states. Own failures through a concrete next repair; a tracker row alone is not completion.

## Actual environment
Three.js r169 browser FPS, GLTFLoader, ACES tone mapping, Blender 5.2.3 available locally. Local RTX 5080 16GB, free ComfyUI Hunyuan3D-2mv available. Current meshes from naive multiview generation/projection failed: nonmanifold heads, fragmented faces, warped UVs, metallic hands, underarm ribbons. Existing separate Ken attempt uses an intact source-derived head on a 69-bone body scaffold with idle/walk/chase/attack/death clips. It is NOT accepted or integrated. Avoid restarting blind inference. Web Chat cannot access Windows paths; attached files are the source.

## Prioritized design work (stable IDs)
1. A01/A03/C03: shared zombie body/rig, correct six character skins, natural articulated idle/walk/chase/reach/attack and ground-contact falling death. Produce a practical Blender implementation/repair artifact: reusable rig/retarget and source-camera UV/bake tooling or editable starter files where feasible. Inspect supplied sheets first, state which views/coverage are actually missing per character. Deliver source-matched missing neutral views/skin coverage when native image tools permit. Start with Ken as one complete reviewed pilot, then reuse the body rig rather than independently inventing six rigs. Sergio remains distinctive boss; overhead Ken label is runtime.
2. A05/A06: exact supplied Gatling, dual/soaker look in held and world pickup, correct glass cartridges/nozzles, hands in both costumes. Gatling has six glass cartridge cylinders, cream/teal housings, purple crank, machined metallic hardware. Need source-registered all-angle texture/UV construction and missing neutral views, not a white/turquoise primitive substitute. Dual liquid emits from bottom nozzles; top cylinders are cartridges. Supplied Gatling neutral sheet is authoritative. Do not regenerate the earlier refused action-sheet request.
3. V05/V07: white/black two-seat RZR exterior with real tread/suspension/cage, source-matched every angle, NO mounted guns. Driver is at wheel, both selected-costume hands turn with it, separate camera head look. Produce missing view/texture coverage and clean geometry/UV construction guidance, preserve approved cockpit imagery.
4. A11: transparent source-faithful 3D cognac glass with colorless liquid for thrown projectile; current flying proxy is huge opaque gray/white. Need optics/material + mesh implementation, believable throw/impact. Held bottle is separate current local repair; do not duplicate it.
5. A08: real pear-shaped blue tied water balloon, source droplets/material; dimensional pickup and flight, matched splash/rupture frames. Do not substitute blue spheres. Existing supplied balloon image already in use; create only missing coverage/impact needs.
6. A10/V11: exact source Coa (round flat steel disk, long wooden handle) and jimador axe, dimensional pickups at agave/pina, hands/swing poses for both costumes. Preserve existing approved source frames, complete unseen angles/cuff coverage without cut-off rectangular arms.
7. V02: preserve original soldier identities and clean alpha masks; consistent costume hands across all actions. No new generic faces.
8. V13: bigger full moon with believable lunar maria/crater detail, not featureless white dot; lightweight color-correct real lunar albedo and suitable full-moon lighting/glow for existing night sky. NASA CGI Moon Kit is a possible public primary source; verify exact source before returning links.
9. Visual QA: concise acceptance matrix for full 360 source likeness, source view registration, seams, topology/deformation, shadows/ACES exposure, first-person frame edges at wide/narrow screens, transparent glass/labels, runtime scale/performance.

## Return contract
First inspect the actual attached images and zip. Then do the highest-value concrete design/technical work you can finish using included tools. Return a downloadable design-completion package with TASKS.json (id,status,artifact,acceptance,next_action), inspected source inventory, exact missing-view/generation briefs, usable scripts/files/texture assets where feasible, and a concise handback. Preserve original images unmodified. If executable 3D/image generation is unavailable here, do not pretend otherwise: produce complete source-specific construction/UV/animation scripts and precise missing-view packets that Codex can execute locally. Never claim gameplay integration or visual acceptance from web-only output. Do not ask for files that are inside the attached zip before checking it. Keep prose short. Do not continue unrelated work or contact anyone.
'''
(out/'DESIGN-WORK-ORDER.md').write_text(brief,encoding='utf-8')
manifest=[]
with zipfile.ZipFile(out/'siempre-design-sources.zip','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('DESIGN-WORK-ORDER.md',brief)
 for name,p in files.items():
  if not p.is_file(): raise FileNotFoundError(p)
  data=p.read_bytes();z.writestr(name,data)
  manifest.append({'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 approved=Path('C:/Users/alexl/AppData/Local/Temp/codex-clipboard-319aa0d0-5bb3-4f47-aeef-85a438cb3876.png')
 if approved.is_file(): z.write(approved,'approved-truck/USER-ACCEPTED-20261027.png')
 z.writestr('SOURCE-MANIFEST.json',json.dumps(manifest,indent=2))
(out/'SOURCE-MANIFEST.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'zip':str(out/'siempre-design-sources.zip'),'bytes':(out/'siempre-design-sources.zip').stat().st_size,'sources':len(manifest)}))
