"use strict";
/* The games. Each one has:
   create()          a random starting position (without .turn)
   moves(s)          every position the player to move can reach (used by the demo player)
   hasMove(s,p)      can player p move?  (no move on your turn = you lose, unless result() says otherwise)
   result(s)         optional: {winner, reason} for scoring, connection or draw games
   render(s,ctx)     the interactive board
   sfx, motif        default move sound, and the shape that floats on the intro screen */

/* ---------------- heaps ---------------- */
const heapMoves=(s,ok)=>s.heaps.flatMap((c,h)=>Array.from({length:c},(_,i)=>i).filter(i=>ok(h,i)).map(i=>nx(s,n=>n.heaps[h]=i)));
const takeTo=(s,ctx)=>(h,i,anim)=>ctx.play(nx(s,n=>n.heaps[h]=i),anim);

def({id:'nim',name:'Nim',kind:'Impartial',sfx:'pluck',motif:'disc',
  blurb:'Heaps of counters and one simple rule. Easy to learn, surprisingly deep.',solved:'yes',
  rules:['There are several heaps of counters.','On your turn, pick one heap and take away as many counters from it as you like (at least one).','Whoever takes the last counter wins.'],
  how:'Click a counter. It and every counter above it in that heap are removed.',
  create:()=>({heaps:Array.from({length:R(3,4)},()=>R(1,7))}),
  moves:s=>heapMoves(s,()=>true),
  hasMove:s=>s.heaps.some(h=>h>0),
  render:(s,ctx)=>heapsView(s.heaps,ctx,{go:takeTo(s,ctx)})});

def({id:'greedy',name:'Greedy Nim',kind:'Impartial',sfx:'pluck',motif:'disc',
  blurb:'Nim’s impatient cousin: you must always take from the biggest heap.',solved:'yes',
  rules:['There are several heaps of counters.','On your turn, take any number of counters from a largest heap. If several heaps tie for largest, pick any of them.','Whoever takes the last counter wins.'],
  how:'Click a counter in a largest heap. It and every counter above it are removed.',
  create:()=>({heaps:Array.from({length:R(3,4)},()=>R(1,6))}),
  moves:s=>{const mx=Math.max(...s.heaps);return heapMoves(s,h=>s.heaps[h]===mx)},
  hasMove:s=>s.heaps.some(h=>h>0),
  render:(s,ctx)=>{const mx=Math.max(...s.heaps);return heapsView(s.heaps,ctx,{can:h=>s.heaps[h]===mx,go:takeTo(s,ctx)})}});

def({id:'subtraction',name:'Subtraction Game',kind:'Impartial',sfx:'pluck',motif:'disc',
  blurb:'Take counters from a heap, but only in the amounts on the menu.',solved:'yes',
  rules:s=>[`There ${s.heaps.length===1?'is one heap':'are '+s.heaps.length+' heaps'} of counters.`,`On your turn, remove exactly ${orList(s.set)} counters from one heap.`,'Whoever makes the last move wins.'],
  how:'Click a counter. Only counters that remove an allowed amount can be clicked.',
  create:()=>({set:pick([[1,2,3],[1,3,4],[2,3,5],[1,4],[1,2,4],[2,5,6],[1,3,6]]),heaps:Array.from({length:R(2,3)},()=>R(5,14))}),
  moves:s=>heapMoves(s,(h,i)=>s.set.includes(s.heaps[h]-i)),
  hasMove:s=>s.heaps.some(h=>s.set.some(k=>k<=h)),
  render:(s,ctx)=>heapsView(s.heaps,ctx,{can:(h,i)=>s.set.includes(s.heaps[h]-i),go:takeTo(s,ctx)})});

def({id:'psub',name:'Partizan Subtraction',kind:'Partizan',sfx:'pluck',motif:'disc',
  blurb:'A race down the heaps where each of you has your own menu of moves.',solved:'yes',
  rules:s=>[`There ${s.heaps.length===1?'is one heap':'are '+s.heaps.length+' heaps'} of counters.`,`Left removes exactly ${orList(s.Ls)} counters from one heap.`,`Right removes exactly ${orList(s.Rs)} counters from one heap.`,'Whoever makes the last move wins.'],
  how:'Click a counter. Only counters that remove one of your allowed amounts can be clicked.',
  create:()=>{const [Ls,Rs]=pick([[[1,2],[2,3]],[[1],[2]],[[1,3],[2]],[[2,3],[1,4]],[[1,2,4],[2,5]],[[1,4],[2,3]]]);return{Ls,Rs,heaps:Array.from({length:R(1,2)},()=>R(8,18))}},
  moves:s=>{const set=s.turn?s.Rs:s.Ls;return heapMoves(s,(h,i)=>set.includes(s.heaps[h]-i))},
  hasMove:(s,p)=>s.heaps.some(h=>(p?s.Rs:s.Ls).some(k=>k<=h)),
  render:(s,ctx)=>{const set=s.turn?s.Rs:s.Ls;return heapsView(s.heaps,ctx,{can:(h,i)=>set.includes(s.heaps[h]-i),go:takeTo(s,ctx)})}});

const gsplit=(s,h,i)=>nx(s,n=>{const c=s.heaps[h];n.heaps.splice(h,1,i,c-i)});
def({id:'grundy',name:"Grundy's Game",kind:'Impartial',sfx:'split',motif:'disc',
  blurb:'Keep splitting the heaps until nobody can. A quick, quiet puzzle.',solved:'no',
  rules:['There are heaps of counters.','On your turn, split one heap into two heaps of different sizes.','Heaps of 1 or 2 can never be split.','Whoever makes the last split wins.'],
  how:'Click a counter. The heap splits just below it: the counters from there up become a new heap.',
  create:()=>({heaps:Array.from({length:R(1,2)},()=>R(6,12))}),
  moves:s=>s.heaps.flatMap((c,h)=>Array.from({length:c},(_,i)=>i).filter(i=>i>=1&&2*i!==c).map(i=>gsplit(s,h,i))),
  hasMove:s=>s.heaps.some(h=>h>=3),
  render:(s,ctx)=>heapsView(s.heaps,ctx,{hot:'lift',can:(h,i)=>i>=1&&2*i!==s.heaps[h],go:(h,i,anim)=>ctx.play(gsplit(s,h,i),anim)})});

const knockPins=(s,ix)=>nx(s,n=>ix.forEach(j=>n.pins[j]=false));
def({id:'kayles',name:'Kayles',kind:'Impartial',sfx:'knock',motif:'pin',
  blurb:'A bowling game from 1908. Knock down pins until your opponent has nothing left to aim at.',solved:'yes',
  rules:['There is a row of pins, possibly with gaps.','On your turn, knock down one pin, or two pins that stand next to each other.','Whoever knocks down the last pin wins.'],
  how:'Click a pin to aim at it.',
  create:()=>{const pins=Array(R(7,12)).fill(true);for(let k=R(0,2);k>0;k--)pins[R(1,pins.length-2)]=false;return{pins}},
  moves:s=>s.pins.flatMap((u,i)=>u?[knockPins(s,[i]),...(s.pins[i+1]?[knockPins(s,[i,i+1])]:[])]:[]),
  hasMove:s=>s.pins.some(Boolean),
  render(s,ctx){
    const sel=ctx.ui.sel,row=el('div',{class:'pins'}),els=[];
    const knock=ix=>ctx.play(knockPins(s,ix),()=>FX.vanish(ix.map(j=>els[j]),'knock',300));
    s.pins.forEach((up,i)=>{
      if(!up){row.append(el('div',{class:'pin down'}));return}
      const pair=sel!=null&&Math.abs(i-sel)===1;
      const b=el('button',{class:'pin'+(sel===i?' sel':'')+(pair?' pair':''),type:'button',disabled:!ctx.live,'aria-label':`Pin ${i+1}`});
      els[i]=b;
      b.addEventListener('click',()=>{
        if(sel==null){Sound.fx('pick');ctx.ui.sel=i;ctx.redraw()}
        else if(i===sel) knock([i]);
        else if(pair) knock([i,sel]);
        else {ctx.ui.sel=i;ctx.redraw()}
      });
      row.append(b);
    });
    ctx.say(sel!=null?'Click the same pin again to knock it down alone, or a standing neighbour to knock down both.':null);
    return row;
  }});

/* ---------------- stacks in a row ---------------- */
const endTake=(s,h,i)=>nx(s,n=>{n.stacks[h]=i;if(i===0)n.stacks.splice(h,1)});
const endCan=(s,h,partizan)=>{const last=s.stacks.length-1;return partizan?(s.turn===0?h===0:h===last):(h===0||h===last)};
const endMoves=partizan=>s=>{const hs=[...new Set([0,s.stacks.length-1])].filter(h=>h>=0&&endCan(s,h,partizan));return hs.flatMap(h=>Array.from({length:s.stacks[h]},(_,i)=>endTake(s,h,i)))};
function endView(s,ctx,partizan){
  const last=s.stacks.length-1;
  return heapsView(s.stacks,ctx,{box:true,unit:'Stack',
    can:h=>endCan(s,h,partizan),
    go:(h,i,anim)=>ctx.play(endTake(s,h,i),anim),
    caption:(h,c)=>{
      if(!partizan) return el('div',{class:'heap-n'},String(c));
      const tag=h===0&&h===last?' · both ends':h===0?` · ${name(0)}’s end`:h===last?` · ${name(1)}’s end`:'';
      return el('div',{class:'heap-n'+(h===0&&h!==last?' endL':h===last&&h!==0?' endR':'')},c+tag);
    }});
}
def({id:'endnim',name:'End-Nim',kind:'Impartial',sfx:'wood',motif:'box',
  blurb:'Only the stacks at the two ends of the row are in play.',solved:'yes',
  rules:['There is a row of stacks of boxes.','On your turn, take any number of boxes from the stack at either end of the row.','When an end stack is emptied, the next stack becomes the end.','Whoever takes the last box wins.'],
  how:'Click a box in an end stack. It and every box above it are taken.',
  create:()=>({stacks:Array.from({length:R(3,6)},()=>R(1,6))}),
  moves:endMoves(false),hasMove:s=>s.stacks.length>0,
  render:(s,ctx)=>endView(s,ctx,false)});

def({id:'pendnim',name:'Partizan End-Nim',kind:'Partizan',sfx:'wood',motif:'box',
  blurb:'Two fork-lift drivers working from opposite ends of the same warehouse row.',solved:'yes',
  rules:['There is a row of stacks of boxes.','Left may only take from the leftmost stack. Right may only take from the rightmost stack.','Take as many boxes as you like from your end stack. When it is empty, the next stack becomes your end.','Whoever takes the last box wins.'],
  how:'Click a box in your end stack. It and every box above it are taken.',
  create:()=>({stacks:Array.from({length:R(3,6)},()=>R(1,6))}),
  moves:endMoves(true),hasMove:s=>s.stacks.length>0,
  render:(s,ctx)=>endView(s,ctx,true)});

