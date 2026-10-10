// ===================== TERMINOLOGY SWITCH =====================
let LANG = 'ja'; try { LANG = localStorage.getItem('yakuman.lang') === 'hk' ? 'hk' : 'ja'; } catch (e) { }
let SHOW_DOTS = false; try { SHOW_DOTS = localStorage.getItem('yakuman.dots') === 'on'; } catch (e) { }
// Display settings: animated background (on by default) and high-contrast tiles (off by default).
let BG_ANIM = true; try { BG_ANIM = localStorage.getItem('yakuman.bganim') !== 'off'; } catch (e) { }
let HIGH_CONTRAST = false; try { HIGH_CONTRAST = localStorage.getItem('yakuman.hc') === 'on'; } catch (e) { }
// Screen shake on big scores (on by default) and a CRT filter (off by default), like Balatro's options.
let SHAKE = true; try { SHAKE = localStorage.getItem('yakuman.shake') !== 'off'; } catch (e) { }
// CRT: 'off', 'on' (light: scanlines and vignette) or 'full' (adds Balatro's screen curvature, bloom and chromatic aberration).
let CRT = 'off'; try { CRT = localStorage.getItem('yakuman.crt') || 'off'; } catch (e) { }
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
  <div class="setrow"><div><b>Sound</b><div class="muted">Tile clacks, scoring chimes and counters. Sound starts after your first click.</div></div><div class="setbtns"><button class="${SOUND ? 'primary' : ''}" data-setsound="on">On</button><button class="${!SOUND ? 'primary' : ''}" data-setsound="off">Off</button></div></div>
  <div class="setrow"><div><b>Music</b><div class="muted">A laid-back synth groove in the style of Balatro, with a brighter Shop theme and a heavier Boss theme that crossfade as you play. Separate from Sound, and starts after your first click.</div></div><div class="setbtns"><button class="${MUSIC ? 'primary' : ''}" data-setmusic="on">On</button><button class="${!MUSIC ? 'primary' : ''}" data-setmusic="off">Off</button></div></div>
  <div class="setsec">Display</div>
  <div class="setrow"><div><b>Animated background</b><div class="muted">Slowly drifting light behind the table, like Balatro's swirl. Turned off automatically if your device asks for reduced motion.</div></div><div class="setbtns"><button class="${BG_ANIM ? 'primary' : ''}" data-setbg="on">On</button><button class="${!BG_ANIM ? 'primary' : ''}" data-setbg="off">Off</button></div></div>
  <div class="setrow"><div><b>Screen shake</b><div class="muted">The table shakes a little when a play scores three times the target or more.</div></div><div class="setbtns"><button class="${SHAKE ? 'primary' : ''}" data-setshake="on">On</button><button class="${!SHAKE ? 'primary' : ''}" data-setshake="off">Off</button></div></div>
  <div class="setrow"><div><b>CRT filter</b><div class="muted">Light adds faint scanlines and a soft vignette. Full also curves the screen like an old tube, with a slight bloom and colour fringing at the edges, like Balatro's CRT; it is heavier and may slow older devices.</div></div><div class="setbtns">${[['off', 'Off'], ['on', 'Light'], ['full', 'Full']].map(([k, n]) => `<button class="${CRT === k ? 'primary' : ''}" data-setcrt="${k}">${n}</button>`).join('')}</div></div>
  <div class="setrow"><div><b>High-contrast tiles</b><div class="muted">One strong colour per suit (Characters red, Dots blue, Bamboo green), with the number on every suited tile. Red Fives stay red with a red corner number.</div></div><div class="setbtns"><button class="${HIGH_CONTRAST ? 'primary' : ''}" data-sethc="on">On</button><button class="${!HIGH_CONTRAST ? 'primary' : ''}" data-sethc="off">Off</button></div></div>
  <div class="setrow"><div><b>Terminology</b><div class="muted" data-notr>Riichi uses Japanese names (Chi, Pon, Kan, Han, Yaku, ¥). Hong Kong uses English names (Chow, Pung, Kong, Faan, $).</div></div><div class="setbtns"><button class="${LANG === 'ja' ? 'primary' : ''}" data-setlang="ja">Riichi</button><button class="${LANG === 'hk' ? 'primary' : ''}" data-setlang="hk">Hong Kong</button></div></div>
  <div class="setrow"><div><b>Tile numbers</b><div class="muted">The small number or letter in a tile's corner. Characters and Winds is the default: Dots and Bamboo are counted by their pips. With All Tiles, some numbers sit over the Dots and Bamboo art.</div></div><div class="setbtns">${[['all', 'All Tiles'], ['some', 'Characters and Winds'], ['none', 'None']].map(([k, n]) => `<button class="${TILE_NUMS === k ? 'primary' : ''}" data-settilenums="${k}">${n}</button>`).join('')}</div></div>
  <div class="setrow"><div><b>Scoring animation speed</b><div class="muted">How fast tiles and Talismans score. Instant shows the result at once. Clicking anywhere during scoring also skips.</div></div><div class="setbtns">${Object.keys(SPEEDS).map(k => `<button class="${ANIM_SPEED === k ? 'primary' : ''}" data-setspeed="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
  <div class="setsec">Your data</div>
  <div class="setrow"><div><b>Profile</b><div class="muted">${PROFILE.runs} runs · ${PROFILE.wins} wins · best Ante ${PROFILE.bestAnte || '—'} · ${unlockedCount()} of ${UNLOCKS.length} unlocks. Saved in this browser. Export to move it, with your settings and current run, to another device.</div></div><div class="setbtns solo"><button class="ghost" id="mExport">Export</button><button class="ghost" id="mImport">Import</button></div></div>
  <div class="setrow"><div><b>Delete current run</b><div class="muted">Ends the run in progress so it can't be continued. Your profile, unlocks and settings stay.</div></div><div class="setbtns solo"><button class="danger" id="mDeleteRun"${hasRunSave() ? '' : ' disabled'}>Delete Run</button></div></div>
  <div class="setrow"><div><b>Reset profile</b><div class="muted">Clears lifetime stats and locks everything you have unlocked again. Your current run and settings stay.</div></div><div class="setbtns solo"><button class="danger" id="mResetProfile">Reset Profile</button></div></div>
  <div class="setsec">Advanced</div>
  <div class="setrow"><div><b>Dead-tile dots</b><div class="muted">Green dots mark tiles you can discard without losing progress toward a complete hand.</div></div><div class="setbtns"><button class="${SHOW_DOTS ? 'primary' : ''}" data-setdots="on">On</button><button class="${!SHOW_DOTS ? 'primary' : ''}" data-setdots="off">Off</button></div></div>
  <div class="setrow"><div><b>Debug tools</b><div class="muted">A bar under the board with money, plays, items, bosses and editions for playtesting.</div></div><div class="setbtns"><button class="${dbgOn ? 'primary' : ''}" data-setdbg="on">Show</button><button class="${!dbgOn ? 'primary' : ''}" data-setdbg="off">Hide</button></div></div>
  <div class="setrow"><div><b>Unlock everything</b><div class="muted">For playtesting. Every Talisman, Wall and Stake is available and the whole Collection is revealed, whatever your profile says. Progress keeps counting.</div></div><div class="setbtns"><button class="${UNLOCK_ALL ? 'primary' : ''}" data-setunlock="on">On</button><button class="${!UNLOCK_ALL ? 'primary' : ''}" data-setunlock="off">Off</button></div></div>
  <div class="setrow"><div><b>Reset settings</b><div class="muted">Puts every setting on this page back to its default. Your run, profile and unlocks are not touched.</div></div><div class="setbtns solo"><button class="ghost" id="mResetSettings">Reset to Defaults</button></div></div>
  <button id="mClose" hidden>Close</button>`;
}
// ===================== STATE =====================
let S = null;
const SAVE_KEY = 'yakuman.save.v1';
function newState(opts = {}) {
  const seed = (opts.seed || '').trim() || randomSeed();
  const ch = CHAL[opts.challenge] ? opts.challenge : null;
  const st = { seed, rngState: hashSeed(seed), deckKey: ch ? 'standard' : DECKS[opts.deck] ? opts.deck : 'standard', stake: ch ? 'white' : STAKES[opts.stake] ? opts.stake : 'white', challenge: ch };
  S = st; // rand() reads S.rngState from here on
  const bosses = []; for (let a = 1; a <= CFG.antes; a++) bosses.push(rollBoss(a, bosses));
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
const handSize = () => Math.max(8, CFG.handSize + (S.deckKey === 'painted' ? 2 : 0) + (S.handMod || 0) - (chal('luxury') ? Math.floor(S.money / 5) : 0) + (hasF('plum') ? 1 : 0) + (hasF('plum2') ? 1 : 0) + (S.deckKey === 'abundant' ? 2 : 0) + (S.blindMods && S.blindMods.handSize || 0) - (S.boss === 'miser' && S.phase === 'blind' ? 3 : 0));
const capacity = () => handSize() - 3 * S.open.length;
const neededConcealed = () => 14 - 3 * S.open.length;
// The Purist: is a face-down tile selected? Then the scoring box and the Play button must not reveal what the tiles make.
// Face-down tiles: The Purist (1s, 9s and Honors), The Mark (Honors), The House and The Wheel (tiles marked when drawn)
// and the Blindfold Challenge. They are revealed when played or discarded; Amaterasu reveals them for the Blind.
const isFaceDown = t => S.phase === 'blind' && !S.revealed && (t.down || chal('blindfold') || (S.boss === 'purist' && (isHonor(t) || isTerminal(t))) || (S.boss === 'mark' && isHonor(t)));
const hiddenSelected = () => S.phase === 'blind' && selTiles().some(isFaceDown);
// Kawauso: one River tile may complete a hand as its winning tile. The Fisherman forbids taking tiles from the River.
const canClaim = () => S.boss !== 'fisherman' && liveTals(S).some(k => TAL[k].riverClaim);
const claimTile = () => (S.selRiver && canClaim()) ? S.river.find(t => t.id === S.selRiver) || null : null;
const conSlots = () => CFG.consumableSlots + (hasF('spring') ? 1 : 0) + (hasF('spring2') ? 1 : 0) + (S.deckKey === 'merchant' ? 1 : 0);
const price = c => { let p = c + (S.inflation || 0); if (S.deckKey === 'merchant') p = Math.ceil(p * 1.25); if (hasF('chrys2')) p = Math.ceil(p * 0.6); else if (hasF('chrysanthemum')) p = Math.ceil(p * 0.8); return Math.max(1, p); };
const talSlots = () => (chal('slots') || CFG.talismanSlots) - (S.deckKey === 'painted' ? 1 : 0) + S.talismans.filter(k => S.editions[k] === 'neg').length + (hasF('camellia2') ? 1 : 0);
// Flower helpers shared by the Blind, the select screen and the shop.
const interestCap = () => hasF('winter2') ? 20 : hasF('winter') ? 10 : CFG.interestCap;
const shopSlots = () => 2 + (hasF('lotus') ? 1 : 0) + (hasF('lotus2') ? 1 : 0);
const editionMult = () => hasF('sakura2') ? 4 : hasF('sakura') ? 2 : 1;
const talSellValue = k => Math.max(1, Math.floor(talValue(k) / 2)) + (hasF('camellia') ? 1 : 0) + ((S.sellBonus && S.sellBonus[k]) || 0);
const conSellValue = c => Math.max(1, Math.floor(CONS[c.key].cost / 2)) + (c.bonus || 0);
// Destroys a Talisman (Kamikiri, Izanagi, Izanami) and clears everything it owned. Eternal Talismans cannot be destroyed.
// Balatro's dissolve: a copy of the card burns away where it stood, then the board redraws without it.
function dissolveTal(k) {
  if (!motionOK) return; const i = S.talismans.indexOf(k), b = document.querySelector(`#modal [data-sell="${k}"]`);
  if (b) return burnInList(b.closest('.shopcard'));   // the compact (full-screen) Shop's list of your cards
  holdRow('#talismans .slot.filled', '#talismans', i); dissolveEl([...document.querySelectorAll('#talismans .slot')][i]);
}
// In the compact layout's list of your cards nothing moves: the sold card burns away where it is, the list holds still, and
// only once it has burned out is the list redrawn in its new order. Returns true when the redraw is left to it.
function burnInList(el) {
  if (!el || !motionOK) return false; $('#modal').style.pointerEvents = 'none';
  el.animate([{ opacity: 1, filter: 'none', transform: 'none' }, { opacity: .9, filter: 'brightness(1.6) sepia(.6) saturate(3) blur(.5px)', transform: 'scale(1.03)', offset: .3 }, { opacity: 0, filter: 'brightness(2) saturate(4) blur(6px)', transform: 'scale(.92) translateY(-10px)' }], { duration: DISSOLVE_MS, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => { $('#modal').style.pointerEvents = ''; render(); }, DISSOLVE_MS + 20);
  return true;
}
const DISSOLVE_MS = 520;
function dissolveEl(el) {
  if (!el || !motionOK) return; const r = el.getBoundingClientRect(), g = el.cloneNode(true); Object.assign(g.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, zIndex: 60, pointerEvents: 'none' }); document.body.appendChild(g);
  g.animate([{ opacity: 1, filter: 'none', transform: 'none' }, { opacity: .9, filter: 'brightness(1.6) sepia(.6) saturate(3) blur(.5px)', transform: 'scale(1.03)', offset: .3 }, { opacity: 0, filter: 'brightness(2) saturate(4) blur(6px)', transform: 'scale(.92) translateY(-10px)' }], { duration: DISSOLVE_MS, easing: 'ease-in' }).onfinish = () => g.remove(); setTimeout(() => g.remove(), 900);
}
// When a card leaves a row (sold or destroyed), the cards after it wait where they were until the dissolve has burned out,
// then slide into the gap, so they never pass over the burning card. Positions are taken before the redraw and played after it.
// When a new card makes a row taller (a long description, or a new line in a list), the row grows into its new height instead
// of jumping, and a Shop tray sitting under the board's row glides down with it. Heights are read before a redraw, compared after.
const GROW_ROWS = ['#talismans', '#consumables', '#modal .owned-grid.otal', '#modal .owned-grid.ocon'];
let growPhase = null;
function rowHeights() {
  const ov = $('#overlay');
  return { phase: S.phase + (S.pack ? ':pack' : ''), h: GROW_ROWS.map(q => { const e = document.querySelector(q); return e ? e.getBoundingClientRect().height : null; }), top: ov.classList.contains('inflow') ? ov.style.top : null };
}
function growRows(was) {
  const same = growPhase === was.phase && was.phase === S.phase + (S.pack ? ':pack' : ''); growPhase = S.phase + (S.pack ? ':pack' : '');
  if (!same || !motionOK || S.quiet) return;
  const ease = { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' };
  GROW_ROWS.forEach((q, i) => {
    const e = document.querySelector(q), h0 = was.h[i]; if (!e || h0 == null) return; const h1 = e.getBoundingClientRect().height;
    if (h1 - h0 > 1) { e.style.overflow = 'hidden'; const done = () => { e.style.overflow = ''; }; e.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], ease).onfinish = done; setTimeout(done, 600); }
  });
  const ov = $('#overlay'); if (was.top && ov.classList.contains('inflow') && ov.style.top !== was.top && parseFloat(ov.style.top) > parseFloat(was.top)) ov.animate([{ top: was.top }, { top: ov.style.top }], ease);
}
let rowHolds = [];
function holdRow(sel, box, gone) {
  if (!motionOK || gone < 0) return; const b = document.querySelector(box);
  const ov = $('#overlay');
  rowHolds.push({ sel, box, gone, top: ov.classList.contains('inflow') ? ov.style.top : null, t: performance.now(), rects: [...document.querySelectorAll(sel)].filter(e => !e.classList.contains('rowghost')).map(e => e.getBoundingClientRect()), h: b ? b.getBoundingClientRect().height : 0 });
}
function playRowHolds() {
  const holds = rowHolds; rowHolds = [];
  for (const h of holds) {
    if (performance.now() - h.t > 1000) continue;
    const box = document.querySelector(h.box); if (!box) continue;
    const br = box.getBoundingClientRect(), nowH = br.height, wait = DISSOLVE_MS - 60, total = wait + 280;
    // The row's box keeps its old height while the card burns (a list that loses a whole row would otherwise jump), then
    // eases to its new height as the cards slide. Rows stay packed at the top meanwhile instead of stretching to fill it.
    box.classList.add('reflowing'); setTimeout(() => box.classList.remove('reflowing'), total + 80);
    if (h.h - nowH > 1) box.animate([{ height: h.h + 'px' }, { height: h.h + 'px', offset: wait / total }, { height: nowH + 'px' }], { duration: total, easing: 'ease-in-out' });
    // A Shop tray under the board's row moves with it: it waits at its old place, then rises as the row shrinks.
    const ov = $('#overlay'); if (h.top && ov.classList.contains('inflow') && parseFloat(ov.style.top) < parseFloat(h.top) - 1) ov.animate([{ top: h.top }, { top: h.top, offset: wait / total }, { top: ov.style.top }], { duration: total, easing: 'ease-in-out' });
    // Each card that has to move or change size (cards in a grid stretch to their row's tallest, so rows re-pairing resizes
    // them) is played by a stand-in copy laid over the list, out of the layout, so nothing reflows while it moves. The real
    // list is already in its final shape underneath, hidden until the copies land.
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    [...document.querySelectorAll(h.sel)].filter(e => !e.classList.contains('rowghost')).forEach((el, j) => {
      const was = h.rects[j < h.gone ? j : j + 1]; if (!was) return; const now = el.getBoundingClientRect(), dx = was.left - now.left, dy = was.top - now.top;
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && Math.abs(was.height - now.height) <= 1 && Math.abs(was.width - now.width) <= 1) return;
      const g = el.cloneNode(true); g.classList.add('rowghost');
      Object.assign(g.style, { position: 'absolute', left: now.left - br.left - box.clientLeft + 'px', top: now.top - br.top - box.clientTop + 'px', width: now.width + 'px', height: now.height + 'px', margin: 0, zIndex: 3, pointerEvents: 'none', visibility: '' });
      box.appendChild(g); el.style.visibility = 'hidden';
      const show = () => { g.remove(); el.style.visibility = ''; };
      g.animate([{ transform: `translate(${dx}px,${dy}px)`, width: was.width + 'px', height: was.height + 'px' }, { transform: 'none', width: now.width + 'px', height: now.height + 'px' }], { duration: 280, delay: wait, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }).onfinish = show;
      setTimeout(() => { if (g.isConnected) show(); }, total + 400);   // safety if animations are paused
    });
  }
}
function destroyTalisman(k) {
  if (!S.talismans.includes(k) || isEternal(k)) return false; dissolveTal(k);
  S.talismans = S.talismans.filter(x => x !== k); delete S.editions[k]; if (S.stickers) delete S.stickers[k]; if (S.sellBonus) delete S.sellBonus[k];
  S.talState = freshTalState(k); if (S.crimsonOff === k) S.crimsonOff = null; if (S.selTal === k) S.selTal = null;
  return true;
}
const blindPlays = () => chal('plays') ? chal('plays') : Math.max(1, (chal('plusPlays') || 0) + CFG.playsPerBlind + S.bonusPlays + talMod('plays') + (hasF('bamboo') ? 1 : 0) + (hasF('bamboo2') ? 1 : 0) - (hasF('wisteria') ? 1 : 0) + (S.deckKey === 'gambler' ? 1 : 0) - (S.deckKey === 'abundant' || S.deckKey === 'lean' ? 1 : 0));
const blindDiscards = () => Math.max(0, (chal('discards') || 0) + CFG.discardsPerBlind + S.bonusDiscards + talMod('discards') + (hasF('orchid') ? 1 : 0) + (hasF('orchid2') ? 1 : 0) - (hasF('wisteria2') ? 1 : 0) - (stakeLevel(S.stake) >= 4 ? 1 : 0) - (S.deckKey === 'gambler' ? 1 : 0));
const rerollPrice = () => S.shop && S.shop.freeReroll ? 0 : S.shop && S.shop.d6 ? S.shop.rerolls || 0 : rerollCost() + ((S.shop && S.shop.rerolls) || 0);
// Stakes stack like Balatro's: each one keeps every penalty of the Stakes below it.
const STAKE_KEYS = Object.keys(STAKES);
const stakeLevel = k => STAKE_KEYS.indexOf(k);
const smallPaysNothing = () => stakeLevel(S.stake) >= 1;
const stakeTargets = () => (stakeLevel(S.stake) >= 2 ? 1.3 : 1) * (stakeLevel(S.stake) >= 5 ? 1 + 0.05 * (S.ante - 1) : 1);
// Monk's Wall pays for its easy flushes with doubled targets, like Balatro's Plasma Deck.
const wallTargets = () => S.deckKey === 'monk' || S.deckKey === 'plasma' ? 2 : 1;
const stakeTalCost = () => stakeLevel(S.stake) >= 3 ? 2 : 0;
// Stickers for a shop or pack Talisman: Eternal from Black Stake, Perishable from Orange (never both), Rental from Gold.
// Shōjō leaves by itself and Legendaries come from Hitodama, so they never carry one.
function rollSticker(k) {
  if (chal('allPerish') || chal('allRental')) return k === 'shojo' ? null : Object.assign({}, chal('allPerish') ? { perish: 5 } : {}, chal('allRental') ? { rental: true } : {});
  const lv = stakeLevel(S.stake); if (lv < 3 || k === 'shojo' || talRarity(k) === 'legendary') return null;
  const st = {}, r = rand(); if (r < 0.3) st.eternal = true; else if (lv >= 6 && r < 0.6) st.perish = 5;
  if (lv >= 7 && rand() < 0.3) st.rental = true; return Object.keys(st).length ? st : null;
}
// Talisman card labels, shared by board slots, shop and pack cards, owned cards and the Collection.
// The label row holds at most three things: the firing order, the rarity (coloured text), and the edition on the right.
// On narrow board slots (compact) the rarity colours the order circle instead, and editions use short names.
const ED_SHORT = { foil: 'Foil', holo: 'Holo', poly: 'Poly', neg: 'Neg' };
// mode: 'slot' (board slot), 'owned' (owned list: short edition names), or nothing (shop, pack and Collection cards).
function talKindRow(k, ed, order, mode) {
  const compact = mode === 'slot', r = talRarity(k), edTag = ed && EDITIONS[ed] ? `<span class="edtag ed-${ed}" title="${EDITIONS[ed].name}: ${EDITIONS[ed].desc}">${mode ? ED_SHORT[ed] : EDITIONS[ed].name}</span>` : '';
  if (compact) return `<span class="order rar-dot-${r}" title="${RARITIES[r]} · firing order ${order}">${order}</span>${edTag ? '' : `<span class="rarity rt-${r}">${RARITIES[r]}</span>`}${edTag}`;   // with an edition, the coloured circle alone shows the rarity
  return `${order ? `<span class="order" title="Firing order">${order}</span>` : ''}<span class="rarity rt-${r}">${RARITIES[r]}</span>${edTag}`;
}
// Stickers are small round badges on the card's top-right corner, like Balatro's, so they never crowd the label row.
function stickerBadges(st) {
  if (!st) return ''; const b = [];
  if (st.eternal) b.push('<span class="stkb stkb-eternal" title="Eternal: can never be sold">∞</span>');
  if (st.perish !== undefined) b.push(`<span class="stkb stkb-perish${st.perish ? '' : ' gone'}" title="${st.perish ? `Perishable: stops working after ${st.perish} more Blind${st.perish > 1 ? 's' : ''}` : 'Perished: no longer works'}">${st.perish || '✕'}</span>`);
  if (st.rental) b.push('<span class="stkb stkb-rental" title="Rental: ¥3 at the end of every Blind">¥</span>');
  return b.length ? `<span class="stkcorner">${b.join('')}</span>` : '';
}
const stickerTags = st => !st ? '' : (st.eternal ? '<span class="stk stk-eternal" title="Can never be sold">Eternal</span>' : '') + (st.perish !== undefined ? `<span class="stk stk-perish" title="Stops working after 5 Blinds">${st.perish > 0 ? `Perishable · ${st.perish}` : 'Perished'}</span>` : '') + (st.rental ? '<span class="stk stk-rental" title="¥3 at the end of every Blind">Rental</span>' : '');
// A Challenge rule for this run, or undefined.
const chal = r => S && S.challenge && CHAL[S.challenge] && CHAL[S.challenge].rules ? CHAL[S.challenge].rules[r] : undefined;
const isEternal = k => !!(chal('noSell') || (S.stickers && S.stickers[k] && S.stickers[k].eternal));
// Rerolls start at ¥5 (Autumn ¥3, Harvest Moon ¥1) and cost ¥1 more each time in the same shop, as in Balatro.
const rerollCost = () => hasF('autumn2') ? 1 : hasF('autumn') ? 3 : CFG.rerollCost;
function talMod(f) { return liveTals(S).reduce((a, k) => a + (TAL[k][f] || 0), 0); }
function selTiles() { return S.selected.map(id => S.hand.find(t => t.id === id)).filter(Boolean); }
function openTiles() { return S.open.flatMap(m => m.tiles); }

function save() { if (S && S.placeholder) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
function hasRunSave() { try { return !!localStorage.getItem(SAVE_KEY) && !!S && !['gameover', 'win'].includes(S.phase); } catch (e) { return false; } }
// ===================== PLAYER PROFILE =====================
// Lifetime progress that outlives runs (New Run and Wipe save leave it alone). Unlocks will build on this.
const PROFILE_KEY = 'yakuman.profile.v1';
function blankProfile() { return { v: 1, created: Date.now(), runs: 0, wins: 0, bestAnte: 0, bestPlay: 0, bestPlayDesc: '', hands: 0, blinds: 0, stakesWon: {}, wallsWon: {}, bosses: {}, yaku: {}, unlocked: [], calls: 0, sold: 0, scrollsUsed: 0, furitenHands: 0, openHands3: 0, mostMoney: 0, wallStakes: {}, seen: {}, achieved: [], challengesWon: {}, legendaries: 0, shattered: 0, tilesAdded: 0, kamiUsed: 0, omikujiUsed: 0, skips: 0, lastPlayWins: 0, noDiscardWins: 0, onePlayWins: 0, bigYakuHands: 0, maxTals: 0, talsBought: 0, losses: 0 }; }
let PROFILE = (() => { try { return Object.assign(blankProfile(), JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')); } catch (e) { return blankProfile(); } })();
function saveProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(PROFILE)); } catch (e) { } }
const bump = (obj, k, n = 1) => { obj[k] = (obj[k] || 0) + n; };

// ===================== UNLOCKS =====================
// Everything not listed here is open from the first run. Each row is one lock: what it locks, the goal, and progress
// read from the lifetime profile as [have, need]. Change a goal by editing its row.
const yakuN = (P, ...ks) => ks.reduce((n, k) => n + (P.yaku[k] || 0), 0);
const UNLOCKS = [
  { kind: 'wall', key: 'lean', goal: 'Reach Ante 4', prog: P => [P.bestAnte, 4] },
  { kind: 'wall', key: 'monk', goal: () => `Beat ${BOSSES.monk.name}`, prog: P => [P.bosses.monk || 0, 1] },
  { kind: 'wall', key: 'merchant', goal: 'Hold ¥40 at once', prog: P => [P.mostMoney, 40] },
  { kind: 'wall', key: 'abundant', goal: 'Win a run', prog: P => [P.wins, 1] },
  { kind: 'tal', key: 'nue', goal: 'Score Honitsu or Chinitsu', prog: P => [yakuN(P, 'honitsu', 'chinitsu'), 1] },
  { kind: 'tal', key: 'hashi', goal: 'Score Ittsu', prog: P => [yakuN(P, 'ittsu'), 1] },
  { kind: 'tal', key: 'ryu', goal: 'Score Yakuhai 10 times', prog: P => [yakuN(P, 'yakuhai'), 10] },
  { kind: 'tal', key: 'takibi', goal: 'Sell 10 Talismans', prog: P => [P.sold, 10] },
  { kind: 'tal', key: 'hoshizora', goal: 'Use 15 Scrolls of Mastery', prog: P => [P.scrollsUsed, 15] },
  { kind: 'tal', key: 'ryujin', goal: 'Make 25 Calls', prog: P => [P.calls, 25] },
  { kind: 'tal', key: 'rokurokubi', goal: 'Score a Complete Hand with 3 open melds', prog: P => [P.openHands3, 1] },
  { kind: 'tal', key: 'kawauso', goal: 'Score 3 Complete Hands in Furiten', prog: P => [P.furitenHands, 3] },
  { kind: 'tal', key: 'gashadokuro', goal: 'Play 25 Complete Hands', prog: P => [P.hands, 25] },
  { kind: 'tal', key: 'kirin', goal: 'Beat 5 different Bosses', prog: P => [Object.keys(P.bosses).length, 5] },
  { kind: 'tal', key: 'hannya', goal: 'Reach Ante 6', prog: P => [P.bestAnte, 6] },
  { kind: 'tal', key: 'utsushi', goal: 'Win a run', prog: P => [P.wins, 1] },
  { kind: 'wall', key: 'plasma', goal: 'Win a run on Green Stake or higher', prog: P => [STAKE_KEYS.slice(2).reduce((n, k) => n + (P.stakesWon[k] || 0), 0), 1] },
  { kind: 'wall', key: 'erratic', goal: 'Play 100 Complete Hands', prog: P => [P.hands, 100] },
  { kind: 'wall', key: 'ghost', goal: 'Use 10 Kami Spirits', prog: P => [P.kamiUsed || 0, 10] },
  { kind: 'wall', key: 'magic', goal: 'Use 30 Omikuji', prog: P => [P.omikujiUsed || 0, 30] },
  { kind: 'wall', key: 'anaglyph', goal: 'Skip 10 Blinds', prog: P => [P.skips || 0, 10] },
  { kind: 'wall', key: 'painted', goal: 'Win with 3 different Walls', prog: P => [Object.keys(P.wallsWon).length, 3] },
  { kind: 'tal', key: 'shojo', goal: 'Play 50 Complete Hands', prog: P => [P.hands, 50] },
  { kind: 'tal', key: 'omagatoki', goal: 'Win 5 Blinds on your last Play', prog: P => [P.lastPlayWins || 0, 5] },
  { kind: 'tal', key: 'kotodama', goal: 'Use 25 Scrolls of Mastery', prog: P => [P.scrollsUsed, 25] },
  { kind: 'tal', key: 'itako', goal: 'Score a Complete Hand with 4 or more Yaku', prog: P => [P.bigYakuHands || 0, 1] },
  { kind: 'tal', key: 'kamikiri', goal: 'Sell 20 Talismans', prog: P => [P.sold, 20] },
  { kind: 'tal', key: 'binbogami', goal: 'Win 10 Blinds without using a Discard', prog: P => [P.noDiscardWins || 0, 10] },
  { kind: 'tal', key: 'kamaitachi', goal: 'Win 5 Blinds with your first Play', prog: P => [P.onePlayWins || 0, 5] },
  { kind: 'tal', key: 'kabuki', goal: 'Hold 5 Talismans at once', prog: P => [P.maxTals || 0, 5] },
  { kind: 'tal', key: 'kakuremino', goal: 'Beat 10 different Bosses', prog: P => [Object.keys(P.bosses).length, 10] },
  { kind: 'tal', key: 'daikoku', goal: 'Shatter 5 Glass tiles', prog: P => [P.shattered || 0, 5] },
  { kind: 'tal', key: 'hyakki', goal: 'Buy 30 Talismans', prog: P => [P.talsBought || 0, 30] },
  { kind: 'tal', key: 'yurei', goal: 'Lose 5 runs', prog: P => [P.losses || 0, 5] },
  { kind: 'tal', key: 'kagami', goal: 'Win a run on Red Stake or higher', prog: P => [STAKE_KEYS.slice(1).reduce((n, k) => n + (P.stakesWon[k] || 0), 0), 1] },
];
const LOCKS = {}; UNLOCKS.forEach(u => LOCKS[`${u.kind}:${u.key}`] = u);
// ===================== ACHIEVEMENTS =====================
// Long-term goals across runs, checked with the unlocks. Each row: name, goal, and progress from the profile as [have, need].
const YAKUMAN_KEYS = ['kokushi', 'daisangen', 'tsuuiisou', 'suuankou', 'shousuushii', 'daisuushii', 'chinroutou', 'ryuuiisou', 'chuuren', 'suukantsu'];
const ACHIEVEMENTS = [
  { key: 'firstwin', name: 'First Win', goal: 'Win a run', prog: P => [P.wins, 1] },
  { key: 'endless', name: 'Beyond the Wall', goal: 'Reach Ante 12', prog: P => [P.bestAnte, 12] },
  { key: 'big', name: 'High Roller', goal: 'Score 100,000 in one Play', prog: P => [P.bestPlay, 100000] },
  { key: 'huge', name: 'Astronomical', goal: 'Score 10,000,000 in one Play', prog: P => [P.bestPlay, 10000000] },
  { key: 'limit', name: 'Limit Hand', goal: 'Score any Yakuman', prog: P => [yakuN(P, ...YAKUMAN_KEYS), 1] },
  { key: 'orphans', name: 'Thirteen Orphans', goal: 'Score Kokushi Musou', prog: P => [yakuN(P, 'kokushi'), 1] },
  { key: 'pairs', name: 'Seven Pairs, Ten Times', goal: 'Score Chiitoitsu 10 times', prog: P => [yakuN(P, 'chiitoitsu'), 10] },
  { key: 'rinshan', name: 'Flower on the Kong', goal: 'Score Rinshan Kaihou', prog: P => [yakuN(P, 'rinshan'), 1] },
  { key: 'furiten', name: 'Against the Odds', goal: 'Score 10 Complete Hands in Furiten', prog: P => [P.furitenHands, 10] },
  { key: 'rich', name: 'Deep Pockets', goal: 'Hold ¥100 at once', prog: P => [P.mostMoney, 100] },
  { key: 'showdown', name: 'Showdown', goal: 'Beat a Showdown Boss', prog: P => [Object.keys(P.bosses).filter(k => BOSSES[k] && BOSSES[k].showdown).length, 1] },
  { key: 'hunter', name: 'Boss Hunter', goal: 'Beat 15 different Bosses', prog: P => [Object.keys(P.bosses).length, 15] },
  { key: 'legend', name: 'Legendary', goal: 'Get a Legendary Talisman', prog: P => [P.legendaries || 0, 1] },
  { key: 'glass', name: 'Glass Cannon', goal: 'Shatter 10 Glass tiles', prog: P => [P.shattered || 0, 10] },
  { key: 'architect', name: 'Architect', goal: 'Add 25 tiles to your Wall from Tile Packs', prog: P => [P.tilesAdded || 0, 25] },
  { key: 'collector', name: 'Collector', goal: 'Discover 100 cards for the Collection', prog: P => [Object.keys(P.seen).length, 100] },
  { key: 'challenger', name: 'Challenger', goal: 'Complete a Challenge', prog: P => [Object.keys(P.challengesWon || {}).length, 1] },
  { key: 'allchal', name: 'Master of Trials', goal: 'Complete every Challenge', prog: P => [Object.keys(P.challengesWon || {}).length, CHALLENGES.length] },
  { key: 'everywall', name: 'Every Wall', goal: 'Win with every Wall', prog: P => [Object.keys(P.wallsWon).length, Object.keys(DECKS).length] },
  { key: 'goldstake', name: 'Gold Standard', goal: 'Win on Gold Stake', prog: P => [P.stakesWon.gold || 0, 1] },
];
const UNLOCK_ALL_KEY = 'yakuman.unlockall';
let UNLOCK_ALL = (() => { try { return localStorage.getItem(UNLOCK_ALL_KEY) === 'on'; } catch (e) { return false; } })();
function lockOf(kind, key) { const u = LOCKS[`${kind}:${key}`]; return u && !UNLOCK_ALL && !PROFILE.unlocked.includes(`${kind}:${key}`) ? u : null; }
const isUnlocked = (kind, key) => !lockOf(kind, key);
// Each Wall climbs the Stakes on its own, like Balatro's decks: winning on a Stake with a Wall opens the next Stake for that Wall.
const wallBest = w => { const v = PROFILE.wallStakes[w]; return typeof v === 'number' ? v : -1; };
function stakeLock(wall, stake) {
  const lv = stakeLevel(stake); if (lv <= 0 || UNLOCK_ALL || wallBest(wall) >= lv - 1) return null;
  return { kind: 'stake', key: stake, goal: `Win on ${STAKES[STAKE_KEYS[lv - 1]].name} with the ${DECKS[wall].name}`, prog: () => [0, 1] };
}
function stakeLockAny(stake) {
  if (Object.keys(DECKS).some(w => !stakeLock(w, stake))) return null;
  return { kind: 'stake', key: stake, goal: `Win on ${STAKES[STAKE_KEYS[stakeLevel(stake) - 1]].name} with any Wall. Each Wall climbs the Stakes on its own.`, prog: () => [0, 1] };
}
// Names an entry in S.newUnlocks: 'tal:hannya' style, or 'stake:green:lean' for a Stake opened on one Wall
// (older saves stored 'stake:red' without a Wall).
function unlockLabel(id) { const [kind, key, wall] = id.split(':'); if (kind === 'stake') return STAKES[key] ? { kind: 'Stake', name: DECKS[wall] ? `${STAKES[key].name} · ${DECKS[wall].name}` : STAKES[key].name } : null; const u = LOCKS[id]; return u ? { kind: UNLOCK_KIND[u.kind], name: unlockName(u) } : null; }
// ===================== DISCOVERY =====================
// Like Balatro's Collection: Talismans, consumables, Scrolls, Flowers, packs, Tags and Bosses show as "?" until you come across one.
const DISCOVER = ['tal', 'omikuji', 'kami', 'scroll', 'flower', 'pack', 'tag', 'boss'];
function isSeen(kind, key) { return UNLOCK_ALL || !!PROFILE.seen[`${kind}:${key}`] || (kind === 'boss' && !!PROFILE.bosses[key]); }
function markSeen() {
  if (!S || !S.talismans || S.placeholder) return false; let dirty = false;
  const add = (kind, key) => { if (key && !PROFILE.seen[`${kind}:${key}`]) { PROFILE.seen[`${kind}:${key}`] = 1; dirty = true; } };
  const item = it => { if (it) add(it.kind === 'talisman' ? 'tal' : it.kind, it.key); };
  S.talismans.forEach(k => add('tal', baseKey(k))); (S.consumables || []).forEach(c => CONS[c.key] && add(CONS[c.key].kind, c.key)); (S.flowers || []).forEach(k => add('flower', k));
  for (const [t, lv] of Object.entries(S.scrolls || {})) for (const k of Object.keys(lv || {})) add('scroll', `${t === 'meld' ? 'm' : 'y'}:${k}`);
  if (S.phase === 'shop' && S.shop) { S.shop.cards.forEach(item); item(S.shop.flower); (S.shop.packs || []).forEach(item); (S.shop.freePacks || []).forEach(k => add('pack', k)); }
  if (S.pack) { add('pack', S.pack.key); (S.pack.choices || []).forEach(item); }
  (S.tags || []).forEach(k => add('tag', k));
  if (S.phase === 'select' && S.skipTags) { add('tag', S.skipTags.small); add('tag', S.skipTags.big); }
  if (S.phase === 'select') add('boss', S.bossOrder[S.ante - 1]); if (S.phase === 'blind') add('boss', S.boss);
  return dirty;
}
function goalText(u) { return typeof u.goal === 'function' ? u.goal() : u.goal; }
function unlockProg(u) { const [have, need] = u.prog(PROFILE); return { have: Math.min(have || 0, need), need }; }
function unlockName(u) { return u.kind === 'wall' ? DECKS[u.key].name : u.kind === 'stake' ? STAKES[u.key].name : TAL[u.key].name; }
const UNLOCK_KIND = { wall: 'Wall', stake: 'Stake', tal: 'Talisman' };
// The goal plus a progress bar, for locked cards in the Collection, New Run and Profile.
function lockHTML(u) { const p = unlockProg(u); return `<div class="lockgoal"><span class="lockico" aria-hidden="true"></span><span>${goalText(u)}</span></div>${p.need > 1 ? `<div class="lockbar"><i style="width:${100 * p.have / p.need}%"></i></div><div class="lockcount num muted">${p.have} / ${p.need}</div>` : ''}`; }
// Earned unlocks are stored, so they stay earned even if a stat later drops (for example after an import).
function checkUnlocks() {
  let dirty = false;
  if (S && S.money > (PROFILE.mostMoney || 0)) { PROFILE.mostMoney = S.money; dirty = true; }
  if (S && S.talismans && !S.placeholder && S.talismans.length > (PROFILE.maxTals || 0)) { PROFILE.maxTals = S.talismans.length; dirty = true; }
  if (markSeen()) dirty = true;
  const fresh = [];
  for (const u of UNLOCKS) { const id = `${u.kind}:${u.key}`; if (PROFILE.unlocked.includes(id)) continue; const p = unlockProg(u); if (p.have >= p.need) { PROFILE.unlocked.push(id); fresh.push(u); } }
  PROFILE.achieved = PROFILE.achieved || [];
  const ach = ACHIEVEMENTS.filter(a => { if (PROFILE.achieved.includes(a.key)) return false; const [have, need] = a.prog(PROFILE); return (have || 0) >= need; });
  if (ach.length) { PROFILE.achieved.push(...ach.map(a => a.key)); dirty = true; ach.forEach((a, i) => setTimeout(() => toast(`<div class="label">Achievement</div><b>${a.name}</b><div class="muted" style="font-size:11px">${a.goal}</div>`), 500 + i * 350)); }
  if (fresh.length || dirty) saveProfile();
  if (fresh.length && S) S.newUnlocks = (S.newUnlocks || []).concat(fresh.map(u => `${u.kind}:${u.key}`));
  fresh.forEach((u, i) => setTimeout(() => toast(`<div class="label">Unlocked · ${UNLOCK_KIND[u.kind]}</div><b>${unlockName(u)}</b>`), i * 350));
  return fresh;
}
// Small non-blocking notices in the corner.
function toast(html) {
  let box = document.getElementById('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; translateDOM(el); box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4700);
}
const unlockedCount = () => UNLOCKS.filter(u => PROFILE.unlocked.includes(`${u.kind}:${u.key}`)).length;
const talPool = () => chal('noTalismans') ? [] : TALISMANS.filter(t => (hasTal(S, 'kabuki') || !S.talismans.some(k => baseKey(k) === t.key)) && isUnlocked('tal', t.key) && (talRarity(t.key) !== 'legendary' || S.dbgRarity === 'legendary'));
// Rarity label for a Talisman card, coloured like Balatro's (blue Common, green Uncommon, red Rare, purple Legendary).
const rarityTag = k => { const r = talRarity(k); return `<span class="rar rar-${r}">${RARITIES[r]}</span>`; };
// Hō-ō grows each time tiles are destroyed (Slip of Dust, Raijin, Susanoo, Tsukuyomi, shattered Glass).
function tilesDestroyed(n) { if (n > 0 && hasTal(S, 'hoo')) S.talState.hoo = (S.talState.hoo || 0) + n; }

// ===================== BLIND FLOW =====================
// The Crimson Oni silences one random Talisman, never the same one twice in a row.
function rollCrimson() { const pool = S.talismans.filter(k => k !== S.crimsonOff); S.crimsonOff = pool.length ? pick(pool) : S.talismans.length ? S.talismans[0] : null; }
function startBlind() {
  S.phase = 'blind';
  const kind = blindKind();
  S.boss = kind === 'boss' ? S.bossOrder[S.ante - 1] : chal('cruelty') ? rollBoss(S.ante % CFG.antes === 0 ? S.ante - 1 : S.ante, [S.bossOrder[S.ante - 1]]) : null; if (S.boss && !S.stats.bosses.includes(S.boss)) S.stats.bosses.push(S.boss);
  ensureBosses(); S.target = blindTarget(kind);
  S.plays = blindPlays();
  S.discards = blindDiscards();
  S.wall = shuffle(S.deck.slice()); S.deck = []; S.hand = []; S.river = []; S.open = []; S.played = [];
  S.selected = []; S.selRiver = null; S.dora = []; S.indicators = []; S.pendingDiscard = 0; S.revealed = false; S.score = 0; S.lastPlay = null; S.reward = null; S.selTal = null;
  S.discardsUsed = 0; S.playsMade = 0; S.usedTypes = []; S.mouthType = null; S.leafCut = false; S.crimsonOff = null;
  // Tamamo-no-Mae disables the Boss: it is still the Boss Blind (same target and reward), with no effect.
  S.bossOff = null; if (S.boss && hasTal(S, 'tamamo')) { S.bossOff = S.boss; S.boss = null; }
  S.firstPlayDone = false; S.freeCallsUsed = 0; S.bossSuit = S.boss === 'collector' ? pick(['m', 'p', 's']) : null;
  S.blindMods = S.nextBlindMods || {}; S.nextBlindMods = null;
  if (S.boss === 'needle') S.plays = 1;
  if (S.boss === 'drought') S.discards = 0;
  if (S.boss === 'crimson') rollCrimson();
  draw(); if (S.boss === 'house') for (const t of S.hand) t.down = true;
  for (const k of liveTals(S).slice()) if (S.talismans.includes(k) && TAL[k].onBlindStart) TAL[k].onBlindStart(S);   // a copy: Kamikiri and Hyakki change the list
  setMsg(S.bossOff ? `Tamamo-no-Mae disables ${BOSSES[S.bossOff].name}.` : S.boss ? `${BOSSES[S.boss].name}: ${BOSSES[S.boss].desc}` : `${kind === 'small' ? 'Small' : 'Big'} Blind. Score ${S.target} to win.`);
}
function draw() { S.newIds = []; while (S.hand.length < capacity() && S.wall.length) { const t = S.wall.pop(); t.d = ++S.drawSeq; if (S.boss === 'wheel' && rand() < chance(S, 1 / 7)) t.down = true; S.hand.push(t); S.newIds.push(t.id); } }
function drawReplacement() { if (!S.wall.length) return null; const t = S.wall.pop(); t.d = ++S.drawSeq; t.rinshan = true; S.hand.push(t); S.newIds.push(t.id); return t; }
function collectDeck() {
  S.deck = [...S.hand, ...S.wall, ...S.river, ...openTiles(), ...S.played, ...S.indicators];
  for (const t of S.deck) { delete t.rinshan; delete t.down; }
  S.hand = []; S.wall = []; S.river = []; S.open = []; S.played = []; S.indicators = []; S.dora = []; S.selected = []; S.selRiver = null;
}
function winBlind() {
  S.crimsonOff = null;   // the Boss is beaten: a Talisman The Crimson Oni silenced works again, and still pays at cash-out
  const kind = blindKind();
  const base = (kind === 'small' && smallPaysNothing()) || chal('noBlindPay') ? 0 : CFG.blindReward[kind], left = chal('noBlindPay') ? 0 : S.plays, interest = chal('noInterest') ? 0 : Math.min(interestCap(), Math.floor(S.money / CFG.interestPer));
  // Each paying Talisman gets its own cash-out row, like Jokers in Balatro.
  const talPay = []; for (const k of liveTals(S)) if (TAL[k].onBlindEnd) { const v = TAL[k].onBlindEnd(S) || 0; if (v) talPay.push([k, v]); }
  const tal = talPay.reduce((a, [, v]) => a + v, 0);
  const summer = (hasF('summer') ? 2 : 0) + (hasF('summer2') ? 2 : 0);
  if (kind === 'boss' && S.deckKey === 'anaglyph') S.tags.push('double');
  let invest = 0; if (kind === 'boss' && S.tags.includes('investment')) { invest = 25; S.tags = S.tags.filter(t => t !== 'investment'); }
  // Gold Stake Rentals charge ¥3 each; Perishables count down one Blind.
  const rent = S.talismans.filter(k => S.stickers && S.stickers[k] && S.stickers[k].rental).map(k => [k, 3]);
  for (const [k, st] of Object.entries(S.stickers || {})) if (st.perish > 0) { st.perish--; if (!st.perish) setTimeout(() => toast(`<div class="label">Perished</div><b>${TAL[k].name}</b><div class="muted" style="font-size:11px">stops working from now on</div>`), 600); }
  const total = base + left + interest + tal + summer + invest - rent.reduce((a, [, v]) => a + v, 0);
  const before = S.money; S.money = Math.max(0, S.money + total);
  S.stats.discardsLeft = (S.stats.discardsLeft || 0) + Math.max(0, S.discards); S.stats.blinds++; S.msg = ''; S.msgErr = false;
  S.reward = { kind, base, left, interest, tal, talPay, summer, invest, rent, total, before, wallLeft: S.wall.length };
  const blue = blueSeals(); if (blue) setTimeout(() => toast(`<div class="label">Blue Seal${blue.n > 1 ? ' ×' + blue.n : ''}</div><b>${SCR[blue.key].name}</b><div class="muted" style="font-size:11px">levelled up by ${blue.n}</div>`), 300);
  collectDeck();
  const finished = S.ante === CFG.antes && S.blindIndex === 2 && !S.endless;
  S.blindIndex++; if (S.blindIndex > 2) { S.blindIndex = 0; S.ante++; S.antePlayed = []; rollAnteTags(); ensureBosses(); if (!finished) PROFILE.bestAnte = Math.max(PROFILE.bestAnte, S.ante); }
  if (S.plays === 0) bump(PROFILE, 'lastPlayWins'); if (!S.discardsUsed) bump(PROFILE, 'noDiscardWins'); if (S.playsMade === 1) bump(PROFILE, 'onePlayWins');
  PROFILE.blinds++; if (kind === 'boss' && (S.boss || S.bossOff)) bump(PROFILE.bosses, S.boss || S.bossOff);
  if (finished && S.challenge) { PROFILE.challengesWon = PROFILE.challengesWon || {}; bump(PROFILE.challengesWon, S.challenge); setTimeout(() => toast(`<div class="label">Challenge complete</div><b>${CHAL[S.challenge].name}</b>`), 200); }
  if (finished && !S.challenge) { PROFILE.wins++; bump(PROFILE.stakesWon, S.stake); bump(PROFILE.wallsWon, S.deckKey); PROFILE.bestAnte = Math.max(PROFILE.bestAnte, CFG.antes);
    const lv = stakeLevel(S.stake), next = STAKE_KEYS[lv + 1];
    if (lv > wallBest(S.deckKey)) { PROFILE.wallStakes[S.deckKey] = lv;
      if (next) { S.newUnlocks = (S.newUnlocks || []).concat([`stake:${next}:${S.deckKey}`]); setTimeout(() => toast(`<div class="label">Unlocked · Stake</div><b>${STAKES[next].name}</b><div class="muted" style="font-size:11px">for the ${DECKS[S.deckKey].name}</div>`), 200); } } }
  saveProfile();
  if (finished) { S.phase = 'win'; return; }
  genShop(); S.phase = 'cashout';
}
function loseRun() { S.phase = 'gameover'; PROFILE.losses = (PROFILE.losses || 0) + 1; PROFILE.bestAnte = Math.max(PROFILE.bestAnte, S.ante); saveProfile(); }
function rollAnteTags() { S.skipTags = { small: pick(Object.keys(TAGS)), big: pick(Object.keys(TAGS)) }; }
function blindTarget(kind) { return Math.floor(anteBase(S.ante) * CFG.blindMult[kind] * stakeTargets() * wallTargets() * (chal('target') || 1) * (kind === 'boss' ? bossTarget(S.bossOrder[S.ante - 1]) : 1)); }
function newRun(opts) { S = newState(opts || {}); S.stats.seen0 = Object.keys(PROFILE.seen || {}).length; if (S.challenge && CHAL[S.challenge].setup) CHAL[S.challenge].setup(S);
  if (S.deckKey === 'ghost') S.consumables.push({ kind: 'kami', key: 'izanami' });
  if (S.deckKey === 'magic') { S.flowers.push('spring'); S.consumables.push({ kind: 'omikuji', key: 'echo' }, { kind: 'omikuji', key: 'echo' }); } PROFILE.runs++; saveProfile(); rollAnteTags(); S.phase = 'select'; render(); }

// ===================== ACTIONS =====================
function setMsg(m, err) { S.msg = m; S.msgErr = !!err; }
// Boss rules about what you may play: The Ascetic (5+ tiles), The Eye (no repeats) and The Mouth (one type only).
function bossPlayCheck(o) {
  const type = o.type === 'hand' ? 'hand' : o.meldType || rungInfo(o.part).key, name = rungLabel(type);
  if (S.boss === 'ascetic' && o.type !== 'hand' && selTiles().length < 5) return { err: 'The Ascetic: every Play must use at least 5 tiles.' };
  if (S.boss === 'eye' && (S.usedTypes || []).includes(type)) return { err: `The Eye: you already played ${name} this Blind.` };
  if (S.boss === 'mouth' && S.mouthType && S.mouthType !== type) return { err: `The Mouth: only ${rungLabel(S.mouthType)} can be played this Blind.` };
  return o;
}
function playOption() { const o = playOptionBase(); return o.err ? o : bossPlayCheck(o); }
// Wild tiles: every suit assignment is tried and the best one is used (the copies carry the chosen suits for scoring).
function bestWild(tiles) { let out = null; for (const v of wildVariants(tiles)) { const b = bestHand(v, S.open, S); if (b && (!out || b.yaku.han > out.best.yaku.han)) out = { best: b, tiles: v }; } return out; }
function partWild(tiles) { let out = null, top = -1; for (const v of wildVariants(tiles)) { const p = partitionPlay(v); if (!p) continue; const r = rungInfo(p), val = r.chips + 20 * r.han; if (val > top) { top = val; out = { part: p, tiles: v }; } } return out; }
function playOptionBase() {
  if (S.pendingDiscard) return { err: `Settle your Call first: discard ${S.pendingDiscard} tile.` };
  if (S.plays <= 0) return { err: 'No Plays left.' };
  const all = selTiles(); if (!all.length) return { err: 'Select tiles to play.' };
  // Stone tiles never form melds: they join any play and score their Chips.
  const stones = all.filter(isStone), sel = all.filter(t => !isStone(t));
  if (!sel.length) return { type: 'meld', part: { single: true, melds: [], pairs: [] }, meldType: 'single', label: 'Play Stone tiles', tiles: stones };
  const need = neededConcealed();
  const rt = claimTile();
  if (!rt && S.selRiver && S.boss === 'fisherman' && S.talismans.some(k => TAL[k].riverClaim) && sel.length === need - 1) return { err: 'The Fisherman forbids claiming tiles from the River.' };
  if (rt && sel.length === need - 1) {
    const w = bestWild(sel.concat([rt]));
    if (w) return { type: 'hand', best: w.best, tiles: w.tiles.concat(stones), claim: rt.id, label: 'Claim and Play Complete Hand: ' + (w.best.yaku.list.length ? w.best.yaku.list.map(y => y.name).join(', ') : 'no Yaku') };
    return { err: `With ${tileName(rt)} from the River these ${need - 1} tiles are not a complete hand.` };
  }
  if (sel.length === need) {
    const w = bestWild(sel);
    if (w) return { type: 'hand', best: w.best, tiles: w.tiles.concat(stones), label: 'Play Complete Hand: ' + (w.best.yaku.list.length ? w.best.yaku.list.map(y => y.name).join(', ') : 'no Yaku') };
    return { err: `${need} tiles selected, but they are not a complete hand (${4 - S.open.length} melds + pair).` };
  }
  const pw = partWild(sel);
  if (pw) { const r = rungInfo(pw.part); return { type: 'meld', part: pw.part, tiles: pw.tiles.concat(stones), meldType: r.key, label: `Play ${r.name}` }; }
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
    if (fb) { leftovers = all.filter(t => !fb.tiles.includes(t)); S.selected = fb.tiles.map(t => t.id); opt = bossPlayCheck({ type: 'meld', part: fb.part, fallback: true }); }
  }
  if (opt.err) { setMsg(opt.err, true); return render(); }
  sfx('play');
  const sel = S.hand.filter(t => S.selected.includes(t.id)); let ctx;
  // A claimed tile leaves the River before scoring, so River Talismans do not count it.
  const claimed = opt.claim ? S.river.find(t => t.id === opt.claim) : null;
  if (claimed) { S.river = S.river.filter(t => t !== claimed); sel.push(claimed); S.stats.claims = (S.stats.claims || 0) + 1; }
  // opt.tiles: the selection with Wild suits chosen and Stone tiles included (the real tiles otherwise).
  if (opt.type === 'hand') { ctx = scoreCtx(S, 'hand', (opt.tiles || sel).concat(openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec, claim: opt.claim }); S.stats.hands++; }
  else { ctx = scoreCtx(S, 'meld', opt.tiles || sel, { part: opt.part }); S.stats.melds++; }
  S.busy = true; setMsg(''); render();
  await animateScore(ctx);
  S.busy = false;
  for (const k of liveTals(S).slice()) if (TAL[k].afterScore) TAL[k].afterScore(ctx, S);
  if (S.spent && S.spent.length) { S.spent.forEach(k => toast(`<div class="label">Used up</div><b>${TAL[k].name}</b><div class="muted" style="font-size:11px">left your board after its last play</div>`)); S.spent = []; }
  S.plays--; S.playsMade = (S.playsMade || 0) + 1; S.stats.playsTotal = (S.stats.playsTotal || 0) + 1; tilesDestroyed(ctx.shatter.length); if (ctx.shatter.length) PROFILE.shattered = (PROFILE.shattered || 0) + ctx.shatter.length; S.score += ctx.total; S.money += ctx.money; S.lastPlay = ctx;
  if (S.boss === 'toll') S.money = Math.max(0, S.money - sel.length);
  if (S.boss === 'ox' && ctx.meldType === mostPlayedRung()) { S.money = 0; toast('<div class="label">The Ox</div><b>Your money is now ¥0</b><div class="muted" style="font-size:11px">you played your most-played play type</div>'); }
  S.usedTypes = (S.usedTypes || []).concat(ctx.meldType); if (!S.mouthType) S.mouthType = ctx.meldType; S.firstPlayDone = true;
  S.stats.rungs[ctx.meldType] = (S.stats.rungs[ctx.meldType] || 0) + 1; for (const yk of ctx.yaku) S.stats.yaku[yk.key] = (S.stats.yaku[yk.key] || 0) + 1;
  if (ctx.total > S.stats.best) { S.stats.best = ctx.total; S.stats.bestDesc = ctx.desc; }
  if (ctx.kind === 'hand') { PROFILE.hands++; if (ctx.yaku.length >= 4) bump(PROFILE, 'bigYakuHands'); if (ctx.furiten) PROFILE.furitenHands++; if (S.open.length >= 3) PROFILE.openHands3++; } for (const yk of ctx.yaku) bump(PROFILE.yaku, yk.key); if (ctx.total > PROFILE.bestPlay) { PROFILE.bestPlay = ctx.total; PROFILE.bestPlayDesc = ctx.desc; } saveProfile();
  const keep = t => !ctx.shatter.includes(t.id);
  S.antePlayed = (S.antePlayed || []).concat(sel.map(t => t.id));
  S.stats.tilesPlayed = (S.stats.tilesPlayed || 0) + sel.length;
  S.played.push(...sel.filter(keep)); S.hand = S.hand.filter(t => !sel.includes(t));
  if (opt.type === 'hand') { S.played.push(...openTiles().filter(keep)); S.open = []; }
  if (leftovers.length) { S.hand = S.hand.filter(t => !leftovers.includes(t)); S.river.push(...leftovers); }
  S.selected = []; S.selRiver = null;

  setMsg(`${leftovers.length ? `Not a valid play, so the best part scored and ${leftovers.map(tileName).join(', ')} went to the River. ` : ''}${ctx.desc}: ${ctx.chips} × ${fmtMult(ctx.mult)} = ${ctx.total}${ctx.furiten ? ' (Furiten!)' : ''}${ctx.shatter.length ? ` · ${ctx.shatter.length} Glass tile${ctx.shatter.length > 1 ? 's' : ''} shattered` : ''}`);
  if (S.score >= S.target) { winBlind(); return render(); }
  if (S.boss === 'pickpocket' && S.hand.length) { const lost = shuffle(S.hand.slice()).slice(0, 2); S.hand = S.hand.filter(t => !lost.includes(t)); S.river.push(...lost); setMsg(`${S.msg} The Pickpocket took ${lost.map(tileName).join(' and ')} to the River.`); }
  if (S.boss === 'crimson') rollCrimson();
  draw();
  if (S.plays <= 0 && hasTal(S, 'yurei') && S.score >= S.target * 0.25) { fadeAway(S, 'yurei'); toast('<div class="label">Yūrei</div><b>You survive</b><div class="muted" style="font-size:11px">the Blind counts as won, and Yūrei vanishes</div>'); winBlind(); return render(); }
  if (S.plays <= 0) { loseRun(); return render(); }
  render();
}
// One clack per discarded tile, timed with their flight into the River.
function sfxDiscard(n) { for (let k = 0; k < Math.min(n, 5); k++) setTimeout(() => sfx('discard'), 180 + k * 30); }
function doDiscard() {
  if (S.phase !== 'blind' || S.busy) return;
  const sel = selTiles();
  if (S.pendingDiscard) {
    if (sel.length !== S.pendingDiscard) { setMsg(`Discard exactly ${S.pendingDiscard} tile to settle the Call.`, true); return render(); }
    S.river.push(...sel); S.hand = S.hand.filter(t => !sel.includes(t)); S.pendingDiscard = 0; S.selected = []; draw(); sfxDiscard(sel.length); setMsg('Call settled.'); return render();
  }
  if (S.discards <= 0) { setMsg('No Discards left.', true); return render(); }
  if (!sel.length) { setMsg('Select 1–' + CFG.maxDiscardTiles + ' tiles to discard.', true); return render(); }
  const maxD = S.boss === 'monk' ? 3 : CFG.maxDiscardTiles;
  if (sel.length > maxD) { setMsg(`You can discard at most ${maxD} tiles at once${S.boss === 'monk' ? ' against The Monk' : ''}.`, true); return render(); }
  if (S.boss === 'loanshark') {
    if (S.money < 1) { setMsg('The Loan Shark has locked your discards: ¥0 left.', true); return render(); }
    S.money -= 1;
  }
  S.discards--; S.discardsUsed = (S.discardsUsed || 0) + 1; S.stats.discards++; S.stats.tilesDiscarded = (S.stats.tilesDiscarded || 0) + sel.length; S.river.push(...sel); S.hand = S.hand.filter(t => !sel.includes(t)); S.selected = []; draw(); sfxDiscard(sel.length);
  for (const k of liveTals(S)) if (TAL[k].onDiscard) TAL[k].onDiscard(S, sel);
  const got = purpleSeals(sel);
  setMsg(`Discarded ${sel.length} tile${sel.length > 1 ? 's' : ''} to the River.${got.length ? ` Purple Seal: gained ${got.join(', ')}.` : ''}`); render();
}
// Purple Seals: each one discarded gives a random Omikuji while there is a free consumable slot.
function purpleSeals(tiles) {
  const got = [];
  for (const t of tiles) if (t.seal === 'purple' && S.consumables.length < conSlots()) { const o = pick(OMIKUJI); S.consumables.push({ kind: 'omikuji', key: o.key }); got.push(o.name); }
  return got;
}
// Blue Seals: each one still in hand when a Blind is won levels up the Scroll for the final play.
function blueSeals() {
  const n = S.hand.filter(t => t.seal === 'blue').length, lp = S.lastPlay; if (!n || !lp) return null;
  const k = lp.kind === 'hand' ? 'hand' : lp.nKan && lp.nKan >= lp.nPon && lp.nKan >= lp.nChi ? 'kan' : lp.nPon && lp.nPon >= lp.nChi ? 'pon' : lp.nChi ? 'chi' : 'pair';
  S.scrolls.meld[k] = (S.scrolls.meld[k] || 0) + n; for (const tk of liveTals(S)) if (TAL[tk].onScroll) TAL[tk].onScroll(S);
  return { key: 'm:' + k, n };
}
function doCall() {
  if (S.phase !== 'blind' || S.busy) return;
  if (S.pendingDiscard) { setMsg('Settle your previous Call first.', true); return render(); }
  if (S.boss === 'fisherman') { setMsg('The Fisherman: River tiles cannot be Called this Blind.', true); return render(); }
  // Ryūjin: a limited number of free Calls per Blind (the most any owned Talisman grants).
  const freeMax = liveTals(S).reduce((m, k) => Math.max(m, +TAL[k].freeCall || 0), 0), freeCall = (S.freeCallsUsed || 0) < freeMax;
  if (!freeCall && S.plays <= 1) { setMsg(S.plays <= 0 ? 'No Plays left.' : 'Calling would use your last Play and leave nothing to score with.', true); return render(); }
  const rt = S.river.find(t => t.id === S.selRiver); if (!rt) { setMsg('Select a tile in the River to call.', true); return render(); }
  const sel = selTiles(); if (sel.length < 2 || sel.length > 3) { setMsg('Select 2 or 3 hand tiles to meld with the River tile.', true); return render(); }
  if (sel.some(isStone)) { setMsg('Stone tiles cannot be part of a meld.', true); return render(); }
  if (S.open.length >= 4) { setMsg('You already have 4 open melds.', true); return render(); }
  const type = meldType([rt, ...sel]); if (!type) { setMsg('That River tile and your selection do not form a Chi, Pon or Kan.', true); return render(); }
  if (freeCall) S.freeCallsUsed = (S.freeCallsUsed || 0) + 1; else S.plays--; S.river = S.river.filter(t => t !== rt); S.hand = S.hand.filter(t => !sel.includes(t));
  S.open.push({ type, tiles: sortTiles([rt, ...sel]), calledId: rt.id }); S.selected = []; S.selRiver = null;
  for (const k of liveTals(S)) if (TAL[k].onCall) TAL[k].onCall(S); S.stats.calls++; PROFILE.calls++; saveProfile(); sfx('call'); if (type === 'kan') S.stats.kans++;
  const rep = type === 'kan' ? drawReplacement() : null;
  S.pendingDiscard = Math.max(0, S.hand.length - capacity());
  const note = `Called ${MELD_LABEL[type]} (open)${freeCall ? `, no Play spent (${freeMax - S.freeCallsUsed} free Call${freeMax - S.freeCallsUsed === 1 ? '' : 's'} left)` : ''}${rep ? `. Replacement tile drawn: ${tileName(rep)}` : ''}`;
  if (S.pendingDiscard) setMsg(`${note}. Now discard ${S.pendingDiscard} tile to settle the Call.`); else { draw(); setMsg(note + '.'); }
  render();
}
function declareOption() {
  if (S.phase !== 'blind' || S.busy) return { err: '' };
  if (S.pendingDiscard) return { err: 'Settle your Call first.' };
  const sel = selTiles(); if (sel.length !== 4 || sel.some(isStone) || !sel.every(t => key(t) === key(sel[0]))) return { err: 'Select 4 identical tiles to declare a closed Kan.' };
  if (S.open.length >= 4) return { err: 'You already have 4 melds on the table.' };
  return { ok: true, sel };
}
function doDeclareKan() {
  const o = declareOption(); if (!o.ok) { if (o.err) setMsg(o.err, true); return render(); }
  const sel = o.sel; S.hand = S.hand.filter(t => !sel.includes(t));
  S.open.push({ type: 'kan', tiles: sortTiles(sel), calledId: null, closed: true }); S.selected = []; S.stats.kans++; sfx('kan');
  const rep = drawReplacement(); draw();
  setMsg(`Declared a concealed Kan of ${isHonor(sel[0]) ? HONOR_EN[sel[0].rank] : sel[0].rank + ' ' + SUIT_EN[sel[0].suit]}. Hand stays closed.${rep ? ' Replacement tile drawn: ' + tileName(rep) + '.' : ''}`);
  render();
}
function useConsumable(i) {
  if (S.busy) return;
  const c = S.consumables[i]; const def = CONS[c.key];
  if (S.phase !== 'blind' && !def.anywhere) { setMsg('Use this during a Blind, with tiles in hand.', true); return render(); }
  if (S.phase !== 'blind') {
    const before = S.deck ? S.deck.length : 0; S.gotLegend = null;
    const after = useOnWallTiles(def, S.deck || [], []);
    if (!after) { setMsg(def.soul ? 'Hitodama needs a free Talisman slot.' : 'That cannot be used right now.', true); return render(); }
    if (c.key !== 'echo') S.lastCons = c.key; bump(PROFILE, def.kind === 'kami' ? 'kamiUsed' : 'omikujiUsed');
    S.consumables.splice(S.consumables.indexOf(c), 1);
    const lost = before - S.deck.length;
    setMsg(`${def.name} used.${c.key === 'fortune' ? (S.fortuneHit ? ` ${TAL[S.fortuneHit].name} is now ${EDITIONS[S.editions[S.fortuneHit]].name}!` : ' Nothing this time.') : ''}${S.gotLegend ? ` ${TAL[S.gotLegend].name} joins your Talismans.` : ''}${lost > 0 ? ` ${lost} tile${lost > 1 ? 's' : ''} left your Wall.` : ''}`); S.gotLegend = null; return render();
  }
  const sel = selTiles();
  if (sel.length < def.sel[0] || sel.length > def.sel[1]) { setMsg(def.sel[0] === def.sel[1] ? (def.sel[0] === 0 ? 'Clear your selection first.' : `Select exactly ${def.sel[0]} tile${def.sel[0] > 1 ? 's' : ''}.`) : `Select ${def.sel[0]}–${def.sel[1]} tiles.`, true); return render(); }
  const before = S.hand.length, ids0 = new Set(S.hand.map(t => t.id)); S.gotLegend = null;
  const r = def.use(S, sel); if (r === false) { setMsg(def.soul ? 'Hitodama needs a free Talisman slot.' : 'That cannot be used right now.', true); return render(); }
  tilesDestroyed([...ids0].filter(id => !S.hand.some(t => t.id === id)).length);
  for (const t of S.hand) if (t.d === undefined) t.d = ++S.drawSeq;
  if (S.hand.length > before) for (const k of liveTals(S)) if (TAL[k].onTileAdded) TAL[k].onTileAdded(S, S.hand.length - before);
  if (S.pendingDiscard) { S.pendingDiscard = Math.max(0, S.hand.length - capacity()); if (!S.pendingDiscard) { draw(); setMsg(`${def.name} used. Your Call is settled.`); render(); return; } }
  if (c.key !== 'echo') S.lastCons = c.key; bump(PROFILE, def.kind === 'kami' ? 'kamiUsed' : 'omikujiUsed');
  S.consumables.splice(S.consumables.indexOf(c), 1); S.selected = []; if (S.phase === 'blind') draw();
  const fortune = c.key === 'fortune' ? (S.fortuneHit ? ` ${TAL[S.fortuneHit].name} is now ${EDITIONS[S.editions[S.fortuneHit]].name}!` : ' Nothing this time.') : '';
  setMsg(`${def.name} used.${S.gotLegend ? ` ${TAL[S.gotLegend].name} joins your Talismans.` : ''}${fortune}`); S.gotLegend = null; render();
}
function talValue(k) { return TAL[k].cost + (S.editions[k] ? EDITIONS[S.editions[k]].price : 0); }
// Talismans that act when sold: Rikishi disables the Boss, Ramune gives a Double Tag, Kakuremino copies another Talisman.
function sellEffect(k) {
  const b = baseKey(k);
  if (b === 'rikishi' && S.phase === 'blind' && S.boss) { S.bossOff = S.boss; S.boss = null; S.crimsonOff = null; return ` Rikishi disables ${BOSSES[S.bossOff].name}.`; }
  if (b === 'ramune') { S.tags.push('double'); return ' Ramune gives you a Double Tag.'; }
  if (b === 'kakuremino' && (S.talState.kakuremino || 0) >= 2) { const others = S.talismans.filter(x => x !== k); if (!others.length) return ''; const src = pick(others); const ed = S.editions[src]; const copy = newAlias(S, baseKey(src)); S.talismans.push(copy); if (ed && ed !== 'neg') S.editions[copy] = ed; return ` Kakuremino copies ${TAL[src].name}.`; }
  return '';
}
function sellTalisman(k) { const i = S.talismans.indexOf(k); if (i < 0) return; if (isEternal(k)) { setMsg(`${TAL[k].name} is Eternal and can never be sold.`, true); return render(); } if (S.stickers) delete S.stickers[k]; if (S.phase === 'blind') S.leafCut = true; if (S.crimsonOff === k) S.crimsonOff = null; const v = talSellValue(k); const later = dissolveTal(k) === true; S.talismans.splice(i, 1); const eff = sellEffect(k); if (S.sellBonus) delete S.sellBonus[k]; S.money += v; sfx('sell'); delete S.editions[k]; S.selTal = null; for (const t of S.talismans) if (TAL[t].onSell) TAL[t].onSell(S); PROFILE.sold++; saveProfile(); setMsg(`Sold ${TAL[k].name} for ¥${v}.${eff}`); if (!later) render(); }
function sellConsumable(i) { const c = S.consumables[i]; if (!c) return; const v = conSellValue(c); const b = document.querySelector(`#modal [data-sellcon="${i}"]`), later = !!b && burnInList(b.closest('.shopcard')); if (!b) { holdRow('#consumables .slot.filled', '#consumables', i); dissolveEl([...document.querySelectorAll('#consumables .slot')][i]); } S.consumables.splice(i, 1); S.money += v; sfx('sell'); setMsg(`Sold ${CONS[c.key].name} for ¥${v}.`); if (!later) render(); }

// ===================== SHOP =====================
function rollCard() {
  const r = rand(), w = S.deckKey === 'ghost' ? { talisman: 0.55, omikuji: 0.13, scroll: 0.12, kami: 0.2 } : CFG.shopWeights;   // seeded, so a shared seed replays the same shop cards
  if (r < w.talisman) { const pool = talPool(); if (pool.length) { const key = pickTalisman(pool).key; return { kind: 'talisman', key, edition: rollEdition(editionMult()), sticker: rollSticker(key) }; } }
  if (r < w.talisman + w.omikuji) return { kind: 'omikuji', key: pick(OMIKUJI).key };
  if (r < w.talisman + w.omikuji + w.scroll || !w.kami) return { kind: 'scroll', key: pick(SCROLLS).key };
  return { kind: 'kami', key: pickKami().key };
}
function genShop() {
  // Like Balatro's Vouchers: one Flower is drawn per Ante and waits in every shop of that Ante until you buy it.
  if (!S.anteFlower || S.anteFlower.ante !== S.ante) { const pool = flowerPool(S.flowers).filter(f => S.ante > 1 || !f.key.startsWith('wisteria'));   // Wisteria cannot go back from Ante 1
    S.anteFlower = { ante: S.ante, key: pool.length ? pick(pool).key : null, sold: false }; }
  const fl = S.anteFlower.key && !S.anteFlower.sold && !S.flowers.includes(S.anteFlower.key) ? [FLW[S.anteFlower.key]] : [];   // once bought it stays on its shelf, marked Sold, for the rest of the Ante
  // Two Booster Packs per shop by Balatro's weights; the run's first shop always has a Talisman pack, like Balatro's Buffoon pack.
  const noTal = chal('noTalismans') ? 'talisman' : null, packs = [rollPack(noTal), rollPack(noTal)];
  if (!S.firstShopDone && !noTal) packs[0] = 'talisman'; S.firstShopDone = true;
  S.shop = { uid: Math.random().toString(36).slice(2, 8), cards: Array.from({ length: shopSlots() }, rollCard), firstFree: hasF('autumn2'), flower: fl.length ? { kind: 'flower', key: pick(fl).key } : S.anteFlower.sold && FLW[S.anteFlower.key] ? { kind: 'flower', key: S.anteFlower.key, sold: true } : null, packs: packs.map(k => ({ kind: 'pack', key: k })), coupon: false, freeReroll: false, freePacks: [] };
  // consume tags that act on this shop
  const take = t => { const i = S.tags.indexOf(t); if (i >= 0) { S.tags.splice(i, 1); return true; } return false; };
  if (take('coupon')) S.shop.coupon = true;
  if (take('reroll')) S.shop.freeReroll = true;
  for (const ed of ['foil', 'holo', 'poly', 'neg']) if (take(ed)) { const c = S.shop.cards.find(x => x.kind === 'talisman'), pool = talPool(); if (c) c.edition = ed; else if (pool.length) S.shop.cards[0] = { kind: 'talisman', key: pickTalisman(pool).key, edition: ed }; }
  for (const pk of ['omikuji', 'scroll', 'talisman', 'kami']) while (take(pk)) S.shop.freePacks.push(pk);
  while (take('tile')) S.shop.freePacks.push('megatile');
  // Rare and Uncommon Tags add a free Talisman of that rarity; D6 makes rerolls start at ¥0.
  for (const r of ['uncommon', 'rare']) while (take(r)) { const pool = talPool().filter(t => talRarity(t.key) === r); if (pool.length) { const key = pick(pool).key; S.shop.cards.unshift({ kind: 'talisman', key, edition: rollEdition(editionMult()), sticker: rollSticker(key), free: true }); } }
  if (take('d6')) { S.shop.d6 = true; S.shop.rerolls = 0; }
  while (take('voucher')) { const pool = flowerPool(S.flowers).filter(f => (!S.shop.flower || f.key !== S.shop.flower.key) && !S.shop.cards.some(c => c.key === f.key)); if (pool.length) S.shop.cards.push({ kind: 'flower', key: pick(pool).key }); }
}
function openPack(key, free) {
  const def = PACKS[key], type = def.type; let pool;
  if (type === 'omikuji') pool = OMIKUJI.map(o => ({ kind: 'omikuji', key: o.key }));
  else if (type === 'scroll') pool = SCROLLS.map(o => ({ kind: 'scroll', key: o.key }));
  else if (type === 'kami') pool = KAMI.filter(o => !o.soul).map(o => ({ kind: 'kami', key: o.key }));
  let choices;
  if (type === 'tile') choices = Array.from({ length: def.show }, () => ({ kind: 'tile', tile: packTile(S.deckKey) }));
  else if (type === 'talisman') { const left = talPool(); choices = []; while (choices.length < def.show && left.length) { const t = pickTalisman(left); left.splice(left.indexOf(t), 1); choices.push({ kind: 'talisman', key: t.key, edition: rollEdition(editionMult()), sticker: rollSticker(t.key) }); } }
  else choices = shuffle(pool.slice()).slice(0, def.show);
  if (type === 'kami' && choices.length && rand() < CFG.soulOdds * 2) choices[0] = { kind: 'kami', key: 'hitodama' };
  S.pack = { key, choices, left: def.keep, free: !!free }; S.msg = ''; S.msgErr = false;   // a fresh pack starts without the last shop message
  // Like Balatro's Arcana packs: Omikuji and Kami packs deal tiles from your Wall so a pick can be used on them right away.
  if ((type === 'omikuji' || type === 'kami') && S.deck && S.deck.length) { S.pack.hand = sortTiles(shuffle(S.deck.slice()).slice(0, PACK_HAND)).map(t => t.id); S.pack.sel = []; }
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
  if (gone.length) { S.deck = S.deck.filter(t => !gone.includes(t)); tilesDestroyed(gone.length); }
  if (added.length) { S.deck.push(...added); for (const k of liveTals(S)) if (TAL[k].onTileAdded) TAL[k].onTileAdded(S, added.length); }
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
  for (const t of after) if (!snap.has(t.id)) queueWallFlight($(`#modal .emblem[data-pt="${i}"]`), t);   // created tiles fly to the Wall
  S.pack.marks = marks; S.pack.hand = after.map(t => t.id); S.pack.sel = [];
  it.sold = true; it.used = true; S.pack.left--; if (it.key !== 'echo') S.lastCons = it.key; bump(PROFILE, def.kind === 'kami' ? 'kamiUsed' : 'omikujiUsed');
  const gained = S.money - m0, list = a0 => { const c = {}; for (const n of a0) c[n] = (c[n] || 0) + 1; const a = Object.entries(c).map(([n, k]) => k > 1 ? `${n} ×${k}` : n); return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0]; };
  const parts = []; if (changed.length) parts.push(`used on ${list(changed)}`); if (added.length) parts.push(`added ${list(added)}`); if (gone.length) parts.push(`removed ${list(gone.map(g => g.name))}`); if (gained) parts.push(`+¥${gained}`);
  setMsg(`${def.name}${parts.length ? ': ' + parts.join('; ') : (sel.length ? ' used: no tiles changed' : ' used')}.`);
  if (S.pack.left <= 0) closePackSoon(PACK_USE_CLOSE_MS);
  render();
  // The tiles the card changed or created pulse once, so the player sees what happened before the pack closes.
  if (motionOK) document.querySelectorAll('#packHand .tile.marked').forEach((t, k) => t.animate([{ transform: 'none' }, { transform: 'translateY(-8px) scale(1.12)', filter: 'brightness(1.25)', offset: .4 }, { transform: 'none' }], { duration: 520, delay: k * 70, easing: 'ease-out' }));
}
function fillPackTiles() { document.querySelectorAll('#modal .packtileart').forEach(b => { const it = S.pack && S.pack.choices[+b.dataset.pt]; if (it && it.tile && !b.children.length) b.appendChild(tileEl(it.tile)); }); }
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
// After the last pick a pack stays open just long enough for the action to play out (the card flying to its slot, the Wall or
// Run Info, or the changed tiles pulsing), with its buttons locked, then it closes by itself back to the Shop.
const PACK_CLOSE_MS = 900, PACK_USE_CLOSE_MS = 1400;
let packClosing = null;
function closePackSoon(ms) {
  S.pack.done = true; clearTimeout(packClosing);
  packClosing = setTimeout(() => trayOut(() => { packClosing = null; if (S.phase === 'shop' && S.pack && S.pack.done) { S.pack = null; render(); } }), motionOK ? ms : 0);
}
function takeFromPack(i) {
  const it = S.pack.choices[i]; if (!it || it.sold) return;
  if (it.kind === 'talisman') { if (S.talismans.length >= talSlots()) { setMsg('Talisman slots are full. Sell one from the list below first.', true); return render(); } gainTalisman(it.key, it.sticker); if (it.edition) S.editions[it.key] = it.edition; }
  else if (it.kind === 'scroll') { const [t, k] = it.key.split(':'); S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] = (S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] || 0) + 1; for (const tk of liveTals(S)) if (TAL[tk].onScroll) TAL[tk].onScroll(S); PROFILE.scrollsUsed++; saveProfile(); }
  else if (it.kind === 'tile') { queueWallFlight($(`#modal .packtileart[data-pt="${i}"]`), it.tile); S.deck.push(it.tile); PROFILE.tilesAdded = (PROFILE.tilesAdded || 0) + 1; saveProfile(); for (const k of liveTals(S)) if (TAL[k].onTileAdded) TAL[k].onTileAdded(S, 1); }
  else { if (S.consumables.length >= conSlots()) { setMsg('Consumable slots are full. Use or sell one first.', true); return render(); } S.consumables.push({ kind: it.kind, key: it.key }); }
  if (it.kind === 'talisman' || it.kind === 'omikuji' || it.kind === 'kami') { const b = $(`#modal [data-take="${i}"]`); if (b) queueSlotFlight(b.closest('.shopcard'), it.kind === 'talisman' ? 'tal' : 'con'); }
  if (it.kind === 'scroll') { const b = $(`#modal [data-take="${i}"]`); if (b) queueLevelStamp(b.closest('.shopcard'), it.key); }   // a Manual stamps its new level over the card
  it.sold = true; S.pack.left--; setMsg(it.kind === 'tile' ? `Added ${itemDef(it).name} to your Wall.` : `Took ${itemDef(it).name}.`);
  if (S.pack.left <= 0) closePackSoon(PACK_CLOSE_MS);
  render();
}
// A Tile Pack tile reads like a card: its name, then what its engraving and seal do.
function tileDef(t) { const parts = [t.eng && ENG[t.eng] ? `<b>${ENG[t.eng].name}:</b> ${ENG[t.eng].desc}` : '', t.seal && SEALS[t.seal] ? `<b>${SEALS[t.seal].name}:</b> ${SEALS[t.seal].desc}` : '', t.red ? 'A Red Five: +1 Han when it scores.' : ''].filter(Boolean); return { name: tileName(t), desc: parts.length ? parts.join(' ') : 'A plain tile.', cost: 0 }; }
function itemDef(it) { return it.kind === 'tile' ? tileDef(it.tile) : it.kind === 'talisman' ? TAL[it.key] : it.kind === 'scroll' ? SCR[it.key] : it.kind === 'flower' ? FLW[it.key] : it.kind === 'pack' ? PACKS[it.key] : CONS[it.key]; }
function buy(it) {
  const def = itemDef(it), p = itemPrice(it), card = $(`#modal [data-buy="${shopItems().indexOf(it)}"]`);
  if (S.money < p) { setMsg(`Not enough YEN: ${def.name} costs ¥${p}.`, true); return render(); }
  const inflate = () => { if (chal('inflation') && !S.quiet) S.inflation = (S.inflation || 0) + 1; };
  if (it.kind === 'pack') { if (trayLeaving) return; S.money -= p; it.sold = true; inflate(); if (!S.quiet) sfx('buy'); if (S.quiet) { openPack(it.key, false); return render(); } return trayOut(() => { openPack(it.key, false); render(); }); }
  if (it.kind === 'talisman') { if (S.talismans.length >= talSlots()) { setMsg(`All ${talSlots()} Talisman slots are full. Sell one first.`, true); return render(); } if (!S.quiet) bump(PROFILE, 'talsBought'); gainTalisman(it.key, it.sticker); if (it.edition) S.editions[it.key] = it.edition; }
  else if (it.kind === 'omikuji' || it.kind === 'kami') { if (S.consumables.length >= conSlots()) { setMsg('Consumable slots are full. Use one first.', true); return render(); } S.consumables.push({ kind: it.kind, key: it.key }); }
  else if (it.kind === 'scroll') { const [t, k] = it.key.split(':'); S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] = (S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] || 0) + 1; for (const tk of liveTals(S)) if (TAL[tk].onScroll) TAL[tk].onScroll(S); PROFILE.scrollsUsed++; saveProfile(); }
  else if (it.kind === 'flower') { S.flowers.push(it.key); if (S.anteFlower && S.anteFlower.key === it.key) S.anteFlower.sold = true; if (it.key === 'wisteria' || it.key === 'wisteria2') goBackAnte(); }
  if (!S.quiet && card && (it.kind === 'talisman' || it.kind === 'omikuji' || it.kind === 'kami' || it.kind === 'flower')) queueSlotFlight(card.closest('.shopcard'), it.kind === 'talisman' ? 'tal' : it.kind === 'flower' ? 'flower' : 'con');
  if (!S.quiet && card && it.kind === 'scroll') queueLevelStamp(card.closest('.shopcard'), it.key);
  S.money -= p; it.sold = true; inflate(); if (!S.quiet) { sfx('buy'); S.stats.bought = (S.stats.bought || 0) + 1; } setMsg(`Bought ${def.name}.`); render();
}
function itemPrice(it) { if (it.free) return 0; if (it.sticker && it.sticker.rental && it.kind === 'talisman') return S.shop && S.shop.coupon ? 0 : 1; const def = itemDef(it); let base = def.cost + (it.edition ? EDITIONS[it.edition].price : 0); if (it.kind === 'talisman') base += stakeTalCost(); if (S.shop && S.shop.coupon && (it.kind === 'talisman' || it.kind === 'omikuji' || it.kind === 'kami')) return 0; return price(base); }
// Wisteria: back one Ante, like Balatro's Hieroglyph. You stay on the same Blind of the earlier Ante, which gets a fresh Boss.
function goBackAnte() { if (S.ante <= 1) return; S.ante--; S.bossOrder[S.ante - 1] = rollBoss(S.ante, S.bossOrder); }
// Peony: reroll the Boss for ¥10, once per Ante (Tree Peony: any number of times).
const canRerollBoss = () => hasF('peony') && S.money >= 10 && (hasF('peony2') || S.bossRerollAnte !== S.ante);
function rerollBoss() { if (!canRerollBoss()) return; S.money -= 10; S.bossRerollAnte = S.ante; const old = S.bossOrder[S.ante - 1]; S.bossOrder[S.ante - 1] = rollBoss(S.ante, [old]); sfx('reroll'); setMsg(`${BOSSES[old].name} rerolled into ${BOSSES[S.bossOrder[S.ante - 1]].name}.`); render(); }
// Rerolling flips the cards: the old ones turn away one after another, then the new ones turn in from the other side.
// Clicks on the Shop are ignored for the half second it takes.
let rerolling = false;
function reroll() {
  const c = rerollPrice(); if (rerolling) return; if (S.money < c) { setMsg(`Reroll costs ¥${c}.`, true); return render(); }
  S.money -= c; S.shop.firstFree = false; S.shop.rerolls = (S.shop.rerolls || 0) + 1; S.stats.rerolls = (S.stats.rerolls || 0) + 1; sfx('reroll');
  const roll = () => { S.shop.cards = Array.from({ length: shopSlots() }, rollCard); render(); flipIn(); };
  const old = [...document.querySelectorAll('#modal .cardshelf .shopcard')];
  if (!motionOK || !old.length) return roll();
  rerolling = true; const m = $('#modal'); m.style.pointerEvents = 'none'; let done = false;
  const go = () => { if (done) return; done = true; rerolling = false; m.style.pointerEvents = ''; roll(); };
  old.forEach((el, i) => el.animate([{ transform: 'perspective(700px) rotateY(0)', opacity: 1 }, { transform: 'perspective(700px) rotateY(90deg) scale(.96)', opacity: .5 }], { duration: 150, delay: i * 45, easing: 'ease-in', fill: 'forwards' }));
  setTimeout(go, 150 + (old.length - 1) * 45 + 10);
}
function flipIn() {
  if (!motionOK) return;
  document.querySelectorAll('#modal .cardshelf .shopcard').forEach((el, i) => el.animate([{ transform: 'perspective(700px) rotateY(-90deg) scale(.96)', opacity: .5 }, { transform: 'perspective(700px) rotateY(0)' }], { duration: 220, delay: i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
}
function skipBlind() {
  if (S.phase !== 'select' || blindKind() === 'boss') return;
  const tag = (S.skipTags && S.skipTags[blindKind()]) || pick(Object.keys(TAGS)); S.stats.skipped++;
  // A Double Tag held makes the next Tag count twice (each Double held adds one more copy).
  let copies = 1; if (tag !== 'double') while (S.tags.includes('double')) { S.tags.splice(S.tags.indexOf('double'), 1); copies++; }
  for (let i = 0; i < copies; i++) applyTag(tag);
  PROFILE.skips = (PROFILE.skips || 0) + 1;
  S.blindIndex++; S.shop = null; S.pack = null; S.phase = 'select';
  setMsg(`Skipped for the ${TAGS[tag].name}${copies > 1 ? ` ×${copies}` : ''}: ${TAGS[tag].desc}`); render();
}
// Tags that act right away do so here; the rest wait in S.tags for the next shop or Blind.
function applyTag(tag) {
  if (tag === 'economy') S.money += Math.min(40, S.money);
  else if (tag === 'speed') S.money += 5 * S.stats.skipped;
  else if (tag === 'juggle') S.nextBlindMods = { handSize: ((S.nextBlindMods && S.nextBlindMods.handSize) || 0) + 3 };
  else if (tag === 'boss') S.bossOrder[S.ante - 1] = rollBoss(S.ante, S.bossOrder);
  else if (tag === 'handy') S.money += S.stats.playsTotal || 0;
  else if (tag === 'garbage') S.money += S.stats.discardsLeft || 0;
  else if (tag === 'orbital') { const k = pick(SCROLLS.filter(sc => sc.key.startsWith('m:'))).key.slice(2); S.scrolls.meld[k] = (S.scrolls.meld[k] || 0) + 3; for (const tk of liveTals(S)) if (TAL[tk].onScroll) TAL[tk].onScroll(S); toast(`<div class="label">Orbital Tag</div><b>${SCR['m:' + k].name}</b><div class="muted" style="font-size:11px">+3 levels</div>`); }
  else if (tag === 'topup') { for (let n = 0; n < 2 && S.talismans.length < talSlots(); n++) { const pool = talPool().filter(t => talRarity(t.key) === 'common'); if (!pool.length) break; gainTalisman(pick(pool).key); } }
  else S.tags.push(tag);
}
// Poker-chip tokens for the Ante screen: blue Small, gold Big, red Boss with a dashed ring.
function blindChipSVG(k) { const c = { small: '#2b5c8f', big: '#c58f2c', boss: '#a8362c' }[k]; return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="${c}" stroke="rgba(0,0,0,.35)"/>${[0, 60, 120, 180, 240, 300].map(a => `<rect x="18" y="2.5" width="4" height="6" rx="1" fill="rgba(255,255,255,.85)" transform="rotate(${a} 20 20)"/>`).join('')}<circle cx="20" cy="20" r="10" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-dasharray="${k === 'boss' ? '2 2' : '0'}"/>${k === 'boss' ? '<path d="M15 17l3 2M25 17l-3 2M16 24q4-3 8 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>' : `<circle cx="20" cy="20" r="${k === 'big' ? 5 : 3.5}" fill="rgba(255,255,255,.75)"/>`}</svg>`; }
function selectHTML() {
  const kinds = ['small', 'big', 'boss']; const names = { small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' };
  const boss = S.bossOrder[S.ante - 1];
  const plays = blindPlays(), discards = blindDiscards();
  // Ante progress: one pip per Ante, filled for cleared Antes, ringed for this one.
  const pips = S.ante > CFG.antes ? '<span class="endlessbadge">Endless</span>' : Array.from({ length: CFG.antes }, (_, i) => `<i class="${i + 1 < S.ante ? 'done' : i + 1 === S.ante ? 'now' : ''}"></i>`).join('');
  let h = `<div class="shophead"><h2>Ante ${S.ante}${S.ante > CFG.antes ? '' : ` <span class="muted sub">of ${CFG.antes}</span>`}</h2><span class="antepips" title="${anteLabel()}">${pips}</span></div><div class="selsub"><p class="muted">${S.challenge ? `Challenge: <b>${CHAL[S.challenge].name}</b> · ${CHAL[S.challenge].desc}` : `${DECKS[S.deckKey].name} · ${STAKES[S.stake].name}`}</p><span class="selbtns"><button id="mDeck" class="ghost quietbtn">${WALL_ICO}View Wall <b class="num">${(S.deck || []).length}</b></button><button id="mRunInfo" class="ghost quietbtn">${INFO_ICO}Run Info</button></span></div><div class="blindsel">`;
  kinds.forEach((k, i) => {
    const state = i < S.blindIndex ? 'done' : i === S.blindIndex ? 'current' : 'next';
    const reward = (k === 'small' && smallPaysNothing()) ? 0 : CFG.blindReward[k];
    const tag = k !== 'boss' && S.skipTags ? TAGS[S.skipTags[k]] : null;
    h += `<div class="blindcard ${state}${k === 'boss' ? ' bosscard' : ''}${k === 'boss' && BOSSES[boss].showdown ? ' showdown' : ''}"><span class="blindchip" aria-hidden="true">${blindChipSVG(k)}</span><div class="kind">${state === 'done' ? 'Defeated' : state === 'current' ? 'Up next' : 'After that'}</div><div class="n">${k === 'boss' ? BOSSES[boss].name : names[k]}</div>${k === 'boss' && BOSSES[boss].showdown ? '<div class="showdowntag">Showdown Boss</div>' : ''}${k === 'boss' ? `<div class="d bossfx">${BOSSES[boss].desc}</div>` : ''}`;
    h += `<div class="bc-plate"><div><div class="label">Score at least</div><div class="target num">${fmtN(blindTarget(k))}</div></div><div class="bp-reward" title="Plus ¥1 per unused Play and ¥1 interest per ¥5 held (max ¥5)"><div class="label">Reward</div><div class="num">¥${reward}<span class="muted" style="font-size:11px;font-family:var(--body)"> +extras</span></div></div></div>`;
    h += `<div class="bc-meta muted"><b class="num">${plays}</b> Plays · <b class="num">${discards}</b> Discards${S.nextBlindMods && S.nextBlindMods.handSize && state === 'current' ? ` · hand +${S.nextBlindMods.handSize}` : ''}</div>`;
    const skipBox = tag && state !== 'done' ? `<div class="skipbox"><div class="skiphead"><span class="label">Skip reward</span><span class="tagchip" data-hc-kind="Tag" data-hc-title="${tag.name}" data-hc-body="${tag.desc.replace(/"/g, '&quot;')}">${tag.name}</span></div><div class="skipdesc">${tag.desc}</div></div>` : '';
    if (state === 'current') h += `<div class="buy"><button id="mPlayBlind" class="primary">Play</button>${tag ? `<button id="mSkip" class="ghost" title="${tag.desc} No cash for this blind.">Skip for Tag</button>` : ''}</div>${skipBox}`;
    else h += skipBox;
    h += `</div>`;
  });
  h += `</div>`;
  if (S.tags.length) h += `<div class="label" style="margin:12px 0 6px">Tags held</div><div class="overtals">${S.tags.map(t => `<span class="tagchip" data-hc-kind="Tag" data-hc-title="${TAGS[t].name}" data-hc-body="${TAGS[t].desc.replace(/"/g, '&quot;')}">${TAGS[t].name}</span>`).join('')}</div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="margin-top:8px;min-height:18px">${S.msg || ''}</div>${hasF('peony') ? `<div class="shopfoot"><span style="flex:1"></span><button id="mRerollBoss" class="ghost" ${canRerollBoss() ? '' : `disabled title="${S.money < 10 ? 'Needs ¥10' : 'Already rerolled this Ante'}"`}>Reroll Boss ¥10</button></div>` : ''}`;
  return h;
}

// ===================== RENDER =====================
const $ = s => document.querySelector(s);
// ===================== ENDLESS MODE =====================
// Past the last Ante the targets grow like Balatro's endless mode: last base × (1.6 + (0.75c)^(1 + 0.2c))^c, c Antes past the end,
// rounded down to two significant figures.
function anteBase(ante) {
  if (ante <= CFG.antes) return CFG.anteBase[ante - 1];
  const c = ante - CFG.antes, a = CFG.anteBase[CFG.antes - 1] * Math.pow(1.6 + Math.pow(0.75 * c, 1 + 0.2 * c), c);
  if (!isFinite(a)) return Infinity;
  const k = Math.pow(10, Math.floor(Math.log10(a)) - 1); return Math.floor(a / k) * k;
}
// Big numbers switch to scientific notation (1.23e15) so they still fit, as in Balatro.
function fmtN(n) { return !isFinite(n) ? '∞' : Math.abs(n) < 1e11 ? Math.round(n).toLocaleString() : n.toExponential(2).replace('e+', 'e'); }
const anteLabel = (a = S.ante) => a > CFG.antes ? `Ante ${a} · Endless` : `Ante ${a} of ${CFG.antes}`;
// Endless Antes draw a fresh Boss each time, never one of the last three.
function ensureBosses() { while (S.bossOrder.length < S.ante) S.bossOrder.push(rollBoss(S.bossOrder.length + 1, S.bossOrder.slice(-3))); }
function fmtMult(m) { return Number.isInteger(m) ? m : (+m.toFixed(2)); }
// A Stone tile shows a grey slab: it has no rank or suit.
const STONE_SVG = '<svg viewBox="0 0 54 74" aria-hidden="true"><rect x="8" y="10" width="38" height="54" rx="6" fill="#8d8a82"/><path d="M14 22l9 6 4-9 8 12 6-4M16 46l7-5 6 8 9-6M20 56l5-3" fill="none" stroke="#5f5c56" stroke-width="1.6" stroke-linecap="round"/><circle cx="36" cy="20" r="2" fill="#a9a69e"/><circle cx="18" cy="36" r="1.6" fill="#a9a69e"/></svg>';
// Engraving marks in a tile's corner, drawn as icons (text glyphs like ♣ sit off-centre in many fonts): a sparkle for Wild,
// a four-leaf clover for Lucky, a plus for Mult.
const EMARK_SVG = {
  wild: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.2v9.6M1.85 3.6l8.3 4.8M1.85 8.4l8.3-4.8" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>',
  lucky: '<svg viewBox="0 0 12 12" aria-hidden="true"><g fill="#fff"><circle cx="6" cy="3.3" r="1.95"/><circle cx="6" cy="8.7" r="1.95"/><circle cx="3.3" cy="6" r="1.95"/><circle cx="8.7" cy="6" r="1.95"/></g><circle cx="6" cy="6" r=".85" fill="#2f855a"/></svg>',
  mult: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2.2v7.6M2.2 6h7.6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
};
function tileEl(t, o = {}) {
  const el = document.createElement('div');
  el.dataset.id = t.id;
  el.className = 'tile ' + t.suit + (t.red ? ' red' : '') + (t.eng ? ' eng-' + t.eng : '') + (t.seal ? ' seal-' + t.seal : '') + (t.ed ? ' ted-' + t.ed : '') + (o.sel ? ' sel' : '') + (o.small ? ' small' : '') + (o.back ? ' back' : '') + (o.called ? ' called' : '');
  if (!o.back) {
    el.innerHTML = t.eng === 'stone' ? STONE_SVG : tileSVG(t);
    if (t.ed) el.innerHTML += '<span class="tedfx"></span>';
    if (t.eng === 'wild' || t.eng === 'lucky' || t.eng === 'mult') el.innerHTML += `<span class="emark emark-${t.eng}">${EMARK_SVG[t.eng]}</span>`;
    if (t.seal || t.eng === 'redseal') el.innerHTML += `<span class="seal seal-${t.seal || 'red'}"></span>`;
    if (t.eng === 'dragonmark') el.innerHTML += '<span class="dmark"></span>';
    else if (t.eng === 'gold') el.innerHTML += '<span class="shine"></span>';
    else if (t.eng === 'steel') el.innerHTML += '<span class="brush"></span>';
  }
  el._t = t;   // the hover card reads the tile from here (it replaces the plain tooltip)
  return el;
}
// ===================== TILE HOVER CARD =====================
// Like Balatro: hovering a tile shows a small card with its name, the Chips it adds when scored (boss rules and
// Talisman bonuses included), Red Five and Dora Han, and its engraving. Hidden while dragging or scoring.
let tipEl = null, tipAnchor = null;
function tileTipHTML(t, back) {
  if (back) return `<div class="tt-n">Face down</div><div class="tt-e">A 1, 9, Wind or Dragon (The Purist).</div>`;
  const inRun = !!(S && S.talismans), chips = inRun ? tileChips(t, S) : ((isHonor(t) || isTerminal(t)) ? 10 : t.rank);
  const rows = [`<span class="hp chips">+${chips}</span><span>Chips</span>`];
  if (t.red) rows.push(`<span class="hp han">+${inRun && hasTal(S, 'koi') ? 2 : 1}</span><span>Han · Red Five</span>`);
  if (inRun && S.phase === 'blind' && (S.dora || []).includes(idx(t))) rows.push(`<span class="hp han">+1</span><span>Han · Dora</span>`);
  const eng = t.eng && ENG[t.eng] ? `<div class="tt-e"><b>${ENG[t.eng].name}</b> ${ENG[t.eng].desc}</div>` : '';
  const seal = t.seal && SEALS[t.seal] ? `<div class="tt-e"><b>${SEALS[t.seal].name}</b> ${SEALS[t.seal].desc}</div>` : '';
  const ted = t.ed && TILE_EDS[t.ed] ? `<div class="tt-e"><b>${TILE_EDS[t.ed].name}</b> ${TILE_EDS[t.ed].desc}</div>` : '';
  return `<div class="tt-n">${tileName(t)}</div>${rows.map(r => `<div class="tt-r">${r}</div>`).join('')}${eng}${seal}${ted}`;
}
function showTileTip(el, html) {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'tiletip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
  tipEl.innerHTML = html || tileTipHTML(el._t, el.classList.contains('back')); translateDOM(tipEl);
  const r = el.getBoundingClientRect(), h = tipEl.offsetHeight, below = r.top - h - 10 < 4;
  tipEl.classList.toggle('below', below); const hw = tipEl.offsetWidth / 2 + 8; tipEl.style.left = Math.max(hw, Math.min(innerWidth - hw, r.left + r.width / 2)) + 'px'; tipEl.style.top = (below ? r.bottom + 10 : r.top - 10) + 'px';   // kept on screen by its real width
  tipEl.classList.add('on'); const z = el.closest('#hand, #river, #open'); tipAnchor = z ? { id: el.dataset.id, zone: '#' + z.id } : null;
}
function hideTileTip() { if (tipEl) tipEl.classList.remove('on'); tipAnchor = null; }
// The same hover card for anything carrying data-hc-title (Flowers): a small label, the name, and the effect.
const hoverCardHTML = el => `${el.dataset.hcKind ? `<div class="tt-k">${el.dataset.hcKind}</div>` : ''}<div class="tt-n">${el.dataset.hcTitle}</div><div class="tt-e tt-body">${el.dataset.hcBody || ''}</div>`;
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch' || drag || slotDrag) return;
  const hc = e.target.closest('[data-hc-title]'); if (hc) { showTileTip(hc, hoverCardHTML(hc)); return; }
  const el = e.target.closest('.tile'); if (!el || !el._t || (S && S.busy)) return; showTileTip(el);
});
document.addEventListener('pointerout', e => { const el = e.target.closest('.tile, [data-hc-title]'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hideTileTip(); });
document.addEventListener('pointerdown', () => hideTileTip(), true);
// After a redraw (for example selecting the hovered tile) the card follows the same tile, or closes if it is gone.
function refreshTileTip() { if (!tipAnchor || !tipEl || !tipEl.classList.contains('on')) return; const el = document.querySelector(`${tipAnchor.zone} .tile[data-id="${tipAnchor.id}"]`); if (el && el.matches(':hover') && !(S && S.busy)) showTileTip(el); else hideTileTip(); }
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
  const red = '#d12c1f', blue = HIGH_CONTRAST ? '#1747c9' : '#1f4f8f', green = HIGH_CONTRAST ? '#0b7a2e' : '#2e7d4f', ink = '#1b1b1b', HC = HIGH_CONTRAST, NUMS = HC ? 'all' : TILE_NUMS;
  let body = '';
  const small = n => `<text x="5" y="11" font-size="9" font-family="IBM Plex Sans, sans-serif" font-weight="600" fill="${t.red ? red : '#7a6e52'}">${n}</text>`;
  if (t.suit === 'z') {
    if (t.rank === 5) body = `<rect x="11" y="14" width="32" height="46" rx="3" fill="none" stroke="${blue}" stroke-width="3"/>`;
    else { const col = t.rank === 6 ? green : t.rank === 7 ? red : ink; body = `<text x="27" y="50" text-anchor="middle" font-size="34" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${col}">${HONOR_NAMES[t.rank]}</text>`; if (t.rank <= 4 && NUMS !== 'none') body += `<text x="5" y="11" font-size="9" font-family="IBM Plex Sans, sans-serif" font-weight="600" fill="#7a6e52">${'ESWN'[t.rank - 1]}</text>`; }
  } else if (t.suit === 'm') {
    body = (NUMS !== 'none' ? small(t.rank) : '') + `<text x="27" y="34" text-anchor="middle" font-size="24" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${t.red ? red : ink}">${CJK_NUM[t.rank]}</text><text x="27" y="62" text-anchor="middle" font-size="24" font-weight="700" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" fill="${red}">萬</text>`;
  } else if (t.suit === 'p') {
    body = NUMS === 'all' ? small(t.rank) : '';   // Dots and Bamboo are counted by their pips, so by default they carry no corner number
    PIN_LAYOUT[t.rank].forEach(([x, y, r], i) => { const ring = t.red ? red : HC ? blue : (i % 2 ? green : blue); body += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${ring}" stroke-width="${Math.max(2, r * 0.3)}"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="${t.red ? red : HC ? blue : (i % 2 ? blue : green)}"/>`; });
  } else {
    body = NUMS === 'all' ? small(t.rank) : '';
    if (t.rank === 1) {
      const c = t.red ? red : green;
      body += `<path d="M27 56 C18 56 14 48 16 40 C18 32 24 30 27 30 C30 30 36 32 38 40 C40 48 36 56 27 56 Z" fill="${c}"/><circle cx="27" cy="25" r="6" fill="${c}"/><path d="M31 23 L38 25 L31 27 Z" fill="${red}"/><path d="M24 17 L27 11 L30 17" stroke="${red}" stroke-width="2" fill="none"/><path d="M20 56 L12 66 M27 57 L27 67 M34 56 L42 66" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`;
    } else {
      SOU_LAYOUT[t.rank].forEach(([x, y, r]) => { const c = (t.red || (r && !HC)) ? red : green; body += `<rect x="${x - 3.5}" y="${y - 9}" width="7" height="18" rx="3" fill="${c}"/><line x1="${x - 3.5}" y1="${y - 3}" x2="${x + 3.5}" y2="${y - 3}" stroke="#fff" stroke-width="1.4"/><line x1="${x - 3.5}" y1="${y + 3}" x2="${x + 3.5}" y2="${y + 3}" stroke="#fff" stroke-width="1.4"/>`; });
    }
  }
  return `<svg viewBox="0 0 54 74" aria-hidden="true">${body}</svg>`;
}
function render() {
  if (!S) return; if (S.bossOrder) ensureBosses(); setRules(S); checkUnlocks(); if (musicTimer) musicSetMode(musicTheme());
  if (S.phase === 'shop' && S.pack && S.pack.done && !packClosing) S.pack = null;   // a finished pack (say, reloaded while closing) goes straight back to the Shop
  const grow = rowHeights();
  const motionBefore = tileSnapshot(), freshTiles = new Set(S.newIds || []);
  renderBlind(); renderTalismans(); renderConsumables(); renderOpen(); renderRiver(); renderHand(); renderActions(); renderLast();
  $('#msg').textContent = S.msg || ''; $('#msg').className = 'msg' + (S.msgErr ? ' err' : '');
  if (S.phase === 'cashout') { showModal(cashoutHTML(), false, 'cashmodal traymodal'); placeOverlay(true); animateCashout(); } else if (S.phase === 'shop' && S.pack) { showModal(packHTML(), false, 'packmodal traymodal'); placeOverlay(true, 'shop'); fillPackTiles(); fillPackHand(); trayIn('pack'); } else if (S.phase === 'shop') { showModal(shopHTML(), false, 'shopmodal traymodal'); placeOverlay(true, 'shop'); tweenWallet(); trayIn('shop'); } else if (S.phase === 'select') showModal(selectHTML(), false, 'selectmodal'); else if (S.phase === 'gameover') showModal(overHTML(false), false, 'overmodal'); else if (S.phase === 'win') showModal(overHTML(true), false, 'overmodal winmodal'); else if (!modalPinned) hideModal();
  $('#btnYaku').textContent = 'Run Info';
  document.querySelectorAll('.zhead > .muted').forEach(e => { e.title = e.textContent; });   // full text on hover when a header is truncated
  translateDOM($('#app')); fitNumbers();
  if ($('#overlay').classList.contains('inflow')) placeOverlay(true, S.phase === 'shop' ? 'shop' : undefined);   // terms and fitted numbers can change the left column's height, so a tray that is part of the page is measured again
  if (S.placeholder && $('#overlay').hidden) showModal(menuHTML(false), true, 'menumodal');   // closing a screen opened from the title goes back to the title
  tileMotion(motionBefore, freshTiles); syncEditions(); refreshTileTip(); animateWall(); animateSlots(); playRowHolds(); growRows(grow); if (S.phase !== 'shop' && !S.quiet) walletShown = S.money;
  save();
}
// Tiles added to the Wall fly from where they were added to the Wall counter, which ticks up as each one lands. The counter is
// the left panel's Wall button, or the View Wall button when a full-screen Shop covers the board.
let flyShown = null, wallFlights = [];
function queueWallFlight(el, tile) { if (el && !compactScreen()) wallFlights.push({ rect: (el.firstElementChild || el).getBoundingClientRect(), tile }); }
function animateWall() {
  const ov = $('#overlay'), board = ov.hidden || ov.classList.contains('boardonly');
  const btn = board ? $('#wallBtn') : $('#modal #mDeck') || $('#wallBtn'), v = btn && btn.querySelector('.wv, .num');
  const flights = wallFlights; wallFlights = [];
  const n = v ? parseInt(v.textContent, 10) : NaN;
  if (!v || isNaN(n) || !flights.length || !motionOK || S.quiet || flyShown == null || n <= flyShown) { flyShown = isNaN(n) ? null : n; return; }
  let shown = Math.max(flyShown, n - flights.length); flyShown = n; v.textContent = shown;
  const to = btn.getBoundingClientRect(), tx = to.left + to.width / 2, ty = to.top + to.height / 2, flies = [];
  flights.forEach((f, k) => {
    const w = Math.max(28, Math.min(64, f.rect.width)), fly = document.createElement('div');
    fly.className = 'wallfly'; fly.style.cssText = `left:${f.rect.left + f.rect.width / 2 - w / 2}px;top:${f.rect.top + f.rect.height / 2 - w * .68}px`;
    const t = tileEl(f.tile); t.style.setProperty('--tw', w + 'px'); t.style.setProperty('--th', w * 1.36 + 'px'); fly.appendChild(t); document.body.appendChild(fly); flies.push(fly);
    const dx = tx - (f.rect.left + f.rect.width / 2), dy = ty - (f.rect.top + f.rect.height / 2);
    fly.animate([{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: `translate(${dx * .45}px,${dy * .45 - 90}px) scale(.85) rotate(-8deg)`, opacity: 1, offset: .45 }, { transform: `translate(${dx}px,${dy}px) scale(.3) rotate(-14deg)`, opacity: .6 }],
      { duration: 700, delay: k * 120, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'backwards' }).onfinish = () => {
      fly.remove(); if (!v.isConnected) return; v.textContent = ++shown;
      btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', filter: 'brightness(1.4)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    };
  });
  // Safety if animations are paused (a hidden tab): the count still ends right and no tile is left hanging.
  setTimeout(() => { flies.forEach(f => f.remove()); if (v.isConnected && shown < n) v.textContent = shown = n; }, 700 + flights.length * 120 + 600);
}
// A Talisman or consumable bought or taken flies from its card into its new slot on the board, shrinking to fit, then the slot
// pops in. The card is copied before the Shop redraws; the copy sits in a bare shelf so it keeps the shop card's look.
let slotFlights = [];
// A Manual has no slot to fly to: its new level is stamped over the card instead, rising and fading, as a confirmation.
function queueLevelStamp(card, key) {
  if (!card || !motionOK) return; const [t, k] = key.split(':'), n = (S.scrolls[t === 'm' ? 'meld' : 'yaku'][k] || 0);
  slotFlights.push({ stamp: true, rect: card.getBoundingClientRect(), text: t === 'y' ? `+${n} Han` : `Lv.${n + 1}`, name: itemDef({ kind: 'scroll', key }).name });
}
function playLevelStamp(f) {
  const el = document.createElement('div'); el.className = 'lvstamp'; el.innerHTML = `<small>${f.name}</small><b>${f.text}</b>`;
  el.style.cssText = `left:${f.rect.left + f.rect.width / 2}px;top:${f.rect.top + f.rect.height * .42}px`; document.body.appendChild(el); translateDOM(el);
  const a = el.animate([{ transform: 'translate(-50%,-50%) scale(.6) rotate(-6deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.12) rotate(-6deg)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-6deg)', opacity: 1, offset: .6 }, { transform: 'translate(-50%,-90%) scale(1) rotate(-6deg)', opacity: 0 }], { duration: 900, easing: 'ease-out' });
  a.onfinish = () => el.remove(); setTimeout(() => el.remove(), 1500);
}
// In the compact (full-screen) layout the board is hidden behind the screen, so nothing flies there.
const compactScreen = () => { const ov = $('#overlay'); return !ov.hidden && !ov.classList.contains('boardonly'); };
function queueSlotFlight(card, row) { if (card && motionOK && !compactScreen()) slotFlights.push({ rect: card.getBoundingClientRect(), node: card.cloneNode(true), row }); }
function animateSlots() {
  const flights = slotFlights; slotFlights = []; if (!flights.length || S.quiet) return;
  const filled = { tal: [...document.querySelectorAll('#talismans .slot.filled:not(.rowghost)')], con: [...document.querySelectorAll('#consumables .slot.filled:not(.rowghost)')] };
  flights.forEach((f, k) => {
    if (f.stamp) return playLevelStamp(f);
    const dest = f.row === 'flower' ? [...document.querySelectorAll('main > aside .flowers .flowerchip')].pop() : filled[f.row].pop(); if (!dest) return;
    const to = dest.getBoundingClientRect(), fly = document.createElement('div');
    fly.className = 'slotfly shelf'; fly.style.cssText = `left:${f.rect.left}px;top:${f.rect.top}px;width:${f.rect.width}px;height:${f.rect.height}px`;
    f.node.style.cssText = 'width:100%;height:100%;margin:0;box-sizing:border-box'; f.node.querySelectorAll('.buy,.pricetag').forEach(e => e.remove());
    fly.appendChild(f.node); document.body.appendChild(fly); dest.style.visibility = 'hidden';
    let dx = to.left - f.rect.left, dy = to.top - f.rect.top, sx = to.width / f.rect.width, sy = to.height / f.rect.height;
    if (f.row === 'flower') { sx = sy = Math.min(.22, (to.height * 2) / f.rect.height); dx = to.left + to.width / 2 - f.rect.left - f.rect.width * sx / 2; dy = to.top + to.height / 2 - f.rect.top - f.rect.height * sy / 2; }   // a pill is too flat to stretch a card into
    const land = () => { fly.remove(); if (!dest.isConnected) return; dest.style.visibility = ''; dest.animate([{ transform: 'scale(.86)', filter: 'brightness(1.6)' }, { transform: 'scale(1.04)', filter: 'brightness(1.2)', offset: .6 }, { transform: 'none', filter: 'none' }], { duration: 320, easing: 'ease-out' }); };
    const a = fly.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx * .4}px,${dy * .4 - 40}px) scale(${(1 + sx) / 2},${(1 + sy) / 2}) rotate(-3deg)`, opacity: 1, offset: .45 }, { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: .4 }],
      { duration: 620, delay: k * 120, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'backwards' });
    a.onfinish = land; setTimeout(() => { if (fly.isConnected) land(); }, 620 + k * 120 + 600);   // safety if animations are paused
  });
}
// Edition effects run on one shared 15 s clock: each newly drawn edition card gets a negative delay matching the
// clock, so a redraw picks up mid-cycle and all cards stay in step.
function syncEditions() { const d = `${-(performance.now() % 15000).toFixed(0)}ms`; document.querySelectorAll('.slot[class*="ed-"], .shopcard[class*="ed-"]').forEach(e => { if (!e.style.getPropertyValue('--edd')) e.style.setProperty('--edd', d); }); }
// ===================== SOUND =====================
// Balatro-style effects synthesized with Web Audio (no sound files): tile clacks for select, draw, discard, Call and
// Kan, a whoosh for Play, rising plinks for Chips, zings for Mult, ticks for counters, pops for fireworks.
// Each sound has a minimum gap so bursts never pile up. Browsers only allow audio after the first click or key.
let SOUND = (() => { try { return localStorage.getItem('yakuman.sound') !== 'off'; } catch (e) { return true; } })();
let AC = null, MASTER = null, NOISE = null; const SFX_LAST = {};
function audioCtx() { return SOUND ? audioBase() : null; }
function audioBase() {
  try {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); MASTER = AC.createGain(); MASTER.gain.value = .45; MASTER.connect(AC.destination);
      NOISE = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  } catch (e) { return null; }
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (SOUND) audioCtx(); if (MUSIC) musicStart(); }, true));
// ===================== MUSIC =====================
// Balatro-style: one laid-back synth groove whose layers crossfade with the game, rather than separate tracks.
// D minor at 96 BPM; the main theme runs Dm7 – B♭maj7 – Gm7 – A7, and the song runs four minutes before it loops. Normal: wobbly electric piano, syncopated bass, soft drums and a lead.
// Shop: adds a bouncy square arpeggio. Boss Blind: adds a driving distorted bass, four-on-the-floor kick and a dark drone.
// Uses its own random numbers, never the run's, so seeds are unaffected. Starts after the first click, pauses in a hidden tab.
let MUSIC = (() => { try { return localStorage.getItem('yakuman.music') !== 'off'; } catch (e) { return true; } })();
let MUSIC_GAIN = null, musicTimer = 0, musicStep = 0, musicAt = 0, MUSIC_BUS = null, MUSIC_LFO = null, musicMode = 'normal';
const BPM = 96, STEP = 60 / BPM / 4;   // one 16th note
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
// The song: twelve 8-bar sections (96 bars, about four minutes) before it loops, all in one groove so the feel stays the same.
// Chords are [bass root, voicing] in MIDI notes. A is the main theme; B, C and the breakdown (D) bring new progressions.
const CH = (root, chord) => ({ root, chord });
const PROGS = {
  A: [CH(38, [50, 53, 57, 60]), CH(34, [46, 50, 53, 57]), CH(31, [43, 46, 50, 53]), CH(33, [45, 49, 52, 55])],
  B: [CH(31, [43, 46, 50, 53]), CH(36, [48, 52, 55, 58]), CH(29, [41, 45, 48, 52]), CH(34, [46, 50, 53, 57]), CH(40, [52, 55, 58, 62]), CH(33, [45, 49, 52, 55]), CH(38, [50, 53, 57, 60]), CH(38, [50, 53, 57, 62])],
  C: [CH(34, [46, 50, 53, 57]), CH(33, [45, 48, 52, 55]), CH(31, [43, 46, 50, 53]), CH(33, [45, 49, 52, 55])],
  D: [CH(38, [50, 53, 57, 64]), CH(38, [50, 53, 57, 64]), CH(34, [46, 50, 53, 57]), CH(34, [46, 50, 57, 60])],
};
// Lead melodies: [bar, step, midi, length in steps]. 4-bar phrases repeat across an 8-bar section.
const MEL = {
  M1: [[0, 0, 69, 4], [0, 4, 72, 2], [0, 6, 74, 6], [0, 12, 72, 2], [0, 14, 69, 2], [1, 0, 70, 6], [1, 6, 69, 2], [1, 8, 65, 8], [2, 0, 67, 4], [2, 4, 70, 2], [2, 6, 74, 4], [2, 10, 72, 2], [2, 12, 70, 4], [3, 0, 69, 6], [3, 6, 67, 2], [3, 8, 64, 4], [3, 12, 61, 4]],
  M1b: [[0, 0, 74, 3], [0, 3, 72, 1], [0, 4, 69, 4], [0, 10, 72, 2], [0, 12, 74, 4], [1, 0, 77, 4], [1, 4, 74, 2], [1, 6, 72, 2], [1, 8, 70, 8], [2, 0, 70, 3], [2, 3, 69, 1], [2, 4, 67, 4], [2, 8, 70, 4], [2, 12, 74, 4], [3, 0, 73, 6], [3, 6, 72, 2], [3, 8, 69, 8]],
  M2: [[0, 0, 70, 4], [0, 4, 74, 4], [0, 8, 77, 6], [0, 14, 74, 2], [1, 0, 76, 4], [1, 4, 72, 4], [1, 8, 70, 4], [1, 12, 67, 4], [2, 0, 69, 6], [2, 6, 72, 2], [2, 8, 76, 8], [3, 0, 74, 4], [3, 4, 70, 4], [3, 8, 69, 4], [3, 12, 65, 4],
    [4, 0, 67, 4], [4, 4, 70, 4], [4, 8, 74, 6], [4, 14, 72, 2], [5, 0, 73, 6], [5, 6, 76, 2], [5, 8, 79, 4], [5, 12, 76, 4], [6, 0, 77, 8], [6, 8, 74, 4], [6, 12, 72, 4], [7, 0, 74, 12]],
  M2b: [[0, 2, 74, 2], [0, 4, 77, 4], [0, 8, 79, 4], [0, 12, 77, 4], [1, 0, 76, 6], [1, 6, 79, 2], [1, 8, 82, 8], [2, 0, 81, 4], [2, 4, 77, 4], [2, 8, 76, 4], [2, 12, 72, 4], [3, 0, 74, 8], [3, 8, 70, 8],
    [4, 0, 70, 2], [4, 2, 72, 2], [4, 4, 74, 4], [4, 8, 76, 4], [4, 12, 79, 4], [5, 0, 81, 6], [5, 6, 79, 2], [5, 8, 76, 8], [6, 0, 74, 4], [6, 4, 77, 4], [6, 8, 81, 8], [7, 0, 86, 4], [7, 4, 81, 8]],
  M3: [[0, 0, 74, 2], [0, 2, 77, 2], [0, 4, 81, 6], [0, 10, 79, 2], [0, 12, 77, 4], [1, 0, 76, 4], [1, 4, 72, 4], [1, 8, 76, 4], [1, 12, 79, 4], [2, 0, 77, 6], [2, 6, 74, 2], [2, 8, 70, 4], [2, 12, 74, 4], [3, 0, 73, 4], [3, 4, 76, 4], [3, 8, 73, 4], [3, 12, 69, 4]],
  M4: [[0, 0, 81, 8], [1, 8, 79, 8], [2, 0, 77, 8], [3, 4, 74, 12]],
};
// drums: 0 none, 'h' hats only, 1 groove, 2 busier groove. bass: 'soft' holds the root, otherwise the syncopated line.
const SONG = [
  { prog: 'A', drums: 0, bass: 'soft', lead: null },
  { prog: 'A', drums: 1, lead: 'M1' },
  { prog: 'A', drums: 1, lead: 'M1b', double: true },
  { prog: 'B', drums: 1, lead: 'M2' },
  { prog: 'D', drums: 'h', bass: 'soft', lead: 'M4' },
  { prog: 'A', drums: 2, lead: 'M1' },
  { prog: 'C', drums: 1, lead: 'M3' },
  { prog: 'B', drums: 2, lead: 'M2b' },
  { prog: 'A', drums: 1, lead: null, keysUp: true },
  { prog: 'C', drums: 2, lead: 'M3', double: true },
  { prog: 'A', drums: 1, lead: 'M1b' },
  { prog: 'D', drums: 'h', bass: 'soft', lead: 'M4' },
];
const SONG_BARS = SONG.length * 8;
const BASS_STEPS = [[0, 0], [3, 0], [6, 12], [8, 0], [10, 7], [11, 0], [14, 12]];
const MIX = { normal: { base: 1, shop: 0, boss: 0 }, shop: { base: .85, shop: 1, boss: 0 }, boss: { base: .9, shop: 0, boss: 1 } };
function musicLayer(name) { return MUSIC_BUS[name]; }
function mOsc(dest, t, f, type, dur, g, o = {}) {
  const osc = AC.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t); if (o.detune) osc.detune.value = o.detune;
  if (o.wobble && MUSIC_LFO) { MUSIC_LFO.connect(osc.detune); osc.onended = () => { try { MUSIC_LFO.disconnect(osc.detune); } catch (e) { } }; }   // let finished notes go
  const env = AC.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + (o.attack || .006)); env.gain.setTargetAtTime(g * (o.sustain ?? .6), t + (o.attack || .006), (o.decay || .12)); env.gain.setTargetAtTime(.0001, t + dur, o.release || .08);
  let node = osc;
  if (o.lp) { const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = o.q || .7; node.connect(lp); node = lp; }
  if (o.drive) { const ws = AC.createWaveShaper(); const c = new Float32Array(256); for (let k = 0; k < 256; k++) { const x = k / 128 - 1; c[k] = Math.tanh(x * o.drive); } ws.curve = c; node.connect(ws); node = ws; }
  node.connect(env).connect(dest); osc.start(t); osc.stop(t + dur + (o.release || .08) * 6);
}
function mNoise(dest, t, dur, g, f, type = 'highpass') {
  const src = AC.createBufferSource(); src.buffer = NOISE; const flt = AC.createBiquadFilter(); flt.type = type; flt.frequency.value = f;
  const env = AC.createGain(); env.gain.setValueAtTime(g, t); env.gain.exponentialRampToValueAtTime(.0005, t + dur); src.connect(flt).connect(env).connect(dest); src.start(t); src.stop(t + dur + .02);
}
function mKick(dest, t, g) { const o = AC.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); const e = AC.createGain(); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.001, t + .32); o.connect(e).connect(dest); o.start(t); o.stop(t + .35); }
function musicTick() {
  if (!AC || !MUSIC_GAIN) return;
  const B = MUSIC_BUS;
  while (musicAt < AC.currentTime + .4) {
    const t = musicAt, st = musicStep++, songBar = Math.floor(st / 16) % SONG_BARS, s16 = st % 16;
    const sec = SONG[Math.floor(songBar / 8)], inSec = songBar % 8, prog = PROGS[sec.prog], P = prog[inSec % prog.length], fillBar = inSec === 7;
    // Normal layer: electric piano comping (tremolo through the shared wobble), bass, drums, the lead.
    const comp = sec.keysUp ? [0, 3, 6, 10, 13] : [0, 6, 10];
    if (comp.includes(s16)) { const len = s16 === 0 ? STEP * 5 : STEP * 2.5, up = sec.keysUp && s16 % 2 ? 12 : 0; P.chord.forEach((n, k) => { mOsc(B.base, t + k * .008, mf(n + up), 'sine', len, .045, { wobble: true, lp: 2400, sustain: .5, decay: .25 }); mOsc(B.base, t + k * .008, mf(n + up) * 2, 'triangle', len * .6, .012, { lp: 3000 }); }); }
    if (sec.bass === 'soft') { if (s16 === 0) mOsc(B.base, t, mf(P.root), 'sawtooth', STEP * 15, .07, { lp: 300, attack: .05, sustain: .7, decay: .6, release: .3 }); }
    else { for (const [bs, iv] of BASS_STEPS) if (s16 === bs) mOsc(B.base, t, mf(P.root + iv), 'sawtooth', STEP * 1.6, .11, { lp: 520, q: 4, sustain: .4, decay: .09 });
      if (s16 === 15 && Math.random() < .3) mOsc(B.base, t, mf(P.root + 10), 'sawtooth', STEP * .9, .08, { lp: 520, q: 4 }); }
    if (sec.drums === 1 || sec.drums === 2) {
      if (s16 === 0 || s16 === 8 || (sec.drums === 2 && s16 === 11)) mKick(B.base, t, .5);
      if (s16 === 4 || s16 === 12) mNoise(B.base, t, .14, .07, 1800, 'bandpass');
      if (sec.drums === 2 && (s16 === 7 || s16 === 15) && Math.random() < .5) mNoise(B.base, t, .06, .025, 1800, 'bandpass');
      if (fillBar && s16 >= 12) mNoise(B.base, t, .08, .03 + (s16 - 12) * .015, 1500 + (s16 - 12) * 300, 'bandpass');
    }
    if (sec.drums && (s16 % 2 === 0 || sec.drums === 2)) mNoise(B.base, t, .04, s16 % 4 === 2 ? .025 : .012, 7000);
    if (sec.lead) { const mel = MEL[sec.lead], span = Math.max(...mel.map(n => n[0])) + 1, mb = inSec % span;
      for (const [lb, ls, ln, ll] of mel) if (lb === mb && ls === s16) { mOsc(B.base, t, mf(ln), 'triangle', STEP * ll * .95, .05, { wobble: true, lp: 3200, attack: .02, sustain: .75, decay: .3 }); if (sec.double) mOsc(B.base, t, mf(ln - 12), 'sine', STEP * ll * .9, .03, { lp: 1800, attack: .02 }); } }
    // Shop layer: a bouncy square arpeggio over the chord, an octave up, plus a little offbeat shaker.
    if (s16 % 2 === 0) { const arp = P.chord.concat([P.chord[0] + 12, P.chord[2] + 12]); const n = arp[(s16 / 2 + inSec) % arp.length] + 12; mOsc(B.shop, t, mf(n), 'square', STEP * 1.2, .022, { lp: 2800, sustain: .3, decay: .06 }); }
    if (s16 % 4 === 2) mNoise(B.shop, t, .06, .03, 5000);
    // Boss layer: driving distorted bass in 8ths, four-on-the-floor kick, and a dark drone a semitone above the root.
    if (s16 % 2 === 0) mOsc(B.boss, t, mf(P.root + (s16 % 8 === 6 ? 12 : 0)), 'sawtooth', STEP * 1.8, .07, { lp: 900, drive: 3, sustain: .5, decay: .1 });
    if (s16 % 4 === 0) mKick(B.boss, t, .55);
    if (s16 === 0) { mOsc(B.boss, t, mf(P.root + 25), 'sawtooth', STEP * 15, .018, { lp: 700, attack: .6, sustain: .9, decay: 1, release: .4 }); mOsc(B.boss, t, mf(P.root + 24), 'square', STEP * 15, .012, { lp: 600, attack: .8, sustain: .9, decay: 1, release: .4 }); }
    if (s16 === 14 && fillBar) mNoise(B.boss, t, .3, .06, 900, 'lowpass');
    musicAt += STEP;
  }
}
// The theme for what is on screen: the Shop (and packs and cash-out), a Boss Blind, or everything else.
function musicTheme() { if (!S || S.placeholder) return 'normal'; if (['shop', 'cashout'].includes(S.phase)) return 'shop'; if (S.phase === 'blind' && blindKind() === 'boss') return 'boss'; return 'normal'; }
function musicSetMode(mode) {
  if (!MUSIC_BUS || mode === musicMode) { musicMode = mode; return; } musicMode = mode; const now = AC.currentTime;
  for (const [k, g] of Object.entries(MIX[mode])) { const p = MUSIC_BUS[k].gain; p.cancelScheduledValues(now); p.setTargetAtTime(g, now, .6); }
}
function musicStart() {
  if (!MUSIC || musicTimer || document.hidden) return; const ac = audioBase(); if (!ac) return;
  if (!MUSIC_GAIN) {
    MUSIC_GAIN = AC.createGain(); const warm = AC.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 6000; MUSIC_GAIN.connect(warm).connect(AC.destination);
    MUSIC_BUS = {}; for (const k of ['base', 'shop', 'boss']) { MUSIC_BUS[k] = AC.createGain(); MUSIC_BUS[k].gain.value = 0; MUSIC_BUS[k].connect(MUSIC_GAIN); }
    // A slow pitch wobble shared by the keys and the lead, like a worn tape.
    MUSIC_LFO = AC.createOscillator(); MUSIC_LFO.frequency.value = 4.2; const depth = AC.createGain(); depth.gain.value = 7; MUSIC_LFO.connect(depth); MUSIC_LFO.start(); MUSIC_LFO = depth;
  }
  musicMode = ''; musicSetMode(musicTheme());
  MUSIC_GAIN.gain.cancelScheduledValues(AC.currentTime); MUSIC_GAIN.gain.setValueAtTime(0, AC.currentTime); MUSIC_GAIN.gain.linearRampToValueAtTime(.42, AC.currentTime + 2);
  musicAt = AC.currentTime + .1; musicStep = 0; musicTimer = setInterval(musicTick, 120);
}
function musicStop() { if (!musicTimer) return; clearInterval(musicTimer); musicTimer = 0; if (MUSIC_GAIN && AC) { MUSIC_GAIN.gain.cancelScheduledValues(AC.currentTime); MUSIC_GAIN.gain.setTargetAtTime(0, AC.currentTime, .3); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) musicStop(); else if (MUSIC && AC) musicStart(); });
// A tile clack: a short burst of filtered noise plus a faint wooden knock.
function sClack(t, f = 2600, dur = .06, g = .4) {
  const src = AC.createBufferSource(); src.buffer = NOISE; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 5;
  const env = AC.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + .002); env.gain.exponentialRampToValueAtTime(.0008, t + dur);
  src.connect(bp).connect(env).connect(MASTER); src.start(t); src.stop(t + dur + .02);
  sTone(t, f / 5.5, 'triangle', dur * .9, g * .25);
}
function sTone(t, f, type = 'sine', dur = .12, g = .2, slideTo = 0) {
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const env = AC.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + .004); env.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(env).connect(MASTER); o.start(t); o.stop(t + dur + .02);
}
function sWhoosh(t, dur = .2, g = .18, from = 500, to = 2400) {
  const src = AC.createBufferSource(); src.buffer = NOISE; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = AC.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + dur * .4); env.gain.exponentialRampToValueAtTime(.0008, t + dur);
  src.connect(bp).connect(env).connect(MASTER); src.start(t); src.stop(t + dur + .02);
}
const SFX_GAP = { coin: .045, tick: .035, wall: .04, draw: .035, chip: .03, mult: .05, pop: .06, select: .02, deselect: .02 };
function sfx(name, n = 0) {
  const ac = audioCtx(); if (!ac || ac.state !== 'running') return;
  const now = ac.currentTime; if (SFX_LAST[name] && now - SFX_LAST[name] < (SFX_GAP[name] || .015)) return; SFX_LAST[name] = now;
  const step = k => Math.pow(1.0595, Math.min(k, 24));   // a semitone per step, capped at two octaves
  switch (name) {
    case 'select': sClack(now, 3300, .045, .32); break;
    case 'deselect': sClack(now, 2300, .04, .22); break;
    case 'draw': sClack(now, 2700 + Math.random() * 500, .05, .22); break;
    case 'discard': sClack(now, 2100 + Math.random() * 300, .075, .42); sTone(now, 150, 'sine', .09, .12); break;
    case 'play': sWhoosh(now, .22, .2); sClack(now + .12, 2500, .06, .3); break;
    case 'call': sClack(now, 2000, .07, .45); sClack(now + .075, 2600, .06, .4); sTone(now, 190, 'sine', .14, .16, 120); break;
    case 'kan': for (let k = 0; k < 4; k++) sClack(now + k * .065, 2000 + k * 260, .06, .4); sTone(now + .26, 130, 'sine', .22, .22, 80); break;
    case 'wall': sTone(now, 900, 'square', .02, .025); break;
    case 'tick': sTone(now, 1500, 'square', .018, .02); break;
    case 'chip': { const f = 520 * step(n); sTone(now, f, 'triangle', .13, .16); sTone(now, f * 2, 'sine', .06, .05); break; }
    case 'mult': { const f = 330 * step(n); sTone(now, f, 'square', .14, .05, f * 1.25); sTone(now, f * 1.5, 'sine', .12, .08); break; }
    case 'xmult': sTone(now, 200, 'sawtooth', .3, .07, 620); sTone(now, 400, 'sine', .3, .1, 1240); break;
    case 'total': [523, 659, 784].forEach((f, k) => sTone(now + k * .05, f, 'triangle', .28, .14)); break;
    case 'coin': { const f = 1900 + Math.random() * 300; sTone(now, f, 'triangle', .09, .1); sTone(now + .03, f * 1.33, 'sine', .1, .07); break; }
    case 'kaching': sClack(now, 1800, .05, .35); [1318, 1760, 2637].forEach((f, k) => sTone(now + .04 + k * .025, f, 'triangle', .6, .1)); sTone(now + .04, 3520, 'sine', .35, .04); break;
    case 'buy': sClack(now, 1600, .05, .3); sTone(now + .03, 2100, 'triangle', .12, .1); sTone(now + .09, 1600, 'triangle', .14, .09); break;
    case 'sell': [1500, 2000, 2500].forEach((f, k) => sTone(now + k * .06, f, 'triangle', .12, .09)); break;
    case 'reroll': sWhoosh(now, .18, .14, 800, 3000); sClack(now + .08, 2600, .04, .2); sClack(now + .13, 3000, .04, .18); break;
    case 'pop': { const src = AC.createBufferSource(); src.buffer = NOISE; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const env = AC.createGain(); env.gain.setValueAtTime(.18, now); env.gain.exponentialRampToValueAtTime(.0008, now + .18); src.connect(lp).connect(env).connect(MASTER); src.start(now); src.stop(now + .2); break; }
  }
}
// ===================== TILE MOTION =====================
// The board is rebuilt on every render, so tiles would otherwise jump. Before a render we note where each tile was;
// afterwards each tile animates from there (FLIP). Selecting lifts with a small spring, discards fly into the River
// with an arc, the hand glides to its new order, and new tiles are dealt in with a flip. Everything stays under ~0.4 s.
const TILE_ZONES = ['#hand', '#river', '#open'];
const liftOf = e => e.classList.contains('sel') ? (e.classList.contains('small') ? -6 : -12) : 0;
function tileSnapshot() {
  const m = new Map(); if (!motionOK) return m;
  for (const z of TILE_ZONES) document.querySelectorAll(`${z} .tile[data-id]`).forEach(e => { const id = +e.dataset.id; if (id) m.set(id, { r: e.getBoundingClientRect(), zone: z, lift: liftOf(e) }); });
  return m;
}
function tileMotion(before, fresh) {
  if (!motionOK || (!before.size && !fresh.size)) return;
  let fly = 0, deal = 0; const dealGap = fresh.size > 8 ? 30 : 55;
  for (const z of TILE_ZONES) document.querySelectorAll(`${z} .tile[data-id]`).forEach(e => {
    const id = +e.dataset.id; if (!id) return;
    const old = before.get(id), lift = liftOf(e), end = `translate(0px,${lift}px) scale(1)`;
    if (old) {
      const r = e.getBoundingClientRect(), dx = old.r.left - r.left, dy = old.r.top - (r.top - lift), sc = old.r.width / r.width;
      if (old.zone !== z) {   // discards into the River, Calls onto the table
        e.style.transformOrigin = '0 0';
        const a = e.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sc})`, zIndex: 30 }, { transform: `translate(${dx / 2}px,${dy / 2 - 34}px) scale(${(sc + 1) / 2}) rotate(${fly % 2 ? 7 : -7}deg)`, zIndex: 30, offset: .45 }, { transform: end, zIndex: 30 }],
          { duration: 300, delay: fly * 30, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' });
        a.onfinish = () => { e.style.transformOrigin = ''; }; fly++;
      } else if (Math.abs(dx) > 1 || Math.abs((old.r.top - old.lift) - (r.top - lift)) > 1) {   // the hand re-sorting or closing a gap (resting positions differ)
        e.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: end }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else if (old.lift !== lift) {   // selected or deselected in place
        e.animate([{ transform: `translate(0px,${old.lift}px) scale(1)` }, { transform: end }],   // a straight lift or drop, no overshoot
          { duration: lift ? 110 : 80, easing: 'cubic-bezier(.25,.8,.35,1)' });
      }
    } else if (fresh.has(id) && z === '#hand') {   // dealt from the Wall: drops in, lands with a small bounce, glows gold briefly
      const d = deal * dealGap;
      e.animate([{ transform: `translate(0px,${lift - 46}px) scale(.86) rotate(-6deg)`, opacity: 0 }, { transform: `translate(0px,${lift + 5}px) scale(1.02) rotate(1deg)`, opacity: 1, offset: .7 }, { transform: end, opacity: 1 }],
        { duration: 340, delay: d, easing: 'cubic-bezier(.25,.8,.35,1)', fill: 'backwards' });
      e.classList.add('fresh'); e.style.animationDelay = `${d}ms`; setTimeout(() => sfx('draw'), d + 220); deal++;
    }
  });
}
// Big numbers shrink to fit their box instead of wrapping onto a second line (targets, chips, Mult, totals, Round Score).
function fitText(el, min) { if (!el) return; el.style.fontSize = ''; let fs = parseFloat(getComputedStyle(el).fontSize); while (el.scrollWidth > el.clientWidth + 1 && fs > (min || 11)) { fs -= 1; el.style.fontSize = fs + 'px'; } }
function fitNumbers(root) { (root || document).querySelectorAll('.handbox .chipbox, .handbox .multbox, .bp-row .target, .roundscore .rs, .hb-total .tot').forEach(e => fitText(e)); (root || document).querySelectorAll('.hanfoot').forEach(fitFoot); (root || document).querySelectorAll('.hb-head .hb-title').forEach(fitTitle); }
// The Han caption always shows the tier name (Baiman, ...) on its second line; the tooltip has both.
function fitFoot(el) { if (!el) return; const t = el.querySelector('.hantier').textContent; el.title = el.querySelector('.hanline').textContent + (t ? ' · ' + t : ''); }
// Chips × Mult boxes for the scoring summary. Han lives in a caption strip under Mult, because Han only exists to become Mult.
const tierText = h => { const t = tierName(h); return t && t !== 'None' ? t : ''; };
function mathBoxes(chips, mult, han, dim) {
  return `<div class="hb-math num"><span class="boxwrap chipwrap${dim ? ' dim' : ''}"><span class="chipbox"><span class="nv">${chips}</span></span><span class="boxfoot capfoot chipfoot"><span class="hanline">Chips</span><span class="hantier"></span></span></span><span class="px">×</span><span class="boxwrap multwrap${dim ? ' dim' : ''}"><span class="multbox"><span class="nv">${mult}</span></span><span class="boxfoot capfoot hanfoot"><span class="hanline"><b class="hanval">${han}</b> ${tr('Han')}</span><span class="hantier">${tr(tierText(han))}</span></span></span></div>`;
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
  const ctx = opt.type === 'hand' ? scoreCtx(S, 'hand', (opt.tiles || sel.concat(claimed)).concat(openTiles()), { yaku: opt.best.yaku, dec: opt.best.dec, preview: true, claim: opt.claim }) : scoreCtx(S, 'meld', opt.tiles || sel, { part: opt.part, preview: true });
  PREVIEW = { ctx, label: opt.type === 'hand' ? (ctx.yaku.length ? ctx.yaku.map(y => y.name).join(', ') : 'Complete Hand') : ctx.rungName, kind: opt.type, claim: !!opt.claim };
}
function renderBlind() {
  // During cash-out the card keeps showing the Blind just beaten (marked Defeated, with its final score) until Cash Out.
  const cleared = S.phase === 'cashout' && !!S.reward, show = S.phase === 'blind' || cleared;
  const kind = cleared ? S.reward.kind : blindKind(); const inBlind = S.phase === 'blind'; computePreview();
  const offBoss = show && kind === 'boss' && !S.boss && S.bossOff;
  const bossShown = show && S.boss && kind === 'boss';
  const name = offBoss ? BOSSES[S.bossOff].name : bossShown ? BOSSES[S.boss].name : ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[kind];
  const pct = S.target ? Math.min(100, 100 * S.score / S.target) : 0;
  const reward = cleared ? S.reward.base : (kind === 'small' && smallPaysNothing()) ? 0 : CFG.blindReward[kind];
  const targetVal = show ? S.target : blindTarget(kind);
  let h = `<div class="blindplate${bossShown ? ' bossplate' : ''}${cleared ? ' cleared' : ''}"><div class="bp-top"><span class="label">${anteLabel(cleared && kind === 'boss' ? S.ante - 1 : S.ante)}</span><span class="label">${cleared ? 'Defeated' : inBlind ? (kind === 'boss' ? (BOSSES[S.boss || S.bossOff] && BOSSES[S.boss || S.bossOff].showdown ? 'Showdown Boss' : 'Boss Blind') : '') : 'Next up'}</span></div><div class="blind-name${bossShown ? ' boss' : ''}">${name}</div>`;
  if (offBoss) h += `<div class="boss-desc"><b>Disabled by Tamamo-no-Mae.</b></div>`;
  if (bossShown) h += `<div class="boss-desc">${BOSSES[S.boss].desc}${S.boss === 'collector' && S.bossSuit ? ` <b>This Blind: ${SUIT_EN[S.bossSuit]}.</b>` : ''}${S.boss === 'gatekeeper' ? (S.firstPlayDone ? ' <b>First Play done.</b>' : '') : ''}</div>`;
  h += `<div class="bp-row"><div><div class="label">Score at least</div><div class="target num">${fmtN(targetVal)}</div></div><div class="bp-reward" title="Plus ¥1 per unused Play and ¥1 interest per ¥5 held (max ¥5)"><div class="label">Reward</div><div class="num">¥${reward}<span class="muted" style="font-size:11px;font-family:var(--body)"> +extras</span></div></div></div></div>`;
  if (S.tags && S.tags.length) h += `<div class="label" style="margin-top:8px">Tags</div><div class="flowers">${S.tags.map(t => `<span class="flowerchip" data-hc-kind="Tag" data-hc-title="${TAGS[t].name}" data-hc-body="${TAGS[t].desc.replace(/"/g, '&quot;')}">${TAGS[t].name}</span>`).join('')}</div>`;
  if (show) h += `<div class="roundscore"><div class="label">Round Score</div><div class="rs num${S.score >= S.target ? ' met' : ''}" id="roundScore">${fmtN(S.score)}</div><div class="rsbar"><i id="roundBar" style="width:${pct}%"></i></div></div>`;
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
  // Plays and Discards left, then the purse (money, with the interest in its tooltip) beside the Wall.
  const interest = Math.min(interestCap(), Math.floor(S.money / CFG.interestPer));
  // Until you press Cash Out, the purse and Wall still show the Blind you just beat; the payout lands in the purse on Cash Out.
  const unpaid = S.phase === 'cashout' && S.reward && !S.reward.paid;
  const wallN = S.phase === 'blind' ? S.wall.length : unpaid && S.reward.wallLeft != null ? S.reward.wallLeft : (S.deck || []).length;
  h += `<div class="stats"><div class="stat plays"><div class="label">Plays</div><div class="v num">${S.plays}</div></div><div class="stat discards"><div class="label">Discards</div><div class="v num">${S.discards}</div></div></div>`;
  h += `<div class="stats purserow"><div class="purse" title="Interest: +¥${interest} at the next cash-out (¥1 for every ¥${CFG.interestPer} you hold, up to ¥${interestCap()})"><span class="coin" aria-hidden="true">${coinSVG()}</span><span class="wtx"><span class="pv num" id="purseVal">¥${unpaid ? (S.reward.before ?? S.money - S.reward.total) : S.money}</span><span class="wl" data-notr>${LANG === 'hk' ? 'HKD' : 'JPY'}</span></span></div><button class="wallbtn" id="wallBtn" title="${S.phase === 'blind' ? 'Tiles still face down in the Wall. Click to see every tile.' : 'Tiles in your Wall. Click to see every tile.'}"><span class="wallico" aria-hidden="true"><i></i><i></i><i></i></span><span class="wtx"><span class="wv num">${wallN}</span><span class="wl">Wall</span></span></button></div>`;
  if (S.indicators.length) { h += `<div class="label" style="margin-top:8px">Dora Indicators</div><div class="dora-ind" id="doraRow"></div>`; }
  if (S.flowers.length) h += `<div class="label" style="margin-top:8px">Flowers &amp; Seasons</div><div class="flowers">${S.flowers.map(f => `<span class="flowerchip" data-hc-kind="Flower" data-hc-title="${FLW[f].name}" data-hc-body="${FLW[f].desc.replace(/"/g, '&quot;')}">${FLW[f].name}</span>`).join('')}</div>`;
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
    if (k) { const ed = S.editions[k]; el.className = 'slot filled' + (S.selTal === k ? ' sel' : '') + (ed ? ' ed-' + ed : '') + (talOff(S).includes(k) ? ' off' : ''); el.dataset.tal = TAL[k].name; const tgt = TAL[k].copies ? talTarget(S, k) : null; el.innerHTML = `${stickerBadges(S.stickers && S.stickers[k])}<div class="kind">${talKindRow(k, ed, i + 1, 'slot')}</div><div class="n">${TAL[k].name}</div><div class="d">${TAL[k].desc}${tgt ? ` <b>Now: ${tgt.name}.</b>` : TAL[k].copies ? ' <b>Nothing to copy.</b>' : ''}${ed ? ` <b>${EDITIONS[ed].desc}.</b>` : ''}${TAL[k].status ? ' <b>(' + TAL[k].status(S) + ')</b>' : ''}</div>`; bindSlotDrag(el, k); }
    else { el.className = 'slot'; el.innerHTML = `<div class="d">Empty slot</div>`; }
    if (k && talOff(S).includes(k)) el.insertAdjacentHTML('beforeend', '<span class="offtag">Disabled</span>');
    box.appendChild(el);
  }
  const ts = $('#talSell'); ts.innerHTML = '';
  if (S.selTal && S.talismans.includes(S.selTal)) { const b = document.createElement('button'); b.className = 'ghost'; b.style.cssText = 'padding:3px 8px;font-size:12px'; b.textContent = isEternal(S.selTal) ? `${TAL[S.selTal].name} is Eternal` : `Sell ${TAL[S.selTal].name} for ¥${talSellValue(S.selTal)}`; if (isEternal(S.selTal)) b.disabled = true; b.onclick = () => sellTalisman(S.selTal); ts.appendChild(b); }
}
function renderConsumables() {
  const box = $('#consumables'); box.innerHTML = ''; $('#conCount').textContent = `${S.consumables.length} / ${conSlots()} · click one to use or sell it`;
  for (let i = 0; i < conSlots(); i++) {
    const c = S.consumables[i]; const el = document.createElement('div');
    if (c) { const d = CONS[c.key]; el.className = 'slot filled ' + c.kind; el.innerHTML = `<div class="kind">${c.kind === 'kami' ? 'Kami Spirit' : 'Omikuji'}</div><div class="n">${d.name}</div><div class="d">${d.desc}</div>`; if (S.selCon === i) el.classList.add('sel'); el.onclick = () => { S.selCon = S.selCon === i ? null : i; render(); }; }
    else { el.className = 'slot'; el.innerHTML = `<div class="d">Empty slot</div>`; }
    box.appendChild(el);
  }
  // Like Balatro: a selected consumable shows Use and Sell in the row's header (Use only when it can be used right now).
  const cs = $('#conSell'); if (!cs) return; cs.innerHTML = ''; const c = S.consumables[S.selCon]; if (!c) { S.selCon = null; return; }
  const d = CONS[c.key], canUse = S.phase === 'blind' || d.anywhere;
  if (canUse) { const u = document.createElement('button'); u.className = 'primary'; u.style.cssText = 'padding:3px 10px;font-size:12px'; u.textContent = `Use ${d.name}`; u.onclick = () => { const i = S.selCon; S.selCon = null; useConsumable(i); }; cs.appendChild(u); }
  const sl = document.createElement('button'); sl.className = 'ghost'; sl.style.cssText = 'padding:3px 10px;font-size:12px;margin-left:6px'; sl.textContent = `Sell ¥${conSellValue(c)}`; sl.onclick = () => { const i = S.selCon; S.selCon = null; sellConsumable(i); }; cs.appendChild(sl);
}
function renderOpen() {
  const box = $('#open'); box.innerHTML = '';
  const allClosed = S.open.every(m => m.closed);
  $('#openInfo').textContent = S.open.length ? (allClosed ? `${S.open.length} declared · hand is still closed for Yaku` : `${S.open.length} on the table · hand is Open for Yaku`) : 'Hand is closed.';
  if (!S.open.length) box.innerHTML = '<span class="muted empty">No melds on the table</span>';
  for (const m of S.open) { const w = document.createElement('div'); w.className = 'meld' + (m.closed ? ' closedmeld' : ''); w.innerHTML = `<span class="mt">${m.closed ? 'Concealed ' : ''}${MELD_LABEL[m.type]}</span>`; if (m.closed) w.title = 'Concealed Kan: declared from your hand, so your hand stays closed. Shown like real Mahjong, with the two end tiles face down.';
    // A concealed Kan is shown as in real Mahjong: the two end tiles face down, the middle two face up.
    m.tiles.forEach((t, k) => w.appendChild(tileEl(t, { small: true, called: t.id === m.calledId, back: m.closed && m.type === 'kan' && (k === 0 || k === 3) }))); box.appendChild(w); }
}
function renderRiver() {
  const box = $('#river'); box.innerHTML = '';
  $('#riverInfo').textContent = S.boss === 'fisherman' ? 'The Fisherman forbids Calls and claims this Blind.' : canClaim() ? `Select one plus 2–3 hand tiles to Call, or plus the other ${neededConcealed() - 1} of a complete hand to claim it with Kawauso.` : 'Select one plus 2–3 hand tiles to Call. Discards stay here all Blind.';
  for (const t of S.river) { const e = tileEl(t, { small: true, sel: S.selRiver === t.id }); e.onclick = () => { if (S.phase !== 'blind') return; S.selRiver = S.selRiver === t.id ? null : t.id; render(); }; box.appendChild(e); }
  if (!S.river.length) box.innerHTML = '<span class="muted empty">No discards yet</span>';
}
// Balatro's two sort buttons: by suit (Characters, Dots, Bamboo, Honors) or by rank (all 1s, then 2s; Honors last).
function sortHandTiles(arr) { if (S.sortMode !== 'rank') return sortTiles(arr); return arr.slice().sort((a, b) => (isHonor(a) ? 10 : 0) - (isHonor(b) ? 10 : 0) || a.rank - b.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || (b.red ? 1 : 0) - (a.red ? 1 : 0)); }
function renderHand() {
  const box = $('#hand'); box.innerHTML = '';
  const hidden = S.hand.some(isFaceDown);
  // Sorting works against The Purist too: face-down tiles keep their true sorted spot, a slight hint of what they are.
  if (S.sortHand) S.hand = sortHandTiles(S.hand);
  const tiles = S.hand;
  for (const t of tiles) { const e = tileEl(t, { sel: S.selected.includes(t.id), back: isFaceDown(t) }); if (tileDebuffed(t, S) && S.phase === 'blind') e.classList.add('debuffed'); e.dataset.id = t.id; bindTileDrag(e, t); box.appendChild(e); }
  S.newIds = [];
  $('#handZone').classList.toggle('pending', !!S.pendingDiscard);
  $('#callBanner').hidden = !S.pendingDiscard; if (S.pendingDiscard) $('#callBanner').textContent = `Call made. Discard ${S.pendingDiscard} tile to settle it before you can Play again.`;
  const over = S.hand.length - capacity();
  $('#handInfo').textContent = (over > 0 && !S.pendingDiscard ? `${S.hand.length} tiles (${over} over the limit of ${capacity()}: no draw until you are back under it)` : `${S.hand.length} / ${capacity()} tiles`) + ` · ${S.selected.length} selected · complete hand needs ${neededConcealed()} from hand`;
  renderHint(hidden);
  $('#btnSortMode').textContent = S.sortMode === 'rank' ? 'By Rank' : 'By Suit'; $('#btnSortMode').title = S.sortMode === 'rank' ? 'Sorted by rank (1s together, then 2s…). Click to sort by suit.' : 'Sorted by suit. Click to sort by rank, like Balatro.';
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
  const vis = hidden ? S.hand.filter(t => !isFaceDown(t)) : S.hand;
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
    if (hidden) parts.push(`<span class="hint-sel muted">face-down tiles are not counted${S.boss === 'purist' ? ' (they are 1s, 9s, Winds or Dragons)' : S.boss === 'mark' ? ' (they are Winds or Dragons)' : ''}</span>`);
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
    parts.push(best ? `<span class="hint-sel bad">complete hand with ${tileName(rtc)} claimed from the River${hasTal(S, 'kappa') ? ': Kappa bonus' : ': Furiten, ×0.5'}</span>` : `<span class="hint-sel muted">${tileName(rtc)} from the River does not complete these tiles</span>`);
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
// The purse coin follows the terminology: a brass 5-yen coin (holed, a lucky coin in Japan) or a silver HK$2 coin
// (scalloped edge, bauhinia flower).
function coinSVG() {
  if (LANG === 'hk') {
    const sc = Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2; return `<circle cx="${(20 + Math.cos(a) * 15.2).toFixed(2)}" cy="${(20 + Math.sin(a) * 15.2).toFixed(2)}" r="4.6"/>`; }).join('');
    const petals = Array.from({ length: 5 }, (_, k) => `<ellipse cx="20" cy="13.6" rx="3.1" ry="5.4" transform="rotate(${k * 72 + 12} 20 20)"/>`).join('');
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="hkc" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#d5dae1"/><stop offset="1" stop-color="#8d96a3"/></radialGradient></defs><g fill="url(#hkc)" stroke="#6f7884" stroke-width=".6">${sc}<circle cx="20" cy="20" r="15.6"/></g><circle cx="20" cy="20" r="13.2" fill="none" stroke="rgba(90,98,110,.55)" stroke-width=".8"/><g fill="rgba(110,118,130,.55)">${petals}</g><circle cx="20" cy="20" r="1.8" fill="#eef1f5"/></svg>`;
  }
  const teeth = Array.from({ length: 12 }, (_, k) => `<rect x="19.2" y="10.2" width="1.6" height="2.6" rx=".4" transform="rotate(${k * 30} 20 20)"/>`).join('');
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="jpc" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#e2b04c"/><stop offset="1" stop-color="#94661c"/></radialGradient></defs><circle cx="20" cy="20" r="19" fill="url(#jpc)" stroke="#7a5414" stroke-width=".8"/><circle cx="20" cy="20" r="16.6" fill="none" stroke="rgba(122,84,20,.55)" stroke-width=".8"/><g fill="rgba(122,84,20,.7)">${teeth}</g><circle cx="20" cy="20" r="5" fill="#1d140a" stroke="#7a5414" stroke-width=".8"/><path d="M11 27.5h18M13 30.5h14M15.5 33.2h9" stroke="rgba(122,84,20,.65)" stroke-width="1.1" stroke-linecap="round"/><path d="M9.5 21c0-4 1.6-7.4 4.4-9.6M30.5 21c0-4-1.6-7.4-4.4-9.6" stroke="rgba(122,84,20,.55)" stroke-width="1" fill="none" stroke-dasharray="1.6 1.4"/></svg>`;
}
// The Wall count ticks down when tiles are drawn instead of jumping (0.35 s), then gives a small bounce.
// The panel is redrawn on every render, so the count shown so far is kept here and the tween resumes from it.
let wallShown = null, wallTween = 0, wallToken = 0;
function tickWall() {
  const el = $('#wallBtn .wv'); if (!el) return; const target = +el.textContent;
  if (wallShown === null || target >= wallShown || !motionOK) { wallShown = target; return; }
  const from = wallShown, t0 = performance.now(), dur = 350; el.textContent = from; cancelAnimationFrame(wallTween);
  const step = now => { const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 2))); if (v !== wallShown) sfx('wall'); wallShown = v; const cur = $('#wallBtn .wv'); if (cur) cur.textContent = v;
    if (k < 1) wallTween = requestAnimationFrame(step); else { wallShown = target; if (cur) juice(cur, .5); } };
  wallTween = requestAnimationFrame(step);
  const token = ++wallToken; setTimeout(() => { if (token !== wallToken) return; const cur = $('#wallBtn .wv'); if (cur) cur.textContent = target; wallShown = target; }, dur + 300);   // safety if frames are paused; only the latest countdown may finish it
}
let lastPurse = null;
function bumpPurse() { const el = $('#purseVal'); if (!el) return; if (lastPurse !== null && lastPurse !== S.money) juice(el, .8); lastPurse = S.money; }
function renderActions() {
  bumpPurse(); tickWall();
  const inBlind = S.phase === 'blind';
  const opt = inBlind ? playOption() : { err: '' };
  const hid = inBlind && hiddenSelected() && S.plays > 0 && !S.pendingDiscard;   // face-down tiles: never say in advance whether the selection is a valid play
  // Each action button says what it will do, or why it can't, and the Play and Discard buttons show what is left as dots.
  const pips = n => n > 8 ? `<b class="num">${n}</b>` : Array.from({ length: Math.max(0, n) }, () => '<i></i>').join('');
  // No changing tooltips on these buttons: browsers can keep showing a cached one (for example a Pung from the last Blind),
  // and the line under each button already says the same thing.
  const sub = (id, text) => { const el = $(id); let t = tr(text || ''); t = t.charAt(0).toUpperCase() + t.slice(1); if (el.textContent !== t) el.textContent = t; };
  const bp = $('#btnPlay'); bp.disabled = !inBlind || (!!opt.err && !hid) || S.busy;
  const pv = PREVIEW && PREVIEW.ctx ? PREVIEW.label : '';   // the play's name only: the score is revealed by the scoring animation
  sub('#playSub', !inBlind ? '' : hid ? 'face-down tiles: plays its best part' : opt.err ? (S.selected.length ? opt.err.replace(/\.$/, '') : 'select tiles to play') : pv || (opt.label || '').replace(/^Play /, ''));
  $('#playPips').innerHTML = inBlind ? pips(S.plays) : '';
  // Live tooltips (part of the page, rewritten every render, so never stale; they also show on disabled buttons).
  // Native tooltips live on each button's wrapper: a disabled button gets no mouse events, so Chrome would keep the tooltip
  // from when it was last enabled (the stale Pung); the wrapper always gets them and Chrome reads its current title.
  const tipOn = (btn, text) => { const w = $(btn).parentElement; const t = tr(text || ''); if (w.title !== t) w.title = t; };
  tipOn('#btnPlay', !inBlind ? '' : hid ? 'Face-down tiles selected' : (opt.err || pv));
  const maxD = S.boss === 'monk' ? 3 : CFG.maxDiscardTiles, tooMany = !S.pendingDiscard && S.selected.length > maxD;
  const bd = $('#btnDiscard'); bd.disabled = !inBlind || S.busy || (!S.pendingDiscard && (S.discards <= 0 || !S.selected.length)) || (S.pendingDiscard && S.selected.length !== S.pendingDiscard) || tooMany;
  const nSel = S.selected.length;
  $('#discTitle').textContent = S.pendingDiscard ? `Discard ${S.pendingDiscard}` : nSel ? `Discard ${nSel}` : 'Discard';
  sub('#discSub', !inBlind ? '' : S.pendingDiscard ? (nSel === S.pendingDiscard ? 'settles your Call' : `select ${S.pendingDiscard} to settle your Call`) : S.discards <= 0 ? 'no Discards left' : tooMany ? `at most ${maxD} at once` : nSel ? `draws ${nSel} new tile${nSel === 1 ? '' : 's'}` : `select up to ${maxD} tiles`);
  $('#discPips').innerHTML = inBlind && !S.pendingDiscard ? pips(S.discards) : ''; bd.classList.toggle('pulse', !!S.pendingDiscard);
  tipOn('#btnDiscard', $('#discSub').textContent);
  const dk = $('#btnKan'); const dko = declareOption(); dk.disabled = !dko.ok;
  sub('#kanSub', !inBlind ? '' : dko.ok ? 'draws a replacement tile' : 'needs 4 alike in your hand');
  tipOn('#btnKan', dko.err || 'Set these 4 tiles aside as a closed Kan and draw a replacement tile');
  $('#preview').innerHTML = '';
  const bc = $('#btnCall'); bc.disabled = !inBlind || S.busy || !S.selRiver || S.selected.length < 2;
  const freeMax = liveTals(S).reduce((m, k) => Math.max(m, +TAL[k].freeCall || 0), 0), freeLeft = Math.max(0, freeMax - (S.freeCallsUsed || 0));
  const callNote = !inBlind ? '' : S.boss === 'fisherman' ? 'The Fisherman forbids it' : !S.selRiver ? 'pick a River tile first' : S.selected.length < 2 ? 'plus 2–3 hand tiles' : freeLeft ? `free (${freeLeft} left)` : 'costs 1 Play';
  sub('#callSub', callNote); tipOn('#btnCall', tr(callNote).charAt(0).toUpperCase() + tr(callNote).slice(1));
  $('#btnClear').disabled = !inBlind || S.busy;
}
// Breakdown line styling, shared by the live log and the finished Last Play.
const lineCls = l => (l.zero ? ' bad' : '') + (l.yaku ? ' yaku' : '') + (l.tal ? ' tal' : '') + (l.convert ? ' convert' : '');
const lastSummaryHTML = c => `<div class="formula num" style="margin-top:6px">${c.han} Han → ${c.tier} ×${c.baseMult}${c.xmult !== 1 ? ` · tiles ×${fmtMult(c.xmult)}` : ''}${c.mult !== c.baseMult * c.xmult ? ` → ×${fmtMult(c.mult)} after Talismans${c.furiten ? ' and Furiten' : ''}` : ''}</div><div class="total num">${c.chips} × ${fmtMult(c.mult)} = ${fmtN(c.total)}</div>`;
function renderLast() {
  const c = S.lastPlay; const box = $('#lastPlay');
  if (!c) { box.innerHTML = `<div class="label">Last Play</div><div class="muted" style="font-size:12px;margin-top:4px">Nothing scored yet. Best this run: ${fmtN(S.stats.best)}${S.stats.bestDesc ? ' (' + S.stats.bestDesc + ')' : ''}</div>`; return; }
  let h = `<div class="label">Last Play</div><div style="font-family:var(--display);font-size:15px;margin:2px 0 6px">${c.desc}</div>`;
  if (c.kind === 'meld' && c.nMelds >= 2) h += `<div class="muted" style="font-size:11px;margin:-4px 0 6px">${c.nChi ? c.nChi + ' Chi ' : ''}${c.nPon ? c.nPon + ' Pon ' : ''}${c.nKan ? c.nKan + ' Kan ' : ''}${c.hasPair ? '+ pair' : ''}</div>`;
  // Same order and colours as the animated log left them (c.order), so the panel does not change when scoring ends.
  const order = c.order ? c.order.concat(c.lines.map((_, i) => i).filter(i => !c.order.includes(i))) : c.lines.map((_, i) => i);
  for (const i of order) { const l = c.lines[i]; h += `<div class="row lrow${lineCls(l)}"><span>${l.label}</span><span class="num">${l.val}</span></div>`; }
  h += lastSummaryHTML(c);
  box.innerHTML = h;
}
function popScore(n) { const p = document.createElement('div'); p.className = 'score-pop num'; p.textContent = '+' + fmtN(n); $('#pop').appendChild(p); setTimeout(() => p.remove(), 1500); }

// ===================== HAND DRAG & DROP =====================
let drag = null;
// ===================== LIVE DRAG =====================
// Like Balatro: the dragged tile or Talisman floats under the pointer (tilting with its motion) while a gap moves
// through the row and the others slide aside to make room. Shared by the hand and the Talisman slots.
const layoutRect = e => { const r = e.getBoundingClientRect(), m = new DOMMatrixReadOnly(getComputedStyle(e).transform); return { left: r.left - m.e, top: r.top - m.f, width: r.width, height: r.height }; };
function liveDragStart(el, items) {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const ph = document.createElement('div'); ph.className = 'dragph'; Object.assign(ph.style, { width: r.width + 'px', height: r.height + 'px', flex: cs.flex, margin: cs.margin });
  el.parentElement.insertBefore(ph, el);
  Object.assign(el.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '60' });
  return { ph, items, lastX: null, tilt: 0 };
}
function liveDragMove(st, el, x, y, dx, dy) {
  if (st.lastX !== null) st.tilt = Math.max(-4, Math.min(4, st.tilt * .75 + (x - st.lastX) * .25)); st.lastX = x;
  el.style.transform = `translate(${dx}px,${dy}px) scale(1.08) rotate(${st.tilt.toFixed(1)}deg)`;
  const items = st.items; let idx = items.length;
  for (let i = 0; i < items.length; i++) { const r = layoutRect(items[i]); if (y < r.top - 6) { idx = i; break; } if (y <= r.top + r.height + 6 && x < r.left + r.width / 2) { idx = i; break; } }
  const cur = items.filter(e => st.ph.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING).length;
  if (idx === cur) return;
  const before = new Map(items.map(e => [e, e.getBoundingClientRect()]));
  if (idx < items.length) items[idx].before(st.ph); else items[items.length - 1].after(st.ph);
  for (const e of items) {
    const a = before.get(e); (e._slide && e._slide.cancel()); const b = e.getBoundingClientRect(), base = getComputedStyle(e).transform, bs = base === 'none' ? '' : base;
    if (Math.abs(a.left - b.left) > .5 || Math.abs(a.top - b.top) > .5) e._slide = e.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) ${bs}` }, { transform: bs || 'none' }], { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}
// Where the gap ended up, counted among the other items.
const liveDragIndex = st => st.items.filter(e => st.ph.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING).length;
function liveDragCancel(st, el) { st.ph.remove(); ['position', 'left', 'top', 'width', 'height', 'margin', 'zIndex', 'transform'].forEach(k => el.style[k] = ''); }
function bindTileDrag(el, t) {
  el.addEventListener('pointerdown', e => { if (S.phase !== 'blind' || S.busy || e.button) return; drag = { t, el, x: e.clientX, y: e.clientY, moved: false }; try { el.setPointerCapture(e.pointerId); } catch (err) { } });
  el.addEventListener('pointermove', e => {
    if (!drag || drag.el !== el) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; el.classList.add('dragging'); drag.live = liveDragStart(el, [...$('#hand').children].filter(x => x !== el && x.classList.contains('tile'))); }
    if (drag.moved) liveDragMove(drag.live, el, e.clientX, e.clientY, dx, dy);
  });
  const finish = e => {
    if (!drag || drag.el !== el) return; const d = drag; drag = null;
    // On drop the hand is re-rendered in its new order; the tile glides from where it floats into the gap.
    if (d.moved && e.type === 'pointerup') { const idx = liveDragIndex(d.live); d.live.ph.remove(); el.classList.remove('dragging'); const rest = S.hand.filter(x => x !== d.t); rest.splice(idx, 0, d.t); S.hand = rest; S.sortHand = false; render(); return; }
    if (d.live) { liveDragCancel(d.live, el); render(); return; } el.style.transform = ''; el.classList.remove('dragging');
    if (!d.moved && e.type === 'pointerup') { sfx(S.selected.includes(t.id) ? 'deselect' : 'select'); S.selected = S.selected.includes(t.id) ? S.selected.filter(x => x !== t.id) : [...S.selected, t.id]; render(); }
  };
  el.addEventListener('pointerup', finish); el.addEventListener('pointercancel', finish);
}
// Talisman slots: drag to reorder (they fire left to right), tap to select for selling.
let slotDrag = null;
function bindSlotDrag(el, k) {
  el.dataset.key = k;
  el.addEventListener('pointerdown', e => { if (S.busy || e.button) return; slotDrag = { k, el, x: e.clientX, y: e.clientY, moved: false }; try { el.setPointerCapture(e.pointerId); } catch (err) { } });
  el.addEventListener('pointermove', e => {
    if (!slotDrag || slotDrag.el !== el) return; const dx = e.clientX - slotDrag.x, dy = e.clientY - slotDrag.y;
    if (!slotDrag.moved && Math.hypot(dx, dy) > 8) { slotDrag.moved = true; el.classList.add('dragging'); slotDrag.live = liveDragStart(el, [...$('#talismans').children].filter(x => x !== el && x.classList.contains('filled'))); }
    if (slotDrag.moved) liveDragMove(slotDrag.live, el, e.clientX, e.clientY, dx, dy);
  });
  const finish = e => {
    if (!slotDrag || slotDrag.el !== el) return; const d = slotDrag; slotDrag = null;
    if (d.moved && e.type === 'pointerup') { const idx = liveDragIndex(d.live); const from = el.getBoundingClientRect(); liveDragCancel(d.live, el); el.classList.remove('dragging'); const rest = S.talismans.filter(x => x !== d.k); rest.splice(idx, 0, d.k); S.talismans = rest; render(); glideSlot(d.k, from); return; }
    if (d.live) { liveDragCancel(d.live, el); } el.style.transform = ''; el.classList.remove('dragging');
    if (!d.moved && e.type === 'pointerup') { S.selTal = S.selTal === k ? null : k; render(); }
  };
  el.addEventListener('pointerup', finish); el.addEventListener('pointercancel', finish);
}
// After a Talisman drop, the slot glides from where it was released into its new place.
function glideSlot(k, from) { if (!motionOK) return; const el = [...$('#talismans').children].find(x => x.dataset.key === k); if (!el) return; const to = el.getBoundingClientRect(); el.animate([{ transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(1.06)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
// ===================== SCORING ANIMATION =====================
const motionOK = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let skipAnim = false, skipArmed = false;
function wait(ms) { return new Promise(r => setTimeout(r, (motionOK && !skipAnim) ? Math.round(ms * SPEEDS[ANIM_SPEED]) : 0)); }
// Balatro's "juice", copied from its curve: size wobbles as sin(50.8 t) fading with (1 - t/T)^3 and tilt as sin(40.8 t)
// fading with (1 - t/T)^2, over T = 0.4 s. Each kick is its own wave that starts at zero and they add up, so a run of
// fast hits keeps wobbling without ever snapping back. One rAF loop drives every juiced element.
const JUICE = new Map(); let juiceRAF = 0;
function juice(el, amt = 1) {
  if (!el || !motionOK || skipAnim) return;
  let list = JUICE.get(el); if (!list) { list = []; JUICE.set(el, list); }
  list.push({ t0: performance.now(), s: .32 * amt, r: (Math.random() < .5 ? -1 : 1) * 7 * amt }); if (list.length > 4) list.shift();
  if (juiceRAF) return;
  const T = 400;
  const step = now => {
    let alive = false;
    for (const [e, kicks] of JUICE) {
      let sc = 0, rot = 0;
      for (let k = kicks.length - 1; k >= 0; k--) {
        const t = now - kicks[k].t0, f = 1 - t / T;
        if (f <= 0) { kicks.splice(k, 1); continue; }
        const ts = t / 1000; sc += kicks[k].s * Math.sin(50.8 * ts) * f * f * f; rot += kicks[k].r * Math.sin(40.8 * ts) * f * f;
      }
      if (!kicks.length || !e.isConnected) { e.style.transform = ''; JUICE.delete(e); continue; }
      alive = true; e.style.transform = `scale(${(1 + Math.max(-.25, Math.min(.6, sc))).toFixed(3)}) rotate(${Math.max(-12, Math.min(12, rot)).toFixed(2)}deg)`;
    }
    juiceRAF = alive ? requestAnimationFrame(step) : 0;
  };
  juiceRAF = requestAnimationFrame(step);
}
async function animateScore(ctx) {
  hideTileTip();
  skipAnim = false; skipArmed = false; setTimeout(() => { skipArmed = true; }, 250);
  const box = $('#scorebox'); if (!box) return;
  const label = ctx.kind === 'hand' ? (ctx.yaku.length ? ctx.yaku.map(y => y.name).join(', ') : 'Complete Hand') : ctx.rungName;
  box.innerHTML = `${titleHTML(tr(label || ''), playLevel(ctx.kind, ctx.meldType), ctx.claimed)}${mathBoxes(0, 1, 0)}`; box.title = 'Click anywhere to skip'; fitTitle(box.querySelector('.hb-title'));
  // the breakdown streams into the Last Play panel as it happens
  const lp = $('#lastPlay'); lp.innerHTML = `<div class="label">Last Play</div><div style="font-family:var(--display);font-size:15px;margin:2px 0 6px">${tr(ctx.desc)}</div><div class="lp-lines"></div>`;
  const chipsBox = box.querySelector('.chipbox'), multBox = box.querySelector('.multbox'), chipsEl = chipsBox.querySelector('.nv'), multEl = multBox.querySelector('.nv'), totEl = box.querySelector('.hb-tot'), totWrap = totEl, nameEl = box.querySelector('.hb-title'), linesBox = lp.querySelector('.lp-lines'), mathEl = box.querySelector('.hb-math'), hanEl = box.querySelector('.hanval'), hanPill = box.querySelector('.hanfoot'), tierEl = box.querySelector('.hanfoot .hantier');
  const tileEls = new Map(); document.querySelectorAll('#hand .tile[data-id], #open .tile[data-id]').forEach(e => tileEls.set(+e.dataset.id, e));
  let chips = 0, han = 0, tileX = 1, tileM = 0, mult = null;
  const curMult = () => mult === null ? hanMult(han) * tileX + tileM : mult;
  let lastChips = null, lastMult = null, lastHan = null; const fitLen = { c: 0, m: 0 }; let chipN = 0, multN = 0;
  const bump = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const setMath = () => {
    const c = Math.max(0, Math.round(chips)), m = fmtMult(curMult());
    chipsEl.textContent = c; multEl.textContent = m;
    // Like Balatro: the numbers pop and wobble, the boxes stay put.
    if (lastChips !== null && c !== lastChips) { juice(chipsEl); sfx('chip', chipN++); } if (lastMult !== null && m !== lastMult) { juice(multEl, 1.15); sfx(+m >= +lastMult * 1.4 && lastMult > 1 ? 'xmult' : 'mult', multN++); }
    const hv = Math.round(han); hanEl.textContent = hv; tierEl.textContent = tr(tierText(hv)); hanPill.classList.toggle('done', mult !== null);
    if (lastHan !== null && hv !== lastHan) juice(hanPill.querySelector('.hanline'), .6);
    // Re-fit only when the number of characters changes, so layout isn't recalculated on every tick.
    const cl = String(c).length, ml = String(m).length; if (cl !== fitLen.c) { fitLen.c = cl; fitText(chipsBox); } if (ml !== fitLen.m) { fitLen.m = ml; fitText(multBox); }
    lastChips = c; lastMult = m; lastHan = hv; fitFoot(hanPill);
  };
  const showLine = l => { const d = document.createElement('div'); d.className = 'row sline' + lineCls(l); d.dataset.li = ctx.lines.indexOf(l); d.innerHTML = `<span>${tr(l.label)}</span><span class="num">${tr(l.val)}</span>`; linesBox.appendChild(d); if (l.tal && !/retrigger/.test(l.label)) { const slot = document.querySelector(`.slot[data-tal="${l.tal}"]`); if (slot) { slot.classList.remove('bounce'); void slot.offsetWidth; slot.classList.add('bounce');
      // the Talisman's effect pops under its slot, coloured like the tile badges
      const v = /retrigger/.test(l.label) ? '' : tr(l.val || ''); if (v) { const kind = /×|^x/i.test(v) ? 'x' : /Mult/.test(v) ? 'mult' : /Chip/.test(v) ? 'chips' : /Han|Faan/.test(v) ? 'han' : /[¥$]/.test(v) ? 'money' : 'info'; const f = document.createElement('div'); f.className = 'talpop num'; f.innerHTML = `<span class="hp ${kind}">${v}</span>`; slot.appendChild(f); setTimeout(() => f.remove(), 1100); } } } };
  const applyLine = l => { if (l.zero) chips = 0; else { chips += l.chips || 0; han += l.han || 0; if (l.convert) mult = hanMult(han) * tileX + tileM; if (l.mult) mult = (mult === null ? hanMult(han) * tileX + tileM : mult) + l.mult; if (l.xmult && mult !== null) mult *= l.xmult; } setMath(); };
  let fire = 0;
  // Hanabi: once a play beats the target, rockets shoot up from below the Chips and Mult boxes and burst above them.
  // One rocket at 1x the target, two more at 3x, three more at 10x and then one every 0.7 s until scoring ends.
  // Only transform and opacity animate, so it stays smooth.
  const fx = document.createElement('div'); fx.className = 'fxlayer'; fx.setAttribute('aria-hidden', 'true'); box.appendChild(fx);
  const FW = ['#ffd27a', '#7fd0ff', '#ff8a7a', '#f6b6c8', '#c9a7e8', '#bff3d1'];
  let fwTimer = null;
  const burst = (x, y, col) => {
    if (!fx.isConnected) return; sfx('pop');
    const n = 16 + fire * 4, R = 24 + fire * 9;
    const fl = document.createElement('i'); fl.className = 'fwflash'; fl.style.cssText = `left:${x}px;top:${y}px;--c:${col}`; fx.appendChild(fl);
    fl.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .95 }, { transform: 'translate(-50%,-50%) scale(1.7)', opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'both' }).onfinish = () => fl.remove();
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + Math.random() * .25, d = R * (.75 + Math.random() * .4), dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      const sp = document.createElement('i'); sp.className = 'fwspark'; sp.style.cssText = `left:${x}px;top:${y}px;background:${Math.random() < .25 ? '#fff8e6' : col}`; fx.appendChild(sp);
      sp.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.85)`, opacity: 1, offset: .55 }, { transform: `translate(calc(-50% + ${dx * 1.1}px),calc(-50% + ${dy * 1.1 + 16}px)) scale(.3)`, opacity: 0 }],
        { duration: 900 + Math.random() * 250, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'both' }).onfinish = () => sp.remove();
    }
  };
  const launch = () => {
    if (!motionOK || skipAnim || !fx.isConnected) return;
    const W = box.clientWidth, top = mathEl.offsetTop, y0 = top + mathEl.offsetHeight - 4, x = W * (.12 + Math.random() * .76), y1 = top - 18 - Math.random() * 46, col = FW[Math.floor(Math.random() * FW.length)];
    const r = document.createElement('i'); r.className = 'fwrocket'; r.style.cssText = `left:${x}px;top:${y0}px;--c:${col}`; fx.appendChild(r);
    r.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${y1 - y0}px)`, opacity: 1 }], { duration: 420 + Math.random() * 140, easing: 'cubic-bezier(.25,.6,.45,1)', fill: 'both' }).onfinish = () => { r.remove(); burst(x, y1, col); };
  };
  const heat = () => {
    const tot = Math.max(0, chips) * curMult(), q = S.target ? tot / S.target : 0, lvl = q >= 10 ? 3 : q >= 3 ? 2 : q >= 1 ? 1 : 0;
    if (lvl <= fire) return; const prev = fire; fire = lvl; box.dataset.fire = lvl; box.classList.toggle('hot', lvl >= 1);
    if (lvl >= 2 && SHAKE && motionOK) { const bd = document.querySelector('.board'); if (bd) bd.animate([{ transform: 'none' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(-2px,2px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'none' }], { duration: lvl === 3 ? 420 : 300, easing: 'ease-out' }); }
    // The original fire: embers rising behind the Chips and Mult boxes (8 at 1x the target, 6 more at 3x and at 10x).
    let embers = box.querySelector('.emberlayer'); if (!embers) { embers = document.createElement('div'); embers.className = 'emberlayer'; embers.setAttribute('aria-hidden', 'true'); box.insertBefore(embers, box.firstChild); }
    const addN = [0, 8, 14, 20][lvl] - [0, 8, 14, 20][prev]; for (let i = 0; i < addN; i++) { const em = document.createElement('i'); em.className = 'ember'; em.style.left = (8 + Math.random() * 84) + '%'; em.style.animationDelay = (Math.random() * 1.2) + 's'; em.style.animationDuration = (1 + Math.random()) + 's'; embers.appendChild(em); }
    const n = [0, 1, 3, 6][lvl] - [0, 1, 3, 6][prev]; for (let k = 0; k < n; k++) setTimeout(launch, k * 170);
    if (lvl === 3 && !fwTimer) fwTimer = setInterval(launch, 700);
  };
  setMath();
  // Start from exactly what the hand box previewed: the play's base, its Scroll levels and the Yaku that name the hand.
  // Tiles, Dora, engravings and Talismans are then revealed on top of that, so the Han count only ever climbs.
  const isStart = l => l.base || l.yaku || /^Scroll:/.test(l.label) || (ctx.kind === 'hand' && /^Yakuhai/.test(l.label));
  for (const l of ctx.lines) if (isStart(l)) { showLine(l); applyLine(l); }
  lastChips = null; lastMult = null; lastHan = null; setMath(); heat(); await wait(320);
  // Like Balatro: every tile scores once in order (a Red Seal replays its tile straight away), then the retrigger
  // Talismans fire left to right, each popping with Again! and replaying the tiles it affects. Only the order of the
  // reveal changes; the totals are the engine's.
  const perOf = h => ({ chips: h.chips / h.times, han: h.han / h.times, x: Math.pow(h.xmult, 1 / h.times), m: (h.mult || 0) / h.times, money: (h.money || 0) / h.times });
  const popSlot = (el, text, cls) => { if (!el) return; el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); const g = document.createElement('div'); g.className = 'talpop num'; g.innerHTML = `<span class="hp ${cls}">${text}</span>`; el.appendChild(g); setTimeout(() => g.remove(), 900); };
  const hitOnce = async (h, again) => {
    const e = tileEls.get(h.id), per = perOf(h);
    if (e) { e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit');
      const pills = [again ? ['again', 'Again!'] : null, per.chips ? ['chips', `+${Math.round(per.chips)}`] : null, per.han ? ['han', tr(`+${per.han} Han`)] : null, per.m ? ['mult', `+${fmtMult(per.m)} Mult`] : null, per.x !== 1 ? ['x', `×${fmtMult(per.x)}`] : null, per.money >= 1 ? ['money', `+¥${Math.round(per.money)}`] : null].filter(Boolean);
      const f = document.createElement('div'); f.className = 'hitpop num'; f.innerHTML = pills.map(([c, t]) => `<span class="hp ${c}">${t}</span>`).join(''); e.appendChild(f); setTimeout(() => f.remove(), 950); }
    chips += per.chips; han += per.han; tileX *= per.x; tileM += per.m; setMath(); heat(); logHit(h, per);
    await wait(again ? 220 : 150);
  };
  const charmNames = new Set(S.talismans.map(k => TAL[k].name));
  // Breakdown in step with the animation: the tiles line, tile effects (Red Five, Dora, Dragon Mark, Jade, Gold Foil,
  // Glass) and Red Seal replays appear as they happen and count up live; each retrigger Talisman's line appears when
  // it fires. Values are scaled from the engine's final lines, which are restored exactly at the end.
  const live = new Map();
  const EFF_RE = '(Red Five|Dora|Dragon Mark|Jade|Gold Foil|Glass|Gold Seal|Foil tile|Holo tile|Poly tile|Crimson|Lucky)';
  const keyOf = l => l.tiles ? 'tiles' : /: retrigger ×/.test(l.label) ? l.label.split(':')[0] : (new RegExp('^' + EFF_RE + ' ×').exec(l.label) || [])[1];
  const liveRow = (key, label, val, cls) => { let o = live.get(key); if (!o) { const d = document.createElement('div'); d.className = 'row sline' + (cls ? ' ' + cls : ''); const li = ctx.lines.findIndex(l => keyOf(l) === key); if (li >= 0) d.dataset.li = li; d.innerHTML = '<span></span><span class="num"></span>'; linesBox.appendChild(d); o = { d }; live.set(key, o); } o.d.children[0].textContent = tr(label); o.d.children[1].textContent = tr(val); };
  const tilesLine = ctx.lines.find(l => l.tiles), EFFECTS = ['Red Five', 'Dora', 'Dragon Mark', 'Jade', 'Gold Foil', 'Glass'];
  const finalEff = {}; for (const l of ctx.lines) { const m = new RegExp('^' + EFF_RE + ' ×(\\d+)$').exec(l.label); if (m) finalEff[m[1]] = { n: +m[2], line: l }; }
  const effOf = id => { const t = ctx.tiles.find(x => x.id === id); if (!t) return []; const out = []; if (t.red) out.push('Red Five'); const nd = (S.dora || []).filter(d => d === idx(t)).length; for (let q = 0; q < nd; q++) out.push('Dora'); if (t.eng === 'dragonmark') out.push('Dragon Mark'); if (t.eng === 'jade') out.push('Jade'); if (t.eng === 'gold') out.push('Gold Foil'); if (t.eng === 'glass') out.push('Glass'); if (t.seal === 'gold') out.push('Gold Seal'); if (t.ed === 'foil') out.push('Foil tile'); if (t.ed === 'holo') out.push('Holo tile'); if (t.ed === 'poly') out.push('Poly tile'); if (t.eng === 'mult') out.push('Crimson'); if (t.eng === 'lucky') out.push('Lucky'); return out.filter(e => finalEff[e]); };
  // Each effect's share is measured in scored occurrences (replays included), since the engine counts some effects
  // per tile and some per occurrence; the label count and the value both grow in proportion.
  const totOcc = {}; for (const h of ctx.hits) for (const e of effOf(h.id)) totOcc[e] = (totOcc[e] || 0) + h.times;
  const effVal = (e, occ) => { const f = finalEff[e], v = f.line.val, k = occ / (totOcc[e] || 1); let m;
    if ((m = /^\+(\d+) Han$/.exec(v))) return `+${Math.round(+m[1] * k)} Han`;
    if ((m = /^×([\d.]+) Mult$/.exec(v))) return `×${fmtMult(Math.pow(+m[1], k))} Mult`;
    if ((m = /^\+¥(\d+)$/.exec(v))) return `+¥${Math.round(+m[1] * k)}`;
    if ((m = /^\+(\d+) (Chips|Mult)$/.exec(v))) return `+${Math.round(+m[1] * k)} ${m[2]}`; return v; };
  const effCount = {}; let tileChipSum = 0;
  const logHit = (h, per) => {
    tileChipSum += per.chips; if (tilesLine) liveRow('tiles', tilesLine.label, `+${Math.round(tileChipSum)} Chips`);
    for (const e of effOf(h.id)) { effCount[e] = (effCount[e] || 0) + 1; const occ = effCount[e], n = Math.max(1, Math.round(finalEff[e].n * occ / (totOcc[e] || 1))); liveRow(e, `${e} ×${n}`, effVal(e, occ)); }
  };
  // Balatro order: each tile scores, then its replays follow straight away in the engine's order (Red Seal first,
  // then retrigger Talismans left to right). The Talisman behind each replay pops with Again! as it happens.
  const sources = {};
  for (const h of ctx.hits) {
    for (let r = 0; r < h.times; r++) {
      if (r > 0) { const src = (h.who || [])[r - 1] || 'Red Seal'; sources[src] = (sources[src] || 0) + 1;
        if (charmNames.has(src)) popSlot(document.querySelector(`.slot[data-tal="${src}"]`), 'Again!', 'again');
        liveRow(src, `${src}: retrigger ×${sources[src]}`, 'tiles scored again', 'tal'); }
      await hitOnce(h, r > 0);
    }
    const e = tileEls.get(h.id); if (e) e.classList.remove('hit');
  }
  const liveKey = keyOf;
  for (const l of ctx.lines) { const k = liveKey(l); if (k && live.has(k)) liveRow(k, l.label, l.val); }
  for (const l of ctx.lines) { const k = liveKey(l); if (isStart(l) || (k && live.has(k))) continue; if (l.tiles) continue; showLine(l); if (!l.info) applyLine(l); heat(); await wait(180); }
  chips = ctx.chips; han = ctx.han; mult = ctx.mult; setMath(); heat();
  await wait(350);
  // the total replaces the play name, then counts down into the round score
  nameEl.hidden = true; totWrap.hidden = false; totEl.textContent = fmtN(ctx.total); totEl.classList.add('final'); fitText(totEl); sfx('total');
  ctx.order = [...linesBox.children].map(d => d.dataset.li).filter(v => v !== undefined).map(Number); linesBox.insertAdjacentHTML('afterend', lastSummaryHTML(ctx)); translateDOM(lp);
  await wait(ctx.kind === 'hand' ? 700 : 450);
  const rsEl = $('#roundScore'); const from = S.score, to = S.score + ctx.total; const dur = (motionOK && !skipAnim) ? Math.round(650 * SPEEDS[ANIM_SPEED]) : 0;
  if (rsEl) { rsEl.textContent = fmtN(to); fitText(rsEl); rsEl.textContent = fmtN(from); }
  if (dur > 0) { const t0 = performance.now(); await new Promise(res => { const step = now => { const k = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - k, 3); totEl.textContent = fmtN(Math.round(ctx.total * (1 - e))); if (rsEl) { const v = from + (to - from) * e; rsEl.textContent = fmtN(Math.round(v)); sfx('tick'); rsEl.classList.toggle('met', v >= S.target); const bar = $('#roundBar'); if (bar) bar.style.width = Math.min(100, 100 * v / S.target) + '%'; } if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
  if (rsEl) { rsEl.textContent = fmtN(to); fitText(rsEl); rsEl.classList.remove('bump'); void rsEl.offsetWidth; rsEl.classList.add('bump'); }
  await wait(250);
  if (fwTimer) clearInterval(fwTimer);
  skipAnim = false;
}
// ===================== MODALS =====================
let modalPinned = false;
const CLOSE_X = '<button class="modal-x ghost" id="mX" title="Close" aria-label="Close"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
// A modal with a Close or Cancel button can also be closed with the corner X, a click outside it, or Esc. Game-flow screens (cash-out, shop, packs, blind select) have none, so they stay put.
function modalClosable() { return !$('#overlay').hidden && !!$('#modal #mClose'); }
function closeModal() { const c = $('#modal #mClose'); if (c) c.click(); }
// Every screen's header becomes a noren banner like the shop's, coloured by context.
const BANNER_TONES = { selectmodal: 'indigo', setupmodal: 'teal', colmodal: 'teal', datamodal: 'ink', confirmmodal: 'ink', cashmodal: 'gold', overmodal: 'red', winmodal: 'gold' };
function decorateBanner(cls) {
  const m = $('#modal'); if (m.classList.contains('shopmodal') || m.classList.contains('menumodal')) return;
  const head = [...m.children].find(el => el.matches('.shophead, .cashhead, .overhead')); if (!head) return;
  const tone = (cls || '').split(' ').map(c => BANNER_TONES[c]).filter(Boolean).pop() || 'teal';
  head.classList.add('banner', 'bn-' + tone); head.insertAdjacentHTML('beforeend', '<div class="bannerflaps" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'); m.classList.add('hasbanner');
}
// Cash-out covers only the board area, like Balatro, so the left column (Blind, score and Last Play) stays in view.
// Like Balatro, the receipt rises from the bottom edge of the screen into the board's column, over the hand and action bar.
// On narrow layouts, where the left column stacks above the board, it stays full screen.
// mode 'shop': the tray fills the board below the Talisman row, which stays clear and clickable for selling.
// The tray slides up once when the Shop opens (and when a pack opens), not on every redraw.
let trayShown = '';
// A tray that is leaving (a pack closing, the Shop giving way to a pack or the next Blind) slides down off the screen first,
// quickly, and only then is the next screen drawn, which rises in its place. Clicks are ignored while it slides.
let trayLeaving = false, traySlidOut = false;   // traySlidOut: the next tray rises even if it is the same one again (a second pack of the same kind)
function trayOut(next) {
  const ov = $('#overlay'), m = $('#modal');
  if (trayLeaving) return; if (!motionOK || ov.hidden || !ov.classList.contains('boardonly')) { traySlidOut = !ov.hidden; next(); return; }
  trayLeaving = true; let done = false; const fin = () => { if (done) return; done = true; trayLeaving = false; traySlidOut = true; next(); };
  m.animate([{ transform: 'none' }, { transform: 'translateY(105%)' }], { duration: 200, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = fin; setTimeout(fin, 450);
}
// A tray rises when it first appears (or again after one slid away), and its cards are dealt in one after another: the Shop's
// once per Shop (coming back from a pack does not deal them again), a pack's every time it opens. The compact full-screen
// layout has no tray to raise but still deals.
let shopDealt = null;
function trayIn(kind) {
  const id = kind + ':' + S.ante + ':' + S.blindIndex + ':' + ((S.shop && S.shop.uid) || '') + ':' + (S.pack ? S.pack.key : ''), after = traySlidOut; traySlidOut = false;   // each Shop has its own uid, so a new run's first Shop is new too
  const fresh = trayShown !== id || after; trayShown = id; if (!fresh || !motionOK) return;
  const tray = $('#overlay').classList.contains('boardonly');
  if (tray) $('#modal').animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
  if (kind === 'shop' && shopDealt === id) return; if (kind === 'shop') shopDealt = id;
  dealIn(kind === 'pack' ? '#modal .packshelf .shopcard' : '#modal .shopshelves .shopcard', tray ? 150 : 0);
}
function dealIn(sel, start) {
  document.querySelectorAll(sel).forEach((el, i) => el.animate([{ transform: 'translateY(46px) rotate(-5deg) scale(.9)', opacity: 0 }, { transform: 'translateY(-4px) rotate(.5deg) scale(1.01)', offset: .7 }, { transform: 'none' }], { duration: 340, delay: start + i * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
}
function placeOverlay(boardOnly, mode) {
  const ov = $('#overlay'); ov.classList.remove('boardonly', 'shoptray', 'inflow'); ['left', 'top', 'width', 'height'].forEach(k => ov.style[k] = '');
  const board = document.querySelector('.board'); if (board) board.classList.remove('cashdim', 'shopdim'); if (!boardOnly || !board || innerWidth <= 900 || (mode === 'shop' && !shopTray)) return;
  const b = board.getBoundingClientRect(), top = Math.max(b.top, 0), bottom = innerHeight;   // runs to the screen's bottom edge, where the receipt rises from
  // The dimming sits on the board itself, so the page background below it keeps its colour. The Talismans stay lightly dimmed; the rest is darker.
  const tz = board.querySelector('.talzone'), cut = tz ? Math.max(0, tz.getBoundingClientRect().bottom + 4 - b.top) : 0;
  board.classList.add('cashdim'); board.classList.toggle('shopdim', mode === 'shop'); board.style.setProperty('--cut', cut + 'px');
  document.documentElement.classList.remove('modallock');   // the page behind a tray still scrolls, so Last Play can be read to the end
  // The bottom of the page without this overlay (it is fixed again at this point): a tray that is part of the page runs at
  // least this far, so it never stops short of a long Last Play in the left column.
  const pageBottom = document.documentElement.scrollHeight;
  if (mode === 'shop') {
    // The Shop tray is part of the page: it starts right under the Talisman row, spans the board border to border, and runs at
    // least to the bottom of the screen and of the board. Taller contents make the page longer, so one page scrollbar moves
    // the board, the tray and Last Play together.
    const t = tz ? tz.getBoundingClientRect().bottom + 6 : top + cut + 2;
    ov.classList.add('boardonly', 'shoptray', 'inflow'); Object.assign(ov.style, { left: b.left + scrollX + 'px', top: t + scrollY + 'px', width: b.width + 'px' });
    ov.style.setProperty('--trayMin', Math.max(innerHeight - t, b.bottom - t, pageBottom - t - scrollY, 0) + 'px'); ov.style.setProperty('--reach', '0px'); return;
  }
  ov.classList.add('boardonly'); Object.assign(ov.style, { left: b.left + 'px', top: top + 'px', width: b.width + 'px', height: (bottom - top) + 'px' });
  // The tray grows up from the screen's bottom edge until its contents sit around the middle of the screen
  // (and always far enough to cover the action bar).
  const m = $('#modal'), kids = [...m.children], ac = board.querySelector('.actions');
  const contentH = kids.length ? kids[kids.length - 1].getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top + 42 : 0;
  let trayTop = innerHeight / 2 - contentH / 2; if (ac) trayTop = Math.min(trayTop, ac.getBoundingClientRect().top - 14);
  ov.style.setProperty('--reach', Math.max(0, trayTop - top) + 'px');
  // A receipt too long for the screen becomes part of the page instead of scrolling inside itself, so one page scrollbar
  // shows the rest (like the Shop tray).
  if (contentH > bottom - top) {
    ov.classList.add('inflow'); Object.assign(ov.style, { left: b.left + scrollX + 'px', top: top + scrollY + 'px', height: '' });
    ov.style.setProperty('--trayMin', Math.max(innerHeight - top, pageBottom - top - scrollY) + 'px'); ov.style.setProperty('--reach', '0px');
  }
}
// A tray that is part of the page runs to the page's bottom, measured when it opens. The left column and the board can still
// grow a little afterwards (fonts finishing loading, numbers being fitted), so it is measured again whenever either changes size.
let reflowTray = 0;
if (window.ResizeObserver) { const ro = new ResizeObserver(() => { clearTimeout(reflowTray); reflowTray = setTimeout(() => { const ov = $('#overlay'); if (!ov.hidden && ov.classList.contains('inflow')) placeOverlay(true, ov.classList.contains('shoptray') ? 'shop' : undefined); }, 30); }); ['main > aside', '.board'].forEach(q => { const el = document.querySelector(q); if (el) ro.observe(el); }); }
// On resize or scroll, a tray screen (cash-out, Shop, pack) is placed again from scratch, so it can go back to being a tray
// after the window was narrow; the Shop and packs redraw when they cross between tray and full screen.
['resize', 'scroll'].forEach(ev => window.addEventListener(ev, () => {
  const ov = $('#overlay'), cls = $('#modal').className, shop = /\b(shopmodal|packmodal)\b/.test(cls);
  if (ov.hidden || !/\btraymodal\b/.test(cls) || (ev === 'scroll' && ov.classList.contains('inflow'))) return;   // a tray that is part of the page scrolls with it by itself
  if (ev === 'resize' && shop && useTray() !== shopTray) { render(); return; }
  placeOverlay(true, shop ? 'shop' : undefined);
}));
// Any leftover animation is cancelled first: the cash-out drawer's slide-down holds its end position, and the next modal must not inherit it.
function showModal(html, pinned, cls) {
  placeOverlay(false); modalPinned = !!pinned; $('#modal').getAnimations().forEach(an => an.cancel()); $('#modal').className = 'modal' + (cls ? ' ' + cls : ''); $('#modal').innerHTML = html; if ($('#modal #mClose')) $('#modal').insertAdjacentHTML('afterbegin', CLOSE_X); decorateBanner(cls); syncEditions(); fillHero($('#modal')); fillColTiles($('#modal')); fillTileArt($('#modal')); $('#overlay').hidden = false; document.documentElement.classList.add('modallock'); fillExamples($('#modal')); translateDOM($('#modal')); }
// While any screen or tray is open only it scrolls: the page behind holds still, so there is one scrollbar, not two.
function hideModal() { modalPinned = false; $('#modal').getAnimations().forEach(an => an.cancel()); $('#overlay').hidden = true; document.documentElement.classList.remove('modallock'); placeOverlay(false); }
// A Talisman you gain starts fresh, like a Joker in Balatro: progress from an earlier copy you sold is gone.
// Its state lives under its own key, or its key plus a capitalised suffix (kasaobake, shiroSuit).
const ownsState = (k, x) => x === k || (x.startsWith(k) && /[A-Z]/.test(x[k.length] || ''));   // 'shiro' owns 'shiroSuit', but 'hoshi' does not own 'hoshizora'
const freshTalState = k => Object.fromEntries(Object.entries(S.talState || {}).filter(([x]) => !ownsState(k, x)));
function gainTalisman(k, sticker) { if (S.talismans.includes(k)) k = newAlias(S, k); if (!sticker && (chal('allPerish') || chal('allRental'))) sticker = rollSticker(k); S.talState = freshTalState(k); S.talismans.push(k); if (S.sellBonus) delete S.sellBonus[k]; S.stickers = S.stickers || {}; delete S.stickers[k]; if (sticker) S.stickers[k] = Object.assign({}, sticker); }
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
// A small drawing per card type: an ofuda for Talismans, a fortune slip, a torii for Kami, a scroll, a flower, a wrapped pack.
function emblem(kind) {
  const E = {
    talisman: '<rect x="15" y="4" width="18" height="40" rx="2" fill="#f1e6c8" stroke="#b9ab86"/><circle cx="24" cy="15" r="5.5" fill="none" stroke="#c9453a" stroke-width="2"/><circle cx="24" cy="15" r="2" fill="#c9453a"/><path d="M19 25h10M19 30h10M19 35h7" stroke="#3a3326" stroke-width="1.6" stroke-linecap="round"/>',
    omikuji: '<rect x="12" y="10" width="24" height="30" rx="3" fill="#2b5c8f" stroke="#7fb3e0"/><rect x="21" y="3" width="6" height="12" rx="1.5" fill="#efe6d2"/><path d="M16 22h16M16 27h16M16 32h10" stroke="#cfe2f5" stroke-width="1.6" stroke-linecap="round"/>',
    kami: '<path d="M6 13c6 2 30 2 36 0l-1.5 5c-6 1.5-27 1.5-33 0z" fill="#c9453a"/><rect x="10" y="22" width="28" height="3.5" rx="1" fill="#c9453a"/><rect x="13" y="16" width="4" height="27" rx="1" fill="#a8362c"/><rect x="31" y="16" width="4" height="27" rx="1" fill="#a8362c"/><rect x="22.5" y="18" width="3" height="5" fill="#a8362c"/>',
    scroll: '<rect x="9" y="13" width="30" height="22" fill="#e9f3e9" stroke="#6fcf97"/><rect x="5" y="10" width="6" height="28" rx="3" fill="#4f9d69"/><rect x="37" y="10" width="6" height="28" rx="3" fill="#4f9d69"/><path d="M15 20h18M15 25h18M15 30h12" stroke="#2e7d4f" stroke-width="1.6" stroke-linecap="round"/>',
    flower: '<g transform="translate(24 24)">' + [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-10" rx="6.5" ry="10" fill="#f0a3b8" stroke="#d97f99" transform="rotate(${a})"/>`).join('') + '<circle r="5" fill="#d9a441"/></g>',
    pack: '<path d="M10 7l3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 1-1v34l-1-1-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3-3 3-1-1z" fill="currentColor" stroke="rgba(0,0,0,.35)"/><rect x="10" y="19" width="28" height="10" fill="#1a2420" opacity=".35"/><circle cx="24" cy="24" r="4" fill="#efe6d2"/>',
  };
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${E[kind] || E.pack}</svg>`;
}
function cardHTML(it, idx) {
  const d = itemDef(it); const p = it.free ? 0 : itemPrice(it);
  const kindLabel = { talisman: 'Talisman', omikuji: 'Omikuji', kami: 'Kami Spirit', scroll: 'Scroll of Mastery', flower: 'Flower / Season', pack: 'Booster pack' }[it.kind];
  const ed = it.edition ? EDITIONS[it.edition] : null;
  const full = slotsFullMsg(it), no = p > S.money ? `You have ¥${S.money}; this costs ¥${p}` : full;
  const action = it.sold ? '<span class="muted soldnote">Sold</span>' : `<button class="primary" data-buy="${idx}" ${no ? `disabled title="${no}"` : ''}>${it.kind === 'pack' ? 'Open' : full ? 'Slots Full' : 'Buy'}</button>`;
  return `<div class="shopcard ${it.kind}${it.sold ? ' sold' : ''}${ed ? ' ed-' + it.edition : ''}"><span class="pricetag num${p > S.money && !it.sold ? ' short' : ''}">${p === 0 ? 'Free' : '¥' + p}</span><div class="emblem">${emblem(it.kind)}</div>${it.kind === 'talisman' ? stickerBadges(it.sticker) : ''}<div class="kind">${it.kind === 'talisman' ? talKindRow(it.key, it.edition) : kindLabel + (ed ? `<span class="edtag ed-${it.edition}">${ed.name}</span>` : '')}</div><div class="n">${d.name}</div><div class="d">${d.desc}${ed ? ` <b>${ed.name}: ${ed.desc}.</b>` : ''}</div>${it.kind === 'scroll' ? scrollLevelHTML(it.key) : it.kind === 'talisman' && !it.sold ? talPreview(it.key) : ''}<div class="buy">${action}</div></div>`;
}
// The shop wallet counts from the amount it last showed to the new one (coin clinks), then gives a small bounce.
let walletShown = null;
function tweenWallet() {
  const el = $('#modal .wallet .pv'); if (S.quiet) return;
  if (!el || walletShown === null || walletShown === S.money || !motionOK) { walletShown = S.money; return; }
  const cur = LANG === 'hk' ? '$' : '¥', from = walletShown, dur = Math.min(520, 160 + Math.abs(S.money - from) * 30); walletShown = S.money;
  el.textContent = cur + from; countUp(el, from, S.money, dur, cur, 'coin'); setTimeout(() => juice(el, .6), dur);
}
// Cash-out plays like Balatro's: the receipt rises, each reward line slides in and counts up with coin clinks, then the
// amount on the Cash Out button counts up and rings a register. Once per cash-out; about 1.5 s.
// A money amount with a real minus sign: ¥3, or −¥3 for a Rental charge.
const money = (prefix, v) => v < 0 ? '−' + prefix + Math.abs(v) : prefix + v;
function countUp(el, from, to, dur, prefix, sound) {
  if (!el) return; const t0 = performance.now(); let last = from;
  const step = now => { const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 2))); if (v !== last && sound) sfx(sound); last = v; el.textContent = money(prefix, v); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step); setTimeout(() => { el.textContent = money(prefix, to); }, dur + 400);   // final value even if frames are paused
}
function animateCashout() {
  const r = S.reward; if (!r || r.shown) return; r.shown = true;
  const m = $('#modal'), cur = LANG === 'hk' ? '$' : '¥';
  const rows = [...m.querySelectorAll('.receipt .rrow')], amt = m.querySelector('.cashamt .num');
  if (!motionOK) { sfx('kaching'); return; }
  if ($('#overlay').classList.contains('boardonly')) m.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const vals = rows.map(x => +x.querySelector('b').dataset.v || 0);
  rows.forEach(x => { x.style.opacity = '0'; x.querySelector('b').textContent = cur + 0; }); if (amt) amt.textContent = cur + 0;
  rows.forEach((x, i) => setTimeout(() => {
    x.style.opacity = ''; x.animate([{ opacity: 0, transform: 'translateY(18px) rotate(-1.5deg) scale(.96)' }, { opacity: 1, transform: 'translateY(-2px) scale(1.01)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });   // dealt in like the Shop's cards
    countUp(x.querySelector('b'), 0, vals[i], 220, cur, 'coin');
  }, 260 + i * 260));
  const tStart = 260 + rows.length * 260 + 80;
  setTimeout(() => countUp(amt, 0, r.total, 380, cur, 'coin'), tStart);
  setTimeout(() => { sfx('kaching'); if (amt) juice(amt.parentElement, .9); }, tStart + 400);
}
// Cash Out: the receipt slides back down, coins arc from the button into the purse, which counts up and bounces,
// then the Shop opens (about 1 s). Full-screen cash-out on narrow layouts, or reduced motion, goes straight to the Shop.
function cashOut() {
  const r = S.reward; if (!r || r.paid) return; r.paid = true;
  const run = S, go = () => { if (S !== run || S.phase !== 'cashout' || S.reward !== r) return; S.phase = 'shop'; S.msg = ''; render(); };   // a run that has moved on (New Run, import) is left alone
  const m = $('#modal'), from = m.querySelector('.cashamt .coin'), purse = $('#purseVal'), cur = LANG === 'hk' ? '$' : '¥';
  if (!motionOK || !from || !purse || r.total <= 0 || !$('#overlay').classList.contains('boardonly')) { if (r.total > 0) sfx('kaching'); trayOut(go); return; }
  const a = from.getBoundingClientRect(), p = purse.closest('.purse').querySelector('.coin').getBoundingClientRect();
  const sx = a.left + a.width / 2, sy = a.top + a.height / 2, ex = p.left + p.width / 2, ey = p.top + p.height / 2, lift = Math.min(160, Math.abs(sx - ex) * .25 + 60);
  m.animate([{ transform: 'none' }, { transform: 'translateY(110%)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
  const n = Math.max(3, Math.min(8, r.total)), dur = 520, gap = 60, path = [];
  for (let k = 0; k <= 10; k++) { const t = k / 10; path.push({ transform: `translate(${(ex - sx) * t}px,${(ey - sy) * t - Math.sin(Math.PI * t) * lift}px) scale(${1 - .25 * t})` }); }
  const startMoney = r.before ?? S.money - r.total;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'flycoin'; c.innerHTML = coinSVG(); Object.assign(c.style, { left: sx - 13 + 'px', top: sy - 13 + 'px' }); document.body.appendChild(c);
    c.animate(path, { duration: dur, delay: i * gap, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' }).onfinish = () => c.remove();
    setTimeout(() => { sfx('coin'); const el = $('#purseVal'); if (el) el.textContent = cur + Math.round(startMoney + (S.money - startMoney) * (i + 1) / n); }, dur + i * gap);
    setTimeout(() => c.remove(), dur + i * gap + 400);   // in case frames are paused
  }
  const land = dur + (n - 1) * gap;
  setTimeout(() => { const el = $('#purseVal'); if (el) { el.textContent = cur + S.money; juice(el, .8); } sfx('kaching'); }, land + 20);
  setTimeout(go, land + 380);
}
function cashoutHTML() {
  const r = S.reward; const names = { small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' };
  const bossName = r.kind === 'boss' && S.stats.bosses.length ? BOSSES[S.stats.bosses[S.stats.bosses.length - 1]].name : null;
  const cap = interestCap();
  const talRows = r.talPay ? r.talPay.map(([k, v]) => [TAL[k] ? TAL[k].name : k, 'Talisman', v]) : r.tal ? [['Talismans', 'end-of-Blind payouts', r.tal]] : [];   // older saves only kept the total
  const rows = [['Blind reward', names[r.kind], r.base], ['Unused Plays', `${r.left} × ¥1`, r.left], ['Interest', `¥1 per ¥${CFG.interestPer} held, up to ¥${cap}`, r.interest], ...talRows, r.summer ? ['Summer', 'Flower', r.summer] : null, r.invest ? ['Investment Tag', 'Boss bonus', r.invest] : null, ...(r.rent || []).map(([k, v]) => [TAL[k] ? TAL[k].name : k, 'Rental', -v])].filter(Boolean);
  const cur = LANG === 'hk' ? '$' : '¥';
  let h = `<div class="drawhead"><h2>${bossName ? bossName + ' beaten' : 'Blind cleared'}</h2></div>`;
  // Like Balatro, the Cash Out button sits on top and the reward rows fill in beneath it, so the button never moves.
  h += `<button id="mCashOut" class="primary cashbtn">Cash Out <span class="cashamt"><span class="coin" aria-hidden="true">${coinSVG()}</span><span class="num">${money(cur, r.total)}</span></span></button>`;
  h += `<div class="receipt">${rows.map(([k, d, v]) => `<div class="rrow"><span class="rl">${k}</span><span class="rd muted">${d}</span><span class="rlead" aria-hidden="true"></span><b class="num${v < 0 ? ' neg' : ''}" data-v="${v}">${money('¥', v)}</b></div>`).join('')}</div>`;
  return h;
}
// Same look as the play area's purse: the coin, the amount, and JPY or HKD underneath.
const walletHTML = () => `<span class="wallet purse"><span class="coin" aria-hidden="true">${coinSVG()}</span><span class="wtx"><span class="pv num">¥${S.money}</span><span class="wl" data-notr>${LANG === 'hk' ? 'HKD' : 'JPY'}</span></span></span>`;
// Everything on sale, in display order: the card slots, the Flower, then the Booster Packs. Older saves had one pack and a Scroll slot.
function shopItems() { const sh = S.shop; if (!sh.packs) { sh.packs = sh.pack ? [sh.pack] : []; if (sh.scroll) sh.cards.push(sh.scroll); delete sh.pack; delete sh.scroll; } return [...sh.cards, sh.flower, ...sh.packs].filter(Boolean); }
function shopHTML() {
  const items = shopItems(), tray = shopTray = useTray();
  const next = ({ small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' })[blindKind()];
  const nextBoss = blindKind() === 'boss' ? BOSSES[S.bossOrder[S.ante - 1]] : null;
  // The banner holds Next Blind; Reroll sits on the Cards shelf, the only thing it changes. In the tray the play area stays in
  // view, so the wallet and View Wall / Run Info are left out (the left panel and the top bar have them). Full screen keeps the
  // wallet in the banner and puts View Wall and Run Info at the bottom.
  const shopBtns = `<button id="mNext" class="primary hnext"><span class="nb-main">Next Blind <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><small>Ante ${S.ante} · ${nextBoss ? nextBoss.name : next}</small></button>`;
  let h = `<div class="noren"><div class="norenbar"><h2>Shop</h2><div class="shopacts">${tray ? '' : walletHTML()}${shopBtns}</div></div><div class="norenflaps" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div>`;
  if (S.shop.coupon) h += `<div class="msg">Coupon Tag: Talismans and consumables are free in this shop.</div>`;
  // The three shelves stand side by side, in Balatro's order: the rerollable
  // cards, the Ante's Flower (its Voucher), then the Booster Packs. They wrap to a new row when the space runs out.
  // On wide screens the Shop rises as a tray from the bottom of the board, so your Talismans and consumables stay in view
  // above it (select one there to sell or use it); otherwise it opens full screen and lists them underneath.
  const at = it => items.indexOf(it);
  const canReroll = rerollPrice() <= S.money;
  h += `<div class="shopshelves"><div class="shelf cardshelf${S.shop.cards.length > 3 ? ' many' : ''}" style="--n:${Math.max(1, S.shop.cards.length)}"><div class="shelflabel">Cards</div><button id="mReroll" class="shelfbtn" ${canReroll ? '' : 'disabled title="Not enough money to reroll"'}><svg class="rbico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Reroll <b class="num">${rerollPrice() ? '¥' + rerollPrice() : 'Free'}</b></button><div class="shelfrow">${S.shop.cards.map(it => cardHTML(it, at(it))).join('')}</div></div>
    <div class="shelf vouchshelf" style="--n:1"><div class="shelflabel">Flower · this Ante</div><div class="shelfrow">${S.shop.flower ? cardHTML(S.shop.flower, at(S.shop.flower)) : '<div class="emptyvouch muted">No Flower this Ante.</div>'}</div></div>
    <div class="shelf packsshelf" style="--n:${Math.max(1, S.shop.packs.length)}"><div class="shelflabel">Booster Packs</div><div class="shelfrow">${S.shop.packs.map(it => cardHTML(it, at(it))).join('')}</div></div></div>
    ${S.shop.freePacks.length ? `<div class="freepacks">${S.shop.freePacks.map((pk, i) => `<button class="primary" data-freepack="${i}">Open Free ${PACKS[pk].name}</button>`).join('')}</div>` : ''}`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="min-height:18px;margin:6px 0">${S.msg || (tray ? 'Select a Talisman or consumable on the board above to sell or use it.' : '')}</div>`;
  if (!tray) h += ownedHTML() + footHTML();
  return h;
}
// View Wall and Run Info, for the full-screen Shop and packs (in the tray the board's own buttons are in view).
// Line icons for View Wall and Run Info, shared by the Blind screen and the full-screen Shop and packs.
const WALL_ICO = '<svg class="qico" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="1.5" width="8" height="10.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="2.5" y="4" width="8" height="10.5" rx="1.6" fill="var(--panel)" stroke="currentColor" stroke-width="1.4"/></svg>', INFO_ICO = '<svg class="qico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v4.3M8 4.6v.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const footHTML = () => `<div class="shopfoot"><button id="mDeck" class="ghost railbtn"><span class="rbl">${WALL_ICO}View Wall</span><b class="num">${(S.deck || []).length}</b></button><button id="mRunInfo" class="ghost railbtn"><span class="rbl">${INFO_ICO}Run Info</span></button></div>`;
// The Shop and packs open as a tray over the board on wide screens. On narrow ones (900px or less), or when the window is too
// short to fit the tray below your Talismans, they open full screen and list your items so you can still sell them.
const TRAY_MIN_H = 400;
const useTray = () => { if (innerWidth <= 900) return false; const tz = document.querySelector('.board .talzone'); return !tz || innerHeight - (tz.getBoundingClientRect().bottom + scrollY) >= TRAY_MIN_H; };
let shopTray = null;   // which layout the open Shop or pack was drawn in, so a resize across the line redraws it
function ownedHTML() {
  const tal = S.talismans.map((k, i) => { const ed = S.editions[k]; const tgt = TAL[k].copies ? talTarget(S, k) : null; return `<div class="shopcard talisman owned-card${ed ? ' ed-' + ed : ''}">${stickerBadges(S.stickers && S.stickers[k])}<div class="kind">${talKindRow(k, ed, i + 1, 'owned')}</div><div class="n">${TAL[k].name}</div><div class="d">${TAL[k].desc}${tgt ? ` <b>Now: ${tgt.name}.</b>` : ''}${ed ? ` <b>${EDITIONS[ed].desc}.</b>` : ''}${TAL[k].status ? ' <b>(' + TAL[k].status(S) + ')</b>' : ''}</div><div class="buy"><span></span>${isEternal(k) ? '<span class="muted" style="font-size:11px">Eternal</span>' : `<button class="ghost" data-sell="${k}">Sell ¥${talSellValue(k)}</button>`}</div></div>`; });
  const con = S.consumables.map((c, i) => { const d = CONS[c.key]; return `<div class="shopcard ${c.kind} owned-card"><div class="kind">${c.kind === 'kami' ? 'Kami Spirit' : 'Omikuji'}</div><div class="n">${d.name}</div><div class="d">${d.desc}</div><div class="buy"><span class="muted">${d.anywhere ? 'Usable now' : 'Use during a Blind'}</span><span style="display:flex;gap:6px">${d.anywhere ? `<button class="ghost" data-usecon="${i}">Use</button>` : ''}<button class="ghost" data-sellcon="${i}">Sell ¥${conSellValue(c)}</button></span></div></div>`; });
  return `<div class="label" style="margin:10px 0 4px">Your Talismans · ${S.talismans.length}/${talSlots()} · fire left to right · sell to make room</div>` + `<div class="shop-grid owned-grid otal">${tal.join('') || '<div class="muted" style="font-size:12px">None yet.</div>'}</div>` + `<div class="label" style="margin:10px 0 4px">Your Consumables · ${S.consumables.length}/${conSlots()}</div>` + (con.length ? `<div class="muted" style="font-size:12px;margin:-2px 0 4px">Most consumables are used on tiles during a Blind. Ones that don't need tiles have a Use button here.</div><div class="shop-grid owned-grid ocon">${con.join('')}</div>` : `<div class="shop-grid owned-grid ocon"><div class="muted" style="font-size:12px">None yet.</div></div>`);
}
function packButtons(it, i) {
  if (S.pack.done) return `<span class="muted" style="font-size:11px">No picks left</span>`;
  const full = slotsFullMsg(it); const dis = full ? ` disabled title="${full}"` : '';
  if (it.kind === 'tile') return `<button class="primary" data-take="${i}">Add to Wall</button>`;
  if (!S.pack.hand || (it.kind !== 'omikuji' && it.kind !== 'kami')) return `<button class="primary" data-take="${i}"${dis}>${full ? 'Slots Full' : 'Take'}</button>`;
  const def = CONS[it.key];
  const use = def.blindOnly ? `<span class="muted" style="font-size:11px">Blind only</span>` : `<button class="primary" data-packuse="${i}">Use</button>`;
  return `<span style="display:flex;gap:6px;align-items:center">${use}<button class="ghost" data-take="${i}"${dis}>Keep</button></span>`;
}
function packHTML() {
  const pk = PACKS[S.pack.key], tray = shopTray = useTray();
  const tone = { omikuji: 'omikuji', kami: 'kami', scroll: 'scroll', talisman: 'talisman' }[pk.type] || 'pack';
  // Skip the Rest or Done sits in the header beside the picks left, so it is always in view.
  let h = `<div class="packhead ${tone}"><div class="packart">${emblem('pack')}</div><div class="packtitle"><div class="label">Booster pack${S.pack.free ? ' · free from a Tag' : ''}</div><h2>${pk.name}</h2><p>${pk.desc}</p></div><div class="packacts">${S.pack.done ? '<button class="ghost hbtn" disabled>All picks used</button>' : '<button id="mPackDone" class="ghost hbtn">Skip the Rest</button>'}</div><div class="packpicks"><b class="num">${S.pack.done ? 0 : S.pack.left}</b><span>${S.pack.done || S.pack.left !== 1 ? 'picks' : 'pick'} left</span></div></div>`;
  if (S.pack.hand) h += `<div class="packhandwrap"><div class="label">Your Tiles · ${(S.pack.view || S.pack.hand).length} random tiles from your Wall</div><div class="muted" style="font-size:12px;margin:2px 0 6px">${S.pack.done ? 'All picks used. Outlined tiles changed and stay that way in your Wall.' : 'Select tiles, then press Use on a card. The change stays in your Wall for the rest of the run. Keep puts the card in your consumable slots instead.'}</div><div class="packhand" id="packHand"></div></div>`;
  h += `<div class="shelf packshelf"><div class="shelflabel">${S.pack.done ? 'Cards · all picks used' : `Cards · choose ${S.pack.left} more`}</div><div class="shop-grid" style="--n:${S.pack.choices.length}">${S.pack.choices.map((it, i) => { const d = itemDef(it); const ed = it.edition ? EDITIONS[it.edition] : null; return `<div class="shopcard ${it.kind === 'tile' ? 'tilecard' : it.kind}${it.sold ? ' sold' : ''}${ed ? ' ed-' + it.edition : ''}"><div class="${it.kind === 'tile' ? 'packtileart' : 'emblem'}" data-pt="${i}">${it.kind === 'tile' ? '' : emblem(it.kind)}</div>${it.kind === 'talisman' ? stickerBadges(it.sticker) : ''}<div class="kind">${it.kind === 'talisman' ? talKindRow(it.key, it.edition) : { omikuji: 'Omikuji', kami: 'Kami Spirit', scroll: 'Scroll of Mastery', tile: 'Tile' }[it.kind] + (ed ? `<span class="edtag ed-${it.edition}">${ed.name}</span>` : '')}</div><div class="n">${d.name}</div><div class="d">${d.desc}${ed ? ` <b>${ed.name}: ${ed.desc}.</b>` : ''}</div>${it.kind === 'scroll' && !it.sold ? scrollLevelHTML(it.key) : it.kind === 'talisman' && !it.sold ? talPreview(it.key) : ''}<div class="buy"><span></span>${it.sold ? `<span class="muted">${it.used ? 'Used' : 'Taken'}</span>` : packButtons(it, i)}</div></div>`; }).join('')}</div></div>`;
  h += `<div class="msg${S.msgErr ? ' err' : ''}" style="min-height:18px;margin:2px 0 6px">${S.msg || ''}</div>`;
  if (!tray) h += ownedHTML() + footHTML();
  return h;
}
function overHTML(won) {
  const st = S.stats; const pct = S.target ? Math.min(100, 100 * S.score / S.target) : 100;
  const where = S.boss ? BOSSES[S.boss].name : ({ small: 'the Small Blind', big: 'the Big Blind', boss: 'the Boss Blind' })[blindKind()];
  const stat = (label, v) => `<div class="stat"><div class="label">${label}</div><div class="v num">${v}</div></div>`;
  let h = `<div class="overhead"><div class="label">${won ? 'Run complete' : S.endless ? 'Endless run over' : 'Run over'}</div><h2 class="${won ? '' : 'lost'}">${won ? 'You broke the bank!' : 'The syndicate collects.'}</h2></div>${won ? '<div class="herotiles small" id="heroTiles"></div>' : ''}`;
  h += won ? `<p class="muted">All ${CFG.antes} Antes cleared on ${STAKES[S.stake].name} with the ${DECKS[S.deckKey].name}.</p>` : `<p class="muted">${S.endless ? `You won the run, then reached Ante ${S.ante} in Endless Mode. Out of Plays against ${where}.` : `Out of Plays on Ante ${S.ante} against ${where}.`}</p><div class="overscore"><div class="row"><span class="label">Round Score</span><span class="num"><b>${fmtN(S.score)}</b> <span class="muted">of ${fmtN(S.target)}</span></span></div><div class="overbar"><i style="width:${pct}%"></i></div></div>`;
  h += `<div class="overstats">${stat('Ante reached', S.endless ? `${S.ante}` : `${Math.min(S.ante, CFG.antes)} / ${CFG.antes}`)}${stat('Blinds won', st.blinds)}${stat('Complete Hands', st.hands)}${stat('Partial Plays', st.melds)}${stat('YEN', '¥' + S.money)}</div>`;
  // Like Balatro's run summary: what you did this run, and how much of the Collection it revealed.
  const found = S.stats.seen0 != null ? Object.keys(PROFILE.seen || {}).length - S.stats.seen0 : null, most = mostPlayedRung();
  h += `<div class="overstats">${stat('Tiles played', st.tilesPlayed || 0)}${stat('Tiles discarded', st.tilesDiscarded || 0)}${stat('Bought', st.bought || 0)}${stat('Rerolls', st.rerolls || 0)}${found != null ? stat('New discoveries', found) : ''}</div>${most ? `<p class="muted" style="margin:6px 0 0">Most played: <b>${rungLabel(most)}</b> ×${st.rungs[most]}${st.skipped ? ` · Blinds skipped: <b>${st.skipped}</b>` : ''}</p>` : ''}`;
  h += `<div class="overbest"><div><div class="label">Best Play</div><div class="v num">${fmtN(st.best)}</div></div>${st.bestDesc ? `<div class="muted">${st.bestDesc}</div>` : ''}</div>`;
  if (S.newUnlocks && S.newUnlocks.length) h += `<div class="label" style="margin:14px 0 6px">Unlocked this run</div><div class="overtals">${S.newUnlocks.map(unlockLabel).filter(Boolean).map(l => `<span class="overtal newunlock"><span class="muted" style="font-size:11px">${l.kind}</span>${l.name}</span>`).join('')}</div>`;
  h += `<div class="label" style="margin:14px 0 6px">Talismans</div><div class="overtals">${S.talismans.length ? S.talismans.map((k, i) => `<span class="overtal"><span class="order">${i + 1}</span>${TAL[k].name}</span>`).join('') : '<span class="muted">None</span>'}</div>`;
  h += `<div class="shopfoot"><span class="seedline muted" style="margin:0">Seed <code class="seed">${S.seed}</code> <button class="ghost tiny-btn" data-copyseed>Copy</button> · ${DECKS[S.deckKey].name} · ${STAKES[S.stake].name}</span><span style="flex:1"></span>${won ? '<button id="mEndless" class="ghost" title="Keep playing past Ante 8. Targets climb steeply.">Endless Mode</button>' : ''}<button id="mNewRun" class="primary">New Run</button></div>`;
  return h;
}
function deckHTML() {
  const inBlind = S.phase === 'blind';
  const all = inBlind ? [...S.hand, ...S.wall, ...S.river, ...openTiles(), ...S.played, ...S.indicators] : S.deck;
  const eng = all.filter(t => t.eng), sealed = all.filter(t => t.seal), edTiles = all.filter(t => t.ed), redTotal = all.filter(t => t.red).length;
  // Every copy that is not plain (a Red Five, an engraving, a seal or an edition) gets its own tile beside the face's plain
  // copies, so you can see, and hover, exactly which tile carries what. Identical copies share one tile with a count.
  const vkey = t => [t.red ? 'r' : '', t.eng || '', t.seal || '', t.ed || ''].join('|'), PLAIN = '|||';
  const faces = Array.from({ length: 34 }, () => new Map());
  for (const t of all) { const g = faces[idx(t)], k = vkey(t); if (!g.has(k)) g.set(k, { t, n: 0, wall: 0 }); g.get(k).n++; }
  for (const t of S.wall) { const v = faces[idx(t)].get(vkey(t)); if (inBlind && v) v.wall++; }
  const stat = (label, v) => `<div class="stat"><div class="label">${label}</div><div class="v num">${v}</div></div>`;
  let h = `<div class="shophead"><h2>The Wall</h2></div><p class="muted" style="margin:2px 0 10px">${inBlind ? 'Under each tile: copies still face down in the Wall, out of copies in your deck.' : 'Under each tile: how many copies are in your deck.'} Special copies (Red Fives, engravings, seals, editions) stand beside the plain ones: hover one for details, or pick a chip below to find them.</p>`;
  h += `<div class="overstats wallstats">${stat('Tiles', all.length)}${inBlind ? stat('Still in the Wall', S.wall.length) : ''}${stat('Red Fives', redTotal)}${stat('Engraved', eng.length)}${sealed.length ? stat('Sealed', sealed.length) : ''}${edTiles.length ? stat('Editions', edTiles.length) : ''}</div>`;
  h += '<div class="wallgrid">';
  for (const [label, from, to] of [['Manzu', 0, 9], ['Pinzu', 9, 18], ['Souzu', 18, 27], ['Honors', 27, 34]]) h += `<div class="label" style="margin:12px 0 6px">${label}</div><div class="wallrow" data-from="${from}" data-to="${to}"></div>`;
  // The chips filter the grid: pick one and only the tiles that carry it stay lit.
  const chips = (title, list, key, nameOf) => { if (!list.length) return ''; const by = {}; for (const t of list) by[t[key]] = (by[t[key]] || 0) + 1; return `<div class="label" style="margin:12px 0 6px">${title}</div><div class="overtals">${Object.entries(by).map(([k, n]) => `<button class="tagchip wfilter" data-f="${key}:${k}">${nameOf(k)} ×${n}</button>`).join('')}</div>`; };
  if (redTotal) h += `<div class="label" style="margin:12px 0 6px">Red Fives</div><div class="overtals"><button class="tagchip wfilter" data-f="red:1">Red Five ×${redTotal}</button></div>`;
  h += chips('Engravings', eng, 'eng', k => ENG[k] ? ENG[k].name : k) + chips('Seals', sealed, 'seal', k => SEALS[k] ? SEALS[k].name : k) + chips('Editions', edTiles, 'ed', k => EDITIONS[k] ? EDITIONS[k].name : k);
  h += `</div><button id="mClose" hidden>Close</button>`;
  setTimeout(() => {
    const grid = $('#modal .wallgrid'); if (!grid) return;
    grid.querySelectorAll('.wallrow').forEach(g => {
      for (let i = +g.dataset.from; i < +g.dataset.to; i++) {
        const face = document.createElement('div'); face.className = 'wallface';
        const vs = [...faces[i].entries()].sort(([a], [b]) => (a === PLAIN ? -1 : b === PLAIN ? 1 : a < b ? -1 : 1));
        if (!vs.length || vs[0][0] !== PLAIN) vs.unshift([PLAIN, { t: tileFromIdx(i), n: 0, wall: 0, none: true }]);   // a face with no plain copies still shows its ×0
        for (const [k, v] of vs) {
          if (k === PLAIN && v.none && vs.length > 1) continue;   // only special copies left: show just those
          const c = document.createElement('div'); c.className = 'wallcell' + (k === PLAIN ? '' : ' special') + (v.n === 0 || (inBlind && v.wall === 0) ? ' out' : '');
          Object.assign(c.dataset, { red: v.t.red ? 1 : '', eng: v.t.eng || '', seal: v.t.seal || '', ed: v.t.ed || '' });
          c.appendChild(tileEl(v.t, { small: true }));
          const b = document.createElement('div'); b.className = 'wcount num'; b.innerHTML = `<span>${inBlind ? `${v.wall}/${v.n}` : `×${v.n}`}</span>`;
          b.title = inBlind ? `${v.wall} of ${v.n} still in the Wall` : `${v.n} in your deck`; c.appendChild(b); face.appendChild(c);
        }
        g.appendChild(face);
      }
      translateDOM(g);
    });
    grid.querySelectorAll('.wfilter').forEach(btn => btn.onclick = () => {
      const on = !btn.classList.contains('on'); grid.querySelectorAll('.wfilter').forEach(x => x.classList.remove('on')); btn.classList.toggle('on', on); grid.classList.toggle('filtering', on);
      const [key, val] = btn.dataset.f.split(':'); grid.querySelectorAll('.wallcell').forEach(c => c.classList.toggle('hit', on && c.dataset[key] === val));
    });
  }, 0);
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
  <p><b>Endless Mode.</b> After you win, you can keep the same run going past Ante ${CFG.antes}, as in Balatro. Each new Ante draws a fresh Boss and its targets climb steeply: Ante ${CFG.antes + 1} starts at ${fmtN(anteBase(CFG.antes + 1))}, Ante ${CFG.antes + 2} at ${fmtN(anteBase(CFG.antes + 2))} and Ante ${CFG.antes + 3} at ${fmtN(anteBase(CFG.antes + 3))} on White Stake. Your win is already counted, and your Profile keeps your best Ante.</p>
  <p><b>Hand.</b> You hold ${CFG.handSize} tiles drawn from the Wall (136 tiles in the Standard Wall: four of every tile, four of them Red Fives). You refill after every action. A complete hand uses 14 tiles, so you always have spares. If the Wall runs dry you simply stop drawing.</p>
  <p><b>Plays and Discards.</b> You get ${CFG.playsPerBlind} Plays and ${CFG.discardsPerBlind} Discards per Blind, before Talismans, Flowers and Wall effects. A Discard throws up to ${CFG.maxDiscardTiles} tiles into the River, which stays visible for the whole Blind.</p>
  <p><b>Partial plays.</b> Select tiles that split into melds (Chi runs, Pon triplets, Kan quads) plus at most one pair, or two pairs on their own, and press Play. The box in the side panel names the rung it makes: Lone Tile, Pair, Two Pair, one meld, Two Melds, Three Melds, Ready Hand (three melds and a pair) or Four Melds. Bigger rungs score far more, so a hand one tile short is still worth cashing in. Each costs 1 Play. Run Info, Play Ladder tab, lists every rung's Chips and Han.</p>
  <p><b>Complete hand.</b> Select 14 tiles that make four melds and a pair, Seven Pairs, or Thirteen Orphans, and press Play. Its Yaku add Han. A complete hand with no Yaku still gets +1 Han. Each Yakuman counts as 13 Han, and they stack. Run Info lists all Yaku with example hands.</p>
  <p><b>Call.</b> Select one River tile and 2–3 hand tiles that form a meld with it, then press Call. It costs 1 Play and scores nothing yet, and you cannot Call with your last Play. The ${TAL.ryujin.name} Talisman makes your first ${TAL.ryujin.freeCall} Calls each Blind free. The meld is set aside as Open and counts toward your complete hand. Open hands get less Han from some Yaku and lose closed-only Yaku such as Pinfu and Iipeikou. After a Call you discard 1 tile to settle it, which does not use a Discard.</p>
  <p><b>Kan.</b> Four identical tiles can be played as a partial Kan for points, or declared with Declare Kan to set them aside as a closed Kan that counts toward your complete hand without opening it. Every Kan, declared or called, draws one replacement tile. If that tile ends up as the winning tile of your complete hand, you score Rinshan Kaihou (+1 Han).</p>
  <p><b>Furiten.</b> The winning tile of a complete hand is the newest tile you drew among the 14 you play. If a copy of that tile sits in your River, the hand is in Furiten and its Mult is halved. The helper marks waits that are already in your River. With the ${TAL.kawauso.name} Talisman you can claim one River tile as the winning tile: select it together with the rest of the hand and press Play. A claimed hand is always in Furiten, the tile leaves the River, and The Fisherman forbids claiming.</p>
  <p><b>Bosses.</b> Every Ante ends with a Yakuza Boss Blind with a rule twist, shown in red on the blind plate and on the Blind Select screen. Each run meets ${CFG.antes} of the ${Object.keys(BOSSES).length} bosses. Some only turn up from a later Ante, and Ante ${CFG.antes} (and every ${CFG.antes}th Ante in Endless) is always a tougher Showdown Boss. Face-down tiles (The Purist, The House, The Wheel, The Mark) are revealed when played or discarded, and the helper does not count them. Debuffed tiles (The Pillar, The Plant) are crossed out: they still count for melds and Yaku but score nothing. The Peony Flower lets you reroll the Boss for ¥10.</p>
  <h3>Scoring</h3>
  <p><b>Score = Chips × Mult.</b> The play's rung gives base Chips and Han. Every scored tile then adds Chips: 2–8 are worth their face value, and 1s, 9s and Honors are worth 10.</p>
  <p><b>Han becomes Mult.</b> All Han from the rung, Yaku, tiles, Scrolls and Talismans converts once through this table: ${hanTableText()}.</p>
  <p><b>Extra Han.</b> Each Red Five scored gives +1 Han. A Dora indicator is a tile flipped from the Wall; the next tile in sequence after it is the Dora (9 wraps to 1, Winds go East, South, West, North, Dragons go White, Green, Red), and each Dora scored gives +1 Han. Indicators last for the current Blind. In partial plays, a Pon or Kan of Winds or Dragons scores Yakuhai (+1 Han). Each Kan in a play with two or more melds adds +${K.chips} Chips and +${K.han} Han.</p>
  <p><b>Talismans.</b> Han from Talismans and the Holographic edition is counted before the table converts. Everything else fires after it, left to right: some Talismans add Chips, some add flat Mult (+4 Mult), some multiply (×1.5 Mult). A +Mult Talisman placed before a ×Mult Talisman scores more than the reverse. Drag Talismans to reorder them; the number on each card is its firing order. Some Talismans grow as you play and show their current value on the card, and some copy another Talisman. A Talisman you sell and buy again starts fresh.</p>
  <p><b>Scrolls of Mastery.</b> Each level of a meld Scroll gives +${CFG.scrollChips} Chips for every matching meld or pair in a play and +${CFG.scrollHan} Han once per play. Levels apply inside complete hands too, so a complete hand always beats the Ready Hand inside it. Other Scrolls are named after a hand pattern, such as Tanyao, and add Han whenever it scores.</p>
  <p><b>Engravings.</b> Omikuji can engrave tiles, and you can see it on the tile: Gold Foil (gold face, ¥1 when scored), Obsidian (dark stone face, +20 Chips), Jade (green face, ×1.5 Mult), Steel (brushed metal face, ×1.5 Mult while held in hand), Glass (clear blue face, ×2 Mult, 1 in 4 chance to shatter and leave your Wall), and Dragon Mark (a red emblem in the corner, +1 Han). Hover a tile for its exact effect.</p>
  <p><b>Seals.</b> A tile can also carry one Seal beside its engraving, shown as a wax dot on top: ${Object.values(SEALS).map(e => `${e.name} (${e.desc.replace(/\.$/, '').toLowerCase()})`).join('; ')}. Slip of the Red Seal and the Kami Benzaiten, Hachiman and Fūjin add them.</p>
  <p><b>Tile editions.</b> Like Balatro's playing cards, a tile can carry an edition beside its engraving and Seal: ${Object.values(TILE_EDS).map(e => `${e.name} (${e.desc.replace(/\.$/, '').toLowerCase()})`).join(', ')}. Tile +Mult (Holographic, Crimson Inlay, Lucky Inlay) is added after Han becomes Mult, and before the Talismans fire.</p>
  <p><b>Wild and Stone.</b> A Wild Inlay tile becomes whichever suit gives the best play when you play it (up to 4 Wild tiles at once); the helper hints still treat it as its printed suit. A Stone tile has no rank or suit: it never forms a meld or a Kong, rides along with any play for +50 Chips, and is not counted for a complete hand's 14 tiles.</p>
  <p><b>Rarity.</b> Talismans are Common, Uncommon or Rare (about ${Math.round(CFG.rarityWeights.common * 100)}%, ${Math.round(CFG.rarityWeights.uncommon * 100)}% and ${Math.round(CFG.rarityWeights.rare * 100)}% of shop and pack Talismans). Legendary Talismans only come from the rare Kami Hitodama.</p>
  <p><b>Editions.</b> Shop Talismans sometimes come in an edition: ${Object.values(EDITIONS).map(e => `${e.name} (${e.desc})`).join(', ')}.</p>
  <h3>Between Blinds</h3>
  <p><b>Money.</b> Beating a Blind pays ¥${R.small} for a Small Blind, ¥${R.big} for a Big Blind and ¥${R.boss} for a Boss, plus ¥1 for each unused Play and ¥1 interest for every ¥${CFG.interestPer} you hold (at most ¥${CFG.interestCap}). From Red Stake up, Small Blinds pay nothing.</p>
  <p><b>Shop.</b> Spend money on Talismans (passive, ${CFG.talismanSlots} slots), Omikuji and Kami (consumables, ${CFG.consumableSlots} slots, used on selected hand tiles), Scrolls of Mastery (permanent upgrades), Flowers (run-long perks) and Booster Packs (open one and keep one or two of what's inside). Like Balatro, each shop has two card slots (Talismans about 71%, Omikuji and Scrolls about 14% each; Kami come from packs, or the shop with the Ghost Wall), one Flower for the whole Ante, and two Booster Packs; the first shop of a run always has a Talisman pack. Rerolling changes only the cards: it costs ¥5, then ¥1 more each time in the same shop. On wide screens the Shop and packs rise from the bottom of the board, so your Talismans and consumables stay in view above: select one there to sell or use it. Every pack comes in three sizes: Normal, Jumbo (more cards) and Mega (more cards and two picks). Tile Packs add new tiles to your Wall, some engraved, sealed or with an edition. One Flower is offered per Ante and waits in every shop of that Ante until you buy it; upgrades appear once you own the first Flower. Talismans and consumables can also gain sell value (Tsuchinoko, Otoshidama). Omikuji Packs and Kami Packs also deal ${PACK_HAND} random tiles from your Wall: select some and press Use on a card to change them for the rest of the run, or Keep the card for a Blind. After your last pick the changed tiles light up for a moment, then the pack closes back to the shop. ${CONS.indicator.name} and ${CONS.amaterasu.name} only work during a Blind. ${CONS.wealth.name} and ${CONS.raijin.name} can also be used from your slots in the shop; there ${CONS.raijin.name} destroys 2 random tiles from your Wall. Every shop has two random cards (Talismans ${Math.round(CFG.shopWeights.talisman * 100)}%, Omikuji ${Math.round(CFG.shopWeights.omikuji * 100)}%, Kami ${Math.round(CFG.shopWeights.kami * 100)}% each), plus one Scroll, one Flower and one booster pack in fixed spots. A reroll changes only the two random cards and costs ¥${CFG.rerollCost}. Selling returns half the item's value: click a Talisman on the board and press Sell, or sell from inside the shop.</p>
  <p><b>Blind Select.</b> After the shop you see the Ante's three blinds with their targets, rewards and the Boss's rule. A Small or Big Blind can be skipped for the Tag on its card instead of its money: free packs, editions, coupons, money, a bigger hand, a different Boss, free Rare or Uncommon Talismans, Scroll levels, a second Flower (Voucher Tag), and a Double Tag that copies the next Tag you get. Tags you hold show in the side panel.</p>
  <p><b>Setup.</b> A new run lets you choose a Wall (deck), a Stake (difficulty) and a seed. Sharing a seed replays the same Wall, shops and bosses for players with the same unlocks. Each Stake keeps every penalty of the ones below it. Winning on a Stake with a Wall unlocks the next Stake for that Wall. From Black Stake, shop Talismans can carry stickers: Eternal (can't be sold), Perishable (stops working after 5 Blinds, from Orange) and Rental (¥1 to buy, ¥3 every Blind, from Gold).</p>
  <p><b>Special Talismans.</b> Some fade: Kakigōri loses Chips with each play, Senbei loses Mult each Blind, Ramen weakens as you discard, and each leaves when it runs out. Daikoku doubles every listed chance. Yūrei saves a lost Blind once if you scored at least a quarter of the target. Selling Rikishi during a Boss Blind disables the Boss, selling Ramune gives a Double Tag, and selling Kakuremino after 2 Blinds copies another Talisman. With Kabuki, Talismans you already own can turn up again, so you can hold two copies; each copy works on its own.</p>
  <p><b>Walls.</b> Each Wall changes the run: the Plasma Wall averages Chips and Mult before they multiply (targets ×2), the Erratic Wall is 136 random tiles, the Ghost Wall brings Kami to the shop, the Magic Wall starts with Spring and two Slips of Echoes, the Anaglyph Wall gives a Double Tag after every Boss, and the Painted Wall trades a Talisman slot for +2 hand size. Most Walls unlock through goals; the Collection shows them.</p>
  <p><b>Settings.</b> Sound and Music are separate. The animated background, screen shake, CRT filter (Light or Full, with screen curvature, bloom and colour fringing), high-contrast tiles and dead-tile dots can each be switched on or off, and Reset to Defaults puts them all back. Sort by Suit or By Rank from the hand's header.</p>
  <p><b>Challenges.</b> Fixed runs with special rules (${CHALLENGES.length} of them), from the title screen. Winning one is recorded on its own and doesn't count toward Stakes or unlocks. Achievements on the Profile tab track long-term goals.</p>
  <h3>Help and Controls</h3>
  <p><b>Helper.</b> Under your hand the game shows how many tiles you are from a complete hand. Settings can turn that off, and can turn on two more hints: which tiles you are waiting on, and whether the tiles you select can go without setting you back. Against The Purist they only count your visible tiles. Another assist marks dead tiles with green dots.</p>
  <p><b>Arranging.</b> Drag hand tiles to reorder them. Dragging turns off auto-sort; Sort Hand sorts again. Tiles score in the order they sit, which matters for Shikigami. Sorting also works against The Purist, so face-down tiles sit in their sorted place. A selection with face-down tiles always plays: if it isn't a valid play, its best part scores and the other selected tiles go to the River.</p>
  <p><b>Saving.</b> Your run saves automatically after every action. Run Info, Profile tab, keeps lifetime stats across runs. Settings, Your data, exports your profile, settings and current run as a code or file, so you can import them on another device or browser.</p>
  <p><b>Unlocks.</b> Most of the game is open from your first run. ${UNLOCKS.filter(u => u.kind === 'tal').length} Talismans, ${UNLOCKS.filter(u => u.kind === 'wall').length} Walls unlock as you reach goals across runs, such as reaching Ante 6 or winning a run, and each Wall climbs the Stakes on its own. The Collection and Run Info, Profile tab, show each goal and your progress. Locked items never appear in shops or packs. Talismans, consumables, Scrolls, Flowers, packs, Tags and Bosses also stay hidden in the Collection until you first come across them. Settings, Advanced, can unlock and reveal everything for playtesting.</p>
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
  <li><b>Talismans.</b> They fire left to right after each play. Put +Mult before ×Mult, and drag them to reorder. The coloured word is their rarity; corner badges are stickers (∞ Eternal, a number for Perishable, ¥ Rental).</li>
  <li><b>Between Blinds.</b> Spend money on Talismans, tile-changing Omikuji and Kami, Scrolls that level up your plays, packs (Tile Packs add tiles to your Wall) and one Flower per Ante for the rest of the run.</li>
  <li><b>Skipping.</b> Skip a Small or Big Blind for its Tag instead of its money: free Talismans, packs, editions or cash.</li>
  <li><b>Selling.</b> Sell Talismans for money and room. A few do something when sold (Rikishi disables a Boss, Ramune gives a Double Tag), and some fade away on their own (Kakigōri, Senbei, Ramen).</li>
  <li><b>Bosses.</b> Each Ante ends with a Boss that bends one rule; Ante ${CFG.antes} has a tougher Showdown Boss. Read its red box. Some Bosses deal tiles face down or make tiles score nothing.</li>
  </ol><p class="muted" style="font-size:12px;margin:10px 0 0">Run Info lists every Yaku with example hands and the full Play Ladder. Collection shows every Talisman, consumable, pack, Tag and Boss. Full Rules has everything else.</p>`;
}
function rulesHTML() {
  const tabs = [['quick', 'Quick Start'], ['full', 'Full Rules']];
  return `<div class="shophead"><h2>How to Play</h2></div><div class="tabs">${tabs.map(([k, n]) => `<button class="tab${rulesTab === k ? ' on' : ''}" data-rtab="${k}">${n}</button>`).join('')}</div>${rulesTab === 'full' ? fullRulesHTML() : quickRulesHTML()}<button id="mClose" hidden>Close</button>`;
}
function mostPlayedRung() { let best = null, n = 0; for (const [k, v] of Object.entries(S.stats.rungs || {})) if (v > n) { n = v; best = k; } return best; }
function mostScoredYaku() { let best = null, n = 0; for (const [k, v] of Object.entries(S.stats.yaku || {})) if (v > n) { n = v; best = k; } return best; }
let infoTab = 'run';
// Collection: every item in the game, Balatro-style, as read-only cards.
let colTab = 'tal';
function collectionHTML() {
  const run = !!(S && S.talismans);
  const card = (cls, kind, name, desc, extra = '', badge = '', lock = null) => lock
    ? `<div class="shopcard ${cls} colcard locked"><div class="kind">${kind}</div><div class="n">${name}</div>${lockHTML(lock)}<div class="colfoot"><span class="tag lockmark">Locked</span></div></div>`
    : `<div class="shopcard ${cls} colcard"><div class="kind">${kind}</div><div class="n">${name}</div><div class="d">${desc}</div>${extra}${badge ? `<div class="colfoot"><span class="tag colmark">${badge}</span></div>` : ''}</div>`;   // badges sit at the bottom so names line up
  const count = (kind, keys) => { const open = keys.filter(k => kind === 'stake' ? !stakeLockAny(k) : DISCOVER.includes(kind) ? isSeen(kind, k) : isUnlocked(kind, k)).length; return open === keys.length ? keys.length : `${open}/${keys.length}`; };
  // Undiscovered: a face-down card that keeps its type but hides the name and text.
  const hidden = (cls, kind) => `<div class="shopcard ${cls} colcard undisc"><div class="kind">${kind}</div><div class="n">?</div><div class="d muted">Not discovered yet.</div></div>`;
  const tabs = [
    ['tal', 'Talismans', count('tal', TALISMANS.map(t => t.key))], ['omi', LANG === 'hk' ? 'Fortune Sticks' : 'Omikuji', count('omikuji', OMIKUJI.map(o => o.key))], ['kami', 'Kami Spirits', count('kami', KAMI.map(o => o.key))], ['scroll', 'Scrolls', count('scroll', SCROLLS.map(o => o.key))], ['flower', 'Flowers', count('flower', FLOWERS.map(o => o.key))], ['pack', 'Packs', count('pack', Object.keys(PACKS))],
    ['eng', 'Engravings', Object.keys(ENG).length], ['seal', 'Seals', Object.keys(SEALS).length], ['ed', 'Editions', Object.keys(EDITIONS).length], ['stk', 'Stickers', Object.keys(STICKERS).length], ['tag', 'Tags', count('tag', Object.keys(TAGS))], ['boss', 'Bosses', count('boss', Object.keys(BOSSES))], ['wall', 'Walls', count('wall', Object.keys(DECKS))], ['stake', 'Stakes', count('stake', Object.keys(STAKES))]];
  const cons = (list, kind) => list.map(c => !isSeen(kind, c.key) ? hidden(kind, kind === 'kami' ? 'Kami Spirit' : 'Omikuji') : card(kind, `${kind === 'kami' ? 'Kami Spirit' : 'Omikuji'} · ¥${c.cost}`, c.name, c.desc, '', c.blindOnly ? 'Blind only' : c.anywhere ? 'Usable anytime' : '')).join('');
  let body = '';
  if (colTab === 'tal') body = TALISMANS.map(t => !lockOf('tal', t.key) && !isSeen('tal', t.key) ? hidden('talisman', 'Talisman') : card('talisman', `${talKindRow(t.key)}<span>· ¥${t.cost}</span>`, t.name, t.desc, '', run && S.talismans.includes(t.key) ? 'Owned' : '', lockOf('tal', t.key))).join('');
  else if (colTab === 'omi') body = cons(OMIKUJI, 'omikuji');
  else if (colTab === 'kami') body = cons(KAMI, 'kami');
  else if (colTab === 'scroll') body = SCROLLS.map(sc => !isSeen('scroll', sc.key) ? hidden('scroll', 'Scroll of Mastery') : card('scroll', `Scroll of Mastery · ¥${sc.cost}`, sc.name, sc.desc, run ? scrollLevelHTML(sc.key) : '')).join('');
  else if (colTab === 'flower') body = FLOWERS.map(f => !isSeen('flower', f.key) ? hidden('flower', 'Flower') : card('flower', `Flower · ¥${f.cost}${f.needs ? ` · upgrades ${FLW[f.needs].name}` : ''}`, f.name, f.desc, '', run && S.flowers.includes(f.key) ? 'Owned' : '')).join('');
  else if (colTab === 'pack') body = Object.entries(PACKS).map(([pk, p]) => !isSeen('pack', pk) ? hidden('pack', 'Booster pack') : card('pack', `Booster pack · ¥${p.cost}`, p.name, p.desc)).join('');
  else if (colTab === 'eng') body = Object.entries(ENG).map(([k, e]) => card(`omikuji engcard eng-${k}`, 'Engraving', e.name, e.desc, `<div class="coltile" data-eng="${k}"></div>`)).join('');
  else if (colTab === 'stk') body = Object.entries(STICKERS).map(([k, e]) => card('talisman', `Sticker · from ${{ eternal: 'Black', perish: 'Orange', rental: 'Gold' }[k]} Stake`, `${stickerBadges({ [k]: k === 'perish' ? 5 : true }).replace('stkcorner', 'stkcorner inline')}${e.name}`, e.desc)).join('');
  else if (colTab === 'seal') body = Object.entries(SEALS).map(([k, e]) => card(`omikuji engcard seal-${k}`, 'Seal', e.name, e.desc, `<div class="coltile" data-seal="${k}"></div>`)).join('');
  else if (colTab === 'ed') body = Object.entries(EDITIONS).map(([k, e]) => card(`talisman ed-${k}`, `Edition · +¥${e.price}`, `<span class="edtag ed-${k}">${e.name}</span>`, `${e.desc}${k === 'neg' ? '' : ' on every play'}.`, `<div class="muted" style="font-size:11px;margin-top:4px">${Math.round(e.odds * 100)}% of shop Talismans</div>`)).join('') + Object.entries(TILE_EDS).map(([k, e]) => card(`omikuji engcard`, 'Tile edition', e.name, e.desc, `<div class="coltile" data-ted="${k}"></div>`)).join('');
  else if (colTab === 'tag') body = Object.entries(TAGS).map(([k, t]) => !isSeen('tag', k) ? hidden('pack', 'Tag') : card('pack', 'Tag', t.name, t.desc, '', run && S.tags.includes(k) ? 'Held' : '')).join('');
  else if (colTab === 'boss') body = Object.entries(BOSSES).map(([k, b]) => !isSeen('boss', k) ? hidden('bosscol', 'Boss Blind') : card('bosscol' + (b.showdown ? ' showdown' : ''), b.showdown ? 'Showdown Boss · Ante 8' : `Boss Blind${(b.minAnte || 1) > 1 ? ` · from Ante ${b.minAnte}` : ''}`, b.name, b.desc, '', run && S.stats && S.stats.bosses.includes(k) ? 'Met this run' : '')).join('');
  else if (colTab === 'wall') body = Object.entries(DECKS).map(([k, d]) => card('flower', 'Wall', d.name, d.desc, '', run && S.deckKey === k ? 'This run' : '', lockOf('wall', k))).join('');
  else if (colTab === 'stake') body = Object.entries(STAKES).map(([k, st]) => card('flower', `<i class="sw sw-${k}" aria-hidden="true"></i> Stake`, st.name, st.desc, '', run && S.stake === k ? 'This run' : '', stakeLockAny(k))).join('');
  return `<div class="shophead"><h2>Collection</h2><input id="colSearch" placeholder="Search" autocomplete="off"></div><p class="muted" style="margin:2px 0 10px">Everything that can turn up in a run. Cards you haven't come across yet show as ?, and locked cards show their goal. Yaku and the Play Ladder are in Run Info.</p>
  <div class="tabs coltabs">${tabs.map(([k, n, c]) => `<button class="tab${colTab === k ? ' on' : ''}" data-ctab="${k}">${n} <span class="muted">${c}</span></button>`).join('')}</div>
  <div class="shop-grid colgrid${colTab === 'eng' || colTab === 'seal' ? ' enggrid' : ''}">${body}</div><div class="muted colnone" hidden>Nothing matches.</div><button id="mClose" hidden>Close</button>`;
}
function fillColTiles(root) { root && root.querySelectorAll('.coltile').forEach(b => { if (!b.children.length) b.appendChild(tileEl({ id: 0, suit: 'p', rank: 5, red: false, eng: b.dataset.eng || null, seal: b.dataset.seal || null, ed: b.dataset.ted || null }, { small: true })); }); }
let rulesTab = 'quick';
function parseHand(str) { const out = []; for (const grp of str.split(' ')) { const m = grp.match(/^(\d+)([mpsz])$/); if (!m) continue; const tiles = [...m[1]].map(d => ({ id: 0, suit: m[2], rank: +d, red: false, eng: null })); out.push(tiles); } return out; }
function exampleHTML(ex) { return `<div class="exrow" data-ex="${ex}"></div>`; }
function fillExamples(root) { root.querySelectorAll('.exrow').forEach(row => { if (row.children.length) return; for (const grp of parseHand(row.dataset.ex)) { const g = document.createElement('div'); g.className = 'exgrp'; for (const t of grp) { const e = tileEl(t, { small: true }); e.classList.add('tiny'); e.style.cursor = 'default'; g.appendChild(e); } row.appendChild(g); } }); }
// Lifetime stats from the player profile.
function profileHTML() {
  const P = PROFILE, stat = (label, v) => `<div class="stat"><div class="label">${label}</div><div class="v num">${v}</div></div>`;
  const named = (obj, table, nameOf) => { const e = Object.entries(obj).sort((a, b) => b[1] - a[1]); return e.length ? e.map(([k, n]) => `<span class="tagchip">${nameOf(table, k)} ×${n}</span>`).join('') : '<span class="muted">None yet</span>'; };
  const nm = (t, k) => (t[k] && t[k].name) || k, yn = (t, k) => ((YAKU_SHEET.find(y => y.k === k) || YAKUMAN_SHEET.find(y => y.k === k) || {}).n) || k;
  let h = `<p class="muted" style="margin:8px 0">Your progress across every run in this browser. Export it from Settings to move it to another device.</p>`;
  h += `<div class="overstats">${stat('Runs', P.runs)}${stat('Wins', P.wins)}${stat('Best Ante', P.bestAnte ? (P.bestAnte > CFG.antes ? `${P.bestAnte} · Endless` : `${P.bestAnte} / ${CFG.antes}`) : '—')}${stat('Blinds won', P.blinds)}${stat('Complete Hands', P.hands)}</div>`;
  h += `<div class="overbest"><div><div class="label">Best Play ever</div><div class="v num">${P.bestPlay ? fmtN(P.bestPlay) : '—'}</div></div>${P.bestPlayDesc ? `<div class="muted">${P.bestPlayDesc}</div>` : ''}</div>`;
  const locked = UNLOCKS.filter(u => !P.unlocked.includes(`${u.kind}:${u.key}`)), earned = UNLOCKS.filter(u => P.unlocked.includes(`${u.kind}:${u.key}`));
  h += `<div class="label" style="margin:12px 0 6px">Unlocks · ${earned.length} of ${UNLOCKS.length}${UNLOCK_ALL ? ' · Unlock everything is on in Settings' : ''}</div>`;
  if (earned.length) h += `<div class="overtals" style="margin-bottom:8px">${earned.map(u => `<span class="tagchip">${unlockName(u)}</span>`).join('')}</div>`;
  if (locked.length) h += `<div class="locklist">${locked.map(u => `<div class="lockrow"><div><span class="muted" style="font-size:11px">${UNLOCK_KIND[u.kind]}</span> <b>${unlockName(u)}</b></div>${lockHTML(u)}</div>`).join('')}</div>`;
  const got = P.achieved || [];
  h += `<div class="label" style="margin:12px 0 6px">Achievements · ${got.length} of ${ACHIEVEMENTS.length}</div><div class="achgrid">${ACHIEVEMENTS.map(a => { const done = got.includes(a.key), [have, need] = a.prog(P); return `<div class="ach${done ? ' done' : ''}"><b>${a.name}</b><span class="muted">${a.goal}</span>${done ? '' : need > 1 ? `<div class="lockbar"><i style="width:${Math.min(100, 100 * (have || 0) / need)}%"></i></div>` : ''}</div>`; }).join('')}</div>`;
  const disc = [...TALISMANS.map(t => ['tal', t.key]), ...OMIKUJI.map(o => ['omikuji', o.key]), ...KAMI.map(o => ['kami', o.key]), ...SCROLLS.map(o => ['scroll', o.key]), ...FLOWERS.map(o => ['flower', o.key]), ...Object.keys(PACKS).map(k => ['pack', k]), ...Object.keys(TAGS).map(k => ['tag', k]), ...Object.keys(BOSSES).map(k => ['boss', k])];
  h += `<div class="label" style="margin:12px 0 6px">Collection · ${disc.filter(([k, key]) => isSeen(k, key)).length} of ${disc.length} discovered</div>`;
  h += `<div class="label" style="margin:12px 0 6px">Stakes won by Wall</div><div class="wallstakes">${Object.entries(DECKS).map(([w, d]) => `<div class="wsrow${lockOf('wall', w) ? ' lk' : ''}"><span>${d.name}</span><span class="wspips">${STAKE_KEYS.map((k, i) => `<i class="sw sw-${k}${wallBest(w) >= i ? '' : ' off'}" title="${STAKES[k].name}${wallBest(w) >= i ? ' won' : ''}"></i>`).join('')}</span></div>`).join('')}</div>`;
  h += `<div class="label" style="margin:12px 0 6px">Bosses beaten · ${Object.keys(P.bosses).length} of ${Object.keys(BOSSES).length}</div><div class="overtals">${named(P.bosses, BOSSES, nm)}</div>`;
  h += `<div class="label" style="margin:12px 0 6px">Wins by Stake</div><div class="overtals">${named(P.stakesWon, STAKES, nm)}</div>`;
  h += `<div class="label" style="margin:12px 0 6px">Wins by Wall</div><div class="overtals">${named(P.wallsWon, DECKS, nm)}</div>`;
  h += `<div class="label" style="margin:12px 0 6px">Yaku scored</div><div class="overtals">${named(P.yaku, null, yn)}</div>`;
  return h;
}
// ===================== EXPORT / IMPORT =====================
// One save = profile + settings + current run, as gzip + base64 text ("YKM1Z:...") or plain JSON.
const SETTING_KEYS = ['yakuman.lang', 'yakuman.speed', 'yakuman.dots', 'yakuman.hints', 'yakuman.tilenums', 'yakuman.unlockall', 'yakuman.sound', 'yakuman.music', 'yakuman.bganim', 'yakuman.hc', 'yakuman.shake', 'yakuman.crt'];
function exportPayload() { const settings = {}; for (const k of SETTING_KEYS) { try { const v = localStorage.getItem(k); if (v != null) settings[k] = v; } catch (e) { } } save(); let run = null; try { run = localStorage.getItem(SAVE_KEY); } catch (e) { } return { app: 'yakuman', v: 1, exported: new Date().toISOString(), profile: PROFILE, settings, run }; }
async function toCode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj)); let out = bytes, gz = false;
  if (window.CompressionStream) { try { const cs = new CompressionStream('gzip'); const w = cs.writable.getWriter(); w.write(bytes); w.close(); out = new Uint8Array(await new Response(cs.readable).arrayBuffer()); gz = true; } catch (e) { out = bytes; gz = false; } }
  let bin = ''; for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]); return (gz ? 'YKM1Z:' : 'YKM1:') + btoa(bin);
}
async function fromCode(text) {
  text = (text || '').trim(); if (!text) throw new Error('Paste a save code or choose a file first.');
  if (text.startsWith('{')) return JSON.parse(text);
  const m = text.match(/^YKM1(Z?):([\s\S]+)$/); if (!m) throw new Error('That is not a Tenpai save code.');
  const bin = atob(m[2].replace(/\s+/g, '')); let bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  if (m[1]) { const ds = new DecompressionStream('gzip'); const w = ds.writable.getWriter(); w.write(bytes); w.close(); bytes = new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function checkSave(o) { if (!o || o.app !== 'yakuman' || typeof o.profile !== 'object') throw new Error('That save is not from Tenpai.'); if (o.v !== 1) throw new Error('That save is from a different version of Yakuman.'); if (o.run) JSON.parse(o.run); return o; }
let PENDING_IMPORT = null, EXPORT_CODE = '';
function exportHTML() {
  return `<div class="shophead"><h2>Export Save</h2></div><p class="muted" style="margin:2px 0 10px">Your profile, settings and current run in one code. Copy it or save it as a file, then use Import on your other device or browser.</p>
  <textarea id="saveCode" class="savecode" readonly rows="5">${EXPORT_CODE}</textarea><div class="muted" style="font-size:11px;margin-top:4px">${EXPORT_CODE.length.toLocaleString()} characters</div>
  <div class="shopfoot"><button id="mClose" class="ghost">Back</button><span style="flex:1"></span><button id="mDownloadCode" class="ghost">Save as File</button><button id="mCopyCode" class="primary">Copy Code</button></div>`;
}
function importHTML(err) {
  if (PENDING_IMPORT) {
    const P = Object.assign(blankProfile(), PENDING_IMPORT.profile); let run = null; try { run = PENDING_IMPORT.run ? JSON.parse(PENDING_IMPORT.run) : null; } catch (e) { }
    return `<div class="shophead"><h2>Replace This Save?</h2></div><p class="muted" style="margin:2px 0 10px">Loading replaces the profile, settings and current run in this browser.</p>
    <div class="receipt"><div class="rrow"><div><div class="rl">Profile</div><div class="rd muted">${P.runs} runs · ${P.wins} wins · best Ante ${P.bestAnte || '—'}</div></div></div><div class="rrow"><div><div class="rl">Current run</div><div class="rd muted">${run ? `Ante ${Math.min(run.ante, CFG.antes)} · ${(DECKS[run.deckKey] || {}).name || 'Wall'} · ${(STAKES[run.stake] || {}).name || 'Stake'}` : 'None'}</div></div></div><div class="rrow" style="border-bottom:0"><div><div class="rl">Exported</div><div class="rd muted">${PENDING_IMPORT.exported ? new Date(PENDING_IMPORT.exported).toLocaleString() : 'unknown'}</div></div></div></div>
    <div class="shopfoot"><button id="mClose" class="ghost">Cancel</button><span style="flex:1"></span><button id="mConfirmImport" class="danger">Replace and Reload</button></div>`;
  }
  return `<div class="shophead"><h2>Import Save</h2></div><p class="muted" style="margin:2px 0 10px">Paste a save code from Export, or choose a save file.</p>
  <textarea id="importCode" class="savecode" rows="5" placeholder="YKM1Z:..."></textarea>
  <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><label class="ghost filebtn">Choose File<input type="file" id="importFile" accept=".txt,.json,text/plain,application/json" hidden></label><span class="muted" id="importFileName" style="font-size:12px"></span></div>
  <div class="msg${err ? ' err' : ''}" style="min-height:18px;margin-top:6px">${err || ''}</div>
  <div class="shopfoot"><button id="mClose" class="ghost">Back</button><span style="flex:1"></span><button id="mLoadSave" class="primary">Load Save</button></div>`;
}
// Save the export code as a .txt file. On claude.ai the artifact viewer offers it through the downloads
// capability (the viewer confirms); elsewhere (GitHub Pages, local) a normal browser download is used.
async function saveCodeFile(btn) {
  const filename = `yakuman-save-${new Date().toISOString().slice(0, 10)}.txt`;
  const say = (txt) => { btn.textContent = txt; setTimeout(() => { btn.textContent = 'Save as File'; }, 1800); };
  if (window.claude && typeof window.claude.use === 'function') {
    const downloads = await window.claude.use('downloads');
    if (!downloads) return say('Not available here: copy the code');
    try { await downloads.save({ filename, data: EXPORT_CODE }); say('Saved'); }
    catch (e) { if (e && e.code === 'declined') return; say(e && e.code === 'rate_limited' ? 'Try again in a moment' : 'Could not save: copy the code'); }
    return;
  }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([EXPORT_CODE], { type: 'text/plain' })); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); say('Saved'); } catch (e) { say('Could not save: copy the code'); }
}
function backToSettings() { $('#mClose').onclick = () => { PENDING_IMPORT = null; showModal(settingsHTML(), true); }; }
function yakuHTML() {
  const st = S.stats; const most = mostPlayedRung(); const yc = k => (S && S.stats.yaku[k]) || 0;
  const tabs = [['run', 'Run'], ['ladder', 'Play Ladder'], ['yaku', 'Yaku'], ['yakuman', 'Yakuman'], ['profile', 'Profile']];
  let h = `<div class="shophead"><h2>Run Info</h2></div><div class="tabs">${tabs.map(([k, n]) => `<button class="tab${infoTab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
  if (infoTab === 'run') {
    const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
    h += `<div class="infogrid">`;
    h += `<div class="infocard"><div class="label">Run</div>${kv('Seed', `<code class="seed">${S.seed}</code> <button class="ghost tiny-btn" data-copyseed>Copy</button>`)}${kv('Wall', DECKS[S.deckKey].name)}${kv('Stake', STAKES[S.stake].name)}${kv('Ante', `${Math.min(S.ante, CFG.antes)} / ${CFG.antes}`)}${kv('Blinds won', st.blinds)}${kv('Skipped blinds', st.skipped)}${kv('Best play', `${fmtN(st.best)}${st.bestDesc ? ' <span class="muted">' + st.bestDesc + '</span>' : ''}`)}</div>`;
    h += `<div class="infocard"><div class="label">Plays this run</div>${kv('Complete hands', st.hands)}${kv('Partial plays', st.melds)}${kv('Calls from the River', st.calls)}${kv('Kans', st.kans)}${kv('Discards', st.discards)}${kv('Most-played rung', most ? (MELD_LABEL[most] || (CFG.rungs[most.replace('rung', '').split('').join(',')] || {}).name || most) : '—')}</div>`;
    const talRows = S.talismans.map((k, i) => { const ed = S.editions[k]; return `<div class="kv"><span><span class="order">${i + 1}</span>${TAL[k].name}${ed ? ` <span class="edtag ed-${ed}">${EDITIONS[ed].name}</span>` : ''}</span><b class="muted" style="font-weight:400;text-align:right;max-width:60%">${TAL[k].status ? TAL[k].status(S) : ''}</b></div>`; }).join('');
    h += `<div class="infocard"><div class="label">Talismans · ${S.talismans.length}/${talSlots()} · fire in this order</div>${talRows || '<div class="muted">None</div>'}</div>`;
    const sc = Object.entries(S.scrolls.meld).filter(([, v]) => v).map(([k, v]) => kv(MELD_LABEL[k], `Lv.${v + 1}`)).concat(Object.entries(S.scrolls.yaku).filter(([, v]) => v).map(([k, v]) => kv((YAKU_SHEET.find(y => y.k === k) || { n: k }).n, `+${v} Han`)));
    h += `<div class="infocard"><div class="label">Mastery</div>${sc.join('') || '<div class="muted">No Scrolls yet</div>'}</div>`;
    h += `<div class="infocard"><div class="label">Flowers &amp; Seasons</div>${S.flowers.map(f => kv(FLW[f].name, `<span class="muted" style="font-weight:400">${FLW[f].desc}</span>`)).join('') || '<div class="muted">None</div>'}</div>`;
    h += `<div class="infocard"><div class="label">Tags held</div>${(S.tags || []).map(t => kv(TAGS[t].name, `<span class="muted" style="font-weight:400">${TAGS[t].desc}</span>`)).join('') || '<div class="muted">None</div>'}</div>`;
    h += `</div>`;
    h += `<div class="infocard" style="margin-top:10px"><div class="label">Bosses</div><div class="bossline">${S.bossOrder.slice(0, Math.max(CFG.antes, S.ante)).map((b, i) => { const known = i <= S.ante - 1 || st.bosses.includes(b); const beaten = i < S.ante - 1; return `<div class="bossstep${beaten ? ' beaten' : i === S.ante - 1 ? ' now' : ''}"><span class="order">A${i + 1}</span><b>${known ? BOSSES[b].name : '?'}</b>${known ? `<span class="muted">${BOSSES[b].desc}</span>` : ''}</div>`; }).join('')}</div></div>`;
  } else if (infoTab === 'profile') { h += profileHTML();
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
let setupSel = { deck: 0, stake: 0 }, setupDir = { deck: 0, stake: 0 };
// One Wall and one Stake at a time, with arrows, so the screen never shows every option at once.
function setupKeys(name) { return Object.keys(name === 'deck' ? DECKS : STAKES); }
function setupKey(name) { const keys = setupKeys(name), n = keys.length; return keys[((setupSel[name] % n) + n) % n]; }
// Card art and rule chips for the carousels. Tiles are written like hands: digits then suit, 'r' marks a Red Five.
const WALL_ART = { standard: '1m 5pr 9s 1z', red: '5mr 5pr 5sr', lean: '3m 7p 7z', monk: '2m 5p 8s', gambler: '7m 7p 7s', merchant: '8m 6z 8p', abundant: '2s 3s 4s 5s 6s', plasma: '5p 5z 5p', erratic: '9m 2p 6z 4s', ghost: '5z 5z 5z', magic: '1z 7z 1z', anaglyph: '3m 3p', painted: '1s 2s 3s 4s 5s 6s' };
const WALL_FACTS = () => ({ standard: [['136 tiles'], ['4 Red Fives']], red: [['136 tiles'], ['12 Red Fives', 'good']], lean: [['100 tiles'], ['No Souzu'], ['−1 Play', 'bad']], monk: [['108 tiles'], ['No Honors'], ['Targets ×2', 'bad']], gambler: [['+1 Play', 'good'], ['−1 Discard', 'bad']], merchant: [[`Start ¥${CFG.startMoney + 16}`, 'good'], ['+1 consumable slot', 'good'], ['Prices +25%', 'bad']], abundant: [['+2 hand size', 'good'], ['−1 Play', 'bad']], plasma: [['Chips and Mult averaged', 'good'], ['Targets ×2', 'bad']], erratic: [['136 random tiles']], ghost: [['Kami often in shops', 'good'], ['Start with Izanami', 'good']], magic: [['Start with Spring', 'good'], ['2 Slips of Echoes', 'good']], anaglyph: [['Double Tag after each Boss', 'good']], painted: [['+2 hand size', 'good'], ['−1 Talisman slot', 'bad']] });
// Stakes stack: earlier penalties show dimmed, the new one in red.
// Each Stake lists what it adds (bad) under everything it keeps from the Stakes below (old).
const STAKE_NEW = { red: ['Small Blinds pay nothing'], green: ['Targets ×1.3'], black: ['Talismans cost ¥2 more', 'Eternal Talismans'], blue: ['−1 Discard'], purple: ['Targets +5% per Ante'], orange: ['Perishable Talismans'], gold: ['Rental Talismans'] };
const STAKE_FACTS = {}; { let kept = []; for (const k of Object.keys(STAKES).slice(1)) { STAKE_FACTS[k] = kept.map(t => [t, 'old']).concat(STAKE_NEW[k].map(t => [t, 'bad'])); kept = kept.concat(STAKE_NEW[k]); } }
function stakeChipSVG(k) { const c = { white: '#ece4cf', red: '#c9453a', green: '#4f9d69', black: '#1a1a1a', blue: '#2f6fb8', purple: '#7a3fb0', orange: '#d9822b', gold: '#d4a62a' }[k], ink = k === 'white' ? '#bfae82' : 'rgba(255,255,255,.85)'; return `<svg class="stakechipart" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="36" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="2"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="36" y="4" width="8" height="12" rx="2" fill="${ink}" transform="rotate(${a} 40 40)"/>`).join('')}<circle cx="40" cy="40" r="22" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="4 3"/><circle cx="40" cy="40" r="15" fill="rgba(0,0,0,.18)"/></svg>`; }
function setupHTML() {
  const chev = d => `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${d < 0 ? 'M10.5 2.5 5 8l5.5 5.5' : 'M5.5 2.5 11 8l-5.5 5.5'}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const facts = list => `<div class="carfacts">${list.map(([t, tone]) => `<span class="fact${tone ? ' ' + tone : ''}">${t}</span>`).join('')}</div>`;
  const car = (name, kind) => {
    const isWall = name === 'deck', lockFor = k => isWall ? lockOf('wall', k) : stakeLock(setupKey('deck'), k);
    const keys = setupKeys(name), cur = setupKey(name), table = isWall ? DECKS : STAKES, v = table[cur], lock = lockFor(cur), pos = keys.indexOf(cur);
    const art = isWall ? `<div class="carart tilesart" data-tiles="${WALL_ART[cur]}"></div>` : `<div class="carart chipart">${stakeChipSVG(cur)}<div class="diffpips" title="Difficulty">${keys.map((k, j) => `<i class="${j <= pos ? 'on' : ''}"></i>`).join('')}</div></div>`;
    const body = lock ? lockHTML(lock) : isWall ? `<p class="cardesc">${v.desc}</p>${facts(WALL_FACTS()[cur])}` : cur === 'white' ? `<p class="cardesc">${v.desc} No extra rules.</p>` : facts(STAKE_FACTS[cur]);
    const pager = keys.map((k, j) => `<button class="pg${k === cur ? ' on' : ''}${lockFor(k) ? ' lk' : ''}" data-goto="${name}:${j}" aria-label="${table[k].name}" title="${table[k].name}"></button>`).join('');
    const slide = setupDir[name] > 0 ? ' fromright' : setupDir[name] < 0 ? ' fromleft' : '';
    return `<div class="car2 ${isWall ? 'wallcar' : 'stakecar'}${lock ? ' locked' : ''}" data-car="${name}"><input type="hidden" name="${name}" value="${cur}">
      <button class="carnav prev" data-nav="${name}:-1" aria-label="Previous">${chev(-1)}</button>
      <div class="carcard2${slide}">${art}<div class="carbody"><div class="carkicker"><span>${isWall ? 'Wall' : 'Stake'}</span><span class="num">${pos + 1} / ${keys.length}</span></div><div class="cartitle"><span>${v.name}</span>${lock ? '<span class="lockpill"><span class="lockico" aria-hidden="true"></span>Locked</span>' : isWall && wallBest(cur) >= 0 ? `<span class="sticker" title="Best win with this Wall"><i class="sw sw-${STAKE_KEYS[wallBest(cur)]}" aria-hidden="true"></i>Won</span>` : ''}</div>${body}</div></div>
      <button class="carnav next" data-nav="${name}:1" aria-label="Next">${chev(1)}</button>
      <div class="carpager">${pager}</div></div>`;
  };
  const blocked = lockOf('wall', setupKey('deck')) || stakeLock(setupKey('deck'), setupKey('stake'));
  const html = `<div class="shophead"><h2>New Run</h2></div><p class="muted" style="margin:2px 0 14px">Choose your Wall and Stake. Enter a seed to replay someone else's run.</p>
  ${car('deck', 'wall')}${car('stake', 'stake')}
  <div class="seedrow"><label class="label" for="seedInput">Seed</label><input id="seedInput" placeholder="Random" maxlength="24" autocomplete="off"></div><div class="muted seedhelp">Optional. The same seed gives the same Wall, shops and bosses, as long as both players have the same unlocks.</div>
  <div class="shopfoot"><button id="mClose" class="ghost">Cancel</button><span style="flex:1"></span><button id="mStartRun" class="primary"${blocked ? ' disabled' : ''}>${blocked ? 'Locked' : 'Start Run'}</button></div>`;
  setupDir = { deck: 0, stake: 0 };
  return html;
}
function fillTileArt(root) { root && root.querySelectorAll('.tilesart').forEach(box => { if (box.children.length) return; const ts = []; for (const g of box.dataset.tiles.split(' ')) { const m = g.match(/^(\d+)([mpsz])(r?)$/); if (m) for (const d of m[1]) ts.push({ id: 0, suit: m[2], rank: +d, red: !!m[3], eng: null }); } ts.forEach((t, i) => { const e = tileEl(t, { small: true }); const k = i - (ts.length - 1) / 2; e.style.transform = `rotate(${k * 8}deg) translateY(${Math.abs(k) * 4}px)`; e.style.cursor = 'default'; box.appendChild(e); }); }); }
// Challenge list: each one is a fixed run; completed ones are marked.
function challengesHTML() {
  const won = PROFILE.challengesWon || {};
  const cards = CHALLENGES.map(c => `<div class="shopcard flower chalcard"><div class="kind">Challenge${won[c.key] ? ' <span class="tag colmark">Completed</span>' : ''}</div><div class="n">${c.name}</div><div class="d">${c.desc}</div><div class="buy"><span></span><button class="primary" data-chal="${c.key}">Start</button></div></div>`).join('');
  return `<div class="shophead"><h2>Challenges</h2><span class="muted">${Object.keys(won).length} / ${CHALLENGES.length} completed</span></div><p class="muted" style="margin:2px 0 12px">Fixed runs with special rules, on the Standard Wall and White Stake. Winning one does not count toward Stakes or unlocks.</p><div class="shop-grid colgrid">${cards}</div><div class="shopfoot"><button id="mClose" class="ghost">Back</button></div>`;
}
function menuHTML(hasSave) {
  const where = hasSave && S ? `${S.ante > CFG.antes ? `Endless Ante ${S.ante}` : `Ante ${S.ante}`} · ${S.phase === 'blind' ? ({ small: 'Small Blind', big: 'Big Blind', boss: S.boss ? BOSSES[S.boss].name : 'Boss Blind' })[blindKind()] : S.phase === 'shop' ? 'Shop' : 'Blind Select'} · ¥${S.money}` : '';
  return `<div class="hero"><div class="herotiles" id="heroTiles"></div>
  <h1 class="herotitle" data-notr>Tenpai</h1><div class="herokanji" data-notr>${LANG === 'hk' ? '聽牌' : '聴牌'}</div>
  <p class="herotag">A Mahjong roguelite in the Balatro mould. Build hands, chase Yaku, stack Talismans, and outscore eight Antes of Yakuza bosses.</p>
  <div class="heroacts">${hasSave ? `<button id="mContinue" class="primary herobtn">Continue Run<span>${where}</span></button>` : ''}<button id="mStart" class="${hasSave ? 'ghost' : 'primary herobtn'}">New Run</button><button id="mChallenges" class="ghost">Challenges</button><button id="mRules" class="ghost">How to Play</button><button id="mCollection" class="ghost">Collection</button></div>
  <div class="herofoot muted">Playtest build · Riichi or Hong Kong terms in Settings</div></div>`;
}
// The intro screen's fan of honor tiles.
function fillHero(root) { const box = root && root.querySelector('#heroTiles'); if (!box || box.children.length) return; [[4, 1], [4, 2], [4, 3], [4, 7], [4, 4], [4, 5], [4, 6]].forEach(([, r], i, arr) => { const e = tileEl({ id: 0, suit: 'z', rank: r, red: false, eng: null }); const k = i - (arr.length - 1) / 2; e.style.transform = `rotate(${k * 7}deg) translateY(${Math.abs(k) * 5}px)`; e.style.cursor = 'default'; box.appendChild(e); }); }

// ===================== DEBUG =====================
function renderDebug() {
  const bar = $('#debugBar');
  bar.innerHTML = `<span class="label">Debug</span><button data-dbg="money">+¥25</button><button data-dbg="play">+1 Play</button><button data-dbg="discard">+1 Discard</button><button data-dbg="win">Win blind</button><button data-dbg="refill">Redraw hand</button>
  <select id="dbgBoss"><option value="">Set next boss…</option>${Object.entries(BOSSES).map(([k, b]) => `<option value="${k}">${b.name}</option>`).join('')}</select>
  <select id="dbgTal"><option value="">Add talisman…</option>${Object.entries(RARITIES).map(([r, rn]) => `<optgroup label="${rn}">${TALISMANS.filter(t => talRarity(t.key) === r).map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</optgroup>`).join('')}</select>
  <select id="dbgRar"><option value="">Shop rarity: ${S.dbgRarity ? RARITIES[S.dbgRarity] : 'normal odds'}…</option>${Object.entries(RARITIES).map(([r, rn]) => `<option value="${r}">Only ${rn}</option>`).join('')}<option value="off">Normal odds</option></select>
  <select id="dbgCon"><option value="">Add consumable…</option>${[...OMIKUJI, ...KAMI].map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select>
  <select id="dbgScr"><option value="">Add scroll…</option>${SCROLLS.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select>
  <select id="dbgFlw"><option value="">Add flower…</option>${FLOWERS.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select>
  <select id="dbgEd"><option value="">Edition for selected Talisman…</option>${Object.entries(EDITIONS).map(([k, e]) => `<option value="${k}">${e.name}</option>`).join('')}<option value="none">None</option></select>
  <select id="dbgStk"><option value="">Sticker for selected Talisman…</option><option value="eternal">Eternal</option><option value="perish">Perishable (5)</option><option value="perish1">Perishable (1 left)</option><option value="rental">Rental</option><option value="none">None</option></select>
  <button data-dbg="rmtal" title="Remove the selected Talisman, even an Eternal one">Remove Talisman</button>
  <select id="dbgEng"><option value="">Engrave selected tiles…</option>${Object.entries(ENG).map(([k, e]) => `<option value="${k}">${e.name}</option>`).join('')}<option value="none">None</option></select>
  <select id="dbgSeal"><option value="">Seal selected tiles…</option>${Object.entries(SEALS).map(([k, e]) => `<option value="${k}">${e.name}</option>`).join('')}<option value="none">None</option></select>
  <select id="dbgRed"><option value="">Selected tiles become…</option><option value="red">Red Five</option>${Array.from({ length: 34 }, (_, i) => `<option value="${i}">${tileName(tileFromIdx(i))}</option>`).join('')}</select>
  <select id="dbgTag"><option value="">Add tag…</option>${Object.entries(TAGS).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('')}</select>
  <select id="dbgPack"><option value="">Open pack (shop)…</option>${Object.entries(PACKS).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('')}</select>
  <select id="dbgAnte"><option value="">Set Ante…</option>${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}">Ante ${i + 1}${i + 1 > CFG.antes ? ' (Endless)' : ''}</option>`).join('')}</select>
  <select id="dbgStake"><option value="">Set Stake…</option>${Object.entries(STAKES).map(([k, st]) => `<option value="${k}">${st.name}</option>`).join('')}</select>
  <button data-dbg="reroll" title="Reroll the shop cards for free">Free reroll</button>
  <button data-dbg="lose" class="ghost" title="End the run as a loss">Lose run</button>
  <button data-dbg="demo" title="Stage a complete hand full of retriggers (Red Seals, Hakutaku, Nekomata, Shikigami), then press Play to watch and listen">Demo hand</button>
  <button data-dbg="reset" class="ghost">Wipe save</button>`;
  bar.querySelectorAll('[data-dbg]').forEach(b => b.onclick = () => {
    const a = b.dataset.dbg;
    if (a === 'money') S.money += 25; else if (a === 'play') S.plays++; else if (a === 'discard') S.discards++;
    else if (a === 'win') { if (S.phase === 'blind') { S.score = S.target; winBlind(); } }
    else if (a === 'refill') { if (S.phase === 'blind') { S.wall.push(...S.hand); shuffle(S.wall); S.hand = []; S.selected = []; draw(); } }
    else if (a === 'demo') { stageDemoHand(); }
    else if (a === 'rmtal') { const k = S.selTal; if (k) { S.talismans = S.talismans.filter(x => x !== k); delete S.editions[k]; if (S.stickers) delete S.stickers[k]; S.selTal = null; } }
    else if (a === 'reroll') { if (S.phase === 'shop' && S.shop) S.shop.cards = Array.from({ length: shopSlots() }, rollCard); }
    else if (a === 'lose') { if (S.phase !== 'gameover' && S.phase !== 'win') loseRun(); }
    else if (a === 'reset') { clearSave(); location.reload(); return; }
    render();
  });
  $('#dbgBoss').onchange = e => { const k = e.target.value; if (!k) return; const i = S.ante - 1; S.bossOrder[i] = k; if (S.phase === 'blind' && blindKind() === 'boss') { S.boss = k; } setMsg(`Boss for Ante ${S.ante} set to ${BOSSES[k].name}.`); render(); };
  $('#dbgTal').onchange = e => { const k = e.target.value; if (!k) return; if (S.talismans.length < talSlots() && !S.talismans.includes(k)) gainTalisman(k); e.target.value = ''; render(); };
  $('#dbgCon').onchange = e => { const k = e.target.value; if (!k) return; if (S.consumables.length < conSlots()) S.consumables.push({ kind: CONS[k].kind, key: k }); e.target.value = ''; render(); };
  $('#dbgScr').onchange = e => { const k = e.target.value; if (!k) return; buyFree({ kind: 'scroll', key: k }); e.target.value = ''; render(); };
  $('#dbgEd').onchange = e => { const k = e.target.value; if (!k || !S.selTal) return; if (k === 'none') delete S.editions[S.selTal]; else S.editions[S.selTal] = k; e.target.value = ''; render(); };
  const selHand = () => S.phase === 'blind' ? selTiles() : [];
  $('#dbgRar').onchange = e => { const r = e.target.value; if (!r) return; S.dbgRarity = r === 'off' ? null : r; if (S.phase === 'shop' && S.shop) S.shop.cards = Array.from({ length: shopSlots() }, rollCard); setMsg(S.dbgRarity ? `Shops and Talisman packs now roll only ${RARITIES[S.dbgRarity]} Talismans.` : 'Shop rarity back to normal odds.'); renderDebug(); render(); };
  $('#dbgStk').onchange = e => { const k = e.target.value, t = S.selTal; e.target.value = ''; if (!k || !t) return setMsg('Select a Talisman first.', true), render(); S.stickers = S.stickers || {}; if (k === 'none') delete S.stickers[t]; else S.stickers[t] = Object.assign({}, S.stickers[t], k === 'perish' ? { perish: 5 } : k === 'perish1' ? { perish: 1 } : { [k]: true }); render(); };
  $('#dbgEng').onchange = e => { const k = e.target.value; e.target.value = ''; const sel = selHand(); if (!k || !sel.length) return setMsg('Select tiles in your hand first.', true), render(); for (const t of sel) t.eng = k === 'none' ? null : k; render(); };
  $('#dbgSeal').onchange = e => { const k = e.target.value; e.target.value = ''; const sel = selHand(); if (!k || !sel.length) return setMsg('Select tiles in your hand first.', true), render(); for (const t of sel) t.seal = k === 'none' ? null : k; render(); };
  $('#dbgRed').onchange = e => { const k = e.target.value; e.target.value = ''; const sel = selHand(); if (!k || !sel.length) return setMsg('Select tiles in your hand first.', true), render(); for (const t of sel) { if (k === 'red') { if (!isHonor(t)) { convertTile(t, t.suit, 5); t.red = true; } } else { const f = tileFromIdx(+k); convertTile(t, f.suit, f.rank); } } render(); };
  $('#dbgTag').onchange = e => { const k = e.target.value; e.target.value = ''; if (!k) return; S.tags.push(k); setMsg(`Added ${TAGS[k].name}. Tags that act on a shop apply to the next one.`); render(); };
  $('#dbgPack').onchange = e => { const k = e.target.value; e.target.value = ''; if (!k) return; if (S.phase !== 'shop') return setMsg('Packs open in the shop.', true), render(); openPack(k, true); render(); };
  $('#dbgAnte').onchange = e => { const n = +e.target.value; e.target.value = ''; if (!n) return; S.ante = n; ensureBosses(); setMsg(`Now on Ante ${n}. Targets change from the next Blind.`); render(); };
  $('#dbgStake').onchange = e => { const k = e.target.value; e.target.value = ''; if (!k) return; S.stake = k; setMsg(`Stake set to ${STAKES[k].name} for this run.`); render(); };
  $('#dbgFlw').onchange = e => { const k = e.target.value; if (!k) return; if (!S.flowers.includes(k)) S.flowers.push(k); e.target.value = ''; render(); };
}
// A staged complete hand that exercises every counter: chips (Obsidian tile, Daruma, Scroll chips), Han (four Yaku, Red Five, Dora,
// Dragon Mark, Scroll Han), and Mult (+Mult from Tengu, Kitsune and Kasa-obake, then x3 from Hannya and x1.5 from its Polychrome edition).
function stageDemoHand() {
  if (S.phase !== 'blind') { setMsg('Start a blind first, then stage the demo hand.', true); return render(); }
  S.wall.push(...S.hand); S.hand = []; S.open = []; S.pendingDiscard = 0; S.selected = []; S.river = [];
  const mk = (suit, rank, red, eng) => { const t = mkTile(suit, rank, !!red); t.eng = eng || null; t.d = ++S.drawSeq; return normTile(t); };
  // 345 in all three suits with a Red Five in each (Sanshoku) + 678 Sou + a pair of 2 Pin: Tanyao, Pinfu, Sanshoku Doujun.
  // Built to show retriggers: Red Seals score twice, Hakutaku repeats every engraved tile, Nekomata every Red Five and
  // Shikigami the leftmost tile, so tiles score 2-4 times (the Red Seal 3 Man on the left scores four times).
  const tiles = [mk('m', 3, false, 'redseal'), mk('m', 4, false, 'obsidian'), mk('m', 5, true, 'gold'), mk('p', 3, false, 'jade'), mk('p', 4, false, 'dragonmark'), mk('p', 5, true, 'redseal'),
    mk('s', 3, false, 'obsidian'), mk('s', 4), mk('s', 5, true), mk('s', 6, false, 'gold'), mk('s', 7), mk('s', 8, false, 'redseal'), mk('p', 2, false, 'jade'), mk('p', 2), mk('z', 1), mk('z', 7), mk('m', 9)];
  S.hand = tiles; S.sortHand = false;
  S.selected = tiles.slice(0, 14).map(t => t.id);
  for (let i = 0; i < 5; i++) S.river.push(mk('z', 2 + (i % 3)));
  const ind = mk('p', 1); S.indicators = [ind]; S.dora = [nextDora(idx(ind))];       // indicator 1 Pin makes the 2 Pin pair Dora
  S.talismans = ['hakutaku', 'nekomata', 'shikigami', 'kitsune', 'hannya']; S.editions = { hannya: 'poly' }; S.talState = {};
  S.scrolls.meld.chi = Math.max(S.scrolls.meld.chi || 0, 2); S.scrolls.meld.hand = Math.max(S.scrolls.meld.hand || 0, 1);
  if (S.target < 5000) S.target = 5000;
  setMsg('Demo hand staged with retriggers: Red Seals, Hakutaku, Nekomata and Shikigami make tiles score 2–4 times. Press Play to watch and listen.'); render();
}
// Free picks (Tags) buy with a stand-in balance; 'quiet' keeps that from sounding or counting on the wallet.
function buyFree(it) { const m = S.money; S.money = 999; S.quiet = true; buy(it); S.quiet = false; S.money = m; render(); }

// ===================== BOOT & EVENTS =====================
function copySeed(btn) {
  const txt = S.seed; const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1200); };
  try { navigator.clipboard.writeText(txt).then(done, () => fallback()); } catch (e) { fallback(); }
  function fallback() { const r = document.createRange(); const code = btn.previousElementSibling; if (code) { r.selectNodeContents(code); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); btn.textContent = 'Selected'; setTimeout(() => { btn.textContent = 'Copy'; }, 1200); } }
}
// ===================== CRT =====================
// Full CRT is one SVG filter on the game and its overlays: a barrel bend (a displacement map, strongest at the corners),
// the red and blue channels nudged apart (chromatic aberration, more toward the edges), and a soft glow added back (bloom).
// Full CRT: the picture is bent outwards by a displacement map, and its red channel is nudged right for a colour fringe.
// Kept to five steps (the bloom blur and the three-way channel split were dropped: browsers run SVG filters on the CPU and
// redo them on every frame anything moves); the glow is a cheap static layer in CSS instead.
function crtFilterSVG() {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / (N - 1) * 2 - 1, v = y / (N - 1) * 2 - 1, r2 = u * u + v * v, k = .5 * r2;   // pull pixels from further out near the edges
    const i = (y * N + x) * 4; img.data[i] = 128 + Math.max(-127, Math.min(127, u * k * 127)); img.data[i + 1] = 128 + Math.max(-127, Math.min(127, v * k * 127)); img.data[i + 2] = 0; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const map = c.toDataURL();
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="crtfx" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feImage href="${map}" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G" result="bent"/>
    <feOffset in="bent" dx="1.4" dy="0" result="sh"/>
    <feColorMatrix in="sh" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
    <feColorMatrix in="bent" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb"/>
    <feComposite in="r" in2="gb" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
  </filter></svg>`;
}
function applyCRT() {
  document.body.classList.toggle('crt', CRT === 'on' || CRT === 'full'); document.body.classList.toggle('crt-full', CRT === 'full');
  if (CRT === 'full' && !document.getElementById('crtfx')) document.body.insertAdjacentHTML('beforeend', crtFilterSVG());
  if (CRT === 'full' && !document.getElementById('crtbezel')) document.body.insertAdjacentHTML('beforeend', '<div id="crtbezel" aria-hidden="true"></div>');
}
// Balatro-style hover: Talisman and shop cards tilt toward the mouse with a soft shine. Off while dragging or with reduced motion.
let tiltEl = null;
document.addEventListener('pointermove', e => {
  if (!motionOK || drag || slotDrag) { if (tiltEl) tiltEl.classList.remove('tilting'); tiltEl = null; return; }
  const el = e.target.closest && e.target.closest('.shelf .shopcard, .packmodal .shop-grid:not(.owned-grid) .shopcard, #talismans .slot.filled');
  if (tiltEl && tiltEl !== el) tiltEl.classList.remove('tilting'); tiltEl = el; if (!el) return;
  el.classList.add('tiltcard', 'tilting'); if (!el.querySelector('.cshine')) el.insertAdjacentHTML('beforeend', '<span class="cshine" aria-hidden="true"></span>');
  const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--rx', ((.5 - y) * 10).toFixed(1) + 'deg'); el.style.setProperty('--ry', ((x - .5) * 12).toFixed(1) + 'deg'); el.style.setProperty('--mx', (x * 100).toFixed(0) + '%'); el.style.setProperty('--my', (y * 100).toFixed(0) + '%');
});
function bindEvents() {
  $('#btnPlay').onclick = doPlay; $('#btnDiscard').onclick = doDiscard; $('#btnCall').onclick = doCall; $('#btnKan').onclick = doDeclareKan;
  $('#btnClear').onclick = () => { S.selected = []; S.selRiver = null; render(); };
  $('#btnSort').onclick = () => { S.sortHand = !S.sortHand; if (S.sortHand) S.hand = sortHandTiles(S.hand); render(); };
  $('#btnSortMode').onclick = () => { S.sortMode = S.sortMode === 'rank' ? 'suit' : 'rank'; S.sortHand = true; S.hand = sortHandTiles(S.hand); render(); };

  // The Wall tile-stack in the side panel opens the Wall screen (the panel is redrawn on render, so the click is delegated).
  document.addEventListener('click', e => { if (e.target.closest('#wallBtn')) showModal(deckHTML(), true); });
  $('#btnRules').onclick = () => showModal(rulesHTML(), true);
  $('#btnCollection').onclick = () => showModal(collectionHTML(), true, 'colmodal');
  // Collection search filters the current tab by the cards' visible text (works in both terminologies).
  document.addEventListener('change', e => { if (e.target.id !== 'importFile' || !e.target.files[0]) return; const f = e.target.files[0]; const r = new FileReader(); r.onload = () => { $('#importCode').value = String(r.result || ''); $('#importFileName').textContent = f.name; }; r.readAsText(f); });
  document.addEventListener('input', e => { if (e.target.id !== 'colSearch') return; const q = e.target.value.trim().toLowerCase(); let shown = 0; document.querySelectorAll('#modal .colcard').forEach(c => { const ok = !q || c.innerText.toLowerCase().includes(q); c.hidden = !ok; if (ok) shown++; }); const none = document.querySelector('#modal .colnone'); if (none) none.hidden = shown > 0; });
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
    if (t.dataset.ctab) { const prev = $('#mClose') && $('#mClose').onclick; colTab = t.dataset.ctab; showModal(collectionHTML(), true, 'colmodal'); if (prev) $('#mClose').onclick = prev; return; }
    if (t.dataset.rtab) { const prev = $('#mClose') && $('#mClose').onclick; rulesTab = t.dataset.rtab; showModal(rulesHTML(), true); if (prev) $('#mClose').onclick = prev; return; }
    if (t.dataset.setlang) { setLang(t.dataset.setlang); showModal(settingsHTML(), true); return; }
    if (t.dataset.settilenums) { TILE_NUMS = t.dataset.settilenums; try { localStorage.setItem('yakuman.tilenums', TILE_NUMS); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.dataset.sethint) { HINTS[t.dataset.sethint] = !HINTS[t.dataset.sethint]; try { localStorage.setItem('yakuman.hints', JSON.stringify(HINTS)); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setsound) { SOUND = t.dataset.setsound === 'on'; try { localStorage.setItem('yakuman.sound', SOUND ? 'on' : 'off'); } catch (e) { } if (SOUND) { audioCtx(); setTimeout(() => sfx('select'), 30); } showModal(settingsHTML(), true); return; }
    // Reset settings: the first click asks, the second clears every saved setting and reloads with the defaults (the run is saved first).
    if (t.id === 'mResetSettings') { if (t.dataset.armed) { save(); for (const k of SETTING_KEYS) { try { localStorage.removeItem(k); } catch (e) { } } location.reload(); return; } t.dataset.armed = '1'; t.textContent = 'Click again to reset'; t.classList.add('danger'); return; }
    if (t.dataset.setshake) { SHAKE = t.dataset.setshake === 'on'; try { localStorage.setItem('yakuman.shake', SHAKE ? 'on' : 'off'); } catch (e) { } showModal(settingsHTML(), true); return; }
    if (t.dataset.setcrt) { CRT = t.dataset.setcrt; try { localStorage.setItem('yakuman.crt', CRT); } catch (e) { } applyCRT(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setmusic) { MUSIC = t.dataset.setmusic === 'on'; try { localStorage.setItem('yakuman.music', MUSIC ? 'on' : 'off'); } catch (e) { } if (MUSIC) musicStart(); else musicStop(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setbg) { BG_ANIM = t.dataset.setbg === 'on'; try { localStorage.setItem('yakuman.bganim', BG_ANIM ? 'on' : 'off'); } catch (e) { } document.body.classList.toggle('bganim', BG_ANIM); showModal(settingsHTML(), true); return; }
    if (t.dataset.sethc) { HIGH_CONTRAST = t.dataset.sethc === 'on'; try { localStorage.setItem('yakuman.hc', HIGH_CONTRAST ? 'on' : 'off'); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setdots) { SHOW_DOTS = t.dataset.setdots === 'on'; try { localStorage.setItem('yakuman.dots', SHOW_DOTS ? 'on' : 'off'); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setspeed) { ANIM_SPEED = t.dataset.setspeed; try { localStorage.setItem('yakuman.speed', ANIM_SPEED); } catch (e) { } showModal(settingsHTML(), true); return; }
    if (t.dataset.setdbg) { const b = $('#debugBar'); b.hidden = t.dataset.setdbg !== 'on'; if (!b.hidden) renderDebug(); showModal(settingsHTML(), true); return; }
    if (t.dataset.setunlock) { UNLOCK_ALL = t.dataset.setunlock === 'on'; try { localStorage.setItem(UNLOCK_ALL_KEY, UNLOCK_ALL ? 'on' : 'off'); } catch (e) { } render(); showModal(settingsHTML(), true); return; }
    if (t.id === 'mDeleteRun') { showModal(`<div class="shophead"><h2>Delete Run?</h2></div><p class="muted" style="margin:4px 0 0">The run in progress ends and can't be continued. Your profile, unlocks and settings stay.</p><div class="shopfoot"><button id="mClose" class="ghost">Cancel</button><span style="flex:1"></span><button id="mConfirmDeleteRun" class="danger">Delete Run</button></div>`, true, 'confirmmodal'); backToSettings(); return; }
    if (t.id === 'mConfirmDeleteRun') { clearSave(); S = null; location.reload(); return; }
    if (t.id === 'mExport') { (async () => { EXPORT_CODE = await toCode(exportPayload()); showModal(exportHTML(), true, 'datamodal'); backToSettings(); })(); return; }
    if (t.id === 'mImport') { PENDING_IMPORT = null; showModal(importHTML(), true, 'datamodal'); backToSettings(); return; }
    if (t.id === 'mCopyCode') { const ta = $('#saveCode'); const done = () => { t.textContent = 'Copied'; setTimeout(() => { t.textContent = 'Copy Code'; }, 1400); }; const fallback = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { t.textContent = 'Selected: press Copy'; } }; try { navigator.clipboard.writeText(EXPORT_CODE).then(done, fallback); } catch (e) { fallback(); } return; }
    if (t.id === 'mDownloadCode') { saveCodeFile(t); return; }
    if (t.id === 'mLoadSave') { (async () => { try { PENDING_IMPORT = checkSave(await fromCode(($('#importCode') || {}).value)); showModal(importHTML(), true, 'datamodal'); backToSettings(); } catch (e) { const code = ($('#importCode') || {}).value || ''; showModal(importHTML(e.message || 'That save could not be read.'), true, 'datamodal'); backToSettings(); $('#importCode').value = code; } })(); return; }
    if (t.id === 'mConfirmImport') { const o = PENDING_IMPORT; if (!o) return; try { localStorage.setItem(PROFILE_KEY, JSON.stringify(Object.assign(blankProfile(), o.profile))); for (const [k, v] of Object.entries(o.settings || {})) if (SETTING_KEYS.includes(k)) localStorage.setItem(k, v); if (o.run) localStorage.setItem(SAVE_KEY, o.run); else localStorage.removeItem(SAVE_KEY); } catch (e) { } location.reload(); return; }
    if (t.id === 'mResetProfile') { showModal(`<div class="shophead"><h2>Reset Profile?</h2></div><p class="muted" style="margin:4px 0 0">Lifetime stats in this browser will be cleared and every unlock will lock again (${unlockedCount()} of ${UNLOCKS.length} unlocked). Your current run and settings stay. Export first if you want a copy.</p><div class="shopfoot"><button id="mClose" class="ghost">Cancel</button><span style="flex:1"></span><button id="mConfirmReset" class="danger">Reset Profile</button></div>`, true, 'confirmmodal'); backToSettings(); return; }
    if (t.id === 'mConfirmReset') { PROFILE = blankProfile(); saveProfile(); showModal(settingsHTML(), true); return; }
    if (t.id === 'mClose') { if (!t.onclick) { hideModal(); render(); } }   // a custom back action (to the menu or Settings) has already run
    else if (t.id === 'mEndless') { S.endless = true; ensureBosses(); genShop(); S.phase = 'cashout'; setMsg(''); render(); }
    else if (t.id === 'mNewRun' || t.id === 'mStart') { showModal(setupHTML(), true, 'setupmodal'); }
    else if (t.id === 'mChallenges') { showModal(challengesHTML(), true, 'setupmodal'); }
    else if (t.dataset.chal) { hideModal(); newRun({ challenge: t.dataset.chal }); }
    else if (t.dataset.nav || t.dataset.goto) { const [name, d] = (t.dataset.nav || t.dataset.goto).split(':'); const seed = ($('#seedInput') || {}).value || ''; const before = setupKeys(name).indexOf(setupKey(name)); if (t.dataset.nav) setupSel[name] += +d; else setupSel[name] = +d; setupDir[name] = t.dataset.nav ? +d : Math.sign(+d - before); showModal(setupHTML(), true, 'setupmodal'); $('#seedInput').value = seed; }
    else if (t.id === 'mStartRun') { if (lockOf('wall', setupKey('deck')) || stakeLock(setupKey('deck'), setupKey('stake'))) return; const deck = ($('#modal input[name=deck]') || {}).value, stake = ($('#modal input[name=stake]') || {}).value, seed = ($('#seedInput') || {}).value; hideModal(); newRun({ deck, stake, seed }); }
    else if (t.id === 'mContinue') { hideModal(); render(); }
    else if (t.id === 'mCollection') { showModal(collectionHTML(), true, 'colmodal'); $('#mClose').onclick = () => { showModal(menuHTML(!!load()), true, 'menumodal'); }; }
    else if (t.id === 'mRules') { showModal(rulesHTML() + '', true); $('#mClose').onclick = () => { showModal(menuHTML(!!load()), true, 'menumodal'); }; }
    else if (t.id === 'mCashOut') cashOut();
    else if (t.id === 'mNext') trayOut(() => { S.shop = null; S.pack = null; S.msg = ''; S.phase = 'select'; render(); });
    else if (t.id === 'mPlayBlind') { S.msg = ''; startBlind(); render(); }
    else if (t.id === 'mRunInfo') { showModal(yakuHTML(), true); $('#mClose').onclick = () => { modalPinned = false; render(); }; }
    else if (t.id === 'mReroll') reroll();
    else if (t.id === 'mSkip') skipBlind();
    else if (t.id === 'mRerollBoss') rerollBoss();
    else if (t.dataset.freepack != null) { if (trayLeaving) return; const pk = S.shop.freePacks.splice(+t.dataset.freepack, 1)[0]; trayOut(() => { openPack(pk, true); render(); }); }
    else if (t.dataset.take != null) takeFromPack(+t.dataset.take);
    else if (t.dataset.packuse != null) usePackCard(+t.dataset.packuse);
    else if (t.id === 'mPackDone') trayOut(() => { S.pack = null; render(); });
    else if (t.id === 'mDeck') { showModal(deckHTML(), true); $('#mClose').onclick = () => { modalPinned = false; render(); }; }
    else if (t.dataset.buy != null) buy(shopItems()[+t.dataset.buy]);
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
  bindEvents(); document.body.classList.toggle('bganim', BG_ANIM); applyCRT();
  if (saved && saved.phase && saved.deck) { S = saved; S.talState = S.talState || {}; (S.talismans || []).forEach(k => { if (String(k).includes('#')) talAlias(k); });
    // Resume the tile id counter above every id in the saved run, so tiles created later never collide with existing ones.
    let maxId = 0; for (const t of [...S.deck, ...S.hand, ...S.wall, ...S.river, ...S.played, ...(S.indicators || []), ...S.open.flatMap(m => m.tiles), ...((S.pack && S.pack.choices) || []).filter(c => c.tile).map(c => c.tile)]) if (t.id > maxId) maxId = t.id; tileSeq = Math.max(tileSeq, maxId);
    for (const t of [...S.deck, ...S.hand, ...S.wall, ...S.river, ...S.played, ...(S.indicators || []), ...S.open.flatMap(m => m.tiles)]) normTile(t);
    // Repair any duplicates an older save may already contain
    const seen = new Set(); for (const zone of [S.hand, S.wall, S.river, S.played, S.deck, S.indicators || [], ...S.open.map(m => m.tiles)]) for (const t of zone) { if (seen.has(t.id)) t.id = ++tileSeq; seen.add(t.id); } S.editions = S.editions || {}; S.stickers = S.stickers || {}; S.seed = S.seed || 'legacy'; S.deckKey = S.deckKey || 'standard'; S.stake = S.stake || 'white'; if (S.rngState === undefined) S.rngState = hashSeed(S.seed + Date.now()); S.stats.rungs = S.stats.rungs || {}; S.stats.yaku = S.stats.yaku || {}; S.stats.bosses = S.stats.bosses || []; S.tags = S.tags || []; if (!S.skipTags) S.skipTags = { small: pick(Object.keys(TAGS)), big: pick(Object.keys(TAGS)) }; S.stats.skipped = S.stats.skipped || 0; S.stats.calls = S.stats.calls || 0; S.stats.kans = S.stats.kans || 0; S.stats.discards = S.stats.discards || 0; S.busy = false; S.newIds = []; S.drawSeq = S.drawSeq || 0; render(); showModal(menuHTML(true), true, 'menumodal'); }
  // No saved run: the title sits over an empty table. A stand-in state lets the page draw, but it is not a run:
  // it is never saved or counted, and the first run starts when the player presses New Run and picks a Wall and Stake.
  else { S = newState(); S.placeholder = true; S.phase = 'idle'; render(); }
}
try { if (window.claude && window.claude.hot) window.claude.hot.snapshot(() => S); } catch (e) { }
const hotData = (window.claude && window.claude.hot && window.claude.hot.data) || null;
boot(hotData && hotData.phase ? hotData : load());
