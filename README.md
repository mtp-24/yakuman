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
- Build 22: The Wall-Builder zeroes only plays with fewer than two melds (was three).
- Build 23: Talismans fire in slot order after the Han table; flat +Mult class (Kitsune, Tengu, Amanojaku, Nure-onna, Sazae-oni converted; Kasa-obake and Ittan-momen added); drag to reorder Talismans; running Mult in the animation and breakdown.
- Build 24: run setup with seven Walls (decks), four Stakes and seeds (seeded RNG); Run Info with play and Yaku counts; booster packs in the shop; skip a Small/Big Blind for one of fifteen Tags; sell Talismans and consumables inside the shop; six new bosses (Fisherman, Censor, Gatekeeper, Collector, Miser, Monk); Steel engraving (held-in-hand); Negative edition (+1 slot); seventeen new Talismans: streak and scaling (Nopperabō, Sekitō, Aobōzu, Shiro, Takibi, Hoshizora, Mabo, Chōchin), run-info powers (Hoshi, Hatsumōde, Oshi), held-in-hand (Daimyō), copiers (Utsushi, Kagami), gapped Chi (Hashi), plus Kasa-obake and Ittan-momen from build 23.
- Build 25: Run Info split into Run / Play ladder / Yaku / Yakuman tabs; every Yaku, Yakuman and ladder rung shows an example hand drawn with tiles.
- Build 26: owned Talismans and consumables shown as full cards (description, edition, copier target, current value) in the shop and pack screens, with Use and Sell; pack Open button fixed.
- Build 28: run-setup screen restored (it was lost in build 25, breaking New Run); Honor Pon partial plays count toward Yakuhai in Run Info; Title Case for headings, tabs, buttons and tags; "Honor" spelling aligned in HK mode.
- Build 30: run setup uses Balatro-style carousels (one Wall and one Stake visible, arrows to browse, defaults first); consistent empty states for Open Melds and River; optional pair ladder (Three to Six Pair) behind `CFG.pairLadder`, off by default; simulator prints plays by rung.
- Build 32: seed shown in the side panel, Run Info and the end-of-run screen with a Copy button; setup carousels stacked and the setup modal sized to content.
- Build 33: Blind Select screen between the shop and each blind (Small, Big and Boss cards with targets, rewards, Plays/Discards, the Boss rule, and the skip Tag shown in advance); runs start on it; skip rewards are pre-rolled per Ante.
- Build 34: live Chips × Mult hand box in the side panel above Plays and Discards (play name, Han, tier, Furiten), replacing the readout under the actions.
- Build 35: Scroll levels for Chi, Pon, Kan and Pair (and the Kan bonus) now apply inside complete hands as well as partial plays, so a complete hand always outscores the ready hand inside it.
- Build 36: monotonicity audit (`sim/monotonic.js`): no sub-play of a complete hand may outscore it. Tengu, Oni and Tanuki no longer apply to partial plays only. Remaining flips come only from deliberate conditions (Nurarihyon's no-honors rule, Daimyō's held Red Fives, Furiten).
- Build 37: Scroll Han applies once per play per component type (chips still per component), so a Chow scroll no longer gives +4 Han in a four-Chi hand. Scroll descriptions and Run Info text updated.
- Build 38: shop cards tinted by kind (Talisman gold, Omikuji blue, Kami purple, Scroll green, Flower pink, Pack orange); firing-order badge styled on owned Talisman cards (number only).
- Build 40: engraved tiles drawn Balatro-style instead of letter badges: Gold Foil, Obsidian, Jade and Steel tint the tile face, Glass is translucent blue, Red Seal is a wax seal on the top edge, Dragon Mark is a red corner emblem.
- Build 41: a pending Call is unmissable: gold banner on the hand, highlighted hand zone, pulsing Discard button, helper line and side-panel notice all say "settle your Call"; over-limit wording hidden while settling.
- Build 42: Buy, Open and Reroll buttons are disabled when you cannot afford them, with the price shown in red and the reason in a tooltip.
- Build 43: while settling a Call, Discard is enabled only with exactly the needed number of tiles selected (selection itself stays free so consumables still work); the pending count is recomputed after a consumable changes the hand.
- Build 7: multi-meld play ladder (Two Melds ... Four Melds), targets 300...45000, retrigger and scaling Talismans, Wall-Builder rewording, scoring animation.

## Simulators (in `sim/`)
`sim.js` / `sim2.js` measure complete-hand odds under different rules; `ladder*.js` play whole blinds under the ladder and report score percentiles and clear rates per Ante; `fullrun.js` plays complete 8-Ante runs through the real engine with a shop-buying policy (args: src dir, runs, cash reserve).
