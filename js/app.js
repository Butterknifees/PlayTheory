"use strict";
/* The game table: deals games, runs turns, intro screens, sound controls and celebrations. */
const $=id=>document.getElementById(id);

function check(){
  const g=S.game,s=S.state;
  let r=g.result?g.result(s):null;
  if(!r&&!g.hasMove(s,s.turn)) r={winner:1-s.turn,reason:`${name(s.turn)} has no legal move.`};
  S.over=r;
}
function lock(on){S.busy=on;$('board').classList.toggle('busy',on)}

/* the ctx object every game render receives */
const ctx={
  get live(){return !S.over&&!S.busy},
  get ui(){return S.ui},
  async play(next,anim,opt={}){
    if(S.over||S.busy) return;
    const base=S.state,mover=base.turn;
    if(!opt.silent) Sound.fx(S.game.sfx,{p:mover});
    if(anim){lock(true);try{await anim()}catch(e){console.error(e)}lock(false)}
    if(S.state!==base) return; // the game changed while the animation ran
    S.hist.push(S.state);S.state=next;S.ui={};
    renderPlay(true);
    if(S.over) celebrate();
  },
  async busy(fn){ // animate something that is not a full move yet (e.g. the amazon stepping)
    if(S.busy) return;
    const base=S.state;lock(true);
    try{await fn()}catch(e){console.error(e)}
    lock(false);if(S.state===base) renderPlay();
  },
  redraw(){renderPlay()},
  say(m){S.hint=m}
};

function celebrate(){
  const w=S.over.winner;
  if(w==='draw'){Sound.fx('draw');return}
  Sound.fx('win',{id:S.gid});
  FX.confetti([FX.color(PC[w]),FX.cssVar('--brand-blue'),'#ffffff',w===0?'#9cc3ea':'#7d7d7d']);
}

function renderInfo(){
  const g=S.game;
  $('gKind').textContent=KIND[g.kind]||g.kind;
  $('gRef').textContent=g.solved?SOLVED[g.solved]:'';
  $('gName').textContent=g.name;
  $('gBlurb').textContent=g.blurb;
  const rules=typeof g.rules==='function'?g.rules(S.state):g.rules;
  $('gRules').replaceChildren(...rules.map(t=>el('li',{},pn(t))));
  $('gWin').textContent=pn(g.win)||'If it is your turn and you have no legal move, you lose.';
  $('gameSel').value=g.id;
}

function renderPlay(moved){
  check();
  const s=S.state,over=S.over;
  $('play').dataset.turn=over?'':s.turn;
  const t=$('turn');t.className='turn t'+s.turn+(moved?' bump':'');
  t.replaceChildren(...(over?[el('span',{},'Game over')]:[el('span',{class:'dot'}),el('span',{},`${name(s.turn)} to move`)]));
  const started=S.hist.length>0;
  [0,1].forEach(p=>{const b=$('f'+p);b.textContent=name(p);b.setAttribute('aria-pressed',String(S.starter===p));b.disabled=started});
  const res=$('result');
  if(over){
    const w=over.winner;res.hidden=false;res.className='result'+(w==='draw'?'':' w'+w);
    const again=el('button',{class:'btn',type:'button'},'Play again');again.addEventListener('click',()=>newPosition(true));
    const nxt=el('button',{class:'btn primary',type:'button',style:'margin-left:0'},'Next random game →');nxt.addEventListener('click',nextRandom);
    res.replaceChildren(el('div',{},el('b',{},w==='draw'?'It’s a draw':`${name(w)} wins`),el('p',{},over.reason)),el('div',{class:'row'},again,nxt));
  }else res.hidden=true;
  S.hint=null;
  const board=$('board');
  board.dataset.game=S.gid;
  board.replaceChildren(S.game.render(s,ctx));
  Skins.decorate(S.gid,board);
  fitBox(board);
  armed=null;
  $('hint').textContent=touchify(pn(S.hint??S.game.how),board.querySelector('[data-hov]'));
  $('undo').disabled=!started||S.busy;
  if(S.entering){S.entering=false;enterBoard()}
}

/* pieces pop onto the table one after another */
function enterBoard(){
  const b=$('board');if(reduceMotion()) return;
  b.classList.remove('entering');void b.offsetWidth;b.classList.add('entering');
  b.querySelectorAll('.ctr,.stone,.tile,.dom,.pin,.bite,.cherry,.card15,.queen,.hexcell,.gv,.edge,.star,.ecard,.dl,.sq').forEach((e,i)=>{e.style.setProperty('--pd',Math.min(i*16,900)+'ms');e.classList.add('popin')});
  setTimeout(()=>b.classList.remove('entering'),800);
}

