// ===================== MELDS & DECOMPOSITION =====================
// Rule switches set from the run state (Hashi: a Chi may skip one rank).
let GAP_CHI = false;
// A signed amount for breakdown lines: +12, or −30 (a real minus sign, never "+-30").
const sgn = n => n < 0 ? '−' + Math.abs(n) : '+' + n;
function setRules(S) { GAP_CHI = !!(S && S.talismans && S.talismans.includes('hashi')); }
const CHI_SHAPES = () => GAP_CHI ? [[0, 1, 2], [0, 1, 3], [0, 2, 3]] : [[0, 1, 2]];
function meldType(tiles) {
  const n = tiles.length;
  if (n < 3 || n > 4) return null;
  const k = key(tiles[0]);
  if (tiles.every(t => key(t) === k)) return n === 3 ? 'pon' : 'kan';
  if (n !== 3) return null;
  if (tiles.some(isHonor)) return null;
  const s = tiles[0].suit; if (!tiles.every(t => t.suit === s)) return null;
  const r = tiles.map(t => t.rank).sort((a, b) => a - b);
  if (r[1] === r[0] + 1 && r[2] === r[1] + 1) return 'chi';
  if (GAP_CHI && r[0] !== r[1] && r[1] !== r[2] && r[2] - r[0] === 3) return 'chi';
  return null;
}
// Partition a selection into up to 4 melds (Chi/Pon/Kan) plus at most one pair, or exactly two pairs with no melds (Two Pair),
// covering every tile. Prefers more melds, then Kans. Returns {melds:[{type,i}], pairs:[i...], single:bool} or null.
function partitionPlay(tiles) {
  if (!tiles.length) return null;
  if (tiles.length === 1) return { melds: [], pairs: [], single: true };
  const counts = new Array(34).fill(0); for (const t of tiles) counts[idx(t)]++;
  let best = null;
  function rec(i, melds, pairs) {
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) { if (pairs.length >= 2 && melds.length) return; const sc = melds.length * 10 + pairs.length + melds.filter(m => m.type === 'kan').length * 0.1; if (!best || sc > best.sc) best = { melds: melds.slice(), pairs: pairs.slice(), sc }; return; }
    if (melds.length < 4) {
      if (counts[i] >= 4) { counts[i] -= 4; melds.push({ type: 'kan', i }); rec(i, melds, pairs); melds.pop(); counts[i] += 4; }
      if (counts[i] >= 3) { counts[i] -= 3; melds.push({ type: 'pon', i }); rec(i, melds, pairs); melds.pop(); counts[i] += 3; }
      if (i < 27) for (const sh of CHI_SHAPES()) { const a = i + sh[1], b = i + sh[2]; if ((i % 9) + sh[2] > 8 || !counts[a] || !counts[b]) continue; counts[i]--; counts[a]--; counts[b]--; melds.push({ type: 'chi', i, shape: sh }); rec(i, melds, pairs); melds.pop(); counts[i]++; counts[a]++; counts[b]++; }
    }
    if (pairs.length < (CFG.pairLadder ? 6 : 2) && counts[i] >= 2) { counts[i] -= 2; pairs.push(i); rec(i, melds, pairs); pairs.pop(); counts[i] += 2; }
  }
  rec(0, [], []);
  if (!best) return null;
  return { melds: best.melds, pairs: best.pairs, single: false };
}
// Rung of the play ladder for a partition: {key, name, chips, han}
function rungInfo(part) {
  if (part.single) return { key: 'single', name: MELD_LABEL.single, ...CFG.meldBase.single };
  const m = part.melds.length, p = part.pairs.length ? 1 : 0;
  if (m === 0) { const np = part.pairs.length; if (np >= 3 && CFG.pairRungs[np]) { const r = CFG.pairRungs[np]; return { key: 'pairs' + np, name: r.name, chips: r.chips, han: r.han }; } return np === 2 ? { key: 'twopair', name: MELD_LABEL.twopair, ...CFG.meldBase.twopair } : { key: 'pair', name: MELD_LABEL.pair, ...CFG.meldBase.pair }; }
  if (m === 1) { const t = part.melds[0].type, b = CFG.meldBase[t]; return { key: t, name: MELD_LABEL[t] + (p ? ' + Pair' : ''), chips: b.chips + (p ? 10 : 0), han: b.han }; }
  const r = CFG.rungs[m + ',' + p]; return { key: 'rung' + m + p, name: r.name, chips: r.chips, han: r.han };
}
// Kept for the Call validator: a single Chi/Pon/Kan.
function playType(tiles) { const p = partitionPlay(tiles); return p ? rungInfo(p).key : null; }
// counts: 34-array. Returns every way to split into exactly `need` melds.
function decompose(counts, need) {
  const res = [];
  function rec(i, acc) {
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) { if (acc.length === need) res.push(acc.slice()); return; }
    if (acc.length >= need) return;
    if (counts[i] >= 3) { counts[i] -= 3; acc.push({ type: 'pon', i }); rec(i, acc); acc.pop(); counts[i] += 3; }
    if (i < 27) for (const sh of CHI_SHAPES()) { const a = i + sh[1], b = i + sh[2]; if ((i % 9) + sh[2] > 8 || !counts[a] || !counts[b]) continue; counts[i]--; counts[a]--; counts[b]--; acc.push({ type: 'chi', i, shape: sh }); rec(i, acc); acc.pop(); counts[i]++; counts[a]++; counts[b]++; }
  }
  rec(0, []); return res;
}
function findStandard(concealed, open) {
  const counts = new Array(34).fill(0); for (const t of concealed) counts[idx(t)]++;
  const need = 4 - open.length; const out = [];
  const openMelds = open.map(m => ({ type: m.type, i: idx(m.tiles[0]), open: !m.closed }));
  for (let p = 0; p < 34; p++) {
    if (counts[p] < 2) continue; counts[p] -= 2;
    for (const ms of decompose(counts, need)) out.push({ pair: p, melds: [...openMelds, ...ms.map(m => ({ ...m, open: false }))] });
    counts[p] += 2;
  }
  return out;
}

