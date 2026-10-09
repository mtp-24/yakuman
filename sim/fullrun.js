// Full-run simulator: drives the real game engine (scoreCtx, bestHand, partitionPlay) with a scripted player and a shop policy.
const fs=require('fs'); const SRC=process.argv[2]; const RUNS=+process.argv[3]||200;
require('vm').runInThisContext(fs.readFileSync(SRC+'/data.js','utf8')+fs.readFileSync(SRC+'/engine.js','utf8'));
const TAL_PRI={hannya:10,gashadokuro:9,ryujin:8,nureonna:8,ushioni:8,rokurokubi:7,daruma:7,nurarihyon:7,oni:6,ryu:6,kitsune:6,sazaeoni:6,tengu:6,komainu:6,maneki:5,nekomata:5,shikigami:5,yatagarasu:5,amanojaku:5,tsukumogami:5,kodama:4,namazu:4,jorogumo:4,koi:4,baku:4,nue:4,jizo:4,kappa:4,tsuru:3,yukionna:3,tanuki:3,mizuchi:3,nurikabe:3,funayurei:3,zashiki:2,amabie:2,hakutaku:2,hitotsume:2};
const SCR_PRI={'m:hand':6,'m:chi':5,'m:pon':3,'m:pair':2,'m:kan':1,'y:tanyao':4,'y:pinfu':3,'y:yakuhai':3,'y:honitsu':2,'y:toitoi':2,'y:chinitsu':1,'y:chiitoitsu':1,'y:sanshoku':1,'y:ittsu':1,'y:chanta':1};
const FLW_PRI={bamboo:8,plum:7,orchid:6,chrysanthemum:4,winter:4,summer:4,spring:1,autumn:1};
const RESERVE=+process.argv[4]||0; const VARIANT=process.argv[5]||'base'; CFG.sharkPerAction=true;
if(VARIANT==='plays5') CFG.playsPerBlind=5;
if(VARIANT==='gentle') { CFG.anteBase[0]=250; CFG.anteBase[1]=700; }
if(VARIANT==='money8') CFG.startMoney=8;
if(VARIANT==='sharkaction') CFG.sharkPerAction=true;
if(VARIANT==='combo') { CFG.playsPerBlind=5; CFG.anteBase[0]=250; CFG.anteBase[1]=700; CFG.sharkPerAction=true; }
function newS(){ const bosses=shuffle(Object.keys(BOSSES)).concat(shuffle(Object.keys(BOSSES))); return {editions:{},deck:buildDeck(),wall:[],hand:[],river:[],open:[],played:[],ante:1,blindIndex:0,boss:null,bossOrder:bosses,target:0,score:0,plays:0,discards:0,money:CFG.startMoney,talismans:[],consumables:[],scrolls:{meld:{},yaku:{}},flowers:[],dora:[],indicators:[],talState:{},bonusPlays:0,drawSeq:0,bought:[]}; }
const hasF=(S,k)=>S.flowers.includes(k); const handSize=S=>CFG.handSize+(hasF(S,'plum')?1:0); const cap=S=>handSize(S)-3*S.open.length; const need=S=>14-3*S.open.length;
const talMod=(S,f)=>S.talismans.reduce((a,k)=>a+(TAL[k][f]||0),0);
const asT=t=>t; const tiles=h=>h;
function draw(S){ while(S.hand.length<cap(S)&&S.wall.length){ const t=S.wall.pop(); t.d=++S.drawSeq; S.hand.push(t);} }
function bestStructure(hand,capM){ const counts=new Array(34).fill(0); for(const t of hand) counts[idx(t)]++; let best={m:0,p:0,key:-1,sets:[]};
  function rec(i,m,p,sets){ while(i<34&&counts[i]===0)i++; if(i>=34){ if(p===2&&m>0) return; const k=m*10+p; if(k>best.key) best={m,p,key:k,sets:sets.slice()}; return; }
    if(m<capM&&counts[i]>=3){counts[i]-=3;sets.push({type:'pon',i});rec(i,m+1,p,sets);sets.pop();counts[i]+=3;}
    if(m<capM&&i<27&&i%9<=6&&counts[i+1]&&counts[i+2]){counts[i]--;counts[i+1]--;counts[i+2]--;sets.push({type:'chi',i});rec(i,m+1,p,sets);sets.pop();counts[i]++;counts[i+1]++;counts[i+2]++;}
    if(p<2&&counts[i]>=2){counts[i]-=2;sets.push({type:'pair',i});rec(i,m,p+1,sets);sets.pop();counts[i]+=2;}
    counts[i]--;rec(i,m,p,sets);counts[i]++; }
  rec(0,0,0,[]); return best; }
