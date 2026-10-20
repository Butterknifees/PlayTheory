"use strict";
/* Shared helpers. Every file in js/ is a classic script, so these names are global. */
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clone=o=>JSON.parse(JSON.stringify(o));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sum=a=>a.reduce((x,y)=>x+y,0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PC=['L','R'];
const CNAME={L:'blue',R:'black',N:'green'};
const SIDE=['Left','Right'];
const Q8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const O4=[[1,0],[-1,0],[0,1],[0,-1]];
const orList=a=>a.length===1?String(a[0]):a.slice(0,-1).join(', ')+' or '+a[a.length-1];

/* app state */
const S={gid:null,game:null,state:null,hist:[],starter:0,over:null,ui:{},bag:[],names:['',''],hint:null,busy:false,entering:false};
const name=p=>(S.names[p]||'').trim()||SIDE[p];
/* swap the words Left and Right for the players' names, once they have typed them */
const pn=t=>t==null?t:String(t).replace(/\bLeft\b/g,name(0)).replace(/\bRight\b/g,name(1));
const KIND={Impartial:'Same moves for both',Partizan:'Blue vs black',Scoring:'Most boxes wins'};
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
function hov(n,on,off){n.addEventListener('mouseenter',on);n.addEventListener('mouseleave',off);n.addEventListener('focus',on);n.addEventListener('blur',off)}
/* make an svg node behave like a button */
function act(n,fn,label){
  n.setAttribute('tabindex','0');n.setAttribute('role','button');if(label)n.setAttribute('aria-label',label);
  n.addEventListener('click',fn);
  n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}});
}
