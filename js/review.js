"use strict";
/* Game review for DuSoKu, like a chess game review. Game review on the end card first plays the whole game back in about
   four seconds (blue and black numbers going in as they did), then opens the review: step through the game, a score graph,
   a label on every move, accuracy, key moments, tips from Play the knight, and speed.
   It all comes from the move list the game keeps (s.log, written by sdkPlace: [square, number, player, right, points,
   server time, in the no-points pause]). A square "could be worked out" when it had only one possible number, or its
   number had only one place left in a row, column or box, at that moment. A move is Best when no square that could be
   worked out was worth more. */
const Review=(()=>{
  const LABEL={best:'Best',good:'Good',missed:'Missed bonus',wasted:'Wasted',mistake:'Mistake'};
  const ABOUT={best:'No square you could work out was worth more.',good:'Right, but a bigger square could be worked out.',
    missed:'A ×2 or ×3 square that could be worked out was worth more.',wasted:'Right, but placed in the no-points pause.',mistake:'A wrong number: −1 point.'};
  const UNITS=[];for(let k=0;k<9;k++){const r=[],c=[],b=[];for(let j=0;j<9;j++){r.push(k*9+j);c.push(j*9+k);b.push(((k/3|0)*3+(j/3|0))*9+(k%3)*3+j%3)}UNITS.push(r,c,b)}
  let A=null,at=0,cells=[],introT=null,playT=null;
  const rc=i=>`row ${(i/9|0)+1}, column ${i%9+1}`;
  const secs=ms=>ms<60000?(ms/1000).toFixed(ms<10000?1:0)+' s':sdkFmt(ms);
  const pct=(a,b)=>b>0?Math.round(Math.max(0,Math.min(1,a/b))*100):100;

  /* ---------- working the game out ---------- */
  /* squares a careful player could fill right now */
  function findable(g){
    const cs=g.map((v,i)=>v?null:[1,2,3,4,5,6,7,8,9].filter(d=>SDK.peers[i].every(j=>g[j]!==d))),out=new Set();
    cs.forEach((c,i)=>{if(c&&c.length===1)out.add(i)});
    for(const u of UNITS) for(let d=1;d<=9;d++){const w=u.filter(i=>cs[i]&&cs[i].includes(d));if(w.length===1)out.add(w[0])}
    return out;
  }
  function analyse(s){
    const log=s.log||[];if(!log.length) return null;
    const g=s.sol.map((d,i)=>s.given[i]?d:0),empty=g.filter(v=>!v).length,t0=s.start||s.t0||log[0][5],score=[0,0],pts=[[0,0]],miss=[0,0],moves=[];
    let lastAny=t0,filled=0;const lastOwn=[t0,t0];
    log.forEach(([i,d,p,ok,got,t,cold],k)=>{
      const worth=s.scoring==='diff'?sdkWorth(g):null,val=c=>(worth?worth[s.sol[c]]:s.sol[c])*s.boost[c],can=findable(g);
      let best=0,bonus=0;can.forEach(c=>{const v=val(c);if(v>best)best=v;if(s.boost[c]>1&&v>bonus)bonus=v});
      const mine=ok?val(i):0;if(mine>best)best=mine;
      const kind=!ok?'mistake':cold?'wasted':mine>=best?'best':bonus>mine?'missed':'good';
      if(!ok) miss[p]++;
      moves.push({k,i,d,p,ok:!!ok,pts:got,t:t-t0,kind,best,mine,think:Math.max(0,t-(s.mode==='turns'?lastAny:lastOwn[p])),
        stage:filled<empty/3?0:filled<empty*2/3?1:2,hard:!!ok&&!can.has(i),sol:s.sol[i],boost:s.boost[i],
        pause:!ok&&s.mode!=='turns'?sdkColdFor(miss[p]):0});
      if(ok){g[i]=d;filled++}
      score[p]+=got;pts.push([score[0],score[1]]);lastAny=t;lastOwn[p]=t;
    });
    const a={s,moves,pts,t0,over:sdkResultOf(s)};
    a.st=[0,1].map(p=>stats(a,p));a.keys=moments(a);a.tips=tips(a);
    return a;
  }
  const sdkResultOf=s=>{try{return S.game.result(s)}catch(e){return null}};

  function stats(a,p){
    const m=a.moves.filter(x=>x.p===p),right=m.filter(x=>x.ok),n={};
    Object.keys(LABEL).forEach(k=>{n[k]=m.filter(x=>x.kind===k).length});
    const poss=m.reduce((t,x)=>t+x.best,0),earned=m.reduce((t,x)=>t+(x.ok&&x.kind!=='wasted'?x.mine:0),0);
    const th=m.map(x=>x.think),avg=th.length?th.reduce((t,v)=>t+v,0)/th.length:0;
    let fast=null;for(let j=0;j+4<right.length;j++){const span=right[j+4].t-right[j].t+right[j].think;if(fast==null||span<fast)fast=span}
    const stage=[0,1,2].map(g=>{const x=m.filter(y=>y.stage===g);return x.length?x.reduce((t,y)=>t+y.think,0)/x.length:null});
    return {n:m.length,right:right.length,acc:pct(right.length,m.length),pacc:pct(earned,poss),count:n,avg,fast,stuck:th.length?Math.max(...th):0,stage,
      hard:m.filter(x=>x.hard).length,lateMiss:m.filter(x=>!x.ok&&x.stage===2).length,
      early:(()=>{const e=m.filter(x=>x.stage===0&&x.ok);return e.length>=3?e.reduce((t,x)=>t+x.mine,0)/Math.max(1,e.reduce((t,x)=>t+x.best,0)):1})()};
  }

  /* the moments worth jumping to, in game order */
  function moments(a){
    const M=a.moves,P=a.pts,out=[],seen=new Set(),add=(x,icon,text)=>{if(!x||seen.has(x.k))return;seen.add(x.k);out.push({k:x.k,icon,text})};
    const w=a.over&&a.over.winner!=='draw'?a.over.winner:null;
    if(w!=null){let j0=null,prev=0;M.forEach((x,j)=>{const [u,v]=P[j+1],l=u>v?1:v>u?-1:0;if(l&&l!==prev){if(l===(w===0?1:-1))j0=j;prev=l}});
      if(j0!=null) add(M[j0],'lead',`${name(w)} took the lead for good`)}
    const big=M.filter(x=>x.ok&&x.kind!=='wasted').sort((x,y)=>y.pts-x.pts)[0];
    if(big&&big.pts>0) add(big,'star',`The biggest move: ${name(big.p)}’s ${big.d}${big.boost>1?' on a ×'+big.boost+' square':''} for +${big.pts}`);
    const bon=M.filter(x=>x.ok&&x.boost===3&&x.pts>0).sort((x,y)=>y.pts-x.pts)[0];
    if(bon) add(bon,'bonus',`${name(bon.p)} claimed a ×3 square for +${bon.pts}`);
    /* longest run of right, scoring numbers by one player */
    let run=null;[0,1].forEach(p=>{let c=0,st=null;M.forEach(x=>{if(x.p!==p)return;if(x.ok&&x.pts>0){if(!c)st=x;c++;if(!run||c>run.c)run={c,x:st,p}}else c=0})});
    if(run&&run.c>=4) add(run.x,'run',`${name(run.p)} started a run of ${run.c} right in a row`);
    /* the biggest swing over ten moves */
    let sw=null;for(let j=0;j+10<P.length;j++){const d=(P[j+10][0]-P[j+10][1])-(P[j][0]-P[j][1]);if(!sw||Math.abs(d)>Math.abs(sw.d))sw={d,j}}
    if(sw&&Math.abs(sw.d)>=8) add(M[sw.j],'swing',`A ${Math.abs(sw.d)}-point swing to ${name(sw.d>0?0:1)} over the next ten moves`);
    M.filter(x=>!x.ok).sort((x,y)=>y.pause-x.pause||y.k-x.k).slice(0,2).forEach(x=>add(x,'bad',
      `${name(x.p)} played a wrong ${x.d} (it was ${x.sol})${x.pause?`: −1 and ${x.pause/1000} s without points`:': −1'}`));
    return out.sort((x,y)=>x.k-y.k).slice(0,6);
  }

  /* Play the knight's advice: the three that matter most */
  function tips(a){
    const out=[],st=a.st,add=(w,t)=>out.push({w,t});
    [0,1].forEach(p=>{const x=st[p],n=name(p);if(!x.n)return;
      if(x.count.missed>=2) add(x.count.missed*3,`${n} passed up ${x.count.missed} bonus squares that could already be worked out. Look at the ×3 and ×2 squares first.`);
      if(x.count.wasted>=2) add(x.count.wasted*2.5,`${n} placed ${x.count.wasted} numbers during a no-points pause. Use the pause to find squares, and fill them when it ends.`);
      if(x.lateMiss>=2&&x.lateMiss*2>=x.count.mistake) add(x.lateMiss*2.5,`${x.lateMiss} of ${n}’s ${x.count.mistake} mistakes came near the end. Slow down a little when the board is nearly full.`);
      else if(x.count.mistake>=3) add(x.count.mistake*2,`${n} made ${x.count.mistake} mistakes. A wrong number costs more than it looks, because of the pause after it.`);
      if(a.s.scoring==='diff'&&x.early<.6) add(6,`Early on, ${n} mostly took low-value numbers while others were worth more. The strip above the board shows what each number is worth.`);
      if(x.hard>=3) add(x.hard,`${n} found ${x.hard} squares that took real reasoning, not just the obvious ones. Nice.`);
      if(x.n>=10&&x.acc===100) add(5,`${n} didn’t place a single wrong number. Clean play!`);
    });
    if(st[0].n>=5&&st[1].n>=5&&st[0].avg&&st[1].avg){const f=st[0].avg<st[1].avg?0:1,r=st[1-f].avg/st[f].avg;
      if(r>=1.3) add(4+r,`${name(f)} placed numbers ${Math.round((r-1)*100)}% faster on average than ${name(1-f)}.`)}
    if(!out.length) add(1,'An even, tidy game. Try Hard next time for a tougher puzzle.');
    return out.sort((x,y)=>y.w-x.w).slice(0,3).map(x=>x.t);
  }

  /* ---------- the board ---------- */
  function boardEl(){
    const s=A.s,grid=el('div',{class:'rv-grid','aria-hidden':'true'});cells=[];
    for(let i=0;i<81;i++){const c=el('div',{class:'rv-c'+(s.given[i]?' g':'')+(s.boost[i]>1&&!s.given[i]?' b'+s.boost[i]:'')+((i%9)%3===2&&i%9<8?' rb':'')+(((i/9|0)%3===2)&&i<72?' bb':'')},s.given[i]?String(s.sol[i]):'');cells.push(c);grid.append(c)}
    return grid;
  }
  /* the board after the first k moves; the k-th move is marked */
  function paint(k){
    const s=A.s,M=A.moves,own=Array(81).fill(-1);
    for(let j=0;j<k;j++){const x=M[j];if(x.ok)own[x.i]=x.p}
    cells.forEach((c,i)=>{if(s.given[i])return;
      const o=own[i];c.className='rv-c'+(s.boost[i]>1?' b'+s.boost[i]:'')+(o>=0?' o'+o:'')+((i%9)%3===2&&i%9<8?' rb':'')+(((i/9|0)%3===2)&&i<72?' bb':'');
      c.textContent=o>=0?String(s.sol[i]):s.boost[i]>1?'×'+s.boost[i]:''});
    const x=M[k-1];if(!x) return;
    const c=cells[x.i];c.classList.add('now');
    if(!x.ok){c.classList.add('bad');c.replaceChildren(el('span',{class:'rv-wrong'},String(x.d)),el('small',{},'it was '+x.sol))}
  }

  /* ---------- the score graph ---------- */
  const GW=600,GH=150;
  function graph(){
    const P=A.pts,N=P.length-1,all=P.flat(),lo=Math.min(0,...all),hi=Math.max(1,...all),X=j=>j/Math.max(1,N)*GW,Y=v=>GH-6-(v-lo)/(hi-lo)*(GH-12);
    const line=p=>P.map((v,j)=>`${j?'L':'M'}${X(j).toFixed(1)},${Y(v[p]).toFixed(1)}`).join(''),svg=sv('svg',{class:'rv-graph',viewBox:`0 0 ${GW} ${GH}`,preserveAspectRatio:'none',role:'img','aria-label':'Score over the game'});
    if(lo<0) svg.append(sv('line',{x1:0,x2:GW,y1:Y(0),y2:Y(0),class:'zero'}));
    svg.append(sv('path',{d:line(1),class:'l1'}),sv('path',{d:line(0),class:'l0'}));
    A.moves.forEach((x,j)=>{if(!x.ok)svg.append(sv('circle',{cx:X(j+1),cy:Y(P[j+1][x.p]),r:3.5,class:'m-bad'}));else if(x.boost===3&&x.pts>0)svg.append(sv('circle',{cx:X(j+1),cy:Y(P[j+1][x.p]),r:3.5,class:'m-bon'}))});
    A.keys.filter(m=>m.icon==='lead').forEach(m=>svg.append(sv('circle',{cx:X(m.k+1),cy:Y(P[m.k+1][A.moves[m.k].p]),r:5,class:'m-lead'})));
    const cur=sv('line',{class:'cur',y1:0,y2:GH});svg.append(cur);
    svg.addEventListener('click',e=>{const r=svg.getBoundingClientRect();go(Math.round((e.clientX-r.left)/r.width*N))});
    return {svg,cur,X};
  }

  /* ---------- the review screen ---------- */
  let ui=null;
  function go(k,keep){
    if(!keep) stopPlay();
    at=Math.max(0,Math.min(A.moves.length,k));paint(at);
    const x=A.moves[at-1];
    ui.slider.value=String(at);
    ui.cap.replaceChildren(...(x?[el('span',{class:'rv-dot p'+x.p}),el('b',{},`Move ${at} · ${name(x.p)}`),` ${x.ok?'placed':'tried'} ${x.d} at ${rc(x.i)} · ${secs(x.t)} in `,
      el('span',{class:'rv-tag '+x.kind,title:ABOUT[x.kind]},LABEL[x.kind]+(x.ok&&x.kind!=='wasted'?' +'+x.pts:x.ok?' +0':' −1'))]
      :[el('b',{},'The start'),' Use the arrows, the slider or the graph to step through the game.']));
    const gx=ui.g.X(at).toFixed(1);ui.g.cur.setAttribute('x1',gx);ui.g.cur.setAttribute('x2',gx);
    ui.list.querySelectorAll('li').forEach((li,j)=>li.classList.toggle('on',j===at-1));
    const li=ui.list.children[at-1];if(li&&ui.list.offsetParent){const r=li.offsetTop-ui.list.offsetTop;if(r<ui.list.scrollTop||r>ui.list.scrollTop+ui.list.clientHeight-30)ui.list.scrollTop=r-ui.list.clientHeight/2}
    ui.score.textContent=`${A.pts[at][0]} – ${A.pts[at][1]}`;
  }
  function stopPlay(){clearInterval(playT);playT=null;if(ui)ui.play.textContent='▶ Play'}
  function autoplay(){
    if(playT){stopPlay();return}
    if(at>=A.moves.length) go(0);
    ui.play.textContent='❚❚ Pause';
    playT=setInterval(()=>{if(at>=A.moves.length)stopPlay();else go(at+1,true)},450);
  }

  function card(p){
    const x=A.st[p];
    return el('div',{class:'rv-card p'+p},el('div',{class:'rv-who'},el('span',{class:'rv-dot p'+p}),el('b',{},name(p)),el('span',{class:'rv-fin'},String(A.s.score[p]))),
      el('div',{class:'rv-acc'},el('div',{},el('b',{},x.acc+'%'),el('small',{},'Right')),el('div',{},el('b',{},x.pacc+'%'),el('small',{},'Points accuracy'))),
      el('div',{class:'rv-tags'},...Object.keys(LABEL).map(k=>el('span',{class:'rv-tag '+k,title:ABOUT[k]},`${x.count[k]} ${LABEL[k]}`))));
  }
  function speed(){
    const row=(label,f)=>el('tr',{},el('th',{},label),...[0,1].map(p=>el('td',{},f(A.st[p]))));
    const st=['Opening','Middle','Endgame'];
    return el('table',{class:'rv-speed'},el('thead',{},el('tr',{},el('th',{}),...[0,1].map(p=>el('th',{},el('span',{class:'rv-dot p'+p}),name(p))))),
      el('tbody',{},row('Average per number',x=>x.n?secs(x.avg):'–'),row('Fastest 5 right',x=>x.fast!=null?secs(x.fast):'–'),row('Longest stuck',x=>x.n?secs(x.stuck):'–'),
        ...st.map((l,g)=>row(l,x=>x.stage[g]!=null?secs(x.stage[g]):'–'))));
  }
  function screen(){
    const s=A.s,M=A.moves,box=$('reviewBody');
    const btn=(t,f,label)=>{const b=el('button',{class:'btn',type:'button','aria-label':label||t},t);b.addEventListener('click',f);return b};
    const slider=el('input',{type:'range',min:'0',max:String(M.length),value:String(M.length),class:'rv-slider','aria-label':'Move'});
    slider.addEventListener('input',()=>go(+slider.value));
    const play=btn('▶ Play',autoplay,'Play the game through');
    const list=el('ol',{class:'rv-moves'},...M.map(x=>{const li=el('li',{},el('span',{class:'n'},String(x.k+1)),el('span',{class:'rv-dot p'+x.p}),
      el('span',{class:'w'},`${x.d} · ${rc(x.i).replace('row ','r').replace(', column ','c')}`),el('span',{class:'rv-tag '+x.kind},LABEL[x.kind]+(x.ok&&x.kind!=='wasted'?' +'+x.pts:x.ok?'':' −1')));li.addEventListener('click',()=>go(x.k+1));return li}));
    const g=graph();
    ui={slider,play,list,g,cap:el('p',{class:'rv-cap',role:'status'}),score:el('b',{class:'rv-score'})};
    const keys=el('ul',{class:'rv-keys'},...A.keys.map(m=>{const li=el('li',{class:'k-'+m.icon},el('button',{type:'button'},el('span',{class:'n'},'Move '+(m.k+1)),m.text));li.firstChild.addEventListener('click',()=>go(m.k+1));return li}));
    const w=A.over&&A.over.winner;
    box.replaceChildren(
      el('div',{class:'rv-head'},el('h2',{},'Game review'),el('p',{},`${name(0)} vs ${name(1)} · ${w==='draw'?'a draw':w!=null?name(w)+' won':''} ${s.score[0]}–${s.score[1]} · ${M.length} moves`)),
      el('div',{class:'rv-main'},
        el('div',{class:'rv-left'},el('div',{class:'rv-board'},boardEl()),ui.cap,
          el('div',{class:'rv-ctl'},btn('⏮',()=>go(0),'First move'),btn('◀',()=>go(at-1),'Back one move'),play,btn('▶',()=>go(at+1),'Forward one move'),btn('⏭',()=>go(M.length),'Last move'),ui.score),slider),
        el('div',{class:'rv-right'},
          el('div',{class:'rv-cards'},card(0),card(1)),
          el('section',{},el('h3',{},'Score'),g.svg,el('p',{class:'fine rv-legend'},el('i',{class:'k bad'}),'mistake ',el('i',{class:'k bon'}),'×3 square ',el('i',{class:'k lead'}),'took the lead for good')),
          el('section',{class:'rv-coach'},Mascot.pose(false),el('div',{},el('h3',{},'Play’s tips'),el('ul',{},...A.tips.map(t=>el('li',{},pn(t)))))),
          A.keys.length?el('section',{},el('h3',{},'Key moments'),keys):null,
          el('section',{},el('h3',{},'Speed'),speed()),
          el('section',{},el('h3',{},'Every move'),list))));
    const x=el('button',{class:'dlg-x',type:'button','aria-label':'Close the review'},'×');x.addEventListener('click',close);box.prepend(x);
    go(M.length);
  }

  /* ---------- the fast replay, then the review ---------- */
  function intro(){
    const box=$('reviewBody'),M=A.moves,skip=el('button',{class:'btn',type:'button'},'Skip to the review');
    const cap=el('p',{class:'rv-cap rv-introcap'},'Replaying the game…');
    box.replaceChildren(el('div',{class:'rv-intro'},el('h2',{},'Game review'),el('div',{class:'rv-board'},boardEl()),cap,skip));
    paint(0);
    let k=0;const step=Math.max(12,Math.min(120,4000/Math.max(1,M.length)));
    const done=()=>{clearInterval(introT);introT=null;screen()};
    skip.addEventListener('click',done);
    introT=setInterval(()=>{
      k++;paint(k);const x=M[k-1];
      if(x) cap.textContent=`${name(0)} ${A.pts[k][0]} – ${A.pts[k][1]} ${name(1)}`;
      if(k>=M.length){clearInterval(introT);introT=setTimeout(done,700)}
    },step);
  }
  function open(s){
    A=analyse(s);if(!A) return;
    const dl=$('reviewDlg');
    if(!dl.open){try{dl.showModal()}catch(e){dl.setAttribute('open','')}}
    if(reduceMotion()) screen(); else intro();
  }
  function close(){clearInterval(introT);clearTimeout(introT);stopPlay();const dl=$('reviewDlg');if(dl.open){try{dl.close()}catch(e){dl.removeAttribute('open')}}}
  const can=s=>!!(s&&S.gid==='duosudoku'&&s.log&&s.log.length);
  function init(){
    const dl=$('reviewDlg');
    dl.addEventListener('close',()=>{clearInterval(introT);clearTimeout(introT);stopPlay()});
    dl.addEventListener('keydown',e=>{if(!ui||introT||!A)return;if(e.key==='ArrowLeft'){e.preventDefault();go(at-1)}else if(e.key==='ArrowRight'){e.preventDefault();go(at+1)}});
  }
  return {init,open,close,can,analyse};
})();