function takeTiles(S,sets){ const used=[]; for(const s of sets){ const needI=s.type==='chi'?[s.i,s.i+1,s.i+2]:s.type==='pon'?[s.i,s.i,s.i]:[s.i,s.i]; for(const n of needI){ let k=S.hand.findIndex(t=>idx(t)===n&&t.red); if(k<0) k=S.hand.findIndex(t=>idx(t)===n); used.push(S.hand[k]); S.hand.splice(k,1);} } return used; }
function safeDiscards(S,max){ const o=S.open.length; const sh0=handShanten(S.hand,o); const out=[]; for(let k=0;k<max;k++){ let f=-1; for(let j=0;j<S.hand.length;j++){ const rest=S.hand.filter((_,q)=>q!==j); if(handShanten(rest,o)===sh0){f=j;break;} } if(f<0)break; out.push(S.hand[f]); S.hand.splice(f,1);} return out; }
function findCall(S){ const hand=S.hand,o=S.open.length; const cur=handShanten(hand,o); let best=null; const seen=new Set();
  for(const r of S.river){ const ri=idx(r); if(seen.has(ri)) continue; seen.add(ri); const cands=[]; const same=hand.filter(t=>idx(t)===ri); if(same.length>=3) cands.push([same[0],same[1],'kan',same[2]]); if(same.length>=2) cands.push([same[0],same[1],'pon']);
    if(ri<27){ const rk=ri%9; const f=d=>hand.find(t=>idx(t)===ri+d); for(const [d1,d2] of [[-2,-1],[-1,1],[1,2]]){ if(rk+d1<0||rk+d2>8) continue; const a=f(d1),b=f(d2); if(a&&b) cands.push([a,b,'chi']); } }
    for(const [a,b,type,c3] of cands){ const rest=hand.filter(t=>t!==a&&t!==b&&t!==c3); const sh=handShanten(rest,o+1); if(sh<cur&&(!best||sh<best.sh)) best={r,a,b,c3,type,sh}; } }
  return best; }
