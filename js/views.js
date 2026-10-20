"use strict";
/* Board views shared by several games. Each view calls ctx.play(nextState, animation, options). */

function heapsView(heaps,ctx,o){
  const wrap=el('div',{class:'heaps'+(o.box?' boxes':'')});
  heaps.forEach((cnt,h)=>{
    const col=el('div',{class:'heap'}),stack=el('div',{class:'stack'}),items=[];
    for(let i=0;i<cnt;i++){
      const ok=ctx.live&&(o.can?o.can(h,i):true);
      const b=el('button',{class:'ctr'+(ok?' ok':''),type:'button',disabled:!ok,'aria-label':`${o.unit||'Heap'} ${h+1}, item ${i+1} of ${cnt}`});
      items.push(b);stack.append(b);
    }
    items.forEach((b,i)=>{
      if(b.disabled) return;
      const cls=o.hot||'doom';
      hov(b,()=>items.forEach((x,j)=>x.classList.toggle(cls,j>=i)),()=>items.forEach(x=>x.classList.remove(cls)));
      b.addEventListener('click',()=>{
        const moving=items.filter((_,j)=>j>=i);
        o.go(h,i,()=>FX.vanish(moving,o.hot==='lift'?'split':'fly'));
      });
    });
    const cap=o.caption?o.caption(h,cnt):el('div',{class:'heap-n'},String(cnt));
    col.append(stack,cap);wrap.append(col);
  });
  return wrap;
}

function stripsView(s,ctx,mv){
  const p=s.turn,wrap=el('div',{class:'strips'});
  s.strips.forEach((st,k)=>{
    const row=el('div',{class:'strip'}),cells=st.map(()=>el('div',{class:'sq'}));
    st.forEach((v,i)=>{
      if(!v) return;
      const res=(ctx.live&&v===PC[p])?mv(st,i,p):null;
      if(!res){cells[i].append(el('span',{class:'stone s'+v}));return}
      const b=el('button',{class:'stone s'+v,type:'button','aria-label':`Move the ${CNAME[v]} piece on square ${i+1}`});
      cells[i].append(b);
      const clear=()=>cells.forEach(c=>{c.classList.remove('chg');c.querySelectorAll('.ghost').forEach(g=>g.remove())});
      hov(b,()=>st.forEach((x,j)=>{if(res[j]!==x){cells[j].classList.add('chg');if(res[j])cells[j].append(el('span',{class:'ghost s'+res[j]}))}}),clear);
      b.addEventListener('click',()=>{
        clear();
        const leaving=cells.filter((_,j)=>st[j]&&res[j]!==st[j]).map(c=>c.querySelector('.stone')).filter(Boolean);
        ctx.play(nx(s,n=>n.strips[k]=res),()=>FX.vanish(leaving,'fly',200));
      });
    });
    row.append(...cells);wrap.append(row);
  });
  return wrap;
}
const stripMoves=mv=>s=>s.strips.flatMap((st,k)=>st.flatMap((v,i)=>{if(v!==PC[s.turn])return[];const r=mv(st,i,s.turn);return r?[nx(s,n=>n.strips[k]=r)]:[]}));
const stripHasMove=mv=>(s,p)=>s.strips.some(st=>st.some((v,i)=>v===PC[p]&&mv(st,i,p)));
function randStrips(count,a,b,fill){
  for(;;){
    const strips=Array.from({length:count},()=>Array.from({length:R(a,b)},()=>Math.random()<fill?pick(PC):null));
    const flat=strips.flat();
    if(flat.includes('L')&&flat.includes('R')) return strips;
  }
}

/* select-a-piece-then-a-target boards (Clobber, Konane). movesFrom returns [{to, caps, apply}] */
function jumpView(s,ctx,movesFrom){
  const p=s.turn,b=s.b,RN=b.length,CN=b[0].length,sel=ctx.ui.sel;
  const mv=sel?movesFrom(b,sel[0],sel[1],p):[];
  const g=el('div',{class:'grid board-grid',style:`--c:${CN}`}),sq=b.map(()=>[]);
  for(let r=0;r<RN;r++)for(let c=0;c<CN;c++){
    const v=b[r][c],cell=el('div',{class:'sqr'+((r+c)%2?' dk':'')});sq[r][c]=cell;
    const m=mv.find(x=>x.to[0]===r&&x.to[1]===c);
    const isSel=sel&&sel[0]===r&&sel[1]===c;
    if(m){
      const bt=el('button',{class:'tgt'+(v?' cap':''),type:'button','aria-label':`Move to row ${r+1}, column ${c+1}`},v?el('span',{class:'stone s'+v}):null);
      bt.addEventListener('click',()=>{
        const mover=sq[sel[0]][sel[1]].querySelector('.stone');
        ctx.play(nx(s,n=>m.apply(n.b)),async()=>{
          Sound.fx('slide',{p});
          await FX.slide(mover,cell,240);
          m.caps.forEach(([x,y])=>FX.burstAt(sq[x][y],[FX.color(PC[1-p]),'#ffffff'],22));
          Sound.fx('capture',{p});
          await sleep(90);
        },{silent:true});
      });
      cell.append(bt);
    }else if(v===PC[p]&&ctx.live&&movesFrom(b,r,c,p).length){
      const bt=el('button',{class:'stone s'+v+(isSel?' sel':''),type:'button','aria-label':`${isSel?'Deselect':'Select'} piece at row ${r+1}, column ${c+1}`});
      bt.addEventListener('click',()=>{Sound.fx('pick');ctx.ui.sel=isSel?null:[r,c];ctx.redraw()});
      cell.append(bt);
    }else if(v) cell.append(el('span',{class:'stone s'+v}));
    g.append(cell);
  }
  ctx.say(sel?'Click a highlighted square to finish the move, or click your piece again to choose another.':null);
  return g;
}
const jumpHasMove=movesFrom=>(s,p)=>s.b.some((row,r)=>row.some((v,c)=>v===PC[p]&&movesFrom(s.b,r,c,p).length));
const jumpMoves=movesFrom=>s=>s.b.flatMap((row,r)=>row.flatMap((v,c)=>v===PC[s.turn]?movesFrom(s.b,r,c,s.turn).map(m=>nx(s,n=>m.apply(n.b))):[]));

