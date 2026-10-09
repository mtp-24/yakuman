// ===================== TERMINOLOGY SWITCH =====================
let LANG = 'ja'; try { LANG = localStorage.getItem('yakuman.lang') === 'hk' ? 'hk' : 'ja'; } catch (e) { }
let SHOW_DOTS = true; try { SHOW_DOTS = localStorage.getItem('yakuman.dots') !== 'off'; } catch (e) { }
let HK_RE = null, HK_MAP = null;
function buildHK() {
  HK_MAP = Object.assign({}, HK_TERMS);
  for (const t of TALISMANS) if (HK_TALISMAN[t.key]) HK_MAP[t.name] = HK_TALISMAN[t.key];
  for (const c of [...OMIKUJI, ...KAMI]) if (HK_CONS[c.key]) HK_MAP[c.name] = HK_CONS[c.key];
  for (const sc of SCROLLS) if (HK_SCROLL[sc.key]) HK_MAP[sc.name] = HK_SCROLL[sc.key];
  for (const f of FLOWERS) if (HK_FLOWER[f.key]) HK_MAP[f.name] = HK_FLOWER[f.key];
  for (const [k, e] of Object.entries(ENG)) if (HK_ENG[k]) HK_MAP[e.name] = HK_ENG[k];
  for (const [k, b] of Object.entries(BOSSES)) if (HK_BOSS[k]) HK_MAP[b.name] = HK_BOSS[k];
  // English-only Hong Kong terms: strip the Chinese characters and drop entries that have no English gloss.
  for (const k of Object.keys(HK_MAP)) { const v = HK_MAP[k].replace(/[\u3000-\u9fff\uff00-\uffef]+\s*/g, '').trim(); if (v) HK_MAP[k] = v; else delete HK_MAP[k]; }
  const keys = Object.keys(HK_MAP).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  HK_RE = new RegExp('(?<![A-Za-z\\u00C0-\\u024F])(' + keys.join('|') + ')(?![A-Za-z\\u00C0-\\u024F])', 'g');
}
function tr(text) { if (LANG !== 'hk' || !text) return text; if (!HK_RE) buildHK(); return text.replace(HK_RE, m => HK_MAP[m]); }
// Translates text nodes in place and remembers the original so static markup (header, zone labels) can be restored when switching back.
function translateDOM(root) {
  if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) {
    if (n.parentElement && n.parentElement.closest('[data-notr]')) continue;
    if (LANG === 'hk') { const base = n.__orig !== undefined ? n.__orig : n.nodeValue; if (base && /[A-Za-z¥]/.test(base)) { const t = tr(base); if (t !== base) { if (n.__orig === undefined) n.__orig = base; n.nodeValue = t; } } }
    else if (n.__orig !== undefined) { n.nodeValue = n.__orig; delete n.__orig; }
  }
  root.querySelectorAll('[title]').forEach(e => {
    if (LANG === 'hk') { const base = e.__origTitle !== undefined ? e.__origTitle : e.title; const t = tr(base); if (t !== base) { if (e.__origTitle === undefined) e.__origTitle = base; e.title = t; } }
    else if (e.__origTitle !== undefined) { e.title = e.__origTitle; delete e.__origTitle; }
  });
}
function setLang(l) { LANG = l; try { localStorage.setItem('yakuman.lang', l); } catch (e) { } if (modalPinned) hideModal(); render(); }
// ===================== STATE =====================
let S = null;
const SAVE_KEY = 'yakuman.save.v1';
function newState() {
  const bosses = shuffle(Object.keys(BOSSES)).concat(shuffle(Object.keys(BOSSES)));
  return {
    phase: 'blind', deck: buildDeck(), wall: [], hand: [], river: [], open: [], played: [], selected: [], selRiver: null,
    ante: 1, blindIndex: 0, boss: null, bossOrder: bosses, target: 0, score: 0, plays: 0, discards: 0, money: CFG.startMoney,
    talismans: [], consumables: [], scrolls: { meld: {}, yaku: {} }, flowers: [], dora: [], indicators: [], pendingDiscard: 0,
    shop: null, lastPlay: null, bonusPlays: 0, bonusDiscards: 0, revealed: false, sortHand: true, selTal: null, talState: {}, editions: {}, busy: false, newIds: [], drawSeq: 0,
    stats: { best: 0, bestDesc: '', hands: 0, melds: 0, blinds: 0 }, reward: null, msg: '',
  };
}
const blindKind = () => ['small', 'big', 'boss'][S.blindIndex];
const hasF = k => S.flowers.includes(k);
const handSize = () => CFG.handSize + (hasF('plum') ? 1 : 0);
const capacity = () => handSize() - 3 * S.open.length;
const neededConcealed = () => 14 - 3 * S.open.length;
const conSlots = () => CFG.consumableSlots + (hasF('spring') ? 1 : 0);
const price = c => hasF('chrysanthemum') ? Math.max(1, Math.ceil(c * 0.8)) : c;
const rerollCost = () => hasF('autumn') ? 2 : CFG.rerollCost;
function talMod(f) { return S.talismans.reduce((a, k) => a + (TAL[k][f] || 0), 0); }
function selTiles() { return S.selected.map(id => S.hand.find(t => t.id === id)).filter(Boolean); }
function openTiles() { return S.open.flatMap(m => m.tiles); }

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

// ===================== BLIND FLOW =====================
function startBlind() {
  S.phase = 'blind';
  const kind = blindKind();
  S.boss = kind === 'boss' ? S.bossOrder[S.ante - 1] : null;
  S.target = Math.floor(CFG.anteBase[S.ante - 1] * CFG.blindMult[kind]);
  S.plays = Math.max(1, CFG.playsPerBlind + S.bonusPlays + talMod('plays') + (hasF('bamboo') ? 1 : 0));
  S.discards = CFG.discardsPerBlind + S.bonusDiscards + talMod('discards') + (hasF('orchid') ? 1 : 0);
  S.wall = shuffle(S.deck.slice()); S.deck = []; S.hand = []; S.river = []; S.open = []; S.played = [];
  S.selected = []; S.selRiver = null; S.dora = []; S.indicators = []; S.pendingDiscard = 0; S.revealed = false; S.score = 0; S.lastPlay = null; S.reward = null; S.selTal = null;
  draw();
  for (const k of S.talismans) if (TAL[k].onBlindStart) TAL[k].onBlindStart(S);
  setMsg(S.boss ? `${BOSSES[S.boss].name}: ${BOSSES[S.boss].desc}` : `${kind === 'small' ? 'Small' : 'Big'} Blind. Score ${S.target} to win.`);
}
function draw() { S.newIds = []; while (S.hand.length < capacity() && S.wall.length) { const t = S.wall.pop(); t.d = ++S.drawSeq; S.hand.push(t); S.newIds.push(t.id); } }
function drawReplacement() { if (!S.wall.length) return null; const t = S.wall.pop(); t.d = ++S.drawSeq; t.rinshan = true; S.hand.push(t); S.newIds.push(t.id); return t; }
function collectDeck() {
  S.deck = [...S.hand, ...S.wall, ...S.river, ...openTiles(), ...S.played, ...S.indicators];
  for (const t of S.deck) delete t.rinshan;
  S.hand = []; S.wall = []; S.river = []; S.open = []; S.played = []; S.indicators = []; S.dora = []; S.selected = []; S.selRiver = null;
}
function winBlind() {
  const kind = blindKind();
  const base = CFG.blindReward[kind], left = S.plays, interest = Math.min(hasF('winter') ? 10 : CFG.interestCap, Math.floor(S.money / CFG.interestPer));
  let tal = 0; for (const k of S.talismans) if (TAL[k].onBlindEnd) tal += TAL[k].onBlindEnd(S);
  const summer = hasF('summer') ? 2 : 0;
  const total = base + left + interest + tal + summer;
  S.money += total; S.stats.blinds++; S.msg = ''; S.msgErr = false;
  S.reward = { kind, base, left, interest, tal, summer, total };
  collectDeck();
  const finished = S.ante === CFG.antes && S.blindIndex === 2;
  S.blindIndex++; if (S.blindIndex > 2) { S.blindIndex = 0; S.ante++; }
  if (finished) { S.phase = 'win'; return; }
  genShop(); S.phase = 'shop';
}
function loseRun() { S.phase = 'gameover'; }
function newRun() { S = newState(); startBlind(); render(); }