// ===================== YAKU =====================
function finalize(list) {
  const ym = list.filter(y => y.yakuman);
  if (ym.length) return { list: ym, han: 13 * ym.length, yakuman: true };
  return { list, han: list.reduce((a, y) => a + y.han, 0), yakuman: false };
}
const sI = i => Math.floor(i / 9), rI = i => i % 9 + 1, honI = i => i >= 27, windI = i => i >= 27 && i <= 30, drgI = i => i >= 31,
  termI = i => i < 27 && (i % 9 === 0 || i % 9 === 8), orphI = i => honI(i) || termI(i);
function evalStandard(dec, closed, S) {
  const baku = S.talismans.includes('baku'), typhoon = S.boss === 'typhoon';
  const list = [];
  const add = (key, name, c, o) => { const h = (closed || baku) ? c : o; if (h > 0) list.push({ key, name, han: h }); };
  const ym = (key, name) => list.push({ key, name, han: 13, yakuman: true });
  const melds = dec.melds, pair = dec.pair;
  const pons = melds.filter(m => m.type !== 'chi'), chis = melds.filter(m => m.type === 'chi'), kans = melds.filter(m => m.type === 'kan');
  const all = []; for (const m of melds) { if (m.type === 'chi') { const sh = m.shape || [0, 1, 2]; all.push(m.i + sh[0], m.i + sh[1], m.i + sh[2]); } else all.push(m.i, m.i, m.i); } all.push(pair, pair);
  if (all.every(i => !orphI(i))) add('tanyao', 'Tanyao', 1, 1);
  for (const m of pons) {
    if (drgI(m.i)) add('yakuhai', `Yakuhai (${HONOR_EN[rI(m.i)]} Dragon)`, 1, 1);
    else if (windI(m.i) && !typhoon) add('yakuhai', `Yakuhai (${HONOR_EN[rI(m.i)]} Wind)`, 1, 1);
  }
  if (closed && chis.length === 4 && !honI(pair)) add('pinfu', 'Pinfu', 1, 0);
  if (closed) {
    const cnt = {}; for (const m of chis) cnt[m.i] = (cnt[m.i] || 0) + 1;
    const pairsOfChi = Object.values(cnt).reduce((a, v) => a + Math.floor(v / 2), 0);
    if (pairsOfChi >= 2) add('ryanpeikou', 'Ryanpeikou', 3, 0); else if (pairsOfChi === 1) add('iipeikou', 'Iipeikou', 1, 0);
  }
  for (let r = 0; r <= 6; r++) if ([0, 1, 2].every(s => chis.some(m => m.i === s * 9 + r))) { add('sanshoku', 'Sanshoku Doujun', 2, 1); break; }
  for (let r = 0; r < 9; r++) if ([0, 1, 2].every(s => pons.some(m => m.i === s * 9 + r))) { add('doukou', 'Sanshoku Doukou', 2, 2); break; }
  for (let s = 0; s < 3; s++) if ([0, 3, 6].every(r => chis.some(m => m.i === s * 9 + r))) { add('ittsu', 'Ittsu', 2, 1); break; }
  const setsOrphan = melds.every(m => m.type === 'chi' ? (m.i % 9 === 0 || (m.i % 9) + (m.shape ? m.shape[2] : 2) === 8) : orphI(m.i)) && orphI(pair);
  const hasHonor = all.some(honI);
  if (setsOrphan) {
    if (chis.length === 0) { if (all.every(honI)) { /* tsuuiisou below */ } else if (all.every(termI)) ym('chinroutou', 'Chinroutou'); else add('honroutou', 'Honroutou', 2, 2); }
    else if (hasHonor) add('chanta', 'Chanta', 2, 1); else add('junchan', 'Junchan', 3, 2);
  }
  if (pons.length === 4) add('toitoi', 'Toitoi', 2, 2);
  const conc = pons.filter(m => !m.open).length;
  if (conc === 4 && closed) ym('suuankou', 'Suuankou'); else if (conc === 3) add('sanankou', 'Sanankou', 2, 2);
  if (kans.length === 4) ym('suukantsu', 'Suukantsu'); else if (kans.length === 3) add('sankantsu', 'Sankantsu', 2, 2);
  const dp = pons.filter(m => drgI(m.i)).length;
  if (dp === 3) ym('daisangen', 'Daisangen'); else if (dp === 2 && drgI(pair)) add('shousangen', 'Shousangen', 2, 2);
  if (!typhoon) { const wp = pons.filter(m => windI(m.i)).length; if (wp === 4) ym('daisuushii', 'Daisuushii'); else if (wp === 3 && windI(pair)) ym('shousuushii', 'Shousuushii'); }
  const suits = new Set(all.filter(i => !honI(i)).map(sI));
  if (all.every(honI)) ym('tsuuiisou', 'Tsuuiisou');
  else if (suits.size === 1) {
    if (hasHonor) add('honitsu', 'Honitsu', 3, 2);
    else {
      add('chinitsu', 'Chinitsu', 6, 5);
      if (closed) { const c = new Array(9).fill(0); for (const i of all) c[i % 9]++; const need = [3, 1, 1, 1, 1, 1, 1, 1, 3]; let ok = true, extra = 0; for (let r = 0; r < 9; r++) { if (c[r] < need[r]) ok = false; extra += c[r] - need[r]; } if (ok && extra === 1) ym('chuuren', 'Chuuren Poutou'); }
    }
  }
  const green = new Set([19, 20, 21, 23, 25, 32]);
  if (all.every(i => green.has(i))) ym('ryuuiisou', 'Ryuuiisou');
  return finalize(list);
}
function evalSpecial(tiles, S) {
  const counts = new Array(34).fill(0); for (const t of tiles) counts[idx(t)]++;
  const results = [];
  if (ORPHANS.every(i => counts[i] >= 1) && ORPHANS.reduce((a, i) => a + counts[i], 0) === 14)
    results.push({ special: 'kokushi', yaku: finalize([{ key: 'kokushi', name: 'Kokushi Musou', han: 13, yakuman: true }]) });
  const nz = counts.filter(c => c > 0);
  if (nz.length === 7 && nz.every(c => c === 2)) {
    const list = [{ key: 'chiitoitsu', name: 'Chiitoitsu', han: 2 }]; const all = []; counts.forEach((c, i) => { if (c) all.push(i, i); });
    if (all.every(i => !orphI(i))) list.push({ key: 'tanyao', name: 'Tanyao', han: 1 });
    if (all.every(orphI) && !all.every(honI)) list.push({ key: 'honroutou', name: 'Honroutou', han: 2 });
    const suits = new Set(all.filter(i => !honI(i)).map(sI)); const hasH = all.some(honI);
    if (all.every(honI)) list.push({ key: 'tsuuiisou', name: 'Tsuuiisou', han: 13, yakuman: true });
    else if (suits.size === 1) list.push(hasH ? { key: 'honitsu', name: 'Honitsu', han: 3 } : { key: 'chinitsu', name: 'Chinitsu', han: 6 });
    results.push({ special: 'chiitoitsu', yaku: finalize(list) });
  }
  return results;
}
// Best complete-hand interpretation of concealed tiles + open melds, or null.
function bestHand(concealed, open, S) {
  const closed = open.every(m => m.closed);
  const cands = findStandard(concealed, open).map(dec => ({ dec, yaku: evalStandard(dec, closed, S) }));
  if (open.length === 0 && concealed.length === 14) for (const sp of evalSpecial(concealed, S)) cands.push({ dec: null, special: sp.special, yaku: sp.yaku });
  if (!cands.length) return null;
  cands.sort((a, b) => b.yaku.han - a.yaku.han || b.yaku.list.length - a.yaku.list.length);
  return cands[0];
}

