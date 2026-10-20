"use strict";
/* Themed mode: draws each game's pieces as what the game's name suggests (trains, frogs, pins,
   chocolate, queens...) as shaded SVG art with shadows on a slightly tilted table.
   It only restyles the normal board, so Classic mode is simply this file switched off.
   Skins.install() writes the CSS once; Skins.decorate() adds art that CSS alone cannot (SVG games). */
const Skins=(()=>{
  const COL={L:'#3C7FBC',R:'#3a3d44',N:'#3f9a6b'};
  const NS='http://www.w3.org/2000/svg';
  function shade(hex,f){
    const n=parseInt(hex.slice(1),16),t=f<0?0:255,p=Math.abs(f);
    const ch=v=>Math.round(v+(t-v)*p);
    return '#'+((1<<24)+(ch(n>>16)<<16)+(ch(n>>8&255)<<8)+ch(n&255)).toString(16).slice(1);
  }
  const svg=(vb,body)=>`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}'>${body}</svg>`;
  const url=s=>`url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  const rad=(id,c,cx='38%',cy='32%')=>`<radialGradient id='${id}' cx='${cx}' cy='${cy}' r='75%'><stop offset='0' stop-color='${shade(c,.5)}'/><stop offset='.5' stop-color='${c}'/><stop offset='1' stop-color='${shade(c,-.5)}'/></radialGradient>`;
  const lin=(id,c,vert)=>`<linearGradient id='${id}' x1='0' y1='0' x2='${vert?0:1}' y2='${vert?1:0}'><stop offset='0' stop-color='${shade(c,.35)}'/><stop offset='.55' stop-color='${c}'/><stop offset='1' stop-color='${shade(c,-.45)}'/></linearGradient>`;
  const flip=b=>`<g transform='translate(100 0) scale(-1 1)'>${b}</g>`;
  const STAR=(()=>{let d='';for(let i=0;i<10;i++){const r=i%2?19:46,a=-Math.PI/2+i*Math.PI/5;d+=(i?'L':'M')+(50+r*Math.cos(a)).toFixed(1)+' '+(52+r*Math.sin(a)).toFixed(1)}return d+'Z'})();

  /* ---------- the art ---------- */
  const A={
    marble:c=>svg('0 0 100 100',`<defs>${rad('g',c)}</defs><circle cx='50' cy='50' r='46' fill='url(#g)'/><ellipse cx='37' cy='30' rx='15' ry='9' fill='#fff' opacity='.55' transform='rotate(-30 37 30)'/>`),
    chip:c=>svg('0 0 100 100',`<defs>${rad('g',c,'50%','40%')}</defs><circle cx='50' cy='50' r='47' fill='url(#g)'/><circle cx='50' cy='50' r='41' fill='none' stroke='#fff' stroke-width='8' stroke-dasharray='11 10.5'/><circle cx='50' cy='50' r='29' fill='${shade(c,.12)}' stroke='#fff' stroke-width='2' stroke-dasharray='3 3'/><ellipse cx='40' cy='32' rx='15' ry='6' fill='#fff' opacity='.3'/>`),
    coin:()=>{const g='#d9a521';return svg('0 0 100 100',`<defs>${rad('g',g)}</defs><circle cx='50' cy='50' r='47' fill='url(#g)'/><circle cx='50' cy='50' r='37' fill='none' stroke='${shade(g,-.35)}' stroke-width='3'/><path d='M50 28L56 43L72 44L60 54L64 70L50 61L36 70L40 54L28 44L44 43Z' fill='${shade(g,-.22)}'/><ellipse cx='36' cy='28' rx='13' ry='6' fill='#fff' opacity='.45' transform='rotate(-30 36 28)'/>`)},
    crate:()=>svg('0 0 100 100',`<rect x='3' y='3' width='94' height='94' rx='5' fill='#c8913a' stroke='#7d5420' stroke-width='6'/><path d='M8 36H92M8 64H92' stroke='#9a6a25' stroke-width='3'/><path d='M14 14L86 86M86 14L14 86' stroke='#8a5a1d' stroke-width='7' opacity='.5'/><g fill='#5a3b16'><circle cx='11' cy='11' r='3'/><circle cx='89' cy='11' r='3'/><circle cx='11' cy='89' r='3'/><circle cx='89' cy='89' r='3'/></g>`),
    pin:()=>{const P='M20 3C28 3 30 16 27 27C25 34 25 38 29 48C38 68 37 96 31 110C28 117 12 117 9 110C3 96 2 68 11 48C15 38 15 34 13 27C10 16 12 3 20 3Z';
      return svg('0 0 40 120',`<defs><linearGradient id='w' x1='0' x2='1'><stop offset='0' stop-color='#cfd2d8'/><stop offset='.4' stop-color='#fff'/><stop offset='1' stop-color='#adb1b8'/></linearGradient><clipPath id='c'><path d='${P}'/></clipPath></defs><path d='${P}' fill='url(#w)'/><g clip-path='url(#c)' fill='#d0312d'><rect x='0' y='33' width='40' height='5'/><rect x='0' y='41' width='40' height='4'/></g>`)},
    choc:(dark='#5a2f17',mid='#6e3b1e')=>svg('0 0 100 100',`<rect x='2' y='2' width='96' height='96' rx='8' fill='${dark}'/><polygon points='8,8 92,8 80,20 20,20' fill='${shade(mid,.3)}'/><polygon points='8,8 20,20 20,80 8,92' fill='${shade(mid,.18)}'/><polygon points='92,8 92,92 80,80 80,20' fill='${shade(mid,-.3)}'/><polygon points='8,92 92,92 80,80 20,80' fill='${shade(mid,-.42)}'/><rect x='20' y='20' width='60' height='60' fill='${mid}'/>`),
    skull:()=>svg('0 0 100 100',`<path d='M28 70L72 86M72 70L28 86' stroke='#f4efe2' stroke-width='7' stroke-linecap='round'/><circle cx='50' cy='44' r='20' fill='#f4efe2'/><rect x='40' y='56' width='20' height='12' rx='3' fill='#f4efe2'/><circle cx='42' cy='44' r='5' fill='#2c1a0e'/><circle cx='58' cy='44' r='5' fill='#2c1a0e'/>`),
    cherry:c=>svg('0 0 100 100',`<defs>${rad('g',c)}</defs><path d='M52 8C46 30 36 44 30 56M52 8C58 30 64 46 68 60' stroke='#6b4423' stroke-width='4' fill='none' stroke-linecap='round'/><path d='M52 9C64 2 80 6 84 14C72 18 60 16 52 9Z' fill='#4f9a4a'/><circle cx='30' cy='70' r='22' fill='url(#g)'/><circle cx='68' cy='74' r='22' fill='url(#g)'/><ellipse cx='23' cy='62' rx='6' ry='4' fill='#fff' opacity='.6'/><ellipse cx='61' cy='66' rx='6' ry='4' fill='#fff' opacity='.6'/>`),
    domino:(c,a,b)=>{
      const X=[11,20,29],L={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]};
      const pips=(n,oy)=>L[n].map(([x,y])=>`<circle cx='${X[x]}' cy='${oy+12+y*13}' r='3.6' fill='#fff'/>`).join('');
      return svg('0 0 40 100',`<defs>${lin('g',c)}</defs><rect x='1' y='1' width='38' height='98' rx='6' fill='url(#g)' stroke='${shade(c,-.4)}' stroke-width='1.5'/><line x1='6' y1='50' x2='34' y2='50' stroke='#fff' stroke-width='2' opacity='.6'/>${pips(a,0)}${pips(b,50)}`);
    },
    elephant:c=>svg('0 0 100 100',`<defs>${lin('g',c,1)}</defs><g fill='url(#g)'><rect x='24' y='60' width='9' height='24' rx='3'/><rect x='36' y='62' width='9' height='22' rx='3'/><rect x='54' y='62' width='9' height='22' rx='3'/><rect x='64' y='60' width='9' height='24' rx='3'/><ellipse cx='46' cy='54' rx='30' ry='20'/><circle cx='76' cy='44' r='15'/></g><path d='M86 48Q94 62 91 76Q90 83 84 80' stroke='${c}' stroke-width='7' fill='none' stroke-linecap='round'/><ellipse cx='68' cy='46' rx='10' ry='14' fill='${shade(c,-.25)}'/><path d='M84 56Q92 60 95 56' stroke='#f4efe2' stroke-width='3.5' fill='none' stroke-linecap='round'/><circle cx='80' cy='40' r='2.2' fill='#111'/><path d='M17 50Q11 56 12 64' stroke='${shade(c,-.3)}' stroke-width='2.5' fill='none'/>`),
    rhino:c=>svg('0 0 100 100',`<defs>${lin('g',c,1)}</defs><g fill='url(#g)'><rect x='30' y='60' width='10' height='24' rx='3'/><rect x='42' y='62' width='10' height='22' rx='3'/><rect x='62' y='62' width='10' height='22' rx='3'/><rect x='74' y='60' width='10' height='24' rx='3'/><ellipse cx='58' cy='54' rx='31' ry='20'/><ellipse cx='26' cy='58' rx='17' ry='12'/></g><path d='M12 54L3 36L18 50Z' fill='#e9e2cf'/><path d='M22 48L19 38L27 46Z' fill='#e9e2cf'/><path d='M34 45L38 34L42 46Z' fill='${shade(c,-.2)}'/><circle cx='22' cy='54' r='2' fill='#fff'/><path d='M89 50Q95 56 93 64' stroke='${shade(c,-.3)}' stroke-width='2.5' fill='none'/>`),
    boxcar:c=>svg('0 0 100 100',`<defs>${lin('t',c,1)}</defs><rect x='0' y='58' width='8' height='6' fill='#333'/><rect x='92' y='58' width='8' height='6' fill='#333'/><rect x='6' y='50' width='88' height='28' rx='3' fill='${shade(c,-.35)}'/><rect x='6' y='18' width='88' height='36' rx='5' fill='url(#t)'/><path d='M17 20V52M28 20V52M39 20V52M50 20V52M61 20V52M72 20V52M83 20V52' stroke='${shade(c,-.18)}' stroke-width='2'/><rect x='36' y='55' width='28' height='21' fill='none' stroke='${shade(c,.25)}' stroke-width='2'/><g fill='#1d1d1d'><circle cx='20' cy='82' r='7'/><circle cx='36' cy='82' r='7'/><circle cx='64' cy='82' r='7'/><circle cx='80' cy='82' r='7'/></g>`),
    frog:(c,left)=>svg('0 0 100 100',(left?flip:x=>x)(`<defs>${rad('g',c,'45%','35%')}</defs><g fill='${shade(c,-.2)}'><ellipse cx='26' cy='24' rx='16' ry='7' transform='rotate(-30 26 24)'/><ellipse cx='26' cy='76' rx='16' ry='7' transform='rotate(30 26 76)'/><ellipse cx='70' cy='28' rx='10' ry='5' transform='rotate(40 70 28)'/><ellipse cx='70' cy='72' rx='10' ry='5' transform='rotate(-40 70 72)'/></g><ellipse cx='46' cy='50' rx='26' ry='21' fill='url(#g)'/><ellipse cx='70' cy='50' rx='15' ry='15' fill='url(#g)'/><circle cx='72' cy='37' r='7' fill='#fff'/><circle cx='72' cy='63' r='7' fill='#fff'/><circle cx='74' cy='37' r='3.5' fill='#111'/><circle cx='74' cy='63' r='3.5' fill='#111'/><g fill='${shade(c,.3)}' opacity='.7'><circle cx='40' cy='44' r='3'/><circle cx='50' cy='58' r='2.5'/><circle cx='34' cy='56' r='2'/></g>`)),
    lily:()=>svg('0 0 100 100',`<circle cx='50' cy='50' r='44' fill='#4f9a4a'/><path d='M50 50L97 40L97 60Z' fill='#2f7fa8'/><path d='M50 50L14 30M50 50L12 62M50 50L40 10M50 50L44 92M50 50L78 14M50 50L78 86' stroke='#6dba62' stroke-width='2'/>`),
    curling:c=>svg('0 0 100 100',`<defs>${rad('g','#8d9097','50%','40%')}</defs><circle cx='50' cy='52' r='44' fill='url(#g)'/><circle cx='50' cy='52' r='30' fill='#c3c6cc'/><rect x='28' y='44' width='44' height='14' rx='7' fill='${c}'/><rect x='44' y='34' width='12' height='22' rx='5' fill='${shade(c,-.25)}'/><ellipse cx='36' cy='32' rx='12' ry='6' fill='#fff' opacity='.35'/>`),
    block:c=>svg('0 0 100 100',`<polygon points='50,8 90,28 50,48 10,28' fill='${shade(c,.3)}'/><polygon points='10,28 50,48 50,92 10,72' fill='${c}'/><polygon points='90,28 50,48 50,92 90,72' fill='${shade(c,-.35)}'/><path d='M50 48V92' stroke='${shade(c,.15)}' stroke-width='1.5'/>`),
    car:(c,right)=>svg('0 0 100 100',(right?flip:x=>x)(`<defs>${lin('g',c,1)}</defs><g fill='#1d1d1d'><rect x='18' y='12' width='16' height='10' rx='3'/><rect x='66' y='12' width='16' height='10' rx='3'/><rect x='18' y='78' width='16' height='10' rx='3'/><rect x='66' y='78' width='16' height='10' rx='3'/></g><rect x='6' y='20' width='88' height='60' rx='20' fill='url(#g)'/><path d='M30 28L44 32V68L30 72Z' fill='#bfe3ff'/><rect x='46' y='32' width='26' height='36' rx='6' fill='${shade(c,.2)}'/><path d='M76 34L84 36V64L76 66Z' fill='#bfe3ff' opacity='.75'/><circle cx='10' cy='32' r='4' fill='#ffe27a'/><circle cx='10' cy='68' r='4' fill='#ffe27a'/>`)),
    wagon:c=>svg('0 0 100 100',`<defs>${lin('g',c,1)}</defs><path d='M4 50H26' stroke='#5b3a1e' stroke-width='5' stroke-linecap='round'/><circle cx='6' cy='50' r='4' fill='none' stroke='#5b3a1e' stroke-width='3'/><g fill='#222'><rect x='30' y='14' width='14' height='10' rx='3'/><rect x='72' y='14' width='14' height='10' rx='3'/><rect x='30' y='76' width='14' height='10' rx='3'/><rect x='72' y='76' width='14' height='10' rx='3'/></g><rect x='24' y='22' width='70' height='56' rx='6' fill='url(#g)' stroke='${shade(c,-.4)}' stroke-width='3'/><path d='M24 41H94M24 59H94' stroke='${shade(c,-.25)}' stroke-width='3'/>`),
    queen:c=>svg('0 0 100 100',`<defs>${lin('g',c)}</defs><g stroke='rgba(255,255,255,.35)' stroke-width='1.2'><ellipse cx='50' cy='90' rx='30' ry='7' fill='${shade(c,-.45)}'/><rect x='22' y='76' width='56' height='13' rx='5' fill='url(#g)'/><path d='M32 77C35 60 42 50 40 38H60C58 50 65 60 68 77Z' fill='url(#g)'/><ellipse cx='50' cy='38' rx='15' ry='4.5' fill='${shade(c,.2)}'/><path d='M34 32L37 14L44 25L50 10L56 25L63 14L66 32Z' fill='url(#g)'/><circle cx='50' cy='8' r='4.5' fill='${shade(c,.3)}'/></g>`),
    cow:c=>svg('0 0 100 100',`<defs>${rad('g',c,'45%','35%')}</defs><path d='M30 26Q16 8 6 16M70 26Q84 8 94 16' stroke='#efe6cf' stroke-width='6' fill='none' stroke-linecap='round'/><ellipse cx='16' cy='40' rx='13' ry='7' fill='${shade(c,-.2)}' transform='rotate(-20 16 40)'/><ellipse cx='84' cy='40' rx='13' ry='7' fill='${shade(c,-.2)}' transform='rotate(20 84 40)'/><ellipse cx='50' cy='50' rx='28' ry='32' fill='url(#g)'/><ellipse cx='42' cy='34' rx='9' ry='7' fill='#fff' opacity='.75'/><ellipse cx='50' cy='70' rx='20' ry='13' fill='#f2a9b4'/><circle cx='43' cy='70' r='3' fill='#7a3b47'/><circle cx='57' cy='70' r='3' fill='#7a3b47'/><circle cx='39' cy='47' r='3.5' fill='#111'/><circle cx='61' cy='47' r='3.5' fill='#111'/>`),
    splat:c=>svg('0 0 100 100',`<defs>${rad('g',c)}</defs><path d='M50 12C60 14 62 26 70 24C80 22 86 32 80 40C76 46 90 50 86 60C82 70 70 64 66 74C62 86 50 92 42 82C36 74 24 84 18 74C12 64 22 58 16 50C10 40 20 30 30 34C38 36 40 10 50 12Z' fill='url(#g)'/><circle cx='88' cy='22' r='4' fill='${c}'/><circle cx='12' cy='86' r='3' fill='${c}'/><ellipse cx='40' cy='38' rx='9' ry='5' fill='#fff' opacity='.4'/>`),
    star:(c,rim)=>svg('0 0 100 100',`<defs>${rad('g',c,'50%','45%')}<filter id='b' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='5'/></filter></defs><path d='${STAR}' fill='${rim||c}' filter='url(#b)' opacity='.85'/><path d='${STAR}' fill='url(#g)' stroke='${rim||shade(c,.4)}' stroke-width='2.5'/>`),
    forklift:(c,left)=>svg('0 0 100 100',(left?flip:x=>x)(`<rect x='70' y='18' width='6' height='62' fill='#555'/><path d='M76 74H98V80H76Z' fill='#8a8d93'/><path d='M76 60H96V64H76Z' fill='#8a8d93'/><rect x='12' y='44' width='58' height='30' rx='5' fill='${c}'/><path d='M26 44V18H56L64 44' fill='none' stroke='#333' stroke-width='5' stroke-linejoin='round'/><rect x='6' y='50' width='10' height='20' rx='3' fill='${shade(c,-.35)}'/><circle cx='26' cy='80' r='10' fill='#222'/><circle cx='58' cy='80' r='10' fill='#222'/><circle cx='26' cy='80' r='4' fill='#888'/><circle cx='58' cy='80' r='4' fill='#888'/>`)),
    diamond:()=>svg('0 0 100 100',`<path d='M50 4L90 50L50 96L10 50Z' fill='#c0392b'/>`)
  };

  /* ---------- the stylesheet ---------- */
  const T=(id,rules)=>Object.entries(rules).map(([sel,decl])=>sel.split(',').map(s=>`.themed [data-game="${id}"]${s.trim()?' '+s.trim():''}`).join(',')+`{${decl}}`).join('\n');
  const art=(s,size='contain')=>`background:${url(s)} center/${size} no-repeat;border-radius:0;box-shadow:none;border:0;`;
  const DROP='filter:drop-shadow(0 5px 3px rgba(0,0,0,.38));';
  const pieceArt=(make,sels={L:'.stone.sL',R:'.stone.sR',N:'.stone.sN'},extra='')=>Object.fromEntries(Object.entries(sels).map(([k,sel])=>[sel+','+sel.replace('.stone','.ghost'),art(make(COL[k],k))+DROP+extra]));

  const felt='radial-gradient(120% 90% at 50% 30%,#2f7d4f,#1c4f31)';
  const wood='repeating-linear-gradient(90deg,#b98a55 0 22px,#ad7f4b 22px 23px,#c29462 23px 46px)';
  const sand='radial-gradient(circle at 20% 30%,#e9d29a 0 2px,transparent 3px) 0 0/24px 24px,linear-gradient(#ead7a3,#d9bb79)';
  const water='radial-gradient(ellipse at 30% 30%,rgba(255,255,255,.25),transparent 40%),linear-gradient(#3b8fbf,#2a6f99)';

  function css(){
    const L=COL.L,Rr=COL.R,N=COL.N;
    return `
/* everything in themed mode: a lit table, a slight tilt, pieces with shadows */
.themed .board{perspective:950px}
.themed .board > *{rotate:x 14deg;transform-origin:50% 70%}
.themed .demo-box{perspective:700px;box-shadow:inset 0 2px 10px rgba(0,0,0,.25)}
.themed .demo-box > *{rotate:x 12deg}
.themed .stone.sL,.themed .ghost.sL{${art(A.marble(L))}${DROP}}
.themed .stone.sR,.themed .ghost.sR{${art(A.marble(Rr))}${DROP}}
.themed .stone.sN,.themed .ghost.sN{${art(A.marble(N))}${DROP}}
.themed .ghost{outline:none!important;opacity:.45}
.themed button.stone{filter:drop-shadow(0 5px 3px rgba(0,0,0,.38)) drop-shadow(0 0 2.5px #fff)}
.themed button.stone:hover,.themed button.stone:focus-visible{filter:drop-shadow(0 9px 5px rgba(0,0,0,.4)) drop-shadow(0 0 4px #fff) brightness(1.08)}
.themed .stone.sel{filter:drop-shadow(0 0 4px ${N}) drop-shadow(0 0 7px ${N})!important}
.themed .ctr{filter:drop-shadow(0 4px 2px rgba(0,0,0,.35))}
.themed .ctr:disabled{opacity:.7}
.themed .ctr.ok:hover{filter:drop-shadow(0 7px 4px rgba(0,0,0,.4)) brightness(1.1)}
.themed .heap-n{background:rgba(255,255,255,.85);border-radius:999px;padding:1px 9px;color:#333}
.themed .tgt::before{box-shadow:0 0 10px 2px rgba(255,255,255,.7)}
@keyframes shimmer{to{background-position:60px 0,0 0}}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.55}}
.themed .skin-img.tw{animation:twinkle 2.4s ease-in-out infinite}

${T('nim',{'':`background:radial-gradient(circle at 50% 30%,#3d5778,#1f2f45)`,'.ctr':art(A.marble('#e7dfcf'))})}
${T('greedy',{'':`background:${wood}`,'.ctr':art(A.coin())})}
${T('subtraction',{'':`background:${felt}`,'.ctr':art(A.chip('#c0392b'))+'height:20px;width:32px;border-radius:50%'})}
${T('psub',{'':`background:${felt}`,'.ctr':art(A.chip('#7b5ea7'))+'height:20px;width:32px;border-radius:50%'})}
${T('grundy',{'':`background:${sand}`,'.ctr':art(A.marble('#8f949b'))+'width:32px;height:24px'})}
${T('erosion',{'':`background:${water}`,'.ecard':`background:${sand};border:0;box-shadow:0 6px 14px rgba(0,0,0,.3)`,'.ed.eL':art(A.marble(L))+'width:16px;height:16px','.ed.eR':art(A.marble(Rr))+'width:16px;height:16px','.elab':'color:#5b4322;font-weight:700'})}
${T('kayles',{'':`background:repeating-linear-gradient(90deg,#d9a967 0 14px,#cf9c5a 14px 15px,#e0b274 15px 29px)`,'.pin':art(A.pin(),'100% 100%')+'filter:drop-shadow(3px 6px 3px rgba(0,0,0,.35));width:22px;height:64px','.pin.sel':'filter:drop-shadow(0 0 6px #fff) drop-shadow(3px 6px 3px rgba(0,0,0,.35))','.pin.pair':'outline:none;filter:drop-shadow(0 0 5px #ffe27a) drop-shadow(3px 6px 3px rgba(0,0,0,.35))','.pin.down':'background:rgba(0,0,0,.12);border:0;height:10px;border-radius:50%'})}
${['endnim','pendnim','forklift'].map(id=>T(id,{'':`background:linear-gradient(#b8bcc3,#9ea3ab)`,'.boxes .ctr':art(A.crate(),'100% 100%')+'width:38px;height:30px','.heap-n':'background:repeating-linear-gradient(90deg,#b07a3c 0 10px,#8f5f2c 10px 12px);color:#fff;border-radius:3px;font-weight:700'})).join('\n')}
${['pendnim','forklift'].map(id=>T(id,{'.heaps::before,.heaps::after':`content:"";width:58px;height:58px;align-self:flex-end;filter:drop-shadow(0 4px 3px rgba(0,0,0,.35));background:center/contain no-repeat`,'.heaps::before':`background-image:${url(A.forklift(L,false))}`,'.heaps::after':`background-image:${url(A.forklift(Rr,true))}`})).join('\n')}
${T('chomp',{'':`background:linear-gradient(135deg,#e9ecef,#b9bec6 40%,#eef0f2 60%,#aeb4bc)`,'.chomp':'gap:2px','.bite':art(A.choc())+DROP,'.bite.poison':`background:${url(A.skull())} center/70% no-repeat,${url(A.choc('#2f4a1c','#4f6b2a'))} center/contain no-repeat;border-radius:0;${DROP}`,'.bite.poison::after':'display:none','.bite.gone':'outline:none;background:rgba(0,0,0,.06)'})}
${T('cherries',{'':`background:repeating-linear-gradient(0deg,rgba(208,49,45,.18) 0 18px,transparent 18px 36px),repeating-linear-gradient(90deg,rgba(208,49,45,.18) 0 18px,transparent 18px 36px),#fbf6ee`,'.cherry.sL':art(A.cherry(L))+DROP,'.cherry.sR':art(A.cherry(Rr))+DROP,'.cherry.sN':art(A.cherry(N))+DROP,'.cherry.ok':'filter:drop-shadow(0 0 4px #fff) drop-shadow(0 5px 3px rgba(0,0,0,.38))','.cherry':'width:46px;height:46px'})}
${T('toppling',{'':`background:${wood}`,'.dom':'border:0!important;filter:drop-shadow(4px 6px 3px rgba(0,0,0,.4))','.dom.ok':'filter:drop-shadow(0 0 3px #fff) drop-shadow(4px 6px 3px rgba(0,0,0,.4))','.dom.dL':art(A.domino(L,3,4),'100% 100%'),'.dom.dR':art(A.domino(Rr,5,2),'100% 100%'),'.dom.dN':art(A.domino(N,6,1),'100% 100%')})}
${T('hackenbush',{'':`background:linear-gradient(#bfe0f7,#e8f4fb 70%)`,'.ground':'stroke:#6b4423;stroke-width:12','.edge .stem':'stroke-width:10;filter:drop-shadow(2px 3px 1.5px rgba(0,0,0,.3))','.node':'fill:#f2c94c;stroke:#8a6d1a;stroke-width:1.5'})}
${['domineering','cram'].map(id=>T(id,{'':`background:${felt}`,'.tile':'background:#2a6a43;border:1px solid #1d4d30;box-shadow:inset 0 3px 6px rgba(0,0,0,.45)','.tile.block':'background:transparent;box-shadow:none;border:1px dashed rgba(255,255,255,.25)',
  '.tile.piece':'box-shadow:inset 0 2px 0 rgba(255,255,255,.3),0 6px 6px rgba(0,0,0,.4);border:0;background-image:radial-gradient(circle,#fff 0 4px,transparent 5px);background-size:50% 50%;background-position:25% 25%',
  '.tile.piece.oL':`background-color:${L}`,'.tile.piece.oR':`background-color:${Rr}`,'.tile.piece.oN':`background-color:#efe7d6;background-image:radial-gradient(circle,#333 0 4px,transparent 5px)`,
  '.tile.gL':`background:${shade(L,.5)};border-color:#fff`,'.tile.gR':`background:#777;border-color:#fff`,'.tile.cand':'background:#9fd8b6','.tile.sel':`background:${N}`})).join('\n')}
${T('clobber',{'.board-grid':'border:6px solid #4b4f57;border-radius:10px','.sqr':'background:#8e939b','.sqr.dk':'background:#7a7f87'})}
${T('konane',{'.board-grid':'border:8px solid #6b3f1f;border-radius:10px','.sqr':'background:radial-gradient(circle,#7a4825 0 22%,#b5733f 24%)','.sqr.dk':'background:radial-gradient(circle,#6e4020 0 22%,#a86a39 24%)'})}
${T('amazons',{'.board-grid':'border:8px solid #4a3a2a;border-radius:8px','.sqr:not(.burn)':'background:linear-gradient(135deg,#f5f1e8,#e2dccf)','.sqr.dk:not(.burn)':'background:linear-gradient(135deg,#8b98a8,#6f7c8d)',
  '.queen':'font-size:0!important;color:transparent!important;width:92%;height:92%;filter:drop-shadow(0 6px 3px rgba(0,0,0,.45))','.queen.sL':art(A.queen(L)),'.queen.sR':art(A.queen(Rr)),'button.queen':'box-shadow:none','button.queen:hover':'filter:drop-shadow(0 0 5px #fff) drop-shadow(0 6px 3px rgba(0,0,0,.45))','.queen.sel':`filter:drop-shadow(0 0 6px ${N}) drop-shadow(0 6px 3px rgba(0,0,0,.45))`})}
${T('snort',{'':`background:linear-gradient(#9bd17a,#6fae55)`,'.gedge':'stroke:#8a5a2b;stroke-width:6;stroke-dasharray:14 6','.gv':'fill:#e8d9a8;stroke:#8a5a2b;stroke-width:3','.gv.cL,.gv.cR':'fill:rgba(0,0,0,.15);stroke:none'})}
${T('col',{'':`background:#fbf8f1`,'.gedge':'stroke:#d5cfc2;stroke-width:7;stroke-linecap:round','.gv':'fill:#fff;stroke:#bdb6a6;stroke-width:3','.gv.cL,.gv.cR':'fill:transparent;stroke:none'})}
${T('hex',{'':`background:linear-gradient(#fff4d6,#f6e2a8)`,'.hexcell':'fill:#f5c451;stroke:#c98d1e;stroke-width:2.5','.hexcell.hL':'fill:url(#skin-hexL)','.hexcell.hR':'fill:url(#skin-hexR)','.hexcell.ok.t0:hover':`fill:${shade(L,.55)}`,'.hexcell.ok.t1:hover':'fill:#9a9ca2'})}
${T('dots',{'':`background:linear-gradient(90deg,transparent 30px,#f2a5a5 30px 32px,transparent 32px),repeating-linear-gradient(#fdfcf7 0 23px,#c9dcf2 23px 24px)`,'.dot':'fill:#3a3a3a','.dv':'stroke:#c7cbd2','.dl.on.p0 .dv':`stroke:${L};stroke-width:5`,'.dl.on.p1 .dv':'stroke:#2b2b2b;stroke-width:5','.bxt':'font-weight:800','.bx0':`fill:${shade(L,.75)}`,'.bx1':'fill:#d9d9d9'})}
${T('push',{'.strip':'background:repeating-linear-gradient(45deg,#f2c230 0 10px,#2b2b2b 10px 20px);padding:8px','.sq':'background:#a4a9b0;box-shadow:inset 0 2px 4px rgba(0,0,0,.3)',...pieceArt(c=>A.block(c)),'.sq .stone':'width:90%;height:90%'})}
${T('shove',{'.strip':`background:linear-gradient(#f3fbff,#d4ebf8);border-color:#a9cfe6`,'.sq':'background:radial-gradient(circle,#d0312d 0 12%,#fff 13% 26%,#3C7FBC 27% 40%,transparent 41%),rgba(255,255,255,.4)',...pieceArt(c=>A.curling(c)),'.sq .stone':'width:90%;height:90%'})}
${T('runover',{'.strip':'background:linear-gradient(#f4d35e,#f4d35e) 0 50%/100% 3px no-repeat,#3b3d42;border-color:#222','.sq':'background:transparent',...pieceArt((c,k)=>A.car(c,k==='L')),'.sq .stone':'width:96%;height:96%'})}
${T('dragover',{'.strip':'background:linear-gradient(#a97c50,#8a6340);border-color:#6b4a2b','.sq':'background:rgba(255,255,255,.08)',...pieceArt(c=>A.wagon(c)),'.sq .stone':'width:96%;height:96%'})}
${['clearpond','clobberpond'].map(id=>T(id,{'.strip':`background:${water};border-color:#22597a`,'.sq':`background:${url(A.lily())} center/88% no-repeat`,...pieceArt((c,k)=>A.frog(c,k==='R')),'.sq .stone':'width:92%;height:92%'})).join('\n')}
${T('elephants',{'.strip':`background:${sand};border-color:#b8955a`,'.sq':'background:rgba(255,255,255,.18)','.stone.sL,.ghost.sL':art(A.elephant(L))+DROP,'.stone.sR,.ghost.sR':art(A.rhino(Rr))+DROP,'.sq .stone':'width:100%;height:100%'})}
${T('boxcars',{'.strip':'background:repeating-linear-gradient(90deg,#6b4a2b 0 6px,transparent 6px 16px) 0 50%/100% 70% no-repeat,linear-gradient(#a6a6a6,#a6a6a6) 0 34%/100% 4px no-repeat,linear-gradient(#a6a6a6,#a6a6a6) 0 66%/100% 4px no-repeat,#b9a98f;gap:0','.sq':'background:transparent',...pieceArt(c=>A.boxcar(c)),'.sq .stone':'width:104%;height:100%'})}
${T('sliding',{'.strip':`background:${wood};border-color:#7d5420`,'.sq':'background:rgba(0,0,0,.12);box-shadow:inset 0 2px 4px rgba(0,0,0,.35)','.num':'color:#fff;opacity:.8','.stone.sN':art(A.coin())+DROP,'.sq .stone':'width:86%;height:86%'})}
${T('cutthroat',{'':`background:radial-gradient(circle at 30% 20%,#2c3e6b,#0d1430)`,'.star':'background:radial-gradient(circle,#1c2a52,#0f1736);border-color:#33467a','.sedge':'stroke:#9fb3e6;stroke-width:1.5;stroke-dasharray:3 4','.sv':'fill:transparent;stroke:none','.sv.ok':'stroke:none'})}
${T('to15',{'':`background:${felt}`,'.card15':`background:${url(A.diamond())} 7px 7px/12px no-repeat,${url(A.diamond())} right 7px bottom 7px/12px no-repeat,linear-gradient(#fff,#f1ede4);color:#b8312f;font-family:Georgia,serif;border:0;box-shadow:0 6px 10px rgba(0,0,0,.35)`,'.card15.taken':'opacity:.15','.hand':'background:rgba(255,255,255,.92)'})}
`;
  }

  /* ---------- art the stylesheet cannot add ---------- */
  const cache={};
  const data=(key,make)=>cache[key]||(cache[key]='data:image/svg+xml,'+encodeURIComponent(make()));
  function overlay(c,href,scale,cls){
    const r=+c.getAttribute('r'),cx=+c.getAttribute('cx'),cy=+c.getAttribute('cy'),s=r*scale;
    const im=document.createElementNS(NS,'image');
    im.setAttribute('href',href);im.setAttribute('x',cx-s);im.setAttribute('y',cy-s);im.setAttribute('width',2*s);im.setAttribute('height',2*s);
    im.setAttribute('pointer-events','none');im.setAttribute('class','skin-img'+(cls?' '+cls:''));
    c.after(im);
  }
  function decorate(gid,root){
    if(!root||!document.body.classList.contains('themed')) return;
    if(gid==='snort'||gid==='col'){
      root.querySelectorAll('circle.gv.cL,circle.gv.cR').forEach(c=>{const k=c.classList.contains('cL')?'L':'R';
        overlay(c,data(gid+k,()=>(gid==='snort'?A.cow:A.splat)(COL[k])),1.55)});
    }
    if(gid==='cutthroat'){
      root.querySelectorAll('circle.sv').forEach((c,i)=>{const k=c.classList.contains('sL')?'L':'R';
        overlay(c,data('star'+k,()=>k==='L'?A.star('#7fb4ea','#cfe4ff'):A.star(COL.R,'#e6e9f2')),1.9,i%3===0?'tw':'')});
    }
    if(gid==='hex'){
      [...(root.tagName==='svg'?[root]:[]),...root.querySelectorAll('svg')].forEach(s=>{
        if(s.querySelector('#skin-hexL')) return;
        const d=document.createElementNS(NS,'defs');
        d.innerHTML=rad('skin-hexL',COL.L,'40%','35%')+rad('skin-hexR',COL.R,'40%','35%');
        s.prepend(d);
      });
    }
  }

  let style=null;
  const pref={on:true};
  try{const v=localStorage.getItem('playtheory.themed');if(v!==null)pref.on=v==='1'}catch(e){}
  function install(){
    if(!style){style=document.createElement('style');style.id='skins';style.textContent=css();document.head.append(style)}
    document.body.classList.toggle('themed',pref.on);
    if(!pref.on) document.querySelectorAll('.skin-img').forEach(e=>e.remove());
  }
  function set(on){pref.on=on;try{localStorage.setItem('playtheory.themed',on?'1':'0')}catch(e){}install()}
  return {install,decorate,set,get on(){return pref.on},css,A};
})();
