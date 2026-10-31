# Siempre-specific contracts and lessons

This records source/user direction, not closure of every QA row. Current source/instructions and the authoritative tracker override older notes. The manifest pins the game after October 29's removal of public-beta wording.

- Player choice: Vivo ivory/rose sleeves and teal gloves; Muerto black rose/web sleeves and copper/black gloves. Apply throughout weapons/driving.
- Enemies: Ken, Monica, Dan (trucker cap), Alex (cowboy), Rick (bald), Keith Bogart; Sergio Cruz is the separate boss. Old filenames confused Keith and Sergio; preserve their distinct references.
- Ken's accepted common body: `game/assets/characters/shared-zombie-body-ken-v1.glb`; SHA-256 `41fb25aa968684c22e04bc9b5063b7a5b9fb8c5c76c282bb3eee8c1bdce9cf17`. Mesh/UVs/weights/69-bone rig are frozen. Fit variants using authentic albedo/head/accessory parts.
- Sergio: waves 3, 6, 9… with random arrival delay and spawn point. RZR availability is independently scheduled.
- RZR cockpit/masking, taco truck/eating/healing and Muerto RPG were user-approved. Preserve their selected source designs. RZR has two seats/no mounted guns; RPG launches a Muerto bottle with cover-aware multi-target damage; Gatling uses the approved six-cartridge design without cranking.
- Preserve authentic Vivo label/bottle, clear glass, blue tied balloons, Coa and axe. Trace selected runtime constructors; an asset in an old folder does not prove integration.

World direction: left red soil, right grass, textured center concrete; registered 3D map with player position/direction; green boundary fog and detailed full moon. Tools should be identifiable at intended agave/oven pickup sites.

The supplied Ken & Keith logo/desktop/mobile films are authentic assets. Play -> film -> game with Skip. Top 10 stays inside the game, without a main-homepage takeover or outside board. The live season is `launch-20261028`; skill export never resets it.

| Repeated failure | Required correction |
| --- | --- |
| Screen-edge look; steering constraint persists on foot | One camera/input owner, capture, explicit transition cleanup |
| Improved art stays local; old art ships | Trace imports/constructors and compare deployed bytes |
| Inferior model/warped projection replaces approved art | Preserve supplied design; verify angle coverage, UV/material fit and motion in renderer |
| Rigid motion, fade/sink deaths | Compatible shared actions and grounded articulated falls |
| Sleeve cuts exposed during movement | Measured source-border constraints plus full-motion overscan |
| Spray originates at cartridges | Register actual lower nozzle and aim target per pose |
| Model sheets passed off as animated models | Compatible skinned geometry with deformation validation |
| Local screenshots used to claim mobile performance | Separate structural checks, browser interaction and device profiling |

Failed/rejected work retains an owner, next action and evidence until repaired in the actual product. Leaving it out is not completion.
