// ===================== TERMINOLOGY SWITCH =====================
let LANG = 'ja'; try { LANG = localStorage.getItem('yakuman.lang') === 'hk' ? 'hk' : 'ja'; } catch (e) { }
let SHOW_DOTS = false; try { SHOW_DOTS = localStorage.getItem('yakuman.dots') === 'on'; } catch (e) { }
// Helper hints under the hand: tiles away / complete hand ready is on by default; waits and what a selected discard does are off.
let HINTS = { away: true, waits: false, without: false };
// Corner numbers on tiles: 'all', 'some' (Characters and Winds, the default) or 'none'. Dots and Bamboo can be counted by their pips.
let TILE_NUMS = 'some'; try { TILE_NUMS = localStorage.getItem('yakuman.tilenums') || 'some'; } catch (e) { } try { Object.assign(HINTS, JSON.parse(localStorage.getItem('yakuman.hints') || '{}')); } catch (e) { }
const SPEEDS = { slow: 2.5, normal: 1, fast: 0.45, instant: 0 };
let ANIM_SPEED = 'normal'; try { const v = localStorage.getItem('yakuman.speed'); if (SPEEDS[v] !== undefined) ANIM_SPEED = v; } catch (e) { }
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
function settingsHTML() {
  const dbgOn = !$('#debugBar').hidden;
  return `<div class="shophead"><h2>Settings</h2></div>
  <div class="setsec">Gameplay</div>
  <div class="setrow"><div><b>Helper hints</b><div class="muted">Shown under your hand. Tiles Away (on by default) says how many tiles you are from a complete hand. Waiting On lists the tiles you need, and Without These says whether the tiles you select can go without setting you back.</div></div><div class="setbtns">${[['away', 'Tiles Away'], ['waits', 'Waiting On'], ['without', 'Without These']].map(([k, n]) => `<button class="${HINTS[k] ? 'primary' : ''}" data-sethint="${k}">${n}</button>`).join('')}</div></div>
  <div class="setrow"><div><b>Dead-tile dots (assist)</b><div class="muted">Off by default. When on, green dots mark tiles you can discard without losing progress toward a complete hand. A sizeable help: it solves the discard choice for you.</div></div><div class="setbtns"><button class="${SHOW_DOTS ? 'primary' : ''}" data-setdots="on">On</button><button class="${!SHOW_DOTS ? 'primary' : ''}" data-setdots="off">Off</button></div></div>
  <div class="setsec">Display</div>
  <div class="setrow"><div><b>Terminology</b><div class="muted" data-notr>Riichi uses Japanese names (Chi, Pon, Kan, Han, Yaku, ¥). Hong Kong uses English names (Chow, Pung, Kong, Faan, $).</div></div><div class="setbtns"><button class="${LANG === 'ja' ? 'primary' : ''}" data-setlang="ja">Riichi</button><button class="${LANG === 'hk' ? 'primary' : ''}" data-setlang="hk">Hong Kong</button></div></div>
  <div class="setrow"><div><b>Tile numbers</b><div class="muted">The small number or letter in a tile's corner. Characters and Winds is the default: Dots and Bamboo are counted by their pips. With All Tiles, some numbers sit over the Dots and Bamboo art.</div></div><div class="setbtns">${[['all', 'All Tiles'], ['some', 'Characters and Winds'], ['none', 'None']].map(([k, n]) => `<button class="${TILE_NUMS === k ? 'primary' : ''}" data-settilenums="${k}">${n}</button>`).join('')}</div></div>
  <div class="setrow"><div><b>Scoring animation speed</b><div class="muted">How fast tiles and Talismans score. Instant shows the result at once. Clicking anywhere during scoring also skips.</div></div><div class="setbtns">${Object.keys(SPEEDS).map(k => `<button class="${ANIM_SPEED === k ? 'primary' : ''}" data-setspeed="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
  <div class="setsec">Advanced</div>
  <div class="setrow"><div><b>Debug tools</b><div class="muted">A bar under the board with money, plays, items, bosses and editions for playtesting.</div></div><div class="setbtns"><button class="${dbgOn ? 'primary' : ''}" data-setdbg="on">Show</button><button class="${!dbgOn ? 'primary' : ''}" data-setdbg="off">Hide</button></div></div>
  <div class="setrow"><div><b>Saved run</b><div class="muted">The current run is saved in this browser automatically.</div></div><div class="setbtns solo"><button class="danger" data-wipe>Wipe save and reload</button></div></div>
  <button id="mClose" hidden>Close</button>`;
}
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
// The Purist: is a face-down tile selected? Then the scoring box and the Play button must not reveal what the tiles make.
const hiddenSelected = () => S.boss === 'purist' && !S.revealed && S.phase === 'blind' && selTiles().some(t => isHonor(t) || isTerminal(t));
// Kawauso: one River tile may complete a hand as its winning tile. The Fisherman forbids taking tiles from the River.
const canClaim = () => S.boss !== 'fisherman' && S.talismans.some(k => TAL[k].riverClaim);
const claimTile = () => (S.selRiver && canClaim()) ? S.river.find(t => t.id === S.selRiver) || null : null;
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
  S.firstPlayDone = false; S.freeCallsUsed = 0; S.bossSuit = S.boss === 'collector' ? pick(['m', 'p', 's']) : null;
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
  genShop(); S.phase = 'cashout';
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
  const rt = claimTile();
  if (!rt && S.selRiver && S.boss === 'fisherman' && S.talismans.some(k => TAL[k].riverClaim) && sel.length === need - 1) return { err: 'The Fisherman forbids claiming tiles from the River.' };
  if (rt && sel.length === need - 1) {
    const best = bestHand(sel.concat([rt]), S.open, S);
    if (best) return { type: 'hand', best, claim: rt.id, label: 'Claim and Play Complete Hand: ' + (best.yaku.list.length ? best.yaku.list.map(y => y.name).join(', ') : 'no Yaku') };
    return { err: `With ${tileName(rt)} from the River these ${need - 1} tiles are not a complete hand.` };
  }
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
// The Purist: an invalid selection with face-down tiles still goes through, like Balatro where every hand scores.
// The best valid part of the selection scores and the other selected tiles go to the River.
function bestSubPlay(tiles) {
  let best = null; const seen = new Set(); const n = tiles.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const sub = tiles.filter((_, i) => mask & (1 << i)); const sig = sub.map(t => key(t) + (t.red ? 'r' : '') + (t.eng || '')).sort().join(',');
    if (seen.has(sig)) continue; seen.add(sig);
    const part = partitionPlay(sub); if (!part) continue;
    const total = scoreCtx(S, 'meld', sub, { part, preview: true }).total;
    if (!best || total > best.total || (total === best.total && sub.length > best.tiles.length)) best = { tiles: sub, part, total };
  }
  return best;
}
async function doPlay() {
  if (S.phase !== 'blind' || S.busy) return; setRules(S);
  let opt = playOption(), leftovers = [];
  if (opt.err && hiddenSelected() && S.plays > 0 && !S.pendingDiscard) {
    const all = selTiles(), fb = bestSubPlay(all);
    if (fb) { leftovers = all.filter(t => !fb.tiles.includes(t)); S.selected = fb.tiles.map(t => t.id); opt = { type: 'meld', part: fb.part, fallback: true }; }
  }
  if (opt.err) { setMsg(opt.err, true); return render(); }
  const sel = S.hand.filter(t => S.selected.includes(t.id)); let ctx;
  // A claimed tile leaves the River before scoring, so River Talismans do not count it.
  const claimed = opt.claim ? S.river.find(t => t.id === opt.claim) : null;
  if (claimed) { S.river = S.river.filter(t => t !== claimed); sel.push(claimed); S.stats.claims = (S.stats.claims || 0) + 1; }
  if (opt.type === 'hand') { ctx = scoreCtx(S, 'hand', sel.concat(openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec, claim: opt.claim }); S.stats.hands++; }
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
  if (leftovers.length) { S.hand = S.hand.filter(t => !leftovers.includes(t)); S.river.push(...leftovers); }
  S.selected = []; S.selRiver = null;

  setMsg(`${leftovers.length ? `Not a valid play, so the best part scored and ${leftovers.map(tileName).join(', ')} went to the River. ` : ''}${ctx.desc}: ${ctx.chips} × ${fmtMult(ctx.mult)} = ${ctx.total}${ctx.furiten ? ' (Furiten!)' : ''}${ctx.shatter.length ? ` · ${ctx.shatter.length} Glass tile${ctx.shatter.length > 1 ? 's' : ''} shattered` : ''}`);
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
  // Ryūjin: a limited number of free Calls per Blind (the most any owned Talisman grants).
  const freeMax = S.talismans.reduce((m, k) => Math.max(m, +TAL[k].freeCall || 0), 0), freeCall = (S.freeCallsUsed || 0) < freeMax;
  if (!freeCall && S.plays <= 1) { setMsg(S.plays <= 0 ? 'No Plays left.' : 'Calling would use your last Play and leave nothing to score with.', true); return render(); }
  const rt = S.river.find(t => t.id === S.selRiver); if (!rt) { setMsg('Select a tile in the River to call.', true); return render(); }
  const sel = selTiles(); if (sel.length < 2 || sel.length > 3) { setMsg('Select 2 or 3 hand tiles to meld with the River tile.', true); return render(); }
  if (S.open.length >= 4) { setMsg('You already have 4 open melds.', true); return render(); }
  const type = meldType([rt, ...sel]); if (!type) { setMsg('That River tile and your selection do not form a Chi, Pon or Kan.', true); return render(); }
  if (freeCall) S.freeCallsUsed = (S.freeCallsUsed || 0) + 1; else S.plays--; S.river = S.river.filter(t => t !== rt); S.hand = S.hand.filter(t => !sel.includes(t));
  S.open.push({ type, tiles: sortTiles([rt, ...sel]), calledId: rt.id }); S.selected = []; S.selRiver = null;
  for (const k of S.talismans) if (TAL[k].onCall) TAL[k].onCall(S); S.stats.calls++; if (type === 'kan') S.stats.kans++;
  const rep = type === 'kan' ? drawReplacement() : null;
  S.pendingDiscard = Math.max(0, S.hand.length - capacity());
  const note = `Called ${MELD_LABEL[type]} (open)${freeCall ? `, no Play spent (${freeMax - S.freeCallsUsed} free Call${freeMax - S.freeCallsUsed === 1 ? '' : 's'} left)` : ''}${rep ? `. Replacement tile drawn: ${tileName(rep)}` : ''}`;
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
  if (S.phase !== 'blind') {
    const before = S.deck ? S.deck.length : 0;
    const after = useOnWallTiles(def, S.deck || [], []);
    if (!after) { setMsg('That cannot be used right now.', true); return render(); }
    S.consumables.splice(i, 1);
    const lost = before - S.deck.length;
    setMsg(`${def.name} used.${lost > 0 ? ` ${lost} tile${lost > 1 ? 's' : ''} left your Wall.` : ''}`); return render();
  }
  const sel = selTiles();
  if (sel.length < def.sel[0] || sel.length > def.sel[1]) { setMsg(def.sel[0] === def.sel[1] ? (def.sel[0] === 0 ? 'Clear your selection first.' : `Select exactly ${def.sel[0]} tile${def.sel[0] > 1 ? 's' : ''}.`) : `Select ${def.sel[0]}–${def.sel[1]} tiles.`, true); return render(); }
  const before = S.hand.length;
  const r = def.use(S, sel); if (r === false) { setMsg('That cannot be used right now.', true); return render(); }
  for (const t of S.hand) if (t.d === undefined) t.d = ++S.drawSeq;
  if (S.hand.length > before) for (const k of S.talismans) if (TAL[k].onTileAdded) TAL[k].onTileAdded(S, S.hand.length - before);
  if (S.pendingDiscard) { S.pendingDiscard = Math.max(0, S.hand.length - capacity()); if (!S.pendingDiscard) { draw(); setMsg(`${def.name} used. Your Call is settled.`); render(); return; } }
  S.consumables.splice(i, 1); S.selected = []; if (S.phase === 'blind') draw();
  setMsg(`${def.name} used.`); render();
}
function talValue(k) { return TAL[k].cost + (S.editions[k] ? EDITIONS[S.editions[k]].price : 0); }
function sellTalisman(k) { const i = S.talismans.indexOf(k); if (i < 0) return; const v = Math.max(1, Math.floor(talValue(k) / 2)); S.talismans.splice(i, 1); S.money += v; delete S.editions[k]; S.selTal = null; for (const t of S.talismans) if (TAL[t].onSell) TAL[t].onSell(S); setMsg(`Sold ${TAL[k].name} for ¥${v}.`); render(); }
function sellConsumable(i) { const c = S.consumables[i]; if (!c) return; const v = Math.max(1, Math.floor(CONS[c.key].cost / 2)); S.consumables.splice(i, 1); S.money += v; setMsg(`Sold ${CONS[c.key].name} for ¥${v}.`); render(); }

// ===================== SHOP =====================
function rollCard() {
  const r = rand(), w = CFG.shopWeights;   // seeded, so a shared seed replays the same shop cards
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
  S.pack = { key, choices, left: def.keep, free: !!free }; S.msg = ''; S.msgErr = false;   // a fresh pack starts without the last shop message
  // Like Balatro's Arcana packs: Omikuji and Kami packs deal tiles from your Wall so a pick can be used on them right away.
  if (['omikuji', 'mega', 'kami'].includes(key) && S.deck && S.deck.length) { S.pack.hand = sortTiles(shuffle(S.deck.slice()).slice(0, PACK_HAND)).map(t => t.id); S.pack.sel = []; }
}
const PACK_HAND = 8;
function packTiles() { return S.pack && S.pack.hand ? S.pack.hand.map(id => S.deck.find(t => t.id === id)).filter(Boolean) : []; }
// Uses a pack pick on the dealt tiles. The dealt tiles stand in as the hand, so every consumable keeps its normal effect;
// tiles it destroys leave the Wall and tiles it creates join it.
// Runs a consumable with Wall tiles standing in as the hand, then mirrors the result into the Wall:
// tiles it destroys leave the Wall, tiles it creates join it.
function useOnWallTiles(def, pool, sel) {
  const realHand = S.hand; S.hand = pool.slice(); let r, after;
  try { r = def.use(S, sel); } finally { after = S.hand; S.hand = realHand; }
  if (r === false) return null;
  const gone = pool.filter(t => !after.includes(t)), added = after.filter(t => !pool.includes(t));
  if (gone.length) S.deck = S.deck.filter(t => !gone.includes(t));
  if (added.length) { S.deck.push(...added); for (const k of S.talismans) if (TAL[k].onTileAdded) TAL[k].onTileAdded(S, added.length); }
  return after;
}
function usePackCard(i) {
  const it = S.pack && S.pack.choices[i]; if (!it || it.sold || !S.pack.hand || S.pack.done) return;
  const def = CONS[it.key];
  if (def.blindOnly) { setMsg(`${def.name} only works during a Blind. Keep it for later.`, true); return render(); }
  const dealt = packTiles(); const sel = S.pack.sel.map(id => dealt.find(t => t.id === id)).filter(Boolean);
  if (sel.length < def.sel[0] || sel.length > def.sel[1]) { setMsg(def.sel[0] === def.sel[1] ? (def.sel[0] === 0 ? 'Clear your tile selection first.' : `Select exactly ${def.sel[0]} tile${def.sel[0] > 1 ? 's' : ''} above.`) : `Select ${def.sel[0]}–${def.sel[1]} tiles above.`, true); return render(); }
  // Snapshot the dealt tiles so the row can show exactly what this card did.
  const snap = new Map(dealt.map(t => [t.id, { id: t.id, suit: t.suit, rank: t.rank, red: t.red, eng: t.eng, name: tileName(t) }]));
  const order = S.pack.hand.slice();
  const m0 = S.money; const after = useOnWallTiles(def, dealt, sel);
  if (!after) { setMsg('That cannot be used right now.', true); return render(); }
  const marks = {}, changed = [], added = [], gone = [];
  for (const t of after) {
    const s = snap.get(t.id);
    if (!s) { marks[t.id] = true; added.push(tileName(t)); continue; }
    // Changed tiles get a gold outline; the new face shows what changed, and the message names the tiles.
    const converted = s.suit !== t.suit || s.rank !== t.rank || s.red !== t.red, engraved = s.eng !== t.eng && t.eng;
    if (converted || engraved) marks[t.id] = true;
    if (converted || engraved) changed.push(s.name);
  }
  for (const id of order) if (!after.some(t => t.id === id)) gone.push(snap.get(id));
  // Row to display: the previous order with removed tiles left in place (greyed), new tiles at the end.
  S.pack.view = order.map(id => after.some(t => t.id === id) ? { id } : { id, gone: snap.get(id) }).concat(after.filter(t => !snap.has(t.id)).map(t => ({ id: t.id })));
  S.pack.marks = marks; S.pack.hand = after.map(t => t.id); S.pack.sel = [];
  it.sold = true; it.used = true; S.pack.left--;
  const gained = S.money - m0, list = a0 => { const c = {}; for (const n of a0) c[n] = (c[n] || 0) + 1; const a = Object.entries(c).map(([n, k]) => k > 1 ? `${n} ×${k}` : n); return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0]; };
  const parts = []; if (changed.length) parts.push(`used on ${list(changed)}`); if (added.length) parts.push(`added ${list(added)}`); if (gone.length) parts.push(`removed ${list(gone.map(g => g.name))}`); if (gained) parts.push(`+¥${gained}`);
  setMsg(`${def.name}${parts.length ? ': ' + parts.join('; ') : (sel.length ? ' used: no tiles changed' : ' used')}.`);
  // After the last pick the pack stays open so the result can be checked; Done returns to the shop.
  if (S.pack.left <= 0) S.pack.done = true;
  render();
}
function fillPackHand() {
  const box = $('#packHand'); if (!box) return;
  const marks = S.pack.marks || {};
  const view = S.pack.view || S.pack.hand.map(id => ({ id }));
  for (const v of view) {
    const t = v.gone || S.deck.find(x => x.id === v.id); if (!t) continue;
    const w = document.createElement('div'); w.className = 'ptile' + (v.gone ? ' gone' : ''); if (v.gone) w.title = 'Removed from your Wall';
    const e = tileEl(t, { sel: !v.gone && S.pack.sel.includes(t.id) });
    if (v.gone) e.classList.add('gone'); else if (marks[t.id]) e.classList.add('marked');
    if (!v.gone && !S.pack.done) e.onclick = () => { const s = S.pack.sel, j = s.indexOf(t.id); if (j >= 0) s.splice(j, 1); else s.push(t.id); S.msg = ''; S.pack.marks = {}; S.pack.view = null; render(); };
    w.appendChild(e); box.appendChild(w);
  }
  translateDOM($('#modal'));
}
function takeFromPack(i) {
  const it = S.pack.choices[i]; if (!it || it.sold) return;
  if (it.kind === 'talisman') { if (S.talismans.length >= talSlots()) { setMsg('Talisman slots are full. Sell one from the list below first.', true); return render(); } gainTalisman(it.key); if (it.edition) S.editions[it.key] = it.edition; }
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
  if (it.kind === 'talisman') { if (S.talismans.length >= talSlots()) { setMsg(`All ${talSlots()} Talisman slots are full. Sell one first.`, true); return render(); } gainTalisman(it.key); if (it.edition) S.editions[it.key] = it.edition; }
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
  // Ante progress: one pip per Ante, filled for cleared Antes, ringed for this one.
  const pips = Array.from({ length: CFG.antes }, (_, i) => `<i class="${i + 1 < S.ante ? 'done' : i + 1 === S.ante ? 'now' : ''}"></i>`).join('');
  let h = `<div class="shophead"><h2>Ante ${S.ante} <span class="muted sub">of ${CFG.antes}</span></h2><span class="antepips" title="Ante ${S.ante} of ${CFG.antes}">${pips}</span></div><p class="muted" style="margin:2px 0 12px">${DECKS[S.deckKey].name} · ${STAKES[S.stake].name}</p><div class="blindsel">`;
  kinds.forEach((k, i) => {
    const state = i < S.blindIndex ? 'done' : i === S.blindIndex ? 'current' : 'next';
    const reward = (k === 'small' && (S.stake === 'red' || S.stake === 'black')) ? 0 : CFG.blindReward[k];
    const tag = k !== 'boss' && S.skipTags ? TAGS[S.skipTags[k]] : null;
    h += `<div class="blindcard ${state}${k === 'boss' ? ' bosscard' : ''}"><div class="kind">${state === 'done' ? 'Defeated' : state === 'current' ? 'Up next' : 'After that'}</div><div class="n">${k === 'boss' ? BOSSES[boss].name : names[k]}</div>${k === 'boss' ? `<div class="d bossfx">${BOSSES[boss].desc}</div>` : ''}`;
    h += `<div class="bc-plate"><div><div class="label">Score at least</div><div class="target num">${blindTarget(k).toLocaleString()}</div></div><div class="bp-reward" title="Plus ¥1 per unused Play and ¥1 interest per ¥5 held (max ¥5)"><div class="label">Reward</div><div class="num">¥${reward}<span class="muted" style="font-size:11px;font-family:var(--body)"> +extras</span></div></div></div>`;
    h += `<div class="bc-meta muted"><b class="num">${plays}</b> Plays · <b class="num">${discards}</b> Discards${S.nextBlindMods && S.nextBlindMods.handSize && state === 'current' ? ` · hand +${S.nextBlindMods.handSize}` : ''}</div>`;
    if (state === 'current') h += `<div class="buy"><button id="mPlayBlind" class="primary">Play</button>${tag ? `<button id="mSkip" class="ghost" title="${tag.desc}">Skip for Tag</button>` : ''}</div>${tag ? `<div class="tagnote"><span class="tagchip">${tag.name}</span> <span class="muted">${tag.desc} No cash for this blind.</span></div>` : ''}`;
    else if (state === 'next' && tag) h += `<div class="tagnote"><span class="tagchip">${tag.name}</span> <span class="muted">if you skip it</span></div>`;
    h += `</div>`;
  });
  h += `</div>`;
  if (S.tags.length) h += `<div class="label" style="margin:12px 0 6px">Tags held</div><div class="overtals">${S.tags.map(t => `<span class="tagchip" title="${TAGS[t].desc}">${TAGS[t].name}</span>`).join('')}</div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="margin-top:8px;min-height:18px">${S.msg || ''}</div><div class="shopfoot"><button id="mDeck" class="ghost">View Wall</button><button id="mRunInfo" class="ghost">Run Info</button></div>`;
  return h;
}

// ===================== RENDER =====================
const $ = s => document.querySelector(s);
function fmtMult(m) { return Number.isInteger(m) ? m : (+m.toFixed(2)); }
function tileEl(t, o = {}) {
  const el = document.createElement('div');
  el.dataset.id = t.id;
  el.className = 'tile ' + t.suit + (t.red ? ' red' : '') + (t.eng ? ' eng-' + t.eng : '') + (o.sel ? ' sel' : '') + (o.small ? ' small' : '') + (o.back ? ' back' : '') + (o.called ? ' called' : '');
  if (!o.back) {
    el.innerHTML = tileSVG(t);
    if (t.eng === 'redseal') el.innerHTML += '<span class="seal"></span>';
    else if (t.eng === 'dragonmark') el.innerHTML += '<span class="dmark"></span>';
    else if (t.eng === 'gold') el.innerHTML += '<span class="shine"></span>';
    else if (t.eng === 'steel') el.innerHTML += '<span class="brush"></span>';
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
    else { const col = t.rank === 6 ? green : t.rank === 7 ? red : ink; body = `<text x="27" y="50" text-anchor="middle" font-size="34" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${col}">${HONOR_NAMES[t.rank]}</text>`; if (t.rank <= 4 && TILE_NUMS !== 'none') body += `<text x="5" y="11" font-size="9" font-family="IBM Plex Sans, sans-serif" font-weight="600" fill="#7a6e52">${'ESWN'[t.rank - 1]}</text>`; }
  } else if (t.suit === 'm') {
    body = (TILE_NUMS !== 'none' ? small(t.rank) : '') + `<text x="27" y="34" text-anchor="middle" font-size="24" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${t.red ? red : ink}">${CJK_NUM[t.rank]}</text><text x="27" y="62" text-anchor="middle" font-size="24" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${red}">萬</text>`;
  } else if (t.suit === 'p') {
    body = TILE_NUMS === 'all' ? small(t.rank) : '';   // Dots and Bamboo are counted by their pips, so by default they carry no corner number
    PIN_LAYOUT[t.rank].forEach(([x, y, r], i) => { const ring = t.red ? red : (i % 2 ? green : blue); body += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${ring}" stroke-width="${Math.max(2, r * 0.3)}"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="${t.red ? red : (i % 2 ? blue : green)}"/>`; });
  } else {
    body = TILE_NUMS === 'all' ? small(t.rank) : '';
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
  $('#hdrMoney').innerHTML = `YEN <b class="num">¥${S.money}</b>`;
  $('#btnDeck').innerHTML = `Wall <span class="num wallcount">${S.phase === 'blind' ? S.wall.length : (S.deck || []).length}</span>`; $('#btnDeck').title = S.phase === 'blind' ? 'Tiles still face down in the Wall. Click to see every tile.' : 'Tiles in your Wall. Click to see every tile.';
  renderBlind(); renderTalismans(); renderConsumables(); renderOpen(); renderRiver(); renderHand(); renderActions(); renderLast();
  $('#msg').textContent = S.msg || ''; $('#msg').className = 'msg' + (S.msgErr ? ' err' : '');
  if (S.phase === 'cashout') showModal(cashoutHTML(), false, 'cashmodal'); else if (S.phase === 'shop' && S.pack) { showModal(packHTML(), false, 'packmodal'); fillPackHand(); } else if (S.phase === 'shop') showModal(shopHTML()); else if (S.phase === 'select') showModal(selectHTML(), false, 'selectmodal'); else if (S.phase === 'gameover') showModal(overHTML(false), false, 'overmodal'); else if (S.phase === 'win') showModal(overHTML(true), false, 'overmodal winmodal'); else if (!modalPinned) hideModal();
  $('#btnYaku').textContent = 'Run Info';
  document.querySelectorAll('.zhead > .muted').forEach(e => { e.title = e.textContent; });   // full text on hover when a header is truncated
  translateDOM($('#app')); fitNumbers();
  save();
}
// Big numbers shrink to fit their box instead of wrapping onto a second line (targets, chips, Mult, totals, Round Score).
function fitText(el, min) { if (!el) return; el.style.fontSize = ''; let fs = parseFloat(getComputedStyle(el).fontSize); while (el.scrollWidth > el.clientWidth + 1 && fs > (min || 11)) { fs -= 1; el.style.fontSize = fs + 'px'; } }
function fitNumbers(root) { (root || document).querySelectorAll('.handbox .chipbox, .handbox .multbox, .bp-row .target, .roundscore .rs, .hb-total .tot').forEach(e => fitText(e)); (root || document).querySelectorAll('.hanfoot').forEach(fitFoot); (root || document).querySelectorAll('.hb-head .hb-title').forEach(fitTitle); }
// The Han caption always shows the tier name (Baiman, ...) on its second line; the tooltip has both.
function fitFoot(el) { if (!el) return; const t = el.querySelector('.hantier').textContent; el.title = el.querySelector('.hanline').textContent + (t ? ' · ' + t : ''); }
// Chips × Mult boxes for the scoring summary. Han lives in a caption strip under Mult, because Han only exists to become Mult.
const tierText = h => { const t = tierName(h); return t && t !== 'None' ? t : ''; };
function mathBoxes(chips, mult, han, dim) {
  return `<div class="hb-math num"><span class="boxwrap chipwrap${dim ? ' dim' : ''}"><span class="chipbox">${chips}</span><span class="boxfoot">Chips</span></span><span class="px">×</span><span class="boxwrap multwrap${dim ? ' dim' : ''}"><span class="multbox">${mult}</span><span class="boxfoot hanfoot"><span class="hanline"><b class="hanval">${han}</b> ${tr('Han')}</span><span class="hantier">${tr(tierText(han))}</span></span></span></div>`;
}
// Scoring box title row: a fixed 36px row that holds the play's name (preview and scoring) and then the total, so the box never changes height.
function titleHTML(label, lvl, claim, muted) { return `<div class="hb-head"><span class="hb-title${muted ? ' muted' : ''}">${label}${claim ? ' <span class="tag">River Claim</span>' : ''}${lvl ? ` <span class="tag">Lv.${lvl}</span>` : ''}</span><span class="hb-tot tot num" hidden>0</span></div>`; }
function playLevel(kind, meldType) { const k = kind === 'hand' ? 'hand' : (['chi', 'pon', 'kan', 'pair', 'single'].includes(meldType) ? meldType : null); return k ? (S.scrolls.meld[k] || 0) + 1 : 0; }
// Largest title size (22px down to 12px) that fits the row in at most two lines; never cut off.
function fitTitle(el) { if (!el) return; const row = el.parentElement; let fs = 22; el.style.fontSize = fs + 'px'; while ((el.scrollHeight > row.clientHeight + 1 || el.scrollWidth > row.clientWidth + 1) && fs > 12) { fs -= 1; el.style.fontSize = fs + 'px'; } el.classList.toggle('one', el.getBoundingClientRect().height < parseFloat(getComputedStyle(el).lineHeight) * 1.5); }
let PREVIEW = null;
function computePreview() {
  PREVIEW = null; if (S.phase !== 'blind' || S.busy) return;
  const opt = playOption(); if (!opt.type) { PREVIEW = { err: opt.err }; return; }
  const sel = S.hand.filter(t => S.selected.includes(t.id));
  const claimed = opt.claim ? [S.river.find(t => t.id === opt.claim)] : [];
  const ctx = opt.type === 'hand' ? scoreCtx(S, 'hand', sel.concat(claimed, openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec, preview: true, claim: opt.claim }) : scoreCtx(S, 'meld', sel, { part: opt.part, preview: true });
  PREVIEW = { ctx, label: opt.type === 'hand' ? (ctx.yaku.length ? ctx.yaku.map(y => y.name).join(', ') : 'Complete Hand') : ctx.rungName, kind: opt.type, claim: !!opt.claim };
}
function renderBlind() {
  const kind = blindKind(); const inBlind = S.phase === 'blind'; computePreview(); if (!inBlind && S.phase !== 'win' && S.phase !== 'gameover') { /* preview */ }
  const name = inBlind && S.boss ? BOSSES[S.boss].name : ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[kind];
  const pct = S.target ? Math.min(100, 100 * S.score / S.target) : 0;
  const reward = (kind === 'small' && (S.stake === 'red' || S.stake === 'black')) ? 0 : CFG.blindReward[kind];
  const targetVal = inBlind ? S.target : Math.floor(CFG.anteBase[Math.min(S.ante, CFG.antes) - 1] * CFG.blindMult[kind] * stakeTargets());
  let h = `<div class="blindplate${S.boss && inBlind ? ' bossplate' : ''}"><div class="bp-top"><span class="label">Ante ${Math.min(S.ante, CFG.antes)} of ${CFG.antes}</span><span class="label">${inBlind ? (kind === 'boss' ? 'Boss Blind' : '') : 'Next up'}</span></div><div class="blind-name${S.boss && inBlind ? ' boss' : ''}">${name}</div>`;
  if (inBlind && S.boss) h += `<div class="boss-desc">${BOSSES[S.boss].desc}${S.boss === 'collector' && S.bossSuit ? ` <b>This Blind: ${SUIT_EN[S.bossSuit]}.</b>` : ''}${S.boss === 'gatekeeper' ? (S.firstPlayDone ? ' <b>First Play done.</b>' : '') : ''}</div>`;
  h += `<div class="bp-row"><div><div class="label">Score at least</div><div class="target num">${targetVal.toLocaleString()}</div></div><div class="bp-reward" title="Plus ¥1 per unused Play and ¥1 interest per ¥5 held (max ¥5)"><div class="label">Reward</div><div class="num">¥${reward}<span class="muted" style="font-size:11px;font-family:var(--body)"> +extras</span></div></div></div></div>`;
  if (S.tags && S.tags.length) h += `<div class="label" style="margin-top:8px">Tags</div><div class="flowers">${S.tags.map(t => `<span class="flowerchip" title="${TAGS[t].desc}">${TAGS[t].name}</span>`).join('')}</div>`;
  if (inBlind) h += `<div class="roundscore"><div class="label">Round Score</div><div class="rs num${S.score >= S.target ? ' met' : ''}" id="roundScore">${S.score.toLocaleString()}</div><div class="rsbar"><i id="roundBar" style="width:${pct}%"></i></div></div>`;
  if (inBlind) {
    const pv = PREVIEW;
    if (S.busy) h += `<div class="handbox scoring" id="scorebox"></div>`;
    else if (S.pendingDiscard) h += `<div class="handbox pend"><div class="hb-name">Settle your Call</div><div class="muted" style="font-size:12px">Discard ${S.pendingDiscard} tile, then you can Play.</div></div>`;
    else if (S.selected.length && hiddenSelected()) h += `<div class="handbox">${titleHTML('?', 0, false)}${mathBoxes('?', '?', '?')}</div>`;
    else if (pv && pv.ctx) {
      // Balatro-style: only the play's base values here; tiles, Yaku bonuses and Talismans are revealed when the play scores.
      const c = pv.ctx; const base = c.lines.find(l => l.base) || { chips: 0, han: 0 };
      const lvlKey = pv.kind === 'hand' ? 'hand' : (['chi', 'pon', 'kan', 'pair', 'single'].includes(c.meldType) ? c.meldType : null);
      const lvl = lvlKey ? (S.scrolls.meld[lvlKey] || 0) : 0;
      let chips = base.chips, han = base.han; if (pv.kind === 'hand') han += Math.max(1, c.yaku.reduce((a, y) => a + y.han, 0));
      for (const l of c.lines) if (/^Scroll:/.test(l.label)) { chips += l.chips || 0; han += l.han || 0; }
      h += `<div class="handbox">${titleHTML(pv.label, lvlKey ? lvl + 1 : 0, pv.claim)}${mathBoxes(chips, hanMult(han), han)}</div>`;
    }
    else h += `<div class="handbox empty">${titleHTML('', 0, false, true)}${mathBoxes(0, 0, 0, true)}</div>`;   // blank title until a play is selected; the row keeps its height
  }
  h += `<div class="stats"><div class="stat plays"><div class="label">Plays</div><div class="v num">${S.plays}</div></div><div class="stat discards"><div class="label">Discards</div><div class="v num">${S.discards}</div></div></div>`;
  if (S.indicators.length) { h += `<div class="label" style="margin-top:8px">Dora Indicators</div><div class="dora-ind" id="doraRow"></div>`; }
  if (S.flowers.length) h += `<div class="label" style="margin-top:8px">Flowers &amp; Seasons</div><div class="flowers">${S.flowers.map(f => `<span class="flowerchip" title="${FLW[f].desc}">${FLW[f].name}</span>`).join('')}</div>`;
  $('#blindCard').innerHTML = h;
  if (S.indicators.length) { const row = $('#doraRow'); for (const t of S.indicators) { const e = tileEl(t, { small: true }); e.style.cursor = 'default'; const d = tileFromIdx(nextDora(idx(t))); e.title = 'Indicator: ' + tileName(t) + ' → Dora is ' + tileName(d); row.appendChild(e); } row.insertAdjacentHTML('beforeend', `<span class="muted" style="font-size:11px">Dora: ${S.dora.map(i => tileName(tileFromIdx(i))).join(', ')}</span>`); }
}
function renderTalismans() {
  const box = $('#talismans'); box.innerHTML = '';
  // Column widths follow the slot counts (a Negative edition or Spring adds a slot); ignored when the columns stack.
  $('.talcols').style.gridTemplateColumns = `minmax(0,${talSlots()}fr) minmax(0,${conSlots()}fr)`;
  $('#talCount').textContent = `${S.talismans.length} / ${talSlots()} · fire left to right, drag to reorder`;
  for (let i = 0; i < talSlots(); i++) {
    const k = S.talismans[i]; const el = document.createElement('div');
    if (k) { const ed = S.editions[k]; el.className = 'slot filled' + (S.selTal === k ? ' sel' : '') + (ed ? ' ed-' + ed : ''); el.dataset.tal = TAL[k].name; const tgt = TAL[k].copies ? talTarget(S, k) : null; el.innerHTML = `<div class="kind"><span class="order">${i + 1}</span>Talisman${ed ? ` · <span class="edtag ed-${ed}">${EDITIONS[ed].name}</span>` : ''}</div><div class="n">${TAL[k].name}</div><div class="d">${TAL[k].desc}${tgt ? ` <b>Now: ${tgt.name}.</b>` : TAL[k].copies ? ' <b>Nothing to copy.</b>' : ''}${ed ? ` <b>${EDITIONS[ed].desc}.</b>` : ''}${TAL[k].status ? ' <b>(' + TAL[k].status(S) + ')</b>' : ''}</div>`; bindSlotDrag(el, k); }
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
    if (c) { const d = CONS[c.key]; el.className = 'slot filled ' + c.kind; el.innerHTML = `<div class="kind">${c.kind === 'kami' ? 'Kami Spirit' : 'Omikuji'}</div><div class="n">${d.name}</div><div class="d">${d.desc}</div>`; el.onclick = () => useConsumable(i); }
    else { el.className = 'slot'; el.innerHTML = `<div class="d">Empty slot</div>`; }
    box.appendChild(el);
  }
}
function renderOpen() {
  const box = $('#open'); box.innerHTML = '';
  const allClosed = S.open.every(m => m.closed);
  $('#openInfo').textContent = S.open.length ? (allClosed ? `${S.open.length} declared · hand is still closed for Yaku` : `${S.open.length} on the table · hand is Open for Yaku`) : 'Hand is closed.';
  if (!S.open.length) box.innerHTML = '<span class="muted empty">No melds on the table</span>';
  for (const m of S.open) { const w = document.createElement('div'); w.className = 'meld' + (m.closed ? ' closedmeld' : ''); w.innerHTML = `<span class="mt">${m.closed ? 'Closed ' : ''}${MELD_LABEL[m.type]}</span>`; for (const t of m.tiles) w.appendChild(tileEl(t, { small: true, called: t.id === m.calledId })); box.appendChild(w); }
}
function renderRiver() {
  const box = $('#river'); box.innerHTML = '';
  $('#riverInfo').textContent = S.boss === 'fisherman' ? 'The Fisherman forbids Calls and claims this Blind.' : canClaim() ? `Select one plus 2–3 hand tiles to Call, or plus the other ${neededConcealed() - 1} of a complete hand to claim it with Kawauso.` : 'Select one plus 2–3 hand tiles to Call. Discards stay here all Blind.';
  for (const t of S.river) { const e = tileEl(t, { small: true, sel: S.selRiver === t.id }); e.onclick = () => { if (S.phase !== 'blind') return; S.selRiver = S.selRiver === t.id ? null : t.id; render(); }; box.appendChild(e); }
  if (!S.river.length) box.innerHTML = '<span class="muted empty">No discards yet</span>';
}
function renderHand() {
  const box = $('#hand'); box.innerHTML = '';
  const hidden = S.boss === 'purist' && !S.revealed && S.phase === 'blind';
  // Sorting works against The Purist too: face-down tiles keep their true sorted spot, a slight hint of what they are.
  if (S.sortHand) S.hand = sortTiles(S.hand);
  const tiles = S.hand;
  for (const t of tiles) { const e = tileEl(t, { sel: S.selected.includes(t.id), back: hidden && (isHonor(t) || isTerminal(t)) }); if (S.newIds.includes(t.id)) e.classList.add('arrive'); e.dataset.id = t.id; bindTileDrag(e, t); box.appendChild(e); }
  S.newIds = [];
  $('#handZone').classList.toggle('pending', !!S.pendingDiscard);
  $('#callBanner').hidden = !S.pendingDiscard; if (S.pendingDiscard) $('#callBanner').textContent = `Call made. Discard ${S.pendingDiscard} tile to settle it before you can Play again.`;
  const over = S.hand.length - capacity();
  $('#handInfo').textContent = (over > 0 && !S.pendingDiscard ? `${S.hand.length} tiles (${over} over the limit of ${capacity()}: no draw until you are back under it)` : `${S.hand.length} / ${capacity()} tiles`) + ` · ${S.selected.length} selected · complete hand needs ${neededConcealed()} from hand`;
  renderHint(hidden);
  $('#btnSort').textContent = S.sortHand ? 'Auto-sort On' : 'Sort Hand'; $('#btnSort').disabled = false; $('#btnSort').title = S.sortHand ? 'New tiles are sorted in. Drag a tile to switch to manual order.' : 'Sort the hand now and keep it sorted. Drag tiles to reorder.';

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
  const markDots = () => { if (SHOW_DOTS && !hidden) { const dead = deadTiles(vis, S.open.length, sh, CFG.maxDiscardTiles); const els = $('#hand').children; for (let i = 0; i < S.hand.length; i++) if (dead.includes(S.hand[i])) els[i].classList.add('safe'); } };
  const parts = [];
  if (S.pendingDiscard) {
    // Settling a Call is an instruction, not a hint, so it always shows.
    const n = S.selected.length, need = S.pendingDiscard;
    parts.push(`<span class="pendnote">Settle your Call: select ${need} tile and press Discard. It does not use a Discard.${n === need ? ' Ready, press Discard.' : n > need ? ` ${n} selected, you need exactly ${need}.` : ''}</span>`);
    if (HINTS.away && sh === -1) parts.push('<span class="hint-sel good">complete hand ready once settled</span>');
    if (SHOW_DOTS && !hidden) parts.push('<span class="hint-sel muted">dotted tiles are safe to throw</span>');
    box.innerHTML = parts.join(' · '); markDots(); return;
  }
  const away = n => n === -1 ? 'Complete hand ready' : n === 0 ? '1 tile away (tenpai)' : `${n + 1} tiles away`;
  if (HINTS.away) {
    parts.push(`<span class="hint-main ${sh <= 0 ? 'good' : ''}">${hidden ? 'Visible tiles: at least ' + away(sh).toLowerCase() : away(sh)}</span>`);
    if (hidden) parts.push('<span class="hint-sel muted">face-down tiles are 1s, 9s, Winds or Dragons and are not counted</span>');
  }
  if (HINTS.waits && !hidden && sh === 0) {
    const waits = waitsOf(S.hand, S.open.length); const riverKeys = new Set(S.river.map(key));
    const names = waits.map(w => { const t = tileFromIdx(w); const f = riverKeys.has(key(t)); return `<span class="${f ? 'bad' : ''}">${tileName(t)}${f ? (canClaim() ? ' (in River: claim it with Kawauso, Furiten)' : ' (in River: Furiten)') : ''}</span>`; });
    if (names.length) parts.push(`<span class="hint-sel">waiting on ${names.join(', ')}</span>`);
  }
  const sel = selTiles().filter(t => vis.includes(t));
  const rtc = claimTile();
  if (HINTS.away && !hidden && rtc && sel.length === neededConcealed() - 1) {
    const best = bestHand(sel.concat([rtc]), S.open, S);
    parts.push(best ? `<span class="hint-sel bad">complete hand with ${tileName(rtc)} claimed from the River${S.talismans.includes('kappa') ? ': Kappa bonus' : ': Furiten, ×0.5'}</span>` : `<span class="hint-sel muted">${tileName(rtc)} from the River does not complete these tiles</span>`);
  }
  let complete = false;
  if (!hidden && sel.length === neededConcealed()) {
    const best = bestHand(sel, S.open, S);
    if (best) { complete = true; if (HINTS.away) { const win = winningTile(sel); const f = win && S.river.some(t => key(t) === key(win)); parts.push(`<span class="hint-sel ${f ? 'bad' : 'good'}">complete hand, winning tile ${tileName(win)}${win && win.rinshan ? ' (Kan replacement: Rinshan Kaihou +1 Han)' : ''}${f ? (S.talismans.includes('kappa') ? ' is in your River: Kappa bonus' : ' is in your River: Furiten, ×0.5') : ''}</span>`); } }
  }
  if (!complete && HINTS.without && sel.length && sel.length < vis.length) {
    const rest = vis.filter(t => !sel.includes(t)); const sh2 = handShanten(rest, S.open.length);
    parts.push(`<span class="hint-sel ${sh2 > sh ? 'bad' : 'good'}">without ${sel.length === 1 ? 'this tile' : 'these'}: ${sh2 > sh ? 'sets you back to ' + away(sh2).toLowerCase() : 'safe, still ' + away(sh2).toLowerCase()}</span>`);
  } else if (!complete && SHOW_DOTS && !hidden) parts.push('<span class="hint-sel muted">dotted tiles are dead weight: all of them can go without losing progress</span>');
  box.innerHTML = parts.join(' · ');
  markDots();
}
function renderActions() {
  const inBlind = S.phase === 'blind';
  const opt = inBlind ? playOption() : { err: '' };
  const hid = inBlind && hiddenSelected() && S.plays > 0 && !S.pendingDiscard;   // face-down tiles: never say in advance whether the selection is a valid play
  const bp = $('#btnPlay'); bp.disabled = !inBlind || (!!opt.err && !hid) || S.busy; bp.textContent = 'Play'; bp.title = hid ? 'Face-down tiles selected' : (opt.err || (opt.label ? opt.label.replace(/^Play /, '') : ''));
  const maxD = S.boss === 'monk' ? 3 : CFG.maxDiscardTiles, tooMany = !S.pendingDiscard && S.selected.length > maxD;
  const bd = $('#btnDiscard'); bd.disabled = !inBlind || S.busy || (!S.pendingDiscard && S.discards <= 0) || (S.pendingDiscard && S.selected.length !== S.pendingDiscard) || tooMany; bd.title = S.pendingDiscard && S.selected.length !== S.pendingDiscard ? `Select exactly ${S.pendingDiscard} tile to settle the Call` : tooMany ? `You can discard at most ${maxD} tiles at once` : ''; bd.textContent = S.pendingDiscard ? `Discard ${S.pendingDiscard} to settle the Call` : `Discard (${S.discards})`; bd.classList.toggle('pulse', !!S.pendingDiscard);
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
let skipAnim = false, skipArmed = false;
function wait(ms) { return new Promise(r => setTimeout(r, (motionOK && !skipAnim) ? Math.round(ms * SPEEDS[ANIM_SPEED]) : 0)); }
async function animateScore(ctx) {
  skipAnim = false; skipArmed = false; setTimeout(() => { skipArmed = true; }, 250);
  const box = $('#scorebox'); if (!box) return;
  const label = ctx.kind === 'hand' ? (ctx.yaku.length ? ctx.yaku.map(y => y.name).join(', ') : 'Complete Hand') : ctx.rungName;
  box.innerHTML = `${titleHTML(tr(label || ''), playLevel(ctx.kind, ctx.meldType), ctx.claimed)}${mathBoxes(0, 1, 0)}`; box.title = 'Click anywhere to skip'; fitTitle(box.querySelector('.hb-title'));
  // the breakdown streams into the Last Play panel as it happens
  const lp = $('#lastPlay'); lp.innerHTML = `<div class="label">Last Play</div><div style="font-family:var(--display);font-size:15px;margin:2px 0 6px">${tr(ctx.desc)}</div><div class="lp-lines"></div>`;
  const chipsEl = box.querySelector('.chipbox'), multEl = box.querySelector('.multbox'), totEl = box.querySelector('.hb-tot'), totWrap = totEl, nameEl = box.querySelector('.hb-title'), linesBox = lp.querySelector('.lp-lines'), mathEl = box.querySelector('.hb-math'), hanEl = box.querySelector('.hanval'), hanPill = box.querySelector('.hanfoot'), tierEl = box.querySelector('.hantier');
  const tileEls = new Map(); document.querySelectorAll('#hand .tile[data-id], #open .tile[data-id]').forEach(e => tileEls.set(+e.dataset.id, e));
  let chips = 0, han = 0, tileX = 1, mult = null;
  const curMult = () => mult === null ? hanMult(han) * tileX : mult;
  let lastChips = null, lastMult = null, lastHan = null;
  const bump = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const setMath = () => {
    const c = Math.max(0, Math.round(chips)), m = fmtMult(curMult());
    chipsEl.textContent = c; multEl.textContent = m;
    if (lastChips !== null && c !== lastChips) bump(chipsEl.parentElement, 'bump'); if (lastMult !== null && m !== lastMult) bump(multEl.parentElement, 'bump');
    const hv = Math.round(han); hanEl.textContent = hv; tierEl.textContent = tr(tierText(hv)); hanPill.classList.toggle('done', mult !== null);
    if (lastHan !== null && hv !== lastHan) bump(hanPill.parentElement, 'bump');
    lastChips = c; lastMult = m; lastHan = hv; fitText(chipsEl); fitText(multEl); fitFoot(hanPill);
  };
  const showLine = l => { const d = document.createElement('div'); d.className = 'row sline' + (l.zero ? ' bad' : '') + (l.yaku ? ' yaku' : '') + (l.tal ? ' tal' : '') + (l.convert ? ' convert' : ''); d.innerHTML = `<span>${tr(l.label)}</span><span class="num">${tr(l.val)}</span>`; linesBox.appendChild(d); if (l.tal) { const slot = document.querySelector(`.slot[data-tal="${l.tal}"]`); if (slot) { slot.classList.remove('bounce'); void slot.offsetWidth; slot.classList.add('bounce'); } } };
  const applyLine = l => { if (l.zero) chips = 0; else { chips += l.chips || 0; han += l.han || 0; if (l.convert) mult = hanMult(han) * tileX; if (l.mult) mult = (mult === null ? hanMult(han) * tileX : mult) + l.mult; if (l.xmult && mult !== null) mult *= l.xmult; } setMath(); };
  let fire = 0;
  const heat = () => { const tot = Math.max(0, chips) * curMult(); const lvl = S.target && tot >= 3 * S.target ? 2 : S.target && tot >= S.target ? 1 : 0; if (lvl !== fire) { fire = lvl; box.classList.toggle('hot', lvl >= 1); box.classList.toggle('blazing', lvl >= 2); if (lvl >= 1 && !box.querySelector('.ember')) for (let i = 0; i < 8; i++) { const em = document.createElement('i'); em.className = 'ember'; em.style.left = (8 + Math.random() * 84) + '%'; em.style.animationDelay = (Math.random() * 1.2) + 's'; em.style.animationDuration = (1 + Math.random()) + 's'; box.appendChild(em); } } };
  setMath();
  // Start from exactly what the hand box previewed: the play's base, its Scroll levels and the Yaku that name the hand.
  // Tiles, Dora, engravings and Talismans are then revealed on top of that, so the Han count only ever climbs.
  const isStart = l => l.base || l.yaku || /^Scroll:/.test(l.label) || (ctx.kind === 'hand' && /^Yakuhai/.test(l.label));
  for (const l of ctx.lines) if (isStart(l)) { showLine(l); applyLine(l); }
  lastChips = null; lastMult = null; lastHan = null; setMath(); heat(); await wait(320);
  for (const h of ctx.hits) {
    const e = tileEls.get(h.id); const per = { chips: h.chips / h.times, han: h.han / h.times, x: Math.pow(h.xmult, 1 / h.times) };
    for (let r = 0; r < h.times; r++) {
      if (e) { e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); const f = document.createElement('div'); f.className = 'float num' + (r ? ' again' : ''); f.textContent = (r ? 'Again! ' : '') + `+${Math.round(per.chips)}` + (per.han ? tr(` · +${per.han} Han`) : '') + (per.x !== 1 ? ` · ×${fmtMult(per.x)}` : ''); e.appendChild(f); setTimeout(() => f.remove(), 1000); }
      chips += per.chips; han += per.han; tileX *= per.x; setMath(); heat();
      await wait(r ? 200 : 95);
    }
    if (e) e.classList.remove('hit');
  }
  for (const l of ctx.lines) { if (isStart(l) || l.tiles) continue; showLine(l); if (!l.info) applyLine(l); heat(); await wait(180); }
  chips = ctx.chips; han = ctx.han; mult = ctx.mult; setMath(); heat();
  await wait(350);
  // the total replaces the play name, then counts down into the round score
  nameEl.hidden = true; totWrap.hidden = false; totEl.textContent = ctx.total.toLocaleString(); totEl.classList.add('final'); fitText(totEl);
  await wait(ctx.kind === 'hand' ? 700 : 450);
  const rsEl = $('#roundScore'); const from = S.score, to = S.score + ctx.total; const dur = (motionOK && !skipAnim) ? Math.round(650 * SPEEDS[ANIM_SPEED]) : 0;
  if (rsEl) { rsEl.textContent = to.toLocaleString(); fitText(rsEl); rsEl.textContent = from.toLocaleString(); }
  if (dur > 0) { const t0 = performance.now(); await new Promise(res => { const step = now => { const k = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - k, 3); totEl.textContent = Math.round(ctx.total * (1 - e)).toLocaleString(); if (rsEl) { const v = from + (to - from) * e; rsEl.textContent = Math.round(v).toLocaleString(); rsEl.classList.toggle('met', v >= S.target); const bar = $('#roundBar'); if (bar) bar.style.width = Math.min(100, 100 * v / S.target) + '%'; } if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
  if (rsEl) { rsEl.textContent = to.toLocaleString(); fitText(rsEl); rsEl.classList.remove('bump'); void rsEl.offsetWidth; rsEl.classList.add('bump'); }
  await wait(250);
  skipAnim = false;
}
// ===================== MODALS =====================
let modalPinned = false;
const CLOSE_X = '<button class="modal-x ghost" id="mX" title="Close" aria-label="Close"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
// A modal with a Close or Cancel button can also be closed with the corner X, a click outside it, or Esc. Game-flow screens (cash-out, shop, packs, blind select) have none, so they stay put.
function modalClosable() { return !$('#overlay').hidden && !!$('#modal #mClose'); }
function closeModal() { const c = $('#modal #mClose'); if (c) c.click(); }
function showModal(html, pinned, cls) { modalPinned = !!pinned; $('#modal').className = 'modal' + (cls ? ' ' + cls : ''); $('#modal').innerHTML = html; if ($('#modal #mClose')) $('#modal').insertAdjacentHTML('afterbegin', CLOSE_X); fillHero($('#modal')); $('#overlay').hidden = false; fillExamples($('#modal')); translateDOM($('#modal')); }
function hideModal() { modalPinned = false; $('#overlay').hidden = true; }
// A Talisman you gain starts fresh, like a Joker in Balatro: progress from an earlier copy you sold is gone.
// Its state lives under its own key, or its key plus a capitalised suffix (kasaobake, shiroSuit).
const ownsState = (k, x) => x === k || (x.startsWith(k) && /[A-Z]/.test(x[k.length] || ''));   // 'shiro' owns 'shiroSuit', but 'hoshi' does not own 'hoshizora'
const freshTalState = k => Object.fromEntries(Object.entries(S.talState || {}).filter(([x]) => !ownsState(k, x)));
function gainTalisman(k) { S.talState = freshTalState(k); S.talismans.push(k); }
// What a Talisman's live value would be the moment you buy it (same text its card shows once owned).
function talPreview(k) {
  const d = TAL[k]; if (!d) return '';
  let v = '';
  if (d.copies === 'left') { const t = S.talismans.find(x => !TAL[x].copies); v = t ? `would copy ${TAL[t].name}, your leftmost Talisman` : 'nothing to copy yet: buy another Talisman'; }
  else if (d.copies === 'right') v = 'joins your rightmost slot, so drag a Talisman to its right to copy it';
  else if (d.status) { const saved = S.talState; S.talState = freshTalState(k); try { v = d.status(S); } finally { S.talState = saved; } }
  return v ? `<div class="lvline">If bought: <b>${v}</b></div>` : '';
}
// Why an item cannot be taken right now because its slots are full (null when there is room).
function slotsFullMsg(it) {
  if (it.kind === 'talisman' && S.talismans.length >= talSlots()) return `All ${talSlots()} Talisman slots are full. Sell one first.`;
  if ((it.kind === 'omikuji' || it.kind === 'kami') && S.consumables.length >= conSlots()) return `All ${conSlots()} consumable slots are full. Use or sell one first.`;
  return null;
}
// Current and next level of a Scroll of Mastery, like a Planet card's level in Balatro.
function scrollLevelHTML(key) {
  const [t, k] = key.split(':');
  if (t === 'y') { const n = S.scrolls.yaku[k] || 0; return `<div class="lvline">Now <b>+${n} Han</b> → <b>+${n + 1} Han</b> whenever it scores</div>`; }
  const lv = S.scrolls.meld[k] || 0, c = CFG.scrollChips, hn = CFG.scrollHan;
  if (k === 'hand') { const b = CFG.meldBase.hand; return `<div class="lvline">Now <b>Lv.${lv + 1}</b> → <b>Lv.${lv + 2}</b>: ${b.chips + (lv + 1) * c} Chips, ${b.han + (lv + 1) * hn} Han base</div>`; }
  const name = MELD_LABEL[k] || k;
  return `<div class="lvline">Now <b>Lv.${lv + 1}</b> → <b>Lv.${lv + 2}</b>: +${(lv + 1) * c} Chips per ${name}, +${(lv + 1) * hn} Han</div>`;
}
function cardHTML(it, idx) {
  const d = itemDef(it); const p = it.free ? 0 : itemPrice(it);
  const kindLabel = { talisman: 'Talisman', omikuji: 'Omikuji', kami: 'Kami Spirit', scroll: 'Scroll of Mastery', flower: 'Flower / Season', pack: 'Booster pack' }[it.kind];
  const ed = it.edition ? EDITIONS[it.edition] : null;
  return `<div class="shopcard ${it.kind}${it.sold ? ' sold' : ''}${ed ? ' ed-' + it.edition : ''}"><div class="kind">${kindLabel}${ed ? ` · <span class="edtag ed-${it.edition}">${ed.name}</span>` : ''}</div><div class="n">${d.name}</div><div class="d">${d.desc}${ed ? ` <b>${ed.name}: ${ed.desc}.</b>` : ''}</div>${it.kind === 'scroll' ? scrollLevelHTML(it.key) : it.kind === 'talisman' && !it.sold ? talPreview(it.key) : ''}<div class="buy"><span class="num" style="color:${p > S.money ? 'var(--bad)' : 'var(--accent)'}">${p === 0 ? 'Free' : '¥' + p}</span>${it.sold ? '<span class="muted">Sold</span>' : (() => { const full = slotsFullMsg(it); const no = p > S.money ? `You have ¥${S.money}; this costs ¥${p}` : full; return `<button class="primary" data-buy="${idx}" ${no ? `disabled title="${no}"` : ''}>${it.kind === 'pack' ? 'Open' : full ? 'Slots Full' : 'Buy'}</button>`; })()}</div></div>`;
}
function cashoutHTML() {
  const r = S.reward; const names = { small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' };
  const bossName = r.kind === 'boss' && S.stats.bosses.length ? BOSSES[S.stats.bosses[S.stats.bosses.length - 1]].name : null;
  const cap = hasF('winter') ? 10 : CFG.interestCap;
  const rows = [['Blind reward', names[r.kind], r.base], ['Unused Plays', `${r.left} × ¥1`, r.left], ['Interest', `¥1 per ¥${CFG.interestPer} held, up to ¥${cap}`, r.interest], r.tal ? ['Talismans', 'end-of-Blind payouts', r.tal] : null, r.summer ? ['Summer', 'Flower', r.summer] : null, r.invest ? ['Investment Tag', 'Boss bonus', r.invest] : null].filter(Boolean);
  let h = `<div class="cashhead"><div class="label">${names[r.kind]} defeated</div><h2>${bossName ? bossName + ' beaten' : 'Blind cleared'}</h2>`;
  if (S.target) h += `<div class="cashscore num"><b>${S.score.toLocaleString()}</b> <span class="muted">of ${S.target.toLocaleString()}</span></div>`;
  h += `</div><div class="receipt">${rows.map(([k, d, v]) => `<div class="rrow"><div><div class="rl">${k}</div><div class="rd muted">${d}</div></div><b class="num">¥${v}</b></div>`).join('')}<div class="rtotal"><span>Total</span><b class="num">¥${r.total}</b></div></div>`;
  h += `<div class="cashfoot"><span class="muted" style="font-size:12px">You now have</span>${walletHTML()}</div><button id="mCashOut" class="primary cashbtn">Cash Out →</button>`;
  return h;
}
const walletHTML = () => `<span class="wallet"><span class="cur">YEN</span><span class="v num">¥${S.money}</span></span>`;
function shopHTML() {
  const r = S.reward; const items = [...S.shop.cards, S.shop.scroll, S.shop.flower, S.shop.pack].filter(Boolean);
  const next = ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[blindKind()];
  const nextBoss = blindKind() === 'boss' ? BOSSES[S.bossOrder[S.ante - 1]] : null;
  let h = `<div class="shophead"><h2>Shop</h2>${walletHTML()}</div>`;
  if (false) h += `<div class="label">Blind Defeated · Reward</div><div class="reward-list num"><span>${({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[r.kind]} defeated</span><span>¥${r.base}</span><span>Unused Plays</span><span>¥${r.left}</span><span>Interest (¥1 per ¥5)</span><span>¥${r.interest}</span>${r.tal ? `<span>Talismans</span><span>¥${r.tal}</span>` : ''}${r.summer ? `<span>Summer</span><span>¥${r.summer}</span>` : ''}${r.invest ? `<span>Investment Tag</span><span>¥${r.invest}</span>` : ''}<span><b>Total</b></span><span><b>¥${r.total}</b></span></div>`;
  if (S.shop.coupon) h += `<div class="msg">Coupon Tag: Talismans and consumables are free in this shop.</div>`;
  // Like Balatro: the rerollable cards sit together, the run perk (Flower, like a Voucher) and the Booster Pack have fixed spots below.
  const at = it => items.indexOf(it);
  h += `<div class="shopsec secrow"><span class="label">Cards</span><button id="mReroll" class="ghost small-btn" ${!S.shop.freeReroll && rerollCost() > S.money ? 'disabled title="Not enough money to reroll"' : ''}>Reroll Cards (${S.shop.freeReroll ? 'free' : '¥' + rerollCost()})</button></div><div class="shop-grid">${[...S.shop.cards, S.shop.scroll].map(it => cardHTML(it, at(it))).join('')}</div>`;
  h += `<div class="label shopsec">${S.shop.flower ? 'Flower and Booster Pack' : 'Booster Pack'}</div><div class="shop-grid">${[S.shop.flower, S.shop.pack].filter(Boolean).map(it => cardHTML(it, at(it))).join('')}</div>`;
  if (S.shop.freePacks.length) h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0">${S.shop.freePacks.map((pk, i) => `<button class="primary" data-freepack="${i}">Open Free ${PACKS[pk].name}</button>`).join('')}</div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="min-height:18px;margin:2px 0 6px">${S.msg || ''}</div>`;
  h += ownedHTML();
  h += `<div class="shopfoot"><button id="mDeck" class="ghost">View Wall</button><span style="flex:1"></span><span class="muted" style="margin-right:8px">Next: Ante ${S.ante} ${next}${nextBoss ? ' · ' + nextBoss.name : ''}</span><button id="mNext" class="primary">Continue →</button></div>`;
  return h;
}
function ownedHTML() {
  const tal = S.talismans.map((k, i) => { const ed = S.editions[k]; const tgt = TAL[k].copies ? talTarget(S, k) : null; return `<div class="shopcard talisman owned-card${ed ? ' ed-' + ed : ''}"><div class="kind"><span class="order" title="Firing order">${i + 1}</span>Talisman${ed ? ` · <span class="edtag ed-${ed}">${EDITIONS[ed].name}</span>` : ''}</div><div class="n">${TAL[k].name}</div><div class="d">${TAL[k].desc}${tgt ? ` <b>Now: ${tgt.name}.</b>` : ''}${ed ? ` <b>${EDITIONS[ed].desc}.</b>` : ''}${TAL[k].status ? ' <b>(' + TAL[k].status(S) + ')</b>' : ''}</div><div class="buy"><span></span><button class="ghost" data-sell="${k}">Sell ¥${Math.max(1, Math.floor(talValue(k) / 2))}</button></div></div>`; });
  const con = S.consumables.map((c, i) => { const d = CONS[c.key]; return `<div class="shopcard ${c.kind} owned-card"><div class="kind">${c.kind === 'kami' ? 'Kami Spirit' : 'Omikuji'}</div><div class="n">${d.name}</div><div class="d">${d.desc}</div><div class="buy"><span class="muted">${d.anywhere ? 'Usable now' : 'Use during a Blind'}</span><span style="display:flex;gap:6px">${d.anywhere ? `<button class="ghost" data-usecon="${i}">Use</button>` : ''}<button class="ghost" data-sellcon="${i}">Sell ¥${Math.max(1, Math.floor(d.cost / 2))}</button></span></div></div>`; });
  return `<div class="label" style="margin:10px 0 4px">Your Talismans · ${S.talismans.length}/${talSlots()} · fire left to right · sell to make room</div>` + (tal.length ? `<div class="shop-grid owned-grid">${tal.join('')}</div>` : `<div class="muted" style="font-size:12px">None yet.</div>`) + `<div class="label" style="margin:10px 0 4px">Your Consumables · ${S.consumables.length}/${conSlots()}</div>` + (con.length ? `<div class="muted" style="font-size:12px;margin:-2px 0 4px">Most consumables are used on tiles during a Blind. Ones that don't need tiles have a Use button here.</div><div class="shop-grid owned-grid">${con.join('')}</div>` : `<div class="muted" style="font-size:12px">None yet.</div>`);
}
function packButtons(it, i) {
  if (S.pack.done) return `<span class="muted" style="font-size:11px">No picks left</span>`;
  const full = slotsFullMsg(it); const dis = full ? ` disabled title="${full}"` : '';
  if (!S.pack.hand || (it.kind !== 'omikuji' && it.kind !== 'kami')) return `<button class="primary" data-take="${i}"${dis}>${full ? 'Slots Full' : 'Take'}</button>`;
  const def = CONS[it.key];
  const use = def.blindOnly ? `<span class="muted" style="font-size:11px">Blind only</span>` : `<button class="primary" data-packuse="${i}">Use</button>`;
  return `<span style="display:flex;gap:6px;align-items:center">${use}<button class="ghost" data-take="${i}"${dis}>Keep</button></span>`;
}
function packHTML() {
  const pk = PACKS[S.pack.key];
  let h = `<div class="shophead"><h2>${pk.name}</h2></div><p class="muted" style="margin:2px 0 8px">${pk.desc}${S.pack.free ? ' Free, from a Tag.' : ''}</p>`;
  if (S.pack.hand) h += `<div class="packhandwrap"><div class="label">Your Tiles · ${(S.pack.view || S.pack.hand).length} random tiles from your Wall</div><div class="muted" style="font-size:12px;margin:2px 0 6px">${S.pack.done ? 'All picks used. Outlined tiles changed and stay that way in your Wall. Press Done to return to the shop.' : 'Select tiles, then press Use on a card. The change stays in your Wall for the rest of the run. Keep puts the card in your consumable slots instead.'}</div><div class="packhand" id="packHand"></div></div>`;
  h += `<div class="shopsec secrow"><span class="label">${S.pack.done ? 'Cards · all picks used' : `Cards · choose ${S.pack.left} more`}</span></div>`;
  h += `<div class="shop-grid">${S.pack.choices.map((it, i) => { const d = itemDef(it); const ed = it.edition ? EDITIONS[it.edition] : null; return `<div class="shopcard ${it.kind}${it.sold ? ' sold' : ''}${ed ? ' ed-' + it.edition : ''}"><div class="kind">${{ talisman: 'Talisman', omikuji: 'Omikuji', kami: 'Kami Spirit', scroll: 'Scroll of Mastery' }[it.kind]}${ed ? ` · <span class="edtag ed-${it.edition}">${ed.name}</span>` : ''}</div><div class="n">${d.name}</div><div class="d">${d.desc}${ed ? ` <b>${ed.name}: ${ed.desc}.</b>` : ''}</div>${it.kind === 'scroll' && !it.sold ? scrollLevelHTML(it.key) : it.kind === 'talisman' && !it.sold ? talPreview(it.key) : ''}<div class="buy"><span></span>${it.sold ? `<span class="muted">${it.used ? 'Used' : 'Taken'}</span>` : packButtons(it, i)}</div></div>`; }).join('')}</div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="min-height:18px;margin:2px 0 6px">${S.msg || ''}</div>`;
  h += ownedHTML();
  h += `<div class="shopfoot"><button id="mDeck" class="ghost">View Wall</button><span style="flex:1"></span>${S.pack.done ? '<button id="mPackDone" class="primary">Done</button>' : '<button id="mPackDone" class="ghost">Skip the Rest</button>'}</div>`;
  return h;
}
function overHTML(won) {
  const st = S.stats; const pct = S.target ? Math.min(100, 100 * S.score / S.target) : 100;
  const where = S.boss ? BOSSES[S.boss].name : ({ small: 'the Small Blind', big: 'the Big Blind', boss: 'the Boss Blind' })[blindKind()];
  const stat = (label, v) => `<div class="stat"><div class="label">${label}</div><div class="v num">${v}</div></div>`;
  let h = `${won ? '<div class="herotiles small" id="heroTiles"></div>' : ''}<div class="overhead"><div class="label">${won ? 'Run complete' : 'Run over'}</div><h2 class="${won ? '' : 'lost'}">${won ? 'You broke the bank!' : 'The syndicate collects.'}</h2>`;
  h += won ? `<p class="muted">All ${CFG.antes} Antes cleared on ${STAKES[S.stake].name} with the ${DECKS[S.deckKey].name}.</p>` : `<p class="muted">Out of Plays on Ante ${S.ante} against ${where}.</p><div class="overscore"><div class="row"><span class="label">Round Score</span><span class="num"><b>${S.score.toLocaleString()}</b> <span class="muted">of ${S.target.toLocaleString()}</span></span></div><div class="overbar"><i style="width:${pct}%"></i></div></div>`;
  h += `</div><div class="overstats">${stat('Ante reached', `${Math.min(S.ante, CFG.antes)} / ${CFG.antes}`)}${stat('Blinds won', st.blinds)}${stat('Complete Hands', st.hands)}${stat('Partial Plays', st.melds)}${stat('YEN', '¥' + S.money)}</div>`;
  h += `<div class="overbest"><div><div class="label">Best Play</div><div class="v num">${st.best.toLocaleString()}</div></div>${st.bestDesc ? `<div class="muted">${st.bestDesc}</div>` : ''}</div>`;
  h += `<div class="label" style="margin:14px 0 6px">Talismans</div><div class="overtals">${S.talismans.length ? S.talismans.map((k, i) => `<span class="overtal"><span class="order">${i + 1}</span>${TAL[k].name}</span>`).join('') : '<span class="muted">None</span>'}</div>`;
  h += `<div class="shopfoot"><span class="seedline muted" style="margin:0">Seed <code class="seed">${S.seed}</code> <button class="ghost tiny-btn" data-copyseed>Copy</button> · ${DECKS[S.deckKey].name} · ${STAKES[S.stake].name}</span><span style="flex:1"></span><button id="mNewRun" class="primary">New Run</button></div>`;
  return h;
}
function deckHTML() {
  const inBlind = S.phase === 'blind';
  const all = inBlind ? [...S.hand, ...S.wall, ...S.river, ...openTiles(), ...S.played, ...S.indicators] : S.deck;
  const counts = new Array(34).fill(0), inWall = new Array(34).fill(0), reds = new Array(34).fill(0);
  for (const t of all) { counts[idx(t)]++; if (t.red) reds[idx(t)]++; } for (const t of S.wall) inWall[idx(t)]++;
  const eng = all.filter(t => t.eng), redTotal = all.filter(t => t.red).length;
  const stat = (label, v) => `<div class="stat"><div class="label">${label}</div><div class="v num">${v}</div></div>`;
  let h = `<div class="shophead"><h2>The Wall</h2></div><p class="muted" style="margin:2px 0 10px">${inBlind ? 'Each badge shows copies still face down in the Wall, out of copies in your deck.' : 'Each badge shows how many copies are in your deck.'}</p>`;
  h += `<div class="overstats wallstats">${stat('Tiles', all.length)}${inBlind ? stat('Still in the Wall', S.wall.length) : ''}${stat('Red Fives', redTotal)}${stat('Engraved', eng.length)}</div>`;
  for (const [label, from, to] of [['Manzu', 0, 9], ['Pinzu', 9, 18], ['Souzu', 18, 27], ['Honors', 27, 34]]) h += `<div class="label" style="margin:12px 0 6px">${label}</div><div class="wallrow" data-from="${from}" data-to="${to}"></div>`;
  if (eng.length) { const byEng = {}; for (const t of eng) byEng[t.eng] = (byEng[t.eng] || 0) + 1; h += `<div class="label" style="margin:12px 0 6px">Engravings</div><div class="overtals">${Object.entries(byEng).map(([k, n]) => `<span class="tagchip" title="${eng.filter(t => t.eng === k).map(tileName).join(', ')}">${ENG[k].name} ×${n}</span>`).join('')}</div>`; }
  h += `<button id="mClose" hidden>Close</button>`;
  setTimeout(() => { document.querySelectorAll('#modal .wallrow').forEach(g => { for (let i = +g.dataset.from; i < +g.dataset.to; i++) { const c = document.createElement('div'); c.className = 'wallcell' + (counts[i] === 0 || (inBlind && inWall[i] === 0) ? ' out' : ''); const t = tileFromIdx(i); c.appendChild(tileEl(t, { small: true })); const b = document.createElement('span'); b.className = 'wbadge num' + (reds[i] ? ' hasred' : ''); b.textContent = inBlind ? `${inWall[i]}/${counts[i]}` : `×${counts[i]}`; if (reds[i]) b.title = `${reds[i]} Red Five${reds[i] > 1 ? 's' : ''}`; c.appendChild(b); g.appendChild(c); } translateDOM(g); }); }, 0);
  return h;
}
function hanTableText() {
  // Groups the Han table into ranges that share a multiplier, e.g. "4–5 Han ×15 (Mangan)", straight from CFG.
  const out = []; let from = 1;
  for (let h = 1; h <= 13; h++) {
    const next = h + 1; const same = next <= 13 && hanMult(next) === hanMult(h) && tierName(next) === tierName(h);
    if (!same) { out.push(`${from === h ? from : from + '–' + h}${h === 13 ? '+' : ''} Han ×${hanMult(h)} (${tierName(h)})`); from = next; }
  }
  return out.join(', ');
}
function fullRulesHTML() {
  const R = CFG.blindReward, K = CFG.kanBonus;
  return `<div class="menu-rules">
  <h3>Playing a Blind</h3>
  <p><b>Goal.</b> Score at least the Blind's target before you run out of Plays. Each Ante has a Small Blind, a Big Blind and a Boss Blind. Beat all ${CFG.antes} Antes to win.</p>
  <p><b>Hand.</b> You hold ${CFG.handSize} tiles drawn from the Wall (136 tiles in the Standard Wall: four of every tile, four of them Red Fives). You refill after every action. A complete hand uses 14 tiles, so you always have spares. If the Wall runs dry you simply stop drawing.</p>
  <p><b>Plays and Discards.</b> You get ${CFG.playsPerBlind} Plays and ${CFG.discardsPerBlind} Discards per Blind, before Talismans, Flowers and Wall effects. A Discard throws up to ${CFG.maxDiscardTiles} tiles into the River, which stays visible for the whole Blind.</p>
  <p><b>Partial plays.</b> Select tiles that split into melds (Chi runs, Pon triplets, Kan quads) plus at most one pair, or two pairs on their own, and press Play. The box in the side panel names the rung it makes: Lone Tile, Pair, Two Pair, one meld, Two Melds, Three Melds, Ready Hand (three melds and a pair) or Four Melds. Bigger rungs score far more, so a hand one tile short is still worth cashing in. Each costs 1 Play. Run Info, Play Ladder tab, lists every rung's Chips and Han.</p>
  <p><b>Complete hand.</b> Select 14 tiles that make four melds and a pair, Seven Pairs, or Thirteen Orphans, and press Play. Its Yaku add Han. A complete hand with no Yaku still gets +1 Han. Each Yakuman counts as 13 Han, and they stack. Run Info lists all Yaku with example hands.</p>
  <p><b>Call.</b> Select one River tile and 2–3 hand tiles that form a meld with it, then press Call. It costs 1 Play and scores nothing yet, and you cannot Call with your last Play. The ${TAL.ryujin.name} Talisman makes your first ${TAL.ryujin.freeCall} Calls each Blind free. The meld is set aside as Open and counts toward your complete hand. Open hands get less Han from some Yaku and lose closed-only Yaku such as Pinfu and Iipeikou. After a Call you discard 1 tile to settle it, which does not use a Discard.</p>
  <p><b>Kan.</b> Four identical tiles can be played as a partial Kan for points, or declared with Declare Kan to set them aside as a closed Kan that counts toward your complete hand without opening it. Every Kan, declared or called, draws one replacement tile. If that tile ends up as the winning tile of your complete hand, you score Rinshan Kaihou (+1 Han).</p>
  <p><b>Furiten.</b> The winning tile of a complete hand is the newest tile you drew among the 14 you play. If a copy of that tile sits in your River, the hand is in Furiten and its Mult is halved. The helper marks waits that are already in your River. With the ${TAL.kawauso.name} Talisman you can claim one River tile as the winning tile: select it together with the rest of the hand and press Play. A claimed hand is always in Furiten, the tile leaves the River, and The Fisherman forbids claiming.</p>
  <p><b>Bosses.</b> Every Ante ends with a Yakuza Boss Blind with a rule twist, shown in red on the blind plate and on the Blind Select screen. Each run meets ${CFG.antes} of the ${Object.keys(BOSSES).length} bosses.</p>
  <h3>Scoring</h3>
  <p><b>Score = Chips × Mult.</b> The play's rung gives base Chips and Han. Every scored tile then adds Chips: 2–8 are worth their face value, and 1s, 9s and Honors are worth 10.</p>
  <p><b>Han becomes Mult.</b> All Han from the rung, Yaku, tiles, Scrolls and Talismans converts once through this table: ${hanTableText()}.</p>
  <p><b>Extra Han.</b> Each Red Five scored gives +1 Han. A Dora indicator is a tile flipped from the Wall; the next tile in sequence after it is the Dora (9 wraps to 1, Winds go East, South, West, North, Dragons go White, Green, Red), and each Dora scored gives +1 Han. Indicators last for the current Blind. In partial plays, a Pon or Kan of Winds or Dragons scores Yakuhai (+1 Han). Each Kan in a play with two or more melds adds +${K.chips} Chips and +${K.han} Han.</p>
  <p><b>Talismans.</b> Han from Talismans and the Holographic edition is counted before the table converts. Everything else fires after it, left to right: some Talismans add Chips, some add flat Mult (+4 Mult), some multiply (×1.5 Mult). A +Mult Talisman placed before a ×Mult Talisman scores more than the reverse. Drag Talismans to reorder them; the number on each card is its firing order. Some Talismans grow as you play and show their current value on the card, and some copy another Talisman. A Talisman you sell and buy again starts fresh.</p>
  <p><b>Scrolls of Mastery.</b> Each level of a meld Scroll gives +${CFG.scrollChips} Chips for every matching meld or pair in a play and +${CFG.scrollHan} Han once per play. Levels apply inside complete hands too, so a complete hand always beats the Ready Hand inside it. Other Scrolls are named after a hand pattern, such as Tanyao, and add Han whenever it scores.</p>
  <p><b>Engravings.</b> Omikuji can engrave tiles, and you can see it on the tile: Gold Foil (gold face, ¥1 when scored), Obsidian (dark stone face, +20 Chips), Jade (green face, ×1.5 Mult), Steel (brushed metal face, ×1.5 Mult while held in hand), Glass (clear blue face, ×2 Mult, 1 in 4 chance to shatter and leave your Wall), Red Seal (a red wax seal, scores twice) and Dragon Mark (a red emblem in the corner, +1 Han). Hover a tile for its exact effect.</p>
  <p><b>Editions.</b> Shop Talismans sometimes come in an edition: ${Object.values(EDITIONS).map(e => `${e.name} (${e.desc})`).join(', ')}.</p>
  <h3>Between Blinds</h3>
  <p><b>Money.</b> Beating a Blind pays ¥${R.small} for a Small Blind, ¥${R.big} for a Big Blind and ¥${R.boss} for a Boss, plus ¥1 for each unused Play and ¥1 interest for every ¥${CFG.interestPer} you hold (at most ¥${CFG.interestCap}). Red and Black Stakes pay nothing for Small Blinds.</p>
  <p><b>Shop.</b> Spend money on Talismans (passive, ${CFG.talismanSlots} slots), Omikuji and Kami (consumables, ${CFG.consumableSlots} slots, used on selected hand tiles), Scrolls of Mastery (permanent upgrades), Flowers (run-long perks) and one booster pack (open it and keep one or two of what's inside). Omikuji Packs and Kami Packs also deal ${PACK_HAND} random tiles from your Wall: select some and press Use on a card to change them for the rest of the run, or Keep the card for a Blind. After your last pick the pack stays open with the changed tiles outlined; press Done to return to the shop. ${CONS.indicator.name} and ${CONS.amaterasu.name} only work during a Blind. ${CONS.wealth.name} and ${CONS.raijin.name} can also be used from your slots in the shop; there ${CONS.raijin.name} destroys 2 random tiles from your Wall. Every shop has two random cards (Talismans ${Math.round(CFG.shopWeights.talisman * 100)}%, Omikuji ${Math.round(CFG.shopWeights.omikuji * 100)}%, Kami ${Math.round(CFG.shopWeights.kami * 100)}% each), plus one Scroll, one Flower and one booster pack in fixed spots. A reroll changes only the two random cards and costs ¥${CFG.rerollCost}. Selling returns half the item's value: click a Talisman on the board and press Sell, or sell from inside the shop.</p>
  <p><b>Blind Select.</b> After the shop you see the Ante's three blinds with their targets, rewards and the Boss's rule. A Small or Big Blind can be skipped for the Tag on its card instead of its money: free packs, editions, coupons, money, a bigger hand or a different Boss. Tags you hold show in the side panel.</p>
  <p><b>Setup.</b> A new run lets you choose a Wall (deck), a Stake (difficulty) and a seed. Sharing a seed replays the same Wall, shops and bosses.</p>
  <h3>Help and Controls</h3>
  <p><b>Helper.</b> Under your hand the game shows how many tiles you are from a complete hand. Settings can turn that off, and can turn on two more hints: which tiles you are waiting on, and whether the tiles you select can go without setting you back. Against The Purist they only count your visible tiles. Another assist marks dead tiles with green dots.</p>
  <p><b>Arranging.</b> Drag hand tiles to reorder them. Dragging turns off auto-sort; Sort Hand sorts again. Tiles score in the order they sit, which matters for Shikigami. Sorting also works against The Purist, so face-down tiles sit in their sorted place. A selection with face-down tiles always plays: if it isn't a valid play, its best part scores and the other selected tiles go to the River.</p>
  <p><b>Tile numbers.</b> Characters show their number and Winds their letter in the corner. Dots and Bamboo have none by default, since you count their pips. Settings can show numbers on all tiles or on none.</p>
  <p><b>Keys.</b> Enter or P plays, D discards, C calls, K declares a Kan, Esc clears your selection. Click anywhere or press any key while a play scores to skip the animation. Esc or a click outside closes Rules, Wall, Run Info and Settings.</p>
  </div>`;
}
function quickRulesHTML() {
  return `<ol class="quickrules">
  <li><b>Goal.</b> Reach each Blind's target score before your ${CFG.playsPerBlind} Plays run out. Three Blinds make an Ante; clear all ${CFG.antes} Antes to win.</li>
  <li><b>Your hand.</b> You hold ${CFG.handSize} tiles. Select tiles and press Play to score them, or Discard up to ${CFG.maxDiscardTiles} to draw new ones (${CFG.discardsPerBlind} Discards per Blind).</li>
  <li><b>What scores.</b> Runs (Chi), triplets (Pon), quads (Kan) and pairs. More melds score more, and a complete hand of four melds and a pair (14 tiles) scores the most.</li>
  <li><b>Score = Chips × Mult.</b> Tiles and melds give Chips. Han from hand patterns (Yaku) becomes Mult. The box in the side panel shows the play before you press Play.</li>
  <li><b>The River.</b> Your discards stay there all Blind. Call a River tile to finish a meld; it costs a Play.</li>
  <li><b>Talismans.</b> They fire left to right after each play. Put +Mult before ×Mult, and drag them to reorder.</li>
  <li><b>Between Blinds.</b> Spend money on Talismans, tile-changing Omikuji and Kami, Scrolls that level up your plays, and Flowers for the rest of the run.</li>
  <li><b>Bosses.</b> Each Ante ends with a Boss that bends one rule. Read its red box.</li>
  </ol><p class="muted" style="font-size:12px;margin:10px 0 0">Run Info lists every Yaku with example hands and the full Play Ladder. Full Rules has everything else.</p>`;
}
function rulesHTML() {
  const tabs = [['quick', 'Quick Start'], ['full', 'Full Rules']];
  return `<h2>How to Play</h2><div class="tabs">${tabs.map(([k, n]) => `<button class="tab${rulesTab === k ? ' on' : ''}" data-rtab="${k}">${n}</button>`).join('')}</div>${rulesTab === 'full' ? fullRulesHTML() : quickRulesHTML()}<button id="mClose" hidden>Close</button>`;
}
function mostPlayedRung() { let best = null, n = 0; for (const [k, v] of Object.entries(S.stats.rungs || {})) if (v > n) { n = v; best = k; } return best; }
function mostScoredYaku() { let best = null, n = 0; for (const [k, v] of Object.entries(S.stats.yaku || {})) if (v > n) { n = v; best = k; } return best; }
let infoTab = 'run';
let rulesTab = 'quick';
function parseHand(str) { const out = []; for (const grp of str.split(' ')) { const m = grp.match(/^(\d+)([mpsz])$/); if (!m) continue; const tiles = [...m[1]].map(d => ({ id: 0, suit: m[2], rank: +d, red: false, eng: null })); out.push(tiles); } return out; }
function exampleHTML(ex) { return `<div class="exrow" data-ex="${ex}"></div>`; }
function fillExamples(root) { root.querySelectorAll('.exrow').forEach(row => { if (row.children.length) return; for (const grp of parseHand(row.dataset.ex)) { const g = document.createElement('div'); g.className = 'exgrp'; for (const t of grp) { const e = tileEl(t, { small: true }); e.classList.add('tiny'); e.style.cursor = 'default'; g.appendChild(e); } row.appendChild(g); } }); }
function yakuHTML() {
  const st = S.stats; const most = mostPlayedRung(); const yc = k => (S && S.stats.yaku[k]) || 0;
  const tabs = [['run', 'Run'], ['ladder', 'Play Ladder'], ['yaku', 'Yaku'], ['yakuman', 'Yakuman']];
  let h = `<h2>Run Info</h2><div class="tabs">${tabs.map(([k, n]) => `<button class="tab${infoTab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
  if (infoTab === 'run') {
    const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
    h += `<div class="infogrid">`;
    h += `<div class="infocard"><div class="label">Run</div>${kv('Seed', `<code class="seed">${S.seed}</code> <button class="ghost tiny-btn" data-copyseed>Copy</button>`)}${kv('Wall', DECKS[S.deckKey].name)}${kv('Stake', STAKES[S.stake].name)}${kv('Ante', `${Math.min(S.ante, CFG.antes)} / ${CFG.antes}`)}${kv('Blinds won', st.blinds)}${kv('Skipped blinds', st.skipped)}${kv('Best play', `${st.best.toLocaleString()}${st.bestDesc ? ' <span class="muted">' + st.bestDesc + '</span>' : ''}`)}</div>`;
    h += `<div class="infocard"><div class="label">Plays this run</div>${kv('Complete hands', st.hands)}${kv('Partial plays', st.melds)}${kv('Calls from the River', st.calls)}${kv('Kans', st.kans)}${kv('Discards', st.discards)}${kv('Most-played rung', most ? (MELD_LABEL[most] || (CFG.rungs[most.replace('rung', '').split('').join(',')] || {}).name || most) : '—')}</div>`;
    const talRows = S.talismans.map((k, i) => { const ed = S.editions[k]; return `<div class="kv"><span><span class="order">${i + 1}</span>${TAL[k].name}${ed ? ` <span class="edtag ed-${ed}">${EDITIONS[ed].name}</span>` : ''}</span><b class="muted" style="font-weight:400;text-align:right;max-width:60%">${TAL[k].status ? TAL[k].status(S) : ''}</b></div>`; }).join('');
    h += `<div class="infocard"><div class="label">Talismans · ${S.talismans.length}/${talSlots()} · fire in this order</div>${talRows || '<div class="muted">None</div>'}</div>`;
    const sc = Object.entries(S.scrolls.meld).filter(([, v]) => v).map(([k, v]) => kv(MELD_LABEL[k], `Lv.${v + 1}`)).concat(Object.entries(S.scrolls.yaku).filter(([, v]) => v).map(([k, v]) => kv((YAKU_SHEET.find(y => y.k === k) || { n: k }).n, `+${v} Han`)));
    h += `<div class="infocard"><div class="label">Mastery</div>${sc.join('') || '<div class="muted">No Scrolls yet</div>'}</div>`;
    h += `<div class="infocard"><div class="label">Flowers &amp; Seasons</div>${S.flowers.map(f => kv(FLW[f].name, `<span class="muted" style="font-weight:400">${FLW[f].desc}</span>`)).join('') || '<div class="muted">None</div>'}</div>`;
    h += `<div class="infocard"><div class="label">Tags held</div>${(S.tags || []).map(t => kv(TAGS[t].name, `<span class="muted" style="font-weight:400">${TAGS[t].desc}</span>`)).join('') || '<div class="muted">None</div>'}</div>`;
    h += `</div>`;
    h += `<div class="infocard" style="margin-top:10px"><div class="label">Bosses</div><div class="bossline">${S.bossOrder.slice(0, CFG.antes).map((b, i) => { const known = i <= S.ante - 1 || st.bosses.includes(b); const beaten = i < S.ante - 1; return `<div class="bossstep${beaten ? ' beaten' : i === S.ante - 1 ? ' now' : ''}"><span class="order">A${i + 1}</span><b>${known ? BOSSES[b].name : '?'}</b>${known ? `<span class="muted">${BOSSES[b].desc}</span>` : ''}</div>`; }).join('')}</div></div>`;
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
  h += `<button id="mClose" hidden>Close</button>`;
  return h;
}
let setupSel = { deck: 0, stake: 0 };
function setupHTML() {
  const pickIdx = (name, obj) => { const n = Object.keys(obj).length; return ((setupSel[name] % n) + n) % n; };
  const di = pickIdx('deck', DECKS), si = pickIdx('stake', STAKES), dk = Object.keys(DECKS), sk = Object.keys(STAKES);
  const walls = dk.map((k, i) => `<button class="optcard${i === di ? ' on' : ''}" data-pick="deck:${i}"><span class="on-mark" aria-hidden="true"></span><b>${DECKS[k].name}</b><span class="muted">${DECKS[k].desc}</span></button>`).join('');
  const stakes = sk.map((k, i) => `<button class="stakechip${i === si ? ' on' : ''}" data-pick="stake:${i}"><i class="sw sw-${k}" aria-hidden="true"></i>${STAKES[k].name.replace(' Stake', '')}</button>`).join('');
  return `<div class="shophead"><h2>New Run</h2></div><p class="muted" style="margin:2px 0 14px">Pick a Wall and a Stake. Enter a seed to replay someone else's run.</p>
  <input type="hidden" name="deck" value="${dk[di]}"><input type="hidden" name="stake" value="${sk[si]}">
  <div class="setlabel"><span class="label">Wall</span><span class="muted">${DECKS[dk[di]].name}</span></div><div class="optgrid">${walls}</div>
  <div class="setlabel" style="margin-top:16px"><span class="label">Stake</span><span class="muted">difficulty</span></div><div class="stakerow">${stakes}</div><div class="stakedesc muted">${STAKES[sk[si]].desc}</div>
  <div class="setlabel" style="margin-top:16px"><span class="label">Seed</span><span class="muted">optional</span></div><input id="seedInput" placeholder="Random" maxlength="24" autocomplete="off"><div class="muted" style="font-size:11px;margin-top:4px">The same seed gives the same Wall, shops and bosses. Leave blank for a random run.</div>
  <div class="shopfoot"><button id="mClose" class="ghost">Cancel</button><span style="flex:1"></span><button id="mStartRun" class="primary">Start Run</button></div>`;
}
function menuHTML(hasSave) {
  const where = hasSave && S ? `Ante ${Math.min(S.ante, CFG.antes)} · ${S.phase === 'blind' ? ({ small: 'Small Blind', big: 'Big Blind', boss: S.boss ? BOSSES[S.boss].name : 'Boss Blind' })[blindKind()] : S.phase === 'shop' ? 'Shop' : 'Blind Select'} · ¥${S.money}` : '';
  return `<div class="hero"><div class="herotiles" id="heroTiles"></div>
  <h1 class="herotitle" data-notr>Yakuman</h1><div class="herokanji" data-notr>${LANG === 'hk' ? '役滿' : '役満'}</div>
  <p class="herotag">A Mahjong roguelite in the Balatro mould. Build hands, chase Yaku, stack Talismans, and outscore eight Antes of Yakuza bosses.</p>
  <div class="heroacts">${hasSave ? `<button id="mContinue" class="primary herobtn">Continue Run<span>${where}</span></button>` : ''}<button id="mStart" class="${hasSave ? 'ghost' : 'primary herobtn'}">New Run</button><button id="mRules" class="ghost">How to Play</button></div>
  <div class="herofoot muted">Playtest build · Riichi or Hong Kong terms in Settings</div></div>`;
}
// The intro screen's fan of honor tiles.
function fillHero(root) { const box = root && root.querySelector('#heroTiles'); if (!box || box.children.length) return; [[4, 1], [4, 2], [4, 3], [4, 7], [4, 4], [4, 5], [4, 6]].forEach(([, r], i, arr) => { const e = tileEl({ id: 0, suit: 'z', rank: r, red: false, eng: null }); const k = i - (arr.length - 1) / 2; e.style.transform = `rotate(${k * 7}deg) translateY(${Math.abs(k) * 5}px)`; e.style.cursor = 'default'; box.appendChild(e); }); }

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
  <button data-dbg="demo" title="Stage a complete hand with Red Fives, engravings and Talismans, then press Play to watch it score">Demo hand</button>
  <button data-dbg="reset" class="ghost">Wipe save</button>`;
  bar.querySelectorAll('[data-dbg]').forEach(b => b.onclick = () => {
    const a = b.dataset.dbg;
    if (a === 'money') S.money += 25; else if (a === 'play') S.plays++; else if (a === 'discard') S.discards++;
    else if (a === 'win') { if (S.phase === 'blind') { S.score = S.target; winBlind(); } }
    else if (a === 'refill') { if (S.phase === 'blind') { S.wall.push(...S.hand); shuffle(S.wall); S.hand = []; S.selected = []; draw(); } }
    else if (a === 'demo') { stageDemoHand(); }
    else if (a === 'reset') { clearSave(); location.reload(); return; }
    render();
  });
  $('#dbgBoss').onchange = e => { const k = e.target.value; if (!k) return; const i = S.ante - 1; S.bossOrder[i] = k; if (S.phase === 'blind' && blindKind() === 'boss') { S.boss = k; } setMsg(`Boss for Ante ${S.ante} set to ${BOSSES[k].name}.`); render(); };
  $('#dbgTal').onchange = e => { const k = e.target.value; if (!k) return; if (S.talismans.length < talSlots() && !S.talismans.includes(k)) gainTalisman(k); e.target.value = ''; render(); };
  $('#dbgCon').onchange = e => { const k = e.target.value; if (!k) return; if (S.consumables.length < conSlots()) S.consumables.push({ kind: CONS[k].kind, key: k }); e.target.value = ''; render(); };
  $('#dbgScr').onchange = e => { const k = e.target.value; if (!k) return; buyFree({ kind: 'scroll', key: k }); e.target.value = ''; render(); };
  $('#dbgEd').onchange = e => { const k = e.target.value; if (!k || !S.selTal) return; if (k === 'none') delete S.editions[S.selTal]; else S.editions[S.selTal] = k; e.target.value = ''; render(); };
  $('#dbgFlw').onchange = e => { const k = e.target.value; if (!k) return; if (!S.flowers.includes(k)) S.flowers.push(k); e.target.value = ''; render(); };
}
// A staged complete hand that exercises every counter: chips (Obsidian tile, Daruma, Scroll chips), Han (four Yaku, Red Five, Dora,
// Dragon Mark, Scroll Han), and Mult (+Mult from Tengu, Kitsune and Kasa-obake, then x3 from Hannya and x1.5 from its Polychrome edition).
function stageDemoHand() {
  if (S.phase !== 'blind') { setMsg('Start a blind first, then stage the demo hand.', true); return render(); }
  S.wall.push(...S.hand); S.hand = []; S.open = []; S.pendingDiscard = 0; S.selected = []; S.river = [];
  const mk = (suit, rank, red, eng) => { const t = mkTile(suit, rank, !!red); t.eng = eng || null; t.d = ++S.drawSeq; return t; };
  // 234 Man, 234 Pin, 234 Sou (Sanshoku) + 678 Sou + pair of 5 Pin: Tanyao, Pinfu, Sanshoku Doujun
  const tiles = [mk('m', 2, false, 'obsidian'), mk('m', 3, false, 'redseal'), mk('m', 4), mk('p', 2), mk('p', 3), mk('p', 4, false, 'jade'), mk('s', 2), mk('s', 3), mk('s', 4), mk('s', 6, false, 'dragonmark'), mk('s', 7, false, 'gold'), mk('s', 8, false, 'glass'), mk('p', 5, true), mk('p', 5), mk('z', 1), mk('z', 7), mk('m', 9)];
  S.hand = tiles; S.sortHand = false;
  S.selected = tiles.slice(0, 14).map(t => t.id);
  for (let i = 0; i < 5; i++) S.river.push(mk('z', 2 + (i % 3)));                 // five River tiles feed Daruma
  const ind = mk('s', 1); S.indicators = [ind]; S.dora = [nextDora(idx(ind))];       // indicator 1 Sou makes every 2 Sou a Dora
  S.talismans = ['daruma', 'tengu', 'kitsune', 'kasaobake', 'hannya']; S.editions = { hannya: 'poly' }; S.talState.kasaobake = 6;
  S.scrolls.meld.chi = Math.max(S.scrolls.meld.chi || 0, 2); S.scrolls.meld.hand = Math.max(S.scrolls.meld.hand || 0, 1);
  if (S.target < 5000) S.target = 5000;
  setMsg('Demo hand staged: 14 tiles selected. Press Play to watch chips, Han and Mult build up.'); render();
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

  $('#btnDeck').onclick = () => showModal(deckHTML(), true);
  $('#btnRules').onclick = () => showModal(rulesHTML(), true);
  $('#btnYaku').onclick = () => showModal(yakuHTML(), true);

  $('#btnSettings').onclick = () => showModal(settingsHTML(), true);
  $('#btnNewRun').onclick = () => showModal(`<div class="shophead"><h2>Start a New Run?</h2></div><p class="muted" style="margin:4px 0 0">Your current run will be lost.</p><div class="shopfoot"><button id="mClose" class="ghost">Cancel</button><span style="flex:1"></span><button id="mNewRun" class="danger">New Run</button></div>`, true, 'confirmmodal');
  document.addEventListener('click', e => { const b = e.target.closest('[data-copyseed]'); if (b) copySeed(b); if (S && S.busy && skipArmed) skipAnim = true; });
  $('#overlay').addEventListener('click', e => {
    if (e.target === $('#overlay')) { if (modalClosable()) closeModal(); return; }
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'mX') { closeModal(); return; }
    if (t.dataset.copyseed != null) return;
    if (t.dataset.tab) { infoTab = t.dataset.tab; showModal(yakuHTML(), true); return; }
    if (t.dataset.rtab) { const prev = $('#mClose') && $('#mClose').onclick; rulesTab = t.dataset.rtab; showModal(rulesHTML(), true); if (prev) $('#mClose').onclick = prev; return; }
    if (t.dataset.setlang) { setLang(t.dataset.setlang); showModal(settingsHTML(), true); return; }
    if (t.dataset.settilenums) { TILE_NUMS = t.dataset.settilenums; try { localStorage.setItem('yakuman.tilenums', TILE_NUMS); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.dataset.sethint) { HINTS[t.dataset.sethint] = !HINTS[t.dataset.sethint]; try { localStorage.setItem('yakuman.hints', JSON.stringify(HINTS)); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setdots) { SHOW_DOTS = t.dataset.setdots === 'on'; try { localStorage.setItem('yakuman.dots', SHOW_DOTS ? 'on' : 'off'); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setspeed) { ANIM_SPEED = t.dataset.setspeed; try { localStorage.setItem('yakuman.speed', ANIM_SPEED); } catch (e) { } showModal(settingsHTML(), true); return; }
    if (t.dataset.setdbg) { const b = $('#debugBar'); b.hidden = t.dataset.setdbg !== 'on'; if (!b.hidden) renderDebug(); showModal(settingsHTML(), true); return; }
    if (t.dataset.wipe != null) { clearSave(); location.reload(); return; }
    if (t.id === 'mClose') { hideModal(); render(); }
    else if (t.id === 'mNewRun' || t.id === 'mStart') { showModal(setupHTML(), true, 'setupmodal'); }
    else if (t.dataset.pick) { const [name, i] = t.dataset.pick.split(':'); const seed = ($('#seedInput') || {}).value || ''; setupSel[name] = +i; showModal(setupHTML(), true, 'setupmodal'); $('#seedInput').value = seed; }
    else if (t.dataset.nav) { const [name, d] = t.dataset.nav.split(':'); const seed = ($('#seedInput') || {}).value || ''; setupSel[name] += +d; showModal(setupHTML(), true, 'setupmodal'); $('#seedInput').value = seed; }
    else if (t.id === 'mStartRun') { const deck = ($('#modal input[name=deck]') || {}).value, stake = ($('#modal input[name=stake]') || {}).value, seed = ($('#seedInput') || {}).value; hideModal(); newRun({ deck, stake, seed }); }
    else if (t.id === 'mContinue') { hideModal(); render(); }
    else if (t.id === 'mRules') { showModal(rulesHTML() + '', true); $('#mClose').onclick = () => { showModal(menuHTML(!!load()), true, 'menumodal'); }; }
    else if (t.id === 'mCashOut') { S.phase = 'shop'; S.msg = ''; render(); }
    else if (t.id === 'mNext') { S.shop = null; S.pack = null; S.msg = ''; S.phase = 'select'; render(); }
    else if (t.id === 'mPlayBlind') { S.msg = ''; startBlind(); render(); }
    else if (t.id === 'mRunInfo') { showModal(yakuHTML(), true); $('#mClose').onclick = () => { modalPinned = false; render(); }; }
    else if (t.id === 'mReroll') reroll();
    else if (t.id === 'mSkip') skipBlind();
    else if (t.dataset.freepack != null) { const pk = S.shop.freePacks.splice(+t.dataset.freepack, 1)[0]; openPack(pk, true); render(); }
    else if (t.dataset.take != null) takeFromPack(+t.dataset.take);
    else if (t.dataset.packuse != null) usePackCard(+t.dataset.packuse);
    else if (t.id === 'mPackDone') { S.pack = null; render(); }
    else if (t.id === 'mDeck') { showModal(deckHTML(), true); $('#mClose').onclick = () => { modalPinned = false; render(); }; }
    else if (t.dataset.buy != null) { const items = [...S.shop.cards, S.shop.scroll, S.shop.flower, S.shop.pack].filter(Boolean); buy(items[+t.dataset.buy]); }
    else if (t.dataset.sell) sellTalisman(t.dataset.sell);
    else if (t.dataset.sellcon != null) sellConsumable(+t.dataset.sellcon);
    else if (t.dataset.usecon != null) useConsumable(+t.dataset.usecon);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalClosable()) { closeModal(); return; }
    if (S.phase !== 'blind' || !$('#overlay').hidden) return;
    if (S.busy) { if (skipArmed) skipAnim = true; return; }
    if (e.key === 'Enter' || e.key === 'p') doPlay(); else if (e.key === 'd') doDiscard(); else if (e.key === 'c') doCall(); else if (e.key === 'k') doDeclareKan(); else if (e.key === 'Escape') { S.selected = []; S.selRiver = null; render(); }
  });
}
function boot(saved) {
  bindEvents();
  if (saved && saved.phase && saved.deck) { S = saved; S.talState = S.talState || {};
    // Resume the tile id counter above every id in the saved run, so tiles created later never collide with existing ones.
    let maxId = 0; for (const t of [...S.deck, ...S.hand, ...S.wall, ...S.river, ...S.played, ...(S.indicators || []), ...S.open.flatMap(m => m.tiles)]) if (t.id > maxId) maxId = t.id; tileSeq = Math.max(tileSeq, maxId);
    // Repair any duplicates an older save may already contain
    const seen = new Set(); for (const zone of [S.hand, S.wall, S.river, S.played, S.deck, S.indicators || [], ...S.open.map(m => m.tiles)]) for (const t of zone) { if (seen.has(t.id)) t.id = ++tileSeq; seen.add(t.id); } S.editions = S.editions || {}; S.seed = S.seed || 'legacy'; S.deckKey = S.deckKey || 'standard'; S.stake = S.stake || 'white'; if (S.rngState === undefined) S.rngState = hashSeed(S.seed + Date.now()); S.stats.rungs = S.stats.rungs || {}; S.stats.yaku = S.stats.yaku || {}; S.stats.bosses = S.stats.bosses || []; S.tags = S.tags || []; if (!S.skipTags) S.skipTags = { small: pick(Object.keys(TAGS)), big: pick(Object.keys(TAGS)) }; S.stats.skipped = S.stats.skipped || 0; S.stats.calls = S.stats.calls || 0; S.stats.kans = S.stats.kans || 0; S.stats.discards = S.stats.discards || 0; S.busy = false; S.newIds = []; S.drawSeq = S.drawSeq || 0; render(); showModal(menuHTML(true), true, 'menumodal'); }
  else { S = newState(); startBlind(); render(); showModal(menuHTML(false), true, 'menumodal'); }
}
try { if (window.claude && window.claude.hot) window.claude.hot.snapshot(() => S); } catch (e) { }
const hotData = (window.claude && window.claude.hot && window.claude.hot.data) || null;
boot(hotData && hotData.phase ? hotData : load());
