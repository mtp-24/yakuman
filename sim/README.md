# Simulators

Node scripts used to balance the game. Run from the project root; most take the `src` folder as the first argument so they use the real engine.

- `balatro.js` — odds of each poker hand in an 8-card Balatro hand, for comparison. `node sim/balatro.js`
- `sim.js` / `sim2.js` — how often a dealt hand can reach a complete hand under different rules (hand size, discards, suits, optimal vs human-style discards). `node sim/sim2.js`
- `ladder3.js` — plays whole blinds under the play ladder (with Two Pair), reports score percentiles and clear rates per Ante. `node sim/ladder3.js src`
- `ladder5.js` — same with Calls, winning-tile Furiten and the River Talismans. `node sim/ladder5.js src 800`
- `furiten.js` — how often three Furiten definitions trigger. `node sim/furiten.js src`
- `fullrun.js` — complete 8-Ante runs through the real engine with a shop-buying policy. `node sim/fullrun.js src 300 5 combo` (runs, cash reserve, variant: base|plays5|gentle|money8|sharkaction|combo)
