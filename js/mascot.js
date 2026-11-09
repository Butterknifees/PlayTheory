"use strict";
/* Play, the PlayTheory knight, draws its sword, slashes once, salutes and bows to the winner, then a speech
   bubble cheers them (text only, no voice). The animation is a sprite sheet rendered in Blender
   (Brand/3D/Play): 64 frames in an 8 × 8 grid, played once at 24 frames a second. */
const Mascot=(()=>{
  const SRC='img/play-bow.webp?v=2',N=64,COLS=8,ROWS=8,FPS=24,SAY=27; // the bubble comes as the bow begins
  let box=null,raf=0,hideT=0,img=null;
  const preload=()=>{
    if(!img){img=new Image();img.src=SRC}
    return img;
  };
  const frame=(sp,k)=>{sp.style.backgroundPosition=`${k%COLS/(COLS-1)*100}% ${(k/COLS|0)/(ROWS-1)*100}%`};
  function hide(){
    cancelAnimationFrame(raf);clearTimeout(hideT);
    if(!box) return;
    const b=box;box=null;b.classList.add('out');setTimeout(()=>b.remove(),400);
  }
  function cheer(who){
    hide();preload();
    const sp=el('div',{class:'mascot-sprite'});sp.style.backgroundImage=`url("${SRC}")`;frame(sp,0);
    const b=box=el('div',{class:'mascot',role:'status','aria-live':'polite',title:'Tap to close'},
      el('div',{class:'mascot-shadow'}),sp,el('div',{class:'mascot-say'},el('b',{},'Congrats!'),el('span',{},`${who} wins!`)));
    const talk=()=>b.classList.add('talk');
    b.addEventListener('click',hide);
    document.body.append(b);
    if(reduceMotion()){talk();hideT=setTimeout(hide,4000);return}
    const run=()=>{
      if(box!==b) return;
      const t0=performance.now(),step=now=>{
        if(box!==b) return;
        const k=Math.min(N-1,Math.floor((now-t0)/1000*FPS));frame(sp,k);
        if(k>=SAY) talk();
        if(k<N-1) raf=requestAnimationFrame(step); else hideT=setTimeout(hide,2600);
      };
      raf=requestAnimationFrame(step);
    };
    if(img.complete&&img.naturalWidth) run(); else{img.addEventListener('load',run,{once:true});img.addEventListener('error',hide,{once:true})}
  }
  /* the end card: Play bows once inside it and holds the last frame (a draw just gets the standing knight) */
  function pose(bow){
    preload();
    const sp=el('div',{class:'mascot-sprite'});sp.style.backgroundImage=`url("${SRC}")`;
    if(!bow||reduceMotion()){frame(sp,bow?N-1:0);return sp}
    frame(sp,0);
    const run=()=>{const t0=performance.now(),step=now=>{const k=Math.max(0,Math.min(N-1,Math.floor((now-t0)/1000*FPS)));frame(sp,k);if(k<N-1&&sp.isConnected)requestAnimationFrame(step)};requestAnimationFrame(step)};
    if(img.complete&&img.naturalWidth) run(); else img.addEventListener('load',run,{once:true});
    return sp;
  }
  return {cheer,hide,preload,pose};
})();
