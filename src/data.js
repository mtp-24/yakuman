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
  scrollChips: 10, scrollHan: 1,
  // Han -> multiplier. Index = Han. 13+ = x100.
  // Playtest 2: hand 17 (was 14), 5 discards (was 3), up to 7 tiles per discard (was 5).
  // Playtest 7: multi-meld ladder, complete hand 120 chips / 2 Han + Yaku, targets re-based to 300…45000.
  // Playtest 10: Furiten applies only to the winning tile (the newest tile drawn into the played hand).
  // Playtest 15: 5 Plays (was 4), start ¥8 (was ¥4), Ante 1-2 targets 250/700 (were 300/800), Loan Shark charges per Discard action.
  hanTable: [1, 2, 4, 8, 15, 15, 25, 25, 40, 40, 40, 60, 60, 100],
  tierNames: ['None', 'Standard', 'Advanced', 'Master', 'Mangan', 'Mangan', 'Haneman', 'Haneman', 'Baiman', 'Baiman', 'Baiman', 'Sanbaiman', 'Sanbaiman', 'Yakuman'],
  shopWeights: { talisman: 0.5, omikuji: 0.35, kami: 0.15 },
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
const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
let tileSeq = 0;
function mkTile(suit, rank, red = false) { return { id: ++tileSeq, suit, rank, red, eng: null }; }
function key(t) { return t.suit + t.rank; }
function isHonor(t) { return t.suit === 'z'; }
function isWind(t) { return t.suit === 'z' && t.rank <= 4; }
function isDragon(t) { return t.suit === 'z' && t.rank >= 5; }
function isTerminal(t) { return t.suit !== 'z' && (t.rank === 1 || t.rank === 9); }
function idx(t) { return SUITS.indexOf(t.suit) * 9 + t.rank - 1; }
function tileFromIdx(i) { return { id: 0, suit: SUITS[Math.floor(i / 9)], rank: i % 9 + 1, red: false, eng: null }; }
function tileName(t) { return isHonor(t) ? HONOR_EN[t.rank] + (t.rank <= 4 ? ' Wind' : ' Dragon') : `${t.red ? 'Red ' : ''}${t.rank} ${SUIT_EN[t.suit]}`; }
function buildDeck() {
  const d = [];
  for (const s of ['m', 'p', 's']) for (let r = 1; r <= 9; r++) for (let c = 0; c < 4; c++) {
    const red = r === 5 && (c === 0 || (s === 'p' && c === 1));
    d.push(mkTile(s, r, red));
  }
  for (let r = 1; r <= 7; r++) for (let c = 0; c < 4; c++) d.push(mkTile('z', r));
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
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

// ===================== ENGRAVINGS =====================
const ENG = {
  gold: { name: 'Gold Foil', short: 'G', desc: 'Earn ¥1 whenever this tile scores.' },
  obsidian: { name: 'Obsidian Inlay', short: 'O', desc: '+20 Chips when this tile scores.' },
  dragonmark: { name: 'Dragon Mark', short: 'D', desc: '+1 Han when this tile scores.' },
  jade: { name: 'Jade Inlay', short: 'J', desc: 'x1.5 Mult when this tile scores.' },
};

// ===================== BOSSES =====================
const BOSSES = {
  purist: { name: 'The Purist', desc: 'Terminals (1s and 9s) and Honor tiles are dealt face down. They are only revealed when played or discarded. Hand sorting and the helper are off.' },
  typhoon: { name: 'The Typhoon', desc: 'Wind tiles score 0 Chips and all Wind-based Yaku are disabled.' },
  wallbuilder: { name: 'The Wall-Builder', desc: 'Only plays of three or more melds score. Smaller partial plays deal 0 damage.' },
  loanshark: { name: 'The Loan Shark', desc: 'Every Discard costs ¥1, however many tiles you throw. At ¥0, discards are locked.' },
};

// ===================== TALISMANS (Jokers) =====================
const TALISMANS = [
  { key: 'kappa', name: 'Kappa', cost: 6, desc: 'Furiten no longer halves your score. Instead, +100 Chips for each copy of the winning tile sitting in your River.' },
  { key: 'kitsune', name: 'Kitsune', cost: 6, desc: '+1 Han on every Complete Hand.', onScore: c => c.kind === 'hand' ? { han: 1 } : null },
  { key: 'tanuki', name: 'Tanuki', cost: 4, desc: '+30 Chips on every partial play.', onScore: c => c.kind === 'meld' ? { chips: 30 } : null },
  { key: 'maneki', name: 'Maneki-neko', cost: 5, desc: 'Earn ¥3 extra when a Blind is defeated.', onBlindEnd: () => 3 },
  { key: 'tengu', name: 'Tengu', cost: 6, desc: '+1 Han for every Chi in a partial play.', onScore: c => c.kind === 'meld' && c.nChi ? { han: c.nChi } : null },
  { key: 'oni', name: 'Oni', cost: 6, desc: 'Partial plays containing a Pon or Kan score x1.5 Mult.', onScore: c => c.kind === 'meld' && (c.nPon || c.nKan) ? { xmult: 1.5 } : null },
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
  { key: 'tengoku', name: 'Amanojaku', cost: 6, desc: 'Open-meld Complete Hands gain +2 Han. Closed ones gain nothing.', onScore: (c, S) => c.kind === 'hand' && S.open.length ? { han: 2 } : null },
  // --- Retriggers: a tile scores again (its chips, Red Five Han, Dora and engravings all repeat)
  { key: 'nekomata', name: 'Nekomata', cost: 6, desc: 'Red Fives score a second time.', retrigger: t => t.red ? 1 : 0 },
  { key: 'shikigami', name: 'Shikigami', cost: 5, desc: 'The first tile of every play scores a second time.', retrigger: (t, c, S, i) => i === 0 ? 1 : 0 },
  { key: 'kirin', name: 'Kirin', cost: 6, desc: 'Honor tiles score a second time.', retrigger: t => isHonor(t) ? 1 : 0 },
  { key: 'hakutaku', name: 'Hakutaku', cost: 6, desc: 'Engraved tiles score a second time.', retrigger: t => t.eng ? 1 : 0 },
  { key: 'yatagarasu', name: 'Yatagarasu', cost: 7, desc: 'Tiles you Called from the River score three times.', retrigger: (t, c, S) => S.open.some(m => m.calledId === t.id) ? 2 : 0 },
  // --- Scaling and xMult
  { key: 'gashadokuro', name: 'Gashadokuro', cost: 8, desc: 'Gains x0.25 Mult for every Complete Hand you play this run.', onScore: (c, S) => { const n = S.talState.gashadokuro || 0; return n ? { xmult: 1 + 0.25 * n } : null; }, afterScore: (c, S) => { if (c.kind === 'hand') S.talState.gashadokuro = (S.talState.gashadokuro || 0) + 1; }, status: S => `now x${1 + 0.25 * (S.talState.gashadokuro || 0)}` },
  { key: 'jorogumo', name: 'Jorōgumo', cost: 5, desc: 'Gains +20 Chips every time you Call from the River.', onScore: (c, S) => { const n = S.talState.jorogumo || 0; return n ? { chips: n } : null; }, onCall: S => { S.talState.jorogumo = (S.talState.jorogumo || 0) + 20; }, status: S => `now +${S.talState.jorogumo || 0} Chips` },
  { key: 'rokurokubi', name: 'Rokurokubi', cost: 7, desc: 'x1.5 Mult for each open meld when you play a Complete Hand.', onScore: (c, S) => c.kind === 'hand' && S.open.length ? { xmult: Math.pow(1.5, S.open.length) } : null },
  { key: 'ushioni', name: 'Ushi-oni', cost: 7, desc: 'x2 Mult on the last Play of each Blind.', onScore: (c, S) => S.plays === 1 ? { xmult: 2 } : null },
  { key: 'nurarihyon', name: 'Nurarihyon', cost: 6, desc: 'x1.5 Mult if the play contains no Honor tiles.', onScore: c => c.tiles.some(isHonor) ? null : { xmult: 1.5 } },
  { key: 'zashiki', name: 'Zashiki-warashi', cost: 4, desc: 'Earn ¥1 every time a Red Five scores.', onScore: c => c.redCount ? { money: c.redCount } : null },
  // --- River play
  { key: 'nureonna', name: 'Nure-onna', cost: 6, desc: '+1 Han for every 10 tiles in the River when you score (max +3).', onScore: (c, S) => Math.min(3, Math.floor(S.river.length / 10)) ? { han: Math.min(3, Math.floor(S.river.length / 10)) } : null },
  { key: 'ryujin', name: 'Ryūjin', cost: 8, desc: 'Calling from the River no longer costs a Play.', freeCall: true },
  { key: 'namazu', name: 'Namazu', cost: 5, desc: 'Tiles you Called from the River give +30 Chips.', onTile: (t, S) => S.open.some(m => m.calledId === t.id) ? { chips: 30 } : null },
  { key: 'funayurei', name: 'Funayūrei', cost: 5, desc: 'Each Blind begins with 3 tiles from the Wall already in the River.', onBlindStart: S => { for (let i = 0; i < 3 && S.wall.length; i++) S.river.push(S.wall.pop()); } },
  { key: 'sazaeoni', name: 'Sazae-oni', cost: 6, desc: 'Each Call adds +1 Han to your next Complete Hand.', onCall: S => { S.talState.sazaeoni = (S.talState.sazaeoni || 0) + 1; }, onScore: (c, S) => c.kind === 'hand' && S.talState.sazaeoni ? { han: S.talState.sazaeoni } : null, afterScore: (c, S) => { if (c.kind === 'hand') S.talState.sazaeoni = 0; }, status: S => `stored +${S.talState.sazaeoni || 0} Han` },
  { key: 'amabie', name: 'Amabie', cost: 4, desc: 'Earn ¥1 whenever you discard 5 or more tiles at once.', onDiscard: (S, tiles) => { if (tiles.length >= 5) S.money += 1; } },
  { key: 'mizuchi', name: 'Mizuchi', cost: 6, desc: 'x1.5 Mult while your River holds fewer than 8 tiles.', onScore: (c, S) => S.river.length < 8 ? { xmult: 1.5 } : null },
];
const TAL = {}; TALISMANS.forEach(t => TAL[t.key] = t);

// ===================== OMIKUJI (Tarot) & KAMI (Spectral) =====================
function convertTile(t, suit, rank) { t.suit = suit; t.rank = rank; if (!(suit !== 'z' && rank === 5)) t.red = false; }
const OMIKUJI = [
  { key: 'dup', name: 'Slip of Duplication', cost: 3, sel: [1, 1], desc: 'Create an exact copy of 1 selected tile. It joins your hand and your Wall permanently.',
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
  { key: 'indicator', name: 'Slip of the Indicator', cost: 3, sel: [0, 0], desc: 'Flip the top Wall tile as a Dora indicator for this Blind. Every tile matching the next tile in sequence gains +1 Han when scored.',
    use: (S) => { if (!S.wall.length) return false; const t = S.wall.pop(); S.indicators.push(t); S.dora.push(nextDora(idx(t))); } },
  { key: 'wealth', name: 'Slip of Wealth', cost: 3, sel: [0, 0], anywhere: true, desc: 'Gain ¥5.', use: (S) => { S.money += 5; } },
  { key: 'gold', name: 'Slip of Gold Foil', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with Gold Foil: earn ¥1 whenever it scores.', use: (S, sel) => { sel[0].eng = 'gold'; } },
  { key: 'obsidian', name: 'Slip of Obsidian', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with Obsidian Inlay: +20 Chips whenever it scores.', use: (S, sel) => { sel[0].eng = 'obsidian'; } },
  { key: 'dragonmark', name: 'Slip of the Dragon Mark', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with a Dragon Mark: +1 Han whenever it scores.', use: (S, sel) => { sel[0].eng = 'dragonmark'; } },
  { key: 'jade', name: 'Slip of Jade', cost: 3, sel: [1, 1], desc: 'Engrave 1 selected tile with Jade Inlay: x1.5 Mult whenever it scores.', use: (S, sel) => { sel[0].eng = 'jade'; } },
];
const KAMI = [
  { key: 'susanoo', name: 'Susanoo', cost: 4, sel: [1, 5], desc: 'Destroy all selected tiles (up to 5). Complete Hands permanently gain +1 level (+10 Chips, +1 Han).',
    use: (S, sel) => { S.hand = S.hand.filter(t => !sel.includes(t)); S.scrolls.meld.hand = (S.scrolls.meld.hand || 0) + 1; } },
  { key: 'inari', name: 'Inari', cost: 4, sel: [2, 3], desc: 'Up to 3 selected tiles all become copies of the first selected tile (rank, suit, red, engraving).',
    use: (S, sel) => { const f = sel[0]; for (const t of sel.slice(1)) { t.suit = f.suit; t.rank = f.rank; t.red = f.red; t.eng = f.eng; } } },
  { key: 'raijin', name: 'Raijin', cost: 4, sel: [0, 0], desc: 'Destroy 2 random tiles in your hand. Gain +1 Play every Blind for the rest of the run.',
    use: (S) => { for (let i = 0; i < 2 && S.hand.length; i++) S.hand.splice(Math.floor(Math.random() * S.hand.length), 1); S.bonusPlays++; S.plays++; } },
  { key: 'tsukuyomi', name: 'Tsukuyomi', cost: 4, sel: [1, 3], desc: 'Engrave up to 3 selected tiles with a Dragon Mark. Destroy 1 random unselected tile in your hand.',
    use: (S, sel) => { for (const t of sel) t.eng = 'dragonmark'; const others = S.hand.filter(t => !sel.includes(t)); if (others.length) { const v = pick(others); S.hand = S.hand.filter(t => t !== v); } } },
  { key: 'amaterasu', name: 'Amaterasu', cost: 4, sel: [0, 0], desc: 'Reveal: this Blind, your whole hand is shown even against The Purist, and flip 2 Dora indicators. Lose ¥3.',
    use: (S) => { S.revealed = true; S.money = Math.max(0, S.money - 3); for (let i = 0; i < 2 && S.wall.length; i++) { const t = S.wall.pop(); S.indicators.push(t); S.dora.push(nextDora(idx(t))); } } },
];
const CONS = {}; OMIKUJI.forEach(o => CONS[o.key] = Object.assign({ kind: 'omikuji' }, o)); KAMI.forEach(k => CONS[k.key] = Object.assign({ kind: 'kami' }, k));

// ===================== SCROLLS OF MASTERY (Planets) =====================
const SCROLLS = [
  { key: 'm:pair', name: 'Scroll of Pairs', cost: 3, desc: 'Pair plays: +10 Chips and +1 Han, permanently.' },
  { key: 'm:chi', name: 'Scroll of Sequences', cost: 3, desc: 'Chi plays: +10 Chips and +1 Han, permanently.' },
  { key: 'm:pon', name: 'Scroll of Triplets', cost: 3, desc: 'Pon plays: +10 Chips and +1 Han, permanently.' },
  { key: 'm:kan', name: 'Scroll of Quads', cost: 3, desc: 'Kan plays: +10 Chips and +1 Han, permanently.' },
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
  { key: 'plum', name: 'Plum Blossom', cost: 10, desc: '+1 hand size (hold 15 tiles).' },
  { key: 'orchid', name: 'Orchid', cost: 10, desc: '+1 Discard every Blind.' },
  { key: 'bamboo', name: 'Bamboo', cost: 10, desc: '+1 Play every Blind.' },
  { key: 'chrysanthemum', name: 'Chrysanthemum', cost: 10, desc: 'Shop prices reduced by 20%.' },
  { key: 'spring', name: 'Spring', cost: 10, desc: '+1 consumable slot.' },
  { key: 'autumn', name: 'Autumn', cost: 10, desc: 'Rerolls cost ¥2 instead of ¥5.' },
  { key: 'winter', name: 'Winter', cost: 10, desc: 'Interest cap raised from ¥5 to ¥10 per Blind.' },
  { key: 'summer', name: 'Summer', cost: 10, desc: '+¥2 reward for every Blind defeated.' },
];
const FLW = {}; FLOWERS.forEach(f => FLW[f.key] = f);

// ===================== YAKU CHEAT SHEET =====================
const YAKU_SHEET = [
  { n: 'Tanyao', h: '1 / 1', d: 'All simples: only 2–8 suited tiles, no 1s, 9s or honors.' },
  { n: 'Yakuhai', h: '1 / 1 each', d: 'A triplet or quad of any Dragon or any Wind. (Simplified: every Wind counts.)' },
  { n: 'Pinfu', h: '1 / —', c: true, d: 'Four sequences and a non-honor pair.' },
  { n: 'Iipeikou', h: '1 / —', c: true, d: 'Two identical sequences, e.g. 345m 345m.' },
  { n: 'Sanshoku Doujun', h: '2 / 1', d: 'The same sequence in all three suits, e.g. 456m 456p 456s.' },
  { n: 'Ittsu', h: '2 / 1', d: 'A full straight 123 456 789 in one suit.' },
  { n: 'Chanta', h: '2 / 1', d: 'Every meld and the pair contains a terminal or honor, with at least one sequence and one honor.' },
  { n: 'Junchan', h: '3 / 2', d: 'Like Chanta but with no honors at all: every set touches a 1 or 9.' },
  { n: 'Honroutou', h: '2 / 2', d: 'Only terminals and honors, all triplets (stacks with Toitoi).' },
  { n: 'Toitoi', h: '2 / 2', d: 'Four triplets or quads and a pair.' },
  { n: 'Sanankou', h: '2 / 2', d: 'Three concealed triplets (not called from the River).' },
  { n: 'Sankantsu', h: '2 / 2', d: 'Three quads.' },
  { n: 'Sanshoku Doukou', h: '2 / 2', d: 'The same triplet in all three suits, e.g. 777m 777p 777s.' },
  { n: 'Shousangen', h: '2 / 2', d: 'Two Dragon triplets and a pair of the third Dragon (plus 2 Yakuhai).' },
  { n: 'Honitsu', h: '3 / 2', d: 'Half flush: one suit plus honors.' },
  { n: 'Chinitsu', h: '6 / 5', d: 'Full flush: one suit only.' },
  { n: 'Chiitoitsu', h: '2 / —', c: true, d: 'Seven different pairs (no 4 melds needed). Stacks with Tanyao, Honroutou, Honitsu, Chinitsu.' },
  { n: 'Ryanpeikou', h: '3 / —', c: true, d: 'Two sets of Iipeikou, e.g. 234m 234m 678s 678s.' },
];
const YAKUMAN_SHEET = [
  { n: 'Kokushi Musou', h: '13', c: true, d: 'Thirteen Orphans: one of every 1, 9, Wind and Dragon, plus one duplicate of any of them.' },
  { n: 'Daisangen', h: '13', d: 'Triplets or quads of all three Dragons.' },
  { n: 'Tsuuiisou', h: '13', d: 'All honors (also counts as Seven Pairs of honors).' },
  { n: 'Suuankou', h: '13', c: true, d: 'Four concealed triplets.' },
  { n: 'Shousuushii', h: '13', d: 'Three Wind triplets and a pair of the fourth Wind. Disabled by The Typhoon.' },
  { n: 'Daisuushii', h: '13', d: 'Four Wind triplets. Disabled by The Typhoon.' },
  { n: 'Chinroutou', h: '13', d: 'All terminals: only 1s and 9s.' },
  { n: 'Ryuuiisou', h: '13', d: 'All green: only 2, 3, 4, 6, 8 of Bamboo and the Green Dragon.' },
  { n: 'Chuuren Poutou', h: '13', c: true, d: 'Nine Gates: 1112345678999 in one suit plus any tile of that suit.' },
  { n: 'Suukantsu', h: '13', d: 'Four quads.' },
];

// ===================== TERMINOLOGY: Riichi (default) vs Hong Kong =====================
// Display strings are translated at render time by whole-word replacement. Logic and saves never change.
const HK_TALISMAN = { kappa: '水鬼 Water Ghost', kitsune: '狐仙 Fox Spirit', tanuki: '貔貅 Pixiu', maneki: '招財貓 Lucky Cat', tengu: '雷震子 Leizhenzi', oni: '牛魔王 Bull Demon King', daruma: '達摩 Bodhidharma', tsuru: '仙鶴 Crane', koi: '錦鯉 Golden Carp', ryu: '龍王 Dragon King', jizo: '地藏 Dizang', komainu: '石獅 Stone Lion', yukionna: '雪妖 Snow Demon', baku: '貘 Mo', nue: '四不像 Sibuxiang', kodama: '樹精 Tree Spirit', hannya: '夜叉 Yaksha', tsukumogami: '器靈 Object Spirit', nurikabe: '門神 Door God', tengoku: '馬騮精 Monkey Spirit', hitotsume: '獨眼鬼 One-eyed Ghost', nekomata: '貓妖 Cat Demon', shikigami: '紙人 Paper Effigy', kirin: '麒麟 Qilin', hakutaku: '白澤 Bai Ze', yatagarasu: '金烏 Golden Crow', gashadokuro: '骷髏精 Skeleton Spirit', jorogumo: '蜘蛛精 Spider Spirit', rokurokubi: '長頸鬼 Long-neck Ghost', ushioni: '牛頭 Ox-Head', nurarihyon: '無常 Wuchang', zashiki: '福童 Fortune Child', nureonna: '白蛇 White Snake', ryujin: '龍母 Dragon Mother', namazu: '鯉魚精 Carp Spirit', funayurei: '鬼船 Ghost Ship', sazaeoni: '螺精 Conch Spirit', amabie: '人魚 Mermaid', mizuchi: '蛟 Flood Dragon' };
const HK_CONS = { dup: '分身籤 Duplication', ascend: '升籤 Ascension', descend: '降籤 Descent', toman: '萬子籤 Characters', topin: '筒子籤 Dots', tosou: '索子籤 Bamboo', destroy: '化灰籤 Dust', dragon: '紅中籤 Red Dragon', redfive: '紅五籤 Red Five', indicator: '寶牌籤 Bonus Tile', wealth: '橫財籤 Windfall', gold: '金箔籤 Gold Foil', obsidian: '黑曜籤 Obsidian', dragonmark: '龍紋籤 Dragon Mark', jade: '翡翠籤 Jade', susanoo: '哪吒 Nezha', inari: '財神 God of Wealth', raijin: '雷公 Lei Gong', tsukuyomi: '嫦娥 Chang’e', amaterasu: '媽祖 Mazu' };
const HK_SCROLL = { 'm:pair': '對子秘笈 Pairs Manual', 'm:chi': '上牌秘笈 Chow Manual', 'm:pon': '碰牌秘笈 Pung Manual', 'm:kan': '槓牌秘笈 Kong Manual', 'm:hand': '食糊秘笈 Winning Manual', 'y:tanyao': '斷幺九秘笈 All Simples Manual', 'y:pinfu': '平糊秘笈 All Chows Manual', 'y:yakuhai': '番牌秘笈 Honour Set Manual', 'y:honitsu': '混一色秘笈 Mixed Suit Manual', 'y:chinitsu': '清一色秘笈 Pure Suit Manual', 'y:toitoi': '對對糊秘笈 All Pungs Manual', 'y:chiitoitsu': '七對子秘笈 Seven Pairs Manual', 'y:sanshoku': '三色同順秘笈 Triple Chow Manual', 'y:ittsu': '一條龍秘笈 Straight Manual', 'y:chanta': '混全帶幺秘笈 Outside Hand Manual' };
const HK_FLOWER = { plum: '梅 Plum', orchid: '蘭 Orchid', chrysanthemum: '菊 Chrysanthemum', bamboo: '竹 Bamboo', spring: '春 Spring', summer: '夏 Summer', autumn: '秋 Autumn', winter: '冬 Winter' };
const HK_ENG = { gold: '金箔 Gold Foil', obsidian: '黑曜 Obsidian Inlay', dragonmark: '龍紋 Dragon Mark', jade: '翡翠 Jade Inlay' };
const HK_BOSS = { purist: '蒙眼佬 The Purist', typhoon: '打風 The Typhoon', wallbuilder: '砌牆佬 The Wall-Builder', loanshark: '大耳窿 The Loan Shark' };
// Generic terms and hand names. Longer keys are matched first.
const HK_TERMS = {
  'Sanshoku Doujun': '三色同順 Mixed Triple Chow', 'Sanshoku Doukou': '三色同刻 Mixed Triple Pung', 'Kokushi Musou': '十三幺 Thirteen Orphans', 'Chuuren Poutou': '九蓮寶燈 Nine Gates',
  'Complete Hand (no Yaku)': '雞糊 Chicken Hand', 'Tanyao': '斷幺九 All Simples', 'Pinfu': '平糊 All Chows', 'Iipeikou': '一般高 Twin Chows', 'Ryanpeikou': '兩般高 Double Twin Chows',
  'Ittsu': '一條龍 Straight', 'Chanta': '混全帶幺 Mixed Outside Hand', 'Junchan': '純全帶幺 Pure Outside Hand', 'Honroutou': '混幺九 Terminals and Honours', 'Toitoi': '對對糊 All Pungs',
  'Sanankou': '三暗刻 Three Concealed Pungs', 'Sankantsu': '三槓子 Three Kongs', 'Shousangen': '小三元 Small Three Dragons', 'Honitsu': '混一色 Mixed One Suit', 'Chinitsu': '清一色 Pure One Suit',
  'Chiitoitsu': '七對子 Seven Pairs', 'Daisangen': '大三元 Big Three Dragons', 'Tsuuiisou': '字一色 All Honours', 'Suuankou': '四暗刻 Four Concealed Pungs', 'Shousuushii': '小四喜 Small Four Winds',
  'Daisuushii': '大四喜 Big Four Winds', 'Chinroutou': '清幺九 All Terminals', 'Ryuuiisou': '綠一色 All Green', 'Suukantsu': '十八羅漢 Eighteen Arhats', 'Sanshoku': '三色同順 Triple Chow',
  'Scrolls of Mastery': '秘笈 Manuals', 'Scroll of Mastery': '秘笈 Manual', 'Scrolls': 'Manuals', 'Scroll': 'Manual', 'Flowers & Seasons': '花牌 Flowers', 'Flower / Season': '花牌 Flower', 'Flowers': '花牌 Flowers',
  'Kami Spirit': '神 Deity', 'Kami': '神 Deity', 'Omikuji': '求籤 Fortune Stick', 'Talismans': '符 Charms', 'Talisman': '符 Charm',
  'Complete Hands': '食糊 Winning Hands', 'Complete Hand': '食糊 Winning Hand', 'complete hands': 'winning hands', 'complete hand': 'winning hand', 'Ready Hand': '聽牌 Listening Hand',
  'Red Fives': '紅五 Red Fives', 'Red Five': '紅五 Red Five', 'Yakuhai': '番牌 Honour Set', 'Yakuman': '限糊 Limit Hand', 'Yaku': 'Faan patterns', 'Han': 'Faan', 'Dora': '寶牌 Bonus Tile', 'Furiten': '振聽 Discard Lock', 'tenpai': '聽牌 listening',
  'Chis': 'Chows', 'Chi': 'Chow 上', 'Pons': 'Pungs', 'Pon': 'Pung 碰', 'Kans': 'Kongs', 'Kan': 'Kong 槓', 'Manzu': '萬子 Characters', 'Pinzu': '筒子 Dots', 'Souzu': '索子 Bamboo', 'Man': 'Characters', 'Pin': 'Dots', 'Sou': 'Bamboo',
  'East Wind': '東風 East', 'South Wind': '南風 South', 'West Wind': '西風 West', 'North Wind': '北風 North', 'White Dragon': '白板 White Dragon', 'Green Dragon': '發財 Green Dragon', 'Red Dragon': '紅中 Red Dragon',
  '¥': '$', 'The River': '牌河 The River', 'Open melds': '落地 Exposed sets', 'YEN': 'HKD', 'Mangan': '滿糊', 'Haneman': '跳滿', 'Baiman': '倍滿', 'Sanbaiman': '三倍滿', 'Standard': '一番', 'Advanced': '二番', 'Master': '三番',
  'Mahjong roguelite in the Balatro mould': 'Hong Kong mahjong roguelite in the Balatro mould',
};
