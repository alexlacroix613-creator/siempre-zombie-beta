# Siempre Zombie

Siempre's browser first-person wave game. Public beta: https://siempre-zombie-beta.vercel.app/

## Source

- `game/`: browser runtime, approved source assets and Vercel score endpoints.
- `tools/`: focused gameplay and API checks.
- `SHIP-TRACKER.md`: authoritative acceptance status. Generated assets and passing source tests do not establish visual approval.

Serve `game/` over HTTP for local play. Global scores require the provider-managed server settings; missing connectivity leaves explicit device-only scores available. Never put credentials or `.vercel` metadata in Git.

## Deploy

Vercel project `siempre-zombie-beta`, repository root directory `game`. Run CLI deploys from the repository root (not from game), or push a reviewed main commit through the connected GitHub integration. Install from `game/package-lock.json`; no client build step. Node server functions provide the shared leaderboard using the existing Siempre Neon database and a restricted Zombie role.

Official launch starts a new identifier in `game/leaderboard-config.js` only when Alex authorizes launch. Keep beta score history separate from the active board.

## Artwork

Preserve supplied designs and authentic source images. Approved taco truck and accepted Ken model are frozen; other work must pass reference, motion and actual-game review before release. Lunar texture credits are in `game/assets/moon/SOURCE.md`.