/* dominoes on a grid (Domineering, Cram) */
const domFree=(b,r,c)=>r>=0&&c>=0&&r<b.length&&c<b[0].length&&b[r][c]===null;
function domPlace(s,a,z,cram){
  return nx(s,n=>{
    const o=cram?'N':PC[s.turn],vert=a[1]===z[1];
    const [x,y]=(a[0]+a[1]<z[0]+z[1])?[a,z]:[z,a];
    n.b[x[0]][x[1]]=o+(vert?'V1':'H1');n.b[y[0]][y[1]]=o+(vert?'V2':'H2');
  });
}
function domMoves(s,cram){
  const out=[],b=s.b;
  for(let r=0;r<b.length;r++)for(let c=0;c<b[0].length;c++){
    if(b[r][c]!==null) continue;
    if((cram||s.turn===0)&&domFree(b,r+1,c)) out.push(domPlace(s,[r,c],[r+1,c],cram));
    if((cram||s.turn===1)&&domFree(b,r,c+1)) out.push(domPlace(s,[r,c],[r,c+1],cram));
  }
  return out;
}
function placeView(s,ctx,cram){
  const p=s.turn,b=s.b,RN=b.length,CN=b[0].length;
  const free=(r,c)=>domFree(b,r,c);
  const cells=b.map(()=>[]),g=el('div',{class:'grid',style:`--c:${CN}`});
  for(let r=0;r<RN;r++)for(let c=0;c<CN;c++){
    const v=b[r][c];
    if(v==='x'){g.append(el('div',{class:'tile block'}));continue}
    if(v){g.append(el('div',{class:`tile piece o${v[0]} k${v.slice(1)}`}));continue}
    const t=el('button',{class:'tile',type:'button',disabled:!ctx.live,'aria-label':`Square at row ${r+1}, column ${c+1}`});
    cells[r][c]=t;g.append(t);
  }
  const ghost=cram?'cand':'g'+PC[p];
  const commit=(a,z)=>{
    const els=[cells[a[0]][a[1]],cells[z[0]][z[1]]];
    ctx.play(domPlace(s,a,z,cram),()=>{els.forEach(e=>e.classList.add(ghost,'stamp'));return sleep(170)});
  };
  const nbrs=(r,c)=>O4.map(([dr,dc])=>[r+dr,c+dc]).filter(([x,y])=>free(x,y));
  const sel=ctx.ui.a;
  for(let r=0;r<RN;r++)for(let c=0;c<CN;c++){
    const t=cells[r][c];if(!t||t.disabled) continue;
    if(!cram){
      const pair=p===0?(free(r+1,c)?[[r,c],[r+1,c]]:free(r-1,c)?[[r-1,c],[r,c]]:null)
                      :(free(r,c+1)?[[r,c],[r,c+1]]:free(r,c-1)?[[r,c-1],[r,c]]:null);
      if(!pair){t.disabled=true;continue}
      hov(t,()=>pair.forEach(([x,y])=>cells[x][y].classList.add(ghost)),()=>pair.forEach(([x,y])=>cells[x][y].classList.remove(ghost)));
      t.addEventListener('click',()=>commit(pair[0],pair[1]));
    }else{
      const isSel=sel&&sel[0]===r&&sel[1]===c;
      const isCand=sel&&Math.abs(sel[0]-r)+Math.abs(sel[1]-c)===1;
      if(isSel){t.classList.add('sel');t.addEventListener('click',()=>{ctx.ui.a=null;ctx.redraw()})}
      else if(isCand){t.classList.add('cand');t.addEventListener('click',()=>commit(sel,[r,c]))}
      else if(!nbrs(r,c).length){t.disabled=true}
      else t.addEventListener('click',()=>{Sound.fx('pick');ctx.ui.a=[r,c];ctx.redraw()});
    }
  }
  if(cram) ctx.say(sel?'Now click a neighbouring highlighted square to finish the domino.':null);
  return g;
}
function domBoard(){
  const [RN,CN]=pick([[4,4],[4,5],[5,4],[5,5],[5,6],[6,5],[6,6]]);
  const b=Array.from({length:RN},()=>Array(CN).fill(null));
  for(let k=R(0,2);k>0;k--) b[R(0,RN-1)][R(0,CN-1)]='x';
  return {b};
}
const domHas=(s,p,cram)=>s.b.some((row,r)=>row.some((v,c)=>v===null&&((cram||p===0)&&domFree(s.b,r+1,c)||(cram||p===1)&&domFree(s.b,r,c+1))));
