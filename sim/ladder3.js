const fs=require('fs'); const SRC=process.argv[2];
require('vm').runInThisContext(fs.readFileSync(SRC+'/data.js','utf8')+fs.readFileSync(SRC+'/engine.js','utf8'));
const FAKE={talismans:[],boss:null,river:[],dora:[],scrolls:{meld:{},yaku:{}},wall:[],open:[]};
// proposed ladder: key "melds,pair" -> [chips, han]
let HANB=0, COMPLETE_HAN=3;
let RUNG={'0,0':[0,0],'0,1':[5,0],'1,0':null,'1,1':[20,1],'2,0':[30,1],'2,1':[40,2],'3,0':[60,2],'3,1':[80,3],'4,0':[100,3],'4,1':[120,3]};
const chipOf=i=> (i>=27||i%9===0||i%9===8)?10:i%9+1;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// wall of 136 as {i, red}
function makeWall(){ const w=[]; for(let s=0;s<3;s++) for(let r=0;r<9;r++) for(let c=0;c<4;c++) w.push({i:s*9+r, red: r===4&&(c===0||(s===1&&c===1))}); for(let z=27;z<34;z++) for(let c=0;c<4;c++) w.push({i:z,red:false}); return w; }
// best structure in hand: maximize melds*10+pair; returns {m,p,used:[{idx,type}],honorPons}
function bestStructure(hand){
  const counts=new Array(34).fill(0); for(const t of hand) counts[t.i]++;
  let best={m:0,p:0,key:-1,sets:[]};
  function rec(i,m,p,sets){
    while(i<34&&counts[i]===0)i++;
    if(i>=34){ if(p===2&&m>0) return; const k=m*10+p; if(k>best.key){best={m,p,key:k,sets:sets.slice()};} return; }
    if(m<4&&counts[i]>=3){counts[i]-=3;sets.push({type:'pon',i});rec(i,m+1,p,sets);sets.pop();counts[i]+=3;}
    if(m<4&&i<27&&i%9<=6&&counts[i+1]&&counts[i+2]){counts[i]--;counts[i+1]--;counts[i+2]--;sets.push({type:'chi',i});rec(i,m+1,p,sets);sets.pop();counts[i]++;counts[i+1]++;counts[i+2]++;}
    if(p<2&&counts[i]>=2){counts[i]-=2;sets.push({type:'pair',i});rec(i,m,p+1,sets);sets.pop();counts[i]+=2;}
    counts[i]--;rec(i,m,p,sets);counts[i]++;
  }
  rec(0,0,0,[]); return best;
}
function takeTiles(hand,sets){ // remove the tiles of sets from hand, prefer red fives inside (they'd be played)
  const used=[]; for(const s of sets){ const need=s.type==='chi'?[s.i,s.i+1,s.i+2]:s.type==='pon'?[s.i,s.i,s.i]:[s.i,s.i]; for(const n of need){ let k=hand.findIndex(t=>t.i===n&&t.red); if(k<0) k=hand.findIndex(t=>t.i===n); used.push(hand[k]); hand.splice(k,1);} } return used; }
function scorePlay(sets,used,complete){
  const m=sets.filter(s=>s.type!=='pair').length, p=sets.filter(s=>s.type==='pair').length;
  let chips,han;
  if(m===1&&!p){ chips=sets[0].type==='chi'?10:20; han=1; } else { [chips,han]=RUNG[m+','+p]; }
  if(complete){ chips=120; han=COMPLETE_HAN; const tiles=used.map(t=>({id:0,suit:SUITS[Math.floor(t.i/9)],rank:t.i%9+1,red:t.red,eng:null})); const b=bestHand(tiles,[],FAKE); const y=b?b.yaku.han:0; han+=Math.max(1,y); }
  for(const s of sets) if(s.type==='pon'&&s.i>=27) han++;
  for(const t of used){ chips+=chipOf(t.i); if(t.red) han++; }
  return Math.floor(chips*hanMult(han+HANB));
}
function safeDiscards(hand,max){ // tiles removable without raising shanten
  const tiles=()=>hand.map(t=>({suit:SUITS[Math.floor(t.i/9)],rank:t.i%9+1}));
  const sh0=handShanten(tiles(),0); const out=[];
  for(let k=0;k<max;k++){ let f=-1; for(let j=0;j<hand.length;j++){ const rest=hand.filter((_,q)=>q!==j).map(t=>({suit:SUITS[Math.floor(t.i/9)],rank:t.i%9+1})); if(handShanten(rest,0)===sh0){f=j;break;} } if(f<0)break; out.push(hand[f]); hand.splice(f,1); }
  return out;
}
function playBlind(opts){
  const {plays=4,discards=5,perDiscard=7,target=Infinity}=opts;
  const wall=shuffle(makeWall()); let hand=wall.splice(0,17); let P=plays,D=discards,score=0; const rungs=[];
  const draw=()=>{ while(hand.length<17&&wall.length) hand.push(wall.pop()); };
  while(P>0&&score<target){
    const st=bestStructure(hand);
    if(st.m===4&&st.p===1){ const used=takeTiles(hand,st.sets); score+=scorePlay(st.sets,used,true); rungs.push('complete'); P--; draw(); continue; }
    if(D>0){ const dead=safeDiscards(hand,perDiscard); if(dead.length){ D--; draw(); continue; } }
    if(st.key<=0){ // nothing: play highest single
      let k=0; for(let j=1;j<hand.length;j++) if(chipOf(hand[j].i)>chipOf(hand[k].i)) k=j; const t=hand.splice(k,1)[0]; score+=chipOf(t.i)*hanMult(t.red?1:0); rungs.push('single');
    } else { const used=takeTiles(hand,st.sets); score+=scorePlay(st.sets,used,false); rungs.push(st.m+'m'+(st.p===2?'+pp':st.p?'+p':'')); }
    P--; draw();
  }
  return {score,rungs};
}


RUNG={'0,0':[0,0],'0,1':[5,0],'0,2':[15,1],'1,1':[20,1],'2,0':[30,1],'2,1':[40,1],'3,0':[60,2],'3,1':[80,2],'4,0':[100,2],'4,1':[120,2]}; COMPLETE_HAN=2;
const N=2000;
for(const hb of [0,1,2]){
  HANB=hb; const sc=[]; const rungs={}; for(let t=0;t<N;t++){ const r=playBlind({}); sc.push(r.score); for(const g of r.rungs) rungs[g]=(rungs[g]||0)+1; } sc.sort((a,b)=>a-b); const pct=q=>sc[Math.floor(q*(N-1))];
  const clear=T=>(100*sc.filter(s=>s>=T).length/N).toFixed(0)+'%';
  console.log(`Ladder B + Two Pair, +${hb} Han proxy: median ${pct(.5)}, p25 ${pct(.25)}, p90 ${pct(.9)}`);
  console.log(`   clear: A1 small ${clear(300)} big ${clear(450)} boss ${clear(600)} | A2 small ${clear(800)} boss ${clear(1600)} | A3 small ${clear(2000)} boss ${clear(4000)} | A4 small ${clear(4500)} boss ${clear(9000)} | A5 boss ${clear(18000)}`);
  if(hb===0){ const tot=Object.values(rungs).reduce((a,b)=>a+b,0); console.log('   plays by rung: '+Object.entries(rungs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k.replace('0m+p','pair').replace('0m+pp','two pair')+' '+(100*v/tot).toFixed(0)+'%').join(', ')); }
}
