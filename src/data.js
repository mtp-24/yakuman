'use strict';
// ===================== CONFIG (tune here while playtesting) =====================
const CFG = {
  handSize: 17,          // tiles held; a complete hand still uses 14 of them
  playsPerBlind: 5,
  discardsPerBlind: 5,
  maxDiscardTiles: 7,
  startMoney: 8,
  talismanSlots: 5,
  consumableSlots: 2,
  antes: 8,
  anteBase: [250, 700, 2000, 4500, 9000, 16000, 28000, 45000],
  blindMult: { small: 1, big: 1.5, boss: 2 },
  blindReward: { small: 3, big: 4, boss: 5 },
  interestPer: 5, interestCap: 5,
  rerollCost: 5,
  // Base values per play type. Scrolls of Mastery add +10 chips and +1 Han per level.
  meldBase: { single: { chips: 0, han: 0 }, pair: { chips: 5, han: 0 }, twopair: { chips: 15, han: 1 }, chi: { chips: 10, han: 1 }, pon: { chips: 20, han: 1 }, kan: { chips: 40, han: 2 }, hand: { chips: 120, han: 2 } },
  // Multi-meld plays ("ladder B"). Key = melds,pair. A single meld + pair uses the meld's base +10 chips.
  rungs: { '2,0': { name: 'Two Melds', chips: 30, han: 1 }, '2,1': { name: 'Two Melds + Pair', chips: 40, han: 1 }, '3,0': { name: 'Three Melds', chips: 60, han: 2 }, '3,1': { name: 'Ready Hand', chips: 80, han: 2 }, '4,0': { name: 'Four Melds', chips: 100, han: 2 }, '4,1': { name: 'Four Melds + Pair', chips: 110, han: 2 } },
  kanBonus: { chips: 20, han: 1 },   // per Kan inside a multi-meld play
  // Optional pair ladder (experiment): plays of 3-6 different pairs with no melds. Off by default.
  pairLadder: false,
  pairRungs: { 3: { name: 'Three Pair', chips: 25, han: 1 }, 4: { name: 'Four Pair', chips: 40, han: 1 }, 5: { name: 'Five Pair', chips: 55, han: 2 }, 6: { name: 'Six Pair', chips: 70, han: 2 } },
  scrollChips: 10, scrollHan: 1,
  // Han -> multiplier. Index = Han. 13+ = x100.
  // Playtest 2: hand 17 (was 14), 5 discards (was 3), up to 7 tiles per discard (was 5).
  // Playtest 7: multi-meld ladder, complete hand 120 chips / 2 Han + Yaku, targets re-based to 300…45000.
  // Playtest 10: Furiten applies only to the winning tile (the newest tile drawn into the played hand).
  // Playtest 15: 5 Plays (was 4), start ¥8 (was ¥4), Ante 1-2 targets 250/700 (were 300/800), Loan Shark charges per Discard action.
  // Playtest 16: Declare Kan (closed), replacement draw after any Kan, Rinshan Kaihou.
  // Playtest 17: Talisman editions (Foil / Holographic / Polychrome), Red Seal and Glass engravings, live score preview.
  // Playtest 23: Talismans fire in slot order after the Han table; flat +Mult class; drag to reorder Talismans.
  hanTable: [1, 2, 4, 8, 15, 15, 25, 25, 40, 40, 40, 60, 60, 100],
  tierNames: ['None', 'Standard', 'Advanced', 'Master', 'Mangan', 'Mangan', 'Haneman', 'Haneman', 'Baiman', 'Baiman', 'Baiman', 'Sanbaiman', 'Sanbaiman', 'Yakuman'],
  // Shop card odds, as in Balatro (Jokers 20, Tarot 4, Planet 4, no Spectrals): Talismans 71%, Omikuji 14%, Scrolls 14%.
  shopWeights: { talisman: 20 / 28, omikuji: 4 / 28, scroll: 4 / 28, kami: 0 },
  // Booster pack weights per type, Normal / Jumbo / Mega, as in Balatro (Arcana, Celestial, Standard, Buffoon, Spectral).
  packWeights: { omikuji: [4, 2, .5], scroll: [4, 2, .5], tile: [4, 2, .5], talisman: [1.2, .6, .15], kami: [.6, .3, .07] },
  // Talisman rarity odds in shops and packs, as in Balatro (Legendaries only come from Hitodama).
  rarityWeights: { common: 0.70, uncommon: 0.25, rare: 0.05 },
  soulOdds: 0.04,   // chance a Kami roll is Hitodama
};
function hanMult(h) { h = Math.max(0, Math.floor(h)); return h >= 13 ? 100 : CFG.hanTable[h]; }
function tierName(h) { h = Math.max(0, Math.floor(h)); return h >= 13 ? 'Yakuman' : CFG.tierNames[h]; }