const liftTo=(s,h,i)=>nx(s,n=>{const last=s.stacks.length-1,k=s.stacks[h]-i,nb=s.turn===0?1:last-1;n.stacks[nb]+=k;n.stacks[h]=i;if(i===0)n.stacks.splice(h,1)});
const liftCan=(s,h,i)=>{const st=s.stacks,last=st.length-1;return st.length>=2&&(s.turn===0?h===0&&i<st[1]:h===last&&i<st[last-1])};
def({id:'forklift',name:'Forklift',kind:'Partizan',sfx:'wood',motif:'box',
  blurb:'Lift boxes off your end of the row and stack them on the next pile.',
  rules:['There is a row of stacks of boxes.','Left lifts boxes from the leftmost stack, Right from the rightmost stack.','The lifted boxes go on top of the neighbouring stack. What stays behind must be lower than that neighbouring stack.','When only one stack is left, the game is over. Whoever moved last wins.'],
  how:'Click a box in your end stack. It and every box above it are lifted onto the neighbouring stack.',
  create:()=>({stacks:Array.from({length:R(3,5)},()=>R(1,5))}),
  moves:s=>{const h=s.turn===0?0:s.stacks.length-1;return s.stacks.length<2?[]:Array.from({length:s.stacks[h]},(_,i)=>i).filter(i=>liftCan(s,h,i)).map(i=>liftTo(s,h,i))},
  hasMove:s=>s.stacks.length>=2,
  render(s,ctx){
    const last=s.stacks.length-1;
    return heapsView(s.stacks,ctx,{box:true,unit:'Stack',hot:'lift',can:(h,i)=>liftCan(s,h,i),
      go:(h,i,anim)=>ctx.play(liftTo(s,h,i),anim),
      caption:(h,c)=>el('div',{class:'heap-n'+(h===0?' endL':h===last?' endR':'')},String(c))});
  }});

const erode=(s,k)=>nx(s,n=>{const hp=s.heaps[k];if(s.turn===0)n.heaps[k].l-=hp.r;else n.heaps[k].r-=hp.l});
const erodeOk=(hp,p)=>p===0?hp.l>hp.r:hp.r>hp.l;
def({id:'erosion',name:'Erosion',kind:'Partizan',sfx:'pluck',motif:'disc',
  blurb:'Each heap is a tug of war between blue and black counters.',solved:'yes',
  rules:['Each heap holds some blue and some black counters.','Left may pick a heap with more blue than black and remove as many blue counters as there are black ones.','Right may pick a heap with more black than blue and remove as many black counters as there are blue ones.','Whoever makes the last move wins.'],
  how:'Press the button on the heap you want to erode.',
  create:()=>({heaps:Array.from({length:R(2,3)},()=>{let l=R(1,12),r=R(1,12);if(l===r)l++;return{l,r}})}),
  moves:s=>s.heaps.flatMap((hp,k)=>erodeOk(hp,s.turn)?[erode(s,k)]:[]),
  hasMove:(s,p)=>s.heaps.some(h=>erodeOk(h,p)),
  render(s,ctx){
    const p=s.turn,wrap=el('div',{class:'erosion'});
    s.heaps.forEach((hp,k)=>{
      const ok=ctx.live&&erodeOk(hp,p);
      const L=Array.from({length:hp.l},()=>el('i',{class:'ed eL'})),Rr=Array.from({length:hp.r},()=>el('i',{class:'ed eR'}));
      const btn=el('button',{class:'btn small',type:'button',disabled:!ok},ok?`Remove ${p?hp.l:hp.r} ${p?'black':'blue'}`:(p?'Needs more black':'Needs more blue'));
      btn.addEventListener('click',()=>{const gone=p===0?L.slice(hp.l-hp.r):Rr.slice(hp.r-hp.l);ctx.play(erode(s,k),()=>FX.vanish(gone,'fly'))});
      wrap.append(el('div',{class:'ecard'},
        el('div',{class:'erow'},el('span',{class:'elab'},`${hp.l} blue`),el('div',{class:'edots'},L)),
        el('div',{class:'erow'},el('span',{class:'elab'},`${hp.r} black`),el('div',{class:'edots'},Rr)),btn));
    });
    return wrap;
  }});

const bite=(s,x,y)=>nx(s,n=>{n.cols=s.cols.map((h,xx)=>xx>=x?Math.min(h,y):h)});
def({id:'chomp',name:'Chomp',kind:'Impartial',sfx:'crunch',motif:'box',
  blurb:'A chocolate bar with one poisoned square. Eat carefully and leave the poison for your opponent.',solved:'no',
  rules:['The bar is a rectangle of squares. The bottom-left square is poisoned.','On your turn, pick a square and eat it together with every square above it and to its right.','Nobody may eat the poison.'],
  win:'If only the poisoned square is left on your turn, you lose.',
  how:'Click a square. Everything above it and to its right is eaten too.',
  create:()=>{const W=R(4,7),H=R(3,5);return{W,H,cols:Array(W).fill(H)}},
  moves:s=>{const out=[];s.cols.forEach((h,x)=>{for(let y=0;y<h;y++)if(x||y)out.push(bite(s,x,y))});return out},
  hasMove:s=>sum(s.cols)>1,
  render(s,ctx){
    const g=el('div',{class:'chomp',style:`--w:${s.W}`}),cells=[];
    for(let y=s.H-1;y>=0;y--)for(let x=0;x<s.W;x++){
      const present=y<s.cols[x];let c;
      if(!present) c=el('div',{class:'bite gone'});
      else if(x===0&&y===0) c=el('div',{class:'bite poison',title:'Poisoned square'});
      else{
        c=el('button',{class:'bite ok',type:'button',disabled:!ctx.live,'aria-label':`Square column ${x+1}, row ${y+1}`});
        c.addEventListener('click',()=>{
          const eaten=cells.filter(o=>o.present&&o.x>=x&&o.y>=y).map(o=>o.c);
          ctx.play(bite(s,x,y),async()=>{FX.burstAt(c,['#8a5a2b','#c8913a','#5d3a1a'],26,{speed:150});await FX.vanish(eaten,'crumble',260)});
        });
      }
      cells.push({c,x,y,present});g.append(c);
    }
    cells.forEach(({c,x,y})=>{if(c.tagName==='BUTTON'&&!c.disabled)hov(c,()=>cells.forEach(o=>{if(o.present&&o.x>=x&&o.y>=y)o.c.classList.add('doom')}),()=>cells.forEach(o=>o.c.classList.remove('doom')))});
    return g;
  }});

const cherryOk=(c,p)=>c===PC[p]||c==='N';
def({id:'cherries',name:'Cherries',kind:'Partizan',sfx:'pop',motif:'disc',
  blurb:'Pick cherries from the ends of the row, but only your colour or green.',
  rules:['There is a row of blue, black and green cherries.','Left removes a blue or green cherry from either end of the row.','Right removes a black or green cherry from either end of the row.','Whoever makes the last move wins.'],
  how:'Click a cherry at either end of the row.',
  create:()=>({row:Array.from({length:R(6,10)},()=>pick(['L','L','R','R','N']))}),
  moves:s=>[...new Set([0,s.row.length-1])].filter(i=>i>=0&&cherryOk(s.row[i],s.turn)).map(i=>nx(s,n=>n.row.splice(i,1))),
  hasMove:(s,p)=>s.row.length>0&&[s.row[0],s.row[s.row.length-1]].some(c=>cherryOk(c,p)),
  render(s,ctx){
    const p=s.turn,last=s.row.length-1,row=el('div',{class:'cherries'});
    s.row.forEach((c,i)=>{
      const ok=ctx.live&&(i===0||i===last)&&cherryOk(c,p);
      if(!ok){row.append(el('span',{class:'cherry s'+c}));return}
      const b=el('button',{class:'cherry ok s'+c,type:'button','aria-label':`Take the ${CNAME[c]} cherry at the ${i===0?'left':'right'} end`});
      b.addEventListener('click',()=>ctx.play(nx(s,n=>n.row.splice(i,1)),()=>FX.vanish([b],'fly')));
      row.append(b);
    });
    return row;
  }});

/* ---------------- toppling dominoes & hackenbush ---------------- */
const topple=(s,i,dir)=>nx(s,n=>{n.row=dir<0?s.row.slice(i+1):s.row.slice(0,i)});
def({id:'toppling',name:'Toppling Dominoes',kind:'Partizan',sfx:'topple',motif:'tile',
  blurb:'Knock over a domino and everything on that side goes down with it.',
  rules:['There is a row of blue, black and green dominoes.','Left picks a blue or green domino and topples it left or right. Right does the same with a black or green domino.','A toppled domino knocks over every domino on that side of it, and they all leave the game.','Whoever makes the last move wins.'],
  how:'Hover a domino you can topple. Click its left half to topple it left, its right half to topple it right.',
  create:()=>({row:Array.from({length:R(5,9)},()=>pick(['L','L','R','R','N']))}),
  moves:s=>s.row.flatMap((c,i)=>cherryOk(c,s.turn)?[topple(s,i,-1),topple(s,i,1)]:[]),
  hasMove:(s,p)=>s.row.some(c=>cherryOk(c,p)),
  render(s,ctx){
    const p=s.turn,row=el('div',{class:'dominoes'}),doms=[];
    s.row.forEach((c,i)=>{
      const ok=ctx.live&&cherryOk(c,p);
      const d=el('div',{class:'dom d'+c+(ok?' ok':'')});doms.push(d);
      if(ok)[-1,1].forEach(dir=>{
        const b=el('button',{class:'half',type:'button','aria-label':`Topple ${CNAME[c]} domino ${i+1} to the ${dir<0?'left':'right'}`},dir<0?'←':'→');
        hov(b,()=>doms.forEach((x,j)=>x.classList.toggle(dir<0?'fallL':'fallR',dir<0?j<=i:j>=i)),()=>doms.forEach(x=>x.classList.remove('fallL','fallR')));
        b.addEventListener('click',()=>{
          doms.forEach(x=>x.classList.remove('fallL','fallR'));
          const chain=dir<0?doms.slice(0,i+1).reverse():doms.slice(i);
          ctx.play(topple(s,i,dir),async()=>{
            for(const x of chain){x.classList.add(dir<0?'tl':'tr');Sound.fx('topple',{p});await sleep(75)}
            await sleep(180);
          },{silent:true});
        });
        d.append(b);
      });
      row.append(d);
    });
    return row;
  }});

const cut=(s,t,j)=>nx(s,n=>{n.stalks[t]=s.stalks[t].slice(0,j)});
def({id:'hackenbush',name:'Hackenbush',kind:'Partizan',sfx:'snip',motif:'edge',
  blurb:'Cut your coloured branches and watch everything above them fall.',solved:'partly',
  rules:['Stalks of blue, black and green edges grow from the ground.','Left cuts a blue or green edge. Right cuts a black or green edge.','Anything no longer connected to the ground falls away.','Whoever makes the last cut wins.'],
  how:'Click an edge to cut it. Everything above it falls.',
  create:()=>({stalks:Array.from({length:R(3,5)},()=>Array.from({length:R(1,4)},()=>pick(['L','L','R','R','N'])))}),
  moves:s=>s.stalks.flatMap((st,t)=>st.flatMap((c,j)=>cherryOk(c,s.turn)?[cut(s,t,j)]:[])),
  hasMove:(s,p)=>s.stalks.some(st=>st.some(c=>cherryOk(c,p))),
  render(s,ctx){
    const p=s.turn,E=52,W=78,mh=Math.max(1,...s.stalks.map(x=>x.length));
    const w=W*s.stalks.length+20,h=E*mh+40,gy=h-14;
    const svg=sv('svg',{viewBox:`0 0 ${w} ${h}`,class:'svgb',style:`--mw:${Math.min(640,w*1.7)}px`});
    svg.append(sv('line',{x1:4,y1:gy,x2:w-4,y2:gy,class:'ground'}));
    s.stalks.forEach((st,t)=>{
      const x0=10+W*t+W/2,pt=j=>[x0+(j?(((t*5+j*3)%3)-1)*10:0),gy-j*E],groups=[];
      st.forEach((c,j)=>{
        const [x1,y1]=pt(j),[x2,y2]=pt(j+1),ok=ctx.live&&cherryOk(c,p);
        const g=sv('g',{class:'edge e'+c+(ok?' ok':'')});
        if(ok){
          const hit=sv('line',{x1,y1,x2,y2,class:'hit'});
          act(hit,()=>{
            groups.forEach(x=>x.classList.remove('doom'));
            ctx.play(cut(s,t,j),async()=>{
              Sound.fx('snip',{p});
              const sx=svg.getScreenCTM(),pt0=svg.createSVGPoint();pt0.x=(x1+x2)/2;pt0.y=(y1+y2)/2;
              if(sx){const q=pt0.matrixTransform(sx);FX.burst(q.x,q.y,[FX.color(c),'#ffffff'],16,{speed:140})}
              groups.slice(j).forEach((x,k)=>{x.style.setProperty('--fx',(k%2?-1:1)*(10+k*8)+'px');x.style.setProperty('--fr',(k%2?-1:1)*(25+k*15)+'deg');x.classList.add('fall')});
              await sleep(520);
            },{silent:true});
          },`Cut ${CNAME[c]} edge ${j+1} of stalk ${t+1}`);
          hov(hit,()=>groups.forEach((x,k)=>x.classList.toggle('doom',k>=j)),()=>groups.forEach(x=>x.classList.remove('doom')));
          g.append(hit);
        }
        g.append(sv('line',{x1,y1,x2,y2,class:'stem','pointer-events':'none'}));
        g.append(sv('circle',{cx:x2,cy:y2,r:5.5,class:'node','pointer-events':'none'}));
        groups.push(g);svg.append(g);
      });
      const [bx,by]=pt(0);svg.append(sv('circle',{cx:bx,cy:by,r:5.5,class:'node','pointer-events':'none'}));
    });
    return svg;
  }});

