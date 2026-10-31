---
name: first-person-shooter
description: Build, extend or repair Three.js browser first-person shooters using the complete Siempre Zombie reference game, approved-art workflows and targeted gameplay checks. Use for FPS controls, weapons, animated enemies, vehicles, maps, scoreboards and releases.
---

# First-Person Shooter

Use a shipped browser shooter as an inspectable foundation. This skill contains a pinned source manifest, full-game exporter, offline check runner and implementation guides. The roughly 233 MiB game stays in GitHub instead of being duplicated into every agent's skill context.

## Choose the work

- **New game:** export the complete reference to a separate folder, prove it loads, then adapt the requested mechanics and approved assets. The export is the original branded game, not an unbranded or automatically licensed asset pack.
- **Existing game:** find its current state/input owners and reuse relevant modules. Do not replace an entire game to repair one bug. If asked to work in a separate folder, preserve the requested current state there, including relevant uncommitted work; this pinned reference export is not a backup of another working tree.
- **Siempre maintenance:** preserve the accepted assets and release state in the case study. Current source and user instructions override historical tracker notes.

Read [references/source-map.md](references/source-map.md) for repository access and module locations. [references/source-manifest.json](references/source-manifest.json) pins the exact source revision and exported file hashes.

## Get the complete reference

Use an authorized checkout of `alexlacroix613-creator/siempre-zombie-beta`. If none exists, clone it with Git's normal authentication. The repository is private; do not expose it or put a token in a command to bypass access.

```text
git clone https://github.com/alexlacroix613-creator/siempre-zombie-beta.git reference-source
python <skill-folder>/scripts/export_starter.py --source reference-source --output fps-reference
python -m http.server 8769 --bind 127.0.0.1 --directory fps-reference/game
```

Open `http://127.0.0.1:8769/`. Export copies committed runtime/assets and selected offline checks, verifies every hash, and refuses a nonempty destination or a destination inside the source checkout. It never exports credentials, deployment links, database provisioning tools or uncommitted files. It does not deploy or modify production. Static HTTP serves gameplay; shared scores need a separately configured backend.

Before publishing a derivative, retarget canonical/share URLs, API and score namespaces, season, title, story and branding. Asset access does not grant redistribution rights. Read [references/services-and-release.md](references/services-and-release.md).

## Build the smallest real slice

1. Establish the requested camera, inputs, existing mechanics and actual approved art. Track unresolved work with owner, next action and evidence.
2. Inspect affected source/checks before editing. Load only the relevant guide:

| Work | Guide |
| --- | --- |
| Mouse capture, touch, scroll, pause, floor and vehicle transitions | [controls-and-world.md](references/controls-and-world.md) |
| Likeness, common rig, movement, attacks and contact deaths | [characters.md](references/characters.md) |
| Held art, aim/fire/reload, nozzles, pickups, RPG and cockpit | [weapons-and-vehicles.md](references/weapons-and-vehicles.md) |
| Scores, intro, sharing, GitHub/Vercel and mobile profiling | [services-and-release.md](references/services-and-release.md) |

3. Prove one slice in the actual renderer before scaling an art/animation method. A sheet is not a rig; an atlas is not an approved skin; source tests do not establish visual acceptance.
4. Run affected offline checks, then exercise the changed action in the real game. For motion complaints, inspect video or the live transition; a still cannot prove jitter is gone.

```text
python <skill-folder>/scripts/check_project.py --project fps-reference --group controls
```

Groups: `controls`, `combat`, `visuals`, `scores`, `sharing`, `all`. These run local reference checks, not external services. Some assertions encode this game's balance, names and art; adapt them deliberately when changing those contracts. They do not establish full gameplay, likeness, audio or phone-performance approval.

5. For release, verify deployed bytes and the normal hosted interaction, including its parent site's route. Keep diagnostics local. This skill grants no deployment, spending, score-reset or social-post permission beyond the user's actual authorization.

## Preserve the important invariants

- Captured relative mouse movement permits continuous turning. A cursor limited by the browser edge is not equivalent. Clear held input on focus/capture loss and vehicle transitions.
- Approved designs are the visual contract. Obtain missing angles/frames from originals when authorized; do not substitute a crude procedural recreation. Actors requiring articulated motion need compatible rigged geometry and shared actions.
- Approved first-person frames can be appropriate. Separate held views from world projectiles/pickups; preserve grip, scale, alpha edges and sleeve coverage throughout motion.
- Combat traces and blast visibility must agree with cover and target bounds; long frames cannot skip thin walls.
- Preserve accepted mesh/UV/rig data when only changing a skin. Death needs an articulated fall and ground contact, not fading or lowering a standing actor.
- Distinguish local, staged, deployed and user-approved. An excluded failed asset or tracker entry does not complete its fix; own it through the working product.

Read [references/siempre-case-study.md](references/siempre-case-study.md) only for this game's names, fixed assets and failure history. Its 69-bone body, sensitivity, balance and boss schedule are reference-specific, not universal FPS requirements.

See [references/validation.md](references/validation.md) for the tested package revision and the limits of that evidence.

No paid generation, online handoff, special connector or swarm is required just to use this skill. Preserve third-party license/credit files. No new license for Siempre artwork, people or branding is granted here.
