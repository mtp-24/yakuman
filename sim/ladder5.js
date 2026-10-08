const fs=require('fs'); const SRC=process.argv[2];
require('vm').runInThisContext(fs.readFileSync(SRC+'/data.js','utf8')+fs.readFileSync(SRC+'/engine.js','utf8'));
const RUNG={'0,1':[5,0],'0,2':[15,1],'2,0':[30,1],'2,1':[40,1],'3,0':[60,2],'3,1':[80,2],'4,0':[100,2]};
const chipOf=i=>(i>=27||i%9===0||i%9===8)?10:i%9+1;
const SUIT=i=>SUITS[Math.floor(i/9)], RANK=i=>i%9+1;
const asTile=t=>({id:t.id,suit:SUIT(t.i),rank:RANK(t.i),red:t.red,eng:null});
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
let seq=0; function makeWall(){ const w=[]; for(let s=0;s<3;s++) for(let r=0;r<9;r++) for(let c=0;c<4;c++) w.push({id:++seq,i:s*9+r,red:r===4&&(c===0||(s===1&&c===1))}); for(let z=27;z<34;z++) for(let c=0;c<4;c++) w.push({id:++seq,i:z,red:false}); return w; }
function bestStructure(hand,cap){
  const counts=new Array(34).fill(0); for(const t of hand) counts[t.i]++;
  let best={m:0,p:0,key:-1,sets:[]};
  function rec(i,m,p,sets){
    while(i<34&&counts[i]===0)i++;
    if(i>=34){ if(p===2&&m>0) return; const k=m*10+p; if(k>best.key) best={m,p,key:k,sets:sets.slice()}; return; }
    if(m<cap&&counts[i]>=3){counts[i]-=3;sets.push({type:'pon',i});rec(i,m+1,p,sets);sets.pop();counts[i]+=3;}
    if(m<cap&&i<27&&i%9<=6&&counts[i+1]&&counts[i+2]){counts[i]--;counts[i+1]--;counts[i+2]--;sets.push({type:'chi',i});rec(i,m+1,p,sets);sets.pop();counts[i]++;counts[i+1]++;counts[i+2]++;}
    if(p<2&&counts[i]>=2){counts[i]-=2;sets.push({type:'pair',i});rec(i,m,p+1,sets);sets.pop();counts[i]+=2;}
    counts[i]--;rec(i,m,p,sets);counts[i]++;
  }
  rec(0,0,0,[]); return best;
}
function takeTiles(hand,sets){ const used=[]; for(const s of sets){ const need=s.type==='chi'?[s.i,s.i+1,s.i+2]:s.type==='pon'?[s.i,s.i,s.i]:[s.i,s.i]; for(const n of need){ let k=hand.findIndex(t=>t.i===n&&t.red); if(k<0) k=hand.findIndex(t=>t.i===n); used.push(hand[k]); hand.splice(k,1);} } return used; }
function safeDiscards(hand,openN,max){ const sh0=handShanten(hand.map(asTile),openN); const out=[]; for(let k=0;k<max;k++){ let f=-1; for(let j=0;j<hand.length;j++){ const rest=hand.filter((_,q)=>q!==j).map(asTile); if(handShanten(rest,openN)===sh0){f=j;break;} } if(f<0)break; out.push(hand[f]); hand.splice(f,1);} return out; }
function worstDiscard(hand,openN){ let bi=0,bs=99; for(let j=0;j<hand.length;j++){ const rest=hand.filter((_,q)=>q!==j).map(asTile); const s=handShanten(rest,openN); if(s<bs){bs=s;bi=j;} } return hand.splice(bi,1)[0]; }
let findCall=function(hand,river,openN){ // best call lowering shanten; returns {r, a, b, type, sh}
  const cur=handShanten(hand.map(asTile),openN); let best=null; const seen=new Set();
  for(const r of river){ if(seen.has(r.i)) continue; seen.add(r.i);
    const cands=[]; const same=hand.filter(t=>t.i===r.i); if(same.length>=2) cands.push([same[0],same[1],'pon']);
    if(r.i<27){ const rk=r.i%9; const f=d=>hand.find(t=>t.i===r.i+d); for(const [d1,d2] of [[-2,-1],[-1,1],[1,2]]){ if(rk+d1<0||rk+d2>8) continue; const a=f(d1),b=f(d2); if(a&&b) cands.push([a,b,'chi']); } }
    for(const [a,b,type] of cands){ const rest=hand.filter(t=>t!==a&&t!==b).map(asTile); const sh=handShanten(rest,openN+1); if(sh<cur&&(!best||sh<best.sh)) best={r,a,b,type,sh}; }
  }
  return best;
}
function playBlind(o){
  const tal=o.tal||[]; const has=k=>tal.includes(k);
  const S={talismans:tal,boss:null,river:[],dora:[],scrolls:{meld:{},yaku:{}},wall:[],open:[],talState:{}};
  const wall=shuffle(makeWall()); let dseq=0; let hand=wall.splice(0,17), river=[], open=[]; for(const t of hand) t.d=++dseq; let P=4,D=5,score=0,calls=0,furi=0,furiB=0,furiC=0,nWaits=0,riverAtWin=0,completes=0,sazae=0; const rungs=[];
  if(has('funayurei')) for(let i=0;i<3;i++) river.push(wall.pop());
  const cap=()=>17-3*open.length; const draw=()=>{ while(hand.length<cap()&&wall.length){ const t=wall.pop(); t.d=++dseq; hand.push(t);} };
  const scoreOf=(sets,used,complete)=>{
    const m=sets.filter(s=>s.type!=='pair').length, p=sets.filter(s=>s.type==='pair').length; let chips,han,x=1;
    if(complete){ chips=120; han=2; const conc=used.map(asTile); const openM=open.map(m=>({type:m.type,tiles:m.tiles.map(asTile)})); const b=bestHand(conc,openM,S); han+=Math.max(1,b?b.yaku.han:0); used=used.concat(open.flatMap(m=>m.tiles)); }
    else if(m===1&&p===0){ chips=sets[0].type==='chi'?10:20; han=1; } else if(m===1){ chips=(sets[0].type==='chi'?10:20)+10; han=1; } else { [chips,han]=RUNG[m+','+p]; }
    for(const s of sets) if(s.type==='pon'&&s.i>=27) han++;
    for(const t of used){ chips+=chipOf(t.i); if(t.red) han++; if(complete&&has('namazu')&&open.some(mm=>mm.calledId===t.id)) chips+=30; }
    if(has('daruma')) chips+=4*river.length;
    if(has('nureonna')) han+=Math.min(3,Math.floor(river.length/10));
    if(has('mizuchi')&&river.length<8) x*=1.5;
    if(complete){ if(has('sazaeoni')){han+=sazae; sazae=0;}
      const win=used.filter(t=>t.d!==undefined).reduce((a,b)=>b.d>a.d?b:a); const copies=river.filter(t=>t.i===win.i).length;
      if(copies){ if(has('kappa')) chips+=100*copies; else { x*=0.5; furi++; } }
      riverAtWin+=river.length; completes++; }
    return Math.floor(chips*hanMult(han)*x);
  };
  while(P>0&&score<score+1&&score<(o.target||Infinity)){
    const need=4-open.length; const st=bestStructure(hand,need);
    if(st.m===need&&st.p>=1&&!(st.p===2)){ const used=takeTiles(hand,st.sets); score+=scoreOf(st.sets,used,true); rungs.push('complete'); P--; open=[]; draw(); continue; }
    const free=has('ryujin');
    if(river.length&&open.length<4&&(free||P>1)){ const c=findCall(hand,river,open.length); if(c){ hand=hand.filter(t=>t!==c.a&&t!==c.b); river=river.filter(t=>t!==c.r); open.push({type:c.type,tiles:[c.r,c.a,c.b],calledId:c.r.id}); if(!free)P--; calls++; if(has('sazaeoni')) sazae++; if(hand.length>cap()){ const d=safeDiscards(hand,open.length,1); river.push(d.length?d[0]:worstDiscard(hand,open.length)); } draw(); continue; } }
    if(D>0){ const dead=safeDiscards(hand,open.length,7); if(dead.length){ river.push(...dead); D--; draw(); continue; } }
    if(st.key<=0){ let k=0; for(let j=1;j<hand.length;j++) if(chipOf(hand[j].i)>chipOf(hand[k].i)) k=j; const t=hand.splice(k,1)[0]; score+=Math.floor(chipOf(t.i)*hanMult(t.red?1:0)); rungs.push('single'); }
    else { const used=takeTiles(hand,st.sets); score+=scoreOf(st.sets,used,false); rungs.push(st.m+'m'+(st.p===2?'+pp':st.p?'+p':'')); }
    P--; draw();
  }
  return {score,calls,furi,furiB,furiC,nWaits,riverAtWin,completes};
}