/* ---------------- grid placement & capture ---------------- */
def({id:'domineering',name:'Domineering',kind:'Partizan',sfx:'stamp',motif:'tile',
  blurb:'Place dominoes, one of you upright and the other sideways, until someone runs out of room.',solved:'partly',
  rules:['Players take turns placing dominoes on empty squares.','Left always places dominoes vertically. Right always places them horizontally.','Dominoes may not overlap or cover the dashed squares.','Whoever places the last domino wins.'],
  how:'Hover a square to preview your domino, then click to place it.',
  create:domBoard,moves:s=>domMoves(s,false),
  hasMove:(s,p)=>domHas(s,p,false),
  render:(s,ctx)=>placeView(s,ctx,false)});

def({id:'cram',name:'Cram',kind:'Impartial',sfx:'stamp',motif:'tile',
  blurb:'Dominoes on a board, placed either way round, until there is no room left.',solved:'partly',
  rules:['Players take turns placing dominoes on empty squares.','Either player may place a domino vertically or horizontally.','Dominoes may not overlap or cover the dashed squares.','Whoever places the last domino wins.'],
  how:'Click an empty square, then click a neighbouring empty square to place the domino.',
  create:domBoard,moves:s=>domMoves(s,true),
  hasMove:s=>domHas(s,0,true),
  render:(s,ctx)=>placeView(s,ctx,true)});

const clobberMoves=(b,r,c,p)=>O4.flatMap(([dr,dc])=>{const rr=r+dr,cc=c+dc;return b[rr]?.[cc]===PC[1-p]?[{to:[rr,cc],caps:[[rr,cc]],apply:nb=>{nb[rr][cc]=PC[p];nb[r][c]=null}}]:[]});
def({id:'clobber',name:'Clobber',kind:'Partizan',sfx:'capture',motif:'disc',
  blurb:'Every move is a capture. Smash your way across the board.',solved:'no',
  rules:['The board starts as a checkerboard of blue and black stones.','On your turn, move one of your stones onto an opponent’s stone that is directly next to it (up, down, left or right). The captured stone is removed.','Whoever makes the last capture wins.'],
  how:'Click one of your stones, then click the opponent’s stone you want to capture.',
  create:()=>{const [RN,CN]=pick([[3,4],[4,4],[4,5],[5,5],[5,6]]);return{b:Array.from({length:RN},(_,r)=>Array.from({length:CN},(_,c)=>(r+c)%2?'R':'L'))}},
  moves:jumpMoves(clobberMoves),hasMove:jumpHasMove(clobberMoves),
  render:(s,ctx)=>jumpView(s,ctx,clobberMoves)});

const konaneMoves=(b,r,c,p)=>{
  const out=[],opp=PC[1-p];
  for(const [dr,dc] of O4){
    const jumped=[];
    for(let k=1;;k++){
      const or=r+dr*(2*k-1),oc=c+dc*(2*k-1),lr=r+dr*2*k,lc=c+dc*2*k;
      if(b[or]?.[oc]!==opp||b[lr]?.[lc]!==null) break;
      jumped.push([or,oc]);const js=jumped.slice();
      out.push({to:[lr,lc],caps:js,apply:nb=>{js.forEach(([x,y])=>nb[x][y]=null);nb[lr][lc]=PC[p];nb[r][c]=null}});
    }
  }
  return out;
};
def({id:'konane',name:'Kōnane',kind:'Partizan',sfx:'capture',motif:'disc',
  blurb:'Hawaiian checkers, played for centuries. Jump and capture in straight lines.',solved:'no',
  rules:['The board starts full of alternating blue and black stones, with two holes in the middle.','On your turn, jump one of your stones over an opponent’s stone next to it, into an empty square directly beyond. The jumped stone is removed.','You may keep jumping in the same straight line, but you may not turn.','Whoever makes the last jump wins.'],
  how:'Click one of your stones, then click a highlighted landing square.',
  create:()=>{const n=6,b=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>(r+c)%2?'R':'L'));b[2][2]=null;b[2][3]=null;return{b}},
  moves:jumpMoves(konaneMoves),hasMove:jumpHasMove(konaneMoves),
  render:(s,ctx)=>jumpView(s,ctx,konaneMoves)});

/* ---------------- amazons: move like a queen, then shoot a flaming arrow ---------------- */
const queenReach=(b,r,c)=>{const N=b.length,out=[];for(const [dr,dc] of Q8){let rr=r+dr,cc=c+dc;while(rr>=0&&cc>=0&&rr<N&&cc<N&&b[rr][cc]===null){out.push([rr,cc]);rr+=dr;cc+=dc}}return out};
const amazonsShot=(s,from,to,arrow)=>nx(s,n=>{n.b[from[0]][from[1]]=null;n.b[to[0]][to[1]]=PC[s.turn];n.b[arrow[0]][arrow[1]]='X';n.lastArrow=arrow;n.lastAt=Date.now()});
def({id:'amazons',name:'Amazons',kind:'Partizan',sfx:'step',motif:'disc',
  blurb:'Queens move, then fire flaming arrows that burn the board. The space shrinks with every turn.',solved:'no',
  rules:['Each player has two amazons. They move like chess queens: any distance in a straight or diagonal line.','On your turn, move one of your amazons, then she draws her bow and shoots a flaming arrow from her new square. The arrow also travels like a queen.','The arrow sets its square on fire. Nothing may move onto or through burned squares or other amazons.','Whoever makes the last move wins.'],
  how:'Click one of your amazons, click where she should move, then click where to shoot the arrow.',
  create:()=>{const N=pick([5,6]),b=Array.from({length:N},()=>Array(N).fill(null));
    const a=N===5?[1,3]:[1,4];a.forEach(c=>{b[0][c]='L';b[N-1][c]='R'});
    for(let k=R(0,2);k>0;k--){const r=R(1,N-2),c=R(0,N-1);if(b[r][c]===null){b[r][c]='X';if(b[N-1-r][N-1-c]===null)b[N-1-r][N-1-c]='X'}}
    return{b}},
  moves:s=>{const out=[],b=s.b;
    b.forEach((row,r)=>row.forEach((v,c)=>{if(v!==PC[s.turn])return;
      queenReach(b,r,c).forEach(to=>{const bd=clone(b);bd[r][c]=null;bd[to[0]][to[1]]=v;queenReach(bd,to[0],to[1]).forEach(ar=>out.push(amazonsShot(s,[r,c],to,ar)))})}));
    return out},
  hasMove:(s,p)=>s.b.some((row,r)=>row.some((v,c)=>v===PC[p]&&queenReach(s.b,r,c).length)),
  render(s,ctx){
    const p=s.turn,b=s.b,N=b.length,u=ctx.ui;
    let bd=b,targets=[],phase=0;
    if(u.sel&&!u.dest){phase=1;targets=queenReach(b,u.sel[0],u.sel[1])}
    else if(u.sel&&u.dest){phase=2;bd=clone(b);bd[u.sel[0]][u.sel[1]]=null;bd[u.dest[0]][u.dest[1]]=PC[p];targets=queenReach(bd,u.dest[0],u.dest[1])}
    const isT=(r,c)=>targets.some(t=>t[0]===r&&t[1]===c),same=(a,r,c)=>a&&a[0]===r&&a[1]===c;
    const fresh=s.lastArrow&&Date.now()-(s.lastAt||0)<1800;
    const g=el('div',{class:'grid board-grid',style:`--c:${N}`}),sq=bd.map(()=>[]);
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const v=bd[r][c],cell=el('div',{class:'sqr'+((r+c)%2?' dk':'')+(v==='X'?' burn':'')+(v==='X'&&fresh&&same(s.lastArrow,r,c)?' fresh':'')});
      sq[r][c]=cell;
      if(isT(r,c)){
        const t=el('button',{class:'tgt'+(phase===2?' arrow':''),type:'button','aria-label':`${phase===1?'Move to':'Shoot the arrow at'} row ${r+1}, column ${c+1}`});
        t.addEventListener('click',()=>{
          if(phase===1){
            const q=sq[u.sel[0]][u.sel[1]].querySelector('.queen');
            ctx.busy(async()=>{Sound.fx('step',{p});await FX.slide(q,cell,260);u.dest=[r,c]});
          }else{
            const q=sq[u.dest[0]][u.dest[1]].querySelector('.queen')||sq[u.dest[0]][u.dest[1]];
            ctx.play(amazonsShot(s,u.sel,u.dest,[r,c]),()=>FX.arrow(q,cell,{
              onDraw:()=>Sound.fx('bowdraw'),
              onRelease:()=>{Sound.fx('twang');Sound.fx('whoosh')},
              onHit:()=>{Sound.fx('impact');Sound.fx('fire');FX.shake(g)}
            }),{silent:true});
          }
        });
        cell.append(t);
      }else if(v==='L'||v==='R'){
        const glyph='♛︎',mine=v===PC[p]&&ctx.live;
        if(mine&&phase===0&&queenReach(b,r,c).length){
          const q=el('button',{class:'queen s'+v,type:'button','aria-label':`Select amazon at row ${r+1}, column ${c+1}`},glyph);
          q.addEventListener('click',()=>{Sound.fx('pick');u.sel=[r,c];ctx.redraw()});cell.append(q);
        }else if(mine&&phase===1&&same(u.sel,r,c)){
          const q=el('button',{class:'queen sel s'+v,type:'button','aria-label':'Choose a different amazon'},glyph);
          q.addEventListener('click',()=>{u.sel=null;ctx.redraw()});cell.append(q);
        }else if(mine&&phase===2&&same(u.dest,r,c)){
          const q=el('button',{class:'queen sel s'+v,type:'button','aria-label':'Take back the amazon move'},glyph);
          q.addEventListener('click',()=>{u.dest=null;ctx.redraw()});cell.append(q);
        }else cell.append(el('span',{class:'queen s'+v},glyph));
      }
      g.append(cell);
    }
    ctx.say(phase===1?'Click a highlighted square to move there, or click the amazon again to pick the other one.':phase===2?'Now aim: click a square the flaming arrow can reach from her new square. Click her to take the move back.':null);
    return g;
  }});

