// Approximate ground registration for the authored v80 diorama (1024 x 1365).
// It is an illustration, not an orthographic render of the current GLB.
export const SITE_GPS_ANCHORS = Object.freeze([
  { name: 'oven-front ground', x: -16, z: -26, px: 355, py: 780 },
  { name: 'north yard ground', x: 0, z: -145, px: 450, py: 300 },
  { name: 'south entrance ground', x: 5, z: 40, px: 490, py: 952 },
]);
export const SITE_GPS_SIZE = Object.freeze({ width: 1024, height: 1365 });

export function siteGpsPosition(x, z) {
  return {
    u: (6.2827004219409295 * x + .04641350210970476 * z + 456.7299578059072) / 1024,
    v: (-3.1538677918424813 * x + 3.60956399437412 * z + 823.3867791842474) / 1365,
  };
}

// Project a short world-space facing line, then convert it to displayed pixels.
// Works with either the authored 3D projection or the existing tactical mapping.
export function gpsHeading(project, x, z, dx, dz, width, height) {
  const p = project(x, z), q = project(x + dx, z + dz);
  return Math.atan2((q.u - p.u) * width, -(q.v - p.v) * height);
}