// ===================== SCORING PIPELINE =====================
function tileChips(t, S) {
  let c = (isHonor(t) || isTerminal(t)) ? 10 : t.rank;
  if (S.boss === 'typhoon' && isWind(t)) c = 0;
  if (S.boss === 'censor' && t.red) c = 0;
  if (S.boss === 'collector' && t.suit === S.bossSuit) c = 0;
  if (t.eng === 'obsidian') c += 20;
  for (const k of S.talismans) { const d = TAL[k]; if (d.onTile) { const r = d.onTile(t, S); if (r && r.chips) c += r.chips; } }
  return c;
}
// Resolve a copier Talisman to the Talisman whose ability it copies (never another copier).
function talTarget(S, k) {
  const d = TAL[k]; if (!d.copies) return d;
  const i = S.talismans.indexOf(k);
  if (d.copies === 'right') { for (let j = i + 1; j < S.talismans.length; j++) if (!TAL[S.talismans[j]].copies) return TAL[S.talismans[j]]; return null; }
  for (let j = 0; j < S.talismans.length; j++) if (!TAL[S.talismans[j]].copies) return TAL[S.talismans[j]]; return null;
}
function scoreCtx(S, kind, tiles, info) {
  // tiles: for 'meld' the selected tiles; for 'hand' the concealed selection followed by open-meld tiles.
  const playedIds = new Set(tiles.map(t => t.id));
  const ctx = { kind, tiles: tiles.map(t => ({ ...t })), held: S.hand.filter(t => !playedIds.has(t.id)), chips: 0, han: 0, xmult: 1, lines: [], hits: [], yaku: [], furiten: false, total: 0, money: 0, redCount: 0, hasDragonSet: false, desc: '', nChi: 0, nPon: 0, nKan: 0, nMelds: 0, hasPair: false, meldType: null, shatter: [] };
  const L = (label, val, d = {}) => ctx.lines.push(Object.assign({ label, val }, d));
  const apply = r => { if (!r) return []; const parts = []; if (r.chips) { ctx.chips += r.chips; parts.push(`${sgn(r.chips)} Chips`); } if (r.han) { ctx.han += r.han; parts.push(`${sgn(r.han)} Han`); } if (r.xmult) { ctx.xmult *= r.xmult; parts.push(`×${r.xmult} Mult`); } if (r.money) { ctx.money += r.money; parts.push(`+¥${r.money}`); } return parts; };
  // ---- components
  let melds = [], pairs = [];
  if (kind === 'hand') { melds = info.dec ? info.dec.melds : []; pairs = info.dec ? [info.dec.pair] : []; }
  else { melds = info.part.melds; pairs = info.part.pairs; }
  ctx.nChi = melds.filter(m => m.type === 'chi').length; ctx.nPon = melds.filter(m => m.type === 'pon').length; ctx.nKan = melds.filter(m => m.type === 'kan').length;
  ctx.nMelds = melds.length; ctx.nPairs = pairs.length; ctx.hasPair = pairs.length > 0; ctx.hasDragonSet = melds.some(m => m.type !== 'chi' && m.i >= 31);
  // ---- base rung
  let rung;
  if (kind === 'hand') { const lvl = S.scrolls.meld.hand || 0; rung = { key: 'hand', name: MELD_LABEL.hand + (lvl ? ' Lv.' + (lvl + 1) : ''), chips: CFG.meldBase.hand.chips + lvl * CFG.scrollChips, han: CFG.meldBase.hand.han + lvl * CFG.scrollHan }; }
  else rung = rungInfo(info.part);
  ctx.meldType = rung.key; ctx.rungName = rung.name;
  ctx.chips += rung.chips; ctx.han += rung.han;
  L(rung.name, `+${rung.chips} Chips` + (rung.han ? `, +${rung.han} Han` : ''), { chips: rung.chips, han: rung.han, base: true });
  // Scroll bonuses per component (Chi, Pon, Kan, Pair) apply to every play that contains them, complete hands included,
  // so a complete hand always outscores the ready hand inside it. Kans inside multi-meld plays and complete hands add a bonus.
  {
    const byType = {}; for (const m of melds) byType[m.type] = (byType[m.type] || 0) + 1; if (pairs.length) byType.pair = pairs.length;
    // Chips per component (four Chi pay more than one), Han once per component type present (like a Balatro Planet level).
    for (const [t, n] of Object.entries(byType)) { const lvl = S.scrolls.meld[t] || 0; if (lvl) { const c = lvl * CFG.scrollChips * n, h = lvl * CFG.scrollHan; ctx.chips += c; ctx.han += h; L(`Scroll: ${MELD_LABEL[t]}${n > 1 ? ' ×' + n : ''}`, `+${c} Chips, +${h} Han`, { chips: c, han: h }); } }
    if (melds.length >= 2 && ctx.nKan) { const c = CFG.kanBonus.chips * ctx.nKan, h = CFG.kanBonus.han * ctx.nKan; ctx.chips += c; ctx.han += h; L(`Kan ×${ctx.nKan}`, `+${c} Chips, +${h} Han`, { chips: c, han: h }); }
  }
  if (kind === 'meld') {
    // Yakuhai per honor set on partial plays (complete hands get it through their Yaku)
    for (const m of melds) if (m.type !== 'chi' && m.i >= 27 && !(S.boss === 'typhoon' && m.i <= 30)) { ctx.han += 1; L(`Yakuhai (${HONOR_EN[m.i - 26]})`, '+1 Han', { han: 1 }); ctx.yaku.push({ key: 'yakuhai', name: `Yakuhai (${HONOR_EN[m.i - 26]})`, han: 1 }); const b = S.scrolls.yaku.yakuhai || 0; if (b) { ctx.han += b; L('Scroll: Yakuhai', `+${b} Han`, { han: b }); } }
    const t0 = tiles[0];
    if (info.part.single) ctx.desc = 'Lone ' + tileName(t0);
    else if (melds.length === 1 && !pairs.length) ctx.desc = rung.name + ' of ' + (isHonor(t0) ? HONOR_EN[t0.rank] : (melds[0].type === 'chi' ? sortTiles(tiles).map(t => t.rank).join('') + ' ' + SUIT_EN[t0.suit] : t0.rank + ' ' + SUIT_EN[t0.suit]));
    else ctx.desc = rung.name;
  }
  // ---- per-tile loop with retriggers
  const redPer = S.talismans.includes('koi') ? 2 : 1;
  const agg = { chips: 0, red: 0, redHan: 0, dora: 0, dm: 0, jade: 0, gold: 0, glass: 0, retrig: {} };
  tiles.forEach((t, ti) => {
    let extra = 0; const who = [];
    if (t.eng === 'redseal') { extra += 1; who.push('Red Seal'); agg.retrig['Red Seal'] = (agg.retrig['Red Seal'] || 0) + 1; }
    for (const k of S.talismans) { const d = talTarget(S, k); if (d && d.retrigger) { const n = d.retrigger(t, ctx, S, ti); if (n) { extra += n; for (let q = 0; q < n; q++) who.push(TAL[k].name); agg.retrig[TAL[k].name] = (agg.retrig[TAL[k].name] || 0) + n; } } }
    const times = 1 + extra; let c = 0, h = 0, x = 1, money = 0;
    for (let r = 0; r < times; r++) {
      const tc = tileChips(t, S); c += tc; agg.chips += tc;
      if (t.red && S.boss !== 'censor') { h += redPer; agg.redHan += redPer; if (r === 0) { agg.red++; ctx.redCount++; } }
      for (const di of S.dora) if (idx(t) === di) { h += 1; agg.dora++; }
      if (t.eng === 'dragonmark') { h += 1; agg.dm++; }
      if (t.eng === 'jade') { x *= 1.5; agg.jade++; }
      if (t.eng === 'gold') { money += 1; agg.gold++; }
      if (t.eng === 'glass') { x *= 2; agg.glass++; }
    }
    if (t.eng === 'glass' && (info.preview ? false : rand() < 0.25)) ctx.shatter.push(t.id);
    ctx.chips += c; ctx.han += h; ctx.xmult *= x; ctx.money += money;
    ctx.hits.push({ id: t.id, chips: c, han: h, xmult: x, times, who });
  });
  L(`${tiles.length} tile${tiles.length === 1 ? '' : 's'}`, `+${agg.chips} Chips`, { chips: agg.chips, tiles: true });
  for (const [name, n] of Object.entries(agg.retrig)) L(`${name}: retrigger ×${n}`, 'tiles scored again', { info: true, tal: name });
  if (agg.red) L(`Red Five ×${agg.red}`, `+${agg.redHan} Han`, { han: agg.redHan, info: true });
  if (agg.dora) L(`Dora ×${agg.dora}`, `+${agg.dora} Han`, { han: agg.dora, info: true });
  if (agg.dm) L(`Dragon Mark ×${agg.dm}`, `+${agg.dm} Han`, { han: agg.dm, info: true });
  if (agg.jade) { const x = Math.pow(1.5, agg.jade); L(`Jade ×${agg.jade}`, `×${x} Mult`, { xmult: x, info: true }); }
  if (agg.gold) L(`Gold Foil ×${agg.gold}`, `+¥${agg.gold}`, { info: true });
  if (agg.glass) { const x = Math.pow(2, agg.glass); L(`Glass ×${agg.glass}`, `×${x} Mult`, { xmult: x, info: true }); }
  if (ctx.shatter.length) L(`Glass shattered ×${ctx.shatter.length}`, 'gone from your Wall', { info: true, bad: true });
  // ---- Yaku (complete hands)
  if (kind === 'hand') {
    const y = { list: info.yaku.list.slice(), han: info.yaku.han, yakuman: info.yaku.yakuman };
    // A tile claimed from the River (Kawauso) is the winning tile; it was never a Kan replacement draw.
    const claimT = info.claim ? tiles.find(t => t.id === info.claim) || null : null; ctx.claimed = !!claimT;
    const winT = claimT || winningTile(tiles.filter(t => !S.open.some(m => m.tiles.some(o => o.id === t.id))));
    if (winT && winT.rinshan && !claimT && !y.yakuman) { y.list.push({ key: 'rinshan', name: 'Rinshan Kaihou', han: 1 }); y.han += 1; }
    for (const yk of y.list) L(yk.name, `+${yk.han} Han`, { han: yk.han, yaku: true });
    ctx.han += y.han; ctx.yaku = y.list;
    if (y.han === 0) { ctx.han += 1; L('Complete Hand (no Yaku)', '+1 Han', { han: 1, yaku: true }); }
    for (const yk of y.list) { const b = S.scrolls.yaku[yk.key] || 0; if (b) { ctx.han += b; L(`Scroll: ${yk.name}`, `+${b} Han`, { han: b }); } }
    ctx.desc = y.list.length ? y.list.map(k => k.name).join(', ') : 'Complete Hand';
    // Furiten: the winning tile is the most recently drawn concealed tile in the played hand. If a copy of it sits in your River, the hand is in Furiten.
    // A claimed tile came out of your River, so it always counts as one copy there.
    const win = winT;
    const matches = win ? S.river.filter(t => t !== claimT && key(t) === key(win)).length + (claimT ? 1 : 0) : 0;
    ctx.winningTile = win ? tileName(win) : '';
    if (matches) {
      if (S.talismans.includes('kappa')) { ctx.chips += 100 * matches; L(`Kappa (${ctx.winningTile} ×${matches} in River)`, `+${100 * matches} Chips`, { chips: 100 * matches, tal: 'Kappa' }); }
      else ctx.furiten = true;
    }
  }
  // ---- Steel tiles kept in hand
  const steel = ctx.held.filter(t => t.eng === 'steel').length;
  if (steel) { const x = Math.pow(1.5, steel); ctx.xmult *= x; L(`Steel held ×${steel}`, `×${x} Mult`, { info: true }); }
  // ---- Talismans, pass 1: Han (feeds the Han table) in slot order
  const results = [];
  for (const k of S.talismans) {
    const src = talTarget(S, k); const d = Object.assign({}, src || {}, { name: TAL[k].name + (src && src !== TAL[k] ? ' → ' + src.name : '') });
    const r = src && src.onScore ? (src.onScore(ctx, S) || null) : null; const ed = S.editions && S.editions[k] && EDITIONS[S.editions[k]];
    results.push({ k, d, r, ed });
    if (r && r.han) { ctx.han += r.han; L(d.name, `+${r.han} Han`, { han: r.han, tal: d.name }); }
    if (ed && ed.han) { ctx.han += ed.han; L(`${d.name} (${ed.name})`, `+${ed.han} Han`, { han: ed.han, tal: d.name }); }
  }
  // ---- Han table: Han becomes the starting Mult. Tile multipliers (Jade, Glass) apply here.
  ctx.baseMult = hanMult(ctx.han); ctx.tier = tierName(ctx.han);
  ctx.mult = ctx.baseMult * ctx.xmult;
  L(`${ctx.han} Han → ×${ctx.baseMult}${ctx.xmult !== 1 ? ` · tiles ×${fmtX(ctx.xmult)}` : ''}`, `Mult ${fmtX(ctx.mult)}`, { convert: true });
  // ---- Talismans, pass 2: Chips, +Mult and ×Mult in slot order. Order matters: +Mult before ×Mult scores more.
  for (const { d, r, ed } of results) {
    const parts = []; const line = { chips: 0, mult: 0, xmult: 1, tal: d.name };
    if (r) {
      if (r.chips) { ctx.chips += r.chips; line.chips += r.chips; parts.push(`${sgn(r.chips)} Chips`); }
      if (r.mult) { ctx.mult += r.mult; line.mult += r.mult; parts.push(`${sgn(r.mult)} Mult`); }
      if (r.xmult) { ctx.mult *= r.xmult; line.xmult *= r.xmult; parts.push(`×${r.xmult} Mult`); }
      if (r.money) { ctx.money += r.money; parts.push(`+¥${r.money}`); }
    }
    if (parts.length) L(d.name, parts.join(', '), line);
    if (ed && (ed.chips || ed.xmult)) { const l2 = { chips: ed.chips || 0, mult: 0, xmult: ed.xmult || 1, tal: d.name }; const p2 = []; if (ed.chips) { ctx.chips += ed.chips; p2.push(`+${ed.chips} Chips`); } if (ed.xmult) { ctx.mult *= ed.xmult; p2.push(`×${ed.xmult} Mult`); } L(`${d.name} (${ed.name})`, p2.join(', '), l2); }
  }
  // ---- Boss and Furiten
  if (S.boss === 'wallbuilder' && kind === 'meld' && ctx.nMelds < 2) { ctx.chips = 0; L('The Wall-Builder', 'fewer than 2 melds: 0 Chips', { zero: true }); }
  if (S.boss === 'gatekeeper' && !S.firstPlayDone) { ctx.chips = 0; L('The Gatekeeper', 'first Play of the Blind: 0 Chips', { zero: true }); }
  if (ctx.furiten) { ctx.mult *= 0.5; L(ctx.claimed ? `Furiten (${ctx.winningTile} claimed from your River)` : `Furiten (${ctx.winningTile} is in your River)`, '×0.5 Mult', { xmult: 0.5 }); }
  ctx.mult = Math.round(ctx.mult * 100) / 100; ctx.chips = Math.max(0, ctx.chips);
  ctx.total = Math.floor(ctx.chips * ctx.mult);
  return ctx;
}
function fmtX(m) { return Number.isInteger(m) ? m : +m.toFixed(2); }