function playCtx(S,kind,sel,info){ const ctx=scoreCtx(S,kind,sel,info); if(kind==='hand'&&ctx.yaku.some(y=>y.key==='rinshan')) STATS.rinshan++; for(const k of S.talismans) if(TAL[k].afterScore) TAL[k].afterScore(ctx,S); S.plays--; S.score+=ctx.total; S.money+=ctx.money; return ctx; }
function playBlind(S,stats){
  const kind=['small','big','boss'][S.blindIndex]; S.boss=kind==='boss'?S.bossOrder[S.ante-1]:null; S.target=Math.floor(CFG.anteBase[S.ante-1]*CFG.blindMult[kind]);
  S.plays=Math.max(1,CFG.playsPerBlind+S.bonusPlays+talMod(S,'plays')+(hasF(S,'bamboo')?1:0)); S.discards=CFG.discardsPerBlind+talMod(S,'discards')+(hasF(S,'orchid')?1:0);
  S.wall=shuffle(S.deck.slice()); S.deck=[]; S.hand=[]; S.river=[]; S.open=[]; S.played=[]; S.dora=[]; S.indicators=[]; S.score=0; draw(S);
  for(const k of S.talismans) if(TAL[k].onBlindStart) TAL[k].onBlindStart(S);
  const freeCall=S.talismans.some(k=>TAL[k].freeCall);
  while(S.plays>0&&S.score<S.target){
    const mNeed=4-S.open.length; const st=bestStructure(S.hand,mNeed);
    if(st.m===mNeed&&st.p===1){ const sel=sortTiles(takeTiles(S,st.sets)); const b=bestHand(sel,S.open,S); if(b){ playCtx(S,'hand',sel.concat(S.open.flatMap(m=>m.tiles)),{yaku:b.yaku,dec:b.dec}); S.played.push(...sel,...S.open.flatMap(m=>m.tiles)); S.open=[]; stats.hands++; draw(S); continue; } else { S.hand.push(...sel); } }
    // declare a closed Kan whenever four identical tiles are held
    { const counts={}; for(const t of S.hand) counts[idx(t)]=(counts[idx(t)]||0)+1; const ki=Object.keys(counts).find(k=>counts[k]>=4); if(ki!==undefined&&S.open.length<4){ const four=S.hand.filter(t=>idx(t)===+ki).slice(0,4); S.hand=S.hand.filter(t=>!four.includes(t)); S.open.push({type:'kan',tiles:sortTiles(four),calledId:null,closed:true}); const rp=S.wall.pop(); if(rp){ rp.d=++S.drawSeq; rp.rinshan=true; S.hand.push(rp); } stats.kans++; draw(S); continue; } }
    if(S.river.length&&S.open.length<4&&(freeCall||S.plays>1)){ const c=findCall(S); if(c){ S.hand=S.hand.filter(t=>t!==c.a&&t!==c.b&&t!==c.c3); S.river=S.river.filter(t=>t!==c.r); S.open.push({type:c.type,tiles:sortTiles([c.r,c.a,c.b].concat(c.c3?[c.c3]:[])),calledId:c.r.id}); if(!freeCall)S.plays--; for(const k of S.talismans) if(TAL[k].onCall) TAL[k].onCall(S); stats.calls++; if(c.type==='kan'){ const rp=S.wall.pop(); if(rp){ rp.d=++S.drawSeq; rp.rinshan=true; S.hand.push(rp); } stats.kans++; } if(S.hand.length>cap(S)){ const d=safeDiscards(S,1); if(d.length) S.river.push(d[0]); else S.river.push(S.hand.pop()); } draw(S); continue; } }
    if(S.discards>0){ let max=CFG.maxDiscardTiles; if(S.boss==='loanshark') max=CFG.sharkPerAction?(S.money>=1?max:0):Math.min(max,S.money); if(max>0){ const dead=safeDiscards(S,max); if(dead.length){ S.river.push(...dead); S.discards--; if(S.boss==='loanshark') S.money-=CFG.sharkPerAction?1:dead.length; for(const k of S.talismans) if(TAL[k].onDiscard) TAL[k].onDiscard(S,dead); draw(S); continue; } } }
    // cash a partial (avoid tiny ones under the Wall-Builder if we still have plays to spare)
    let sets=st.sets; if(st.key<=0){ let k=0; for(let j=1;j<S.hand.length;j++) if(tileChips(S.hand[j],S)>tileChips(S.hand[k],S)) k=j; sets=null; const t=S.hand.splice(k,1)[0]; const part=partitionPlay([t]); playCtx(S,'meld',[t],{part}); S.played.push(t); }
    else { const used=sortTiles(takeTiles(S,sets)); const part=partitionPlay(used); if(!part){ S.hand.push(...used); S.plays--; continue; } playCtx(S,'meld',used,{part}); S.played.push(...used); }
    stats.partials++; draw(S);
  }
  const won=S.score>=S.target;
  if(won){ const base=CFG.blindReward[kind], left=S.plays, interest=Math.min(hasF(S,'winter')?10:CFG.interestCap,Math.floor(S.money/CFG.interestPer)); let tal=0; for(const k of S.talismans) if(TAL[k].onBlindEnd) tal+=TAL[k].onBlindEnd(S); S.money+=base+left+interest+tal+(hasF(S,'summer')?2:0); }
  S.deck=[...S.hand,...S.wall,...S.river,...S.open.flatMap(m=>m.tiles),...S.played,...S.indicators]; for(const t of S.deck) delete t.rinshan; S.hand=[];S.wall=[];S.river=[];S.open=[];S.played=[];
  return won;
}
function shop(S){
  const price=c=>hasF(S,'chrysanthemum')?Math.max(1,Math.ceil(c*0.8)):c;
  const roll=()=>{ const r=Math.random(),w=CFG.shopWeights; if(r<w.talisman){ const pool=TALISMANS.filter(t=>!S.talismans.includes(t.key)); if(pool.length) return {kind:'talisman',def:pick(pool),edition:rollEdition()}; } if(r<w.talisman+w.omikuji) return {kind:'omikuji',def:pick(OMIKUJI)}; return {kind:'kami',def:pick(KAMI)}; };
  const cards=[roll(),roll()]; const scroll={kind:'scroll',def:pick(SCROLLS)}; const fl=FLOWERS.filter(f=>!S.flowers.includes(f.key)); const flower=fl.length?{kind:'flower',def:pick(fl)}:null;
  const items=[...cards,scroll,flower].filter(Boolean).map(it=>{ let v=0; if(it.kind==='talisman') v=(TAL_PRI[it.def.key]||3)+(S.talismans.length<5?0:-99); else if(it.kind==='scroll') v=SCR_PRI[it.def.key]||1; else if(it.kind==='flower') v=FLW_PRI[it.def.key]||1; else v=-1; return {it,v:v+(it.edition?2:0),p:price(it.def.cost+(it.edition?EDITIONS[it.edition].price:0))}; }).filter(x=>x.v>0).sort((a,b)=>b.v/b.p-a.v/a.p);
  for(const x of items){ if(S.money-x.p<RESERVE) continue; const it=x.it; if(it.kind==='talisman'){ if(S.talismans.length>=CFG.talismanSlots) continue; S.talismans.push(it.def.key); if(it.edition) S.editions[it.def.key]=it.edition; } else if(it.kind==='scroll'){ const [t,k]=it.def.key.split(':'); const b=t==='m'?'meld':'yaku'; S.scrolls[b][k]=(S.scrolls[b][k]||0)+1; } else if(it.kind==='flower'){ S.flowers.push(it.def.key); } S.money-=x.p; S.bought.push(it.def.key); }
}
const reach=new Array(9).fill(0); const dieAt={}; let wins=0; const moneyAt={}; const talAt={}; const stats={hands:0,partials:0,calls:0,kans:0,blinds:0}; const STATS={rinshan:0};
for(let r=0;r<RUNS;r++){
  const S=newS(); let alive=true;
  while(alive){
    const won=playBlind(S,stats); stats.blinds++;
    if(!won){ const key=`A${S.ante} ${['small','big','boss'][S.blindIndex]}${S.boss?' ('+BOSSES[S.boss].name+')':''}`; dieAt[key]=(dieAt[key]||0)+1; alive=false; break; }
    if(S.ante===CFG.antes&&S.blindIndex===2){ wins++; reach[8]++; alive=false; break; }
    S.blindIndex++; if(S.blindIndex>2){ S.blindIndex=0; S.ante++; reach[S.ante-1]++; moneyAt[S.ante]=(moneyAt[S.ante]||0)+S.money; talAt[S.ante]=(talAt[S.ante]||0)+S.talismans.length; }
    shop(S);
  }
}
console.log(`[${VARIANT}] Full runs: ${RUNS}, shop policy: spend down to $${RESERVE} on Talismans/Scrolls/Flowers by value per dollar, never buys consumables.`);
console.log('Reached Ante:', [2,3,4,5,6,7,8].map(a=>`A${a} ${(100*reach[a-1]/RUNS).toFixed(0)}%`).join('  '), ` | WON ${(100*wins/RUNS).toFixed(1)}%`);
console.log('Avg money / Talismans entering Ante:', [2,3,4,5,6,7,8].filter(a=>reach[a-1]).map(a=>`A${a} $${(moneyAt[a]/reach[a-1]).toFixed(0)} / ${(talAt[a]/reach[a-1]).toFixed(1)}`).join('  '));
console.log('Deaths:', Object.entries(dieAt).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${k} ${(100*v/RUNS).toFixed(0)}%`).join(' | '));
console.log(`Per blind: ${(stats.hands/stats.blinds).toFixed(2)} complete hands, ${(stats.partials/stats.blinds).toFixed(2)} partials, ${(stats.calls/stats.blinds).toFixed(2)} calls, ${(stats.kans/stats.blinds).toFixed(3)} Kans | Rinshan Kaihou wins: ${STATS.rinshan} (${(100*STATS.rinshan/Math.max(1,stats.hands)).toFixed(2)}% of complete hands)`);
