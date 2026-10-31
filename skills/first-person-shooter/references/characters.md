# Source-faithful characters and a shared rig

Review real front/rear/side/action references and record missing coverage. Do not stretch a front view around a body or invent a generic face. Obtain authorized reference-conditioned generations or original photography for missing views; preserve face, hair, clothing, proportions and accessories.

Establish one compatible skinned body/action contract before scaling a roster. Fit variant textures and head/accessory meshes to it. Validate topology, UVs, bone hierarchy, inverse bind matrices, weights and track targets; a material name alone does not establish compatibility.

`fitted-zombie-variants.mjs` loads body albedos/fitted heads while preserving the accepted body's texture sampling. Clone per-variant materials rather than changing a shared instance. Dispose clones without freeing textures still used by others. In Siempre, the accepted Ken body/UVs/69-bone rig are frozen; another game may use any appropriate rig.

## Texture acceptance

Inspect front/back, side seams, shoulders, neck, hands and face under actual gameplay lighting, including joint extremes. Preserve color-space/alpha settings. A blown-out face or warped projection is not fixed merely because the original image exists in an atlas. Keep missing-angle and deformation repairs owned through the working product.

## Motion

Share compatible idle, walk/chase, attack, hit and death actions. Root translation, gait and movement speed must agree. Blend transitions without frozen arms or rigid gliding legs. Attach heads, hats and labels to intended bones and inspect them while turning/attacking.

`physical-death.mjs` validates increasing key times, normalized quaternions, 69 unique track nodes and per-variant support. It builds a separate contact clip without rewriting the accepted GLB. `accessory-death-settle.mjs` handles attached items during the fall.

A death visibly changes joint pose, falls onto ground and settles with credible head/limb contact. Review side/front and slope/obstacle cases. Keep bounded corpse lifetime and cleanup. Do not translate an upright actor below the floor or immediately fade it as a substitute.

Validate one idle actor, walking toward/across the camera, attack, kill, contact, settled corpse and cleanup; then mixed variants and a crowded wave. Structural rig checks do not establish likeness/natural motion. Use video or live transitions for stiffness/jitter complaints.