/* ---------------- graph colouring ---------------- */
function graphCreate(){
  const V=[],E=[];
  if(Math.random()<.7){const rn=R(2,3),cn=R(3,5);for(let r=0;r<rn;r++)for(let c=0;c<cn;c++){const i=V.length;V.push([c,r]);if(c)E.push([i-1,i]);if(r)E.push([i-cn,i])}}
  else{const n=R(5,8);for(let i=0;i<n;i++){V.push([i,0]);if(i)E.push([i-1,i])}}
  return{V,E,col:V.map(()=>null)};
}
const graphLegal=(s,v,p,snort)=>s.col[v]===null&&s.E.every(([a,b])=>{const u=a===v?b:b===v?a:-1;return u<0||s.col[u]!==(snort?PC[1-p]:PC[p])});
function graphView(s,ctx,snort){
  const p=s.turn,sp=70,pad=30,mx=Math.max(...s.V.map(v=>v[0])),my=Math.max(...s.V.map(v=>v[1]));
  const w=pad*2+sp*mx,h=pad*2+sp*my,P=v=>[pad+s.V[v][0]*sp,pad+s.V[v][1]*sp];
  const svg=sv('svg',{viewBox:`0 0 ${w} ${h}`,class:'svgb',style:`--mw:${Math.min(600,w*1.3)}px`});
  s.E.forEach(([a,b])=>{const [x1,y1]=P(a),[x2,y2]=P(b);svg.append(sv('line',{x1,y1,x2,y2,class:'gedge'}))});
  s.V.forEach((_,v)=>{
    const [cx,cy]=P(v),c=s.col[v],legal=graphLegal(s,v,p,snort);
    const node=sv('circle',{cx,cy,r:17,class:'gv'+(c?' c'+c:'')+(c===null&&!legal?' no':'')});
    if(ctx.live&&legal){node.classList.add('ok','t'+p);act(node,()=>ctx.play(nx(s,n=>n.col[v]=PC[p]),()=>{node.classList.add('c'+PC[p],'stamp');FX.burstAt(node,[FX.color(PC[p]),'#ffffff'],14,{speed:120});return sleep(160)}),`Colour dot ${v+1}`)}
    svg.append(node);
  });
  return svg;
}
const graphMoves=snort=>s=>s.V.flatMap((_,v)=>graphLegal(s,v,s.turn,snort)?[nx(s,n=>n.col[v]=PC[s.turn])]:[]);
def({id:'snort',name:'Snort',kind:'Partizan',sfx:'moo',motif:'disc',
  blurb:'Colour the map, but never right next to your opponent.',solved:'no',
  rules:['Players take turns colouring an uncoloured dot in their own colour.','You may not colour a dot that is joined by a line to a dot of your opponent’s colour.','Whoever colours the last dot they are allowed to wins.'],
  how:'Click a dot to colour it. Faded dots are off limits to you right now.',
  create:graphCreate,moves:graphMoves(true),hasMove:(s,p)=>s.V.some((_,v)=>graphLegal(s,v,p,true)),render:(s,ctx)=>graphView(s,ctx,true)});
def({id:'col',name:'Col',kind:'Partizan',sfx:'bell',motif:'disc',
  blurb:'Colour the map, but never right next to your own colour.',solved:'no',
  rules:['Players take turns colouring an uncoloured dot in their own colour.','You may not colour a dot that is joined by a line to a dot of your own colour.','Whoever colours the last dot they are allowed to wins.'],
  how:'Click a dot to colour it. Faded dots are off limits to you right now.',
  create:graphCreate,moves:graphMoves(false),hasMove:(s,p)=>s.V.some((_,v)=>graphLegal(s,v,p,false)),render:(s,ctx)=>graphView(s,ctx,false)});

/* ---------------- hex ---------------- */
const HEXN=[[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]];
function hexWin(b,o){
  const n=b.length,seen=new Set(),st=[];
  for(let i=0;i<n;i++){const [r,c]=o==='L'?[0,i]:[i,0];if(b[r][c]===o){st.push([r,c]);seen.add(r*n+c)}}
  while(st.length){const [r,c]=st.pop();if(o==='L'?r===n-1:c===n-1)return true;
    for(const [dr,dc] of HEXN){const rr=r+dr,cc=c+dc;if(rr>=0&&cc>=0&&rr<n&&cc<n&&b[rr][cc]===o&&!seen.has(rr*n+cc)){seen.add(rr*n+cc);st.push([rr,cc])}}}
  return false;
}
def({id:'hex',name:'Hex',kind:'Partizan',sfx:'stone',motif:'hex',
  blurb:'Build a chain across the board before your opponent blocks you. Invented twice, by Piet Hein and John Nash.',solved:'partly',
  rules:['Players take turns placing a stone of their colour on any empty hexagon.','Left tries to connect the two blue edges (top and bottom).','Right tries to connect the two black edges (left and right).'],
  win:'The first player to link their two edges with a chain of their stones wins. Hex can never end in a draw.',
  how:'Click an empty hexagon to place your stone.',
  create:()=>{const n=pick([5,6,7]);return{b:Array.from({length:n},()=>Array(n).fill(null))}},
  moves:s=>s.b.flatMap((row,r)=>row.flatMap((v,c)=>v?[]:[nx(s,n=>n.b[r][c]=PC[s.turn])])),
  hasMove:s=>s.b.some(r=>r.includes(null)),
  result:s=>{for(const p of [0,1])if(hexWin(s.b,PC[p]))return{winner:p,reason:`${name(p)} connected the ${p?'black':'blue'} edges.`};return null},
  render(s,ctx){
    const p=s.turn,n=s.b.length,z=22,s3=Math.sqrt(3),pad=16;
    const X=(r,c)=>pad+z*s3*(c+r/2)+z*s3/2,Y=r=>pad+z+1.5*z*r;
    const V=(r,c,a)=>{const t=a*Math.PI/180;return[X(r,c)+z*Math.cos(t),Y(r)+z*Math.sin(t)]};
    const w=pad*2+z*s3*(n+(n-1)/2),h=pad*2+z*(2+1.5*(n-1));
    const svg=sv('svg',{viewBox:`0 0 ${w} ${h}`,class:'svgb',style:`--mw:${Math.min(620,w*1.5)}px`});
    const line=(pts,c)=>svg.append(sv('polyline',{points:pts.map(q=>q.map(v=>v.toFixed(1)).join(',')).join(' '),class:'hexedge e'+c}));
    const top=[],bot=[],lft=[],rgt=[];
    for(let i=0;i<n;i++){top.push(V(0,i,210),V(0,i,270),V(0,i,330));bot.push(V(n-1,i,150),V(n-1,i,90),V(n-1,i,30));lft.push(V(i,0,210),V(i,0,150));rgt.push(V(i,n-1,330),V(i,n-1,30))}
    line(top,'L');line(bot,'L');line(lft,'R');line(rgt,'R');
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      const v=s.b[r][c],pts=[270,330,30,90,150,210].map(a=>V(r,c,a).map(q=>q.toFixed(1)).join(',')).join(' ');
      const poly=sv('polygon',{points:pts,class:'hexcell'+(v?' h'+v:'')});
      if(!v&&ctx.live){poly.classList.add('ok','t'+p);act(poly,()=>ctx.play(nx(s,nn=>nn.b[r][c]=PC[p]),()=>{poly.classList.add('h'+PC[p],'stamp');FX.burstAt(poly,[FX.color(PC[p]),'#ffffff'],12,{speed:110});return sleep(150)}),`Hexagon row ${r+1}, column ${c+1}`)}
      svg.append(poly);
    }
    return svg;
  }});

/* ---------------- dots & boxes ---------------- */
function dotsMove(s,k,r,c){
  const n=clone(s),p=s.turn,M=s.box.length,N=s.box[0].length;n[k][r][c]=p;let got=0;
  const done=(rr,cc)=>rr>=0&&cc>=0&&rr<M&&cc<N&&n.box[rr][cc]===null&&n.h[rr][cc]!==null&&n.h[rr+1][cc]!==null&&n.v[rr][cc]!==null&&n.v[rr][cc+1]!==null;
  for(const [rr,cc] of (k==='h'?[[r-1,c],[r,c]]:[[r,c-1],[r,c]])) if(done(rr,cc)){n.box[rr][cc]=p;got++}
  n.turn=got?p:1-p;return n;
}
def({id:'dots',name:'Dots & Boxes',kind:'Scoring',sfx:'paper',motif:'box',
  blurb:'The school-desk classic. Draw lines, close boxes and grab the most.',solved:'partly',
  rules:['Players take turns drawing a line between two neighbouring dots.','If your line completes the fourth side of a box, you claim that box and must draw another line.','Play continues until every line is drawn.'],
  win:'Whoever claims the most boxes wins. A tie is possible.',
  how:'Click between two dots to draw a line.',
  create:()=>{const [M,N]=pick([[2,3],[3,3],[3,4]]);return{h:Array.from({length:M+1},()=>Array(N).fill(null)),v:Array.from({length:M},()=>Array(N+1).fill(null)),box:Array.from({length:M},()=>Array(N).fill(null))}},
  moves:s=>[...s.h.flatMap((row,r)=>row.flatMap((x,c)=>x===null?[dotsMove(s,'h',r,c)]:[])),...s.v.flatMap((row,r)=>row.flatMap((x,c)=>x===null?[dotsMove(s,'v',r,c)]:[]))],
  hasMove:s=>s.h.flat().includes(null)||s.v.flat().includes(null),
  result:s=>{
    if(s.h.flat().includes(null)||s.v.flat().includes(null)) return null;
    const a=s.box.flat().filter(x=>x===0).length,b=s.box.flat().filter(x=>x===1).length;
    const tally=`Boxes: ${name(0)} ${a}, ${name(1)} ${b}.`;
    return a===b?{winner:'draw',reason:tally}:{winner:a>b?0:1,reason:tally};
  },
  render(s,ctx){
    const p=s.turn,M=s.box.length,N=s.box[0].length,sp=64,m=18,w=m*2+sp*N,h=m*2+sp*M;
    const svg=sv('svg',{viewBox:`0 0 ${w} ${h}`,class:'svgb',style:`--mw:${Math.min(560,w*1.6)}px`});
    for(let r=0;r<M;r++)for(let c=0;c<N;c++){const o=s.box[r][c];if(o!==null){svg.append(sv('rect',{x:m+c*sp+3,y:m+r*sp+3,width:sp-6,height:sp-6,rx:4,class:'bx'+o}));svg.append(sv('text',{x:m+c*sp+sp/2,y:m+r*sp+sp/2,class:'bxt t'+o},name(o).slice(0,1).toUpperCase()))}}
    const seg=(x1,y1,x2,y2,val,k,r,c)=>{
      const g=sv('g',{class:'dl'+(val!==null?' on p'+val:'')});
      g.append(sv('line',{x1,y1,x2,y2,class:'dv'}));
      if(val===null&&ctx.live){g.classList.add('free','t'+p);const hit=sv('line',{x1,y1,x2,y2,class:'dhit'});
        act(hit,()=>{const n=dotsMove(s,k,r,c),claimed=n.turn===p;
          ctx.play(n,async()=>{g.classList.add('on','p'+p);Sound.fx('paper',{p});
            if(claimed){Sound.fx('claim',{p});const sx=svg.getScreenCTM(),q=svg.createSVGPoint();q.x=(x1+x2)/2;q.y=(y1+y2)/2;if(sx){const z=q.matrixTransform(sx);FX.burst(z.x,z.y,[FX.color(PC[p]),'#ffd27a','#ffffff'],24,{speed:160})}}
            await sleep(140)},{silent:true})},`Draw ${k==='h'?'horizontal':'vertical'} line ${r+1}-${c+1}`);g.append(hit)}
      svg.append(g);
    };
    for(let r=0;r<=M;r++)for(let c=0;c<N;c++)seg(m+c*sp,m+r*sp,m+(c+1)*sp,m+r*sp,s.h[r][c],'h',r,c);
    for(let r=0;r<M;r++)for(let c=0;c<=N;c++)seg(m+c*sp,m+r*sp,m+c*sp,m+(r+1)*sp,s.v[r][c],'v',r,c);
    for(let r=0;r<=M;r++)for(let c=0;c<=N;c++)svg.append(sv('circle',{cx:m+c*sp,cy:m+r*sp,r:5,class:'dot','pointer-events':'none'}));
    const f=s.box.flat();ctx.say(`Boxes so far: ${name(0)} ${f.filter(x=>x===0).length}, ${name(1)} ${f.filter(x=>x===1).length}. Completing a box earns another line.`);
    return svg;
  }});

