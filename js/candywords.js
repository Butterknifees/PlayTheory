"use strict";
/* Candy Words (owner, 2026-11-25): a daily word puzzle for one player, played like a match-three game. An 8×8 board of
   letter tiles; swap two tiles side by side to spell a word of 4 letters or more, across (left to right) or down (top to
   bottom). The word's tiles clear and score their letter points, the tiles above fall, new letters drop in at the top, and
   any word that forms as they land scores again (a chain). Everyone gets the same board and the same falling letters each
   day (new at midnight IST, like the DuSoKu daily) and has 7:30 to score.
   Words: the ENABLE list (public domain), 4 to 8 letters, offensive words and q-without-u words taken out, in
   data/words.txt (fetched only when the game opens; bump CW_WORDS's ?v= when it changes).
   State: day, b[64] letters ('q' is the Qu tile), dr[8] letters dropped into each column so far (the k-th letter into a
   column is fixed by the day, so the same swaps give everyone the same board), set, t0, score, n (swaps), words
   [[word, points, wave]], end, first (the day's first finished game on this device) and today (the day's score) */
const CW_N=8,CW_TIME=450000,CW_MIN=4,CW_WORDS='data/words.txt?v=1';
/* the bag: how often each letter drops in, like a word game's tile bag */
const CW_BAG=[...'e12a9i9o8n6r6t6l4s4u4d4g3b2c2m2p2f2h2v2w2y2k1j1x1q1z1'.matchAll(/([a-z])(\d+)/g)].map(m=>[m[1],+m[2]]),CW_TOT=sum(CW_BAG.map(x=>x[1]));
/* letter points: common letters 1, rare ones up to 10. Tile colours: vowels pink, the rest by points */
const CW_PTS={};[['eaionrtlsu',1],['dg',2],['bcmp',3],['fhvwy',4],['k',5],['jx',8],['qz',10]].forEach(([l,p])=>[...l].forEach(c=>CW_PTS[c]=p));
const cwTone=c=>'aeiou'.includes(c)?'v':'p'+CW_PTS[c];
const cwCap=c=>c==='q'?'Qu':c.toUpperCase();
const CW_CANDY=['#e0528f','#2f80c9','#22965f','#f3be2c','#d9661a','#7b4fd0','#ffffff'];

/* the same letters from the same day on every device: a hash of the day (and where/when) seeds each draw */
const cwHash=(...a)=>{let h=2166136261;for(const c of a.join('|'))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const cwPick=u=>{let t=u*CW_TOT;for(const [c,w] of CW_BAG)if((t-=w)<0)return c;return 'e'};
const cwDrop=(day,c,k)=>cwPick(seeded(cwHash(day,'drop',c,k))());

/* the word list, loaded once */
let cwDict=null,cwDictP=null,cwErr='';
const cwLoad=()=>cwDictP||(cwDictP=fetch(CW_WORDS).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text()})
  .then(t=>{cwDict=new Set(t.split('\n'));cwErr=''}).catch(e=>{cwDictP=null;cwErr='Could not load the word list. Check your connection and try again.';throw e}));

/* rows and columns as lists of cells; the words in one line, longest first, no two sharing a tile */
const CW_LINES=[...Array(CW_N)].flatMap((_,a)=>[[...Array(CW_N)].map((_,k)=>a*CW_N+k),[...Array(CW_N)].map((_,k)=>k*CW_N+a)]);
const cwLinesAt=(...ix)=>CW_LINES.filter(l=>ix.some(i=>l.includes(i)));
function cwLine(b,cells){
  const found=[];
  for(let i=0;i<cells.length;i++){let w='';for(let j=i;j<cells.length&&w.length<9;j++){w+=b[cells[j]]==='q'?'qu':b[cells[j]];if(w.length>=CW_MIN&&cwDict.has(w))found.push({w,cells:cells.slice(i,j+1)})}}
  found.sort((x,y)=>y.w.length-x.w.length||x.cells[0]-y.cells[0]);
  const used=new Set();
  return found.filter(x=>!x.cells.some(k=>used.has(k))&&x.cells.every(k=>used.add(k)));
}
const cwFind=(b,lines=CW_LINES)=>cwDict?lines.flatMap(l=>cwLine(b,l)):[];
const cwSwap=(b,i,j)=>{const n=[...b];[n[i],n[j]]=[n[j],n[i]];return n};
const cwNext=(i,j)=>Math.abs(i-j)===CW_N||(Math.abs(i-j)===1&&(i/CW_N|0)===(j/CW_N|0));
const cwHits=(b,i,j)=>b[i]!==b[j]&&cwFind(cwSwap(b,i,j),cwLinesAt(i,j)).length>0;
/* a swap that spells something, or null */
const cwAny=b=>{for(let i=0;i<b.length;i++){if(i%CW_N<CW_N-1&&cwHits(b,i,i+1))return[i,i+1];if(i+CW_N<b.length&&cwHits(b,i,i+CW_N))return[i,i+CW_N]}return null};
/* a word scores its letter points, times (letters − 3), times the wave it came in (a chain scores double, triple…) */
const cwWorth=(b,x,k)=>sum(x.cells.map(i=>CW_PTS[b[i]]))*(x.w.length-3)*k;

