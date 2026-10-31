# Weapon art, projectiles and vehicles

Inventory held views, object/pickup angles, aim/fire/recovery/reload/empty states for each costume. An approved still cannot supply every motion. Obtain missing frames from the actual design when authorized; retain original/derivative provenance. Do not replace approved art with a generic primitive recreation.

Choose representations by view: authored first-person frames can coexist with dimensional/source-view world objects. A held frame is not a multi-angle world asset; a flat character billboard is not an articulated skinned actor.

## Register first-person frames

Normalize camera/crop/grip anchors before transitions. Keep hands on trigger/support grips and distinguish left/right anatomy rather than copying one left arm twice. Use the chosen player's sleeves/gloves across weapons and driving.

`held-frame-layout.js:containSleeveCuts` computes downward overscan from measured opaque border cuts, viewport and motion. A fixed shift that hides the cut only at rest is insufficient. Check portrait, wide/short landscape and the complete recoil/swing range.

Preserve alpha edge colors without matte/fringing. Inspect fire/return frames on the real background. Siempre's Gatling cranking was explicitly removed after jitter; preserve that decision in this game, not as a ban on all other weapon mechanisms.

Separate nozzle registration from cartridge geometry. Siempre dual soakers emit from the lower nozzles, not upper cartridges. Aim toward the target but derive emission from the visible pose; verify both skins through idle/aim/fire and camera turns.

## Projectiles and area damage

Use finite lifetime and swept first-contact tests. `muerto-rpg-combat.js` separates loaded/reserve/reload/cooldown from rendering and rejects invalid time steps. The world bottle and held action must agree on launch/reload timing.

The reference RPG uses a 6-metre cover-aware blast. Test two nearby visible targets, outside-radius and occluded targets, one score per kill and cleanup. Balance values are examples for adaptation, not universal defaults.

Balloons need tied-neck shape, elasticity and visible liquid/latex impact. `balloon-visuals.js` uses source art with bounded bursts. Held throw, flight, ground pickup and pop are separate states; a plain sphere is not visually equivalent.

## Driving and healing

Keep vehicle position/yaw/steering separate from player look. Place the camera at the driver rather than behind the seats. `driver-viewmodel.js` registers cockpit, forward transparency and hand/wheel poses. Check both turns, return to center, wheel-spoke masking and both costumes.

Exit to a nonintersecting grounded point and restore on-foot controls. Block incompatible actions while driving according to the brief. Siempre's accepted white/black RZR is a two-seater without mounted guns.

The approved taco truck is grounded and reachable from multiple angles. Counter collision, eating action, healing limits and return to play must work together. Use the approved authored eating action; a blocking fake loading screen is not eating animation.
