# Control contrast regression audit

Task 6, November 12, 2026.

The previous native-menu change is `c0bc79b` (November 10); the earlier Positions option styling is `d006c79` (May 28). There is no November 11 contrast commit in the fetched history. The native-menu test visited Positions but did not enter All scales.

The All-scales closed select was already cream `#d9c8a4` on wood `#2a1810` (10.31:1) on main and in a fresh production browser. The reported black-on-black select was not reproduced. The production browser had no controlling service worker. There is no evidence that a cache or later selector override undid that particular fix.

Actual failures extended beyond native selects: dark text crossed brass gradients ending in decorative `--brass-dark` (2.42:1); legacy primary buttons retained white ink after their primary color became brass; white answer cards inherited cream ink; faded captions and paper widgets embedded in wood popups retained inappropriate ink. The embedded Jazz Standards favorites are one example of the latter.

The fix separates accessible control pairs from decorative borders. Text-bearing gradient stops use `--control-accent-low`; controls declare ink with their surface; fading no longer reduces required control text contrast. All-scales selectors also use brighter cream and a system font at 14px for legibility. No routing, stored-state schema, language direction, or guitar orientation changes are involved.

Run:

```sh
npm test
npm run test:contrast -- --workers=3
npm run test:e2e -- --workers=3
npm run build
node scripts/check-i18n.mjs
```

The browser regression walks all student sections and legacy exercises, Looper, global metronome/tuner, Positions tabs/overlays/quality picker, exercise settings/level drawers, Backing Tracks popups/favorites/saved progressions, Feedback link input, and rhythm preset dialogs. It revisits Positions and Backing Tracks after lazy styles load. The matrix is EN/HE × light/dark system preference × 360/390/1280px. The app currently has one Workshop palette, not a selectable light/dark theme. Hebrew remains LTR and existing persistence tests remain required.

For production evidence:

```sh
PLAYWRIGHT_BASE_URL=https://ear-training-rose.vercel.app \
SCREENSHOTS=1 AUDIT_OUTPUT=/workspace/codex-night-11-12/t6-prod.json \
node scripts/audit-contrast.mjs
node scripts/report-contrast.mjs BEFORE.json AFTER.json REPORT.md
```

The scanner calculates WCAG contrast, composites alpha backgrounds through ancestors, checks native select options/groups, and uses the lowest ratio among explicit CSS gradient stops. Every checked text size must reach 4.5:1. A synthetic unreadable control verifies detection; unit tests enforce the shared palette pairs. Disabled controls and SVG artwork are excluded. Raster textures, browser-owned popup pixels, and camera/microphone or audio-running states require visual/manual evaluation. Hidden developer diagnostic pages are also included (without running their audio or recording tests). The contrast walker dispatches panel clicks directly where the draggable global FAB can cover the phone dock; it does not test pointer accessibility.

Detailed before/after rows, the exact production matrix, deployment evidence, and screenshot paths are generated in `/workspace/codex-night-11-12/` during the production verification run. Each screenshot is named `screens/t6-<instance>-<light|dark>-<en|he>-<390|1280>.png`.