/* ---------------- strip games ---------------- */
const MV={
  push:(st,i)=>{const a=st.slice();let j=i;while(j>0&&st[j-1])j--;for(let k=j;k<=i;k++)if(k>0)a[k-1]=st[k];a[i]=null;return a},
  shove:(st,i)=>st.slice(1,i+1).concat([null],st.slice(i+1)),
  runover:(st,i)=>{const a=st.slice();if(i>0)a[i-1]=st[i];a[i]=null;return a},
  dragover:(st,i)=>i===0?st.slice(1).concat([null]):st.slice(0,i-1).concat(st.slice(i),[null]),
  pond:clob=>(st,i,p)=>{const d=p?-1:1,n=st.length,a=st.slice();let j=i+d;while(j>=0&&j<n&&st[j])j+=d;
    if(clob)for(let k=i+d;k!==j;k+=d)a[k]=null;if(j>=0&&j<n)a[j]=st[i];a[i]=null;return a},
  er:(st,i,p)=>{const t=i+(p?-1:1);if(t<0||t>=st.length||st[t])return null;const a=st.slice();a[t]=st[i];a[i]=null;return a},
  box:(st,i,p)=>{
    let a0=i,b0=i;while(a0>0&&st[a0-1])a0--;while(b0<st.length-1&&st[b0+1])b0++;
    const c=st[i],d=p?-1:1,front=d>0?b0+1:a0-1;
    if(front<0||front>=st.length||st[front])return null;
    const a=st.slice();if(d>0){a[a0]=null;a[front]=c}else{a[b0]=null;a[front]=c}
    let x=front,y=front;while(x>0&&a[x-1])x--;while(y<a.length-1&&a[y+1])y++;for(let k=x;k<=y;k++)a[k]=c;
    return a;
  }
};
function stripGame(o){def({kind:'Partizan',motif:'disc',moves:stripMoves(o.mv),hasMove:stripHasMove(o.mv),render:(s,ctx)=>stripsView(s,ctx,o.mv),...o})}
stripGame({id:'push',name:'Push',mv:MV.push,sfx:'slide',
  blurb:'Push a piece and anything in its way goes with it, friend or foe.',
  rules:['Each strip holds blue and black pieces.','On your turn, push one of your pieces one square to the left. Any pieces directly in its way get pushed along with it.','Pieces pushed past the left end leave the game.','Whoever makes the last move wins.'],
  how:'Both players push to the left. Hover one of your pieces to preview the push, then click it.',
  create:()=>({strips:randStrips(R(1,2),5,8,.55)})});
stripGame({id:'shove',name:'Shove',mv:MV.shove,sfx:'slide',
  blurb:'Shove your piece and everything behind it toward the edge.',solved:'yes',
  rules:['Each strip holds blue and black pieces.','On your turn, pick one of your pieces. It and every piece to its left move one square left.','Pieces that go past the left end leave the game.','Whoever makes the last move wins.'],
  how:'Both players shove to the left. Hover one of your pieces to preview, then click it.',
  create:()=>({strips:randStrips(R(1,2),5,8,.55)})});
stripGame({id:'runover',name:'Run Over',mv:MV.runover,sfx:'capture',
  blurb:'Step forward and flatten whatever stands in your way.',
  rules:['Each strip holds blue and black pieces.','On your turn, move one of your pieces one square to the left. If a piece is already there, it is removed.','Pieces that move past the left end leave the game.','Whoever makes the last move wins.'],
  how:'Both players move to the left. Hover one of your pieces to preview, then click it.',
  create:()=>({strips:randStrips(R(1,2),5,8,.55)})});
stripGame({id:'dragover',name:'Drag Over',mv:MV.dragover,sfx:'slide',
  blurb:'Move a piece and drag the whole line behind it along.',
  rules:['Each strip holds blue and black pieces.','On your turn, move one of your pieces one square to the left, removing any piece already there.','Every piece to the right of the moved piece is dragged one square left too.','Whoever makes the last move wins.'],
  how:'Both players move to the left. Hover one of your pieces to preview, then click it.',
  create:()=>({strips:randStrips(R(1,2),5,8,.55)})});
stripGame({id:'clearpond',name:'Clear the Pond',mv:MV.pond(false),sfx:'pop',
  blurb:'Leapfrog across the pond to reach the far bank.',
  rules:['Each strip holds blue and black pieces.','Left moves a blue piece to the right, jumping over any pieces in the way, to the first empty square. If there is none, it leaves the board.','Right does the same with a black piece, moving left.','Whoever makes the last move wins.'],
  how:'Left moves right, Right moves left. Hover one of your pieces to preview, then click it.',
  create:()=>({strips:randStrips(R(1,3),5,8,.5)})});
stripGame({id:'clobberpond',name:'Clobber the Pond',mv:MV.pond(true),sfx:'capture',
  blurb:'Leapfrog across the pond and knock out everything you jump over.',
  rules:['Each strip holds blue and black pieces.','Left moves a blue piece to the right to the first empty square, or off the board if there is none. Right does the same with a black piece, moving left.','Every piece jumped over, of either colour, is removed.','Whoever makes the last move wins.'],
  how:'Left moves right, Right moves left. Hover one of your pieces to preview, then click it.',
  create:()=>({strips:randStrips(R(1,3),5,8,.5)})});
stripGame({id:'elephants',name:'Elephants & Rhinos',mv:MV.er,sfx:'step',
  blurb:'Two herds walk toward each other on a narrow path. Who runs out of room first?',solved:'yes',
  rules:['Each strip holds blue elephants and black rhinos.','Left moves an elephant one square to the right into an empty square.','Right moves a rhino one square to the left into an empty square.','No animal can jump or push another. Whoever makes the last move wins.'],
  how:'Left moves right, Right moves left. Click one of your animals to step it forward.',
  create:()=>({strips:randStrips(R(2,3),5,9,.45)})});
function carStrip(){const n=R(7,11),a=Array(n).fill(null);let i=R(0,1);while(i<n){const len=R(1,2),c=pick(PC);for(let k=0;k<len&&i<n;k++,i++)a[i]=c;i+=R(1,3)}return a}
stripGame({id:'boxcars',name:'Boxcars',mv:MV.box,sfx:'wood',
  blurb:'Shunt your trains down the track. When trains couple, the mover repaints them.',
  rules:['Each track holds trains of blue and black boxcars. A train is a run of touching boxcars.','Left moves a blue train one square right; Right moves a black train one square left. Trains cannot leave the track.','If a train bumps into another train, they join and the whole new train takes the mover’s colour.','Whoever makes the last move wins.'],
  how:'Left moves right, Right moves left. Click any boxcar in one of your trains.',
  create:()=>{for(;;){const strips=Array.from({length:R(1,2)},carStrip),f=strips.flat();if(f.includes('L')&&f.includes('R'))return{strips}}}});

const slideCoin=(s,from,to)=>nx(s,n=>{n.st[to]='N';n.st[from]=null});
def({id:'sliding',name:'Sliding Coins',kind:'Impartial',sfx:'coin',motif:'disc',
  blurb:'Slide coins toward the start of the strip, never jumping over each other.',solved:'yes',
  rules:['Coins sit on a numbered strip.','On your turn, slide one coin to the left as far as you like.','A coin may not jump over or land on another coin, and may not leave the strip.','Whoever makes the last move wins.'],
  how:'Click a coin, then click the square it should slide to.',
  create:()=>{const n=R(10,14),st=Array(n).fill(null);let k=R(3,5);while(k>0){const i=R(1,n-1);if(!st[i]){st[i]='N';k--}}return{st}},
  moves:s=>{const out=[];s.st.forEach((v,i)=>{if(!v)return;for(let j=i-1;j>=0&&!s.st[j];j--)out.push(slideCoin(s,i,j))});return out},
  hasMove:s=>s.st.some((v,i)=>v&&i>0&&!s.st[i-1]),
  render(s,ctx){
    const st=s.st,sel=ctx.ui.sel,row=el('div',{class:'strip'}),cells=[];
    st.forEach((v,i)=>{
      const sq=el('div',{class:'sq'},el('span',{class:'num'},String(i+1)));cells.push(sq);
      const reach=sel!=null&&i<sel&&st.slice(i,sel).every(x=>!x);
      if(v){
        const movable=ctx.live&&i>0&&!st[i-1];
        if(movable){const b=el('button',{class:'stone sN'+(sel===i?' sel':''),type:'button','aria-label':`${sel===i?'Deselect':'Select'} coin on square ${i+1}`});b.addEventListener('click',()=>{Sound.fx('pick');ctx.ui.sel=sel===i?null:i;ctx.redraw()});sq.append(b)}
        else sq.append(el('span',{class:'stone sN'}));
      }else if(reach){
        const t=el('button',{class:'tgt',type:'button','aria-label':`Slide to square ${i+1}`});
        t.addEventListener('click',()=>{const coin=cells[sel].querySelector('.stone');ctx.play(slideCoin(s,sel,i),()=>FX.slide(coin,sq,300))});sq.append(t);
      }
      row.append(sq);
    });
    ctx.say(sel!=null?'Click a highlighted square to slide the coin there.':null);
    return el('div',{class:'strips'},row);
  }});

/* ---------------- cutthroat stars ---------------- */
function cutStar(s,k,j){ // j<0 removes the centre
  return nx(s,n=>{const st=s.stars[k];if(j<0){n.stars.splice(k,1);return}
    const rest=st.leaves.filter((_,q)=>q!==j);
    if(!rest.length||rest.every(x=>x===st.c)) n.stars.splice(k,1);else n.stars[k].leaves=rest});
}
def({id:'cutthroat',name:'Cutthroat Stars',kind:'Partizan',sfx:'capture',motif:'disc',
  blurb:'Remove your own stars to cut your opponent’s loose.',solved:'yes',
  rules:['There are several star graphs, with blue and black dots.','Left removes a blue dot; Right removes a black dot. Lines touching the removed dot go too.','Any piece of the graph left with dots of only one colour is removed immediately.','Whoever makes the last move wins.'],
  how:'Click one of your dots. Hover first to see what disappears.',
  create:()=>({stars:Array.from({length:R(2,4)},()=>{const c=pick(PC),leaves=Array.from({length:R(1,4)},()=>pick(PC));if(leaves.every(x=>x===c))leaves[R(0,leaves.length-1)]=c==='L'?'R':'L';return{c,leaves}})}),
  moves:s=>s.stars.flatMap((st,k)=>[...(st.c===PC[s.turn]?[cutStar(s,k,-1)]:[]),...st.leaves.flatMap((c,j)=>c===PC[s.turn]?[cutStar(s,k,j)]:[])]),
  hasMove:(s,p)=>s.stars.some(st=>st.c===PC[p]||st.leaves.includes(PC[p])),
  render(s,ctx){
    const p=s.turn,wrap=el('div',{class:'stars'});
    s.stars.forEach((st,k)=>{
      const svg=sv('svg',{viewBox:'0 0 140 140',class:'star'}),L=st.leaves.length,cx=70,cy=70,rad=48;
      const pos=j=>{const a=-Math.PI/2+2*Math.PI*j/L;return[cx+rad*Math.cos(a),cy+rad*Math.sin(a)]};
      const edges=st.leaves.map((_,j)=>{const [x,y]=pos(j),e=sv('line',{x1:cx,y1:cy,x2:x,y2:y,class:'sedge'});svg.append(e);return e});
      const node=(x,y,c,j)=>{
        const ok=ctx.live&&c===PC[p],n=sv('circle',{cx:x,cy:y,r:j<0?15:12,class:'sv s'+c+(ok?' ok':'')});
        svg.append(n);if(!ok) return;
        const rest=j<0?null:st.leaves.filter((_,q)=>q!==j),wipes=j<0||!rest.length||rest.every(x=>x===st.c);
        const parts=wipes?[svg]:[n,edges[j]];
        hov(n,()=>parts.forEach(e=>e.classList.add('fade')),()=>parts.forEach(e=>e.classList.remove('fade')));
        act(n,()=>ctx.play(cutStar(s,k,j),async()=>{FX.burstAt(n,[FX.color(c),'#ffffff'],20,{speed:150});parts.forEach(e=>e.classList.remove('fade'));await FX.vanish(parts,'crumble',260)}),`Remove ${CNAME[c]} ${j<0?'centre':'outer'} dot of star ${k+1}`);
      };
      st.leaves.forEach((c,j)=>{const [x,y]=pos(j);node(x,y,c,j)});
      node(cx,cy,st.c,-1);
      wrap.append(svg);
    });
    return wrap;
  }});

