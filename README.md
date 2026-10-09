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
- Build 44: dead-tile dots stay visible while settling a Call; hand rows get extra vertical gap so a lifted (selected) tile no longer covers the dots of the row above.
- Build 45: Settings screen (terminology, dead-tile dots, debug tools, wipe save) replaces the header Terms and Debug buttons; Run Info button is just "Run Info"; the Run tab is organised into cards (Run, Plays, Talismans, Mastery, Flowers, Tags) with a boss timeline.
- Build 47: side hand box shows only the play's base (rung name, Scroll level, base chips × Mult from base Han, plus Yaku names for a complete hand) like Balatro; tile bonuses, Talismans and the total are revealed by the scoring animation.
- Build 48: chips and Mult shown as Balatro-style blue and red boxes in the side hand box and the scoring stage.
- Build 49: scoring animates in place (tiles light up in the hand and open melds, the side hand box is the live counter with the breakdown beneath, Talismans bounce in their slots) instead of a modal; animation speed setting (slow / normal / fast / instant) in Settings; click anywhere to skip.
- Build 50: fixed the Play click itself skipping the scoring animation (skip is armed only after scoring starts); Slow speed is 2.5x.
- Build 51: dead-tile dots are off by default and live only in Settings as an assist; the hand-header Dots button is gone.
- Build 52: the Play button always reads "Play"; the play type shows in the side hand box (and in the button tooltip).
- Build 53: hand box shows only the play name, level and Han (neutral "Select a play" otherwise); Debug bar gains a "Demo hand" button that stages a complete hand showcasing the scoring animation.
- Build 54: dead-tile dots also mark spare tiles when the hand is already complete (including while settling a Call); the settle message says when a complete hand is ready.
- Build 55: setup carousel arrows are SVG chevrons (the ◀ ▶ characters rendered as blue emoji on iOS Safari).
- Build 56: the scoring breakdown streams into the Last Play panel during the animation; the hand box shows only the name, chips × Mult and total.
- Build 57: the chips box and the Mult box shake and pop whenever their value changes during scoring, Balatro-style.
- Build 58: Balatro-style finish: no running total during scoring; the total replaces the play name at the end, then counts down into a Round Score counter (which replaces the progress bar and "Scored" line).
- Build 59: the final total sits above the chips × Mult boxes (both stay visible); the breakdown streams into a separate Scoring section under the hand box that exists only while scoring; Last Play follows after.
- Build 60: a Han counter in the scoring box ticks and shakes on every Han line and shows the tier it maps to, so Yaku progress is visible even on Han-table plateaus.
- Build 61: the breakdown streams into the Last Play panel again (the temporary Scoring section is gone).
- Build 62: demo hand reworked to exercise chips, Han and Mult separately (Obsidian, Red Seal, Jade, Dragon Mark, Gold, Glass tiles; Red Five and Dora; Tanyao, Pinfu, Sanshoku; Daruma, Tengu, Kitsune, Kasa-obake, Polychrome Hannya).
- Build 63: fixed tile id collisions after a reload (tiles created mid-run could share an id with saved tiles, making several tiles select together); existing duplicates are repaired on load.
- Build 64: a thin progress bar along the bottom edge of the Round Score box (gold, turning green at the target), updating live during the count-up.
- Build 65: Han counter is part of the hand box at all times (tier shown, dims after conversion; no "converted" label); more space between the target and Round Score; a Cash Out screen with the reward breakdown appears after a won blind, before the shop.
- Build 66: side panel blind plate groups Ante, blind type, name, boss rule, target and reward in one card; seed and Mastery lines removed from the side panel (both live in Run Info).
- Build 67: scoring animation now starts from exactly what the hand box previewed (base, Scroll levels and Yaku Han), so the Han count only climbs; target, chips, Mult, total and Round Score shrink to fit instead of wrapping; shop money shown as plain large text (currency label and value the same size).
- Build 68: Hong Kong mode fix, the Han pill and tier text in the scoring box now read Faan while a play is scoring.
- Build 69: Rules rewritten into four sections (Playing a Blind, Scoring, Between Blinds, Help and Controls) with every number read from the config; adds money, interest, reroll, selling, slots, Kan bonus, partial-play Yakuhai, Yakuman stacking, the Han table with tier names, the correct Dora rule, Negative edition and keyboard shortcuts. Hong Kong mode: English names for the Han tiers (Full Win, Jump Win, Double Win, Triple Win), "Complete hand(s)" and "Yakuza" translated, Settings terminology note no longer translated. `sim/monotonic.js` now counts violations outside the two deliberate exceptions.
- Build 70: Rules corrections, Han from Talismans and the Holographic edition counts before the Han table, and two pairs on their own are a valid play.
- Build 71: pack hand. Omikuji, Mega Omikuji and Kami packs deal 8 random tiles from your Wall; select tiles and Use a card on them (changes stay in the Wall, destroyed tiles leave it, copies join it) or Keep the card for a Blind. Slip of the Indicator and Amaterasu stay Blind-only. Rules and Hong Kong terms updated (Fortune Sticks, Deities, Bonus Tile Slip).
- Build 72: Raijin can be used from your slots in the shop, where it destroys 2 random tiles from your Wall (still +1 Play every Blind). Pack-hand and shop use share one Wall helper. Rules and Hong Kong text updated.
- Build 73: Kawauso (Hong Kong: Otter Spirit), a ¥7 Talisman that lets you claim 1 River tile as the winning tile of a complete hand (select it with the rest of the hand and press Play). Claimed hands are always in Furiten, the tile leaves the River, Kappa turns it into a bonus, and The Fisherman forbids it. Hand box shows a River Claim tag, the helper points out claimable waits, and the River panel explains it. Simulator: bot buys and uses Kawauso; start-<talisman> variants compare one slot.
- Build 74: Discard disables above the per-action tile limit; Wall, Rules, Run Info, Settings and confirm dialogs close with a corner X, a click outside or Esc (game-flow screens stay put); header shows only money, with the Wall count on the Wall button; side panel drops the Wall and money cards; helper hints (Tiles Away, Waiting On, Without These) are separate Settings toggles, all off by default.
- Build 75: shop Buy and pack Take/Keep buttons disable with a "Slots Full" label when Talisman or consumable slots are full; Scroll cards in the shop and in packs show the current and next level (like Planet cards); View Wall button in the shop and in packs; pack tiles fill the space (one row of 8 on desktop, two rows of 4 on phones).
- Build 76: Talisman cards in the shop and in packs show an "If bought" preview of their live value (growing Talismans from zero, Hoshi, Hatsumōde and Oshi from the run so far, Kagami and Utsushi say what they would copy); Hoshi, Hatsumōde and Oshi also show live values once owned. Fix: a Talisman gained again after selling starts fresh instead of keeping its old progress. Duplicate View Wall button in the shop removed. Gashadokuro text says it counts hands played while you own it.
- Build 77: on screens 1100px and wider, Talismans and Consumables sit side by side in one row (columns sized by slot count), saving about 100px of height; narrower screens keep the stacked layout.
- Build 78: header buttons reordered to Wall, Run Info, Rules, Settings, New Run.
- Build 79: scoring summary redesign. Han moves out of its separate pill into a caption strip under the Mult box ("10 Han · Baiman", wrapping to two lines in the narrow side panel), with a matching "Chips" strip under Chips so both boxes stay level; the whole box shakes when its value or Han changes.
- Build 80: zone headers (Open Melds, River, Hand, Talismans) stay on one line, with long info truncated and shown in full on hover, so the Open Melds and River rows line up; River instruction shortened. On wide screens every Talisman and Consumable slot, filled or empty, is the same height.
- Build 81: Hong Kong fix, open meld labels read CHOW, PUNG and KONG (they were uppercased before translation, so CHI, PON and KAN slipped through).
- Build 82: bigger scoring summary. Side panel widened from 230px to 290px and the Chips and Mult numbers raised from 22px to 32px (26px on phones), so the Han caption fits on one line in Riichi mode.
- Build 83: pack tiles toned down from about 99px to 80px wide on desktop (68px cap on phones) so the pack screen feels balanced.
- Build 84: pack screen narrowed to 760px and centred: title, tile row, cards (220px each, leftover cards centred, full width on phones) and the Skip and View Wall buttons, so 2- and 3-card packs no longer sit to the left.
- Build 85: pack screen text (title, description, Your Tiles) back to left-aligned like every other screen, with only the tile row and cards centred; bottom buttons now read View Wall, then Skip the Rest.
- Build 86: shop buttons reordered to View Wall, then Reroll Cards.
- Build 87: shop money shown as a gold wallet chip on the Shop title line; shop grouped like Balatro, with the two random cards and the Scroll under Cards, and the Flower and Booster Pack in fixed spots below; clearer consumables note; Rules list the shop slots and card odds. Fix: the two random shop cards now use the seeded RNG, so a shared seed replays them.
- Build 88: shop controls sit next to what they act on: Reroll Cards beside the Cards heading, purchase messages right under the shop items, the consumables note under Your Consumables, and a footer with View Wall on the left and Next and Continue on the right.
- Build 89: pack screens match the shop: pack name with the wallet chip, a "Cards · choose N more" label above the cards, purchase messages under the cards, owned cards left-aligned, and the same footer with View Wall on the left and Skip the Rest on the right.
- Build 90: pack cards left-aligned on the same grid as the shop; only the Your Tiles row stays centred in its box.
- Build 91: money chip removed from pack screens (nothing in a pack costs money); selling a Talisman now says how much you got, and Slip of Wealth used in a pack reports +¥5.
- Build 92: Tiles Away helper hint on by default (Waiting On and Without These stay off); Settings and Rules text updated.
- Build 93: scoring box keeps one height (145px) from empty to preview to scoring to total. Fixed 36px title row: the play name fits itself (22px down to 12px, up to two lines, never cut off) and the total takes the same row at the end, with ink-balanced spacing; preview and scoring now show the same title; "click to skip" line removed (clicking anywhere still skips); the Han caption is always two lines. Board slots show their kind (Talisman, Omikuji, Kami Spirit, edition) on a small line above the name, like owned cards in the shop, so the label never wraps differently.
- Build 94: the scoring box title stays blank until a play is selected (no "Select a play" text); height unchanged.
- Build 95: more space between the shop footer's "Next: Ante …" text and the Continue button.
- Build 96: Dots and Bamboo tiles drop their corner number (it collided with the art on 3, 6, 7, 8, 9 Dots and 6, 8, 9 Bamboo; the pips are counted, as on Japanese sets). Characters keep their number and Winds their letter.
- Build 97: opening a pack clears the last shop message (it showed "Bought …" from before the pack); owned Talisman cards drop the redundant "Sells for" label, leaving the "Sell ¥n" button.
- Build 98: pack results you can check. Every Use outlines the tiles it changed with a label (the engraving, "→ new tile", "Red Five" or "New"), keeps removed tiles in the row greyed and struck through, and names the tiles in the message. After the last pick the pack stays open with its cards locked and a Done button (View Wall still available); Keep or Take as the last pick still closes straight away.
- Build 99: removed pack tiles show only the red strike (no "Removed" caption; hover says it); the Your Tiles label counts every tile shown, removed ones included.
- Build 100: converted pack tiles (suit, rank or Red Five changes) show only the gold outline, since the new face is visible; engravings keep their name and duplicates keep "New".
- Build 101: Tile numbers setting (All Tiles, Characters and Winds by default, or None) controls the corner number or letter on tiles. Blind plate no longer repeats "Small Blind"/"Big Blind" above the name (bosses keep the "Boss Blind" label). The Gatekeeper shows no status until its first Play is done.
- Build 102: pack results drop all captions (engraving names and "New"): changed and added tiles get only the gold outline, removed tiles only the strike, and the message names the tiles, grouping repeats ("2 Man ×2"). Simulator: argv[7] ryu1 tests a Ryūjin that makes only the first Call each Blind free.
- Build 103: shop and pack cards keep their height when their buttons turn into "Sold", "Used" or "No picks left".
- Build 104: The Purist allows sorting and manual order again; face-down tiles keep their true sorted position, a slight hint of what they are. Boss text updated.
- Build 105: Ryūjin now makes only the first 2 Calls each Blind free (was every Call); its card shows the free Calls left, the Call message counts them down, and the Rules mention it. Simulator uses the same limit (starting with it: about 12% wins instead of 17%).
- Build 106: Rules, Wall, Run Info and Settings drop the bottom Close button; the corner X (which stays visible while scrolling), Esc and a click outside close them. Confirmations keep their Cancel button.
- Build 107: redesigned game over (score bar, stat cards, Best Play, Talisman chips, seed footer), Ante screen (Ante progress pips, blind-plate style targets and rewards, Tag chips, dimmed cleared and upcoming blinds), New Run (counters, centred dots, Cancel and Start Run footer) and the Start a New Run? confirmation. Rules split into Quick Start (default) and Full Rules tabs, with Full Rules covering Done in packs, fresh re-bought Talismans, tile numbers, sorting against The Purist and closing screens. The Purist: selecting a face-down tile shows ? for the hand name, Chips, Mult and Han, and Play stays enabled, so the preview no longer reveals what face-down tiles make.
- Build 7: multi-meld play ladder (Two Melds ... Four Melds), targets 300...45000, retrigger and scaling Talismans, Wall-Builder rewording, scoring animation.

## Simulators (in `sim/`)
`sim.js` / `sim2.js` measure complete-hand odds under different rules; `ladder*.js` play whole blinds under the ladder and report score percentiles and clear rates per Ante; `fullrun.js` plays complete 8-Ante runs through the real engine with a shop-buying policy (args: src dir, runs, cash reserve).