/* cleared tiles go, the ones above fall into the gaps and the day's next letters drop in at the top. fy[k]: how many rows
   the tile now at k fell (for the animation) */
function cwFall(day,dr,b,gone){
  const n=[...b],fy=Array(b.length).fill(0);dr=[...dr];
  for(let c=0;c<CW_N;c++){
    let to=CW_N-1;
    for(let r=CW_N-1;r>=0;r--){const k=r*CW_N+c;if(gone.has(k))continue;n[to*CW_N+c]=b[k];fy[to*CW_N+c]=to-r;to--}
    for(let r=to;r>=0;r--){n[r*CW_N+c]=cwDrop(day,c,dr[c]++);fy[r*CW_N+c]=to+1}
  }
  return{b:n,fy,dr};
}
/* everything a swap sets off: each wave of words, with the board before and after it falls */
function cwResolve(s,b){
  const waves=[];let dr=s.dr;
  for(let k=1;k<=30;k++){
    const ws=cwFind(b);if(!ws.length)break;
    ws.forEach(x=>x.pts=cwWorth(b,x,k));
    const gone=new Set(ws.flatMap(x=>x.cells)),f=cwFall(s.day,dr,b,gone);
    waves.push({b,ws,gone:[...gone],next:f.b,fy:f.fy});b=f.b;dr=f.dr;
  }
  return{waves,b,dr};
}
/* no swap left that spells anything: shuffle (the same way for everyone), or deal fresh letters if shuffling can't help */
function cwMix(day,n,b){
  for(let t=0;t<80;t++){const r=seeded(cwHash(day,'mix',n,t)),m=t<50?shuffle([...b],r):b.map(()=>cwPick(r()));if(!cwFind(m).length&&cwAny(m))return m}
  return b;
}
/* the day's board: no word on it to start with, and at least one swap that spells one. Without the word list (previews)
   it's just the letters */
function cwDeal(day){
  const r=seeded(cwHash(day,'board')),b=Array.from({length:CW_N*CW_N},()=>cwPick(r()));
  if(!cwDict) return b;
  for(let t=0;t<400;t++){const ws=cwFind(b);if(!ws.length)break;ws.forEach(x=>{b[x.cells[r()*x.cells.length|0]]=cwPick(r())})}
  return cwAny(b)?b:cwMix(day,0,b);
}
function cwMove(s,i,j){
  const r=cwResolve(s,cwSwap(s.b,i,j)),n=clone(s);
  n.n=s.n+1;n.dr=r.dr;n.b=cwAny(r.b)?r.b:cwMix(s.day,n.n,r.b);r.mixed=n.b!==r.b;
  r.waves.forEach((w,k)=>w.ws.forEach(x=>{n.score+=x.pts;n.words.push([x.w,x.pts,k+1])}));
  return{n,r};
}
const cwLeft=s=>s.set?Math.max(0,CW_TIME-(Date.now()-s.t0)):CW_TIME;
const cwBest=s=>s.words.reduce((a,w)=>!a||w[1]>a[1]?w:a,null);
const cwChain=s=>Math.max(1,...s.words.map(w=>w[2]));

