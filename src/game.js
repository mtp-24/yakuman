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
function newState(opts = {}) {
  const seed = (opts.seed || '').trim() || randomSeed();
  const st = { seed, rngState: hashSeed(seed), deckKey: DECKS[opts.deck] ? opts.deck : 'standard', stake: STAKES[opts.stake] ? opts.stake : 'white' };
  S = st; // rand() reads S.rngState from here on
  const bosses = shuffle(Object.keys(BOSSES)).slice(0, CFG.antes);
  return Object.assign(st, {
    phase: 'blind', deck: buildDeck(st.deckKey), wall: [], hand: [], river: [], open: [], played: [], selected: [], selRiver: null,
    ante: 1, blindIndex: 0, boss: null, bossOrder: bosses, target: 0, score: 0, plays: 0, discards: 0, money: CFG.startMoney + (st.deckKey === 'merchant' ? 16 : 0),
    talismans: [], consumables: [], scrolls: { meld: {}, yaku: {} }, flowers: [], dora: [], indicators: [], pendingDiscard: 0,
    shop: null, tags: [], skipTags: null, pack: null, lastPlay: null, bonusPlays: 0, bonusDiscards: 0, revealed: false, sortHand: true, selTal: null, talState: {}, editions: {}, busy: false, newIds: [], drawSeq: 0,
    stats: { best: 0, bestDesc: '', hands: 0, melds: 0, blinds: 0, rungs: {}, yaku: {}, bosses: [], calls: 0, kans: 0, discards: 0, skipped: 0 }, reward: null, msg: '',
  });
}
const blindKind = () => ['small', 'big', 'boss'][S.blindIndex];
const hasF = k => S.flowers.includes(k);
const handSize = () => Math.max(8, CFG.handSize + (hasF('plum') ? 1 : 0) + (S.deckKey === 'abundant' ? 2 : 0) + (S.blindMods && S.blindMods.handSize || 0) - (S.boss === 'miser' && S.phase === 'blind' ? 3 : 0));
const capacity = () => handSize() - 3 * S.open.length;
const neededConcealed = () => 14 - 3 * S.open.length;
const conSlots = () => CFG.consumableSlots + (hasF('spring') ? 1 : 0) + (S.deckKey === 'merchant' ? 1 : 0);
const price = c => { let p = c; if (S.deckKey === 'merchant') p = Math.ceil(p * 1.25); if (hasF('chrysanthemum')) p = Math.ceil(p * 0.8); return Math.max(1, p); };
const talSlots = () => CFG.talismanSlots + S.talismans.filter(k => S.editions[k] === 'neg').length;
const stakeTargets = () => (S.stake === 'green' || S.stake === 'black') ? 1.3 : 1;
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
  S.boss = kind === 'boss' ? S.bossOrder[S.ante - 1] : null; if (S.boss && !S.stats.bosses.includes(S.boss)) S.stats.bosses.push(S.boss);
  S.target = Math.floor(CFG.anteBase[S.ante - 1] * CFG.blindMult[kind] * stakeTargets());
  S.plays = Math.max(1, CFG.playsPerBlind + S.bonusPlays + talMod('plays') + (hasF('bamboo') ? 1 : 0) + (S.deckKey === 'gambler' ? 1 : 0) - (S.deckKey === 'abundant' ? 1 : 0));
  S.discards = Math.max(0, CFG.discardsPerBlind + S.bonusDiscards + talMod('discards') + (hasF('orchid') ? 1 : 0) - (S.deckKey === 'gambler' ? 1 : 0));
  S.wall = shuffle(S.deck.slice()); S.deck = []; S.hand = []; S.river = []; S.open = []; S.played = [];
  S.selected = []; S.selRiver = null; S.dora = []; S.indicators = []; S.pendingDiscard = 0; S.revealed = false; S.score = 0; S.lastPlay = null; S.reward = null; S.selTal = null;
  S.firstPlayDone = false; S.bossSuit = S.boss === 'collector' ? pick(['m', 'p', 's']) : null;
  S.blindMods = S.nextBlindMods || {}; S.nextBlindMods = null;
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
  const base = (kind === 'small' && (S.stake === 'red' || S.stake === 'black')) ? 0 : CFG.blindReward[kind], left = S.plays, interest = Math.min(hasF('winter') ? 10 : CFG.interestCap, Math.floor(S.money / CFG.interestPer));
  let tal = 0; for (const k of S.talismans) if (TAL[k].onBlindEnd) tal += TAL[k].onBlindEnd(S);
  const summer = hasF('summer') ? 2 : 0;
  let invest = 0; if (kind === 'boss' && S.tags.includes('investment')) { invest = 25; S.tags = S.tags.filter(t => t !== 'investment'); }
  const total = base + left + interest + tal + summer + invest;
  S.money += total; S.stats.blinds++; S.msg = ''; S.msgErr = false;
  S.reward = { kind, base, left, interest, tal, summer, invest, total };
  collectDeck();
  const finished = S.ante === CFG.antes && S.blindIndex === 2;
  S.blindIndex++; if (S.blindIndex > 2) { S.blindIndex = 0; S.ante++; rollAnteTags(); }
  if (finished) { S.phase = 'win'; return; }
  genShop(); S.phase = 'shop';
}
function loseRun() { S.phase = 'gameover'; }
function rollAnteTags() { S.skipTags = { small: pick(Object.keys(TAGS)), big: pick(Object.keys(TAGS)) }; }
function blindTarget(kind) { return Math.floor(CFG.anteBase[Math.min(S.ante, CFG.antes) - 1] * CFG.blindMult[kind] * stakeTargets()); }
function newRun(opts) { S = newState(opts || {}); rollAnteTags(); S.phase = 'select'; render(); }

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
  if (S.phase !== 'blind' || S.busy) return; setRules(S);
  const opt = playOption(); if (opt.err) { setMsg(opt.err, true); return render(); }
  const sel = S.hand.filter(t => S.selected.includes(t.id)); let ctx;
  if (opt.type === 'hand') { ctx = scoreCtx(S, 'hand', sel.concat(openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec }); S.stats.hands++; }
  else { ctx = scoreCtx(S, 'meld', sel, { part: opt.part }); S.stats.melds++; }
  S.busy = true; setMsg(''); render();
  await animateScore(ctx);
  S.busy = false;
  for (const k of S.talismans) if (TAL[k].afterScore) TAL[k].afterScore(ctx, S);
  S.plays--; S.score += ctx.total; S.money += ctx.money; S.lastPlay = ctx; S.firstPlayDone = true;
  S.stats.rungs[ctx.meldType] = (S.stats.rungs[ctx.meldType] || 0) + 1; for (const yk of ctx.yaku) S.stats.yaku[yk.key] = (S.stats.yaku[yk.key] || 0) + 1;
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
  const maxD = S.boss === 'monk' ? 3 : CFG.maxDiscardTiles;
  if (sel.length > maxD) { setMsg(`You can discard at most ${maxD} tiles at once${S.boss === 'monk' ? ' against The Monk' : ''}.`, true); return render(); }
  if (S.boss === 'loanshark') {
    if (S.money < 1) { setMsg('The Loan Shark has locked your discards: ¥0 left.', true); return render(); }
    S.money -= 1;
  }
  S.discards--; S.stats.discards++; S.river.push(...sel); S.hand = S.hand.filter(t => !sel.includes(t)); S.selected = []; draw();
  for (const k of S.talismans) if (TAL[k].onDiscard) TAL[k].onDiscard(S, sel);
  setMsg(`Discarded ${sel.length} tile${sel.length > 1 ? 's' : ''} to the River.`); render();
}
function doCall() {
  if (S.phase !== 'blind' || S.busy) return;
  if (S.pendingDiscard) { setMsg('Settle your previous Call first.', true); return render(); }
  if (S.boss === 'fisherman') { setMsg('The Fisherman: River tiles cannot be Called this Blind.', true); return render(); }
  const freeCall = S.talismans.some(k => TAL[k].freeCall);
  if (!freeCall && S.plays <= 1) { setMsg(S.plays <= 0 ? 'No Plays left.' : 'Calling would use your last Play and leave nothing to score with.', true); return render(); }
  const rt = S.river.find(t => t.id === S.selRiver); if (!rt) { setMsg('Select a tile in the River to call.', true); return render(); }
  const sel = selTiles(); if (sel.length < 2 || sel.length > 3) { setMsg('Select 2 or 3 hand tiles to meld with the River tile.', true); return render(); }
  if (S.open.length >= 4) { setMsg('You already have 4 open melds.', true); return render(); }
  const type = meldType([rt, ...sel]); if (!type) { setMsg('That River tile and your selection do not form a Chi, Pon or Kan.', true); return render(); }
  if (!freeCall) S.plays--; S.river = S.river.filter(t => t !== rt); S.hand = S.hand.filter(t => !sel.includes(t));
  S.open.push({ type, tiles: sortTiles([rt, ...sel]), calledId: rt.id }); S.selected = []; S.selRiver = null;
  for (const k of S.talismans) if (TAL[k].onCall) TAL[k].onCall(S); S.stats.calls++; if (type === 'kan') S.stats.kans++;
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
  S.open.push({ type: 'kan', tiles: sortTiles(sel), calledId: null, closed: true }); S.selected = []; S.stats.kans++;
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
  const before = S.hand.length;
  const r = def.use(S, sel); if (r === false) { setMsg('That cannot be used right now.', true); return render(); }
  for (const t of S.hand) if (t.d === undefined) t.d = ++S.drawSeq;
  if (S.hand.length > before) for (const k of S.talismans) if (TAL[k].onTileAdded) TAL[k].onTileAdded(S, S.hand.length - before);
  S.consumables.splice(i, 1); S.selected = []; if (S.phase === 'blind') draw();
  setMsg(`${def.name} used.`); render();
}
function talValue(k) { return TAL[k].cost + (S.editions[k] ? EDITIONS[S.editions[k]].price : 0); }
function sellTalisman(k) { const i = S.talismans.indexOf(k); if (i < 0) return; S.talismans.splice(i, 1); S.money += Math.max(1, Math.floor(talValue(k) / 2)); delete S.editions[k]; S.selTal = null; for (const t of S.talismans) if (TAL[t].onSell) TAL[t].onSell(S); setMsg(`Sold ${TAL[k].name}.`); render(); }
function sellConsumable(i) { const c = S.consumables[i]; if (!c) return; const v = Math.max(1, Math.floor(CONS[c.key].cost / 2)); S.consumables.splice(i, 1); S.money += v; setMsg(`Sold ${CONS[c.key].name} for ¥${v}.`); render(); }