/* ---------------- 3 to 15 ---------------- */
def({id:'to15',name:'3-to-15',kind:'Impartial',sfx:'card',motif:'card',
  blurb:'Take cards from 1 to 9. First to hold three that add up to 15 wins.',solved:'yes',
  rules:['The cards 1 to 9 lie face up.','Players take turns picking any card that is still on the table.','You are trying to hold exactly three cards that add up to 15.'],
  win:'The first player holding three cards that sum to 15 wins. If all nine cards are taken first, it is a draw.',
  how:'Click a card to take it.',
  create:()=>({own:Array(9).fill(null)}),
  moves:s=>s.own.flatMap((o,i)=>o===null?[nx(s,n=>n.own[i]=s.turn)]:[]),
  hasMove:s=>s.own.includes(null),
  result:s=>{
    for(const p of [0,1]){const h=s.own.map((o,i)=>o===p?i+1:0).filter(Boolean);
      for(let a=0;a<h.length;a++)for(let b=a+1;b<h.length;b++)for(let c=b+1;c<h.length;c++)if(h[a]+h[b]+h[c]===15)return{winner:p,reason:`${name(p)} holds ${h[a]} + ${h[b]} + ${h[c]} = 15.`}}
    return s.own.includes(null)?null:{winner:'draw',reason:'All nine cards are taken and nobody made 15.'};
  },
  render(s,ctx){
    const deck=el('div',{class:'deck'});
    s.own.forEach((o,i)=>{
      if(o===null){const b=el('button',{class:'card15',type:'button',disabled:!ctx.live},String(i+1));b.addEventListener('click',()=>ctx.play(nx(s,n=>n.own[i]=s.turn),()=>FX.vanish([b],'fly')));deck.append(b)}
      else deck.append(el('div',{class:'card15 taken'},String(i+1)));
    });
    const hand=p=>el('div',{class:'hand h'+p},el('span',{class:'role'},name(p)),el('div',{class:'cards'},s.own.map((o,i)=>o===p?el('span',{},String(i+1)):null)));
    return el('div',{class:'c15'},deck,el('div',{class:'hands'},hand(0),hand(1)));
  }});

/* ---------------- Duo Sudoku ---------------- */
/* puzzles are made here: fill a random solved grid, then remove numbers one at a time,
   keeping a number only when removing it would allow a second solution */
const SDK={
  peers:Array.from({length:81},(_,i)=>{const r=i/9|0,c=i%9,b=(r/3|0)*27+(c/3|0)*3,s=new Set();
    for(let k=0;k<9;k++){s.add(r*9+k);s.add(k*9+c);s.add(b+(k/3|0)*9+k%3)}s.delete(i);return[...s]}),
  ok:(g,i,d)=>SDK.peers[i].every(j=>g[j]!==d),
  fill(g,rnd){const i=g.indexOf(0);if(i<0)return true;
    for(const d of shuffle([1,2,3,4,5,6,7,8,9],rnd))if(SDK.ok(g,i,d)){g[i]=d;if(SDK.fill(g,rnd))return true}
    g[i]=0;return false},
  count(g,lim){ // number of solutions, up to lim; tries the most constrained square first
    let best=-1,cand=null;
    for(let i=0;i<81;i++)if(!g[i]){const c=[];for(let d=1;d<=9;d++)if(SDK.ok(g,i,d))c.push(d);
      if(!c.length)return 0;if(!cand||c.length<cand.length){best=i;cand=c;if(c.length===1)break}}
    if(best<0)return 1;
    let n=0;for(const d of cand){g[best]=d;n+=SDK.count(g,lim-n);if(n>=lim)break}
    g[best]=0;return n;
  },
  make(givens,rnd){
    const sol=Array(81).fill(0);SDK.fill(sol,rnd);
    const grid=sol.slice();let left=81;
    for(const i of shuffle([...Array(81).keys()],rnd)){
      if(left<=givens)break;
      const d=grid[i];grid[i]=0;
      if(SDK.count(grid.slice(),2)===1)left--;else grid[i]=d;
    }
    return{grid,sol};
  }
};
/* a fresh puzzle with its boosters; hard leaves fewer numbers to start from */
function sdkBoard(diff,rnd){
  const {grid,sol}=rnd?SDK.make(32+Math.floor(rnd()*3),rnd):SDK.make(diff==='hard'?R(23,26):R(32,36)),boost=Array(81).fill(1);
  const empty=shuffle(grid.map((d,i)=>d?-1:i).filter(i=>i>=0),rnd);
  empty.slice(0,4).forEach(i=>boost[i]=3);empty.slice(4,12).forEach(i=>boost[i]=2);
  return{grid,sol,given:grid.map(d=>d?1:0),boost,own:Array(81).fill(-1),diff};
}
/* two ways to play: take turns (30 s a turn, optional clock each), or rapid fire (everyone at once, one game clock) */
const sdkNow=()=>Date.now()+(typeof Online!=='undefined'?Online.offset:0);
const sdkCount=s=>s.n+s.out[0]+s.out[1]+(s.skips||0);
/* the daily challenge: one puzzle a day (boosters too), the same for everyone, made from the date in India so it changes
   at midnight IST. It plays like rapid fire with no game clock: race to fill the board, the higher score wins, and the
   pair's time plus 10 seconds for every wrong number goes on the leaderboard (js/daily.js) */
const IST=19800000,DAY=86400000,SDK_PEN=10000;
const sdkDay=(t=sdkNow())=>new Date(t+IST).toISOString().slice(0,10);
const sdkDayName=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
const sdkUntil=()=>{const m=Math.ceil((DAY-(sdkNow()+IST)%DAY)/60000);return m>=60?`${m/60|0} h ${m%60} min`:`${m} min`};
/* every game gets an id, so a rating counts once per game (js/rating.js); the ratings are copied in when it starts */
const sdkGameId=()=>Math.random().toString(36).slice(2,10).padEnd(8,'0');
const sdkElo=s=>typeof Rating!=='undefined'?Rating.snap(s):null;
const sdkDaily=(day=sdkDay())=>({g:sdkGameId(),...sdkBoard('medium',seeded([...day].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619),2166136261))),
  score:[0,0],n:0,last:null,set:0,mode:'daily',day,scoring:'diff',turnLimit:0,limit:0,clock:[0,0],out:[0,0],skips:0,deadline:0,ended:0,wrong:0,t0:0,fin:0});
const sdkTook=s=>s.t0?(s.fin||sdkNow())-s.t0:0;
const sdkUp=ms=>sdkFmt(Math.floor(Math.max(0,ms)/1000)*1000);
/* by-difficulty scoring: the more copies of a number still to place, the more it is worth.
   Numbers are ranked by how many are left, ties share a rank, and rank 1 is worth 1 point. */
function sdkWorth(grid){
  const left=[0];for(let d=1;d<=9;d++)left.push(9-grid.filter(x=>x===d).length);
  const ranks=[...new Set(left.slice(1).filter(x=>x>0))].sort((a,b)=>a-b);
  return left.map((x,d)=>d&&x?ranks.indexOf(x)+1:0);
}
const sdkValue=(s,d)=>s.scoring==='diff'?sdkWorth(s.grid)[d]:d;
/* rapid fire (and the daily challenge): after a wrong number that player scores nothing for 15 seconds;
   s.cold[p] is when the points come back (server time). Take turns has no such pause. */
const SDK_COLD=15000,sdkCold=(s,p)=>Math.max(0,((s.cold||[])[p]||0)-sdkNow());
function sdkPlace(s,i,d,spent,p=s.turn){
  const n=clone(s),ok=s.sol[i]===d,cold=ok&&sdkCold(s,p)>0,pts=ok?cold?0:sdkValue(s,d)*s.boost[i]:-1;
  if(ok){n.grid[i]=d;n.own[i]=p}
  else if(s.mode!=='turns') (n.cold||(n.cold=[0,0]))[p]=sdkNow()+SDK_COLD;
  n.score[p]+=pts;n.n++;n.last={i,d,ok,p,pts,k:n.n,...(cold?{cold:1}:{})};
  if(s.mode==='daily'){if(!ok)n.wrong++;else if(!n.grid.includes(0))n.fin=sdkNow();return n} // the clock stops on the last square
  if(s.mode==='rapid'){if(!n.deadline&&n.limit)n.deadline=sdkNow()+n.limit;return n}
  if(n.limit&&spent) n.clock[p]=Math.max(0,n.clock[p]-spent);
  n.turn=n.out[1-p]?p:1-p;
  return n;
}
function sdkTimeout(s){const p=s.turn,n=clone(s);n.clock[p]=0;n.out[p]=1;n.last={timeout:p};n.turn=1-p;return n}
function sdkSkip(s,spent){const p=s.turn,n=clone(s);if(n.limit)n.clock[p]=Math.max(0,n.clock[p]-spent);n.skips=(n.skips||0)+1;n.last={skip:p,k:n.skips};n.turn=n.out[1-p]?p:1-p;return n}
const sdkFmt=ms=>{const t=Math.max(0,Math.ceil(ms/1000));return`${t/60|0}:${String(t%60).padStart(2,'0')}`};
/* the running turn clock lives outside the state: it restarts whenever the turn changes */
const sdkClock={key:'',t:0,timeout:null},sdkFx={key:''};
const sdkSpent=s=>s.mode==='turns'&&sdkCount(s)>0&&sdkClock.key?Date.now()-sdkClock.t:0;
const sdkOnline=()=>typeof Online!=='undefined'&&Online.on;
/* the little +points or −1 that pops out of a square, for your moves and your friend's */
function sdkEffect(l,s){
  const daily=s.mode==='daily';
  if(!l||l.i==null){if(l&&(l.skip!=null||l.timeout!=null))Sound.fx('bell');return}
  const cell=document.querySelector(`#board .sc[data-i="${l.i}"]`);if(!cell)return;
  cell.append(el('span',{class:'sdk-float'+(l.ok?' f'+l.p:' bad')+(l.cold?' cold':'')},l.ok?'+'+l.pts:daily?'−1 · +10 s':'−1'));
  if(!l.ok){cell.append(el('span',{class:'sdk-wrongd'},String(l.d)));if(s.mode!=='turns'&&(!sdkOnline()||l.p!==Online.me))sdkToast(l)}
  if(l.ok){Sound.fx(l.pts>l.d?'coin':'pop',{p:l.p});FX.burstAt(cell,[FX.color(PC[l.p]),'#ffd27a','#ffffff'],l.pts>l.d?34:16,{speed:l.pts>l.d?190:120})}
  else{cell.classList.add('bad');FX.shake(cell);Sound.fx('knock',{p:l.p});setTimeout(()=>cell.classList.remove('bad'),600)}
}