// ===================== SHANTEN (distance to a complete hand) =====================
// Returns -1 when the tiles already contain a complete hand, 0 when one tile away (tenpai), 1 when two away, etc.
// M = melds still needed from concealed tiles (4 minus open melds). Extra tiles beyond 14 are ignored.
function shantenRegular(counts, M) {
  let best = 2 * M;
  function dfs(i, m, t, p) {
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) { const mm = Math.min(m, M); let tt = t; if (mm + tt > M) tt = M - mm; const s = 2 * M - 2 * mm - tt - (p ? 1 : 0); if (s < best) best = s; return; }
    if (counts[i] >= 3) { counts[i] -= 3; dfs(i, m + 1, t, p); counts[i] += 3; }
    if (i < 27) for (const sh of CHI_SHAPES()) { const a = i + sh[1], b = i + sh[2]; if ((i % 9) + sh[2] > 8 || !counts[a] || !counts[b]) continue; counts[i]--; counts[a]--; counts[b]--; dfs(i, m + 1, t, p); counts[i]++; counts[a]++; counts[b]++; }
    if (!p && counts[i] >= 2) { counts[i] -= 2; dfs(i, m, t, true); counts[i] += 2; }
    if (m + t < M) {
      if (counts[i] >= 2) { counts[i] -= 2; dfs(i, m, t + 1, p); counts[i] += 2; }
      if (i < 27 && i % 9 <= 7 && counts[i + 1]) { counts[i]--; counts[i + 1]--; dfs(i, m, t + 1, p); counts[i]++; counts[i + 1]++; }
      if (i < 27 && i % 9 <= 6 && counts[i + 2]) { counts[i]--; counts[i + 2]--; dfs(i, m, t + 1, p); counts[i]++; counts[i + 2]++; }
    }
    counts[i]--; dfs(i, m, t, p); counts[i]++;
  }
  dfs(0, 0, 0, false);
  return Math.max(-1, best);
}
function handShanten(tiles, openCount) {
  const counts = new Array(34).fill(0); for (const t of tiles) counts[idx(t)]++;
  let s = shantenRegular(counts, 4 - openCount);
  if (openCount === 0) {
    let pairs = 0, kinds = 0; for (const c of counts) { if (c >= 2) pairs++; if (c > 0) kinds++; }
    s = Math.min(s, Math.max(-1, 6 - Math.min(7, pairs) + Math.max(0, 7 - kinds)));
    let d = 0, hp = false; for (const i of ORPHANS) { if (counts[i] > 0) d++; if (counts[i] >= 2) hp = true; }
    s = Math.min(s, Math.max(-1, 13 - d - (hp ? 1 : 0)));
  }
  return s;
}

// The most recently drawn tile among a set (draw order is stamped on tiles as they enter the hand).
function winningTile(tiles) { let w = null; for (const t of tiles) if (!w || (t.d || 0) > (w.d || 0)) w = t; return w; }
// Tile types that would complete the hand if drawn (only meaningful when one tile away).
function waitsOf(hand, openCount) {
  const out = []; for (let w = 0; w < 34; w++) { const t = tileFromIdx(w); if (handShanten(hand.concat([t]), openCount) === -1) out.push(w); } return out;
}