/* the day's first finished game on this device is the day's score; later ones are practice */
const CW_KEY='pt-candywords';
const cwRec=day=>{try{const r=JSON.parse(localStorage.getItem(CW_KEY)||'null');return r&&r.day===day?r:null}catch(e){return null}};
function cwFinish(s){
  const n=clone(s),r=cwRec(s.day);n.end=1;n.first=r?0:1;n.today=r?r.score:s.score;
  try{localStorage.setItem(CW_KEY,JSON.stringify({day:s.day,score:n.today,best:Math.max(s.score,r&&r.best||0)}))}catch(e){}
  return n;
}

/* ---------- the board ---------- */
function cwGrid(b,o={}){
  const tag=o.live?'button':'div';
  return el('div',{class:'cw-grid',role:'group','aria-label':'Letter tiles'},...b.map((c,i)=>el(tag,{class:'cw-t '+cwTone(c)+(o.sel===i?' sel':'')+(o.fy&&o.fy[i]?' drop':''),
    type:o.live?'button':null,'data-i':i,style:o.fy&&o.fy[i]?`--fy:${o.fy[i]}`:null,'aria-pressed':o.live?String(o.sel===i):null,
    'aria-label':o.live?`${cwCap(c)}, ${CW_PTS[c]} ${CW_PTS[c]===1?'point':'points'}, row ${(i/CW_N|0)+1}, column ${i%CW_N+1}`:null},
    el('b',{},cwCap(c)),el('small',{},String(CW_PTS[c])))));
}
const cwTop=s=>{const left=cwLeft(s);return el('div',{class:'cw-top'},
  el('div',{class:'cw-stat'},el('small',{},'Score'),el('b',{class:'cw-score'},String(s.score))),
  el('div',{class:'cw-clock'+(left<30000&&!s.end?' low':''),role:'timer','aria-label':'Time left'},sdkFmt(left)),
  el('div',{class:'cw-stat'},el('small',{},'Words'),el('b',{class:'cw-count'},String(s.words.length))))};
const cwLog=s=>el('div',{class:'cw-log','aria-live':'polite'},...s.words.slice(-6).reverse().map(([w,p,k])=>
  el('span',{class:'cw-w'},w.toUpperCase(),el('small',{},`+${p}`+(k>1?` ×${k}`:'')))));

/* before the clock starts: what to do, today's score if there is one, and Start (once the words have loaded) */
function cwPre(s,ctx){
  const ready=!!cwDict,rec=cwRec(sdkDay());
  if(!ready&&!cwErr) cwLoad().then(()=>{if(S.gid==='candywords'&&!S.busy)ctx.redraw()},()=>{if(S.gid==='candywords'&&!S.busy)ctx.redraw()});
  const go=el('button',{class:'btn primary big sdk-start',type:'button'},cwErr?'Try again':!ready?'Loading words…':rec?'Play again (practice)':'Start');
  go.disabled=!ready&&!cwErr;
  go.addEventListener('click',()=>{
    if(cwErr){cwErr='';ctx.redraw();return}
    const day=sdkDay();ctx.configure({...clone(s),day,b:cwDeal(day),dr:Array(CW_N).fill(0),set:1,t0:Date.now()});
  });
  ctx.say(ready?'Tap Start when you’re ready: the clock starts straight away.':'Loading the word list…');
  return el('div',{class:'cw'},el('div',{class:'sdk-setup big cw-pre'},
    el('div',{class:'cw-mini','aria-hidden':'true'},...'WORDS'.split('').map(c=>el('span',{class:'cw-t '+cwTone(c.toLowerCase())},el('b',{},c),el('small',{},String(CW_PTS[c.toLowerCase()]))))),
    el('h3',{},'Today’s Candy Words'),
    el('p',{class:'fine'},`${sdkDayName(sdkDay())} · the same board for everyone`),
    el('p',{},'Swap two tiles side by side to spell a word of 4 letters or more, across or down. Long words multiply, and words that form as the tiles fall score double, then triple.'),
    rec?el('p',{class:'cw-today'},'Your score today: ',el('b',{},String(rec.score)),'. Play again for practice: only your first game counts.'):null,
    el('p',{class:'fine'},`You have 7 minutes 30 seconds. A new board comes at midnight IST, in ${sdkUntil()}.`),
    cwErr?el('p',{class:'net-err',role:'alert'},cwErr):null,go));
}

