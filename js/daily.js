"use strict";
/* The daily challenge: everyone gets the same Duo Sudoku each day (sdkDaily in games.js, new at midnight IST) and races a
   friend on it. When the board is full, the pair's time plus 10 seconds for every wrong number is saved at daily/<day>/<uid>
   in the online database (database.rules.json), with both names and scores. Saving needs a Google sign-in, so a player who
   isn't signed in is asked to at the end. Only the first finished game each day counts for an account, and online the
   host saves it for both players (or the guest, when only the guest is signed in). */
const Daily=(()=>{
  let day='',q=null,rows=null,err='',note=null,saved=new Set(),watchN=0,cardDay='';
  const uid=()=>{const u=window.firebase&&firebase.apps.length&&firebase.auth().currentUser;return u?u.uid:null};

  const PITCH={title:'Get on the leaderboard',text:'Sign in with Google to put your time on today’s daily leaderboard. It also gives you a chess-style rating for online games.'};
  /* ---------- saving a finished game ---------- */
  function done(s,over){
    const k=s.day+':'+s.t0;if(saved.has(k)) return;saved.add(k);
    const m=Online.on&&Online.match,hostIn=!!(m&&m.elo&&m.elo.L);
    if(Online.on&&Online.me!==0&&hostIn){note={day:s.day,text:`${name(0)} saves your time for both of you.`};show(s.day);return}
    if(!Account.signedIn){
      note={day:s.day,text:'Sign in to put this time on the leaderboard.',ask:()=>Account.open(()=>save(s,over),PITCH)};
      setTimeout(()=>{if(S.over&&S.over.daily&&!Account.signedIn)note.ask()},2200);
      return;
    }
    save(s,over);
  }
  async function save(s,over){
    note={day:s.day,text:'Saving your time…'};
    try{
      await Online.connect();
      const ref=firebase.database().ref('daily/'+s.day+'/'+uid());
      if((await ref.get()).exists()) note.text='Only your first finished game each day goes on the leaderboard, so this one was practice.';
      else{
        await ref.set({a:name(0).slice(0,40),b:name(1).slice(0,40),sa:s.score[0],sb:s.score[1],ms:over.ms,wrong:over.wrong,total:over.total,at:firebase.database.ServerValue.TIMESTAMP});
        note={day:s.day,mine:uid(),text:`Saved: ${sdkUp(over.total)} for ${name(0)} and ${name(1)}.`};
      }
    }catch(e){note.text='Could not save your time: '+(e.message||e)}
    show(s.day);
  }
  /* the leaderboard opens by itself once the celebration has had its moment */
  function show(d){setTimeout(()=>{if(S.over&&S.over.daily)open(d);else if($('dailyDlg').open)panel()},2200)}

  /* ---------- reading the board ---------- */
  async function watch(){
    unwatch();rows=null;err='';const n=++watchN;
    try{await Online.connect()}catch(e){err=e.message||String(e);panel();return}
    if(n!==watchN) return;
    q=firebase.database().ref('daily/'+day).orderByChild('total').limitToFirst(50);
    q.on('value',v=>{const a=[];v.forEach(c=>{a.push({id:c.key,...c.val()})});rows=a;panel()},
      ()=>{err='Could not load the leaderboard. Try again in a moment.';panel()});
  }
  function unwatch(){if(q){q.off();q=null}}

  /* ---------- interface ---------- */
  function panel(){
    const box=$('dailyBody');if(!box) return;
    const today=sdkDay(),yday=sdkDay(sdkNow()-DAY),me=uid(),kids=[];
    const tab=(label,d)=>{const b=el('button',{class:'seg',type:'button','aria-pressed':String(day===d)},label);b.addEventListener('click',()=>{if(day!==d){day=d;watch();panel()}});return b};
    kids.push(el('h2',{},'Daily leaderboard'),el('div',{class:'lb-tabs',role:'group','aria-label':'Which day'},tab('Today',today),tab('Yesterday',yday)),
      el('p',{class:'fine'},`${sdkDayName(day)}. Fastest pairs first: the time to fill the board, plus 10 seconds for every wrong number.`));
    if(note&&note.day===day){
      const b=note.ask&&!Account.signedIn?el('button',{class:'linkish',type:'button'},'Sign in'):null;if(b)b.addEventListener('click',()=>{close();note.ask()});
      kids.push(el('p',{class:'lb-note',role:'status'},note.text,b?' ':null,b));
    }else if(!Account.signedIn&&rows){
      const b=el('button',{class:'linkish',type:'button'},'Sign in');b.addEventListener('click',()=>{close();Account.open(null,PITCH)});
      kids.push(el('p',{class:'fine'},'Times are saved for signed-in players. ',b,' to get on the board.'));
    }
    if(err) kids.push(el('p',{class:'net-err',role:'alert'},err));
    else if(!rows) kids.push(el('p',{class:'net-wait'},el('span',{class:'spin','aria-hidden':'true'}),'Loading…'));
    else if(!rows.length) kids.push(el('p',{},day===today?'Nobody has finished today’s puzzle yet. Be the first!':'Nobody finished that day’s puzzle.'));
    else kids.push(el('ol',{class:'lb'},...rows.map((r,i)=>{
      const sa=Number(r.sa)||0,sb=Number(r.sb)||0,who=(n,sc,win)=>el('span',{class:win?'w':null},`${n} ${sc}`);
      return el('li',{class:'lb-row'+(r.id===me||(note&&r.id===note.mine)?' me':'')},el('span',{class:'lb-n'},String(i+1)),
        el('span',{class:'lb-pair'},who(r.a,sa,sa>sb),el('span',{class:'lb-vs'},'vs'),who(r.b,sb,sb>sa)),
        el('span',{class:'lb-t'},el('b',{},sdkUp(Number(r.total)||0)),el('small',{},`${sdkUp(Number(r.ms)||0)} + ${Number(r.wrong)||0} wrong`)));
    })));
    if(note&&note.day===day&&note.mine&&rows&&!rows.some(r=>r.id===note.mine)) kids.push(el('p',{class:'fine'},'Your time is further down than the top 50.'));
    kids.push(el('p',{class:'fine'},`A new puzzle comes at midnight IST, in ${sdkUntil()}.`));
    const inDaily=document.body.dataset.view==='play'&&S.state&&S.state.mode==='daily'&&!S.over;
    if(day===today&&!inDaily){
      const go=el('button',{class:'btn primary big',type:'button'},'Play today’s puzzle');
      go.addEventListener('click',()=>{close();Sound.unlock();startGame(FEATURED,{mode:'daily'})});kids.push(go);
    }
    const x=el('button',{class:'dlg-x',type:'button','aria-label':'Close'},'×');x.addEventListener('click',close);
    box.replaceChildren(x,...kids);
  }
  function open(d){
    day=d||sdkDay();watch();panel();
    const dl=$('dailyDlg');if(!dl.open){try{dl.showModal()}catch(e){dl.setAttribute('open','')}}
  }
  function close(){const dl=$('dailyDlg');if(dl.open){try{dl.close()}catch(e){dl.removeAttribute('open')}}}

  /* the home page card; it redraws itself when the day changes */
  function card(){
    const box=$('daily'),d=sdkDay();if(!box||cardDay===d) return;cardDay=d;
    const play=el('button',{class:'btn primary',type:'button'},'Play today’s puzzle');
    play.addEventListener('click',()=>{Sound.unlock();startGame(FEATURED,{mode:'daily'})});
    const lb=el('button',{class:'btn',type:'button'},'Today’s times');lb.addEventListener('click',()=>open());
    const rk=el('button',{class:'btn',type:'button'},'Player rankings');rk.addEventListener('click',()=>Rating.open());
    box.replaceChildren(el('div',{class:'daily-txt'},
      el('div',{class:'gmeta'},el('span',{class:'chip new'},'Daily challenge'),el('span',{class:'chip'},sdkDayName(d))),
      el('h3',{},'Today’s Duo Sudoku'),
      el('p',{},'The same puzzle for everyone today. Pick a friend, race them in rapid fire, and put your time on the leaderboard (sign in to be listed). Every wrong number adds 10 seconds.')),
      el('div',{class:'daily-go'},play,lb,rk));
  }
  function init(){
    $('dailyDlg').addEventListener('click',e=>{if(e.target===$('dailyDlg'))close()});
    $('dailyDlg').addEventListener('close',unwatch);
    card();setInterval(card,60000);
  }
  return {init,open,done,card};
})();
