# Siempre Zombie

Siempre's browser first-person wave game. Play: https://siempretequila.com/games/siempre-zombie/

## Reusable FPS skill

[First-Person Shooter](skills/first-person-shooter/SKILL.md) turns this project's implementation and approved-art workflow into an agent skill. It includes a full-game exporter pinned to a verified source snapshot, focused offline checks and guides for controls, characters, weapons, vehicles, scores and release. The art/code remain in this private repository; the skill does not grant redistribution rights or deploy anything automatically.

Install by copying `skills/first-person-shooter/` into your agent's skills directory, then invoke `$first-person-shooter`. See [the skill](skills/first-person-shooter/SKILL.md) for the two-step source checkout/export workflow.

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
