"use strict";
/* Visual effects: one full-screen canvas for particles, plus helpers that animate DOM pieces. */
const FX=(()=>{
  let cv=null,cx=null,raf=0,last=0;
  const parts=[];let drawers=[];
  const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const color=code=>cssVar(code==='L'?'--left':code==='R'?'--right':'--neutral')||'#3C7FBC';
  const center=e=>{const r=e.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2,r]};

  function ensure(){
    if(cv) return true;
    if(typeof document==='undefined') return false;
    cv=document.createElement('canvas');cv.className='fxcanvas';cv.setAttribute('aria-hidden','true');
    document.body.append(cv);resize();addEventListener('resize',resize);return true;
  }
  function resize(){const d=Math.min(2,devicePixelRatio||1);cv.width=innerWidth*d;cv.height=innerHeight*d;cx=cv.getContext('2d');cx.setTransform(d,0,0,d,0,0)}
  function kick(){if(!raf)raf=requestAnimationFrame(loop)}
  function loop(t){
    const dt=last?Math.min(.05,(t-last)/1000):1/60;last=t;
    cx.clearRect(0,0,innerWidth,innerHeight);
    drawers=drawers.filter(d=>d(cx,dt)!==false);
    for(let i=parts.length-1;i>=0;i--){
      const p=parts[i];p.life-=dt;
      if(p.life<=0){parts.splice(i,1);continue}
      const dr=Math.pow(p.drag,dt*60);
      p.vx*=dr;p.vy=p.vy*dr+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
      const k=p.life/p.max;
      cx.globalAlpha=Math.max(0,Math.min(1,k*1.5));
      if(p.kind==='confetti'){cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillStyle=p.color;cx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);cx.restore()}
      else if(p.kind==='fire'){
        const r=p.size*(.35+k*.8),g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
        g.addColorStop(0,`rgba(255,246,205,${k})`);g.addColorStop(.35,p.color);g.addColorStop(1,'rgba(255,50,0,0)');
        cx.globalCompositeOperation='lighter';cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,r,0,7);cx.fill();cx.globalCompositeOperation='source-over';
      }
      else if(p.kind==='smoke'){cx.fillStyle=`rgba(70,62,56,${k*.32})`;cx.beginPath();cx.arc(p.x,p.y,p.size*(1.8-k),0,7);cx.fill()}
      else{cx.fillStyle=p.color;cx.beginPath();cx.arc(p.x,p.y,p.size*(.5+k*.5),0,7);cx.fill()}
    }
    cx.globalAlpha=1;
    if(parts.length||drawers.length) raf=requestAnimationFrame(loop);else{raf=0;last=0}
  }
  function add(o){
    if(!ensure()||reduceMotion()) return;
    const p=Object.assign({vx:0,vy:0,g:0,drag:.97,life:.8,size:3,color:'#fff',kind:'dot',rot:0,vr:0},o);p.max=p.life;parts.push(p);kick();
  }
  function burst(x,y,colors,n=18,o={}){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,sp=(o.speed||180)*(.4+Math.random());
      add({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(o.up||60),g:o.g??520,life:.45+Math.random()*.45,size:(o.size||3)*(.6+Math.random()*.8),color:pick(colors),kind:o.kind||'dot'})}
  }
  const burstAt=(e,colors,n,o)=>{if(!e)return;const [x,y]=center(e);burst(x,y,colors,n,o)};

  /* add a class to pieces (CSS does the motion) and wait for it */
  async function vanish(els,cls='fly',ms=280){
    if(!els||!els.length||reduceMotion()) return;
    els.forEach((e,i)=>{e.style.transitionDelay=(i*28)+'ms';e.classList.add(cls)});
    await sleep(ms+Math.min(els.length,12)*28);
  }
  async function slide(e,to,ms=260){
    if(!e||!to||reduceMotion()) return;
    const [ax,ay]=center(e),[bx,by]=center(to);
    e.style.position='relative';e.style.zIndex=4;
    e.style.transition=`transform ${ms}ms cubic-bezier(.3,.7,.3,1)`;
    void e.offsetWidth;
    e.style.transform=`translate(${bx-ax}px,${by-ay}px) scale(1.08)`;
    await sleep(ms);
  }
  function shake(e){if(!e||reduceMotion())return;e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake');setTimeout(()=>e.classList.remove('shake'),450)}
  function confetti(colors){
    if(!ensure()||reduceMotion()) return;
    for(let i=0;i<150;i++) add({x:Math.random()*innerWidth,y:-20-Math.random()*innerHeight*.3,vx:(Math.random()-.5)*120,vy:120+Math.random()*220,g:160,drag:.995,life:2.4+Math.random()*1.4,size:7+Math.random()*6,color:pick(colors),kind:'confetti',rot:Math.random()*6,vr:(Math.random()-.5)*12});
  }
  /* keep a square burning for a while */
  function blaze(e,ms=1100){
    if(!e||!ensure()||reduceMotion()) return;
    const [x,y,r]=center(e);let left=ms/1000;
    drawers.push((c,dt)=>{
      left-=dt;if(left<=0) return false;
      for(let i=0;i<3;i++) add({x:x+(Math.random()-.5)*r.width*.7,y:y+r.height*.3,vx:(Math.random()-.5)*20,vy:-60-Math.random()*90,g:-40,life:.35+Math.random()*.4,size:7+Math.random()*7,color:pick(['rgba(255,170,40,.9)','rgba(255,110,20,.85)','rgba(255,210,90,.9)']),kind:'fire'});
      if(Math.random()<.25) add({x:x+(Math.random()-.5)*r.width*.5,y:y-r.height*.2,vy:-50,g:-10,life:.9,size:6,kind:'smoke'});
    });
  }

  /* The Amazons arrow: draw the bow, release, a flaming arrow arcs to the square, then it burns. */
  function arrow(fromEl,toEl,cb={}){
    return new Promise(done=>{
      if(!ensure()||reduceMotion()){cb.onRelease&&cb.onRelease();cb.onHit&&cb.onHit();done();return}
      const [x0,y0,ra]=center(fromEl),[x1,y1]=center(toEl);
      const ang=Math.atan2(y1-y0,x1-x0),ux=Math.cos(ang),uy=Math.sin(ang);
      let px=-uy,py=ux;if(py>0){px=-px;py=-py} // the side that points up the screen
      const cell=ra.width,L=Math.max(28,cell*.95),bowR=Math.max(20,cell*.62);
      const C=[x0-ux*bowR*.45,y0-uy*bowR*.45],SPAN=1.0;
      const M=[C[0]+ux*bowR*Math.cos(SPAN),C[1]+uy*bowR*Math.cos(SPAN)];
      const e1=[C[0]+Math.cos(ang-SPAN)*bowR,C[1]+Math.sin(ang-SPAN)*bowR],e2=[C[0]+Math.cos(ang+SPAN)*bowR,C[1]+Math.sin(ang+SPAN)*bowR];
      const DRAW=560,dist=Math.hypot(x1-x0,y1-y0),FLY=Math.min(720,320+dist*1.3),HOLD=260;
      const blue=cssVar('--brand-blue')||'#3C7FBC';
      const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      let t=0,released=false,hit=false;
      const drawArrow=(c,hx,hy,a,glow)=>{
        const tx=hx-ux*L,ty=hy-uy*L;
        c.globalAlpha=a;c.lineCap='round';
        c.strokeStyle='#6b4423';c.lineWidth=3.2;c.beginPath();c.moveTo(tx,ty);c.lineTo(hx-ux*6,hy-uy*6);c.stroke();
        c.fillStyle=blue;
        [1,-1].forEach(sg=>{c.beginPath();c.moveTo(tx+ux*11,ty+uy*11);c.lineTo(tx-ux*2+px*7*sg,ty-uy*2+py*7*sg);c.lineTo(tx+ux*2,ty+uy*2);c.closePath();c.fill()});
        c.fillStyle='#222';c.beginPath();c.moveTo(hx+ux*5,hy+uy*5);c.lineTo(hx-ux*8+px*5.5,hy-uy*8+py*5.5);c.lineTo(hx-ux*8-px*5.5,hy-uy*8-py*5.5);c.closePath();c.fill();
        const g=c.createRadialGradient(hx,hy,0,hx,hy,glow);g.addColorStop(0,'rgba(255,230,140,.95)');g.addColorStop(.5,'rgba(255,130,20,.55)');g.addColorStop(1,'rgba(255,60,0,0)');
        c.globalCompositeOperation='lighter';c.fillStyle=g;c.beginPath();c.arc(hx,hy,glow,0,7);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1;
      };
      const drawBow=(c,a,pull)=>{
        const N=[M[0]-ux*pull,M[1]-uy*pull];
        c.globalAlpha=a;c.lineCap='round';
        c.strokeStyle='#8a5a2b';c.lineWidth=5;c.beginPath();c.arc(C[0],C[1],bowR,ang-SPAN,ang+SPAN);c.stroke();
        c.strokeStyle='#d9c9a8';c.lineWidth=1.6;c.beginPath();c.moveTo(e1[0],e1[1]);c.lineTo(N[0],N[1]);c.lineTo(e2[0],e2[1]);c.stroke();
        c.globalAlpha=1;return N;
      };
      cb.onDraw&&cb.onDraw();
      drawers.push((c,dt)=>{
        t+=dt*1000;
        if(t<DRAW){ // draw the string back, arrow nocked and catching fire
          const k=ease(t/DRAW),pull=k*bowR*.75,N=drawBow(c,Math.min(1,t/120),pull);
          const hx=N[0]+ux*L,hy=N[1]+uy*L;
          if(k>.25&&Math.random()<.8) add({x:hx,y:hy,vx:(Math.random()-.5)*30,vy:-40-Math.random()*40,g:-30,life:.3+Math.random()*.25,size:5+k*6,color:pick(['rgba(255,170,40,.9)','rgba(255,120,20,.85)']),kind:'fire'});
          drawArrow(c,hx,hy,1,6+k*10);
          return;
        }
        const ft=t-DRAW;
        if(!released){released=true;cb.onRelease&&cb.onRelease()}
        // bow springs back and fades
        if(ft<300) drawBow(c,1-ft/300,Math.max(0,(1-ft/60))*bowR*.75*Math.cos(ft/18));
        if(ft<FLY){
          const k=ft/FLY,e=1-Math.pow(1-k,1.6);
          const sx=M[0]+ux*L,sy=M[1]+uy*L,arc=Math.sin(Math.PI*e)*Math.min(70,dist*.16);
          const hx=sx+(x1-sx)*e+px*arc,hy=sy+(y1-sy)*e+py*arc;
          for(let i=0;i<4;i++) add({x:hx-ux*L*(.15+Math.random()*.5),y:hy-uy*L*(.15+Math.random()*.5),vx:-ux*40+(Math.random()-.5)*40,vy:-uy*40-30-Math.random()*40,g:-50,life:.25+Math.random()*.35,size:6+Math.random()*7,color:pick(['rgba(255,180,50,.9)','rgba(255,110,20,.85)','rgba(255,220,110,.9)']),kind:'fire'});
          if(Math.random()<.3) add({x:hx-ux*L*.6,y:hy-uy*L*.6,vy:-30,g:-15,life:.7,size:5,kind:'smoke'});
          drawArrow(c,hx,hy,1,16);
          return;
        }
        if(!hit){
          hit=true;cb.onHit&&cb.onHit();
          burst(x1,y1,['#ffd27a','#ff8a1e','#ff5a12','#fff1c2'],46,{speed:260,g:420,size:3.2});
          for(let i=0;i<22;i++) add({x:x1,y:y1,vx:(Math.random()-.5)*160,vy:-40-Math.random()*160,g:-20,life:.4+Math.random()*.5,size:9+Math.random()*10,color:pick(['rgba(255,170,40,.9)','rgba(255,90,10,.85)']),kind:'fire'});
          blaze(toEl,1200);
        }
        if(ft<FLY+HOLD){drawArrow(c,x1,y1,1-(ft-FLY)/HOLD,10);return}
        done();return false;
      });
      kick();
    });
  }
  return {burst,burstAt,vanish,slide,shake,confetti,blaze,arrow,color,center,cssVar};
})();
