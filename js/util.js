"use strict";
/* Shared helpers. Every file in js/ is a classic script, so these names are global. */
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clone=o=>JSON.parse(JSON.stringify(o));
const shuffle=(a,rnd=Math.random)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sum=a=>a.reduce((x,y)=>x+y,0);
/* the same run of numbers from the same seed, on any device (the daily puzzle uses it) */
const seeded=seed=>{let t=seed>>>0;return()=>{t=t+0x6D2B79F5>>>0;let r=Math.imul(t^t>>>15,1|t);r=r+Math.imul(r^r>>>7,61|r)^r;return((r^r>>>14)>>>0)/4294967296}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PC=['L','R'];
const CNAME={L:'blue',R:'black',N:'green'};
const SIDE=['Blue','Black'];
const Q8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const O4=[[1,0],[-1,0],[0,1],[0,-1]];
const orList=a=>a.length===1?String(a[0]):a.slice(0,-1).join(', ')+' or '+a[a.length-1];

/* app state */
const S={gid:null,game:null,state:null,hist:[],who:[],starter:0,over:null,ui:{},bag:[],names:['',''],me:'',opp:'',remote:false,hint:null,busy:false,entering:false};
const name=p=>p===1&&S.state&&S.state.bot&&typeof SdkBotPlay!=='undefined'?SdkBotPlay.NAME:(S.names[p]||'').trim()||SIDE[p];
/* rules are written with Left and Right; show the players' names instead */
const pn=t=>t==null?t:String(t).replace(/\bLeft\b/g,name(0)).replace(/\bRight\b/g,name(1));
const KIND={Impartial:'Same moves for both',Partizan:'Blue vs black',Scoring:'Highest score wins'};
const SOLVED={yes:'Solved: mathematicians have worked out perfect play for this game.',
  partly:'Partly solved: perfect play is known only for some small positions.',
  no:'Unsolved: nobody has worked out perfect play yet.'};
const reduceMotion=()=>typeof window!=='undefined'&&window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* the next state after a move: copy, change, hand the turn over */
const nx=(s,f)=>{const n=clone(s);f(n);n.turn=1-s.turn;return n};

const GAMES=[];
const def=g=>GAMES.push(g);

function el(tag,props,...kids){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(props||{})){
    if(k==='class') e.className=v;
    else if(k.startsWith('on')&&typeof v==='function') e.addEventListener(k.slice(2),v);
    else if(v===true) e.setAttribute(k,'');
    else if(v!==false&&v!=null) e.setAttribute(k,v);
  }
  for(const k of kids.flat()) if(k!=null&&k!==false) e.append(k.nodeType?k:document.createTextNode(k));
  return e;
}
function sv(tag,props,...kids){
  const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [k,v] of Object.entries(props||{})) if(v!=null&&v!==false) e.setAttribute(k,v);
  for(const k of kids.flat()) if(k!=null) e.append(k.nodeType?k:document.createTextNode(k));
  return e;
}
/* hover previews; on a touchscreen the first tap shows the preview and the second makes the move (see app.js) */
function hov(n,on,off){n.addEventListener('mouseenter',on);n.addEventListener('mouseleave',off);n.addEventListener('focus',on);n.addEventListener('blur',off);n._hov={on,off};n.setAttribute('data-hov','')}
const touchUI=()=>typeof matchMedia==='function'&&matchMedia('(hover: none), (pointer: coarse)').matches;
/* shrink a board to the width it has, instead of letting it run off a phone screen */
function fitBox(box){
  const c=box&&box.firstElementChild;if(!c)return;
  box.style.setProperty('--fit','1');
  const cs=getComputedStyle(box),avail=box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  const w=Math.max(c.scrollWidth,c.offsetWidth);
  if(avail>0&&w>avail+1) box.style.setProperty('--fit',Math.max(.4,avail/w).toFixed(3));
  /* on a phone, small boards grow into the spare room so squares are easier to tap */
  else if(avail>0&&box.id==='board'&&innerWidth<=600){
    const h=Math.max(c.scrollHeight,c.offsetHeight),z=Math.min(1.5,(avail-4)/w,innerHeight*.55/Math.max(1,h));
    if(z>1.05) box.style.setProperty('--fit',z.toFixed(3));
  }
}
/* make an svg node behave like a button */
function act(n,fn,label){
  n.setAttribute('tabindex','0');n.setAttribute('role','button');if(label)n.setAttribute('aria-label',label);
  n.addEventListener('click',fn);
  n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}});
}
