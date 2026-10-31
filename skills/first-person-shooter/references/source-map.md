# Source and architecture

Source: https://github.com/alexlacroix613-creator/siempre-zombie-beta

`source-manifest.json` pins the committed reference and lists every exported file's size and SHA-256. Text export uses canonical LF endings regardless of the host's Git autocrlf setting; binary art remains exact. Export never uses local modifications or silently updates to `main`. If a shallow clone lacks the pin, fetch that commit using existing Git authentication. Update the manifest only after inspecting the intended revision and revalidating the export.

## Module map — paths relative to the checkout

| Concern | Files / entry points |
| --- | --- |
| Boot/screens/retry/metadata | `game/index.html`, `siempre-zombie.css`, `mobile-hud.css`, `soldier-selection.css` |
| Simulation owner | `game/siempre-zombie.js`: input listeners, `startGame`, `gameOver`, `updatePlayer`, `updateWeapon`, `updateZombies`, `updateBuggy`, `frame` |
| World/ground/fog | `game/distillery-world.js`, `refill-layout.js`, `out-of-bounds.js`, `boundary-fog.js`, `grass-motion.js` |
| Hits/area damage | `game/combat-trace.js`, `muerto-rpg-combat.js`, `muerto-rpg-runtime.js` |
| Characters | `game/fitted-zombie-variants.mjs`, `physical-death.mjs`, `accessory-death-settle.mjs`, `character-labels.js`, `sergio-boss.js` |
| Held art | `game/authored-weapon-views.js`, `held-frame-layout.js`, `dual-viewmodel.js`, `coa-viewmodel.js`, `gatling-source-views.js`, `muerto-rpg-source-views.js`, `source-vivo-compositor.js` |
| Pickups/projectiles | `game/new-field-props.js`, `balloon-visuals.js`, `source-glass-projectile.js`, `siempre-zombie.js:weaponPickup` |
| Vehicles/eating | `game/rzr6-loader.js`, `driver-viewmodel.js`, `taco-truck.js`, `taco-eating-view.js` |
| Map | `game/minimap-gps.js`, `calibrated-minimap.js`, map registration in `index.html` |
| Audio/film/sharing | `game/siempre-audio.js`, `zombie-intro.js/css`, `score-sharing.js/css` |
| Scores | `game/api/siempre-zombie/`, `game/lib/`, `game/leaderboard-config.js`, `landing-leaderboard.css` |
| Browser dependencies/art | `game/vendor/`, `game/assets/`, `game/halloween/` |
| Offline checks | `tools/` files selected in the manifest |

The client uses vendored Three.js modules and static files, with no frontend build. Node 22 runs server functions/checks. `game/package-lock.json` pins PostgreSQL dependencies for the optional backend. Export/check scripts never install packages or access a database.

`siempre-zombie.js` remains the state owner. Do not register a second camera/input owner to repair one overlay. Historical modules still exist: trace imports and constructors from the entry point rather than assuming any filename is active. Static HTTP does not implement `/api/...`; explicit device-only scoring locally is not a test of the global board.