/* the intro card shown when a new game is dealt */
function showIntro(){
  const g=S.game,box=$('intro');let idx=0;
  const words=g.name.split(' ');
  const title=el('h2',{class:'intro-title'},words.flatMap((w,wi)=>[el('span',{class:'w'},[...w].map(ch=>el('span',{class:'l',style:`--i:${idx++}`},ch))),wi<words.length-1?' ':null]));
  const motif=el('div',{class:'motif','aria-hidden':'true'});
  for(let i=0;i<18;i++) motif.append(el('i',{class:'m-'+(g.motif||'disc')+(i%3===0?' m-dark':''),style:`--x:${R(2,92)}%;--y:${R(2,88)}%;--s:${R(14,40)}px;--t:${R(5,11)}s;--d:-${R(0,8)}s;--dx:${R(-60,60)}px;--dy:${R(-50,50)}px;--r:${R(-90,90)}deg`}));
  const go=el('button',{class:'go',type:'button'},'Enter the game');
  go.addEventListener('click',enterGame);
  const how=el('button',{class:'go alt narrow-only',type:'button'},'How to play');
  how.addEventListener('click',()=>{enterGame();setTimeout(openSheet,380)});
  box.replaceChildren(motif,el('div',{class:'intro-inner'},
    el('span',{class:'chip'},`${KIND[g.kind]||g.kind} · game ${GAMES.indexOf(g)+1} of ${GAMES.length}`),title,el('p',{},g.blurb),
    el('div',{class:'mood'},el('span',{class:'eq'},el('i'),el('i'),el('i')),`Theme: ${Music.mood(g.id)}`),el('div',{class:'go-row'},go,how)));
  box.hidden=false;box.classList.remove('out');box.classList.add('playing');
  Music.stop();updateNowPlaying();
  setTimeout(()=>{try{go.focus({preventScroll:true})}catch(e){}},50);
}
function enterGame(){
  Sound.unlock().then(()=>{Sound.fx('enter',{id:S.gid});Music.play(S.gid);updateNowPlaying()});
  const box=$('intro');box.classList.add('out');setTimeout(()=>{if(box.classList.contains('out'))box.hidden=true},600);
  S.entering=true;renderPlay();
  $('howBtn').classList.toggle('nudge',!S.sawHow);
}

function updateNowPlaying(){
  const np=$('nowPlaying'),on=Sound.pref.music&&Music.current===S.gid;
  np.classList.toggle('playing',on);
  $('npText').textContent=on?Music.mood(S.gid):Sound.pref.music?'Music starts when you enter a game':'Music off';
  $('musicBtn').setAttribute('aria-pressed',String(Sound.pref.music));
  $('sfxBtn').setAttribute('aria-pressed',String(Sound.pref.sfx));
  $('lookBtn').setAttribute('aria-pressed',String(Skins.on));
}

function newPosition(animate){
  S.state=S.game.create();S.state.turn=S.starter;S.hist=[];S.ui={};S.busy=false;
  renderInfo();S.entering=!!animate;renderPlay();
  Demo.start(S.game,$('demoBox'),$('demoCap'));
}
function startGame(id){closeSheet();S.sawHow=false;S.gid=id;S.game=GAMES.find(g=>g.id===id);newPosition(false);showIntro()}
function nextRandom(){
  if(!S.bag.length) S.bag=shuffle(GAMES.map(g=>g.id).filter(id=>id!==S.gid));
  startGame(S.bag.pop());
  try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){}
}

/* ---------- phones and touchscreens ---------- */
const narrow=()=>typeof matchMedia==='function'&&matchMedia('(max-width:880px)').matches;
const TOUCH_HOW=[
  [/Hover one of your pieces to preview(?: the push)?, then click it\./,'Tap one of your pieces to preview the move, then tap it again to play.'],
  [/Hover a domino you can topple\. Click its left half to topple it left, its right half to topple it right\./,'Tap the left or right half of a domino to see which way it falls, then tap again to topple it.'],
  [/Hover a square to preview your domino, then click to place it\./,'Tap a square to preview your domino, then tap it again to place it.'],
  [/Click one of your dots\. Hover first to see what disappears\./,'Tap one of your dots to see what disappears, then tap again to play.']
];
function touchify(t,previews){
  if(!t||!touchUI()) return t;
  for(const [re,r] of TOUCH_HOW) t=t.replace(re,r);
  t=t.replace(/\bclicked\b/g,'tapped').replace(/\bClick\b/g,'Tap').replace(/\bclick\b/g,'tap').replace(/\bHover\b/g,'Tap');
  if(previews&&!/again/.test(t)) t+=' Tap once to preview, then tap again to play.';
  return t;
}

