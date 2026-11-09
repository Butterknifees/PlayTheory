"use strict";
/* Elo ratings, the way chess sites do them. Everyone starts at 1200, with one rating for rapid fire (daily challenges count
   as rapid fire) and one for take turns. A game is rated when it's played online, both players are signed in with Google,
   and at least 10 numbers were placed. When a game starts, both ratings are copied into its state (s.elo), so the two
   devices work from the same before-game numbers. At the end each device saves its own player's new rating at
   ratings/<pool>/<uid>, together with a once-only marker at rated/<match>/<game>/<uid>. The database rules cap the change
   at 40 points a game and check that the match and the opponent are real, but they can't replay the game, so a determined
   cheater could still fake results (accepted for now; a Cloud Function could do the sums on the server later). */
const Rating=(()=>{
  const START=1200,MIN_MOVES=10,POOLS={rapid:'Rapid fire',turns:'Take turns'};
  let mine={},last=null,pool='rapid',lq=null,rows=null,err='',wn=0,nudged=false;
  const done=new Set();
  const db=()=>firebase.database(),T=()=>firebase.database.ServerValue.TIMESTAMP;
  const uid=()=>{const u=window.firebase&&firebase.apps.length&&firebase.auth().currentUser;return u&&!u.isAnonymous?u.uid:null};
  const poolOf=s=>s.mode==='turns'?'turns':'rapid';
  const cur=p=>mine[p]||{r:START,n:0,w:0,l:0,d:0};
  const K=n=>n<10?40:20; // the first 10 games move a rating faster, like a new chess account
  const PITCH={title:'Get your rating',text:'Sign in with Google to get a chess-style rating and a place in the player rankings. Online games against other signed-in players are rated.'};

  /* ---------- your own ratings, and posting them to the match ---------- */
  async function load(){
    const u=uid();if(!u){mine={};return}
    const got=await Promise.all(Object.keys(POOLS).map(p=>db().ref(`ratings/${p}/${u}`).get()));
    mine={};Object.keys(POOLS).forEach((p,i)=>{if(got[i].exists())mine[p]=got[i].val()});
  }
  /* each signed-in player posts both ratings to the match (matches/<id>/elo/<side>) */
  async function publish(){
    if(!Online.on||!uid()) return;
    try{await load();await db().ref(`matches/${Online.id}/elo/${PC[Online.me]}`).set({rapid:cur('rapid').r,turns:cur('turns').r})}
    catch(e){console.warn('Could not post the rating.',e)}
  }
  const posted=(p,side)=>{const m=Online.match,e=m&&m.elo&&m.elo[PC[side]];return e&&typeof e[p]==='number'?e[p]:null};
  /* the before-game ratings that go into the state when a game starts; null when the game can't be rated */
  function snap(s){
    if(!Online.on) return null;
    const p=poolOf(s),a=posted(p,0),b=posted(p,1);
    return a!=null&&b!=null?[a,b]:null;
  }
  /* the rating shown beside a player's name */
  function tag(q,s){
    if(!Online.on||!s) return null;
    const r=s.elo?s.elo[q]:posted(poolOf(s),q);
    return r==null?null:el('small',{class:'elo'},String(r));
  }

  /* ---------- a finished game ---------- */
  async function result(s,over){
    if(S.gid!=='duosudoku'||!over) return;
    if(!uid()){if(!over.daily)nudge();return} // the daily challenge asks for itself (js/daily.js)
    if(!Online.on||!s.elo||!s.g||s.n<MIN_MOVES) return;
    const key=Online.id+'/'+s.g;if(done.has(key)) return;done.add(key);
    const p=poolOf(s),me=Online.me,m=Online.match,u=uid(),opp=me===0?m.guest:m.host;
    try{
      await load();
      const c=cur(p),sc=over.winner==='draw'?.5:over.winner===me?1:0,E=1/(1+Math.pow(10,(s.elo[1-me]-c.r)/400));
      const r=Math.max(100,c.r+Math.round(K(c.n)*(sc-E)));
      await db().ref().update({
        [`rated/${Online.id}/${s.g}/${u}`]:{r0:c.r,r1:r,at:T()},
        [`ratings/${p}/${u}`]:{r,n:(c.n||0)+1,w:(c.w||0)+(sc===1?1:0),l:(c.l||0)+(sc===0?1:0),d:(c.d||0)+(sc===.5?1:0),
          name:(Account.name||'Player').slice(0,40),opp,m:Online.id,g:s.g,at:T()}
      });
      mine[p]={...c,r,n:(c.n||0)+1};last={key,p,from:c.r,to:r};
      db().ref(`matches/${Online.id}/elo/${PC[me]}/${p}`).set(r).catch(()=>{});
    }catch(e){console.warn('Could not save the rating.',e);last={key,err:1}}
    if(S.over&&S.state===s&&!S.busy) renderPlay();
  }
  /* not signed in: once a visit, a finished game offers sign-in */
  function nudge(){
    if(nudged) return;nudged=true;
    setTimeout(()=>{if(S.over&&!uid()&&!$('dailyDlg').open)Account.open(null,PITCH)},2600);
  }
  /* this game's rating change, once it's saved: {p, from, to} */
  function change(s){const k=Online.on&&s&&s.g?Online.id+'/'+s.g:'';return last&&last.key===k&&!last.err?last:null}
  /* a line for the result box: the rating change, or why there wasn't one */
  function line(s){
    if(!s||S.gid!=='duosudoku') return null;
    const k=Online.on&&s.g?Online.id+'/'+s.g:'';
    if(last&&last.key===k) return el('p',{class:'elo-line'},last.err?'Could not save your rating this time.':
      `${POOLS[last.p]} rating: ${last.from} → ${last.to} (${last.to>=last.from?'+':''}${last.to-last.from})`);
    if(!uid()){const b=el('button',{class:'linkish',type:'button'},'Sign in to get a rating');b.addEventListener('click',()=>Account.open(null,PITCH));return el('p',{class:'elo-line'},b)}
    if(Online.on&&!s.elo) return el('p',{class:'elo-line fine'},'Not rated: both players need to be signed in when the game starts.');
    if(Online.on&&s.n<MIN_MOVES) return el('p',{class:'elo-line fine'},`Not rated: fewer than ${MIN_MOVES} numbers were placed.`);
    return null;
  }

  /* ---------- the rankings ---------- */
  function watch(){
    unwatch();rows=null;err='';const n=++wn;
    Online.connect().then(()=>{
      if(n!==wn) return;
      load().then(()=>{if(n===wn)panel()}).catch(()=>{});
      lq=db().ref('ratings/'+pool).orderByChild('r').limitToLast(50);
      lq.on('value',v=>{const a=[];v.forEach(c=>{a.push({id:c.key,...c.val()})});rows=a.reverse();panel()},
        ()=>{err='Could not load the rankings. Try again in a moment.';panel()});
    }).catch(e=>{err=e.message||String(e);panel()});
  }
  function unwatch(){if(lq){lq.off();lq=null}}
  function panel(){
    const box=$('rankBody');if(!box) return;
    const me=uid(),kids=[];
    const tab=(p)=>{const b=el('button',{class:'seg',type:'button','aria-pressed':String(pool===p)},POOLS[p]);b.addEventListener('click',()=>{if(pool!==p){pool=p;watch();panel()}});return b};
    kids.push(el('h2',{},'Player rankings'),el('div',{class:'lb-tabs',role:'group','aria-label':'Which rating'},...Object.keys(POOLS).map(tab)),
      el('p',{class:'fine'},'Ratings work like chess: everyone starts at 1200, a win against a stronger player gains more, and a loss to a weaker one costs more. Online games between two signed-in players count when at least 10 numbers are placed. Daily challenges count as rapid fire.'));
    if(me){const c=cur(pool);kids.push(el('p',{class:'lb-note'},`Your ${POOLS[pool].toLowerCase()} rating: `,el('b',{},String(c.r)),c.n?` · ${c.n} rated ${c.n===1?'game':'games'}`:' · no rated games yet'))}
    else{const b=el('button',{class:'btn primary',type:'button'},'Sign in to get a rating');b.addEventListener('click',()=>{close();Account.open(()=>open(pool),PITCH)});kids.push(b)}
    if(err) kids.push(el('p',{class:'net-err',role:'alert'},err));
    else if(!rows) kids.push(el('p',{class:'net-wait'},el('span',{class:'spin','aria-hidden':'true'}),'Loading…'));
    else if(!rows.length) kids.push(el('p',{},'No rated games yet. Play a signed-in friend online to be first on the list.'));
    else kids.push(el('ol',{class:'lb'},...rows.map((r,i)=>{const n=Number(r.n)||0;
      return el('li',{class:'lb-row'+(r.id===me?' me':'')},el('span',{class:'lb-n'},String(i+1)),
        el('span',{class:'lb-pair'},el('b',{},String(r.name||'Player'))),
        el('span',{class:'lb-t'},el('b',{},String(Number(r.r)||START)+(n<10?'?':'')),el('small',{},`${n} ${n===1?'game':'games'} · ${Number(r.w)||0} won`)))})));
    kids.push(el('p',{class:'fine'},'A ? means the rating is still settling: it has fewer than 10 rated games.'));
    const x=el('button',{class:'dlg-x',type:'button','aria-label':'Close'},'×');x.addEventListener('click',close);
    box.replaceChildren(x,...kids);
  }
  function open(p){
    if(p&&POOLS[p]) pool=p;
    watch();panel();
    const dl=$('rankDlg');if(!dl.open){try{dl.showModal()}catch(e){dl.setAttribute('open','')}}
  }
  function close(){const dl=$('rankDlg');if(dl.open){try{dl.close()}catch(e){dl.removeAttribute('open')}}}
  /* for the account panel: your ratings in one line */
  function summary(){
    return el('p',{class:'fine'},'Ratings: '+Object.keys(POOLS).map(p=>`${POOLS[p]} ${cur(p).r}${mine[p]?'':' (unrated)'}`).join(' · '));
  }
  function init(){
    $('rankDlg').addEventListener('click',e=>{if(e.target===$('rankDlg'))close()});
    $('rankDlg').addEventListener('close',unwatch);
  }
  return {init,open,publish,snap,tag,result,line,change,summary,load,PITCH,POOLS};
})();
