function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function deck(){const d=[];for(let s=0;s<4;s++)for(let r=0;r<13;r++)d.push({s,r});return d;}
function evalHand(h){ // best 5-card category present in 8 cards
  const sc=[0,0,0,0], rc=new Array(13).fill(0); for(const c of h){sc[c.s]++;rc[c.r]++;}
  const flush=sc.some(x=>x>=5);
  let straight=false; const present=rc.map(x=>x>0); const pr=[...present, present[0]]; for(let i=0;i<=9;i++){ if(pr[i]&&pr[i+1]&&pr[i+2]&&pr[i+3]&&pr[i+4]) straight=true; }
  const trips=rc.filter(x=>x>=3).length, pairs=rc.filter(x=>x>=2).length, quads=rc.some(x=>x>=4);
  return {flush, straight, fullhouse: trips>=1 && pairs>=2, trips:trips>=1, twopair:pairs>=2, pair:pairs>=1, quads};
}
function run(discards, trials){
  const agg={}; let flushAfter=0;
  for(let t=0;t<trials;t++){
    const d=shuffle(deck()); let h=d.splice(0,8); const e=evalHand(h); for(const k in e) agg[k]=(agg[k]||0)+(e[k]?1:0);
    // greedy flush chase with discards of up to 5
    let got=e.flush;
    for(let i=0;i<discards&&!got;i++){ const sc=[0,0,0,0]; for(const c of h)sc[c.s]++; const best=sc.indexOf(Math.max(...sc)); const off=h.filter(c=>c.s!==best).slice(0,5); h=h.filter(c=>!off.includes(c)); for(let k=0;k<off.length;k++) h.push(d.pop()); if(evalHand(h).flush) got=true; }
    if(got) flushAfter++;
  }
  const out={}; for(const k in agg) out[k+'@deal']=(100*agg[k]/trials).toFixed(1)+'%'; out['flush within '+discards+' discards']=(100*flushAfter/trials).toFixed(1)+'%';
  return out;
}
console.log('Balatro, 8 cards from 52:', JSON.stringify(run(3,20000)));
