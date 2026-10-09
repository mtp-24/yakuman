// Property test: a play should never score less than a strictly smaller play made from a subset of its own tiles.
const fs=require('fs'); const SRC=process.argv[2]; const N=+process.argv[3]||3000;
let S; require('vm').runInThisContext(fs.readFileSync(SRC+'/data.js','utf8')+fs.readFileSync(SRC+'/engine.js','utf8'));
let n=0; const T=(s,r,red,eng)=>({id:++n,suit:s,rank:r,red:!!red,eng:eng||null,d:++n});
const R=k=>Math.floor(Math.random()*k);
function randMeld(){ const suit=['m','p','s'][R(3)]; if(Math.random()<0.5){ const a=1+R(7); return [T(suit,a),T(suit,a+1),T(suit,a+2)]; } if(Math.random()<0.3){ const z=1+R(7); return [T('z',z),T('z',z),T('z',z)]; } const r=1+R(9); return [T(suit,r),T(suit,r),T(suit,r)]; }
function randPair(){ if(Math.random()<0.3){ const z=1+R(7); return [T('z',z),T('z',z)]; } const suit=['m','p','s'][R(3)]; const r=1+R(9); return [T(suit,r),T(suit,r)]; }
function decorate(tiles){ for(const t of tiles){ if(t.rank===5&&t.suit!=='z'&&Math.random()<0.5) t.red=true; if(Math.random()<0.15) t.eng=['gold','obsidian','dragonmark','jade','redseal','glass'][R(6)]; } }
const TALK=Object.keys(TAL); const EDK=[null,'foil','holo','poly'];
function randState(){ const tal=[]; const k=R(5)+1; while(tal.length<k){ const t=TALK[R(TALK.length)]; if(!tal.includes(t)) tal.push(t); }
  const ed={}; for(const t of tal) if(Math.random()<0.3) ed[t]=EDK[1+R(3)];
  const sm={}; for(const t of ['chi','pon','kan','pair','hand']) if(Math.random()<0.4) sm[t]=1+R(3);
  const sy={}; for(const y of ['tanyao','pinfu','yakuhai','honitsu','toitoi']) if(Math.random()<0.2) sy[y]=1;
  const boss=Math.random()<0.3?Object.keys(BOSSES)[R(Object.keys(BOSSES).length)]:null;
  const ts={gashadokuro:R(4),jorogumo:20*R(3),kasaobake:2*R(5),nopperabo:R(4),sekito:R(3),aobozu:R(4),shiro:10*R(3),takibi:R(3),hoshizora:R(5),mabo:R(3),chochin:R(6),sazaeoni:R(3)};
  const S0={talismans:tal,editions:ed,boss,bossSuit:['m','p','s'][R(3)],firstPlayDone:Math.random()<0.7,river:[],dora:[],scrolls:{meld:sm,yaku:sy},wall:new Array(R(100)).fill(0),open:[],talState:ts,plays:1+R(5),stats:{rungs:{chi:R(5),hand:R(5),rung31:R(3)},yaku:{tanyao:R(3)}},hand:[]};
  for(let i=0;i<R(12);i++) S0.river.push(T(['m','p','s','z'][R(4)],1+R(7)));
  return S0; }
const bad={}; let tested=0, viol=0, unexplained=0; const examples=[];
for(let i=0;i<N;i++){
  S=randState(); setRules(S);
  const melds=[randMeld(),randMeld(),randMeld(),randMeld()], pair=randPair();
  const full=[].concat(...melds,pair); decorate(full);
  const spare=[T('m',1+R(9)),T('p',1+R(9)),T('s',1+R(9))]; decorate(spare);
  S.hand=full.concat(spare).map(t=>t); // 17 in hand
  const b=bestHand(full,[],S); if(!b) continue;
  const fullC=scoreCtx(S,'hand',full,{yaku:b.yaku,dec:b.dec,preview:true});
  // lesser plays carved from the same tiles
  const subs=[];
  subs.push(['ready hand (3 melds + pair)', [].concat(melds[0],melds[1],melds[2],pair)]);
  subs.push(['four melds, no pair', [].concat(...melds)]);
  subs.push(['three melds', [].concat(melds[0],melds[1],melds[2])]);
  subs.push(['two melds + pair', [].concat(melds[0],melds[1],pair)]);
  subs.push(['two melds', [].concat(melds[0],melds[1])]);
  subs.push(['one meld + pair', [].concat(melds[0],pair)]);
  subs.push(['one meld', melds[0]]);
  subs.push(['pair', pair]);
  let prev=null;
  for(const [name,tiles] of subs){
    const part=partitionPlay(tiles); if(!part) continue;
    const c=scoreCtx(S,'meld',tiles,{part,preview:true}); tested++;
    if(c.total>fullC.total && !(fullC.furiten)){ viol++; if(!S.talismans.some(k=>k==='daimyo'||k==='nurarihyon')) unexplained++; const key=name; bad[key]=(bad[key]||0)+1; if(examples.length<12) examples.push({name, lesser:c.total, full:fullC.total, tal:S.talismans.join(','), boss:S.boss, scrolls:JSON.stringify(S.scrolls.meld), fullLines:fullC.lines.filter(l=>l.tal||l.zero).map(l=>l.label+'='+l.val).join('; '), lessLines:c.lines.filter(l=>l.tal||l.zero).map(l=>l.label+'='+l.val).join('; ')}); }
  }
}
console.log(`tested ${tested} lesser-vs-complete comparisons over ${N} random situations; violations (lesser play scores MORE than the complete hand it sits inside, Furiten excluded): ${viol} (${(100*viol/tested).toFixed(2)}%)`);
console.log('by lesser play:', JSON.stringify(bad));
console.log(`violations without Daimyo or Nurarihyon (the two deliberate exceptions): ${unexplained}`);
for(const e of examples) console.log(JSON.stringify(e));