/* swipe a tile towards a neighbour, or tap one tile and then the one next to it; arrow keys move between tiles, and on a
   selected tile they swap */
function cwWire(grid,s,ctx){
  let start=null,swiped=false;
  const at=e=>{const t=e.target.closest&&e.target.closest('.cw-t');return t&&grid.contains(t)?+t.dataset.i:null};
  const step=(i,dx,dy)=>{const r=(i/CW_N|0)+dy,c=i%CW_N+dx;return r<0||c<0||r>=CW_N||c>=CW_N?-1:r*CW_N+c};
  grid.addEventListener('pointerdown',e=>{const i=at(e);swiped=false;start=i==null?null:{i,x:e.clientX,y:e.clientY,w:grid.children[i].getBoundingClientRect().width}});
  grid.addEventListener('pointermove',e=>{
    if(!start) return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.max(Math.abs(dx),Math.abs(dy))<Math.max(10,start.w*.35)) return;
    const h=Math.abs(dx)>Math.abs(dy),j=step(start.i,h?Math.sign(dx):0,h?0:Math.sign(dy)),i=start.i;
    start=null;swiped=true;if(j>=0)cwTry(s,ctx,i,j);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(k=>grid.addEventListener(k,()=>{start=null}));
  grid.addEventListener('click',e=>{
    if(swiped){swiped=false;return}
    const i=at(e),a=ctx.ui.sel;if(i==null) return;
    if(a!=null&&cwNext(a,i)){cwTry(s,ctx,a,i);return}
    S.ui.sel=a===i?null:i;Sound.fx('pick');ctx.redraw();
    const t=document.querySelector(`#board .cw-t[data-i="${i}"]`);if(t)t.focus({preventScroll:true});
  });
  grid.addEventListener('keydown',e=>{
    const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key],i=at(e);if(!d||i==null) return;
    const j=step(i,...d);e.preventDefault();if(j<0) return;
    if(ctx.ui.sel===i) cwTry(s,ctx,i,j);else grid.children[j].focus();
  });
}
function cwTry(s,ctx,i,j){
  if(!ctx.live||S.state!==s||s.end||cwLeft(s)<=0) return;
  S.ui.sel=null;
  if(!cwHits(s.b,i,j)){Sound.fx('slide');ctx.busy(()=>cwNope(i,j));return}
  const {n,r}=cwMove(s,i,j);
  ctx.play(n,()=>cwShow(s,i,j,r),{silent:true});
}

/* ---------- animation: the swap, each wave lighting up and popping, the tiles falling ---------- */
const cwWait=ms=>sleep(reduceMotion()?Math.min(ms,40):ms);
function cwSlide(g,i,j){
  const dx=j%CW_N-i%CW_N,dy=(j/CW_N|0)-(i/CW_N|0);
  [[i,1],[j,-1]].forEach(([k,f])=>{const t=g.children[k];t.style.setProperty('--sx',dx*f);t.style.setProperty('--sy',dy*f);t.classList.add('slide')});
}
async function cwNope(i,j){
  const g=document.querySelector('#board .cw-grid');if(!g) return;
  cwSlide(g,i,j);await cwWait(180);
  [i,j].forEach(k=>g.children[k].classList.remove('slide'));await cwWait(170);
  [i,j].forEach(k=>FX.shake(g.children[k]));Sound.fx('undo');
  await cwWait(250);
}
/* a label that floats up from a word (on the page, so it outlives the board being redrawn) */
function cwFloat(g,x,k){
  const rs=x.cells.map(i=>g.children[i].getBoundingClientRect()),cx=(rs[0].left+rs[rs.length-1].right)/2,cy=(rs[0].top+rs[rs.length-1].bottom)/2;
  const f=el('div',{class:'cw-float',style:`left:${cx}px;top:${cy}px`},x.w.toUpperCase(),el('b',{},` +${x.pts}`));
  document.body.append(f);setTimeout(()=>f.remove(),1300);
  FX.burst(cx,cy,CW_CANDY,x.w.length>=6||k>1?34:16,{speed:x.w.length>=6?200:130});
}
function cwBanner(g,text){
  const r=g.getBoundingClientRect(),b=el('div',{class:'cw-banner',role:'status',style:`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px`},text);
  document.body.append(b);setTimeout(()=>b.remove(),1100);
}
async function cwShow(s,i,j,r){
  const box=document.querySelector('#board .cw-board');if(!box) return;
  const put=n=>{box.firstElementChild.replaceWith(n);return n};
  let g=box.firstElementChild,score=s.score,count=s.words.length;
  Sound.fx('slide');cwSlide(g,i,j);await cwWait(170);
  for(const [k,w] of r.waves.entries()){
    g=put(cwGrid(w.b));
    w.ws.forEach(x=>{x.cells.forEach(c=>g.children[c].classList.add('hit'));cwFloat(g,x,k+1)});
    if(k) cwBanner(g,`Chain ×${k+1}!`);
    Sound.fx(k||w.ws.some(x=>x.w.length>=6)?'claim':'pop');
    score+=sum(w.ws.map(x=>x.pts));count+=w.ws.length;
    document.querySelectorAll('#board .cw-score').forEach(e=>e.textContent=score);document.querySelectorAll('#board .cw-count').forEach(e=>e.textContent=count);
    await cwWait(k?520:440);
    w.gone.forEach(c=>g.children[c].classList.add('pop'));await cwWait(170);
    g=put(cwGrid(w.next,{fy:w.fy}));await cwWait(320);
  }
  if(r.mixed){cwBanner(g,'No words left: shuffling');Sound.fx('whoosh');g.classList.add('mix');await cwWait(520);S.entering=true}
}

