# Yakuman — playtest build

Single-file browser game built from the Yakuman design document.

- `yakuman.html` — the playable game. Open it directly in a browser, no server needed. `docs/index.html` is the same file, served by GitHub Pages.
- `src/data.js` — all tunable numbers (the `CFG` block at the top) and the item catalogue: Talismans, Omikuji, Kami, Scrolls, Flowers, bosses.
- `src/engine.js` — hand decomposition, Yaku detection, scoring pipeline.
- `src/game.js` — run state, actions (Play / Discard / Call), shop, rendering, debug panel.
- `src/head.html`, `src/body.html` — styles and markup.
- `build.sh` — concatenates `src/` into `yakuman.html` (standalone), `docs/index.html` (GitHub Pages) and `page.html` (artifact body).
- `sim/` — the Node simulators used for balancing (see `sim/README.md`).
- `publish.sh` — rebuild, commit and push everything; the public site updates about a minute later.

Edit anything in `src/`, then run `./build.sh`.

Public site: https://mtp-24.github.io/yakuman/ (GitHub Pages, repo `mtp-24/yakuman`, served from `docs/`). Run `./publish.sh "message"` to rebuild and push a new build there.

The Debug button in the game header gives +YEN, +Plays, instant blind win, boss selection, and lets you add any item for testing.

## Build history
- Build 1: core loop, 136-tile Wall, hand 14, 3 discards x5, full Yaku list, four bosses, starter shop.
- Build 2: hand 17 (play 14 of them), 5 discards x7.
- Build 3: shanten helper (tiles-away readout, dead-tile dots).
- Build 4: Lone Tile and Pair plays.
- Build 5: The Purist hides only terminals and honors.
- Build 6: SVG tile faces, Yaku cheat sheet, Purist helper on visible tiles.
- Build 8: Two Pair rung.
- Build 9: bigger tiles, seven River Talismans (39 total).
- Build 10: Furiten applies to the winning tile only (newest drawn tile in the played hand); helper shows waits and Furiten risk.
- Build 11: Riichi / Hong Kong terminology toggle (header button, stored per device). Vocabulary lives in the HK_* tables at the end of src/data.js.
- Build 12: English-only HK terms; E/S/W/N letters on wind tiles; ¥ in Riichi mode, $ in HK mode; Four Melds + Pair rung (reachable only with open melds).
- Build 15: 5 Plays, ¥8 start, Ante 1-2 targets 250/700, Loan Shark charges ¥1 per Discard action (from the full-run simulation).
- Build 16: Declare Kan (closed Kan from hand), replacement draw after every Kan, Rinshan Kaihou (+1 Han), "settle the Call" wording, toggle for the green dead-tile dots.
- Build 17: Talisman editions (Foil +50 chips, Holographic +1 Han, Polychrome x1.5), Red Seal and Glass engravings, live Chips x Mult preview of the selection, Scroll levels on the cheat sheet, "Again!" retrigger pulses and a fire effect when a play passes the blind target.
- Build 19: tile-first layout. Tiles scale with the viewport (hand up to 84px, River/open melds up to 62px), open melds and River sit side by side on wide screens, phones get a compact header, the hand directly under the blind strip and a sticky action bar. Over-capacity hand wording after Duplication.
- Build 20: drag-and-drop hand reordering (mouse and touch); tiles score in hand order; Shikigami uses the leftmost tile.
- Build 21: header buttons grouped into an even grid on narrow screens; shop reward list names the blind properly; simulator shop rolls editions.
- Build 7: multi-meld play ladder (Two Melds ... Four Melds), targets 300...45000, retrigger and scaling Talismans, Wall-Builder rewording, scoring animation.

## Simulators (in `sim/`)
`sim.js` / `sim2.js` measure complete-hand odds under different rules; `ladder*.js` play whole blinds under the ladder and report score percentiles and clear rates per Ante; `fullrun.js` plays complete 8-Ante runs through the real engine with a shop-buying policy (args: src dir, runs, cash reserve).