// ===================== SHOP =====================
function rollCard() {
  const r = Math.random(), w = CFG.shopWeights;
  if (r < w.talisman) { const pool = TALISMANS.filter(t => !S.talismans.includes(t.key)); if (pool.length) return { kind: 'talisman', key: pick(pool).key, edition: rollEdition() }; }
  if (r < w.talisman + w.omikuji) return { kind: 'omikuji', key: pick(OMIKUJI).key };
  return { kind: 'kami', key: pick(KAMI).key };
}
function genShop() {
  const fl = FLOWERS.filter(f => !S.flowers.includes(f.key));
  const packKey = pick(['omikuji', 'omikuji', 'scroll', 'scroll', 'talisman', 'kami', 'mega']);
  S.shop = { cards: [rollCard(), rollCard()], scroll: { kind: 'scroll', key: pick(SCROLLS).key }, flower: fl.length ? { kind: 'flower', key: pick(fl).key } : null, pack: { kind: 'pack', key: packKey }, coupon: false, freeReroll: false, freePacks: [] };
  // consume tags that act on this shop
  const take = t => { const i = S.tags.indexOf(t); if (i >= 0) { S.tags.splice(i, 1); return true; } return false; };
  if (take('coupon')) S.shop.coupon = true;
  if (take('reroll')) S.shop.freeReroll = true;
  for (const ed of ['foil', 'holo', 'poly', 'neg']) if (take(ed)) { const c = S.shop.cards.find(x => x.kind === 'talisman'); if (c) c.edition = ed; else S.shop.cards[0] = { kind: 'talisman', key: pick(TALISMANS.filter(t => !S.talismans.includes(t.key))).key, edition: ed }; }
  for (const pk of ['omikuji', 'scroll', 'talisman', 'kami']) while (take(pk)) S.shop.freePacks.push(pk);
}
function openPack(key, free) {
  const def = PACKS[key]; let pool;
  if (key === 'omikuji' || key === 'mega') pool = OMIKUJI.map(o => ({ kind: 'omikuji', key: o.key }));
  else if (key === 'scroll') pool = SCROLLS.map(o => ({ kind: 'scroll', key: o.key }));
  else if (key === 'kami') pool = KAMI.map(o => ({ kind: 'kami', key: o.key }));
  else pool = TALISMANS.filter(t => !S.talismans.includes(t.key)).map(t => ({ kind: 'talisman', key: t.key, edition: rollEdition() }));
  const choices = shuffle(pool.slice()).slice(0, def.show);
  S.pack = { key, choices, left: def.keep, free: !!free };
}
function takeFromPack(i) {
  const it = S.pack.choices[i]; if (!it || it.sold) return;
  if (it.kind === 'talisman') { if (S.talismans.length >= talSlots()) { setMsg('Talisman slots are full. Sell one from the list below first.', true); return render(); } S.talismans.push(it.key); if (it.edition) S.editions[it.key] = it.edition; }
  else if (it.kind === 'scroll') { const [t, k] = it.key.split(':'); S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] = (S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] || 0) + 1; for (const tk of S.talismans) if (TAL[tk].onScroll) TAL[tk].onScroll(S); }
  else { if (S.consumables.length >= conSlots()) { setMsg('Consumable slots are full. Use or sell one first.', true); return render(); } S.consumables.push({ kind: it.kind, key: it.key }); }
  it.sold = true; S.pack.left--; setMsg(`Took ${itemDef(it).name}.`);
  if (S.pack.left <= 0) S.pack = null;
  render();
}
function itemDef(it) { return it.kind === 'talisman' ? TAL[it.key] : it.kind === 'scroll' ? SCR[it.key] : it.kind === 'flower' ? FLW[it.key] : it.kind === 'pack' ? PACKS[it.key] : CONS[it.key]; }
function buy(it) {
  const def = itemDef(it), p = itemPrice(it);
  if (S.money < p) { setMsg(`Not enough YEN: ${def.name} costs ¥${p}.`, true); return render(); }
  if (it.kind === 'pack') { S.money -= p; it.sold = true; openPack(it.key, false); return render(); }
  if (it.kind === 'talisman') { if (S.talismans.length >= talSlots()) { setMsg(`All ${talSlots()} Talisman slots are full. Sell one first.`, true); return render(); } S.talismans.push(it.key); if (it.edition) S.editions[it.key] = it.edition; }
  else if (it.kind === 'omikuji' || it.kind === 'kami') { if (S.consumables.length >= conSlots()) { setMsg('Consumable slots are full. Use one first.', true); return render(); } S.consumables.push({ kind: it.kind, key: it.key }); }
  else if (it.kind === 'scroll') { const [t, k] = it.key.split(':'); S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] = (S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] || 0) + 1; for (const tk of S.talismans) if (TAL[tk].onScroll) TAL[tk].onScroll(S); }
  else if (it.kind === 'flower') { S.flowers.push(it.key); }
  S.money -= p; it.sold = true; setMsg(`Bought ${def.name}.`); render();
}
function itemPrice(it) { const def = itemDef(it); let base = def.cost + (it.edition ? EDITIONS[it.edition].price : 0); if (it.kind === 'talisman' && S.stake === 'black') base += 2; if (S.shop && S.shop.coupon && (it.kind === 'talisman' || it.kind === 'omikuji' || it.kind === 'kami')) return 0; return price(base); }
function reroll() { const c = S.shop.freeReroll ? 0 : rerollCost(); if (S.money < c) { setMsg(`Reroll costs ¥${c}.`, true); return render(); } S.money -= c; S.shop.cards = [rollCard(), rollCard()]; render(); }
function skipBlind() {
  if (S.phase !== 'select' || blindKind() === 'boss') return;
  const tag = (S.skipTags && S.skipTags[blindKind()]) || pick(Object.keys(TAGS)); S.stats.skipped++;
  if (tag === 'economy') S.money += Math.min(40, S.money);
  else if (tag === 'speed') S.money += 5 * S.stats.skipped;
  else if (tag === 'juggle') S.nextBlindMods = { handSize: 3 };
  else if (tag === 'boss') { const used = new Set(S.bossOrder); const pool = Object.keys(BOSSES).filter(b => !used.has(b)); S.bossOrder[S.ante - 1] = pool.length ? pick(pool) : pick(Object.keys(BOSSES).filter(b => b !== S.bossOrder[S.ante - 1])); }
  else S.tags.push(tag);
  S.blindIndex++; S.shop = null; S.pack = null; S.phase = 'select';
  setMsg(`Skipped for the ${TAGS[tag].name}: ${TAGS[tag].desc}`); render();
}
function selectHTML() {
  const kinds = ['small', 'big', 'boss']; const names = { small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' };
  const boss = S.bossOrder[S.ante - 1];
  const plays = Math.max(1, CFG.playsPerBlind + S.bonusPlays + talMod('plays') + (hasF('bamboo') ? 1 : 0) + (S.deckKey === 'gambler' ? 1 : 0) - (S.deckKey === 'abundant' ? 1 : 0));
  const discards = Math.max(0, CFG.discardsPerBlind + S.bonusDiscards + talMod('discards') + (hasF('orchid') ? 1 : 0) - (S.deckKey === 'gambler' ? 1 : 0));
  let h = `<h2>Ante ${S.ante} <span class="muted" style="font-size:14px;font-family:var(--body);font-weight:400">of ${CFG.antes} · ${DECKS[S.deckKey].name} · ${STAKES[S.stake].name}</span></h2><div class="blindsel">`;
  kinds.forEach((k, i) => {
    const state = i < S.blindIndex ? 'done' : i === S.blindIndex ? 'current' : 'next';
    const reward = (k === 'small' && (S.stake === 'red' || S.stake === 'black')) ? 0 : CFG.blindReward[k];
    const tag = k !== 'boss' && S.skipTags ? TAGS[S.skipTags[k]] : null;
    h += `<div class="blindcard ${state}${k === 'boss' ? ' bosscard' : ''}"><div class="kind">${state === 'done' ? 'Defeated' : state === 'current' ? 'Up next' : 'After that'}</div><div class="n">${k === 'boss' ? BOSSES[boss].name : names[k]}</div>${k === 'boss' ? `<div class="d bossfx">${BOSSES[boss].desc}</div>` : ''}<div class="stats-mini"><span><b class="num">${blindTarget(k).toLocaleString()}</b> to win</span><span>Reward <b>¥${reward}</b> + ¥1 per unused Play + interest</span><span><b>${plays}</b> Plays · <b>${discards}</b> Discards${S.nextBlindMods && S.nextBlindMods.handSize && state === 'current' ? ` · hand +${S.nextBlindMods.handSize}` : ''}</span></div>`;
    if (state === 'current') h += `<div class="buy"><button id="mPlayBlind" class="primary">Play</button>${tag ? `<button id="mSkip" class="ghost" title="${tag.desc}">Skip · ${tag.name}</button>` : ''}</div>${tag ? `<div class="tagnote muted">Skip reward: ${tag.desc} No cash for this blind.</div>` : ''}`;
    else if (state === 'next' && tag) h += `<div class="tagnote muted">Skip reward if you get here: ${tag.name}</div>`;
    h += `</div>`;
  });
  h += `</div>`;
  if (S.tags.length) h += `<div class="label" style="margin:10px 0 4px">Tags held</div><div class="owned">${S.tags.map(t => `<span class="own"><b>${TAGS[t].name}</b> <span class="muted">${TAGS[t].desc}</span></span>`).join('')}</div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="margin-top:8px">${S.msg || ''}</div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button id="mDeck" class="ghost">View Wall</button><button id="mRunInfo" class="ghost">Run Info</button></div>`;
  return h;
}

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
  if (!S) return; setRules(S);
  $('#hdrRound').innerHTML = `Ante <b>${Math.min(S.ante, CFG.antes)}</b> / ${CFG.antes} · ${S.phase === 'blind' ? ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss' })[blindKind()] : S.phase === 'shop' ? 'Shop' : ''}`;
  $('#hdrRound').title = `Seed ${S.seed} · ${DECKS[S.deckKey].name} · ${STAKES[S.stake].name}`;
  $('#hdrMoney').innerHTML = `YEN <b class="num">¥${S.money}</b>`;
  renderBlind(); renderTalismans(); renderConsumables(); renderOpen(); renderRiver(); renderHand(); renderActions(); renderLast();
  $('#msg').textContent = S.msg || ''; $('#msg').className = 'msg' + (S.msgErr ? ' err' : '');
  if (S.phase === 'shop' && S.pack) showModal(packHTML()); else if (S.phase === 'shop') showModal(shopHTML()); else if (S.phase === 'select') showModal(selectHTML()); else if (S.phase === 'gameover') showModal(overHTML(false)); else if (S.phase === 'win') showModal(overHTML(true)); else if (!modalPinned) hideModal();
  $('#btnLang').textContent = LANG === 'hk' ? 'Riichi Terms' : 'HK Terms';
  $('#btnYaku').textContent = LANG === 'hk' ? 'Run Info · Faan' : 'Run Info · Yaku';
  translateDOM($('#app'));
  save();
}
let PREVIEW = null;
function computePreview() {
  PREVIEW = null; if (S.phase !== 'blind' || S.busy) return;
  const opt = playOption(); if (!opt.type) { PREVIEW = { err: opt.err }; return; }
  const sel = S.hand.filter(t => S.selected.includes(t.id));
  const ctx = opt.type === 'hand' ? scoreCtx(S, 'hand', sel.concat(openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec, preview: true }) : scoreCtx(S, 'meld', sel, { part: opt.part, preview: true });
  PREVIEW = { ctx, label: opt.type === 'hand' ? (ctx.yaku.length ? ctx.yaku.map(y => y.name).join(', ') : 'Complete Hand') : ctx.rungName, kind: opt.type };
}
function renderBlind() {
  const kind = blindKind(); const inBlind = S.phase === 'blind'; computePreview(); if (!inBlind && S.phase !== 'win' && S.phase !== 'gameover') { /* preview */ }
  const name = inBlind && S.boss ? BOSSES[S.boss].name : ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[kind];
  const pct = S.target ? Math.min(100, 100 * S.score / S.target) : 0;
  let h = `<div class="label">Ante ${Math.min(S.ante, CFG.antes)} · ${inBlind ? 'Current Blind' : 'Next Up'}</div><div class="blind-name${S.boss && inBlind ? ' boss' : ''}">${name}</div>`;
  if (inBlind && S.boss) h += `<div class="boss-desc">${BOSSES[S.boss].desc}${S.boss === 'collector' && S.bossSuit ? ` <b>This Blind: ${SUIT_EN[S.bossSuit]}.</b>` : ''}${S.boss === 'gatekeeper' ? (S.firstPlayDone ? ' <b>First Play done.</b>' : ' <b>Your next Play scores 0.</b>') : ''}</div>`;
  if (S.tags && S.tags.length) h += `<div class="label" style="margin-top:8px">Tags</div><div class="flowers">${S.tags.map(t => `<span class="flowerchip" title="${TAGS[t].desc}">${TAGS[t].name}</span>`).join('')}</div>`;
  h += `<div class="label" style="margin-top:8px">Score at Least</div><div class="target num">${inBlind ? S.target.toLocaleString() : Math.floor(CFG.anteBase[Math.min(S.ante, CFG.antes) - 1] * CFG.blindMult[kind]).toLocaleString()}</div>`;
  if (inBlind) h += `<div class="bar"><i style="width:${pct}%"></i></div><div class="num" style="font-size:13px">Scored <b style="color:var(--accent)">${S.score.toLocaleString()}</b></div>`;
  if (inBlind) {
    const pv = PREVIEW;
    if (pv && pv.ctx) { const c = pv.ctx; const hot = S.target && c.total >= S.target; h += `<div class="handbox"><div class="hb-name">${pv.label}<span class="muted"> · ${c.han} Han · ${c.tier}${c.furiten ? ' · Furiten' : ''}</span></div><div class="hb-math num"><span class="pchips">${c.chips}</span><span class="px">×</span><span class="pmult">${fmtMult(c.mult)}</span><span class="px">=</span><span class="ptot${hot ? ' hot' : ''}">${c.total.toLocaleString()}</span></div></div>`; }
    else h += `<div class="handbox empty"><div class="hb-name muted">${S.selected.length ? (pv && pv.err ? pv.err : 'Not a valid play') : 'Select tiles to see the score'}</div><div class="hb-math num muted"><span>0</span><span class="px">×</span><span>0</span></div></div>`;
  }
  h += `<div class="stats"><div class="stat plays"><div class="label">Plays</div><div class="v num">${S.plays}</div></div><div class="stat discards"><div class="label">Discards</div><div class="v num">${S.discards}</div></div><div class="stat money"><div class="label">YEN</div><div class="v num">¥${S.money}</div></div><div class="stat"><div class="label">Wall</div><div class="v num">${S.wall.length}</div></div></div>`;
  if (S.indicators.length) { h += `<div class="label" style="margin-top:8px">Dora Indicators</div><div class="dora-ind" id="doraRow"></div>`; }
  h += `<div class="seedline muted">Seed <code class="seed">${S.seed}</code> <button class="ghost tiny-btn" data-copyseed title="Copy the seed to reuse this run">Copy</button></div>`;
  if (S.flowers.length) h += `<div class="label" style="margin-top:8px">Flowers &amp; Seasons</div><div class="flowers">${S.flowers.map(f => `<span class="flowerchip" title="${FLW[f].desc}">${FLW[f].name}</span>`).join('')}</div>`;
  const sc = Object.entries(S.scrolls.meld).filter(([, v]) => v).map(([k, v]) => `${MELD_LABEL[k]} Lv.${v + 1}`).concat(Object.entries(S.scrolls.yaku).filter(([, v]) => v).map(([k, v]) => `${k} +${v}`));
  if (sc.length) h += `<div class="label" style="margin-top:8px">Mastery</div><div style="font-size:12px">${sc.join(' · ')}</div>`;
  $('#blindCard').innerHTML = h;
  if (S.indicators.length) { const row = $('#doraRow'); for (const t of S.indicators) { const e = tileEl(t, { small: true }); e.style.cursor = 'default'; const d = tileFromIdx(nextDora(idx(t))); e.title = 'Indicator: ' + tileName(t) + ' → Dora is ' + tileName(d); row.appendChild(e); } row.insertAdjacentHTML('beforeend', `<span class="muted" style="font-size:11px">Dora: ${S.dora.map(i => tileName(tileFromIdx(i))).join(', ')}</span>`); }
}
function renderTalismans() {
  const box = $('#talismans'); box.innerHTML = '';
  $('#talCount').textContent = `${S.talismans.length} / ${talSlots()} · fire left to right, drag to reorder`;
  for (let i = 0; i < talSlots(); i++) {
    const k = S.talismans[i]; const el = document.createElement('div');
    if (k) { const ed = S.editions[k]; el.className = 'slot filled' + (S.selTal === k ? ' sel' : '') + (ed ? ' ed-' + ed : ''); el.dataset.tal = TAL[k].name; const tgt = TAL[k].copies ? talTarget(S, k) : null; el.innerHTML = `<div class="n"><span class="order">${i + 1}</span>${TAL[k].name}${ed ? ` <span class="edtag ed-${ed}">${EDITIONS[ed].name}</span>` : ''}</div><div class="d">${TAL[k].desc}${tgt ? ` <b>Now: ${tgt.name}.</b>` : TAL[k].copies ? ' <b>Nothing to copy.</b>' : ''}${ed ? ` <b>${EDITIONS[ed].desc}.</b>` : ''}${TAL[k].status ? ' <b>(' + TAL[k].status(S) + ')</b>' : ''}</div>`; bindSlotDrag(el, k); }
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
  $('#openInfo').textContent = S.open.length ? (allClosed ? `${S.open.length} declared · hand is still closed for Yaku` : `${S.open.length} on the table · hand is Open for Yaku`) : 'Hand is closed.';
  if (!S.open.length) box.innerHTML = '<span class="muted empty">No melds on the table</span>';
  for (const m of S.open) { const w = document.createElement('div'); w.className = 'meld' + (m.closed ? ' closedmeld' : ''); w.innerHTML = `<span class="mt">${m.closed ? 'CLOSED ' : ''}${MELD_LABEL[m.type].toUpperCase()}</span>`; for (const t of m.tiles) w.appendChild(tileEl(t, { small: true, called: t.id === m.calledId })); box.appendChild(w); }
}
function renderRiver() {
  const box = $('#river'); box.innerHTML = '';
  for (const t of S.river) { const e = tileEl(t, { small: true, sel: S.selRiver === t.id }); e.onclick = () => { if (S.phase !== 'blind') return; S.selRiver = S.selRiver === t.id ? null : t.id; render(); }; box.appendChild(e); }
  if (!S.river.length) box.innerHTML = '<span class="muted empty">No discards yet</span>';
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
  $('#btnSort').textContent = hidden ? 'Manual Order' : (S.sortHand ? 'Auto-sort On' : 'Sort Hand'); $('#btnSort').disabled = hidden; $('#btnSort').title = S.sortHand ? 'New tiles are sorted in. Drag a tile to switch to manual order.' : 'Sort the hand now and keep it sorted. Drag tiles to reorder.';
  $('#btnDots').textContent = SHOW_DOTS ? 'Dots On' : 'Dots Off'; $('#btnDots').title = 'Green dots mark tiles you can discard without losing progress';
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
  $('#preview').innerHTML = '';
  $('#btnCall').disabled = !inBlind || S.busy || !S.selRiver || S.selected.length < 2;
  $('#btnClear').disabled = !inBlind || S.busy;
}
function renderLast() {
  const c = S.lastPlay; const box = $('#lastPlay');
  if (!c) { box.innerHTML = `<div class="label">Last Play</div><div class="muted" style="font-size:12px;margin-top:4px">Nothing scored yet. Best this run: ${S.stats.best.toLocaleString()}${S.stats.bestDesc ? ' (' + S.stats.bestDesc + ')' : ''}</div>`; return; }
  let h = `<div class="label">Last Play</div><div style="font-family:var(--display);font-size:15px;margin:2px 0 6px">${c.desc}</div>`;
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
function showModal(html, pinned) { modalPinned = !!pinned; $('#modal').innerHTML = html; $('#overlay').hidden = false; fillExamples($('#modal')); translateDOM($('#modal')); }
function hideModal() { modalPinned = false; $('#overlay').hidden = true; }
function cardHTML(it, idx) {
  const d = itemDef(it); const p = it.free ? 0 : itemPrice(it);
  const kindLabel = { talisman: 'Talisman', omikuji: 'Omikuji', kami: 'Kami Spirit', scroll: 'Scroll of Mastery', flower: 'Flower / Season', pack: 'Booster pack' }[it.kind];
  const ed = it.edition ? EDITIONS[it.edition] : null;
  return `<div class="shopcard ${it.kind}${it.sold ? ' sold' : ''}${ed ? ' ed-' + it.edition : ''}"><div class="kind">${kindLabel}${ed ? ` · <span class="edtag ed-${it.edition}">${ed.name}</span>` : ''}</div><div class="n">${d.name}</div><div class="d">${d.desc}${ed ? ` <b>${ed.name}: ${ed.desc}.</b>` : ''}</div><div class="buy"><span class="num" style="color:var(--accent)">${p === 0 ? 'Free' : '¥' + p}</span>${it.sold ? '<span class="muted">Sold</span>' : `<button class="primary" data-buy="${idx}">${it.kind === 'pack' ? 'Open' : 'Buy'}</button>`}</div></div>`;
}
function shopHTML() {
  const r = S.reward; const items = [...S.shop.cards, S.shop.scroll, S.shop.flower, S.shop.pack].filter(Boolean);
  const next = ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[blindKind()];
  const nextBoss = blindKind() === 'boss' ? BOSSES[S.bossOrder[S.ante - 1]] : null;
  let h = `<h2>Shop</h2>`;
  if (r) h += `<div class="label">Blind Defeated · Reward</div><div class="reward-list num"><span>${({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[r.kind]} defeated</span><span>¥${r.base}</span><span>Unused Plays</span><span>¥${r.left}</span><span>Interest (¥1 per ¥5)</span><span>¥${r.interest}</span>${r.tal ? `<span>Talismans</span><span>¥${r.tal}</span>` : ''}${r.summer ? `<span>Summer</span><span>¥${r.summer}</span>` : ''}${r.invest ? `<span>Investment Tag</span><span>¥${r.invest}</span>` : ''}<span><b>Total</b></span><span><b>¥${r.total}</b></span></div>`;
  h += `<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center"><span>YEN: <b class="num" style="color:var(--accent)">¥${S.money}</b></span><span class="muted">Talismans ${S.talismans.length}/${talSlots()} · Consumables ${S.consumables.length}/${conSlots()}</span></div>`;
  if (S.shop.coupon) h += `<div class="msg">Coupon Tag: Talismans and consumables are free in this shop.</div>`;
  if (S.shop.freePacks.length) h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0">${S.shop.freePacks.map((pk, i) => `<button class="primary" data-freepack="${i}">Open Free ${PACKS[pk].name}</button>`).join('')}</div>`;
  h += `<div class="shop-grid">${items.map((it, i) => cardHTML(it, i)).join('')}</div>`;
  h += ownedHTML();
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="margin-bottom:8px">${S.msg || ''}</div>`;
  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><button id="mReroll">Reroll Cards (${S.shop.freeReroll ? 'free' : '¥' + rerollCost()})</button><button id="mDeck" class="ghost">View Wall</button><span style="flex:1"></span><span class="muted">Next: Ante ${S.ante} ${next}${nextBoss ? ' · ' + nextBoss.name : ''}</span><button id="mNext" class="primary">Continue →</button></div>`;
  if (S.consumables.length) h += `<div class="muted" style="font-size:12px;margin-top:8px">Consumables that need tiles are used during a Blind. Click one on the board to use it now if it needs none.</div>`;
  return h;
}
function ownedHTML() {
  const tal = S.talismans.map((k, i) => { const ed = S.editions[k]; const tgt = TAL[k].copies ? talTarget(S, k) : null; return `<div class="shopcard talisman owned-card${ed ? ' ed-' + ed : ''}"><div class="kind"><span class="order">${i + 1}</span>Talisman${ed ? ` · <span class="edtag ed-${ed}">${EDITIONS[ed].name}</span>` : ''}</div><div class="n">${TAL[k].name}</div><div class="d">${TAL[k].desc}${tgt ? ` <b>Now: ${tgt.name}.</b>` : ''}${ed ? ` <b>${EDITIONS[ed].desc}.</b>` : ''}${TAL[k].status ? ' <b>(' + TAL[k].status(S) + ')</b>' : ''}</div><div class="buy"><span class="muted">Sells for</span><button class="ghost" data-sell="${k}">Sell ¥${Math.max(1, Math.floor(talValue(k) / 2))}</button></div></div>`; });
  const con = S.consumables.map((c, i) => { const d = CONS[c.key]; return `<div class="shopcard ${c.kind} owned-card"><div class="kind">${c.kind === 'kami' ? 'Kami Spirit' : 'Omikuji'}</div><div class="n">${d.name}</div><div class="d">${d.desc}</div><div class="buy"><span class="muted">${d.anywhere ? 'Usable now' : 'Use during a Blind'}</span><span style="display:flex;gap:6px">${d.anywhere ? `<button class="ghost" data-usecon="${i}">Use</button>` : ''}<button class="ghost" data-sellcon="${i}">Sell ¥${Math.max(1, Math.floor(d.cost / 2))}</button></span></div></div>`; });
  return `<div class="label" style="margin:10px 0 4px">Your Talismans · ${S.talismans.length}/${talSlots()} · fire left to right · sell to make room</div>` + (tal.length ? `<div class="shop-grid owned-grid">${tal.join('')}</div>` : `<div class="muted" style="font-size:12px">None yet.</div>`) + `<div class="label" style="margin:10px 0 4px">Your Consumables · ${S.consumables.length}/${conSlots()}</div>` + (con.length ? `<div class="shop-grid owned-grid">${con.join('')}</div>` : `<div class="muted" style="font-size:12px">None yet.</div>`);
}
function packHTML() {
  const pk = PACKS[S.pack.key];
  let h = `<h2>${pk.name}</h2><p class="muted" style="margin:0 0 8px">${pk.desc} Choose ${S.pack.left} more.${S.pack.free ? ' (Free, from a Tag.)' : ''}</p>`;
  h += `<div class="shop-grid">${S.pack.choices.map((it, i) => { const d = itemDef(it); const ed = it.edition ? EDITIONS[it.edition] : null; return `<div class="shopcard ${it.kind}${it.sold ? ' sold' : ''}${ed ? ' ed-' + it.edition : ''}"><div class="kind">${{ talisman: 'Talisman', omikuji: 'Omikuji', kami: 'Kami Spirit', scroll: 'Scroll of Mastery' }[it.kind]}${ed ? ` · <span class="edtag ed-${it.edition}">${ed.name}</span>` : ''}</div><div class="n">${d.name}</div><div class="d">${d.desc}${ed ? ` <b>${ed.name}: ${ed.desc}.</b>` : ''}</div><div class="buy"><span></span>${it.sold ? '<span class="muted">Taken</span>' : `<button class="primary" data-take="${i}">Take</button>`}</div></div>`; }).join('')}</div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="margin:6px 0">${S.msg || ''}</div>`;
  h += ownedHTML();
  h += `<div style="margin-top:12px"><button id="mPackDone" class="ghost">Skip the Rest</button></div>`;
  return h;
}
function overHTML(won) {
  const st = S.stats;
  return `<h2>${won ? 'You broke the bank!' : 'The syndicate collects.'}</h2><p>${won ? `All ${CFG.antes} Antes cleared.` : `Out of Plays on Ante ${S.ante}, ${S.boss ? BOSSES[S.boss].name : blindKind() + ' blind'}: scored ${S.score.toLocaleString()} of ${S.target.toLocaleString()}.`}</p>
  <div class="reward-list num"><span>Blinds defeated</span><span>${st.blinds}</span><span>Complete hands</span><span>${st.hands}</span><span>Partial plays</span><span>${st.melds}</span><span>Best single play</span><span>${st.best.toLocaleString()}${st.bestDesc ? ' · ' + st.bestDesc : ''}</span><span>YEN</span><span>¥${S.money}</span><span>Talismans</span><span>${S.talismans.map(k => TAL[k].name).join(', ') || 'none'}</span></div>
  <div class="seedline muted" style="margin:8px 0">Seed <code class="seed">${S.seed}</code> <button class="ghost tiny-btn" data-copyseed>Copy</button> · ${DECKS[S.deckKey].name} · ${STAKES[S.stake].name}</div>
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
  return `<h2>How to Play</h2><div class="menu-rules">
  <p><b>Goal.</b> Score at least the Blind's target before you run out of Plays. Beat all ${CFG.antes} Antes (Small, Big, Boss each) to win.</p>
  <p><b>Hand.</b> You hold ${CFG.handSize} tiles from a 136-tile Wall (4 of each tile; four of the 5s are Red Fives). You refill after every action. A complete hand uses 14 of them, so you always have spare tiles to work with.</p>
  <p><b>Partial play.</b> Select any tiles that split into melds (Chi runs, Pon triplets, Kan quads) plus at most one pair, and press Play. The button names the rung: Lone Tile, Pair, Two Pair, one meld, Two Melds, Three Melds, Ready Hand (3 melds + pair), Four Melds. Bigger rungs score far more, so a hand that falls one tile short is still worth cashing in. Costs 1 Play. See the Yaku button for the full ladder.</p>
  <p><b>Complete hand.</b> Scroll levels for Chi, Pon, Kan and Pair apply inside complete hands too, so the full hand always beats its ready hand. Select 14 tiles (4 melds + a pair, or Seven Pairs / Thirteen Orphans) and press Play. Yaku add Han, and Han sets the multiplier: 1 Han ×2, 2 ×4, 3 ×8, 4–5 ×15, 6–7 ×25, 8–10 ×40, 11–12 ×60, 13+ ×100.</p>
  <p><b>Chips.</b> 2–8 are worth their face value, 1s, 9s and Honors are worth 10. Score = Chips × Mult.</p>
  <p><b>How Mult is built.</b> Han from the play, Yaku, Red Fives, Dora and Scrolls is converted once through the Han table into a starting Mult. Then your Talismans fire left to right: some add Chips, some add flat Mult (+4 Mult), some multiply (×1.5 Mult). Because they fire in order, a +Mult Talisman placed before a ×Mult Talisman scores more than the reverse. Drag Talismans to arrange them; the number on each card is its firing order.</p>
  <p><b>Discard.</b> Throw up to ${CFG.maxDiscardTiles} tiles into the River. Costs 1 Discard. The River stays visible for the whole Blind. You get ${CFG.playsPerBlind} Plays and ${CFG.discardsPerBlind} Discards per Blind before Talismans and Flowers.</p>
  <p><b>Call.</b> Select one River tile and 2–3 hand tiles that form a meld with it, then press Call. Costs 1 Play, no score yet. The meld is set aside as Open and counts toward your complete hand. Open hands get reduced Han on some Yaku, and lose closed-only Yaku (Pinfu, Iipeikou...). After a call you discard 1 tile to settle it; this does not use a Discard.</p>
  <p><b>Arranging your hand.</b> Drag any hand tile to reorder it, with a mouse or a finger. Dragging switches off auto-sort; the Sort button sorts the hand again and keeps new tiles sorted in. Tiles score in the order they sit in your hand, which matters for Shikigami and for the scoring animation.</p>
  <p><b>Shop and Blind Select.</b> Every shop sells a booster pack: open it and keep one (or two) of what's inside. After the shop, the Blind Select screen shows the Ante's three blinds with their targets, rewards and the Boss's rule. A Small or Big Blind can be skipped for the Tag shown on its card instead of its cash: free packs, editions, coupons, money, a bigger hand or a different Boss. Tags you hold show in the side panel. You can sell Talismans and consumables from inside the shop.</p>
  <p><b>Setup.</b> New runs let you choose a Wall (deck), a Stake (difficulty) and a seed. Sharing a seed replays the same Wall, shops and bosses.</p>
  <p><b>Helper.</b> Under your hand the game shows how many tiles you are from a complete hand, and tiles marked with a green dot can be discarded without losing progress. Select tiles to see whether that discard keeps you on track. Against The Purist it only counts your visible tiles.</p>
  <p><b>Kan.</b> Four identical tiles can be played as a partial Kan for points, or declared: press Declare Kan (or K) to set them aside as a closed Kan that counts toward your complete hand without opening it. Every Kan, declared or called from the River, draws one replacement tile from the Wall. If that replacement tile ends up as the winning tile of your complete hand, you score Rinshan Kaihou (+1 Han). A called Kan then settles with one discard like any Call.</p>
  <p><b>Furiten.</b> The winning tile of a complete hand is the newest tile you drew among the 14 you play. If a copy of that tile type sits in your River, the hand is in Furiten and the multiplier is halved. The helper shows your waits when you are one tile away and marks the ones already in your River. Kappa turns Furiten into a bonus.</p>
  <p><b>Engravings &amp; editions.</b> Omikuji can engrave tiles: Gold Foil (¥1), Obsidian (+20 Chips), Dragon Mark (+1 Han), Jade (×1.5 Mult), Red Seal (scores twice) and Glass (×2 Mult, 1 in 4 chance to shatter). Shop Talismans sometimes come in an edition: Foil (+50 Chips), Holographic (+1 Han) or Polychrome (×1.5 Mult) on every play.</p>
  <p><b>Red Fives &amp; Dora.</b> Each Red Five scored gives +1 Han. Dora indicators (from Omikuji) make matching tiles worth +1 Han each.</p>
  <p><b>Bosses.</b> Every third Blind is a Yakuza boss with a rule twist. Read the red box.</p>
  <p><b>Shop.</b> After each Blind, spend YEN on Talismans (passive, 5 slots), Omikuji and Kami (consumables, use on selected hand tiles), Scrolls of Mastery (permanent upgrades) and Flowers (run-long perks). Click a Talisman on the board to sell it.</p>
  </div><div style="margin-top:12px"><button id="mClose" class="primary">Close</button></div>`;
}
function mostPlayedRung() { let best = null, n = 0; for (const [k, v] of Object.entries(S.stats.rungs || {})) if (v > n) { n = v; best = k; } return best; }
function mostScoredYaku() { let best = null, n = 0; for (const [k, v] of Object.entries(S.stats.yaku || {})) if (v > n) { n = v; best = k; } return best; }
let infoTab = 'run';
function parseHand(str) { const out = []; for (const grp of str.split(' ')) { const m = grp.match(/^(\d+)([mpsz])$/); if (!m) continue; const tiles = [...m[1]].map(d => ({ id: 0, suit: m[2], rank: +d, red: false, eng: null })); out.push(tiles); } return out; }
function exampleHTML(ex) { return `<div class="exrow" data-ex="${ex}"></div>`; }
function fillExamples(root) { root.querySelectorAll('.exrow').forEach(row => { if (row.children.length) return; for (const grp of parseHand(row.dataset.ex)) { const g = document.createElement('div'); g.className = 'exgrp'; for (const t of grp) { const e = tileEl(t, { small: true }); e.classList.add('tiny'); e.style.cursor = 'default'; g.appendChild(e); } row.appendChild(g); } }); }
function yakuHTML() {
  const st = S.stats; const most = mostPlayedRung(); const yc = k => (S && S.stats.yaku[k]) || 0;
  const tabs = [['run', 'Run'], ['ladder', 'Play Ladder'], ['yaku', 'Yaku'], ['yakuman', 'Yakuman']];
  let h = `<h2>Run Info</h2><div class="tabs">${tabs.map(([k, n]) => `<button class="tab${infoTab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
  if (infoTab === 'run') {
    h += `<div class="runinfo"><span><b>Seed</b> <code class="seed">${S.seed}</code> <button class="ghost tiny-btn" data-copyseed>Copy</button></span><span><b>${DECKS[S.deckKey].name}</b> · ${STAKES[S.stake].name}</span><span><b>Ante</b> ${Math.min(S.ante, CFG.antes)} / ${CFG.antes}</span><span><b>Blinds won</b> ${st.blinds}</span><span><b>Complete hands</b> ${st.hands}</span><span><b>Partial plays</b> ${st.melds}</span><span><b>Calls</b> ${st.calls} · <b>Kans</b> ${st.kans}</span><span><b>Discards</b> ${st.discards}</span><span><b>Skipped blinds</b> ${st.skipped}</span><span><b>Best play</b> ${st.best.toLocaleString()}${st.bestDesc ? ' (' + st.bestDesc + ')' : ''}</span></div>`;
    h += `<div class="label" style="margin:12px 0 4px">Talismans</div><div class="owned">${S.talismans.map((k, i) => `<span class="own"><span class="order">${i + 1}</span><b>${TAL[k].name}</b>${S.editions[k] ? ' <span class="edtag ed-' + S.editions[k] + '">' + EDITIONS[S.editions[k]].name + '</span>' : ''}</span>`).join('') || '<span class="muted">None</span>'}</div>`;
    h += `<div class="label" style="margin:12px 0 4px">Flowers &amp; Seasons</div><div class="owned">${S.flowers.map(f => `<span class="own"><b>${FLW[f].name}</b> <span class="muted">${FLW[f].desc}</span></span>`).join('') || '<span class="muted">None</span>'}</div>`;
    h += `<div class="label" style="margin:12px 0 4px">Tags Held</div><div class="owned">${(S.tags || []).map(t => `<span class="own"><b>${TAGS[t].name}</b> <span class="muted">${TAGS[t].desc}</span></span>`).join('') || '<span class="muted">None</span>'}</div>`;
    const sc = Object.entries(S.scrolls.meld).filter(([, v]) => v).map(([k, v]) => `<span class="own"><b>${MELD_LABEL[k]}</b> Lv.${v + 1}</span>`).concat(Object.entries(S.scrolls.yaku).filter(([, v]) => v).map(([k, v]) => `<span class="own"><b>${(YAKU_SHEET.find(y => y.k === k) || { n: k }).n}</b> +${v} Han</span>`));
    h += `<div class="label" style="margin:12px 0 4px">Mastery</div><div class="owned">${sc.join('') || '<span class="muted">No Scrolls yet</span>'}</div>`;
    h += `<div class="label" style="margin:12px 0 4px">Bosses</div><div class="owned">${S.bossOrder.slice(0, CFG.antes).map((b, i) => { const known = i <= S.ante - 1 || st.bosses.includes(b); return `<span class="own${known ? '' : ' muted'}"><span class="order">A${i + 1}</span><b>${known ? BOSSES[b].name : '?'}</b></span>`; }).join('')}</div>`;
  } else if (infoTab === 'ladder') {
    const lv = k => (S && S.scrolls.meld[k]) || 0; const lvTag = k => lv(k) ? ` <span class="tag">Lv.${lv(k) + 1}</span>` : '';
    const val = k => `${CFG.meldBase[k].chips + lv(k) * CFG.scrollChips} chips, ${CFG.meldBase[k].han + lv(k) * CFG.scrollHan} Han`;
    const played = k => { const n = (S && S.stats.rungs[k]) || 0; return `<td class="num">${n || '—'}${k === most && n ? ' <span class="tag">Most played</span>' : ''}</td>`; };
    h += `<p class="muted" style="margin:8px 0">Base values after your Scroll levels. "Played" counts this run; the most-played rung is marked.</p><div style="overflow-x:auto"><table class="sheet"><thead><tr><th>Play</th><th>Base</th><th>Played</th><th>Example</th></tr></thead><tbody>`;
    const exs = { single: '7p', pair: '77p', twopair: '33m 77p', chi: '456s', pon: '555z', kan: '8888m' };
    for (const k of ['single', 'pair', 'twopair', 'chi', 'pon', 'kan']) h += `<tr><td><b>${MELD_LABEL[k]}</b>${lvTag(k)}</td><td class="num">${val(k)}</td>${played(k)}<td>${exampleHTML(exs[k])}</td></tr>`;
    const rex = { '2,0': '234m 777p', '2,1': '234m 777p 55s', '3,0': '234m 777p 456s', '3,1': '234m 777p 456s 55s', '4,0': '234m 777p 456s 678p', '4,1': '234m 777p 456s 678p 55s' };
    for (const [k, r] of Object.entries(CFG.rungs)) h += `<tr><td><b>${r.name}</b></td><td class="num">${r.chips} chips, ${r.han} Han</td>${played('rung' + k.replace(',', ''))}<td>${exampleHTML(rex[k])}</td></tr>`;
    h += `<tr><td><b>Complete Hand</b>${lvTag('hand')}</td><td class="num">${val('hand')}</td>${played('hand')}<td>${exampleHTML('234m 777p 456s 678p 55s')}</td></tr>`;
    h += `</tbody></table></div><p class="muted" style="font-size:12px">Each Kan inside a multi-meld play adds +${CFG.kanBonus.chips} chips and +${CFG.kanBonus.han} Han. Honor sets add Yakuhai. Scroll levels apply to every play containing that component: +10 Chips per level for each such component, and +1 Han per level once for the play.</p>`;
    h += `<div style="overflow-x:auto;margin-top:10px"><table class="sheet"><thead><tr><th>Han</th><th>Mult</th><th>Tier</th></tr></thead><tbody>`;
    for (const [hh, m, t] of [[0, 1, '—'], [1, 2, 'Standard'], [2, 4, 'Advanced'], [3, 8, 'Master'], ['4–5', 15, 'Mangan'], ['6–7', 25, 'Haneman'], ['8–10', 40, 'Baiman'], ['11–12', 60, 'Sanbaiman'], ['13+', 100, 'Yakuman']]) h += `<tr><td class="num">${hh}</td><td class="num">×${m}</td><td>${t}</td></tr>`;
    h += `</tbody></table></div><p style="margin:10px 0 0;font-size:12px"><b>Extra Han on any play:</b> each Red Five +1 (Koi: +2). Each tile matching a flipped Dora indicator +1. Dragon Mark engraving +1. Han is converted through the table once; after that Talismans fire left to right, adding Chips, adding flat Mult or multiplying Mult, so put +Mult Talismans before ×Mult ones. Furiten (the newest-drawn tile of your complete hand has a copy in your River) halves the final Mult.</p>`;
  } else {
    const list = infoTab === 'yaku' ? YAKU_SHEET : YAKUMAN_SHEET;
    h += `<p class="muted" style="margin:8px 0">${infoTab === 'yaku' ? 'A complete hand is 4 melds + 1 pair (14 tiles) unless noted. Han is shown as closed / open; a hand is Open once you have Called from the River. A complete hand with no Yaku still counts as 1 Han.' : 'Each Yakuman is worth 13 Han (×100). Several in one hand stack.'} Examples are drawn with tiles; a Kan shows as four of a kind.</p>`;
    h += `<div class="yakulist">` + list.map(y => { const b = y.k && S.scrolls.yaku[y.k]; const n = y.k ? yc(y.k) : 0; return `<div class="yakucard"><div class="yh"><b>${y.n}</b>${y.c ? ' <span class="tag">Closed only</span>' : ''}${b ? ` <span class="tag">Scroll +${b}</span>` : ''}<span class="num" style="margin-left:auto;color:var(--accent)">${y.h} Han</span><span class="muted num" style="margin-left:10px">${n ? 'Scored ×' + n : 'Not yet scored'}</span></div><div class="yd">${y.d}</div>${y.ex ? exampleHTML(y.ex) : ''}</div>`; }).join('') + `</div>`;
  }
  h += `<div style="margin-top:12px"><button id="mClose" class="primary">Close</button></div>`;
  return h;
}
let setupSel = { deck: 0, stake: 0 };
function setupHTML() {
  const car = (name, obj) => { const keys = Object.keys(obj); const i = ((setupSel[name] % keys.length) + keys.length) % keys.length; const v = obj[keys[i]]; return `<div class="carousel" data-car="${name}"><button class="ghost arrow" data-nav="${name}:-1" title="Previous">&#9664;</button><div class="carcard"><input type="hidden" name="${name}" value="${keys[i]}"><b>${v.name}</b><span class="muted">${v.desc}</span><span class="dots">${keys.map((k, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span></div><button class="ghost arrow" data-nav="${name}:1" title="Next">&#9654;</button></div>`; };
  return `<h2>New Run</h2><div class="setup stacked"><div><div class="label">Wall</div>${car('deck', DECKS)}</div><div><div class="label" style="margin-top:10px">Stake</div>${car('stake', STAKES)}</div></div>
  <div class="label" style="margin-top:12px">Seed</div><input id="seedInput" placeholder="random" maxlength="24" autocomplete="off"><div class="muted" style="font-size:11px;margin-top:4px">Share a seed and the same Wall, shops and bosses come up for everyone. Leave blank for a random run.</div>
  <div style="display:flex;gap:8px;margin-top:14px"><button id="mStartRun" class="primary">Start Run</button><button id="mClose">Cancel</button></div>`;
}
function menuHTML(hasSave) {
  return `<h2 style="font-size:40px" data-notr>Yakuman</h2><p class="muted">A Mahjong roguelite in the Balatro mould. Playtest build. Switch between Riichi and Hong Kong terminology with the button in the header.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">${hasSave ? '<button id="mContinue" class="primary">Continue Run</button>' : ''}<button id="mStart" class="${hasSave ? '' : 'primary'}">New Run</button><button id="mRules" class="ghost">How to Play</button></div>`;
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
  $('#dbgTal').onchange = e => { const k = e.target.value; if (!k) return; if (S.talismans.length < talSlots() && !S.talismans.includes(k)) S.talismans.push(k); e.target.value = ''; render(); };
  $('#dbgCon').onchange = e => { const k = e.target.value; if (!k) return; if (S.consumables.length < conSlots()) S.consumables.push({ kind: CONS[k].kind, key: k }); e.target.value = ''; render(); };
  $('#dbgScr').onchange = e => { const k = e.target.value; if (!k) return; buyFree({ kind: 'scroll', key: k }); e.target.value = ''; render(); };
  $('#dbgEd').onchange = e => { const k = e.target.value; if (!k || !S.selTal) return; if (k === 'none') delete S.editions[S.selTal]; else S.editions[S.selTal] = k; e.target.value = ''; render(); };
  $('#dbgFlw').onchange = e => { const k = e.target.value; if (!k) return; if (!S.flowers.includes(k)) S.flowers.push(k); e.target.value = ''; render(); };
}
function buyFree(it) { const m = S.money; S.money = 999; buy(it); S.money = m; }

// ===================== BOOT & EVENTS =====================
function copySeed(btn) {
  const txt = S.seed; const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1200); };
  try { navigator.clipboard.writeText(txt).then(done, () => fallback()); } catch (e) { fallback(); }
  function fallback() { const r = document.createRange(); const code = btn.previousElementSibling; if (code) { r.selectNodeContents(code); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); btn.textContent = 'Selected'; setTimeout(() => { btn.textContent = 'Copy'; }, 1200); } }
}
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
  $('#btnNewRun').onclick = () => showModal(`<h2>Start a New Run?</h2><p class="muted">Your current run will be lost.</p><div style="display:flex;gap:8px"><button id="mNewRun" class="danger">New Run</button><button id="mClose">Cancel</button></div>`, true);
  document.addEventListener('click', e => { const b = e.target.closest('[data-copyseed]'); if (b) copySeed(b); });
  $('#overlay').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.copyseed != null) return;
    if (t.dataset.tab) { infoTab = t.dataset.tab; showModal(yakuHTML(), true); return; }
    if (t.id === 'mClose') { hideModal(); render(); }
    else if (t.id === 'mNewRun' || t.id === 'mStart') { showModal(setupHTML(), true); }
    else if (t.dataset.nav) { const [name, d] = t.dataset.nav.split(':'); const seed = ($('#seedInput') || {}).value || ''; setupSel[name] += +d; showModal(setupHTML(), true); $('#seedInput').value = seed; }
    else if (t.id === 'mStartRun') { const deck = ($('#modal input[name=deck]') || {}).value, stake = ($('#modal input[name=stake]') || {}).value, seed = ($('#seedInput') || {}).value; hideModal(); newRun({ deck, stake, seed }); }
    else if (t.id === 'mContinue') { hideModal(); render(); }
    else if (t.id === 'mRules') { showModal(rulesHTML() + '', true); $('#mClose').onclick = () => { showModal(menuHTML(!!load()), true); }; }
    else if (t.id === 'mNext') { S.shop = null; S.pack = null; S.msg = ''; S.phase = 'select'; render(); }
    else if (t.id === 'mPlayBlind') { S.msg = ''; startBlind(); render(); }
    else if (t.id === 'mRunInfo') { showModal(yakuHTML(), true); $('#mClose').onclick = () => { modalPinned = false; render(); }; }
    else if (t.id === 'mReroll') reroll();
    else if (t.id === 'mSkip') skipBlind();
    else if (t.dataset.freepack != null) { const pk = S.shop.freePacks.splice(+t.dataset.freepack, 1)[0]; openPack(pk, true); render(); }
    else if (t.dataset.take != null) takeFromPack(+t.dataset.take);
    else if (t.id === 'mPackDone') { S.pack = null; render(); }
    else if (t.id === 'mDeck') { showModal(deckHTML(), true); $('#mClose').onclick = () => { modalPinned = false; render(); }; }
    else if (t.dataset.buy != null) { const items = [...S.shop.cards, S.shop.scroll, S.shop.flower, S.shop.pack].filter(Boolean); buy(items[+t.dataset.buy]); }
    else if (t.dataset.sell) sellTalisman(t.dataset.sell);
    else if (t.dataset.sellcon != null) sellConsumable(+t.dataset.sellcon);
    else if (t.dataset.usecon != null) useConsumable(+t.dataset.usecon);
  });
  document.addEventListener('keydown', e => {
    if (S.phase !== 'blind' || !$('#overlay').hidden) return;
    if (S.busy) { skipAnim = true; return; }
    if (e.key === 'Enter' || e.key === 'p') doPlay(); else if (e.key === 'd') doDiscard(); else if (e.key === 'c') doCall(); else if (e.key === 'k') doDeclareKan(); else if (e.key === 'Escape') { S.selected = []; S.selRiver = null; render(); }
  });
}
function boot(saved) {
  bindEvents();
  if (saved && saved.phase && saved.deck) { S = saved; S.talState = S.talState || {}; S.editions = S.editions || {}; S.seed = S.seed || 'legacy'; S.deckKey = S.deckKey || 'standard'; S.stake = S.stake || 'white'; if (S.rngState === undefined) S.rngState = hashSeed(S.seed + Date.now()); S.stats.rungs = S.stats.rungs || {}; S.stats.yaku = S.stats.yaku || {}; S.stats.bosses = S.stats.bosses || []; S.tags = S.tags || []; if (!S.skipTags) S.skipTags = { small: pick(Object.keys(TAGS)), big: pick(Object.keys(TAGS)) }; S.stats.skipped = S.stats.skipped || 0; S.stats.calls = S.stats.calls || 0; S.stats.kans = S.stats.kans || 0; S.stats.discards = S.stats.discards || 0; S.busy = false; S.newIds = []; S.drawSeq = S.drawSeq || 0; render(); showModal(menuHTML(true), true); }
  else { S = newState(); startBlind(); render(); showModal(menuHTML(false), true); }
}
try { if (window.claude && window.claude.hot) window.claude.hot.snapshot(() => S); } catch (e) { }
const hotData = (window.claude && window.claude.hot && window.claude.hot.data) || null;
boot(hotData && hotData.phase ? hotData : load());