/* a finger cannot hover, so a move with a preview takes two taps: look, then play */
let ptr='mouse',armed=null,hintWas='';
function disarm(){if(!armed)return;const a=armed;armed=null;a.classList.remove('armed');if(a.isConnected){a._hov.off();$('hint').textContent=hintWas}}
function tapToConfirm(e){
  if(ptr!=='touch') return;
  const n=e.target.closest?e.target.closest('[data-hov]'):null;
  if(n&&n===armed){armed=null;n.classList.remove('armed');return}
  disarm();
  if(!n||!$('board').contains(n)||!ctx.live) return;
  e.preventDefault();e.stopImmediatePropagation();
  armed=n;n.classList.add('armed');n._hov.off();n._hov.on();
  hintWas=$('hint').textContent;$('hint').textContent='Tap it again to play this move, or tap anywhere else to cancel.';
  Sound.fx('pick');
}

/* on narrow screens the rules and demo live in a sheet that slides up over the board */
function openSheet(){
  if(!narrow()){$('rules').scrollIntoView({behavior:'smooth',block:'start'});return}
  document.body.classList.add('sheet-open');$('scrim').hidden=false;$('rules').scrollTop=0;
  S.sawHow=true;$('howBtn').classList.remove('nudge');fitBox($('demoBox'));
  setTimeout(()=>{try{$('sheetClose').focus({preventScroll:true})}catch(e){}},60);
}
function closeSheet(){
  if(!document.body.classList.contains('sheet-open')) return;
  document.body.classList.remove('sheet-open');$('scrim').hidden=true;$('rules').style.transform='';
}
function swipeToClose(handle,sheet){
  let y0=null,dy=0;
  handle.addEventListener('touchstart',e=>{y0=e.touches[0].clientY;dy=0;sheet.classList.add('dragging')},{passive:true});
  handle.addEventListener('touchmove',e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);sheet.style.transform=`translateY(${dy}px)`},{passive:true});
  handle.addEventListener('touchend',()=>{sheet.classList.remove('dragging');if(dy>80)closeSheet();else sheet.style.transform='';y0=null});
}

function boot(){
  [['nameL',0],['nameR',1]].forEach(([id,p])=>{const i=$(id);i.value=S.names[p];i.addEventListener('input',()=>{S.names[p]=i.value;renderInfo();if(!S.busy)renderPlay()})});
  const sel=$('gameSel');
  GAMES.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(g=>sel.append(el('option',{value:g.id},g.name)));
  sel.addEventListener('change',()=>{S.bag=S.bag.filter(x=>x!==sel.value);startGame(sel.value)});
  [0,1].forEach(p=>$('f'+p).addEventListener('click',()=>{if(S.hist.length||S.busy)return;S.starter=p;S.state.turn=p;S.ui={};Sound.fx('pick');renderPlay(true)}));
  $('undo').addEventListener('click',()=>{if(!S.hist.length||S.busy)return;S.state=S.hist.pop();S.ui={};Sound.fx('undo');renderPlay(true)});
  $('restart').addEventListener('click',()=>{if(!S.busy)newPosition(true)});
  $('next').addEventListener('click',nextRandom);
  $('musicBtn').addEventListener('click',()=>Sound.unlock().then(()=>{Sound.setPref('music',!Sound.pref.music);if(Sound.pref.music&&$('intro').hidden)Music.play(S.gid);else if(!Sound.pref.music)Music.stop();updateNowPlaying()}));
  $('sfxBtn').addEventListener('click',()=>Sound.unlock().then(()=>{Sound.setPref('sfx',!Sound.pref.sfx);Sound.fx('pick');updateNowPlaying()}));
  $('lookBtn').addEventListener('click',()=>{Skins.set(!Skins.on);Sound.fx('pick');updateNowPlaying();if(!S.busy)renderPlay()});
  Skins.install();
  $('howBtn').addEventListener('click',openSheet);
  $('sheetClose').addEventListener('click',closeSheet);
  $('scrim').addEventListener('click',closeSheet);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
  swipeToClose($('sheetHead'),$('rules'));
  document.addEventListener('pointerdown',e=>{ptr=e.pointerType},true);
  document.addEventListener('click',tapToConfirm,true);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{fitBox($('board'));fitBox($('demoBox'));if(!narrow())closeSheet()},120)});
  updateNowPlaying();
  nextRandom();
}
if(typeof document!=='undefined') boot();
