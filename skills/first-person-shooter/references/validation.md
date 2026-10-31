# Validation — 31 October 2026

- Source pin: `35c7a2b5f768aa7603e4a0a6706e6fde37f61d4f`; only an old driving-check fixture changed from the live-game snapshot. `game/` runtime and assets were unchanged.
- Real isolated export: 281 files, 244,330,273 bytes; every exported file matched the canonical-LF/binary SHA-256 manifest.
- All 15 offline check files passed: five controls/lifecycle, four combat/vehicle, four visual/layout/map/boundary, scoreboard service and score-sharing tests.
- Three exporter tests passed: committed state wins over dirty working files and secrets stay out; existing output/source descendants are refused; unsafe paths and hash mismatches fail. A newline fixture under Git autocrlf=true verifies cross-platform archive stability.
- Exported game reached the rendered title with its loader hidden/Ready at 100% in the real browser; no browser error logs were captured. Static-local shared scores are unavailable by design.
- Independent forward review exercised an existing-game vehicle-exit/enemy-skin request and the exporter tests. A folder-copy ambiguity was corrected; final bounded review found no consequential defects.
- Skill structure validation passed. No production score was written or reset, no game runtime changed, and no social content or paid generation was initiated.

This checks packaging, source integrity and the listed regressions. It is not a new full gameplay, likeness, audio or physical-phone performance certification. Run affected checks and actual interactions after adapting the reference to a different game.
