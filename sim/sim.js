// Monte Carlo: how often can a solo player complete a 4-melds+pair hand under different discard rules?
let MELDS=4;
function shanten(counts){ const M=MELDS;
  let best=2*M;
  function dfs(i,m,t,p){
    while(i<34&&counts[i]===0)i++;
    if(i>=34){ let tt=t; if(m+tt>M) tt=M-m; const s=2*M-2*m-tt-(p?1:0); if(s<best)best=s; return; }
    if(8-2*m-Math.min(4-m,t+ (34-i))-1>=best) {} // no prune
    if(counts[i]>=3){counts[i]-=3;dfs(i,m+1,t,p);counts[i]+=3;}
    if(i<27&&i%9<=6&&counts[i+1]&&counts[i+2]){counts[i]--;counts[i+1]--;counts[i+2]--;dfs(i,m+1,t,p);counts[i]++;counts[i+1]++;counts[i+2]++;}
    if(!p&&counts[i]>=2){counts[i]-=2;dfs(i,m,t,true);counts[i]+=2;}
    if(m+t<M){
      if(counts[i]>=2){counts[i]-=2;dfs(i,m,t+1,p);counts[i]+=2;}
      if(i<27&&i%9<=7&&counts[i+1]){counts[i]--;counts[i+1]--;dfs(i,m,t+1,p);counts[i]++;counts[i+1]++;}
      if(i<27&&i%9<=6&&counts[i+2]){counts[i]--;counts[i+2]--;dfs(i,m,t+1,p);counts[i]++;counts[i+2]++;}
    }
    counts[i]--;dfs(i,m,t,p);counts[i]++;
  }
  dfs(0,0,0,false);
  // chiitoi / kokushi
  let pairs=0,kinds=0; for(const c of counts){ if(c>=2)pairs++; if(c>0)kinds++; }
  const chi=6-pairs+Math.max(0,7-kinds);
  const orph=[0,8,9,17,18,26,27,28,29,30,31,32,33]; let d=0,hp=false; for(const i of orph){ if(counts[i]>0)d++; if(counts[i]>=2)hp=true; }
  const kok=13-d-(hp?1:0);
  return Math.min(best,chi,kok);
}
function hasMeld(counts){ for(let i=0;i<34;i++){ if(counts[i]>=3) return true; if(i<27&&i%9<=6&&counts[i]&&counts[i+1]&&counts[i+2]) return true;} return false; }
function makeWall(suits, copies){ const w=[]; for(const s of suits) for(let r=0;r<9;r++) for(let c=0;c<copies;c++) w.push(s*9+r); for(let z=27;z<34;z++) for(let c=0;c<copies;c++) w.push(z); return w; }
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// policy: remove up to `max` tiles whose removal does not raise shanten; if none, remove the least harmful one.
function chooseDiscards(counts, max){
  const out=[]; let cur=shanten(counts);
  for(let k=0;k<max;k++){
    let bestI=-1,bestS=99;
    for(let i=0;i<34;i++){ if(!counts[i]) continue; counts[i]--; const s=shanten(counts); counts[i]++; if(s<bestS){bestS=s;bestI=i;} }
    if(bestI<0) break;
    if(bestS>cur && out.length>0) break; // only throw useless tiles after the first
    counts[bestI]--; out.push(bestI); cur=bestS;
  }
  return out;
}
function run(opts){
  const {suits=[0,1,2],copies=4,hand=14,discards=3,perDiscard=5,tileBudget=Infinity,trials=400,melds=4}=opts; MELDS=melds;
  let complete=0, meldAtDeal=0, sumSh=0, tenpai=0;
  for(let t=0;t<trials;t++){
    const wall=shuffle(makeWall(suits,copies)); const counts=new Array(34).fill(0); let n=0;
    for(let i=0;i<hand;i++){counts[wall.pop()]++;n++;}
    if(hasMeld(counts)) meldAtDeal++;
    let sh=shanten(counts); sumSh+=sh;
    let budget=tileBudget, done=sh<=-1;
    for(let d=0;d<discards && !done;d++){
      const ds=chooseDiscards(counts, Math.min(perDiscard,budget)); budget-=ds.length;
      for(let i=0;i<ds.length;i++) counts[wall.pop()]++;
      sh=shanten(counts); if(sh<=-1) done=true;
      if(budget<=0) break;
    }
    if(done) complete++; else if(sh===0) tenpai++;
  }
  return {complete:(100*complete/trials).toFixed(1)+'%', tenpaiNotComplete:(100*tenpai/trials).toFixed(1)+'%', meldAtDeal:(100*meldAtDeal/trials).toFixed(0)+'%', avgShantenAtDeal:(sumSh/trials).toFixed(2)};
}
const T=+process.argv[2]||400;
const variants={
  'A. Current: 136 tiles, 3 discards x5': {},
  'B. 6 discards x5': {discards:6},
  'C. 3 discards, no per-discard cap': {perDiscard:14},
  'D. Discard budget of 20 tiles, any size': {discards:20,perDiscard:14,tileBudget:20},
  'E. 18 single-tile discard/draw turns (real Mahjong pace)': {discards:18,perDiscard:1},
  'F. Two suits + honors (100 tiles), 3 discards x5': {suits:[0,1]},
  'G. Two suits + honors, 6 discards x5': {suits:[0,1],discards:6},
  'H. One suit + honors (64 tiles), 3 discards x5': {suits:[0]},
  'I. Hand size 17 (need 14), 3 discards x5': {hand:17},
  'J. Doc original: 2 copies each (68+4), 3 discards x5': {copies:2},
};
for(const [name,o] of Object.entries(variants)){ const t0=Date.now(); const r=run({...o,trials:T}); console.log(name.padEnd(58), JSON.stringify(r), ((Date.now()-t0)/1000).toFixed(0)+'s'); }
const more={
  'K. Hand 17, 6 discards x5': {hand:17,discards:6},
  'L. Two suits + honors, hand 17, 3 discards x5': {suits:[0,1],hand:17},
  'M. Budget 20 tiles + two suits': {suits:[0,1],discards:20,perDiscard:14,tileBudget:20},
  'N. Complete = 3 melds + pair (11 of 14), 3 discards x5': {melds:3},
  'O. Complete = 3 melds + pair, 6 discards x5': {melds:3,discards:6},
};
for(const [name,o] of Object.entries(more)){ const r=run({...o,trials:T}); console.log(name.padEnd(58), JSON.stringify(r)); }