/* a wrong number pops up for the other player: who, which number, where, and the 15 seconds without points */
function sdkToast(l){
  document.querySelectorAll('.sdk-toast').forEach(e=>e.remove());
  const t=el('div',{class:'sdk-toast t'+l.p,role:'status','aria-live':'polite'},
    el('b',{},`${name(l.p)} played a wrong ${l.d}`),
    el('span',{},`Row ${(l.i/9|0)+1}, column ${l.i%9+1}. That’s −1 point, and no points for ${name(l.p)} for the next 15 seconds.`));
  t.addEventListener('click',()=>t.remove());
  document.body.append(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),400)},3200);
}

/* the daily challenge set-up: choose who you're playing first, on this screen or on another device, then start the clock */
function sdkDailySetup(s,ctx,wrap){
  const on=sdkOnline(),mate=()=>on?Online.friend:!!(S.names[1]||'').trim();
  const go=el('button',{class:'btn primary big sdk-start',type:'button'},on&&!Online.friend?'Waiting for your friend…':'Start the clock');
  const sync=()=>{go.disabled=!ctx.live||!mate()};sync();
  go.addEventListener('click',()=>{if(mate())ctx.configure({...clone(s),set:1,t0:sdkNow(),elo:sdkElo(s)})});
  let pickBox;
  if(on) pickBox=el('p',{class:'sdk-mate'},Online.friend?`You’re playing ${name(1-Online.me)}, on their own device.`:'Waiting for your friend to open the link or type the room code.');
  else{
    const inp=el('input',{class:'name-in',maxlength:'16',autocomplete:'off',placeholder:'Your friend’s name','aria-label':'Your friend’s name',value:S.names[1]||''});
    inp.addEventListener('input',()=>{S.names[1]=S.opp=inp.value;$('nameR').value=inp.value;sync()});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!go.disabled)go.click()});
    const inv=el('button',{class:'btn',type:'button'},'Invite a friend online');inv.addEventListener('click',()=>Online.open());
    pickBox=el('div',{class:'sdk-mate'},el('p',{class:'fine'},'On this screen? Type their name.'),
      el('label',{class:'name-row'},el('span',{class:'dot l'}),el('b',{},name(0)),el('span',{class:'amp'},'vs'),el('span',{class:'dot r'}),inp),
      el('p',{class:'fine'},'On another device?'),inv);
  }
  const lb=el('button',{class:'btn',type:'button'},'Leaderboard');lb.addEventListener('click',()=>Daily.open(s.day));
  const normal=el('button',{class:'btn',type:'button'},'Play a normal game');normal.disabled=!ctx.live;
  normal.addEventListener('click',()=>ctx.configure({...S.game.create(),turn:s.turn}));
  wrap.append(el('div',{class:'sdk-setup big'},el('span',{class:'chip new'},'Daily challenge'),el('h3',{},sdkDayName(s.day)),
    el('p',{class:'fine'},`Everyone gets this puzzle today. Race your friend in rapid fire with no time limit: the higher score wins, and your pair’s time goes on the leaderboard, with 10 seconds added for every wrong number. A new puzzle comes at midnight IST, in ${sdkUntil()}.`),
    el('h4',{},'1. Choose who you’re playing'),pickBox,el('h4',{},'2. Start together'),go,el('div',{class:'row'},lb,normal)));
  ctx.say(on?'You both see the board as soon as either of you starts the clock.':'Choose who you’re playing, then start the clock.');
  return wrap;
}