def({id:'candywords',name:'Candy Words',kind:'Solo',sfx:'pop',motif:'tile',isNew:true,noUndo:true,solo:true,colors:CW_CANDY,
  blurb:'A daily word puzzle. Swap letter tiles to spell words of 4 letters or more: they clear, new letters fall, and chains score double.',
  rules:['An 8 × 8 board of letter tiles. Each tile shows its points: common letters are worth 1, rare ones up to 10. The colour shows the value at a glance, and vowels are pink.',
    'Swap two tiles that sit side by side (not corner to corner). If the swap spells a word of 4 letters or more, reading left to right or top to bottom, the word’s tiles clear. If it doesn’t, they swap back.',
    'A word scores its letter points, times 1 for 4 letters, 2 for 5 letters, 3 for 6, and so on.',
    'The tiles above fall into the gaps and new letters drop in. A word that forms by itself as they land is a chain: the second wave scores double, the third triple, and so on.',
    'Qu is a single tile. If no swap on the board can spell a word, the tiles shuffle themselves.',
    'Everyone gets the same board, and the same new letters, each day. You have 7 minutes 30 seconds. A new board comes at midnight IST.'],
  win:'Score as many points as you can before the clock runs out. Your first game each day is your score for the day.',
  how:'Swipe a tile towards its neighbour, or click two tiles side by side, to swap them. Spell a word of 4 letters or more across or down.',
  /* the real board is dealt at Start (cwPre); until then, and in previews and the demo, a board from a made-up day, so
     nobody sees today's before their clock runs */
  create:()=>{const day='x'+R(0,1e9);return{day,b:cwDeal(day),dr:Array(CW_N).fill(0),set:0,t0:0,score:0,n:0,words:[],end:0}},
  moves:()=>[],
  hasMove:()=>true,
  anyTurn:()=>true,
  ready:s=>!!s.set,
  status:s=>s.end?'Time’s up':s.set?`${s.score} ${s.score===1?'point':'points'}`:'Daily word puzzle',
  result:s=>s.end?{winner:0,title:'Time’s up!',how:`${s.score} ${s.score===1?'point':'points'} from ${s.words.length} ${s.words.length===1?'word':'words'}`,
    reason:`${name(0)} scored ${s.score} ${s.score===1?'point':'points'}.`+(s.first?' That’s your score for today.':s.today!=null?` A practice game: your score for today stays ${s.today}.`:''),again:'Play again (practice)'}:null,
  remark:s=>{
    const b=cwBest(s);if(!b) return'No words this time. Try a vowel between two consonants, and look down the columns as well as across.';
    const k=cwChain(s);
    return`Your best word was ${b[0].toUpperCase()} for ${b[1]} points.`+(k>1?` Your longest chain ran to ×${k}.`:' Words that form as the tiles fall score double, so try swaps near the bottom.');
  },
  stats:s=>[{label:'Points',tone:'gold',v:[s.score]},{label:'Words',tone:'good',v:[s.words.length]},{label:'Longest word',tone:'',v:[Math.max(0,...s.words.map(w=>w[0].length))]}],
  /* "Watch a round": the best swap each time, for six swaps */
  demoMove:s=>{
    if(!cwDict){cwLoad().catch(()=>{});return null}
    if(s.n>=6) return{...s,end:1};
    let best=null;
    for(let i=0;i<s.b.length;i++)for(const j of [i+1,i+CW_N])if(j<s.b.length&&cwNext(i,j)&&cwHits(s.b,i,j)){const m=cwMove(s,i,j).n;if(!best||m.score>best.score)best=m}
    return best||{...s,n:s.n+1,b:cwMix(s.day,s.n+1,s.b)};
  },
  demoSay:(p,n)=>{const w=n.words.slice(p.words.length),t=w.slice(0,3).map(x=>`${x[0].toUpperCase()} (+${x[1]})`);if(w.length>3)t.push(`${w.length-3} more`);
    return w.length?'Swap to spell '+orList(t).replace(/ or ([^,]*)$/,' and $1')+(w.length>1?', a chain':''):'No words left: the tiles shuffle'},
  render(s,ctx){
    const app=typeof ctx.configure==='function',live=app&&ctx.live&&!!s.set&&!s.end;
    if(app&&!s.set) return cwPre(s,ctx);
    const g=cwGrid(s.b,{live,sel:ctx.ui.sel});
    if(live) cwWire(g,s,ctx);
    if(app) ctx.say(s.end?'Time’s up. Look back over the board, or play again for practice.':ctx.ui.sel!=null?'Now click a tile next to it to swap them.':'Swipe a tile towards its neighbour, or click two tiles side by side, to swap them.');
    return el('div',{class:'cw'},app?cwTop(s):null,el('div',{class:'cw-board'},g),app?cwLog(s):null);
  }});

