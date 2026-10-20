"use strict";
/* "Watch a round": plays a real game on a small board, move by move, on a loop.
   It uses each game's own moves() and render(), so what you watch is exactly how the game plays. */
const Demo=(()=>{
  let timer=null,game=null,st=null,box=null,cap=null,run=0;
  const dctx={live:false,ui:{},play(){},redraw(){},say(){},busy(){}};
  const IGNORE=/\b(ok|doom|popin|d-in|d-out|fresh|stamp)\b/g;

  function stop(){clearTimeout(timer);timer=null;run++}
  function start(g,boxEl,capEl){stop();game=g;box=boxEl;cap=capEl;const my=run;reset(my)}
  function draw(s){dctx.ui={};try{return game.render(s,dctx)}catch(e){console.error(e);return el('div')}}
  function say(p,text){cap.replaceChildren(...(p==null?[]:[el('span',{class:'dot d'+p})]),el('span',{},text))}
  function outcome(s){const r=game.result?game.result(s):null;if(r)return r;return game.hasMove(s,s.turn)?null:{winner:1-s.turn}}

  /* a light-touch player: win if it can, keep extra turns, otherwise leave the opponent few replies */
  function choose(s){
    let ms=game.moves(s);
    if(ms.length>40) ms=shuffle(ms.slice()).slice(0,40);
    let best=null,bestScore=Infinity;
    for(const m of ms){
      let sc=Math.random()*1.5;
      const r=game.result?game.result(m):null;
      if(r&&r.winner===s.turn) sc-=1000;
      else if(!r&&m.turn!==s.turn&&!game.hasMove(m,m.turn)) sc-=1000;
      else if(m.turn===s.turn) sc-=20;
      else if(ms.length<=30) sc+=game.moves(m).length*.15;
      if(sc<bestScore){bestScore=sc;best=m}
    }
    return best;
  }
  function walk(root){const m=new Map();(function rec(e,path){m.set(path,e);[...e.children].forEach((c,i)=>rec(c,path+'.'+i))})(root,'0');return m}
  function sig(e){
    let s=e.tagName+'|'+(e.getAttribute('class')||'').replace(IGNORE,'').trim();
    for(const a of ['points','cx','cy','x1','y1','x2','y2','x','y','width','style']){const v=e.getAttribute(a);if(v!=null)s+='|'+a+'='+v}
    if(!e.children.length) s+='|'+e.textContent;
    return s;
  }
  function mark(a,b){
    if(!a||!b) return;
    const A=walk(a),B=walk(b);
    for(const [p,e] of A){const f=B.get(p);if(!f||sig(f)!==sig(e))e.classList.add('d-out')}
    for(const [p,e] of B){const f=A.get(p);if(!f||sig(f)!==sig(e))e.setAttribute('data-din','')}
  }
  function reset(my){
    if(my!==run) return;
    st=game.create();st.turn=R(0,1);
    box.replaceChildren(draw(st));say(null,'A new round begins…');
    timer=setTimeout(()=>step(my),1500);
  }
  function step(my){
    if(my!==run||!box.isConnected) return;
    if(document.hidden){timer=setTimeout(()=>step(my),1000);return}
    const o=outcome(st);
    if(o){
      say(o.winner==='draw'?null:o.winner,o.winner==='draw'?'A draw. Watch again…':`${name(o.winner)} wins${o.reason?'':`. ${name(1-o.winner)} has no move left`}.`);
      timer=setTimeout(()=>reset(my),3000);return;
    }
    const mover=st.turn,next=choose(st);
    if(!next){timer=setTimeout(()=>reset(my),2000);return}
    const nextNode=draw(next);
    mark(box.firstElementChild,nextNode);
    say(mover,`${name(mover)} moves`+(next.turn===mover?' and goes again':''));
    timer=setTimeout(()=>{
      if(my!==run) return;
      box.replaceChildren(nextNode);
      nextNode.querySelectorAll('[data-din]').forEach(e=>e.classList.add('d-in'));
      st=next;timer=setTimeout(()=>step(my),1050);
    },750);
  }
  return {start,stop};
})();