// ===================== ACTIONS =====================
function setMsg(m, err) { S.msg = m; S.msgErr = !!err; }
function playOption() {
  if (S.pendingDiscard) return { err: `Settle your Call first: discard ${S.pendingDiscard} tile.` };
  if (S.plays <= 0) return { err: 'No Plays left.' };
  const sel = selTiles(); if (!sel.length) return { err: 'Select tiles to play.' };
  const need = neededConcealed();
  if (sel.length === need) {
    const best = bestHand(sel, S.open, S);
    if (best) return { type: 'hand', best, label: 'Play Complete Hand: ' + (best.yaku.list.length ? best.yaku.list.map(y => y.name).join(', ') : 'no Yaku') };
    return { err: `${need} tiles selected, but they are not a complete hand (${4 - S.open.length} melds + pair).` };
  }
  const part = partitionPlay(sel);
  if (part) { const r = rungInfo(part); return { type: 'meld', part, meldType: r.key, label: `Play ${r.name}` }; }
  if (sel.length === 2) return { err: 'Two tiles must be identical to play as a Pair.' };
  if (sel.length === 4) return { err: 'Four tiles must be a Kan or Two Pair.' };
  return { err: `Selection must split into melds (Chi, Pon, Kan) plus at most one pair, up to 4 melds. Or select ${need} tiles for a complete hand.` };
}
async function doPlay() {
  if (S.phase !== 'blind' || S.busy) return;
  const opt = playOption(); if (opt.err) { setMsg(opt.err, true); return render(); }
  const sel = S.hand.filter(t => S.selected.includes(t.id)); let ctx;
  if (opt.type === 'hand') { ctx = scoreCtx(S, 'hand', sel.concat(openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec }); S.stats.hands++; }
  else { ctx = scoreCtx(S, 'meld', sel, { part: opt.part }); S.stats.melds++; }
  S.busy = true; setMsg(''); render();
  await animateScore(ctx);
  S.busy = false;
  for (const k of S.talismans) if (TAL[k].afterScore) TAL[k].afterScore(ctx, S);
  S.plays--; S.score += ctx.total; S.money += ctx.money; S.lastPlay = ctx;
  if (ctx.total > S.stats.best) { S.stats.best = ctx.total; S.stats.bestDesc = ctx.desc; }
  const keep = t => !ctx.shatter.includes(t.id);
  S.played.push(...sel.filter(keep)); S.hand = S.hand.filter(t => !sel.includes(t));
  if (opt.type === 'hand') { S.played.push(...openTiles().filter(keep)); S.open = []; }
  S.selected = []; S.selRiver = null;
  popScore(ctx.total);
  setMsg(`${ctx.desc}: ${ctx.chips} × ${fmtMult(ctx.mult)} = ${ctx.total}${ctx.furiten ? ' (Furiten!)' : ''}${ctx.shatter.length ? ` · ${ctx.shatter.length} Glass tile${ctx.shatter.length > 1 ? 's' : ''} shattered` : ''}`);
  if (S.score >= S.target) { winBlind(); return render(); }
  draw();
  if (S.plays <= 0) { loseRun(); return render(); }
  render();
}
function doDiscard() {
  if (S.phase !== 'blind' || S.busy) return;
  const sel = selTiles();
  if (S.pendingDiscard) {
    if (sel.length !== S.pendingDiscard) { setMsg(`Discard exactly ${S.pendingDiscard} tile to settle the Call.`, true); return render(); }
    S.river.push(...sel); S.hand = S.hand.filter(t => !sel.includes(t)); S.pendingDiscard = 0; S.selected = []; draw(); setMsg('Call settled.'); return render();
  }
  if (S.discards <= 0) { setMsg('No Discards left.', true); return render(); }
  if (!sel.length) { setMsg('Select 1–' + CFG.maxDiscardTiles + ' tiles to discard.', true); return render(); }
  if (sel.length > CFG.maxDiscardTiles) { setMsg(`You can discard at most ${CFG.maxDiscardTiles} tiles at once.`, true); return render(); }
  if (S.boss === 'loanshark') {
    if (S.money < 1) { setMsg('The Loan Shark has locked your discards: ¥0 left.', true); return render(); }
    S.money -= 1;
  }
  S.discards--; S.river.push(...sel); S.hand = S.hand.filter(t => !sel.includes(t)); S.selected = []; draw();
  for (const k of S.talismans) if (TAL[k].onDiscard) TAL[k].onDiscard(S, sel);
  setMsg(`Discarded ${sel.length} tile${sel.length > 1 ? 's' : ''} to the River.`); render();
}
function doCall() {
  if (S.phase !== 'blind' || S.busy) return;
  if (S.pendingDiscard) { setMsg('Settle your previous Call first.', true); return render(); }
  const freeCall = S.talismans.some(k => TAL[k].freeCall);
  if (!freeCall && S.plays <= 1) { setMsg(S.plays <= 0 ? 'No Plays left.' : 'Calling would use your last Play and leave nothing to score with.', true); return render(); }
  const rt = S.river.find(t => t.id === S.selRiver); if (!rt) { setMsg('Select a tile in the River to call.', true); return render(); }
  const sel = selTiles(); if (sel.length < 2 || sel.length > 3) { setMsg('Select 2 or 3 hand tiles to meld with the River tile.', true); return render(); }
  if (S.open.length >= 4) { setMsg('You already have 4 open melds.', true); return render(); }
  const type = meldType([rt, ...sel]); if (!type) { setMsg('That River tile and your selection do not form a Chi, Pon or Kan.', true); return render(); }
  if (!freeCall) S.plays--; S.river = S.river.filter(t => t !== rt); S.hand = S.hand.filter(t => !sel.includes(t));
  S.open.push({ type, tiles: sortTiles([rt, ...sel]), calledId: rt.id }); S.selected = []; S.selRiver = null;
  for (const k of S.talismans) if (TAL[k].onCall) TAL[k].onCall(S);
  const rep = type === 'kan' ? drawReplacement() : null;
  S.pendingDiscard = Math.max(0, S.hand.length - capacity());
  const note = `Called ${MELD_LABEL[type]} (open)${freeCall ? ', no Play spent' : ''}${rep ? `. Replacement tile drawn: ${tileName(rep)}` : ''}`;
  if (S.pendingDiscard) setMsg(`${note}. Now discard ${S.pendingDiscard} tile to settle the Call.`); else { draw(); setMsg(note + '.'); }
  render();
}
function declareOption() {
  if (S.phase !== 'blind' || S.busy) return { err: '' };
  if (S.pendingDiscard) return { err: 'Settle your Call first.' };
  const sel = selTiles(); if (sel.length !== 4 || !sel.every(t => key(t) === key(sel[0]))) return { err: 'Select 4 identical tiles to declare a closed Kan.' };
  if (S.open.length >= 4) return { err: 'You already have 4 melds on the table.' };
  return { ok: true, sel };
}
function doDeclareKan() {
  const o = declareOption(); if (!o.ok) { if (o.err) setMsg(o.err, true); return render(); }
  const sel = o.sel; S.hand = S.hand.filter(t => !sel.includes(t));
  S.open.push({ type: 'kan', tiles: sortTiles(sel), calledId: null, closed: true }); S.selected = [];
  const rep = drawReplacement(); draw();
  setMsg(`Declared a closed Kan of ${isHonor(sel[0]) ? HONOR_EN[sel[0].rank] : sel[0].rank + ' ' + SUIT_EN[sel[0].suit]}. Hand stays closed.${rep ? ' Replacement tile drawn: ' + tileName(rep) + '.' : ''}`);
  render();
}
function useConsumable(i) {
  if (S.busy) return;
  const c = S.consumables[i]; const def = CONS[c.key];
  if (S.phase !== 'blind' && !def.anywhere) { setMsg('Use this during a Blind, with tiles in hand.', true); return render(); }
  const sel = S.phase === 'blind' ? selTiles() : [];
  if (sel.length < def.sel[0] || sel.length > def.sel[1]) { setMsg(def.sel[0] === def.sel[1] ? (def.sel[0] === 0 ? 'Clear your selection first.' : `Select exactly ${def.sel[0]} tile${def.sel[0] > 1 ? 's' : ''}.`) : `Select ${def.sel[0]}–${def.sel[1]} tiles.`, true); return render(); }
  const r = def.use(S, sel); if (r === false) { setMsg('That cannot be used right now.', true); return render(); }
  for (const t of S.hand) if (t.d === undefined) t.d = ++S.drawSeq;
  S.consumables.splice(i, 1); S.selected = []; if (S.phase === 'blind') draw();
  setMsg(`${def.name} used.`); render();
}
function talValue(k) { return TAL[k].cost + (S.editions[k] ? EDITIONS[S.editions[k]].price : 0); }
function sellTalisman(k) { const i = S.talismans.indexOf(k); if (i < 0) return; S.talismans.splice(i, 1); S.money += Math.max(1, Math.floor(talValue(k) / 2)); delete S.editions[k]; S.selTal = null; setMsg(`Sold ${TAL[k].name}.`); render(); }

// ===================== SHOP =====================
function rollCard() {
  const r = Math.random(), w = CFG.shopWeights;
  if (r < w.talisman) { const pool = TALISMANS.filter(t => !S.talismans.includes(t.key)); if (pool.length) return { kind: 'talisman', key: pick(pool).key, edition: rollEdition() }; }
  if (r < w.talisman + w.omikuji) return { kind: 'omikuji', key: pick(OMIKUJI).key };
  return { kind: 'kami', key: pick(KAMI).key };
}
function genShop() {
  const fl = FLOWERS.filter(f => !S.flowers.includes(f.key));
  S.shop = { cards: [rollCard(), rollCard()], scroll: { kind: 'scroll', key: pick(SCROLLS).key }, flower: fl.length ? { kind: 'flower', key: pick(fl).key } : null };
}
function itemDef(it) { return it.kind === 'talisman' ? TAL[it.key] : it.kind === 'scroll' ? SCR[it.key] : it.kind === 'flower' ? FLW[it.key] : CONS[it.key]; }
function buy(it) {
  const def = itemDef(it), p = price(def.cost + (it.edition ? EDITIONS[it.edition].price : 0));
  if (S.money < p) { setMsg(`Not enough YEN: ${def.name} costs ¥${p}.`, true); return render(); }
  if (it.kind === 'talisman') { if (S.talismans.length >= CFG.talismanSlots) { setMsg('All 5 Talisman slots are full. Sell one first.', true); return render(); } S.talismans.push(it.key); if (it.edition) S.editions[it.key] = it.edition; }
  else if (it.kind === 'omikuji' || it.kind === 'kami') { if (S.consumables.length >= conSlots()) { setMsg('Consumable slots are full. Use one first.', true); return render(); } S.consumables.push({ kind: it.kind, key: it.key }); }
  else if (it.kind === 'scroll') { const [t, k] = it.key.split(':'); S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] = (S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] || 0) + 1; }
  else if (it.kind === 'flower') { S.flowers.push(it.key); }
  S.money -= p; it.sold = true; setMsg(`Bought ${def.name}.`); render();
}
function reroll() { const c = rerollCost(); if (S.money < c) { setMsg(`Reroll costs ¥${c}.`, true); return render(); } S.money -= c; S.shop.cards = [rollCard(), rollCard()]; render(); }