/* the home page card for today's puzzle; it redraws itself when the day or your score changes */
let cwCardKey='';
function cwCard(){
  const box=typeof document!=='undefined'&&document.getElementById('cwCard');if(!box) return;
  const d=sdkDay(),rec=cwRec(d),k=d+':'+(rec?rec.score:'');if(cwCardKey===k) return;cwCardKey=k;
  const play=el('button',{class:'btn primary',type:'button'},rec?'Play again (practice)':'Play today’s puzzle');
  play.addEventListener('click',()=>{Sound.unlock();startGame('candywords')});
  box.replaceChildren(el('div',{class:'daily-txt'},
    el('div',{class:'gmeta'},el('span',{class:'chip new'},'New daily puzzle'),el('span',{class:'chip'},sdkDayName(d))),
    el('h3',{},'Today’s Candy Words'),
    el('p',{},'A word puzzle for one. Swap letter tiles to spell words of 4 letters or more: they clear, new letters fall, and chains score double. One board for everyone today, 7½ minutes on the clock.'),
    rec?el('p',{class:'cw-today'},'Your score today: ',el('b',{},String(rec.score))):null),
    el('div',{class:'cw-mini','aria-hidden':'true'},...'CANDY'.split('').map(c=>el('span',{class:'cw-t '+cwTone(c.toLowerCase())},el('b',{},c),el('small',{},String(CW_PTS[c.toLowerCase()]))))),
    el('div',{class:'daily-go'},play));
}

/* the clock ticks here; when it runs out (and the last swap has finished falling) the game ends */
if(typeof document!=='undefined'){
  setInterval(cwCard,60000);
  setInterval(()=>{
    if(typeof S==='undefined'||S.gid!=='candywords'||!S.state||!S.state.set||S.state.end||S.over||document.body.dataset.view!=='play') return;
    const s=S.state,left=cwLeft(s);
    document.querySelectorAll('#board .cw-clock').forEach(e=>{e.textContent=sdkFmt(left);e.classList.toggle('low',left<30000)});
    if(left<=0&&!S.busy) ctx.play(cwFinish(s),null,{silent:true});
  },250);
}