const N=+process.argv[3]||800;
const CONF={
 'Baseline (Calls on, winning-tile Furiten)':{},
 'Kappa (retuned)':{tal:['kappa']}, 'Daruma':{tal:['daruma']}, 'Nure-onna (retuned)':{tal:['nureonna']}, 'Ryūjin':{tal:['ryujin']}, 'Namazu':{tal:['namazu']},
 'Funayūrei':{tal:['funayurei']}, 'Sazae-oni':{tal:['sazaeoni']}, 'Mizuchi (retuned)':{tal:['mizuchi']},
 'Calling build: Ryūjin + Namazu + Sazae-oni':{tal:['ryujin','namazu','sazaeoni']},
 'River build: Kappa + Daruma + Nure-onna':{tal:['kappa','daruma','nureonna']},
};
for(const [name,o] of Object.entries(CONF)){
  const sc=[]; let calls=0,furi=0,comp=0;
  for(let t=0;t<N;t++){ const r=playBlind(o); sc.push(r.score); calls+=r.calls; furi+=r.furi; comp+=r.completes; }
  sc.sort((a,b)=>a-b); const pct=q=>sc[Math.floor(q*(N-1))]; const clear=T=>(100*sc.filter(s=>s>=T).length/N).toFixed(0)+'%';
  console.log(name.padEnd(44)+` median ${String(pct(.5)).padStart(5)}  p90 ${String(pct(.9)).padStart(5)} | A1 boss ${clear(600)}  A2 boss ${clear(1600)}  A3 boss ${clear(4000)}  A4 small ${clear(4500)}  A4 boss ${clear(9000)} | calls/blind ${(calls/N).toFixed(2)}  furiten ${comp?(100*furi/comp).toFixed(0):0}%`);
}