// ===================== TILES =====================
const SUITS = ['m', 'p', 's', 'z'];
const HONOR_NAMES = ['', '東', '南', '西', '北', '白', '發', '中'];
const HONOR_EN = ['', 'East', 'South', 'West', 'North', 'White', 'Green', 'Red'];
const SUIT_GLYPH = { m: '萬', p: '筒', s: '索' };
const SUIT_EN = { m: 'Man', p: 'Pin', s: 'Sou' };
const MELD_LABEL = { single: 'Lone Tile', pair: 'Pair', twopair: 'Two Pair', chi: 'Chi', pon: 'Pon', kan: 'Kan', hand: 'Complete Hand' };
// Display name for a play type as stored in the run stats ('hand', 'chi', 'rung31', ...).
function rungLabel(k) { return MELD_LABEL[k] || (CFG.rungs[String(k).replace('rung', '').split('').join(',')] || {}).name || k; }
function topEntry(obj) { let best = null, n = 0; for (const [k, v] of Object.entries(obj || {})) if (v > n) { n = v; best = k; } return best ? [best, n] : null; }
const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
let tileSeq = 0;
function mkTile(suit, rank, red = false) { return { id: ++tileSeq, suit, rank, red, eng: null, seal: null, ed: null }; }
function key(t) { return t.suit + t.rank; }
function isHonor(t) { return t.suit === 'z'; }
function isWind(t) { return t.suit === 'z' && t.rank <= 4; }
function isDragon(t) { return t.suit === 'z' && t.rank >= 5; }
function isTerminal(t) { return t.suit !== 'z' && (t.rank === 1 || t.rank === 9); }
function idx(t) { return SUITS.indexOf(t.suit) * 9 + t.rank - 1; }
function tileFromIdx(i) { return { id: 0, suit: SUITS[Math.floor(i / 9)], rank: i % 9 + 1, red: false, eng: null, seal: null }; }
function tileName(t) { if (t && t.eng === 'stone') return 'Stone tile'; return isHonor(t) ? HONOR_EN[t.rank] + (t.rank <= 4 ? ' Wind' : ' Dragon') : `${t.red ? 'Red ' : ''}${t.rank} ${SUIT_EN[t.suit]}`; }
// ===================== DECKS & STAKES =====================
const DECKS = {
  standard: { name: 'Standard Wall', desc: '136 tiles: four of every tile, four Red Fives.' },
  red: { name: 'Vermilion Wall', desc: 'Every 5 is a Red Five: twelve of them.' },
  lean: { name: 'Lean Wall', desc: 'No Souzu. 100 tiles across two suits and honors, so hands come faster, but −1 Play every Blind. Sanshoku is impossible.' },
  monk: { name: "Monk's Wall", desc: 'No Honor tiles. 108 tiles and flushes come easily, but every blind target is ×2. Honor Yaku are impossible.' },
  gambler: { name: "Gambler's Wall", desc: '+1 Play and −1 Discard every Blind.' },
  merchant: { name: "Merchant's Wall", desc: `Start with ¥${CFG.startMoney + 16} and +1 consumable slot, but shop prices are +25%.` },
  abundant: { name: 'Abundant Wall', desc: '+2 hand size, −1 Play every Blind.' },
  // Balatro's Plasma, Erratic, Ghost, Magic, Anaglyph and Painted Decks.
  plasma: { name: 'Plasma Wall', desc: 'Chips and Mult are balanced (averaged) before they multiply, but every target is ×2.' },
  erratic: { name: 'Erratic Wall', desc: '136 tiles drawn at random: some tiles turn up more than four times, others not at all.' },
  ghost: { name: 'Ghost Wall', desc: 'Kami turn up in the shop far more often. Start with Izanami.' },
  magic: { name: 'Magic Wall', desc: 'Start with Spring (+1 consumable slot) and two Slips of Echoes.' },
  anaglyph: { name: 'Anaglyph Wall', desc: 'Gain a Double Tag after every Boss Blind you beat.' },
  painted: { name: 'Painted Wall', desc: '+2 hand size, but −1 Talisman slot.' },
};
const STAKES = {
  white: { name: 'White Stake', desc: 'The standard game.' },
  red: { name: 'Red Stake', desc: 'Small Blinds give no reward money.' },
  green: { name: 'Green Stake', desc: 'Everything in Red Stake, and every blind target is ×1.3.' },
  black: { name: 'Black Stake', desc: 'Everything in Green Stake, Talismans cost ¥2 more, and some shop Talismans are Eternal: they can never be sold.' },
  blue: { name: 'Blue Stake', desc: 'Everything in Black Stake, and −1 Discard every Blind.' },
  purple: { name: 'Purple Stake', desc: 'Everything in Blue Stake, and targets grow faster: +5% more for every Ante.' },
  orange: { name: 'Orange Stake', desc: 'Everything in Purple Stake, and some shop Talismans are Perishable: they stop working after 5 Blinds.' },
  gold: { name: 'Gold Stake', desc: 'Everything in Orange Stake, and some shop Talismans are Rentals: ¥1 to buy, but ¥3 at the end of every Blind.' },
};
// Talisman stickers from the higher Stakes, like Balatro's.
const STICKERS = {
  eternal: { name: 'Eternal', desc: 'Can never be sold.' },
  perish: { name: 'Perishable', desc: 'Stops working after 5 Blinds.' },
  rental: { name: 'Rental', desc: 'Costs ¥3 at the end of every Blind.' },
};
function buildDeck(deckKey = 'standard') {
  if (deckKey === 'erratic') { const d = []; for (let i = 0; i < 136; i++) { const n = Math.floor(rand() * 34), t = mkTile(SUITS[Math.floor(n / 9)], n % 9 + 1); if (t.suit !== 'z' && t.rank === 5 && rand() < .25) t.red = true; d.push(t); } return d; }
  const d = []; const suits = deckKey === 'lean' ? ['m', 'p'] : ['m', 'p', 's'];
  for (const s of suits) for (let r = 1; r <= 9; r++) for (let c = 0; c < 4; c++) {
    const red = r === 5 && (deckKey === 'red' || c === 0 || (s === 'p' && c === 1));
    d.push(mkTile(s, r, red));
  }
  if (deckKey !== 'monk') for (let r = 1; r <= 7; r++) for (let c = 0; c < 4; c++) d.push(mkTile('z', r));
  return d;
}
function sortTiles(arr) {
  return arr.slice().sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank || (b.red ? 1 : 0) - (a.red ? 1 : 0));
}
function nextDora(i) {
  if (i < 27) { const s = Math.floor(i / 9), r = i % 9; return s * 9 + ((r + 1) % 9); }
  if (i < 31) return 27 + ((i - 27 + 1) % 4);
  return 31 + ((i - 31 + 1) % 3);
}
// Run RNG: seeded (mulberry32, state kept in S so saves replay) or Math.random when no run is active.
function rand() { if (typeof S === 'undefined' || !S || S.rngState === undefined) return Math.random(); let t = (S.rngState = (S.rngState + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function hashSeed(str) { let h = 2166136261 >>> 0; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function randomSeed() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 7; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(rand() * a.length)]; }

// ===================== ENGRAVINGS =====================
const ENG = {
  gold: { name: 'Gold Foil', short: 'G', desc: 'Earn ¥1 whenever this tile scores.' },
  obsidian: { name: 'Obsidian Inlay', short: 'O', desc: '+20 Chips when this tile scores.' },
  dragonmark: { name: 'Dragon Mark', short: 'D', desc: '+1 Han when this tile scores.' },
  jade: { name: 'Jade Inlay', short: 'J', desc: 'x1.5 Mult when this tile scores.' },
  glass: { name: 'Glass', short: 'Gl', desc: 'x2 Mult when this tile scores, but a 1 in 4 chance it shatters and leaves your Wall.' },
  steel: { name: 'Steel Inlay', short: 'St', desc: 'x1.5 Mult on every play while this tile stays in your hand (it scores nothing when played).' },
  // Balatro's Wild, Lucky, Mult and Stone cards.
  wild: { name: 'Wild Inlay', short: 'W', desc: 'Counts as any suit (Characters, Dots or Bamboo) when you play it. Hints ignore this.' },
  lucky: { name: 'Lucky Inlay', short: 'L', desc: '1 in 5 chance of +20 Mult and 1 in 15 chance of ¥20 each time this tile scores.' },
  mult: { name: 'Crimson Inlay', short: 'M', desc: '+4 Mult when this tile scores.' },
  stone: { name: 'Stone', short: 'Sn', desc: '+50 Chips when it scores. It has no rank or suit, never forms a meld, and can join any play.' },
};
// Tile editions, like Balatro's editions on playing cards. They stack with an engraving and a Seal.
const TILE_EDS = {
  foil: { name: 'Foil', desc: '+50 Chips when this tile scores.' },
  holo: { name: 'Holographic', desc: '+10 Mult when this tile scores.' },
  poly: { name: 'Polychrome', desc: 'x1.5 Mult when this tile scores.' },
};
const isStone = t => t && t.eng === 'stone';
// A Wild tile's suit is chosen when it is played: every suit assignment of the Wild tiles is tried (at most 4 Wilds).
function wildVariants(tiles) {
  const wi = tiles.map((t, i) => t.eng === 'wild' && t.suit !== 'z' ? i : -1).filter(i => i >= 0).slice(0, 4);
  if (!wi.length) return [tiles];
  const out = []; const n = Math.pow(3, wi.length);
  for (let m = 0; m < n; m++) { const v = tiles.map(t => t); let x = m; for (const i of wi) { v[i] = Object.assign({}, tiles[i], { suit: ['m', 'p', 's'][x % 3] }); x = Math.floor(x / 3); } out.push(v); }
  return out;
}
// Seals sit beside an engraving, like Balatro's Seals beside an Enhancement, so a tile can carry one of each.
const SEALS = {
  red: { name: 'Red Seal', desc: 'This tile scores twice.' },
  gold: { name: 'Gold Seal', desc: 'Earn ¥3 whenever this tile scores.' },
  blue: { name: 'Blue Seal', desc: 'If this tile is still in your hand when you win a Blind, the Scroll for your final play levels up by 1.' },
  purple: { name: 'Purple Seal', desc: 'When you discard this tile, gain a random Omikuji if you have a free consumable slot.' },
};
// Older saves engraved Red Seals; they now live in the seal slot.
function normTile(t) { if (t && t.eng === 'redseal') { t.eng = null; t.seal = 'red'; } if (t && t.seal === undefined) t.seal = null; return t; }
// Talisman editions (Balatro's Foil / Holographic / Polychrome). Rolled in the shop; price added to the Talisman's cost.
const EDITIONS = {
  foil: { name: 'Foil', chips: 50, price: 2, odds: 0.10, desc: '+50 Chips' },
  holo: { name: 'Holographic', han: 1, price: 3, odds: 0.06, desc: '+1 Han' },
  poly: { name: 'Polychrome', xmult: 1.5, price: 5, odds: 0.03, desc: 'x1.5 Mult' },
  neg: { name: 'Negative', slots: 1, price: 4, odds: 0.02, desc: '+1 Talisman slot' },
};
function rollEdition(mult = 1) { const r = rand(); let acc = 0; for (const [k, e] of Object.entries(EDITIONS)) { acc += e.odds * mult; if (r < acc) return k; } return null; }

// ===================== BOSSES =====================
const BOSSES = {
  purist: { name: 'The Purist', desc: 'Terminals (1s and 9s) and Honor tiles are dealt face down. They are only revealed when played or discarded. Sorting still puts them in their place, and the helper only counts visible tiles.' },
  typhoon: { name: 'The Typhoon', desc: 'Wind tiles score 0 Chips and all Wind-based Yaku are disabled.' },
  wallbuilder: { name: 'The Wall-Builder', desc: 'Only plays of two or more melds score. Smaller partial plays deal 0 damage.' },
  loanshark: { name: 'The Loan Shark', desc: 'Every Discard costs ¥1, however many tiles you throw. At ¥0, discards are locked.' },
  fisherman: { name: 'The Fisherman', desc: 'Tiles in the River cannot be Called.' },
  censor: { name: 'The Censor', desc: 'Red Fives score 0 Chips and give no Han.' },
  gatekeeper: { name: 'The Gatekeeper', desc: 'Your first Play of the Blind scores 0.' },
  collector: { name: 'The Collector', desc: 'One suit, chosen when the Blind starts, scores 0 Chips.' },
  miser: { name: 'The Miser', desc: 'Hand size −3.', minAnte: 2 },
  monk: { name: 'The Monk', desc: 'Discards may throw at most 3 tiles.' },
  // Balatro's later Bosses. minAnte keeps the harsh ones out of the early game.
  needle: { name: 'The Needle', desc: 'You get only 1 Play this Blind.', minAnte: 2 },
  drought: { name: 'The Drought', desc: 'You start this Blind with 0 Discards.', minAnte: 2 },
  mountain: { name: 'The Mountain', desc: 'The target score is doubled.', minAnte: 2, target: 2 },
  flint: { name: 'The Flint', desc: 'The base Chips and Han of every play are halved.', minAnte: 2 },
  toll: { name: 'The Toll', desc: 'Lose ¥1 for every tile you play.' },
  eye: { name: 'The Eye', desc: 'No play type can be repeated this Blind.', minAnte: 3 },
  mouth: { name: 'The Mouth', desc: 'Only one play type is allowed this Blind: the first one you play.', minAnte: 2 },
  pickpocket: { name: 'The Pickpocket', desc: 'After every Play, 2 random tiles from your hand go to the River.' },
  ascetic: { name: 'The Ascetic', desc: 'Every Play must use at least 5 tiles.' },
  ox: { name: 'The Ox', desc: 'Playing your most-played play type sets your money to ¥0.', minAnte: 6 },
  house: { name: 'The House', desc: 'Your first hand of the Blind is dealt face down.', minAnte: 2 },
  wheel: { name: 'The Wheel', desc: '1 in 7 tiles are drawn face down.', minAnte: 2 },
  mark: { name: 'The Mark', desc: 'Honor tiles are dealt face down.' },
  pillar: { name: 'The Pillar', desc: 'Tiles you already played this Ante score nothing.' },
  plant: { name: 'The Plant', desc: 'Honor tiles score nothing: 0 Chips and no Han.', minAnte: 4 },
  // Showdown Bosses guard Ante 8 (and every 8th Ante in Endless), like Balatro's finishers.
  violet: { name: 'The Violet Dragon', desc: 'A huge Blind: the target score is tripled.', showdown: true, target: 3 },
  crimson: { name: 'The Crimson Oni', desc: 'One random Talisman is disabled, and a different one after every Play.', showdown: true },
  verdant: { name: 'The Verdant Leaf', desc: 'Every tile scores 0 Chips until you sell a Talisman.', showdown: true },
  golden: { name: 'The Golden Dragon', desc: 'Only Complete Hands score. Partial plays deal 0.', showdown: true },
};
// Bosses that can turn up at an Ante: Showdown Bosses on every 8th Ante, the rest once they reach their minimum Ante.
function bossPool(ante) { const show = ante % CFG.antes === 0; return Object.keys(BOSSES).filter(k => show ? BOSSES[k].showdown : !BOSSES[k].showdown && (BOSSES[k].minAnte || 1) <= ante); }
function rollBoss(ante, avoid = []) { const pool = bossPool(ante), fresh = pool.filter(k => !avoid.includes(k)); return pick(fresh.length ? fresh : pool); }
const bossTarget = k => (k && BOSSES[k] && BOSSES[k].target) || 1;
// Talismans switched off right now: one The Crimson Oni silences, or a Perishable one that has run out.
function talOff(S) { const off = []; if (S.crimsonOff) off.push(S.crimsonOff); for (const [k, st] of Object.entries(S.stickers || {})) if (st && st.perish === 0) off.push(k); return off; }
function liveTals(S) { const off = talOff(S); return off.length ? S.talismans.filter(k => !off.includes(k)) : S.talismans; }

// ===================== TALISMANS (Jokers) =====================
const TALISMANS = [
  { key: 'kappa', name: 'Kappa', cost: 6, desc: 'Furiten no longer halves your score. Instead, +100 Chips for each copy of the winning tile sitting in your River.' },
  { key: 'kitsune', name: 'Kitsune', cost: 6, desc: '+8 Mult on every Complete Hand.', onScore: c => c.kind === 'hand' ? { mult: 8 } : null },
  { key: 'tanuki', name: 'Tanuki', cost: 4, desc: '+30 Chips on every play.', onScore: () => ({ chips: 30 }) },
  { key: 'maneki', name: 'Maneki-neko', cost: 5, desc: 'Earn ¥3 extra when a Blind is defeated.', onBlindEnd: () => 3 },
  { key: 'tengu', name: 'Tengu', cost: 6, desc: '+4 Mult for every Chi in the play, complete hands included.', onScore: c => c.nChi ? { mult: 4 * c.nChi } : null },
  { key: 'oni', name: 'Oni', cost: 6, desc: 'x1.5 Mult if the play contains a Pon or Kan, complete hands included.', onScore: c => (c.nPon || c.nKan) ? { xmult: 1.5 } : null },
  { key: 'hitotsume', name: 'Hitotsume-kozō', cost: 4, desc: 'Lone Tile plays gain +40 Chips and +1 Han.', onScore: c => c.kind === 'meld' && c.meldType === 'single' ? { chips: 40, han: 1 } : null },
  { key: 'daruma', name: 'Daruma', cost: 5, desc: '+4 Chips for every tile in the River when you score.', onScore: (c, S) => S.river.length ? { chips: 4 * S.river.length } : null },
  { key: 'tsuru', name: 'Tsuru', cost: 5, desc: 'Honor tiles give +10 Chips.', onTile: t => isHonor(t) ? { chips: 10 } : null },
  { key: 'koi', name: 'Koi', cost: 6, desc: 'Red Fives grant +2 Han instead of +1.' },
  { key: 'ryu', name: 'Ryū', cost: 7, desc: 'x2 Mult if the play contains a Dragon triplet or quad.', onScore: c => c.hasDragonSet ? { xmult: 2 } : null },
  { key: 'jizo', name: 'Jizō', cost: 5, desc: '+1 Discard each Blind.', discards: 1 },
  { key: 'komainu', name: 'Komainu', cost: 7, desc: '+1 Play each Blind.', plays: 1 },
  { key: 'yukionna', name: 'Yuki-onna', cost: 5, desc: 'Terminal tiles (1s and 9s) give +15 Chips.', onTile: t => isTerminal(t) ? { chips: 15 } : null },
  { key: 'baku', name: 'Baku', cost: 6, desc: 'Open melds no longer reduce Yaku Han. Closed-only Yaku still need a closed hand.' },
  { key: 'nue', name: 'Nue', cost: 6, desc: 'x1.5 Mult on a Complete Hand that is Honitsu or Chinitsu.', onScore: c => c.yaku.some(y => y.key === 'honitsu' || y.key === 'chinitsu') ? { xmult: 1.5 } : null },
  { key: 'kodama', name: 'Kodama', cost: 4, desc: '+15 Chips per open meld on a Complete Hand.', onScore: (c, S) => c.kind === 'hand' && S.open.length ? { chips: 15 * S.open.length } : null },
  { key: 'hannya', name: 'Hannya', cost: 8, desc: 'x3 Mult on every play, but -1 Play each Blind.', onScore: () => ({ xmult: 3 }), plays: -1 },
  { key: 'tsukumogami', name: 'Tsukumogami', cost: 5, desc: '+1 Chip for every tile left in the Wall when you score.', onScore: (c, S) => ({ chips: S.wall.length }) },
  { key: 'nurikabe', name: 'Nurikabe', cost: 5, desc: '+50 Chips if the play contains no Red Fives.', onScore: c => c.redCount === 0 ? { chips: 50 } : null },
  { key: 'tengoku', name: 'Amanojaku', cost: 6, desc: '+10 Mult on Complete Hands that use open melds. Closed ones gain nothing.', onScore: (c, S) => c.kind === 'hand' && S.open.length ? { mult: 10 } : null },
  // --- Retriggers: a tile scores again (its chips, Red Five Han, Dora and engravings all repeat)
  { key: 'nekomata', name: 'Nekomata', cost: 6, desc: 'Red Fives score a second time.', retrigger: t => t.red ? 1 : 0 },
  { key: 'shikigami', name: 'Shikigami', cost: 5, desc: 'The leftmost tile of every play scores a second time. Drag tiles to choose which.', retrigger: (t, c, S, i) => i === 0 ? 1 : 0 },
  { key: 'kirin', name: 'Kirin', cost: 6, desc: 'Honor tiles score a second time.', retrigger: t => isHonor(t) ? 1 : 0 },
  { key: 'hakutaku', name: 'Hakutaku', cost: 6, desc: 'Engraved tiles score a second time.', retrigger: t => t.eng ? 1 : 0 },
  { key: 'yatagarasu', name: 'Yatagarasu', cost: 7, desc: 'Tiles you Called from the River score three times.', retrigger: (t, c, S) => S.open.some(m => m.calledId === t.id) ? 2 : 0 },
  // --- Scaling and xMult
  { key: 'gashadokuro', name: 'Gashadokuro', cost: 8, desc: 'Gains x0.25 Mult for every Complete Hand you play while you own it.', onScore: (c, S) => { const n = S.talState.gashadokuro || 0; return n ? { xmult: 1 + 0.25 * n } : null; }, afterScore: (c, S) => { if (c.kind === 'hand') S.talState.gashadokuro = (S.talState.gashadokuro || 0) + 1; }, status: S => `now x${1 + 0.25 * (S.talState.gashadokuro || 0)}` },
  { key: 'jorogumo', name: 'Jorōgumo', cost: 5, desc: 'Gains +20 Chips every time you Call from the River.', onScore: (c, S) => { const n = S.talState.jorogumo || 0; return n ? { chips: n } : null; }, onCall: S => { S.talState.jorogumo = (S.talState.jorogumo || 0) + 20; }, status: S => `now +${S.talState.jorogumo || 0} Chips` },
  { key: 'rokurokubi', name: 'Rokurokubi', cost: 7, desc: 'x1.5 Mult for each open meld when you play a Complete Hand.', onScore: (c, S) => c.kind === 'hand' && S.open.length ? { xmult: Math.pow(1.5, S.open.length) } : null },
  { key: 'ushioni', name: 'Ushi-oni', cost: 7, desc: 'x2 Mult on the last Play of each Blind.', onScore: (c, S) => S.plays === 1 ? { xmult: 2 } : null },
  { key: 'nurarihyon', name: 'Nurarihyon', cost: 6, desc: 'x1.5 Mult if the play contains no Honor tiles.', onScore: c => c.tiles.some(isHonor) ? null : { xmult: 1.5 } },
  { key: 'zashiki', name: 'Zashiki-warashi', cost: 4, desc: 'Earn ¥1 every time a Red Five scores.', onScore: c => c.redCount ? { money: c.redCount } : null },
  // --- Flat Mult, scaling
  { key: 'kasaobake', name: 'Kasa-obake', cost: 5, desc: 'Gains +2 Mult for every Blind you defeat.', onBlindEnd: S => { S.talState.kasaobake = (S.talState.kasaobake || 0) + 2; return 0; }, onScore: (c, S) => S.talState.kasaobake ? { mult: S.talState.kasaobake } : null, status: S => `now +${S.talState.kasaobake || 0} Mult` },
  { key: 'ittanmomen', name: 'Ittan-momen', cost: 4, desc: '+12 Mult on every play, but −30 Chips.', onScore: c => ({ mult: 12, chips: -30 }) },
  // --- Streaks and scaling (Balatro's Ride the Bus family)
  { key: 'nopperabo', name: 'Nopperabō', cost: 5, desc: 'Gains +1 Mult per consecutive play with no Honor tiles. Scoring an Honor resets it.', onScore: (c, S) => S.talState.nopperabo ? { mult: S.talState.nopperabo } : null, afterScore: (c, S) => { S.talState.nopperabo = c.tiles.some(isHonor) ? 0 : (S.talState.nopperabo || 0) + 1; }, status: S => `now +${S.talState.nopperabo || 0} Mult` },
  { key: 'sekito', name: 'Sekitō', cost: 7, desc: 'Gains x0.2 Mult per consecutive play that is not your most-played rung. Playing it resets this.', onScore: (c, S) => S.talState.sekito ? { xmult: 1 + 0.2 * S.talState.sekito } : null, afterScore: (c, S) => { const r = S.stats.rungs || {}; let best = null, n = 0; for (const [k, v] of Object.entries(r)) if (v > n) { n = v; best = k; } S.talState.sekito = (best && c.meldType === best) ? 0 : (S.talState.sekito || 0) + 1; }, status: S => `now x${(1 + 0.2 * (S.talState.sekito || 0)).toFixed(1)}` },
  { key: 'aobozu', name: 'Aobōzu', cost: 5, desc: '+1 Mult per play, −1 Mult per Discard (never below 0).', onScore: (c, S) => S.talState.aobozu ? { mult: S.talState.aobozu } : null, afterScore: (c, S) => { S.talState.aobozu = (S.talState.aobozu || 0) + 1; }, onDiscard: S => { S.talState.aobozu = Math.max(0, (S.talState.aobozu || 0) - 1); }, status: S => `now +${S.talState.aobozu || 0} Mult` },
  { key: 'shiro', name: 'Shiro', cost: 5, desc: 'Each Blind picks a suit. Gains +3 Chips for every tile of that suit you discard.', onBlindStart: S => { S.talState.shiroSuit = pick(['m', 'p', 's']); }, onDiscard: (S, tiles) => { S.talState.shiro = (S.talState.shiro || 0) + 3 * tiles.filter(t => t.suit === S.talState.shiroSuit).length; }, onScore: (c, S) => S.talState.shiro ? { chips: S.talState.shiro } : null, status: S => `${S.talState.shiroSuit ? SUIT_EN[S.talState.shiroSuit] + ' this Blind, ' : ''}now +${S.talState.shiro || 0} Chips` },
  { key: 'takibi', name: 'Takibi', cost: 6, desc: 'Gains x0.25 Mult every time you sell a Talisman.', onSell: S => { S.talState.takibi = (S.talState.takibi || 0) + 1; }, onScore: (c, S) => S.talState.takibi ? { xmult: 1 + 0.25 * S.talState.takibi } : null, status: S => `now x${(1 + 0.25 * (S.talState.takibi || 0)).toFixed(2)}` },
  { key: 'hoshizora', name: 'Hoshizora', cost: 6, desc: 'Gains x0.1 Mult every time you use a Scroll of Mastery.', onScroll: S => { S.talState.hoshizora = (S.talState.hoshizora || 0) + 1; }, onScore: (c, S) => S.talState.hoshizora ? { xmult: 1 + 0.1 * S.talState.hoshizora } : null, status: S => `now x${(1 + 0.1 * (S.talState.hoshizora || 0)).toFixed(1)}` },
  { key: 'mabo', name: 'Mabo', cost: 6, desc: 'Gains x0.25 Mult every time a tile is added to your Wall.', onTileAdded: (S, n) => { S.talState.mabo = (S.talState.mabo || 0) + n; }, onScore: (c, S) => S.talState.mabo ? { xmult: 1 + 0.25 * S.talState.mabo } : null, status: S => `now x${(1 + 0.25 * (S.talState.mabo || 0)).toFixed(2)}` },
  { key: 'chochin', name: 'Chōchin', cost: 6, desc: 'x4 Mult on every sixth play.', onScore: (c, S) => (((S.talState.chochin || 0) + 1) % 6 === 0) ? { xmult: 4 } : null, afterScore: (c, S) => { S.talState.chochin = (S.talState.chochin || 0) + 1; }, status: S => { const left = 6 - (((S.talState.chochin || 0)) % 6); return left === 6 ? 'fires in 6 plays' : left === 1 ? 'fires next play' : `fires in ${left} plays`; } },
  // --- Run-info powers
  { key: 'hoshi', name: 'Hoshi', cost: 6, desc: '+1 Mult for every time this play type has been played this run.', onScore: (c, S) => { const n = (S.stats.rungs || {})[c.meldType] || 0; return n ? { mult: n } : null; }, status: S => { const top = Object.entries(S.stats.rungs || {}).sort((a, b) => b[1] - a[1]).slice(0, 2); return top.length ? 'now ' + top.map(([k, v]) => `+${v} on ${rungLabel(k)}`).join(', ') : 'now +0, nothing played yet'; } },
  { key: 'hatsumode', name: 'Hatsumōde', cost: 5, desc: '+15 Mult for each Yaku scoring for the first time this run.', onScore: (c, S) => { const n = c.yaku.filter(y => !(S.stats.yaku || {})[y.key]).length; return n ? { mult: 15 * n } : null; }, status: S => { const left = YAKU_SHEET.filter(y => !(S.stats.yaku || {})[y.k]).length; return `${left} of ${YAKU_SHEET.length} Yaku not scored yet`; } },
  { key: 'oshi', name: 'Oshi', cost: 6, desc: 'x1.5 Mult if the play contains your most-scored Yaku.', onScore: (c, S) => { let best = null, n = 0; for (const [k, v] of Object.entries(S.stats.yaku || {})) if (v > n) { n = v; best = k; } return best && c.yaku.some(y => y.key === best) ? { xmult: 1.5 } : null; }, status: S => { const t = topEntry(S.stats.yaku); if (!t) return 'no Yaku scored yet'; const y = YAKU_SHEET.find(x => x.k === t[0]); return `fires on ${y ? y.n : t[0]} (scored ×${t[1]})`; } },
  // --- Held in hand
  { key: 'daimyo', name: 'Daimyō', cost: 7, desc: 'x1.5 Mult for each Red Five left in your hand after the play.', onScore: c => { const n = c.held.filter(t => t.red).length; return n ? { xmult: Math.pow(1.5, n) } : null; } },
  // --- Rule breakers
  { key: 'hashi', name: 'Hashi', cost: 7, desc: 'A Chi may skip one rank: any three of four consecutive tiles count as a sequence (2-3-5 or 2-4-5).' },
  // --- Copiers (Balatro's Blueprint and Brainstorm)
  { key: 'utsushi', name: 'Utsushi', cost: 8, desc: 'Copies the ability of the Talisman to its right.', copies: 'right' },
  { key: 'kagami', name: 'Kagami', cost: 8, desc: 'Copies the ability of your leftmost Talisman.', copies: 'left' },
  // --- River play
  { key: 'nureonna', name: 'Nure-onna', cost: 6, desc: '+1 Mult for every tile in the River when you score (max +20).', onScore: (c, S) => S.river.length ? { mult: Math.min(20, S.river.length) } : null },
  { key: 'ryujin', name: 'Ryūjin', cost: 8, desc: 'Your first 2 Calls each Blind cost no Play.', freeCall: 2, status: S => { const n = Math.max(0, 2 - (S.freeCallsUsed || 0)); return S.phase === 'blind' ? `${n} free Call${n === 1 ? '' : 's'} left this Blind` : '2 free Calls each Blind'; } },
  { key: 'kawauso', name: 'Kawauso', cost: 7, desc: 'You may claim 1 River tile as the winning tile of a complete hand: select it with the rest of the hand and press Play. Claimed hands are always in Furiten.', riverClaim: true },
  { key: 'namazu', name: 'Namazu', cost: 5, desc: 'Tiles you Called from the River give +30 Chips.', onTile: (t, S) => S.open.some(m => m.calledId === t.id) ? { chips: 30 } : null },
  { key: 'funayurei', name: 'Funayūrei', cost: 5, desc: 'Each Blind begins with 3 tiles from the Wall already in the River.', onBlindStart: S => { for (let i = 0; i < 3 && S.wall.length; i++) S.river.push(S.wall.pop()); } },
  { key: 'sazaeoni', name: 'Sazae-oni', cost: 6, desc: 'Each Call stores +3 Mult for your next Complete Hand.', onCall: S => { S.talState.sazaeoni = (S.talState.sazaeoni || 0) + 1; }, onScore: (c, S) => c.kind === 'hand' && S.talState.sazaeoni ? { mult: 3 * S.talState.sazaeoni } : null, afterScore: (c, S) => { if (c.kind === 'hand') S.talState.sazaeoni = 0; }, status: S => `stored +${3 * (S.talState.sazaeoni || 0)} Mult` },
  { key: 'amabie', name: 'Amabie', cost: 4, desc: 'Earn ¥1 whenever you discard 5 or more tiles at once.', onDiscard: (S, tiles) => { if (tiles.length >= 5) S.money += 1; } },
  { key: 'mizuchi', name: 'Mizuchi', cost: 6, desc: 'x1.5 Mult while your River holds fewer than 8 tiles.', onScore: (c, S) => S.river.length < 8 ? { xmult: 1.5 } : null },
  // --- Broad retriggers (Balatro's Dusk, Seltzer and Hack)
  { key: 'omagatoki', name: 'Ōmagatoki', cost: 7, desc: 'Every tile scores a second time on the last Play of each Blind.', retrigger: (t, c, S) => S.plays === 1 ? 1 : 0, status: S => S.phase === 'blind' ? (S.plays === 1 ? 'active now: last Play' : `active on the last Play, ${S.plays} Plays left`) : '' },
  { key: 'shojo', name: 'Shōjō', cost: 6, desc: 'Every tile scores a second time for your next 8 plays, then it is used up and leaves your board.', retrigger: () => 1,
    afterScore: (c, S) => { const n = (S.talState.shojo ?? 8) - 1; S.talState.shojo = n; if (n <= 0) { S.talismans = S.talismans.filter(x => x !== 'shojo'); delete S.editions.shojo; if (S.stickers) delete S.stickers.shojo; delete S.talState.shojo; S.spent = (S.spent || []).concat('shojo'); } },
    status: S => { const n = S.talState.shojo ?? 8; return `${n} play${n === 1 ? '' : 's'} left`; } },
  { key: 'azukiarai', name: 'Azukiarai', cost: 6, desc: 'Every 2, 3 and 4 tile scores a second time.', retrigger: t => !isHonor(t) && t.rank >= 2 && t.rank <= 4 ? 1 : 0 },
  // --- Money (Balatro's Rocket, Delayed Gratification, Cloud 9 and Satellite, plus a Mahjong one)
  { key: 'takarabune', name: 'Takarabune', cost: 5, desc: 'Earn ¥1 at the end of each Blind. Pays ¥1 more every time you defeat a Boss.',
    onBlindEnd: S => { const v = 1 + (S.talState.takarabune || 0); if (S.blindIndex === 2) S.talState.takarabune = (S.talState.takarabune || 0) + 1; return v; },
    status: S => `pays ¥${1 + (S.talState.takarabune || 0)} now` },
  { key: 'binbogami', name: 'Binbōgami', cost: 6, desc: 'If you used no Discards this Blind, earn ¥2 for each Discard left.',
    onBlindEnd: S => (S.discardsUsed || 0) === 0 ? 2 * Math.max(0, S.discards) : 0, status: S => S.phase === 'blind' ? (S.discardsUsed ? 'no payout this Blind' : `¥${2 * S.discards} if you keep it up`) : '' },
  { key: 'fukusuke', name: 'Fukusuke', cost: 5, desc: 'Earn ¥1 at the end of each Blind for every three 8 tiles in your Wall.',
    onBlindEnd: S => Math.floor(allTiles(S).filter(t => t.suit !== 'z' && t.rank === 8).length / 3), status: S => `pays ¥${Math.floor(allTiles(S).filter(t => t.suit !== 'z' && t.rank === 8).length / 3)} now` },
  { key: 'ebisu', name: 'Ebisu', cost: 6, desc: 'Earn ¥1 at the end of each Blind for each different Scroll of Mastery you have used this run.',
    onBlindEnd: S => scrollKinds(S), status: S => `pays ¥${scrollKinds(S)} now` },
  { key: 'kamaitachi', name: 'Kamaitachi', cost: 6, desc: 'Earn ¥5 if you clear the Blind with your first Play.', onBlindEnd: S => S.playsMade === 1 ? 5 : 0 },
  // --- Makers and growers (Balatro's Cartomancer, Riff-raff, Egg, Gift Card, Ceremonial Dagger, Space Joker and Seance).
  // Hooks that need the game's own helpers check for them first, so the simulator can load this file on its own.
  { key: 'miko', name: 'Miko', cost: 5, desc: 'When a Blind starts, create a random Omikuji if you have a free consumable slot.',
    onBlindStart: S => { if (typeof conSlots === 'function' && S.consumables && S.consumables.length < conSlots()) S.consumables.push({ kind: 'omikuji', key: pick(OMIKUJI).key }); } },
  { key: 'hyakki', name: 'Hyakki Yagyō', cost: 6, desc: 'When a Blind starts, create up to 2 Common Talismans if you have room.',
    onBlindStart: S => { if (typeof talPool !== 'function') return; for (let n = 0; n < 2 && S.talismans.length < talSlots(); n++) { const pool = talPool().filter(t => talRarity(t.key) === 'common'); if (!pool.length) break; gainTalisman(pick(pool).key); } } },
  { key: 'tsuchinoko', name: 'Tsuchinoko', cost: 4, desc: 'Gains ¥3 of sell value at the end of every Blind.',
    onBlindEnd: S => { S.sellBonus = S.sellBonus || {}; S.sellBonus.tsuchinoko = (S.sellBonus.tsuchinoko || 0) + 3; return 0; }, status: S => `sells for ¥${typeof talSellValue === 'function' ? talSellValue('tsuchinoko') : '?'}` },
  { key: 'otoshidama', name: 'Otoshidama', cost: 6, desc: 'At the end of every Blind, every Talisman and consumable you hold gains ¥1 of sell value.',
    onBlindEnd: S => { S.sellBonus = S.sellBonus || {}; for (const k of S.talismans) S.sellBonus[k] = (S.sellBonus[k] || 0) + 1; for (const c of S.consumables || []) c.bonus = (c.bonus || 0) + 1; return 0; } },
  { key: 'kamikiri', name: 'Kamikiri', cost: 6, desc: 'When a Blind starts, destroys the Talisman to its right (unless Eternal) and permanently gains +Mult equal to twice its sell value.',
    onBlindStart: S => { if (typeof destroyTalisman !== 'function') return; const right = S.talismans[S.talismans.indexOf('kamikiri') + 1]; if (!right) return; const v = talSellValue(right); if (destroyTalisman(right)) S.talState.kamikiri = (S.talState.kamikiri || 0) + 2 * v; },
    onScore: (c, S) => S.talState.kamikiri ? { mult: S.talState.kamikiri } : null, status: S => `+${S.talState.kamikiri || 0} Mult` },
  { key: 'kotodama', name: 'Kotodama', cost: 6, desc: '1 in 4 chance to level up the Scroll for the play type you score.',
    afterScore: (c, S) => { if (rand() >= chance(S, 0.25)) return; const k = c.kind === 'hand' ? 'hand' : c.nKan ? 'kan' : c.nPon ? 'pon' : c.nChi ? 'chi' : 'pair'; S.scrolls.meld[k] = (S.scrolls.meld[k] || 0) + 1; if (typeof toast === 'function') toast(`<div class="label">Kotodama</div><b>${SCR['m:' + k].name}</b><div class="muted" style="font-size:11px">+1 level</div>`); } },
  { key: 'itako', name: 'Itako', cost: 7, desc: 'When you score a Complete Hand with 3 or more Yaku, create a random Kami if you have a free consumable slot.',
    afterScore: (c, S) => { if (c.kind !== 'hand' || c.yaku.length < 3 || typeof conSlots !== 'function' || S.consumables.length >= conSlots()) return; S.consumables.push({ kind: 'kami', key: pick(KAMI.filter(k => !k.soul)).key }); } },
  // --- Fading, chance, safety-net and sell-for-effect Talismans (Balatro's Ice Cream, Popcorn, Ramen, Oops! All 6s, Mr. Bones,
  // Luchador, Diet Cola, Invisible Joker and Showman).
  { key: 'kakigori', name: 'Kakigōri', cost: 5, desc: '+100 Chips on every play, but −5 Chips after each play. Melts away at 0.',
    onScore: (c, S) => ({ chips: S.talState.kakigori ?? 100 }), afterScore: (c, S) => { const n = (S.talState.kakigori ?? 100) - 5; S.talState.kakigori = n; if (n <= 0) fadeAway(S, 'kakigori'); }, status: S => `+${S.talState.kakigori ?? 100} Chips now` },
  { key: 'senbei', name: 'Senbei', cost: 5, desc: '+20 Mult on every play, −4 Mult at the end of every Blind. Crumbles at 0.',
    onScore: (c, S) => ({ mult: S.talState.senbei ?? 20 }), onBlindEnd: S => { const n = (S.talState.senbei ?? 20) - 4; S.talState.senbei = n; if (n <= 0) fadeAway(S, 'senbei'); return 0; }, status: S => `+${S.talState.senbei ?? 20} Mult now` },
  { key: 'ramen', name: 'Ramen', cost: 6, desc: 'x2 Mult, but loses x0.01 for every tile you discard. Gone at x1.',
    onScore: (c, S) => ({ xmult: +(2 - 0.01 * (S.talState.ramen || 0)).toFixed(2) }), onDiscard: (S, tiles) => { S.talState.ramen = (S.talState.ramen || 0) + tiles.length; if (S.talState.ramen >= 100) fadeAway(S, 'ramen'); }, status: S => `x${(2 - 0.01 * (S.talState.ramen || 0)).toFixed(2)} Mult now` },
  { key: 'daikoku', name: 'Daikoku', cost: 6, desc: 'Doubles every listed chance: Lucky Inlay, Glass shattering, The Wheel, Kotodama and Slip of Fortune.' },
  { key: 'yurei', name: 'Yūrei', cost: 5, desc: 'If you run out of Plays having scored at least 25% of the target, the Blind counts as won. Yūrei then vanishes.' },
  { key: 'rikishi', name: 'Rikishi', cost: 5, desc: 'Sell this during a Boss Blind to disable the Boss for the rest of the Blind.' },
  { key: 'ramune', name: 'Ramune', cost: 6, desc: 'Sell this to get a free Double Tag.' },
  { key: 'kakuremino', name: 'Kakuremino', cost: 8, desc: 'After 2 Blinds, sell this to create a copy of a random other Talisman (Negative editions are not copied).',
    onBlindEnd: S => { S.talState.kakuremino = (S.talState.kakuremino || 0) + 1; return 0; }, status: S => (S.talState.kakuremino || 0) >= 2 ? 'ready: sell to copy a Talisman' : `${2 - (S.talState.kakuremino || 0)} more Blind${(S.talState.kakuremino || 0) === 1 ? '' : 's'} to go` },
  { key: 'kabuki', name: 'Kabuki', cost: 5, desc: 'Talismans you already own can turn up again in shops and packs, so you can hold two copies.' },
  // --- Legendary (Balatro's Triboulet, Yorick, Chicot and Canio). Only Hitodama creates them.
  { key: 'orochi', name: 'Yamata-no-Orochi', cost: 10, rarity: 'legendary', desc: 'Every Honor tile that scores gives x1.5 Mult, counting each time it scores.',
    onScore: c => { const n = c.hits.filter(h => { const t = c.tiles.find(x => x.id === h.id); return t && isHonor(t); }).reduce((a, h) => a + h.times, 0); return n ? { xmult: +Math.pow(1.5, n).toFixed(3) } : null; } },
  { key: 'shuten', name: 'Shuten-dōji', cost: 10, rarity: 'legendary', desc: 'Gains x1 Mult for every 23 tiles you discard (starts at x1).',
    onDiscard: (S, tiles) => { S.talState.shuten = (S.talState.shuten || 0) + tiles.length; }, onScore: (c, S) => { const x = 1 + Math.floor((S.talState.shuten || 0) / 23); return x > 1 ? { xmult: x } : null; },
    status: S => { const n = S.talState.shuten || 0; return `x${1 + Math.floor(n / 23)} Mult, ${23 - n % 23} more to go` } },
  { key: 'tamamo', name: 'Tamamo-no-Mae', cost: 10, rarity: 'legendary', desc: 'Disables the effect of every Boss Blind.' },
  { key: 'hoo', name: 'Hō-ō', cost: 10, rarity: 'legendary', desc: 'Gains x1 Mult every time a tile is destroyed (starts at x1).',
    onScore: (c, S) => S.talState.hoo ? { xmult: 1 + S.talState.hoo } : null, status: S => `x${1 + (S.talState.hoo || 0)} Mult` },
];
const TAL = {}; TALISMANS.forEach(t => TAL[t.key] = t);
// A fading Talisman leaves your board when it runs out (Kakigōri, Senbei, Ramen), like Shōjō.
function fadeAway(S, k) { const own = S.talismans.filter(x => baseKey(x) === k)[0]; if (!own) return; S.talismans = S.talismans.filter(x => x !== own); delete S.editions[own]; if (S.stickers) delete S.stickers[own]; delete S.talState[k]; S.spent = (S.spent || []).concat(own); }
// Duplicate Talismans (Kabuki, Kakuremino): a second copy gets its own key, 'tanuki#2', that inherits everything from the original.
const baseKey = k => String(k).split('#')[0];
function talAlias(k) { const b = baseKey(k); if (!TAL[k] && TAL[b]) TAL[k] = Object.assign(Object.create(TAL[b]), { key: k }); return k; }
function newAlias(S, b) { let n = 2; while (S.talismans.includes(`${b}#${n}`)) n++; return talAlias(`${b}#${n}`); }
// Do you have this Talisman working right now (any copy)?
const hasTal = (S, b) => !!S && !!S.talismans && liveTals(S).some(k => baseKey(k) === b);
// Daikoku doubles every listed chance, like Balatro's Oops! All 6s.
const chance = (S, p) => Math.min(1, p * (hasTal(S, 'daikoku') ? 2 : 1));
// Rarity: set on the Talisman, or from its price (¥4–5 Common, ¥6 Uncommon, ¥7+ Rare).
const RARITIES = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };
function talRarity(k) { const t = TAL[k]; return t.rarity || (t.cost <= 5 ? 'common' : t.cost === 6 ? 'uncommon' : 'rare'); }
// One weighted pick from a pool, like Balatro: roll a rarity first, then a Talisman of that rarity (any rarity if none is left).
function pickTalisman(pool) {
  if (!pool.length) return null; const w = CFG.rarityWeights, r = rand();
  const want = (typeof S !== 'undefined' && S && S.dbgRarity) || (r < w.common ? 'common' : r < w.common + w.uncommon ? 'uncommon' : 'rare');   // Debug can force one rarity
  const tier = pool.filter(t => talRarity(t.key) === want); return pick(tier.length ? tier : pool);
}
// Every tile in the run, wherever it is right now.
function allTiles(S) { return [...(S.deck || []), ...(S.hand || []), ...(S.wall || []), ...(S.river || []), ...(S.played || []), ...(S.indicators || []), ...(S.open || []).flatMap(m => m.tiles)]; }
function scrollKinds(S) { return Object.values(S.scrolls.meld).filter(v => v > 0).length + Object.values(S.scrolls.yaku).filter(v => v > 0).length; }

// ===================== OMIKUJI (Tarot) & KAMI (Spectral) =====================
function convertTile(t, suit, rank) { t.suit = suit; t.rank = rank; if (!(suit !== 'z' && rank === 5)) t.red = false; }
const OMIKUJI = [
  { key: 'dup', name: 'Slip of Duplication', cost: 3, sel: [1, 1], desc: 'Create an exact copy of 1 selected tile. It joins your hand immediately, even if your hand is full (you simply draw nothing until you are back under the limit), and stays in your Wall for the rest of the run.',
    use: (S, sel) => { const t = sel[0]; const c = mkTile(t.suit, t.rank, t.red); c.eng = t.eng; S.hand.push(c); } },
  { key: 'ascend', name: 'Slip of Ascension', cost: 3, sel: [1, 2], desc: 'Raise the rank of up to 2 selected suited tiles by 1 (a 9 becomes a 1). Honors are unchanged.',
    use: (S, sel) => { for (const t of sel) if (!isHonor(t)) convertTile(t, t.suit, t.rank % 9 + 1); } },
  { key: 'descend', name: 'Slip of Descent', cost: 3, sel: [1, 2], desc: 'Lower the rank of up to 2 selected suited tiles by 1 (a 1 becomes a 9). Honors are unchanged.',
    use: (S, sel) => { for (const t of sel) if (!isHonor(t)) convertTile(t, t.suit, (t.rank + 7) % 9 + 1); } },
  { key: 'toman', name: 'Slip of Characters', cost: 3, sel: [1, 3], desc: 'Convert up to 3 selected tiles to Manzu, keeping their rank. Honors become the matching 1–7.',
    use: (S, sel) => { for (const t of sel) convertTile(t, 'm', t.rank); } },
  { key: 'topin', name: 'Slip of Dots', cost: 3, sel: [1, 3], desc: 'Convert up to 3 selected tiles to Pinzu, keeping their rank. Honors become the matching 1–7.',
    use: (S, sel) => { for (const t of sel) convertTile(t, 'p', t.rank); } },
  { key: 'tosou', name: 'Slip of Bamboo', cost: 3, sel: [1, 3], desc: 'Convert up to 3 selected tiles to Souzu, keeping their rank. Honors become the matching 1–7.',
    use: (S, sel) => { for (const t of sel) convertTile(t, 's', t.rank); } },
  { key: 'destroy', name: 'Slip of Dust', cost: 3, sel: [1, 2], desc: 'Destroy up to 2 selected tiles. They leave your Wall for the rest of the run.',
    use: (S, sel) => { S.hand = S.hand.filter(t => !sel.includes(t)); } },
  { key: 'dragon', name: 'Slip of the Dragon', cost: 3, sel: [1, 1], desc: 'Turn 1 selected tile into a Red Dragon.',
    use: (S, sel) => { convertTile(sel[0], 'z', 7); } },
  { key: 'redfive', name: 'Slip of Vermilion', cost: 3, sel: [1, 1], desc: 'Turn 1 selected tile into a Red Five of its suit. Honors become a Red 5 Pin.',
    use: (S, sel) => { const t = sel[0]; convertTile(t, isHonor(t) ? 'p' : t.suit, 5); t.red = true; } },
  { key: 'indicator', name: 'Slip of the Indicator', cost: 3, sel: [0, 0], blindOnly: true, desc: 'Flip the top Wall tile as a Dora indicator for this Blind. Every tile matching the next tile in sequence gains +1 Han when scored.',
    use: (S) => { if (!S.wall.length) return false; const t = S.wall.pop(); S.indicators.push(t); S.dora.push(nextDora(idx(t))); } },
  { key: 'wealth', name: 'Slip of Wealth', cost: 3, sel: [0, 0], anywhere: true, desc: 'Gain ¥5.', use: (S) => { S.money += 5; } },
  { key: 'gold', name: 'Slip of Gold Foil', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with Gold Foil: earn ¥1 whenever it scores.', use: (S, sel) => { sel[0].eng = 'gold'; } },
  { key: 'obsidian', name: 'Slip of Obsidian', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with Obsidian Inlay: +20 Chips whenever it scores.', use: (S, sel) => { sel[0].eng = 'obsidian'; } },
  { key: 'dragonmark', name: 'Slip of the Dragon Mark', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with a Dragon Mark: +1 Han whenever it scores.', use: (S, sel) => { sel[0].eng = 'dragonmark'; } },
  { key: 'jade', name: 'Slip of Jade', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with Jade Inlay: x1.5 Mult whenever it scores.', use: (S, sel) => { sel[0].eng = 'jade'; } },
  { key: 'redseal', name: 'Slip of the Red Seal', cost: 4, sel: [1, 1], desc: 'Put a Red Seal on 1 selected tile: it scores twice whenever it scores. Keeps any engraving.', use: (S, sel) => { sel[0].seal = 'red'; } },
  { key: 'glass', name: 'Slip of Glass', cost: 3, sel: [1, 2], desc: 'Turn up to 2 selected tiles into Glass: x2 Mult whenever they score, with a 1 in 4 chance each time of shattering for good.', use: (S, sel) => { for (const t of sel) t.eng = 'glass'; } },
  { key: 'steel', name: 'Slip of Steel', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with Steel Inlay: x1.5 Mult on every play while it stays in your hand. Keep it as a spare.', use: (S, sel) => { sel[0].eng = 'steel'; } },
  // Balatro's Lovers, Magician, Empress and Tower, then the Fool, Judgement, Emperor, High Priestess, Hermit, Temperance and Wheel of Fortune.
  { key: 'wild', name: 'Slip of the Wild', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected suited tile with a Wild Inlay: it counts as any suit when played.', use: (S, sel) => { if (isHonor(sel[0])) return false; sel[0].eng = 'wild'; } },
  { key: 'lucky', name: 'Slip of Luck', cost: 3, sel: [1, 2], desc: 'Engrave up to 2 selected tiles with a Lucky Inlay: 1 in 5 for +20 Mult and 1 in 15 for ¥20 each time they score.', use: (S, sel) => { for (const t of sel) t.eng = 'lucky'; } },
  { key: 'crimson', name: 'Slip of Fervour', cost: 3, sel: [1, 2], desc: 'Engrave up to 2 selected tiles with a Crimson Inlay: +4 Mult when they score.', use: (S, sel) => { for (const t of sel) t.eng = 'mult'; } },
  { key: 'stone', name: 'Slip of Stone', cost: 3, sel: [1, 1], desc: 'Turn 1 selected tile into Stone: +50 Chips when it scores, no rank or suit, and it can join any play.', use: (S, sel) => { sel[0].eng = 'stone'; sel[0].red = false; } },
  { key: 'echo', name: 'Slip of Echoes', cost: 3, sel: [0, 0], anywhere: true, desc: 'Create a copy of the last Omikuji or Kami you used (not Slip of Echoes).', use: S => { if (!S.lastCons || !CONS[S.lastCons]) return false; S.consumables.push({ kind: CONS[S.lastCons].kind, key: S.lastCons }); } },
  { key: 'judgement', name: 'Slip of Judgement', cost: 3, sel: [0, 0], anywhere: true, desc: 'Create a random Talisman. Needs a free Talisman slot.', use: S => { if (typeof talPool !== 'function' || S.talismans.length >= talSlots()) return false; const t = pickTalisman(talPool()); if (!t) return false; gainTalisman(t.key); } },
  { key: 'emperor', name: 'Slip of the Emperor', cost: 3, sel: [0, 0], anywhere: true, desc: 'Create up to 2 random Omikuji (room permitting, counting this slot).', use: S => { const room = (typeof conSlots === 'function' ? conSlots() : 2) - S.consumables.length + 1; for (let i = 0; i < Math.min(2, room); i++) S.consumables.push({ kind: 'omikuji', key: pick(OMIKUJI.filter(o => o.key !== 'emperor')).key }); } },
  { key: 'priestess', name: 'Slip of the Priestess', cost: 3, sel: [0, 0], anywhere: true, desc: '2 random Scrolls of Mastery level up by 1.', use: S => { for (const sc of shuffle(SCROLLS.slice()).slice(0, 2)) { const [t, k] = sc.key.split(':'); const b = S.scrolls[t === 'm' ? 'meld' : 'yaku']; b[k] = (b[k] || 0) + 1; } } },
  { key: 'hermit', name: 'Slip of the Hermit', cost: 3, sel: [0, 0], anywhere: true, desc: 'Double your money (at most +¥20).', use: S => { S.money += Math.min(20, S.money); } },
  { key: 'temperance', name: 'Slip of Temperance', cost: 3, sel: [0, 0], anywhere: true, desc: 'Gain the total sell value of your Talismans (at most ¥50).', use: S => { if (typeof talSellValue !== 'function') return false; S.money += Math.min(50, S.talismans.reduce((a, k) => a + talSellValue(k), 0)); } },
  { key: 'fortune', name: 'Slip of Fortune', cost: 3, sel: [0, 0], anywhere: true, desc: '1 in 4 chance: a random Talisman with no edition becomes Foil, Holographic or Polychrome.', use: S => { const pool = S.talismans.filter(k => !S.editions[k]); if (!pool.length) return false; if (rand() < chance(S, 0.25)) { const k = pick(pool); S.editions[k] = pick(['foil', 'holo', 'poly']); S.fortuneHit = k; } else S.fortuneHit = null; } },
];
const KAMI = [
  { key: 'susanoo', name: 'Susanoo', cost: 4, sel: [1, 5], desc: 'Destroy all selected tiles (up to 5). Complete Hands permanently gain +1 level (+10 Chips, +1 Han).',
    use: (S, sel) => { S.hand = S.hand.filter(t => !sel.includes(t)); S.scrolls.meld.hand = (S.scrolls.meld.hand || 0) + 1; } },
  { key: 'inari', name: 'Inari', cost: 4, sel: [2, 3], desc: 'Up to 3 selected tiles all become copies of the first selected tile (rank, suit, red, engraving).',
    use: (S, sel) => { const f = sel[0]; for (const t of sel.slice(1)) { t.suit = f.suit; t.rank = f.rank; t.red = f.red; t.eng = f.eng; } } },
  { key: 'raijin', name: 'Raijin', cost: 4, sel: [0, 0], anywhere: true, desc: 'Destroy 2 random tiles in your hand (in the shop, 2 random tiles from your Wall). Gain +1 Play every Blind for the rest of the run.',
    use: (S) => { for (let i = 0; i < 2 && S.hand.length; i++) S.hand.splice(Math.floor(Math.random() * S.hand.length), 1); S.bonusPlays++; S.plays++; } },
  { key: 'tsukuyomi', name: 'Tsukuyomi', cost: 4, sel: [1, 3], desc: 'Engrave up to 3 selected tiles with a Dragon Mark. Destroy 1 random unselected tile in your hand.',
    use: (S, sel) => { for (const t of sel) t.eng = 'dragonmark'; const others = S.hand.filter(t => !sel.includes(t)); if (others.length) { const v = pick(others); S.hand = S.hand.filter(t => t !== v); } } },
  { key: 'amaterasu', name: 'Amaterasu', cost: 4, sel: [0, 0], blindOnly: true, desc: 'Reveal: this Blind, your whole hand is shown even against The Purist, and flip 2 Dora indicators. Lose ¥3.',
    use: (S) => { S.revealed = true; S.money = Math.max(0, S.money - 3); for (let i = 0; i < 2 && S.wall.length; i++) { const t = S.wall.pop(); S.indicators.push(t); S.dora.push(nextDora(idx(t))); } } },
  // Seal spirits, like Balatro's Talisman, Trance and Medium Spectral cards.
  { key: 'benzaiten', name: 'Benzaiten', cost: 4, sel: [1, 1], desc: 'Put a Gold Seal on 1 selected tile: earn ¥3 whenever it scores.', use: (S, sel) => { sel[0].seal = 'gold'; } },
  { key: 'hachiman', name: 'Hachiman', cost: 4, sel: [1, 1], desc: 'Put a Blue Seal on 1 selected tile: if it is still in your hand when you win a Blind, the Scroll for your final play levels up.', use: (S, sel) => { sel[0].seal = 'blue'; } },
  { key: 'fujin', name: 'Fūjin', cost: 4, sel: [1, 1], desc: 'Put a Purple Seal on 1 selected tile: discarding it gives you a random Omikuji.', use: (S, sel) => { sel[0].seal = 'purple'; } },
];
KAMI.push({ key: 'hitodama', name: 'Hitodama', cost: 4, sel: [0, 0], anywhere: true, soul: true, rare: true, desc: 'Create a Legendary Talisman. Needs a free Talisman slot.',
  use: S => { if (S.challenge === 'shrine') return false; const pool = TALISMANS.filter(t => talRarity(t.key) === 'legendary' && !S.talismans.includes(t.key)); const slots = typeof talSlots === 'function' ? talSlots(S) : CFG.talismanSlots; if (!pool.length || S.talismans.length >= slots) return false; const t = pick(pool); S.talState = Object.fromEntries(Object.entries(S.talState || {}).filter(([x]) => x !== t.key)); S.talismans.push(t.key); S.gotLegend = t.key; if (typeof PROFILE !== 'undefined') PROFILE.legendaries = (PROFILE.legendaries || 0) + 1; } });
// A Kami roll: Hitodama is rare, like Balatro's The Soul.
// Balatro's Ankh, Hex, Ectoplasm, Black Hole, Cryptid and Aura. Talismans are unique here, so Izanagi cannot copy one:
// it gambles every Talisman you have on a new Rare one instead.
KAMI.push(
  { key: 'izanagi', name: 'Izanagi', cost: 4, sel: [0, 0], anywhere: true, desc: 'Create a random Rare Talisman, but destroy every other Talisman (Eternal ones stay).',
    use: S => { if (typeof talPool !== 'function') return false; const pool = talPool().filter(t => talRarity(t.key) === 'rare'); if (!pool.length) return false; for (const k of S.talismans.slice()) destroyTalisman(k); if (S.talismans.length >= talSlots()) return; gainTalisman(pick(pool).key); } },
  { key: 'izanami', name: 'Izanami', cost: 4, sel: [0, 0], anywhere: true, desc: 'A random Talisman with no edition becomes Polychrome. Destroy every other Talisman (Eternal ones stay).',
    use: S => { const pool = S.talismans.filter(k => !S.editions[k]); if (!pool.length || typeof destroyTalisman !== 'function') return false; const k = pick(pool); S.editions[k] = 'poly'; for (const o of S.talismans.slice()) if (o !== k) destroyTalisman(o); } },
  { key: 'okuninushi', name: 'Ōkuninushi', cost: 4, sel: [0, 0], anywhere: true, desc: 'A random Talisman with no edition becomes Negative (+1 slot). −1 hand size for the rest of the run.',
    use: S => { const pool = S.talismans.filter(k => !S.editions[k]); if (!pool.length) return false; S.editions[pick(pool)] = 'neg'; S.handMod = (S.handMod || 0) - 1; } },
  { key: 'minakanushi', name: 'Minakanushi', cost: 4, sel: [0, 0], anywhere: true, rare: true, desc: 'Every Scroll of Mastery levels up by 1.',
    use: S => { for (const sc of SCROLLS) { const [t, k] = sc.key.split(':'); const b = S.scrolls[t === 'm' ? 'meld' : 'yaku']; b[k] = (b[k] || 0) + 1; } } },
  { key: 'hiruko', name: 'Hiruko', cost: 4, sel: [1, 1], desc: 'Create 2 copies of 1 selected tile, engraving, Seal and edition included. They join your hand and stay in your Wall.',
    use: (S, sel) => { const t = sel[0]; for (let i = 0; i < 2; i++) { const c = mkTile(t.suit, t.rank, t.red); c.eng = t.eng; c.seal = t.seal; c.ed = t.ed; S.hand.push(c); } } },
  { key: 'uzume', name: 'Uzume', cost: 4, sel: [1, 1], desc: 'Give 1 selected tile a random edition: Foil (+50 Chips), Holographic (+10 Mult) or Polychrome (x1.5 Mult).',
    use: (S, sel) => { sel[0].ed = pick(Object.keys(TILE_EDS)); } },
);
// A Kami roll: Hitodama and Minakanushi are rare, like Balatro's The Soul and Black Hole.
function pickKami() { return rand() < CFG.soulOdds ? pick(KAMI.filter(k => k.rare)) : pick(KAMI.filter(k => !k.rare)); }
const CONS = {}; OMIKUJI.forEach(o => CONS[o.key] = Object.assign({ kind: 'omikuji' }, o)); KAMI.forEach(k => CONS[k.key] = Object.assign({ kind: 'kami' }, k));

// ===================== SCROLLS OF MASTERY (Planets) =====================
const SCROLLS = [
  { key: 'm:pair', name: 'Scroll of Pairs', cost: 3, desc: 'Every Pair in a play: +10 Chips. Any play with a Pair: +1 Han. Permanent, stacks per level.' },
  { key: 'm:chi', name: 'Scroll of Sequences', cost: 3, desc: 'Every Chi in a play: +10 Chips. Any play with a Chi: +1 Han. Permanent, stacks per level.' },
  { key: 'm:pon', name: 'Scroll of Triplets', cost: 3, desc: 'Every Pon in a play: +10 Chips. Any play with a Pon: +1 Han. Permanent, stacks per level.' },
  { key: 'm:kan', name: 'Scroll of Quads', cost: 3, desc: 'Every Kan in a play: +10 Chips. Any play with a Kan: +1 Han. Permanent, stacks per level.' },
  { key: 'm:hand', name: 'Scroll of Completion', cost: 4, desc: 'Complete Hands: +10 Chips and +1 Han, permanently.' },
  { key: 'y:tanyao', name: 'Scroll of Tanyao', cost: 3, desc: '+1 Han whenever Tanyao scores.' },
  { key: 'y:pinfu', name: 'Scroll of Pinfu', cost: 3, desc: '+1 Han whenever Pinfu scores.' },
  { key: 'y:yakuhai', name: 'Scroll of Yakuhai', cost: 3, desc: '+1 Han for each Yakuhai that scores, including Honor Pon partial plays.' },
  { key: 'y:honitsu', name: 'Scroll of Honitsu', cost: 3, desc: '+1 Han whenever Honitsu scores.' },
  { key: 'y:chinitsu', name: 'Scroll of Chinitsu', cost: 3, desc: '+1 Han whenever Chinitsu scores.' },
  { key: 'y:toitoi', name: 'Scroll of Toitoi', cost: 3, desc: '+1 Han whenever Toitoi scores.' },
  { key: 'y:chiitoitsu', name: 'Scroll of Seven Pairs', cost: 3, desc: '+1 Han whenever Chiitoitsu scores.' },
  { key: 'y:sanshoku', name: 'Scroll of Three Colours', cost: 3, desc: '+1 Han whenever Sanshoku Doujun scores.' },
  { key: 'y:ittsu', name: 'Scroll of the Straight', cost: 3, desc: '+1 Han whenever Ittsu scores.' },
  { key: 'y:chanta', name: 'Scroll of Edges', cost: 3, desc: '+1 Han whenever Chanta scores.' },
];
const SCR = {}; SCROLLS.forEach(s => SCR[s.key] = s);

// ===================== FLOWERS / SEASONS (Vouchers) =====================
const FLOWERS = [
  { key: 'plum', name: 'Plum Blossom', cost: 10, desc: '+1 hand size.' },
  { key: 'orchid', name: 'Orchid', cost: 10, desc: '+1 Discard every Blind.' },
  { key: 'bamboo', name: 'Bamboo', cost: 10, desc: '+1 Play every Blind.' },
  { key: 'chrysanthemum', name: 'Chrysanthemum', cost: 10, desc: 'Shop prices reduced by 20%.' },
  { key: 'spring', name: 'Spring', cost: 10, desc: '+1 consumable slot.' },
  { key: 'autumn', name: 'Autumn', cost: 10, desc: 'Rerolls start at ¥3 instead of ¥5 (each reroll in a shop still costs ¥1 more).' },
  { key: 'winter', name: 'Winter', cost: 10, desc: 'Interest cap raised from ¥5 to ¥10 per Blind.' },
  { key: 'summer', name: 'Summer', cost: 10, desc: '+¥2 reward for every Blind defeated.' },
  // New Flowers (Balatro's Overstock, Director's Cut, Hieroglyph, Hone and Blank).
  { key: 'lotus', name: 'Lotus', cost: 10, desc: '+1 card slot in the shop.' },
  { key: 'peony', name: 'Peony', cost: 10, desc: 'Once per Ante, reroll the Boss for ¥10 (on the Blind select screen).' },
  { key: 'wisteria', name: 'Wisteria', cost: 10, desc: 'Go back 1 Ante right away, but −1 Play every Blind.' },
  { key: 'sakura', name: 'Cherry Blossom', cost: 10, desc: 'Foil, Holographic, Polychrome and Negative Talismans turn up twice as often.' },
  { key: 'camellia', name: 'Camellia', cost: 10, desc: 'Talismans sell for ¥1 more.' },
  // Upgrades: each needs its Flower first, like Balatro's second-tier Vouchers.
  { key: 'plum2', name: 'Winter Plum', cost: 10, needs: 'plum', desc: '+1 more hand size.' },
  { key: 'orchid2', name: 'Wild Orchid', cost: 10, needs: 'orchid', desc: '+1 more Discard every Blind.' },
  { key: 'bamboo2', name: 'Bamboo Grove', cost: 10, needs: 'bamboo', desc: '+1 more Play every Blind.' },
  { key: 'chrys2', name: 'Golden Chrysanthemum', cost: 10, needs: 'chrysanthemum', desc: 'Shop prices reduced by 40% in total.' },
  { key: 'spring2', name: 'Late Spring', cost: 10, needs: 'spring', desc: '+1 more consumable slot.' },
  { key: 'autumn2', name: 'Harvest Moon', cost: 10, needs: 'autumn', desc: 'Rerolls start ¥2 cheaper again, at ¥1.' },
  { key: 'winter2', name: 'Deep Winter', cost: 10, needs: 'winter', desc: 'Interest cap raised to ¥20 per Blind.' },
  { key: 'summer2', name: 'Midsummer', cost: 10, needs: 'summer', desc: '+¥2 more reward for every Blind defeated (¥4 in all).' },
  { key: 'lotus2', name: 'Sacred Lotus', cost: 10, needs: 'lotus', desc: '+1 more card slot in the shop.' },
  { key: 'peony2', name: 'Tree Peony', cost: 10, needs: 'peony', desc: 'Reroll the Boss as often as you like, ¥10 each time.' },
  { key: 'wisteria2', name: 'Ancient Wisteria', cost: 10, needs: 'wisteria', desc: 'Go back 1 more Ante right away, but −1 Discard every Blind.' },
  { key: 'sakura2', name: 'Night Sakura', cost: 10, needs: 'sakura', desc: 'Editions turn up four times as often.' },
  { key: 'camellia2', name: 'Snow Camellia', cost: 10, needs: 'camellia', desc: '+1 Talisman slot.' },
];
// Flowers the shop can offer: not owned yet, and an upgrade only once you own the Flower it builds on.
const flowerPool = owned => FLOWERS.filter(f => !owned.includes(f.key) && (!f.needs || owned.includes(f.needs)));
const FLW = {}; FLOWERS.forEach(f => FLW[f.key] = f);

// ===================== TAGS (rewards for skipping a Small or Big Blind) =====================
const TAGS = {
  coupon: { name: 'Coupon Tag', desc: 'Talismans and consumables in the next shop cost ¥0.' },
  reroll: { name: 'Reroll Tag', desc: 'Rerolls in the next shop are free.' },
  foil: { name: 'Foil Tag', desc: 'The first Talisman in the next shop is Foil.' },
  holo: { name: 'Holographic Tag', desc: 'The first Talisman in the next shop is Holographic.' },
  poly: { name: 'Polychrome Tag', desc: 'The first Talisman in the next shop is Polychrome.' },
  neg: { name: 'Negative Tag', desc: 'The first Talisman in the next shop is Negative (+1 slot).' },
  omikuji: { name: 'Charm Tag', desc: 'A free Omikuji pack opens in the next shop.' },
  scroll: { name: 'Scroll Tag', desc: 'A free Scroll pack opens in the next shop.' },
  talisman: { name: 'Buffoon Tag', desc: 'A free Talisman pack opens in the next shop.' },
  kami: { name: 'Kami Tag', desc: 'A free Kami pack opens in the next shop.' },
  investment: { name: 'Investment Tag', desc: '+¥25 after you defeat the next Boss.' },
  economy: { name: 'Economy Tag', desc: 'Doubles your money, up to +¥40, right away.' },
  juggle: { name: 'Juggle Tag', desc: '+3 hand size for the next Blind.' },
  boss: { name: 'Boss Tag', desc: 'Rerolls the next Boss.' },
  speed: { name: 'Speed Tag', desc: '+¥5 for every Blind you have skipped this run, right away.' },
  tile: { name: 'Tile Tag', desc: 'A free Mega Tile Pack opens in the next shop.' },
  voucher: { name: 'Voucher Tag', desc: 'The next shop offers a second Flower.' },
  uncommon: { name: 'Uncommon Tag', desc: 'The next shop has a free Uncommon Talisman.' },
  rare: { name: 'Rare Tag', desc: 'The next shop has a free Rare Talisman.' },
  double: { name: 'Double Tag', desc: 'The next Tag you get counts twice (except another Double Tag).' },
  orbital: { name: 'Orbital Tag', desc: 'Levels up a random meld Scroll by 3, right away.' },
  topup: { name: 'Top-up Tag', desc: 'Creates up to 2 Common Talismans right away, if you have room.' },
  d6: { name: 'D6 Tag', desc: 'Rerolls in the next shop start at ¥0 and cost ¥1 more each time.' },
  handy: { name: 'Handy Tag', desc: '+¥1 for every Play you have used this run, right away.' },
  garbage: { name: 'Garbage Tag', desc: '+¥1 for every Discard you left unused this run, right away.' },
};
// ===================== PACKS =====================
// Every pack type comes in three sizes, like Balatro: Normal, Jumbo (+2 cards) and Mega (+2 cards, 2 picks).
// Mega Omikuji ('mega') and Mega Tile ('megatile') keep their old keys so saved runs still open them.
const PACK_TYPES = {
  omikuji: { label: 'Omikuji', show: 3, cost: 4, desc: (n, k) => `Open ${n} Omikuji. Use ${k === 1 ? '1' : k} on tiles from your Wall now, or keep ${k === 1 ? 'it' : 'them'}.` },
  scroll: { label: 'Scroll', show: 3, cost: 4, desc: (n, k) => `Open ${n} Scrolls of Mastery, use ${k} now.` },
  talisman: { label: 'Talisman', show: 2, cost: 6, desc: (n, k) => `Open ${n} Talismans, keep ${k}.` },
  kami: { label: 'Kami', show: 2, cost: 6, desc: (n, k) => `Open ${n} Kami Spirits. Use ${k === 1 ? '1' : k} on tiles from your Wall now, or keep ${k === 1 ? 'it' : 'them'}.` },
  tile: { label: 'Tile', show: 4, cost: 4, desc: (n, k) => `Open ${n} tiles and add ${k} to your Wall. Some come engraved or sealed.` },
};
const PACKS = {};
// One Booster Pack for a shop slot, by Balatro's weights.
function rollPack(skipType) { const opts = []; for (const [type, w] of Object.entries(CFG.packWeights)) if (type !== skipType) ['', 'jumbo', 'mega'].forEach((sz, i) => opts.push([sz === '' ? type : sz === 'mega' && type === 'omikuji' ? 'mega' : sz + type, w[i]])); let r = rand() * opts.reduce((a, o) => a + o[1], 0); for (const [k, w] of opts) { if ((r -= w) < 0) return k; } return opts[0][0]; }
for (const [type, t] of Object.entries(PACK_TYPES)) {
  const mk = (size, show, keep, cost) => ({ type, size, name: `${size ? size + ' ' : ''}${t.label} Pack`, show, keep, cost, desc: t.desc(show, keep) });
  PACKS[type] = mk('', t.show, 1, t.cost);
  PACKS['jumbo' + type] = mk('Jumbo', t.show + 2, 1, t.cost + 2);
  PACKS[type === 'omikuji' ? 'mega' : 'mega' + type] = mk('Mega', t.show + 2, 2, t.cost + 3);
}
// A tile for a Tile Pack: any tile your Wall can hold, sometimes a Red Five, engraved (30%) or sealed (15%).
function packTile(deckKey) {
  const suits = deckKey === 'lean' ? ['m', 'p', 'z'] : deckKey === 'monk' ? ['m', 'p', 's'] : ['m', 'p', 's', 'z'];
  const suit = pick(suits), rank = suit === 'z' ? 1 + Math.floor(rand() * 7) : 1 + Math.floor(rand() * 9);
  const t = mkTile(suit, rank, suit !== 'z' && rank === 5 && rand() < 0.3);
  if (rand() < 0.3) t.eng = pick(Object.keys(ENG));
  if (rand() < 0.15) t.seal = pick(Object.keys(SEALS));
  if (rand() < 0.08) t.ed = pick(Object.keys(TILE_EDS));
  return t;
}
// ===================== CHALLENGES =====================
// Fixed runs with special rules, like Balatro's. Standard Wall, White Stake; winning one is recorded on its own.
const CHALLENGES = [
  { key: 'rich', name: 'Rich Get Richer', desc: 'Start with ¥50 and both Winter Flowers (interest up to ¥20), but Talismans can never be sold.', rules: { noSell: true },
    setup: S => { S.money = 50; S.flowers.push('winter', 'winter2'); } },
  { key: 'fragile', name: 'Fragile', desc: 'Every tile in your Wall is Glass: x2 Mult each, but each one can shatter.', setup: S => { for (const t of S.deck) t.eng = 'glass'; } },
  { key: 'double', name: 'Double Vision', desc: 'Every tile in your Wall has a Red Seal, but every target is ×2.', rules: { target: 2 }, setup: S => { for (const t of S.deck) t.seal = 'red'; } },
  { key: 'shrine', name: 'Empty Shrine', desc: 'No Talismans ever appear in shops or packs, and Hitodama does nothing.', rules: { noTalismans: true } },
  { key: 'bound', name: 'Bound Spirits', desc: 'Start with Kitsune and Tanuki. Every Talisman you own is Eternal.', rules: { noSell: true },
    setup: S => { S.talismans.push('kitsune', 'tanuki'); } },
  { key: 'needle', name: 'Golden Needle', desc: 'Only 1 Play every Blind, but +6 Discards.', rules: { plays: 1, discards: 6 } },
  { key: 'inflation', name: 'Inflation', desc: 'Every purchase raises all shop prices by ¥1 for the rest of the run.', rules: { inflation: true } },
  { key: 'simple', name: 'Simple Life', desc: 'Your Wall has no 1s, 9s or Honors (Tanyao every time), but every target is ×1.5.', rules: { target: 1.5 },
    setup: S => { S.deck = S.deck.filter(t => t.suit !== 'z' && t.rank !== 1 && t.rank !== 9); } },
  { key: 'nestegg', name: 'Nest Egg', desc: 'Start with Tsuchinoko and Otoshidama, but you never earn interest.', rules: { noInterest: true }, setup: S => { S.talismans.push('tsuchinoko', 'otoshidama'); } },
  { key: 'shortlives', name: 'Short Lives', desc: 'Every Talisman you get is Perishable: it stops working after 5 Blinds.', rules: { allPerish: true } },
  { key: 'onecolour', name: 'One Colour', desc: 'Your Wall has only Characters and Honors (Honitsu everywhere), but every target is ×1.5.', rules: { target: 1.5 }, setup: S => { S.deck = S.deck.filter(t => t.suit === 'm' || t.suit === 'z'); } },
  { key: 'honorguard', name: 'Honor Guard', desc: 'Your Wall has only 1s, 9s and Honors. Start with Kirin.', setup: S => { S.deck = S.deck.filter(t => isHonor(t) || isTerminal(t)); S.talismans.push('kirin'); } },
  { key: 'cruelty', name: 'Cruelty', desc: 'Every Small and Big Blind has a random Boss rule too.', rules: { cruelty: true } },
  { key: 'luxury', name: 'Luxury Tax', desc: '−1 hand size for every ¥5 you hold (never below 8).', rules: { luxury: true } },
  { key: 'stonegarden', name: 'Stone Garden', desc: 'Your Wall starts with 16 extra Stone tiles. Start with ¥15.', setup: S => { S.money = 15; for (let i = 0; i < 16; i++) { const t = mkTile('p', 1 + (i % 9)); t.eng = 'stone'; S.deck.push(t); } } },
  { key: 'unpaid', name: 'Unpaid Work', desc: 'Blinds and unused Plays pay nothing. Start with ¥20 and Maneki-neko.', rules: { noBlindPay: true }, setup: S => { S.money = 20; S.talismans.push('maneki'); } },
  { key: 'blindfold', name: 'Blindfold', desc: 'Every tile in your hand is face down until you play or discard it.', rules: { blindfold: true } },
  { key: 'wildfire', name: 'Wildfire', desc: '20 random suited tiles in your Wall are Wild, but every target is ×1.5.', rules: { target: 1.5 }, setup: S => { for (const t of shuffle(S.deck.filter(x => x.suit !== 'z')).slice(0, 20)) t.eng = 'wild'; } },
  { key: 'rentday', name: 'Rent Day', desc: 'Every Talisman you get is a Rental (¥1 to buy, ¥3 every Blind). Start with ¥20.', rules: { allRental: true }, setup: S => { S.money = 20; } },
  { key: 'lonewolf', name: 'Lone Wolf', desc: 'Only 1 Talisman slot, but +2 Plays every Blind.', rules: { slots: 1, plusPlays: 2 } },
];
const CHAL = {}; CHALLENGES.forEach(c => CHAL[c.key] = c);
// ===================== YAKU CHEAT SHEET =====================
const YAKU_SHEET = [
  { k: 'tanyao', ex: '234m 567p 345s 678s 88p', n: 'Tanyao', h: '1 / 1', d: 'All simples: only 2–8 suited tiles, no 1s, 9s or honors.' },
  { k: 'yakuhai', ex: '234m 456p 678s 777z 55s', n: 'Yakuhai', h: '1 / 1 each', d: 'A triplet or quad of any Dragon or any Wind. (Simplified: every Wind counts.)' },
  { k: 'pinfu', ex: '123m 456m 678p 345s 22s', n: 'Pinfu', h: '1 / —', c: true, d: 'Four sequences and a non-honor pair.' },
  { k: 'iipeikou', ex: '345m 345m 678p 456s 99p', n: 'Iipeikou', h: '1 / —', c: true, d: 'Two identical sequences, e.g. 345m 345m.' },
  { k: 'sanshoku', ex: '456m 456p 456s 789m 11z', n: 'Sanshoku Doujun', h: '2 / 1', d: 'The same sequence in all three suits, e.g. 456m 456p 456s.' },
  { k: 'ittsu', ex: '123m 456m 789m 345p 55z', n: 'Ittsu', h: '2 / 1', d: 'A full straight 123 456 789 in one suit.' },
  { k: 'chanta', ex: '123m 789p 999s 111z 99m', n: 'Chanta', h: '2 / 1', d: 'Every meld and the pair contains a terminal or honor, with at least one sequence and one honor.' },
  { k: 'junchan', ex: '123m 789m 999p 111s 99s', n: 'Junchan', h: '3 / 2', d: 'Like Chanta but with no honors at all: every set touches a 1 or 9.' },
  { k: 'honroutou', ex: '111m 999p 111z 777z 99s', n: 'Honroutou', h: '2 / 2', d: 'Only terminals and honors, all triplets (stacks with Toitoi).' },
  { k: 'toitoi', ex: '222m 555p 777s 111z 99m', n: 'Toitoi', h: '2 / 2', d: 'Four triplets or quads and a pair.' },
  { k: 'sanankou', ex: '222m 555p 777s 345m 99s', n: 'Sanankou', h: '2 / 2', d: 'Three concealed triplets (not called from the River).' },
  { k: 'sankantsu', ex: '2222m 5555p 7777s 345m 99s', n: 'Sankantsu', h: '2 / 2', d: 'Three quads.' },
  { k: 'doukou', ex: '777m 777p 777s 123m 55z', n: 'Sanshoku Doukou', h: '2 / 2', d: 'The same triplet in all three suits, e.g. 777m 777p 777s.' },
  { k: 'shousangen', ex: '555z 666z 77z 123m 456p', n: 'Shousangen', h: '2 / 2', d: 'Two Dragon triplets and a pair of the third Dragon (plus 2 Yakuhai).' },
  { k: 'honitsu', ex: '123m 456m 789m 111z 77z', n: 'Honitsu', h: '3 / 2', d: 'Half flush: one suit plus honors.' },
  { k: 'chinitsu', ex: '123m 345m 567m 789m 55m', n: 'Chinitsu', h: '6 / 5', d: 'Full flush: one suit only.' },
  { k: 'chiitoitsu', ex: '22m 55m 77p 99p 33s 11z 66z', n: 'Chiitoitsu', h: '2 / —', c: true, d: 'Seven different pairs (no 4 melds needed). Stacks with Tanyao, Honroutou, Honitsu, Chinitsu.' },
  { k: 'ryanpeikou', ex: '234m 234m 678s 678s 99p', n: 'Ryanpeikou', h: '3 / —', c: true, d: 'Two sets of Iipeikou, e.g. 234m 234m 678s 678s.' },
  { k: 'rinshan', ex: '2222m 345p 678s 456m 99p', n: 'Rinshan Kaihou', h: '1 / 1', d: 'The winning tile of your complete hand is the replacement tile drawn after a Kan.' },
];
const YAKUMAN_SHEET = [
  { k: 'kokushi', ex: '19m 19p 19s 1234567z 1m', n: 'Kokushi Musou', h: '13', c: true, d: 'Thirteen Orphans: one of every 1, 9, Wind and Dragon, plus one duplicate of any of them.' },
  { k: 'daisangen', ex: '555z 666z 777z 234m 99p', n: 'Daisangen', h: '13', d: 'Triplets or quads of all three Dragons.' },
  { k: 'tsuuiisou', ex: '111z 222z 555z 666z 77z', n: 'Tsuuiisou', h: '13', d: 'All honors (also counts as Seven Pairs of honors).' },
  { k: 'suuankou', ex: '222m 555p 777s 111z 99m', n: 'Suuankou', h: '13', c: true, d: 'Four concealed triplets.' },
  { k: 'shousuushii', ex: '111z 222z 333z 44z 234m', n: 'Shousuushii', h: '13', d: 'Three Wind triplets and a pair of the fourth Wind. Disabled by The Typhoon.' },
  { k: 'daisuushii', ex: '111z 222z 333z 444z 55m', n: 'Daisuushii', h: '13', d: 'Four Wind triplets. Disabled by The Typhoon.' },
  { k: 'chinroutou', ex: '111m 999m 111p 999s 99p', n: 'Chinroutou', h: '13', d: 'All terminals: only 1s and 9s.' },
  { k: 'ryuuiisou', ex: '234s 234s 666s 888s 66z', n: 'Ryuuiisou', h: '13', d: 'All green: only 2, 3, 4, 6, 8 of Bamboo and the Green Dragon.' },
  { k: 'chuuren', ex: '1112345678999m 5m', n: 'Chuuren Poutou', h: '13', c: true, d: 'Nine Gates: 1112345678999 in one suit plus any tile of that suit.' },
  { k: 'suukantsu', ex: '2222m 5555p 7777s 1111z 99m', n: 'Suukantsu', h: '13', d: 'Four quads.' },
];

// ===================== TERMINOLOGY: Riichi (default) vs Hong Kong =====================
// Display strings are translated at render time by whole-word replacement. Logic and saves never change.
const HK_TALISMAN = { kakigori: '刨冰 Shaved Ice', senbei: '米餅 Rice Cracker', ramen: '拉麵 Ramen', daikoku: '大黑天 God of Plenty', yurei: '幽靈 Ghost', rikishi: '相撲手 Sumo Wrestler', ramune: '波子汽水 Marble Soda', kakuremino: '隱身蓑 Cloak of Invisibility', kabuki: '歌舞伎 Kabuki Actor', miko: '巫女 Shrine Maiden', hyakki: '百鬼夜行 Night Parade', tsuchinoko: '槌之子 Mallet Snake', otoshidama: '利是 Red Packet', kamikiri: '剪髮鬼 Hair Cutter', kotodama: '言靈 Word Spirit', itako: '問米婆 Spirit Medium', takarabune: '寶船 Treasure Ship', binbogami: '窮神 God of Poverty', fukusuke: '福助 Fortune Doll', ebisu: '惠比壽 Fisherman God', kamaitachi: '鐮鼬 Sickle Weasel', orochi: '八岐大蛇 Eight-headed Serpent', shuten: '酒吞童子 Drunken Demon', tamamo: '九尾狐 Nine-tailed Fox', hoo: '鳳凰 Phoenix', hashi: '橋 Bridge', nopperabo: '無面鬼 Faceless Ghost', sekito: '石塔 Stone Pagoda', aobozu: '青僧 Blue Monk', shiro: '城 Castle', takibi: '篝火 Bonfire', hoshizora: '星空 Starry Sky', mabo: '魔寶 Phantom Treasure', chochin: '燈籠 Lantern', hoshi: '星 Star', hatsumode: '頭炷香 First Incense', oshi: '偶像 Idol', daimyo: '大名 Lord', utsushi: '影印 Mirror Copy', kagami: '鏡 Mirror', kasaobake: '傘妖 Umbrella Ghost', ittanmomen: '布妖 Cloth Ghost', kappa: '水鬼 Water Ghost', kitsune: '狐仙 Fox Spirit', tanuki: '貔貅 Pixiu', maneki: '招財貓 Lucky Cat', tengu: '雷震子 Leizhenzi', oni: '牛魔王 Bull Demon King', daruma: '達摩 Bodhidharma', tsuru: '仙鶴 Crane', koi: '錦鯉 Golden Carp', ryu: '龍王 Dragon King', jizo: '地藏 Dizang', komainu: '石獅 Stone Lion', yukionna: '雪妖 Snow Demon', baku: '貘 Mo', nue: '四不像 Sibuxiang', kodama: '樹精 Tree Spirit', hannya: '夜叉 Yaksha', tsukumogami: '器靈 Object Spirit', nurikabe: '門神 Door God', tengoku: '馬騮精 Monkey Spirit', hitotsume: '獨眼鬼 One-eyed Ghost', nekomata: '貓妖 Cat Demon', shikigami: '紙人 Paper Effigy', kirin: '麒麟 Qilin', hakutaku: '白澤 Bai Ze', yatagarasu: '金烏 Golden Crow', gashadokuro: '骷髏精 Skeleton Spirit', jorogumo: '蜘蛛精 Spider Spirit', rokurokubi: '長頸鬼 Long-neck Ghost', ushioni: '牛頭 Ox-Head', nurarihyon: '無常 Wuchang', zashiki: '福童 Fortune Child', nureonna: '白蛇 White Snake', ryujin: '龍母 Dragon Mother', namazu: '鯉魚精 Carp Spirit', funayurei: '鬼船 Ghost Ship', sazaeoni: '螺精 Conch Spirit', amabie: '人魚 Mermaid', mizuchi: '蛟 Flood Dragon', kawauso: '水獺精 Otter Spirit', omagatoki: '黃昏 Twilight Hour', shojo: '猩猩 Wine Ape', azukiarai: '洗豆妖 Bean Washer' };
const HK_CONS = { wild: '百搭籤 Wild', lucky: '幸運籤 Luck', crimson: '熱鬧籤 Fervour', stone: '石籤 Stone', echo: '回響籤 Echoes', judgement: '審判籤 Judgement', emperor: '皇帝籤 Emperor', priestess: '女祭司籤 Priestess', hermit: '隱士籤 Hermit', temperance: '節制籤 Temperance', fortune: '命運籤 Fortune', izanagi: '伊邪那岐 Creator God', izanami: '伊邪那美 Creator Goddess', okuninushi: '大國主 Lord of the Land', minakanushi: '天之御中主 First God', hiruko: '水蛭子 Leech Child', uzume: '天宇受賣 Dawn Goddess', hitodama: '鬼火 Ghost Fire', benzaiten: '辯才天 Goddess of Fortune', hachiman: '八幡 God of War', fujin: '風神 Wind God', steel: '鋼籤 Steel', redseal: '紅印籤 Red Seal', glass: '玻璃籤 Glass', dup: '分身籤 Duplication', ascend: '升籤 Ascension', descend: '降籤 Descent', toman: '萬子籤 Characters', topin: '筒子籤 Dots', tosou: '索子籤 Bamboo', destroy: '化灰籤 Dust', dragon: '紅中籤 Red Dragon', redfive: '紅五籤 Red Five', indicator: '寶牌籤 Bonus Tile Slip', wealth: '橫財籤 Windfall', gold: '金箔籤 Gold Foil', obsidian: '黑曜籤 Obsidian', dragonmark: '龍紋籤 Dragon Mark', jade: '翡翠籤 Jade', susanoo: '哪吒 Nezha', inari: '財神 God of Wealth', raijin: '雷公 Lei Gong', tsukuyomi: '嫦娥 Chang’e', amaterasu: '媽祖 Mazu' };
const HK_SCROLL = { 'm:pair': '對子秘笈 Pairs Manual', 'm:chi': '上牌秘笈 Chow Manual', 'm:pon': '碰牌秘笈 Pung Manual', 'm:kan': '槓牌秘笈 Kong Manual', 'm:hand': '食糊秘笈 Winning Manual', 'y:tanyao': '斷幺九秘笈 All Simples Manual', 'y:pinfu': '平糊秘笈 All Chows Manual', 'y:yakuhai': '番牌秘笈 Honor Set Manual', 'y:honitsu': '混一色秘笈 Mixed Suit Manual', 'y:chinitsu': '清一色秘笈 Pure Suit Manual', 'y:toitoi': '對對糊秘笈 All Pungs Manual', 'y:chiitoitsu': '七對子秘笈 Seven Pairs Manual', 'y:sanshoku': '三色同順秘笈 Triple Chow Manual', 'y:ittsu': '一條龍秘笈 Straight Manual', 'y:chanta': '混全帶幺秘笈 Outside Hand Manual' };
const HK_FLOWER = { plum: '梅 Plum', orchid: '蘭 Orchid', chrysanthemum: '菊 Chrysanthemum', bamboo: '竹 Bamboo', spring: '春 Spring', summer: '夏 Summer', autumn: '秋 Autumn', winter: '冬 Winter' };
const HK_ENG = { steel: '鋼 Steel Inlay', glass: '玻璃 Glass', gold: '金箔 Gold Foil', obsidian: '黑曜 Obsidian Inlay', dragonmark: '龍紋 Dragon Mark', jade: '翡翠 Jade Inlay' };
const HK_BOSS = { fisherman: '漁夫 The Fisherman', censor: '審查官 The Censor', gatekeeper: '守門人 The Gatekeeper', collector: '收藏家 The Collector', miser: '孤寒鬼 The Miser', monk: '和尚 The Monk', purist: '蒙眼佬 The Purist', typhoon: '打風 The Typhoon', wallbuilder: '砌牆佬 The Wall-Builder', loanshark: '大耳窿 The Loan Shark' };
// Generic terms and hand names. Longer keys are matched first.
const HK_TERMS = {
  'Sanshoku Doujun': '三色同順 Mixed Triple Chow', 'Sanshoku Doukou': '三色同刻 Mixed Triple Pung', 'Kokushi Musou': '十三幺 Thirteen Orphans', 'Chuuren Poutou': '九蓮寶燈 Nine Gates',
  'Complete Hand (no Yaku)': '雞糊 Chicken Hand', 'Tanyao': '斷幺九 All Simples', 'Pinfu': '平糊 All Chows', 'Iipeikou': '一般高 Twin Chows', 'Ryanpeikou': '兩般高 Double Twin Chows',
  'Ittsu': '一條龍 Straight', 'Chanta': '混全帶幺 Mixed Outside Hand', 'Junchan': '純全帶幺 Pure Outside Hand', 'Honroutou': '混幺九 Terminals and Honors', 'Toitoi': '對對糊 All Pungs',
  'Sanankou': '三暗刻 Three Concealed Pungs', 'Sankantsu': '三槓子 Three Kongs', 'Shousangen': '小三元 Small Three Dragons', 'Honitsu': '混一色 Mixed One Suit', 'Chinitsu': '清一色 Pure One Suit',
  'Chiitoitsu': '七對子 Seven Pairs', 'Daisangen': '大三元 Big Three Dragons', 'Tsuuiisou': '字一色 All Honors', 'Suuankou': '四暗刻 Four Concealed Pungs', 'Shousuushii': '小四喜 Small Four Winds',
  'Daisuushii': '大四喜 Big Four Winds', 'Chinroutou': '清幺九 All Terminals', 'Ryuuiisou': '綠一色 All Green', 'Suukantsu': '十八羅漢 Eighteen Arhats', 'Sanshoku': '三色同順 Triple Chow',
  'Scrolls of Mastery': '秘笈 Manuals', 'Scroll of Mastery': '秘笈 Manual', 'Scrolls': 'Manuals', 'Scroll': 'Manual', 'Flowers & Seasons': '花牌 Flowers', 'Flower / Season': '花牌 Flower', 'Flowers': '花牌 Flowers',
  'Kami Spirit': '神 Deity', 'Kami': '神 Deity', 'Omikuji': '求籤 Fortune Stick', 'Talismans': '符 Charms', 'Talisman': '符 Charm',
  'Complete Hands': '食糊 Winning Hands', 'Complete Hand': '食糊 Winning Hand', 'Complete hands': 'Winning hands', 'Complete hand': 'Winning hand', 'complete hands': 'winning hands', 'complete hand': 'winning hand', 'Ready Hand': '聽牌 Teng Paai',
  'Red Fives': '紅五 Red Fives', 'Red Five': '紅五 Red Five', 'Yakuhai': '番牌 Honor Set', 'Yakuman': '限糊 Limit Hand', 'Yaku': 'Faan Patterns', 'Han': 'Faan', 'Dora': '寶牌 Bonus Tile', 'Furiten': '振聽 Discard Lock', 'tenpai': '聽牌 teng paai',
  'Chis': 'Chows', 'Chi': 'Chow 上', 'Pons': 'Pungs', 'Pon': 'Pung 碰', 'Kans': 'Kongs', 'Kan': 'Kong 槓', 'Manzu': '萬子 Characters', 'Pinzu': '筒子 Dots', 'Souzu': '索子 Bamboo', 'Man': 'Characters', 'Pin': 'Dots', 'Sou': 'Bamboo',
  'East Wind': '東風 East', 'South Wind': '南風 South', 'West Wind': '西風 West', 'North Wind': '北風 North', 'White Dragon': '白板 White Dragon', 'Green Dragon': '發財 Green Dragon', 'Red Dragon': '紅中 Red Dragon',
  '¥': '$', 'Rinshan Kaihou': '槓上開花 Flower on the Kong', 'The River': '牌河 The River', 'Open melds': '落地 Exposed sets', 'YEN': 'HKD', 'Mangan': '滿糊 Full Win', 'Haneman': '跳滿 Jump Win', 'Baiman': '倍滿 Double Win', 'Sanbaiman': '三倍滿 Triple Win', 'Yakuza': 'Triad', 'Open 3 Omikuji': 'Open 3 Fortune Sticks', 'Open 5 Omikuji': 'Open 5 Fortune Sticks', 'Kami Spirits': 'Deities', 'Omikuji and Kami': 'Fortune Sticks and Deities', 'Standard': '一番', 'Advanced': '二番', 'Master': '三番',
  'Mahjong roguelite in the Balatro mould': 'Hong Kong mahjong roguelite in the Balatro mould',
};