// ===================== RENDER =====================
const $ = s => document.querySelector(s);
function fmtMult(m) { return Number.isInteger(m) ? m : (+m.toFixed(2)); }
function tileEl(t, o = {}) {
  const el = document.createElement('div');
  el.className = 'tile ' + t.suit + (t.red ? ' red' : '') + (t.eng === 'glass' ? ' glass' : '') + (o.sel ? ' sel' : '') + (o.small ? ' small' : '') + (o.back ? ' back' : '') + (o.called ? ' called' : '');
  if (!o.back) {
    el.innerHTML = tileSVG(t);
    if (t.eng) el.innerHTML += `<span class="eng eng-${t.eng}">${ENG[t.eng].short}</span>`;
    el.title = tileName(t) + (t.eng ? ' · ' + ENG[t.eng].name + ': ' + ENG[t.eng].desc : '');
  } else el.title = 'Face down: a 1, 9, Wind or Dragon (The Purist)';
  return el;
}
// ---- Tile faces: Man = Chinese numeral over 萬, Pin = circles, Sou = bamboo sticks (1-Sou is the bird), honors = kanji.
const CJK_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const PIN_LAYOUT = {
  1: [[27, 37, 14]], 2: [[27, 22, 9], [27, 52, 9]], 3: [[13, 18, 8], [27, 37, 8], [41, 56, 8]],
  4: [[16, 24, 8], [38, 24, 8], [16, 50, 8], [38, 50, 8]], 5: [[16, 22, 7], [38, 22, 7], [27, 37, 7], [16, 52, 7], [38, 52, 7]],
  6: [[16, 18, 7], [38, 18, 7], [16, 37, 7], [38, 37, 7], [16, 56, 7], [38, 56, 7]],
  7: [[12, 15, 6], [27, 21, 6], [42, 27, 6], [16, 46, 6], [38, 46, 6], [16, 62, 6], [38, 62, 6]],
  8: [[16, 13, 6], [38, 13, 6], [16, 29, 6], [38, 29, 6], [16, 45, 6], [38, 45, 6], [16, 61, 6], [38, 61, 6]],
  9: [[13, 18, 6], [27, 18, 6], [41, 18, 6], [13, 37, 6], [27, 37, 6], [41, 37, 6], [13, 56, 6], [27, 56, 6], [41, 56, 6]],
};
const SOU_LAYOUT = {
  2: [[27, 22], [27, 52]], 3: [[27, 20], [16, 54], [38, 54]], 4: [[16, 22], [38, 22], [16, 52], [38, 52]],
  5: [[16, 20], [38, 20], [27, 37, 1], [16, 54], [38, 54]], 6: [[13, 22], [27, 22], [41, 22], [13, 52], [27, 52], [41, 52]],
  7: [[27, 15, 1], [13, 38], [27, 38], [41, 38], [13, 60], [27, 60], [41, 60]],
  8: [[11, 22], [22, 22], [33, 22], [44, 22], [11, 52], [22, 52], [33, 52], [44, 52]],
  9: [[13, 15], [27, 15], [41, 15], [13, 37, 1], [27, 37, 1], [41, 37, 1], [13, 59], [27, 59], [41, 59]],
};
function tileSVG(t) {
  const red = '#d12c1f', blue = '#1f4f8f', green = '#2e7d4f', ink = '#1b1b1b';
  let body = '';
  const small = n => `<text x="5" y="11" font-size="9" font-family="IBM Plex Sans, sans-serif" font-weight="600" fill="${t.red ? red : '#7a6e52'}">${n}</text>`;
  if (t.suit === 'z') {
    if (t.rank === 5) body = `<rect x="11" y="14" width="32" height="46" rx="3" fill="none" stroke="${blue}" stroke-width="3"/>`;
    else { const col = t.rank === 6 ? green : t.rank === 7 ? red : ink; body = `<text x="27" y="50" text-anchor="middle" font-size="34" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${col}">${HONOR_NAMES[t.rank]}</text>`; if (t.rank <= 4) body += `<text x="5" y="11" font-size="9" font-family="IBM Plex Sans, sans-serif" font-weight="600" fill="#7a6e52">${'ESWN'[t.rank - 1]}</text>`; }
  } else if (t.suit === 'm') {
    body = small(t.rank) + `<text x="27" y="34" text-anchor="middle" font-size="24" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${t.red ? red : ink}">${CJK_NUM[t.rank]}</text><text x="27" y="62" text-anchor="middle" font-size="24" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${red}">萬</text>`;
  } else if (t.suit === 'p') {
    body = small(t.rank);
    PIN_LAYOUT[t.rank].forEach(([x, y, r], i) => { const ring = t.red ? red : (i % 2 ? green : blue); body += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${ring}" stroke-width="${Math.max(2, r * 0.3)}"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="${t.red ? red : (i % 2 ? blue : green)}"/>`; });
  } else {
    body = small(t.rank);
    if (t.rank === 1) {
      const c = t.red ? red : green;
      body += `<path d="M27 56 C18 56 14 48 16 40 C18 32 24 30 27 30 C30 30 36 32 38 40 C40 48 36 56 27 56 Z" fill="${c}"/><circle cx="27" cy="25" r="6" fill="${c}"/><path d="M31 23 L38 25 L31 27 Z" fill="${red}"/><path d="M24 17 L27 11 L30 17" stroke="${red}" stroke-width="2" fill="none"/><path d="M20 56 L12 66 M27 57 L27 67 M34 56 L42 66" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`;
    } else {
      SOU_LAYOUT[t.rank].forEach(([x, y, r]) => { const c = (r || t.red) ? red : green; body += `<rect x="${x - 3.5}" y="${y - 9}" width="7" height="18" rx="3" fill="${c}"/><line x1="${x - 3.5}" y1="${y - 3}" x2="${x + 3.5}" y2="${y - 3}" stroke="#fff" stroke-width="1.4"/><line x1="${x - 3.5}" y1="${y + 3}" x2="${x + 3.5}" y2="${y + 3}" stroke="#fff" stroke-width="1.4"/>`; });
    }
  }
  return `<svg viewBox="0 0 54 74" aria-hidden="true">${body}</svg>`;
}
function render() {
  if (!S) return;
  $('#hdrRound').innerHTML = `Ante <b>${Math.min(S.ante, CFG.antes)}</b> / ${CFG.antes} · ${S.phase === 'blind' ? ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss' })[blindKind()] : S.phase === 'shop' ? 'Shop' : ''}`;
  $('#hdrMoney').innerHTML = `YEN <b class="num">¥${S.money}</b>`;
  renderBlind(); renderTalismans(); renderConsumables(); renderOpen(); renderRiver(); renderHand(); renderActions(); renderLast();
  $('#msg').textContent = S.msg || ''; $('#msg').className = 'msg' + (S.msgErr ? ' err' : '');
  if (S.phase === 'shop') showModal(shopHTML()); else if (S.phase === 'gameover') showModal(overHTML(false)); else if (S.phase === 'win') showModal(overHTML(true)); else if (!modalPinned) hideModal();
  $('#btnLang').textContent = LANG === 'hk' ? 'Riichi terms' : 'HK terms';
  $('#btnYaku').textContent = LANG === 'hk' ? 'Faan' : 'Yaku';
  translateDOM($('#app'));
  save();
}
function renderBlind() {
  const kind = blindKind(); const inBlind = S.phase === 'blind';
  const name = inBlind && S.boss ? BOSSES[S.boss].name : ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[kind];
  const pct = S.target ? Math.min(100, 100 * S.score / S.target) : 0;
  let h = `<div class="label">Ante ${Math.min(S.ante, CFG.antes)} · ${inBlind ? 'Current blind' : 'Next up'}</div><div class="blind-name${S.boss && inBlind ? ' boss' : ''}">${name}</div>`;
  if (inBlind && S.boss) h += `<div class="boss-desc">${BOSSES[S.boss].desc}</div>`;
  h += `<div class="label" style="margin-top:8px">Score at least</div><div class="target num">${inBlind ? S.target.toLocaleString() : Math.floor(CFG.anteBase[Math.min(S.ante, CFG.antes) - 1] * CFG.blindMult[kind]).toLocaleString()}</div>`;
  if (inBlind) h += `<div class="bar"><i style="width:${pct}%"></i></div><div class="num" style="font-size:13px">Scored <b style="color:var(--accent)">${S.score.toLocaleString()}</b></div>`;
  h += `<div class="stats"><div class="stat plays"><div class="label">Plays</div><div class="v num">${S.plays}</div></div><div class="stat discards"><div class="label">Discards</div><div class="v num">${S.discards}</div></div><div class="stat money"><div class="label">YEN</div><div class="v num">¥${S.money}</div></div><div class="stat"><div class="label">Wall</div><div class="v num">${S.wall.length}</div></div></div>`;
  if (S.indicators.length) { h += `<div class="label" style="margin-top:8px">Dora indicators</div><div class="dora-ind" id="doraRow"></div>`; }
  if (S.flowers.length) h += `<div class="label" style="margin-top:8px">Flowers &amp; Seasons</div><div class="flowers">${S.flowers.map(f => `<span class="flowerchip" title="${FLW[f].desc}">${FLW[f].name}</span>`).join('')}</div>`;
  const sc = Object.entries(S.scrolls.meld).filter(([, v]) => v).map(([k, v]) => `${MELD_LABEL[k]} Lv.${v + 1}`).concat(Object.entries(S.scrolls.yaku).filter(([, v]) => v).map(([k, v]) => `${k} +${v}`));
  if (sc.length) h += `<div class="label" style="margin-top:8px">Mastery</div><div style="font-size:12px">${sc.join(' · ')}</div>`;
  $('#blindCard').innerHTML = h;
  if (S.indicators.length) { const row = $('#doraRow'); for (const t of S.indicators) { const e = tileEl(t, { small: true }); e.style.cursor = 'default'; const d = tileFromIdx(nextDora(idx(t))); e.title = 'Indicator: ' + tileName(t) + ' → Dora is ' + tileName(d); row.appendChild(e); } row.insertAdjacentHTML('beforeend', `<span class="muted" style="font-size:11px">Dora: ${S.dora.map(i => tileName(tileFromIdx(i))).join(', ')}</span>`); }
}
function renderTalismans() {
  const box = $('#talismans'); box.innerHTML = '';
  $('#talCount').textContent = `${S.talismans.length} / ${CFG.talismanSlots} · fire left to right, drag to reorder`;
  for (let i = 0; i < CFG.talismanSlots; i++) {
    const k = S.talismans[i]; const el = document.createElement('div');
    if (k) { const ed = S.editions[k]; el.className = 'slot filled' + (S.selTal === k ? ' sel' : '') + (ed ? ' ed-' + ed : ''); el.dataset.tal = TAL[k].name; el.innerHTML = `<div class="n"><span class="order">${i + 1}</span>${TAL[k].name}${ed ? ` <span class="edtag ed-${ed}">${EDITIONS[ed].name}</span>` : ''}</div><div class="d">${TAL[k].desc}${ed ? ` <b>${EDITIONS[ed].desc}.</b>` : ''}${TAL[k].status ? ' <b>(' + TAL[k].status(S) + ')</b>' : ''}</div>`; bindSlotDrag(el, k); }
    else { el.className = 'slot'; el.innerHTML = `<div class="d">Empty slot</div>`; }
    box.appendChild(el);
  }
  const ts = $('#talSell'); ts.innerHTML = '';
  if (S.selTal && S.talismans.includes(S.selTal)) { const b = document.createElement('button'); b.className = 'ghost'; b.style.cssText = 'padding:3px 8px;font-size:12px'; b.textContent = `Sell ${TAL[S.selTal].name} for ¥${Math.max(1, Math.floor(talValue(S.selTal) / 2))}`; b.onclick = () => sellTalisman(S.selTal); ts.appendChild(b); }
}
function renderConsumables() {
  const box = $('#consumables'); box.innerHTML = ''; $('#conCount').textContent = `${S.consumables.length} / ${conSlots()} · click to use on selected tiles`;
  for (let i = 0; i < conSlots(); i++) {
    const c = S.consumables[i]; const el = document.createElement('div');
    if (c) { const d = CONS[c.key]; el.className = 'slot filled ' + c.kind; el.innerHTML = `<div class="n">${d.name}<span class="tag">${c.kind === 'kami' ? 'Kami' : 'Omikuji'}</span></div><div class="d">${d.desc}</div>`; el.onclick = () => useConsumable(i); }
    else { el.className = 'slot'; el.innerHTML = `<div class="d">Empty slot</div>`; }
    box.appendChild(el);
  }
}
function renderOpen() {
  const box = $('#open'); box.innerHTML = '';
  const allClosed = S.open.every(m => m.closed);
  $('#openInfo').textContent = S.open.length ? (allClosed ? `${S.open.length} declared · hand is still closed for Yaku` : `${S.open.length} on the table · hand is Open for Yaku`) : 'None. Hand is closed.';
  for (const m of S.open) { const w = document.createElement('div'); w.className = 'meld' + (m.closed ? ' closedmeld' : ''); w.innerHTML = `<span class="mt">${m.closed ? 'CLOSED ' : ''}${MELD_LABEL[m.type].toUpperCase()}</span>`; for (const t of m.tiles) w.appendChild(tileEl(t, { small: true, called: t.id === m.calledId })); box.appendChild(w); }
}
function renderRiver() {
  const box = $('#river'); box.innerHTML = '';
  for (const t of S.river) { const e = tileEl(t, { small: true, sel: S.selRiver === t.id }); e.onclick = () => { if (S.phase !== 'blind') return; S.selRiver = S.selRiver === t.id ? null : t.id; render(); }; box.appendChild(e); }
  if (!S.river.length) box.innerHTML = '<span class="muted" style="font-size:12px;align-self:center">Empty</span>';
}
function renderHand() {
  const box = $('#hand'); box.innerHTML = '';
  const hidden = S.boss === 'purist' && !S.revealed && S.phase === 'blind';
  if (S.sortHand && !hidden) S.hand = sortTiles(S.hand);
  const tiles = S.hand;
  for (const t of tiles) { const e = tileEl(t, { sel: S.selected.includes(t.id), back: hidden && (isHonor(t) || isTerminal(t)) }); if (S.newIds.includes(t.id)) e.classList.add('arrive'); e.dataset.id = t.id; bindTileDrag(e, t); box.appendChild(e); }
  S.newIds = [];
  const over = S.hand.length - capacity();
  $('#handInfo').textContent = (over > 0 ? `${S.hand.length} tiles (${over} over the limit of ${capacity()}: no draw until you are back under it)` : `${S.hand.length} / ${capacity()} tiles`) + ` · ${S.selected.length} selected · complete hand needs ${neededConcealed()} from hand`;
  renderHint(hidden);
  $('#btnSort').textContent = hidden ? 'Manual order' : (S.sortHand ? 'Auto-sort on' : 'Sort hand'); $('#btnSort').disabled = hidden; $('#btnSort').title = S.sortHand ? 'New tiles are sorted in. Drag a tile to switch to manual order.' : 'Sort the hand now and keep it sorted. Drag tiles to reorder.';
  $('#btnDots').textContent = SHOW_DOTS ? 'Dots on' : 'Dots off'; $('#btnDots').title = 'Green dots mark tiles you can discard without losing progress';
}
// Greedy set of tiles that can all be discarded together without raising shanten. Isolated tiles are tried first.
function deadTiles(hand, openCount, sh, limit) {
  const partners = t => hand.filter(o => o !== t && (key(o) === key(t) || (!isHonor(t) && o.suit === t.suit && Math.abs(o.rank - t.rank) <= 2))).length;
  let rest = hand.slice().sort((a, b) => (partners(a) + (a.red ? 0.5 : 0)) - (partners(b) + (b.red ? 0.5 : 0))); const out = [];
  while (out.length < limit) {
    let found = null;
    for (const t of rest) { if (handShanten(rest.filter(x => x !== t), openCount) === sh) { found = t; break; } }
    if (!found) break; out.push(found); rest = rest.filter(x => x !== found);
  }
  return out;
}
function renderHint(hidden) {
  const box = $('#hint');
  if (S.phase !== 'blind' || !S.hand.length) { box.innerHTML = ''; return; }
  // Under The Purist only the visible (simple) tiles are counted; hidden tiles are treated as unknown, so this is a "no better than" estimate.
  const vis = hidden ? S.hand.filter(t => !(isHonor(t) || isTerminal(t))) : S.hand;
  const sh = handShanten(vis, S.open.length);
  const away = n => n === -1 ? 'Complete hand ready' : n === 0 ? '1 tile away (tenpai)' : `${n + 1} tiles away`;
  let h = `<span class="hint-main ${sh <= 0 ? 'good' : ''}">${hidden ? 'Visible tiles: at least ' + away(sh).toLowerCase() : away(sh)}</span>`;
  if (hidden) h += ` <span class="hint-sel muted">· face-down tiles are 1s, 9s, Winds or Dragons and are not counted</span>`;
  if (!hidden && sh === 0) {
    const waits = waitsOf(S.hand, S.open.length); const riverKeys = new Set(S.river.map(key));
    const names = waits.map(w => { const t = tileFromIdx(w); const f = riverKeys.has(key(t)); return `<span class="${f ? 'bad' : ''}">${tileName(t)}${f ? ' (in River: Furiten)' : ''}</span>`; });
    if (names.length) h += ` <span class="hint-sel">· waiting on ${names.join(', ')}</span>`;
  }
  const sel = selTiles().filter(t => vis.includes(t));
  if (!hidden && sel.length === neededConcealed()) {
    const best = bestHand(sel, S.open, S);
    if (best) { const win = winningTile(sel); const f = win && S.river.some(t => key(t) === key(win)); h += ` <span class="hint-sel ${f ? 'bad' : 'good'}">· complete hand, winning tile ${tileName(win)}${win && win.rinshan ? ' (Kan replacement: Rinshan Kaihou +1 Han)' : ''}${f ? (S.talismans.includes('kappa') ? ' is in your River: Kappa bonus' : ' is in your River: Furiten, ×0.5') : ''}</span>`; box.innerHTML = h; return; }
  }
  if (sel.length && sel.length < vis.length) {
    const rest = vis.filter(t => !sel.includes(t)); const sh2 = handShanten(rest, S.open.length);
    h += ` <span class="hint-sel ${sh2 > sh ? 'bad' : 'good'}">· without ${sel.length === 1 ? 'this tile' : 'these'}: ${sh2 > sh ? 'sets you back to ' + away(sh2).toLowerCase() : 'safe, still ' + away(sh2).toLowerCase()}</span>`;
  } else if (SHOW_DOTS) h += ` <span class="hint-sel muted">· dotted tiles are dead weight: all of them can go without losing progress</span>`;
  box.innerHTML = h;
  // mark single tiles whose removal does not raise shanten
  if (sh >= 0 && SHOW_DOTS) { const dead = deadTiles(vis, S.open.length, sh, CFG.maxDiscardTiles); const els = $('#hand').children; const tiles = S.hand; for (let i = 0; i < tiles.length; i++) if (dead.includes(tiles[i])) els[i].classList.add('safe'); }
}
function renderActions() {
  const inBlind = S.phase === 'blind';
  const opt = inBlind ? playOption() : { err: '' };
  const bp = $('#btnPlay'); bp.disabled = !inBlind || !!opt.err || S.busy; bp.textContent = opt.type ? opt.label : 'Play'; bp.title = opt.err || '';
  const bd = $('#btnDiscard'); bd.disabled = !inBlind || S.busy || (!S.pendingDiscard && S.discards <= 0); bd.textContent = S.pendingDiscard ? `Discard ${S.pendingDiscard} to settle the Call` : `Discard (${S.discards})`;
  const dk = $('#btnKan'); const dko = declareOption(); dk.disabled = !dko.ok; dk.title = dko.err || 'Set these 4 tiles aside as a closed Kan and draw a replacement tile';
  const pv = $('#preview');
  if (inBlind && opt.type && !S.busy) {
    const sel = S.hand.filter(t => S.selected.includes(t.id));
    const ctx = opt.type === 'hand' ? scoreCtx(S, 'hand', sel.concat(openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec }) : scoreCtx(S, 'meld', sel, { part: opt.part });
    const pct = S.target ? ctx.total / S.target : 0;
    pv.innerHTML = `<span class="pchips num">${ctx.chips}</span><span class="px">×</span><span class="pmult num">${fmtMult(ctx.mult)}</span><span class="px">=</span><span class="ptot num${pct >= 1 ? ' hot' : ''}">${ctx.total.toLocaleString()}</span><span class="muted">${ctx.han} Han · ${ctx.tier}${ctx.furiten ? ' · Furiten' : ''}</span>`;
  } else pv.innerHTML = '';
  $('#btnCall').disabled = !inBlind || S.busy || !S.selRiver || S.selected.length < 2;
  $('#btnClear').disabled = !inBlind || S.busy;
}
function renderLast() {
  const c = S.lastPlay; const box = $('#lastPlay');
  if (!c) { box.innerHTML = `<div class="label">Last play</div><div class="muted" style="font-size:12px;margin-top:4px">Nothing scored yet. Best this run: ${S.stats.best.toLocaleString()}${S.stats.bestDesc ? ' (' + S.stats.bestDesc + ')' : ''}</div>`; return; }
  let h = `<div class="label">Last play</div><div style="font-family:var(--display);font-size:15px;margin:2px 0 6px">${c.desc}</div>`;
  if (c.kind === 'meld' && c.nMelds >= 2) h += `<div class="muted" style="font-size:11px;margin:-4px 0 6px">${c.nChi ? c.nChi + ' Chi ' : ''}${c.nPon ? c.nPon + ' Pon ' : ''}${c.nKan ? c.nKan + ' Kan ' : ''}${c.hasPair ? '+ pair' : ''}</div>`;
  for (const l of c.lines) h += `<div class="row"><span>${l.label}</span><span class="num">${l.val}</span></div>`;
  h += `<div class="formula num" style="margin-top:6px">${c.han} Han → ${c.tier} ×${c.baseMult}${c.xmult !== 1 ? ` · tiles ×${fmtMult(c.xmult)}` : ''}${c.mult !== c.baseMult * c.xmult ? ` → ×${fmtMult(c.mult)} after Talismans${c.furiten ? ' and Furiten' : ''}` : ''}</div>`;
  h += `<div class="total num">${c.chips} × ${fmtMult(c.mult)} = ${c.total.toLocaleString()}</div>`;
  box.innerHTML = h;
}
function popScore(n) { const p = document.createElement('div'); p.className = 'score-pop num'; p.textContent = '+' + n.toLocaleString(); $('#pop').appendChild(p); setTimeout(() => p.remove(), 1500); }

// ===================== HAND DRAG & DROP =====================
let drag = null;
function dropIndex(x, y, skipEl) {
  const els = [...$('#hand').children].filter(e => e !== skipEl);
  for (let i = 0; i < els.length; i++) { const r = els[i].getBoundingClientRect(); if (y < r.top - 6) return i; if (y <= r.bottom + 6 && x < r.left + r.width / 2) return i; }
  return els.length;
}
function markDrop(idx, skipEl) { const els = [...$('#hand').children].filter(e => e !== skipEl); els.forEach(e => e.classList.remove('drop-before', 'drop-after')); if (idx < els.length) els[idx].classList.add('drop-before'); else if (els.length) els[els.length - 1].classList.add('drop-after'); }
function bindTileDrag(el, t) {
  el.addEventListener('pointerdown', e => { if (S.phase !== 'blind' || S.busy || e.button) return; drag = { t, el, x: e.clientX, y: e.clientY, moved: false }; try { el.setPointerCapture(e.pointerId); } catch (err) { } });
  el.addEventListener('pointermove', e => {
    if (!drag || drag.el !== el) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; el.classList.add('dragging'); }
    if (drag.moved) { el.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`; markDrop(dropIndex(e.clientX, e.clientY, el), el); }
  });
  const finish = e => {
    if (!drag || drag.el !== el) return; const d = drag; drag = null; el.style.transform = ''; el.classList.remove('dragging'); [...$('#hand').children].forEach(x => x.classList.remove('drop-before', 'drop-after'));
    if (d.moved && e.type === 'pointerup') { const idx = dropIndex(e.clientX, e.clientY, el); const rest = S.hand.filter(x => x !== d.t); rest.splice(idx, 0, d.t); S.hand = rest; S.sortHand = false; render(); }
    else if (!d.moved && e.type === 'pointerup') { S.selected = S.selected.includes(t.id) ? S.selected.filter(x => x !== t.id) : [...S.selected, t.id]; render(); }
  };
  el.addEventListener('pointerup', finish); el.addEventListener('pointercancel', finish);
}
// Talisman slots: drag to reorder (they fire left to right), tap to select for selling.
let slotDrag = null;
function bindSlotDrag(el, k) {
  el.addEventListener('pointerdown', e => { if (S.busy || e.button) return; slotDrag = { k, el, x: e.clientX, y: e.clientY, moved: false }; try { el.setPointerCapture(e.pointerId); } catch (err) { } });
  el.addEventListener('pointermove', e => {
    if (!slotDrag || slotDrag.el !== el) return; const dx = e.clientX - slotDrag.x, dy = e.clientY - slotDrag.y;
    if (!slotDrag.moved && Math.hypot(dx, dy) > 8) { slotDrag.moved = true; el.classList.add('dragging'); }
    if (slotDrag.moved) { el.style.transform = `translate(${dx}px,${dy}px)`; const others = [...$('#talismans').children].filter(x => x !== el && x.classList.contains('filled')); others.forEach(x => x.classList.remove('drop-before', 'drop-after')); const idx = slotDropIndex(e.clientX, e.clientY, el); if (idx < others.length) others[idx].classList.add('drop-before'); else if (others.length) others[others.length - 1].classList.add('drop-after'); }
  });
  const finish = e => {
    if (!slotDrag || slotDrag.el !== el) return; const d = slotDrag; slotDrag = null; el.style.transform = ''; el.classList.remove('dragging'); [...$('#talismans').children].forEach(x => x.classList.remove('drop-before', 'drop-after'));
    if (d.moved && e.type === 'pointerup') { const idx = slotDropIndex(e.clientX, e.clientY, el); const rest = S.talismans.filter(x => x !== d.k); rest.splice(idx, 0, d.k); S.talismans = rest; render(); }
    else if (!d.moved && e.type === 'pointerup') { S.selTal = S.selTal === k ? null : k; render(); }
  };
  el.addEventListener('pointerup', finish); el.addEventListener('pointercancel', finish);
}
function slotDropIndex(x, y, skipEl) {
  const els = [...$('#talismans').children].filter(e => e !== skipEl && e.classList.contains('filled'));
  for (let i = 0; i < els.length; i++) { const r = els[i].getBoundingClientRect(); if (y < r.top - 6) return i; if (y <= r.bottom + 6 && x < r.left + r.width / 2) return i; }
  return els.length;
}
// ===================== SCORING ANIMATION =====================
const motionOK = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let skipAnim = false;
function wait(ms) { return new Promise(r => setTimeout(r, (motionOK && !skipAnim) ? ms : 0)); }
async function animateScore(ctx) {
  const stage = $('#stage'); skipAnim = false; stage.hidden = false;
  stage.innerHTML = `<div class="stage-inner"><div class="stage-title">${ctx.rungName || ''}${ctx.kind === 'hand' ? ' · ' + ctx.desc : ''}</div><div class="stage-tiles"></div><div class="stage-lines"></div><div class="stage-math num"><span class="chips">0</span><span class="x">×</span><span class="mult">1</span><span class="eq">=</span><span class="tot">0</span></div><div class="stage-skip muted">click to skip</div></div>`;
  stage.onclick = () => { skipAnim = true; };
  translateDOM(stage);
  const tilesBox = stage.querySelector('.stage-tiles'), linesBox = stage.querySelector('.stage-lines');
  const chipsEl = stage.querySelector('.chips'), multEl = stage.querySelector('.mult'), totEl = stage.querySelector('.tot');
  const tileMap = new Map(ctx.tiles.map(t => [t.id, t])); const tileEls = new Map();
  for (const h of ctx.hits) { const e = tileEl(tileMap.get(h.id), { small: true }); tilesBox.appendChild(e); tileEls.set(h.id, e); }
  let chips = 0, han = 0, tileX = 1, mult = null;
  const curMult = () => mult === null ? hanMult(han) * tileX : mult;
  const setMath = () => { chipsEl.textContent = Math.max(0, Math.round(chips)); multEl.textContent = fmtMult(curMult()); totEl.textContent = Math.floor(Math.max(0, chips) * curMult()).toLocaleString(); };
  const showLine = l => { const d = document.createElement('div'); d.className = 'sline' + (l.zero ? ' bad' : '') + (l.yaku ? ' yaku' : '') + (l.tal ? ' tal' : '') + (l.convert ? ' convert' : ''); d.innerHTML = `<span>${tr(l.label)}</span><span class="num">${tr(l.val)}</span>`; linesBox.appendChild(d); linesBox.scrollTop = linesBox.scrollHeight; if (l.tal) { const slot = document.querySelector(`.slot[data-tal="${l.tal}"]`); if (slot) { slot.classList.remove('bounce'); void slot.offsetWidth; slot.classList.add('bounce'); } } };
  const applyLine = l => { if (l.zero) chips = 0; else { chips += l.chips || 0; han += l.han || 0; if (l.convert) mult = hanMult(han) * tileX; if (l.mult) mult = (mult === null ? hanMult(han) * tileX : mult) + l.mult; if (l.xmult && mult !== null) mult *= l.xmult; } setMath(); };
  setMath();
  const base = ctx.lines.find(l => l.base); if (base) { showLine(base); applyLine(base); await wait(260); }
  const mathEl = stage.querySelector('.stage-math'); let fire = 0;
  const heat = () => { const tot = Math.max(0, chips) * curMult(); const lvl = S.target && tot >= 3 * S.target ? 2 : S.target && tot >= S.target ? 1 : 0; if (lvl !== fire) { fire = lvl; mathEl.classList.toggle('hot', lvl >= 1); mathEl.classList.toggle('blazing', lvl >= 2); if (lvl >= 1 && !stage.querySelector('.ember')) for (let i = 0; i < 10; i++) { const em = document.createElement('i'); em.className = 'ember'; em.style.left = (8 + Math.random() * 84) + '%'; em.style.animationDelay = (Math.random() * 1.2) + 's'; em.style.animationDuration = (1 + Math.random()) + 's'; stage.querySelector('.stage-inner').appendChild(em); } } };
  for (const h of ctx.hits) {
    const e = tileEls.get(h.id); const per = { chips: h.chips / h.times, han: h.han / h.times, x: Math.pow(h.xmult, 1 / h.times) };
    for (let r = 0; r < h.times; r++) {
      e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit');
      const f = document.createElement('div'); f.className = 'float num' + (r ? ' again' : ''); f.textContent = (r ? 'Again! ' : '') + `+${Math.round(per.chips)}` + (per.han ? tr(` · +${per.han} Han`) : '') + (per.x !== 1 ? ` · ×${fmtMult(per.x)}` : ''); e.appendChild(f);
      chips += per.chips; han += per.han; tileX *= per.x; setMath(); heat();
      await wait(r ? 200 : 95);
    }
    e.classList.remove('hit');
  }
  for (const l of ctx.lines) { if (l.base || l.tiles) continue; showLine(l); if (!l.info) applyLine(l); heat(); await wait(l.yaku ? 260 : 180); }
  chips = ctx.chips; han = ctx.han; mult = ctx.mult; setMath(); heat(); totEl.textContent = ctx.total.toLocaleString();
  totEl.classList.add('final'); await wait(ctx.kind === 'hand' ? 900 : 550);
  stage.hidden = true; stage.innerHTML = ''; skipAnim = false;
}
// ===================== MODALS =====================
let modalPinned = false;
function showModal(html, pinned) { modalPinned = !!pinned; $('#modal').innerHTML = html; $('#overlay').hidden = false; translateDOM($('#modal')); }
function hideModal() { modalPinned = false; $('#overlay').hidden = true; }
function cardHTML(it, idx) {
  const d = itemDef(it); const p = price(d.cost + (it.edition ? EDITIONS[it.edition].price : 0));
  const kindLabel = { talisman: 'Talisman', omikuji: 'Omikuji', kami: 'Kami Spirit', scroll: 'Scroll of Mastery', flower: 'Flower / Season' }[it.kind];
  const ed = it.edition ? EDITIONS[it.edition] : null;
  return `<div class="shopcard ${it.kind}${it.sold ? ' sold' : ''}${ed ? ' ed-' + it.edition : ''}"><div class="kind">${kindLabel}${ed ? ` · <span class="edtag ed-${it.edition}">${ed.name}</span>` : ''}</div><div class="n">${d.name}</div><div class="d">${d.desc}${ed ? ` <b>${ed.name}: ${ed.desc}.</b>` : ''}</div><div class="buy"><span class="num" style="color:var(--accent)">¥${p}</span>${it.sold ? '<span class="muted">Sold</span>' : `<button class="primary" data-buy="${idx}">Buy</button>`}</div></div>`;
}
function shopHTML() {
  const r = S.reward; const items = [...S.shop.cards, S.shop.scroll, S.shop.flower].filter(Boolean);
  const next = ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[blindKind()];
  const nextBoss = blindKind() === 'boss' ? BOSSES[S.bossOrder[S.ante - 1]] : null;
  let h = `<h2>Shop</h2>`;
  if (r) h += `<div class="label">Blind defeated · reward</div><div class="reward-list num"><span>${({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[r.kind]} defeated</span><span>¥${r.base}</span><span>Unused Plays</span><span>¥${r.left}</span><span>Interest (¥1 per ¥5)</span><span>¥${r.interest}</span>${r.tal ? `<span>Talismans</span><span>¥${r.tal}</span>` : ''}${r.summer ? `<span>Summer</span><span>¥${r.summer}</span>` : ''}<span><b>Total</b></span><span><b>¥${r.total}</b></span></div>`;
  h += `<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center"><span>YEN: <b class="num" style="color:var(--accent)">¥${S.money}</b></span><span class="muted">Talismans ${S.talismans.length}/${CFG.talismanSlots} · Consumables ${S.consumables.length}/${conSlots()}</span></div>`;
  h += `<div class="shop-grid">${items.map((it, i) => cardHTML(it, i)).join('')}</div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="margin-bottom:8px">${S.msg || ''}</div>`;
  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button id="mReroll">Reroll cards (¥${rerollCost()})</button><button id="mDeck" class="ghost">View Wall</button><span style="flex:1"></span><span class="muted">Next: Ante ${S.ante} ${next}${nextBoss ? ' · ' + nextBoss.name : ''}</span><button id="mNext" class="primary">Next Blind →</button></div>`;
  if (S.consumables.length) h += `<div class="muted" style="font-size:12px;margin-top:8px">Consumables that need tiles are used during a Blind. Click one on the board to use it now if it needs none.</div>`;
  return h;
}
function overHTML(won) {
  const st = S.stats;
  return `<h2>${won ? 'You broke the bank!' : 'The syndicate collects.'}</h2><p>${won ? `All ${CFG.antes} Antes cleared.` : `Out of Plays on Ante ${S.ante}, ${S.boss ? BOSSES[S.boss].name : blindKind() + ' blind'}: scored ${S.score.toLocaleString()} of ${S.target.toLocaleString()}.`}</p>
  <div class="reward-list num"><span>Blinds defeated</span><span>${st.blinds}</span><span>Complete hands</span><span>${st.hands}</span><span>Partial plays</span><span>${st.melds}</span><span>Best single play</span><span>${st.best.toLocaleString()}${st.bestDesc ? ' · ' + st.bestDesc : ''}</span><span>YEN</span><span>¥${S.money}</span><span>Talismans</span><span>${S.talismans.map(k => TAL[k].name).join(', ') || 'none'}</span></div>
  <button id="mNewRun" class="primary">New Run</button>`;
}
function deckHTML() {
  const all = S.phase === 'blind' ? [...S.hand, ...S.wall, ...S.river, ...openTiles(), ...S.played, ...S.indicators] : S.deck;
  const counts = new Array(34).fill(0), inWall = new Array(34).fill(0), reds = new Array(34).fill(0);
  for (const t of all) { counts[idx(t)]++; if (t.red) reds[idx(t)]++; } for (const t of S.wall) inWall[idx(t)]++;
  let h = `<div class="deckwrap"></div><h2>The Wall</h2><p class="muted" style="margin:0 0 10px">${all.length} tiles in your deck${S.phase === 'blind' ? ` · ${S.wall.length} still face down in the Wall` : ''}. Each cell: total copies${S.phase === 'blind' ? ' (left in Wall)' : ''}.</p>`;
  for (const [label, from, to] of [['Manzu', 0, 9], ['Pinzu', 9, 18], ['Souzu', 18, 27], ['Honors', 27, 34]]) h += `<div class="label" style="margin:8px 0 4px">${label}</div><div class="deckrow" data-from="${from}" data-to="${to}"></div>`;
  const eng = all.filter(t => t.eng); if (eng.length) h += `<p style="margin-top:10px;font-size:12px">Engraved: ${eng.map(t => tileName(t) + ' [' + ENG[t.eng].name + ']').join(', ')}</p>`;
  h += `<div style="margin-top:12px"><button id="mClose" class="primary">Close</button></div>`;
  setTimeout(() => { document.querySelectorAll('#modal .deckrow').forEach(g => { for (let i = +g.dataset.from; i < +g.dataset.to; i++) { const c = document.createElement('div'); c.className = 'deckcell'; const t = tileFromIdx(i); c.appendChild(tileEl(t, { small: true })); c.innerHTML += `<b>${counts[i]}</b>${S.phase === 'blind' ? ` (${inWall[i]})` : ''}${reds[i] ? `<br><span style="color:var(--redfive)">${reds[i]} red</span>` : ''}`; g.appendChild(c); } translateDOM(g); }); }, 0);
  return h;
}
function rulesHTML() {
  return `<h2>How to play</h2><div class="menu-rules">
  <p><b>Goal.</b> Score at least the Blind's target before you run out of Plays. Beat all ${CFG.antes} Antes (Small, Big, Boss each) to win.</p>
  <p><b>Hand.</b> You hold ${CFG.handSize} tiles from a 136-tile Wall (4 of each tile; four of the 5s are Red Fives). You refill after every action. A complete hand uses 14 of them, so you always have spare tiles to work with.</p>
  <p><b>Partial play.</b> Select any tiles that split into melds (Chi runs, Pon triplets, Kan quads) plus at most one pair, and press Play. The button names the rung: Lone Tile, Pair, Two Pair, one meld, Two Melds, Three Melds, Ready Hand (3 melds + pair), Four Melds. Bigger rungs score far more, so a hand that falls one tile short is still worth cashing in. Costs 1 Play. See the Yaku button for the full ladder.</p>
  <p><b>Complete hand.</b> Select 14 tiles (4 melds + a pair, or Seven Pairs / Thirteen Orphans) and press Play. Yaku add Han, and Han sets the multiplier: 1 Han ×2, 2 ×4, 3 ×8, 4–5 ×15, 6–7 ×25, 8–10 ×40, 11–12 ×60, 13+ ×100.</p>
  <p><b>Chips.</b> 2–8 are worth their face value, 1s, 9s and Honors are worth 10. Score = Chips × Mult.</p>
  <p><b>How Mult is built.</b> Han from the play, Yaku, Red Fives, Dora and Scrolls is converted once through the Han table into a starting Mult. Then your Talismans fire left to right: some add Chips, some add flat Mult (+4 Mult), some multiply (×1.5 Mult). Because they fire in order, a +Mult Talisman placed before a ×Mult Talisman scores more than the reverse. Drag Talismans to arrange them; the number on each card is its firing order.</p>
  <p><b>Discard.</b> Throw up to ${CFG.maxDiscardTiles} tiles into the River. Costs 1 Discard. The River stays visible for the whole Blind. You get ${CFG.playsPerBlind} Plays and ${CFG.discardsPerBlind} Discards per Blind before Talismans and Flowers.</p>
  <p><b>Call.</b> Select one River tile and 2–3 hand tiles that form a meld with it, then press Call. Costs 1 Play, no score yet. The meld is set aside as Open and counts toward your complete hand. Open hands get reduced Han on some Yaku, and lose closed-only Yaku (Pinfu, Iipeikou...). After a call you discard 1 tile to settle it; this does not use a Discard.</p>
  <p><b>Arranging your hand.</b> Drag any hand tile to reorder it, with a mouse or a finger. Dragging switches off auto-sort; the Sort button sorts the hand again and keeps new tiles sorted in. Tiles score in the order they sit in your hand, which matters for Shikigami and for the scoring animation.</p>
  <p><b>Helper.</b> Under your hand the game shows how many tiles you are from a complete hand, and tiles marked with a green dot can be discarded without losing progress. Select tiles to see whether that discard keeps you on track. Against The Purist it only counts your visible tiles.</p>
  <p><b>Kan.</b> Four identical tiles can be played as a partial Kan for points, or declared: press Declare Kan (or K) to set them aside as a closed Kan that counts toward your complete hand without opening it. Every Kan, declared or called from the River, draws one replacement tile from the Wall. If that replacement tile ends up as the winning tile of your complete hand, you score Rinshan Kaihou (+1 Han). A called Kan then settles with one discard like any Call.</p>
  <p><b>Furiten.</b> The winning tile of a complete hand is the newest tile you drew among the 14 you play. If a copy of that tile type sits in your River, the hand is in Furiten and the multiplier is halved. The helper shows your waits when you are one tile away and marks the ones already in your River. Kappa turns Furiten into a bonus.</p>
  <p><b>Engravings &amp; editions.</b> Omikuji can engrave tiles: Gold Foil (¥1), Obsidian (+20 Chips), Dragon Mark (+1 Han), Jade (×1.5 Mult), Red Seal (scores twice) and Glass (×2 Mult, 1 in 4 chance to shatter). Shop Talismans sometimes come in an edition: Foil (+50 Chips), Holographic (+1 Han) or Polychrome (×1.5 Mult) on every play.</p>
  <p><b>Red Fives &amp; Dora.</b> Each Red Five scored gives +1 Han. Dora indicators (from Omikuji) make matching tiles worth +1 Han each.</p>
  <p><b>Bosses.</b> Every third Blind is a Yakuza boss with a rule twist. Read the red box.</p>
  <p><b>Shop.</b> After each Blind, spend YEN on Talismans (passive, 5 slots), Omikuji and Kami (consumables, use on selected hand tiles), Scrolls of Mastery (permanent upgrades) and Flowers (run-long perks). Click a Talisman on the board to sell it.</p>
  </div><div style="margin-top:12px"><button id="mClose" class="primary">Close</button></div>`;
}
function yakuHTML() {
  const row = y => { const b = y.k && S && S.scrolls.yaku[y.k]; return `<tr><td><b>${y.n}</b>${y.c ? ' <span class="tag">closed only</span>' : ''}${b ? ` <span class="tag">Scroll +${b}</span>` : ''}</td><td class="num">${y.h}${b ? ` <span style="color:var(--good)">+${b}</span>` : ''}</td><td>${y.d}</td></tr>`; };
  let h = `<h2>Yaku cheat sheet</h2><p class="muted" style="margin:0 0 10px">A complete hand is 4 melds + 1 pair (14 tiles) unless noted. Han values are shown as closed / open. A hand is Open once you have Called from the River. A complete hand with no Yaku still counts as 1 Han.</p>`;
  h += `<div style="overflow-x:auto"><table class="sheet"><thead><tr><th>Play ladder</th><th>Base</th><th></th></tr></thead><tbody>`;
  const lv = k => (S && S.scrolls.meld[k]) || 0; const lvTag = k => lv(k) ? ` <span class="tag">Lv.${lv(k) + 1}</span>` : '';
  const val = k => `${CFG.meldBase[k].chips + lv(k) * CFG.scrollChips} chips, ${CFG.meldBase[k].han + lv(k) * CFG.scrollHan} Han`;
  for (const k of ['single', 'pair', 'twopair', 'chi', 'pon', 'kan']) h += `<tr><td><b>${MELD_LABEL[k]}</b>${lvTag(k)}</td><td class="num">${val(k)}</td><td>${{ single: 'Any 1 tile.', pair: '2 identical tiles.', twopair: 'Two different pairs, no melds.', chi: '3 consecutive tiles of one suit. Add a pair for +10 chips.', pon: '3 identical tiles. Honor Pon adds Yakuhai (+1 Han).', kan: '4 identical tiles. Honor Kan adds Yakuhai.' }[k]}</td></tr>`;
  for (const [k, r] of Object.entries(CFG.rungs)) h += `<tr><td><b>${r.name}</b></td><td class="num">${r.chips} chips, ${r.han} Han</td><td>${k.split(',')[0]} melds${k.endsWith('1') ? ' + a pair' : ''} played together. Each Kan inside adds +${CFG.kanBonus.chips} chips, +${CFG.kanBonus.han} Han. Honor sets add Yakuhai.</td></tr>`;
  h += `<tr><td><b>Complete Hand</b>${lvTag('hand')}</td><td class="num">${val('hand')}</td><td>4 melds + a pair, 14 tiles. Yaku below add Han (at least +1).</td></tr>`;
  h += `<tr><td colspan="3" class="muted">Multi-meld rungs use the per-component Scroll levels above: each Chi, Pon, Kan or Pair inside the play adds its Scroll bonus.</td></tr>`;
  h += `</tbody></table></div>`;
  h += `<div style="overflow-x:auto;margin-top:10px"><table class="sheet"><thead><tr><th>Han</th><th>Mult</th><th>Tier</th></tr></thead><tbody>`;
  for (const [hh, m, t] of [[0, 1, '—'], [1, 2, 'Standard'], [2, 4, 'Advanced'], [3, 8, 'Master'], ['4–5', 15, 'Mangan'], ['6–7', 25, 'Haneman'], ['8–10', 40, 'Baiman'], ['11–12', 60, 'Sanbaiman'], ['13+', 100, 'Yakuman']]) h += `<tr><td class="num">${hh}</td><td class="num">×${m}</td><td>${t}</td></tr>`;
  h += `</tbody></table></div>`;
  h += `<p style="margin:12px 0 6px"><b>Extra Han on any play:</b> each Red Five +1 (Koi: +2). Each tile matching a flipped Dora indicator +1. Dragon Mark engraving +1. Han is converted through the table once; after that Talismans fire left to right, adding Chips, adding flat Mult or multiplying Mult, so put +Mult Talismans before ×Mult ones. Furiten (the newest-drawn tile of your complete hand has a copy in your River) halves the final Mult.</p>`;
  h += `<div style="overflow-x:auto"><table class="sheet"><thead><tr><th>Yaku</th><th>Han</th><th>Pattern</th></tr></thead><tbody>`;
  for (const y of YAKU_SHEET) h += row(y);
  h += `</tbody></table></div>`;
  h += `<div style="overflow-x:auto;margin-top:10px"><table class="sheet"><thead><tr><th>Yakuman</th><th>Han</th><th>Pattern</th></tr></thead><tbody>`;
  for (const y of YAKUMAN_SHEET) h += row(y);
  h += `</tbody></table></div><div style="margin-top:12px"><button id="mClose" class="primary">Close</button></div>`;
  return h;
}
function menuHTML(hasSave) {
  return `<h2 style="font-size:40px" data-notr>Yakuman</h2><p class="muted">A Mahjong roguelite in the Balatro mould. Playtest build. Switch between Riichi and Hong Kong terminology with the button in the header.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">${hasSave ? '<button id="mContinue" class="primary">Continue run</button>' : ''}<button id="mStart" class="${hasSave ? '' : 'primary'}">New run</button><button id="mRules" class="ghost">How to play</button></div>`;
}

// ===================== DEBUG =====================
function renderDebug() {
  const bar = $('#debugBar');
  bar.innerHTML = `<span class="label">Debug</span><button data-dbg="money">+¥25</button><button data-dbg="play">+1 Play</button><button data-dbg="discard">+1 Discard</button><button data-dbg="win">Win blind</button><button data-dbg="refill">Redraw hand</button>
  <select id="dbgBoss"><option value="">Set next boss…</option>${Object.entries(BOSSES).map(([k, b]) => `<option value="${k}">${b.name}</option>`).join('')}</select>
  <select id="dbgTal"><option value="">Add talisman…</option>${TALISMANS.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select>
  <select id="dbgCon"><option value="">Add consumable…</option>${[...OMIKUJI, ...KAMI].map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select>
  <select id="dbgScr"><option value="">Add scroll…</option>${SCROLLS.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select>
  <select id="dbgFlw"><option value="">Add flower…</option>${FLOWERS.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select>
  <select id="dbgEd"><option value="">Edition for selected Talisman…</option>${Object.entries(EDITIONS).map(([k, e]) => `<option value="${k}">${e.name}</option>`).join('')}<option value="none">None</option></select>
  <button data-dbg="reset" class="ghost">Wipe save</button>`;
  bar.querySelectorAll('[data-dbg]').forEach(b => b.onclick = () => {
    const a = b.dataset.dbg;
    if (a === 'money') S.money += 25; else if (a === 'play') S.plays++; else if (a === 'discard') S.discards++;
    else if (a === 'win') { if (S.phase === 'blind') { S.score = S.target; winBlind(); } }
    else if (a === 'refill') { if (S.phase === 'blind') { S.wall.push(...S.hand); shuffle(S.wall); S.hand = []; S.selected = []; draw(); } }
    else if (a === 'reset') { clearSave(); location.reload(); return; }
    render();
  });
  $('#dbgBoss').onchange = e => { const k = e.target.value; if (!k) return; const i = S.ante - 1; S.bossOrder[i] = k; if (S.phase === 'blind' && blindKind() === 'boss') { S.boss = k; } setMsg(`Boss for Ante ${S.ante} set to ${BOSSES[k].name}.`); render(); };
  $('#dbgTal').onchange = e => { const k = e.target.value; if (!k) return; if (S.talismans.length < CFG.talismanSlots && !S.talismans.includes(k)) S.talismans.push(k); e.target.value = ''; render(); };
  $('#dbgCon').onchange = e => { const k = e.target.value; if (!k) return; if (S.consumables.length < conSlots()) S.consumables.push({ kind: CONS[k].kind, key: k }); e.target.value = ''; render(); };
  $('#dbgScr').onchange = e => { const k = e.target.value; if (!k) return; buyFree({ kind: 'scroll', key: k }); e.target.value = ''; render(); };
  $('#dbgEd').onchange = e => { const k = e.target.value; if (!k || !S.selTal) return; if (k === 'none') delete S.editions[S.selTal]; else S.editions[S.selTal] = k; e.target.value = ''; render(); };
  $('#dbgFlw').onchange = e => { const k = e.target.value; if (!k) return; if (!S.flowers.includes(k)) S.flowers.push(k); e.target.value = ''; render(); };
}
function buyFree(it) { const m = S.money; S.money = 999; buy(it); S.money = m; }

// ===================== BOOT & EVENTS =====================
function bindEvents() {
  $('#btnPlay').onclick = doPlay; $('#btnDiscard').onclick = doDiscard; $('#btnCall').onclick = doCall; $('#btnKan').onclick = doDeclareKan;
  $('#btnClear').onclick = () => { S.selected = []; S.selRiver = null; render(); };
  $('#btnSort').onclick = () => { S.sortHand = !S.sortHand; if (S.sortHand) S.hand = sortTiles(S.hand); render(); };
  $('#btnDots').onclick = () => { SHOW_DOTS = !SHOW_DOTS; try { localStorage.setItem('yakuman.dots', SHOW_DOTS ? 'on' : 'off'); } catch (e) { } render(); };
  $('#btnDeck').onclick = () => showModal(deckHTML(), true);
  $('#btnRules').onclick = () => showModal(rulesHTML(), true);
  $('#btnYaku').onclick = () => showModal(yakuHTML(), true);
  $('#btnLang').onclick = () => setLang(LANG === 'hk' ? 'ja' : 'hk');
  $('#btnDebug').onclick = () => { const b = $('#debugBar'); b.hidden = !b.hidden; if (!b.hidden) renderDebug(); };
  $('#btnNewRun').onclick = () => showModal(`<h2>Start a new run?</h2><p class="muted">Your current run will be lost.</p><div style="display:flex;gap:8px"><button id="mNewRun" class="danger">New run</button><button id="mClose">Cancel</button></div>`, true);
  $('#overlay').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'mClose') { hideModal(); render(); }
    else if (t.id === 'mNewRun' || t.id === 'mStart') { hideModal(); newRun(); }
    else if (t.id === 'mContinue') { hideModal(); render(); }
    else if (t.id === 'mRules') { showModal(rulesHTML() + '', true); $('#mClose').onclick = () => { showModal(menuHTML(!!load()), true); }; }
    else if (t.id === 'mNext') { S.shop = null; S.msg = ''; startBlind(); render(); }
    else if (t.id === 'mReroll') reroll();
    else if (t.id === 'mDeck') { showModal(deckHTML(), true); $('#mClose').onclick = () => { modalPinned = false; render(); }; }
    else if (t.dataset.buy != null) { const items = [...S.shop.cards, S.shop.scroll, S.shop.flower].filter(Boolean); buy(items[+t.dataset.buy]); }
  });
  document.addEventListener('keydown', e => {
    if (S.phase !== 'blind' || !$('#overlay').hidden) return;
    if (S.busy) { skipAnim = true; return; }
    if (e.key === 'Enter' || e.key === 'p') doPlay(); else if (e.key === 'd') doDiscard(); else if (e.key === 'c') doCall(); else if (e.key === 'k') doDeclareKan(); else if (e.key === 'Escape') { S.selected = []; S.selRiver = null; render(); }
  });
}
function boot(saved) {
  bindEvents();
  if (saved && saved.phase && saved.deck) { S = saved; S.talState = S.talState || {}; S.editions = S.editions || {}; S.busy = false; S.newIds = []; S.drawSeq = S.drawSeq || 0; render(); showModal(menuHTML(true), true); }
  else { S = newState(); startBlind(); render(); showModal(menuHTML(false), true); }
}
try { if (window.claude && window.claude.hot) window.claude.hot.snapshot(() => S); } catch (e) { }
const hotData = (window.claude && window.claude.hot && window.claude.hot.data) || null;
boot(hotData && hotData.phase ? hotData : load());