def({id:'duosudoku',name:'Duo Sudoku',kind:'Scoring',sfx:'pop',motif:'tile',isNew:true,noUndo:true,
  blurb:'One sudoku, two players, bonus squares. Race each other in rapid fire, or take turns.',
  rules:s=>s&&s.mode==='daily'?['The board is an ordinary sudoku: every row, column and 3×3 box must end up holding 1 to 9 once each.',
    'Daily challenge: everyone gets the same puzzle and the same bonus squares each day, and a new one comes at midnight IST. Play it with a friend on one screen or on two devices.',
    'It plays like rapid fire with no game clock: both of you place numbers at once until the board is full. Scoring is by difficulty, ×2 and ×3 squares multiply, a wrong number costs the player who placed it 1 point, and for the next 15 seconds that player scores nothing for the squares they fill.',
    'The clock starts when you tap Start the clock and stops when the last square is filled. Every wrong number, by either of you, adds 10 seconds to your pair’s time on the daily leaderboard. Only your first finished game each day counts; play again for practice.']:['The board is an ordinary sudoku: every row, column and 3×3 box must end up holding 1 to 9 once each.',
    !s||s.scoring==='diff'
      ?'Scoring by difficulty (the default): numbers with more copies still to place are worth more. They are ranked by how many are left, from 1 point for the fewest upward, and numbers with the same count left are worth the same. Values change as the board fills, and the strip above the board shows them. On a ×2 or ×3 square a number scores double or triple. A wrong number costs the player who placed it 1 point, and the square stays empty. In rapid fire, that player then scores nothing for the squares they fill for the next 15 seconds. You can also choose number value scoring, where a correct number scores its own value.'
      :'A correct number scores its value. On a ×2 or ×3 square it scores double or triple. A wrong number costs the player who placed it 1 point, and the square stays empty. In rapid fire, that player then scores nothing for the squares they fill for the next 15 seconds. You can also choose scoring by difficulty, where the numbers with the most copies left are worth the most.',
    'Rapid fire (the default): no turns. Both players place numbers as fast as they like until the board is full or the game clock ends (3, 5 or 10 minutes; 10 is the default).',
    'Take turns: players place one number each in turn. A turn lasts at most 30 seconds, then it passes to the other player. You can also give each player a 3 or 5 minute clock; when yours runs out, your opponent plays on alone.'],
  win:s=>s&&s.mode==='daily'?'When the board is full, the higher score wins, and the fastest pairs of the day top the leaderboard.':'When the board is full or time is up, the higher score wins. A tie is possible.',
  how:'Click an empty square, then a number.',
  create:prev=>prev&&prev.mode==='daily'?sdkDaily():({g:sdkGameId(),...sdkBoard('medium'),score:[0,0],n:0,last:null,
      set:0,mode:'rapid',scoring:'diff',turnLimit:30000,limit:600000,clock:[0,0],out:[0,0],skips:0,deadline:0,ended:0,bot:prev&&prev.bot?1:0}),
  moves:s=>s.mode!=='turns'||s.out[s.turn]?[]:s.grid.flatMap((v,i)=>v?[]:[1,2,3,4,5,6,7,8,9].map(d=>sdkPlace(s,i,d,0))),
  hasMove:(s,p)=>s.mode==='daily'?s.grid.includes(0):s.mode==='rapid'?!s.ended&&s.grid.includes(0):!s.out[p]&&s.grid.includes(0),
  anyTurn:s=>s.mode!=='turns',
  ready:s=>!!s.set||s.n>0,
  status:s=>s.mode==='daily'?'Daily challenge: both play at once':s.mode==='rapid'?'Rapid fire: both play at once':null,
  demoMove:s=>{
    const empty=s.grid.map((v,i)=>v?-1:i).filter(i=>i>=0);
    const i=Math.random()<.35?(empty.find(i=>s.boost[i]>1)??pick(empty)):pick(empty);
    return sdkPlace(s,i,Math.random()<.75?s.sol[i]:pick([1,2,3,4,5,6,7,8,9].filter(d=>d!==s.sol[i])),0,s.mode==='rapid'?R(0,1):s.turn);
  },
  result:s=>{
    const timeUp=s.mode==='rapid'?s.ended:s.out[0]&&s.out[1];
    if(s.grid.includes(0)&&!timeUp) return null;
    const [a,b]=s.score,tally=`${timeUp&&s.grid.includes(0)?'Time is up. ':''}Points: ${name(0)} ${a}, ${name(1)} ${b}.`;
    /* daily: the pair's time for the leaderboard rides along with the result */
    const day=s.mode==='daily'?{daily:1,ms:s.fin-s.t0,wrong:s.wrong,total:s.fin-s.t0+s.wrong*SDK_PEN}:{};
    const why=day.daily?`${tally} Time ${sdkUp(day.ms)} + ${s.wrong} wrong × 10 s = ${sdkUp(day.total)}.`:tally;
    return a===b?{winner:'draw',reason:why,...day}:{winner:a>b?0:1,reason:why,...day};
  },
  render(s,ctx){
    const p=s.turn,app=typeof ctx.configure==='function',daily=s.mode==='daily',rapid=s.mode!=='turns',started=s.n>0,sel=ctx.ui.sel;
    if(app){
      const key=sdkCount(s)+':'+p;
      if(key!==sdkClock.key){sdkClock.key=key;sdkClock.t=Date.now()}
      sdkClock.timeout=daily?null:rapid
        ?()=>ctx.play({...clone(s),ended:1},null,{silent:true,op:st=>st.ended?null:{...st,ended:1}})
        :()=>{const spent=Date.now()-sdkClock.t,out=s.limit&&s.clock[p]-spent<=0;ctx.play(out?sdkTimeout(s):sdkSkip(s,spent),null,{silent:true})};
      if(s.last){const k=JSON.stringify(s.last);if(k!==sdkFx.key){const seen=sdkFx.key!=='';sdkFx.key=k;if(seen)setTimeout(()=>sdkEffect(s.last,s),0)}}
      else sdkFx.key='-';
    }
    const wrap=el('div',{class:'sdk'+(rapid?' rapid':'')});
    if(app&&!started&&!s.set&&daily) return sdkDailySetup(s,ctx,wrap);

    /* set-up comes first, on its own; Start game puts the board on screen */
    if(app&&!started&&!s.set){
      const pick2=(label,on,next)=>{const b=el('button',{class:'seg',type:'button','aria-pressed':String(on)},label);
        b.disabled=!ctx.live;b.addEventListener('click',()=>{if(!on)ctx.configure({...clone(s),...next})});return b};
      const row=(label,...b)=>el('div',{class:'sdk-opt'},el('span',{class:'role'},label),...b);
      const diff=s.diff||'medium',level=(label,d)=>{const b=el('button',{class:'seg',type:'button','aria-pressed':String(diff===d)},label);
        b.disabled=!ctx.live;b.addEventListener('click',()=>{if(diff!==d)ctx.configure({...clone(s),...sdkBoard(d)})});return b};
      /* seat 1 can be the computer (js/sdkbot.js), on one screen only */
      const rows=[sdkOnline()?null:row('Opponent',pick2('A friend',!s.bot,{bot:0}),pick2('The computer',!!s.bot,{bot:1})),row('Difficulty',level('Medium','medium'),level('Hard','hard')),row('Mode',pick2('Rapid fire',rapid,{mode:'rapid',limit:600000,clock:[0,0]}),pick2('Take turns',!rapid,{mode:'turns',limit:0,clock:[0,0]}))];
      if(rapid) rows.push(row('Game time',pick2('3 min',s.limit===180000,{limit:180000}),pick2('5 min',s.limit===300000,{limit:300000}),pick2('10 min',s.limit===600000,{limit:600000})));
      else rows.push(row('Per turn',pick2('30 s',!!s.turnLimit,{turnLimit:30000}),pick2('No limit',!s.turnLimit,{turnLimit:0})),
        row('Clock',pick2('Off',!s.limit,{limit:0,clock:[0,0]}),pick2('3 min each',s.limit===180000,{limit:180000,clock:[180000,180000]}),pick2('5 min each',s.limit===300000,{limit:300000,clock:[300000,300000]})));
      rows.push(row('Scoring',pick2('By difficulty',s.scoring==='diff',{scoring:'diff'}),pick2('Number value',s.scoring!=='diff',{scoring:'number'})));
      const waitFriend=sdkOnline()&&!Online.friend;
      const go=el('button',{class:'btn primary big sdk-start',type:'button'},waitFriend?'Waiting for your friend…':'Start game');
      go.disabled=!ctx.live||waitFriend;
      go.addEventListener('click',()=>ctx.configure({...clone(s),set:1,deadline:rapid&&s.limit?sdkNow()+s.limit:0,elo:sdkElo(s)}));
      const today=el('button',{class:'btn sdk-today',type:'button'},'Or play today’s daily challenge →');today.disabled=!ctx.live;
      today.addEventListener('click',()=>ctx.configure({...sdkDaily(),turn:s.turn}));
      wrap.append(el('div',{class:'sdk-setup big'},el('h3',{},'Set up the game'),...rows,go,today));
      ctx.say('Choose how you want to play, then tap Start game.');
      return wrap;
    }

    /* scores and clocks */
    const pill=q=>el('div',{class:'sdk-score s'+q+(!rapid&&p===q&&!s.out[q]?' on':'')+(s.out[q]?' out':'')},
      el('span',{class:'dot'}),el('span',{class:'nm'},name(q),app&&sdkCold(s,q)>0?el('span',{class:'sdk-cold','data-cold':q},`No points ${Math.ceil(sdkCold(s,q)/1000)}s`):null,app&&typeof Rating!=='undefined'?Rating.tag(q,s):null),el('b',{},String(s.score[q])),
      !rapid&&s.limit?el('span',{class:'sdk-clock','data-p':q},s.out[q]?'Time’s up':sdkFmt(s.clock[q]-(app&&started&&q===p?Date.now()-sdkClock.t:0))):null);
    wrap.append(el('div',{class:'sdk-scores'},pill(0),pill(1)));
    if(daily) wrap.append(el('div',{class:'sdk-drow'},el('div',{class:'sdk-gclock sdk-dclock'},sdkUp(sdkTook(s))),
      el('div',{class:'sdk-pen'+(s.wrong?' on':'')},`${s.wrong} wrong · +${s.wrong*10} s`)));
    else if(rapid) wrap.append(el('div',{class:'sdk-gclock'+(s.deadline?'':' idle')},s.deadline?sdkFmt(s.deadline-sdkNow()):`${sdkFmt(s.limit)} · starts with the first number`));
    else if(s.turnLimit&&started) wrap.append(el('div',{class:'sdk-turnbar t'+p},el('div',{class:'trk'},el('i',{style:`--w:${Math.max(0,100-(Date.now()-sdkClock.t)/s.turnLimit*100)}%`})),el('span',{},Math.max(0,Math.ceil((s.turnLimit-(Date.now()-sdkClock.t))/1000))+'s')));

    /* by difficulty: what each number is worth right now */
    if(s.scoring==='diff'){
      const w=sdkWorth(s.grid),top=Math.max(...w);
      wrap.append(el('div',{class:'sdk-worth','aria-label':'Points for each number right now'},
        ...[1,2,3,4,5,6,7,8,9].sort((x,y)=>(w[y]||-1)-(w[x]||-1)||x-y).map(d=>{
          /* most points first; green for the most, red for the least */
          const t=top>1?(w[d]-1)/(top-1):1;
          return el('div',{class:'wv'+(w[d]?'':' done'),style:w[d]?`--h:${Math.round(t*130)}`:null},el('b',{},String(d)),el('span',{},w[d]?'+'+w[d]:'✓'))})));
    }

    /* the grid */
    const grid=el('div',{class:'sdk-grid'}),boxes=Array.from({length:9},()=>el('div',{class:'sdk-box'}));
    grid.append(...boxes);
    const selD=sel!=null?s.grid[sel]:0,peers=sel!=null?new Set(SDK.peers[sel]):null;
    for(let i=0;i<81;i++){
      const v=s.grid[i],open=!v&&ctx.live;
      const cls='sc'+(s.given[i]?' g':'')+(s.own[i]>=0?' o'+s.own[i]:'')+(s.boost[i]>1&&!s.given[i]?' b'+s.boost[i]:'')+
        (i===sel?' sel':'')+(peers&&peers.has(i)?' peer':'')+(selD&&v===selD&&i!==sel?' same':'')+(s.last&&s.last.i===i&&s.last.ok?' last':'');
      const c=el(open||v?'button':'div',{class:cls,type:'button','data-i':i,'aria-label':`Row ${(i/9|0)+1}, column ${i%9+1}${v?', '+v:', empty'}${s.boost[i]>1&&!v?', times '+s.boost[i]:''}`});
      if(v) c.append(el('span',{class:'dg'},String(v)));
      else if(s.boost[i]>1) c.append(el('span',{class:'bb-tag'},'×'+s.boost[i]));
      if(open||v) c.addEventListener('click',()=>{ctx.ui.sel=i;ctx.redraw()});
      boxes[((i/9|0)/3|0)*3+((i%9)/3|0)].append(c);
    }
    wrap.append(grid);

    /* number pads: one for whoever is to move; in rapid fire one each (or just yours when online) */
    const done=d=>s.grid.filter(x=>x===d).length===9;
    const padFor=q=>{
      const pad=el('div',{class:'sdk-pad'+(rapid?' p'+q:'')});
      for(let d=1;d<=9;d++){
        const b=el('button',{class:'key',type:'button','data-d':d,'data-p':q,'aria-label':`${rapid?name(q)+': ':''}place ${d}`},String(d),el('small',{},done(d)?'✓':String(9-s.grid.filter(x=>x===d).length)));
        b.disabled=!ctx.live||sel==null||!!s.grid[sel]||done(d)||(!rapid&&q!==p)||!!s.bot&&q===1;
        b.addEventListener('click',()=>{
          const i=sel;
          ctx.play(sdkPlace(s,i,d,sdkSpent(s),q),null,{silent:true,op:st=>st.grid[i]||(st.mode==='rapid'&&st.ended)?null:sdkPlace(st,i,d,0,q)});
        });
        pad.append(b);
      }
      return rapid?el('div',{class:'sdk-padwrap p'+q},el('span',{class:'role'},el('span',{class:'dot'}),name(q)),pad):pad;
    };
    if(!rapid) wrap.append(padFor(p));
    else if(sdkOnline()||s.bot) wrap.append(el('div',{class:'sdk-pads one'},padFor(sdkOnline()?Online.me:0)));
    else wrap.append(el('div',{class:'sdk-pads'},padFor(0),padFor(1)));

    if(app&&daily) wrap.append(el('div',{class:'sdk-sum'},`Daily challenge · ${sdkDayName(s.day)} · each wrong number +10 s`));
    else if(app) wrap.append(el('div',{class:'sdk-sum'},[s.bot?'Vs the computer':null,s.diff==='hard'?'Hard':'Medium',rapid?'Rapid fire':'Take turns',
      rapid?sdkFmt(s.limit).replace(/:00$/,'')+' min':s.turnLimit?'30 s a turn':'No turn limit',s.scoring==='diff'?'By difficulty':'Number value'].filter(Boolean).join(' · ')));
    if(rapid&&!s.ended) ctx.say(sel==null?(daily?'Fill the board as fast as you can: every wrong number adds 10 seconds to your pair’s time. ':'')+'Both of you play at once. Click an empty square, then a number on your own pad.'+(s.scoring==='diff'?' The strip above the board shows what each number is worth right now.':''):`Now pick a number for this square${s.boost[sel]>1?` (a ×${s.boost[sel]} square)`:''}.`);
    else if(sel==null) ctx.say(`Click an empty square, then a number. A right number scores ${s.scoring==='diff'?'its points in the strip above the board':'its value'}, times any booster. A wrong one costs 1 point.${s.turnLimit?' You have 30 seconds a turn.':''}`);
    else if(!s.grid[sel]) ctx.say(`Now pick a number for this square${s.boost[sel]>1?` (a ×${s.boost[sel]} square)`:''}.`);
    if(!rapid&&s.last&&s.last.skip!=null&&sel==null) ctx.say(`${name(s.last.skip)} ran out of time for that turn. ${name(p)} is up.`);
    if(!rapid&&s.out[p]===0&&s.out[1-p]) ctx.say(`${name(1-p)} is out of time. ${name(p)} plays on alone.`);
    return wrap;
  }});

/* keyboard: 1 to 9 places a number, arrow keys move around the grid; the clocks tick here too */
if(typeof document!=='undefined'){
  document.addEventListener('keydown',e=>{
    if(typeof S==='undefined'||S.gid!=='duosudoku'||!S.state||S.busy) return;
    if(e.target.closest&&e.target.closest('input,select,textarea,dialog')) return;
    const b=document.getElementById('board');if(!b||!b.offsetParent) return;
    if(/^[1-9]$/.test(e.key)){
      const s=S.state,q=s.mode==='turns'?s.turn:sdkOnline()?Online.me:0;
      const k=b.querySelector(`.sdk-pad button[data-d="${e.key}"][data-p="${q}"]`);if(k&&!k.disabled){e.preventDefault();k.click()}return;
    }
    const mv={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1}[e.key];
    if(mv==null) return;
    const i=S.ui.sel??40,j=i+mv;
    if(j<0||j>80||(Math.abs(mv)===1&&(i/9|0)!==(j/9|0))) return;
    e.preventDefault();S.ui.sel=j;renderPlay();
    const c=b.querySelector(`.sdk-grid .sc[data-i="${j}"]`);if(c)c.focus({preventScroll:true});
  });
  setInterval(()=>{
    if(typeof S==='undefined'||S.gid!=='duosudoku'||!S.state||S.over||S.busy) return;
    const s=S.state,fire=()=>{const t=sdkClock.timeout;sdkClock.timeout=null;if(t)t()};
    document.querySelectorAll('#board .sdk-cold').forEach(e=>{const left=sdkCold(s,+e.dataset.cold);e.textContent=`No points ${Math.ceil(left/1000)}s`;e.hidden=left<=0});
    if(s.mode==='daily'){if(s.t0&&!s.fin)document.querySelectorAll('#board .sdk-dclock').forEach(e=>{e.textContent=sdkUp(sdkTook(s))});return}
    if(s.mode==='rapid'){
      if(!s.deadline||s.ended) return;
      const left=s.deadline-sdkNow();
      document.querySelectorAll('#board .sdk-gclock').forEach(e=>{e.textContent=sdkFmt(left);e.classList.toggle('low',left<30000)});
      if(left<=0) fire();
      return;
    }
    const p=s.turn;if(!s.n||s.out[p]) return;
    const spent=Date.now()-sdkClock.t,tot=s.limit?s.clock[p]-spent:Infinity,turn=s.turnLimit?s.turnLimit-spent:Infinity;
    document.querySelectorAll(`#board .sdk-clock[data-p="${p}"]`).forEach(e=>{e.textContent=sdkFmt(tot);e.classList.toggle('low',tot<30000)});
    document.querySelectorAll('#board .sdk-turnbar').forEach(e=>{e.querySelector('i').style.setProperty('--w',Math.max(0,turn/s.turnLimit*100)+'%');e.lastChild.textContent=Math.max(0,Math.ceil(turn/1000))+'s';e.classList.toggle('low',turn<10000)});
    if(tot>0&&turn>0) return;
    const mine=!sdkOnline()||Online.me===p;
    if(mine||Math.min(tot,turn)<-4000) fire();
  },250);
}
