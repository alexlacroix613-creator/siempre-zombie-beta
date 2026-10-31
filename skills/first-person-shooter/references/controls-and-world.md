# Controls, lifecycle and contact

The reference stores player yaw/pitch separately and uses captured `movementX`/`movementY`: pitch is bounded, yaw turns continuously. Its `.0022 * stored sensitivity` is shipped calibration, not a universal prescription. Do not add acceleration/smoothing when repairing capture.

Request pointer lock from the original Play/Resume gesture. Distinguish acquisition, rejection and loss. An unlocked cursor that reaches an edge cannot provide ordinary 360-degree control; use fallback only when explicitly selected or the API is unavailable. Recover lock failure through the existing pause flow.

Clear keys, fire, aim, sprint, velocity and touch IDs on leaving play, blur/hidden, pointer cancellation and vehicle enter/exit. Do not leave a steering-specific camera clamp active on foot. Release obsolete touch captures. Keep down/up and begin/end balanced: quick taps fire, release/cancel stops held actions.

Desktop/touch/gamepad, if added, feed the same action state. Scroll through owned slots with a deliberate wheel-step rule. Prevent page scrolling only while gameplay consumes that action. Relevant group: `controls`.

## Ground, cover and GPS

Use one coordinate convention for visible ground, colliders, spawn selection and camera height. Test flat ground, ramps, raised surfaces, borders, exits and an invalid/outside position. Recover genuine falls to a known grounded point; a broad hidden platform must not conceal incorrect world colliders.

`combat-trace.js` returns first segment/box or finite-cylinder contact fractions. Compare nearest wall/target hits and preserve vertical bounds. Thin walls and elevated targets cannot be skipped by testing only the next position.

Siempre's soft boundary uses green fog, an out-of-bounds message and choking edge feedback, with recovery on return. Its outer failsafe and ordinary obstacle colliders are separate. Another FPS should use its own requested boundary design.

A GPS marker shares the map registration transform, axes and player yaw. Verify position/heading at separated landmarks and while driving; a fixed arrow over attractive map art is not GPS.

Relevant checks: `check-ground-and-rzr-exit.mjs`, `check-combat-fairness.mjs`, `check-minimap-gps.mjs`, `check-out-of-bounds.mjs`.

## Real acceptance route

Play -> several full turns -> fire/release -> scroll -> pause/resume -> hide/show tab -> enter/steer/exit -> turn/fire/scroll again -> ground edges/ramps -> die/retry. Repeat affected actions with touch. Source checks complement this route; they do not replace browser/device interaction.
