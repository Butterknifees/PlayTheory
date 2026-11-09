"use strict";
/* Play a friend on another device. "Challenge a friend" makes a private match in a Firebase Realtime
   Database and a link to send; "Make a room" makes the same kind of match with a short code to type in
   instead. Whoever joins first (link or code) plays black on their own device.
   Every change (a move, undo, new position, another game, who starts) is written as a snapshot with a
   sequence number, and the other device replays it. Each device only lets its own player move.
   Without FIREBASE_CONFIG (js/firebase-config.js) this stays off and the game is one screen only. */
const Online=(()=>{
  const SDK='https://cdn.jsdelivr.net/npm/firebase@10.12.2/';
  /* checksums of the exact SDK files, so a tampered copy on the CDN is refused instead of run */
  const SRI={
    'firebase-app-compat.js':'sha384-AQ3POAMqIhwS81FrUH95ekxqBZHeP5tG2JfEL3+7GuTtfRLWnrRh32UxwzM+//A9',
    'firebase-auth-compat.js':'sha384-TnlRYaR4JYz/lpaGuaiU61PjNberSA4vjLjtF+oRC/IkohkJqnWxw5EmDSOt1vA1',
    'firebase-database-compat.js':'sha384-1/m+A1jVWbD3yiK3/vtFvm1+LjK1WLpSoDY+Kaxppwn/yP9BVSgdHTNQVOjrzUO5',
    'firebase-app-check-compat.js':'sha384-E3vxFxXu8FhW5kvqdQJ5Yf8ugrV7iCJP8jgnItRH2Rk8Q08cJzJGTi/oMC3FEp3j'
  };
  const CODE_TTL=24*60*60*1000; // room codes stop working after a day (database.rules.json says the same)
  const ID_CHARS='abcdefghijkmnpqrstuvwxyz23456789',CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const st={on:false,me:0};
  /* this page's version (the ?v= on this script); each snapshot carries it, so a friend on an older copy is asked to refresh */
  const BUILD=(()=>{const c=document.currentScript,m=c&&/[?&]v=(\d+)/.exec(c.src);return m?+m[1]:0})();
  let newer=false;
  let db=null,uid=null,ref=null,id=null,seq=0,lastTok=null,lastData=null,offset=0,applying=false,fresh=false,match=null,sdkP=null,nameT=null,replayT=null,err='',busyMsg='',mode='link',codeDraft='';
  const configured=()=>typeof FIREBASE_CONFIG!=='undefined'&&!!FIREBASE_CONFIG&&!!FIREBASE_CONFIG.apiKey;
  const other=()=>1-st.me;
  const link=()=>location.origin+location.pathname+'?vs='+id;

  /* ---------- connection ---------- */
  function script(f){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=SDK+f;s.integrity=SRI[f];s.crossOrigin='anonymous';s.onload=ok;s.onerror=()=>no(new Error('Could not load the online service. Check your connection.'));document.head.append(s)})}
  function connect(){
    if(sdkP) return sdkP;
    sdkP=(async()=>{
      const appCheck=typeof APP_CHECK_SITE_KEY==='string'&&APP_CHECK_SITE_KEY;
      if(!window.firebase){await script('firebase-app-compat.js');await Promise.all([script('firebase-auth-compat.js'),script('firebase-database-compat.js'),appCheck&&script('firebase-app-check-compat.js')])}
      if(!firebase.apps.length){
        firebase.initializeApp(FIREBASE_CONFIG);
        if(appCheck) firebase.appCheck().activate(appCheck,true); // proves requests come from this site, not a script
      }
      /* a saved Google sign-in (js/account.js) comes back on its own; only sign in anonymously without one */
      const auth=firebase.auth(),saved=auth.currentUser||await new Promise(ok=>{const off=auth.onAuthStateChanged(u=>{off();ok(u)})});
      uid=(saved||(await auth.signInAnonymously()).user).uid;db=firebase.database();
      auth.onAuthStateChanged(u=>{if(u)uid=u.uid});
      db.ref('.info/serverTimeOffset').on('value',s=>{offset=s.val()||0});
    })();
    sdkP.catch(()=>{sdkP=null});
    return sdkP;
  }
  const denied=e=>/permission.denied/i.test((e&&(e.code||e.message))||'');
  const snap=()=>JSON.stringify({b:BUILD,gid:S.gid,state:S.state,hist:S.hist.slice(-60),who:S.who.slice(-60),starter:S.starter});

  /* ---------- making and accepting a challenge ---------- */
  const rand=(chars,n)=>Array.from({length:n},()=>chars[R(0,chars.length-1)]).join('');
  async function challenge(asRoom){
    await connect();
    mode=asRoom?'room':'link';
    for(let i=0;i<5;i++){
      const m=rand(ID_CHARS,12),data=snap();
      const res=await db.ref('matches/'+m).transaction(r=>r===null?{v:1,host:uid,created:Date.now(),seq:1,kind:'game',by:0,snap:data,names:{L:S.me||S.names[0]||''}}:undefined);
      if(res.committed){seq=1;lastTok=null;fresh=false;record(m,res.snapshot.val());await roomCode(m);return enter(m,0)}
    }
    throw new Error('Could not start a match. Try again.');
  }
  /* every match also gets a 5-letter room code that points at it, for friends who would rather type */
  async function roomCode(m){
    try{
      for(let i=0;i<6;i++){
        const c=rand(CODE_CHARS,5);
        /* the rules refuse a code that is taken and still fresh, so a refusal just means try another */
        try{await db.ref('codes/'+c).set({m,host:uid,at:firebase.database.ServerValue.TIMESTAMP})}catch(e){if(denied(e))continue;throw e}
        await db.ref('matches/'+m+'/code').set(c);return c;
      }
      console.warn('Could not get a room code. Are the database rules up to date?');
    }catch(e){console.warn('Room codes are not enabled in the database rules yet.',e)}
    return null;
  }
  async function joinCode(raw){
    const c=String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(c.length!==5) throw new Error('Room codes have 5 letters and numbers.');
    await connect();
    let r=null;
    try{r=(await db.ref('codes/'+c).get()).val()}catch(e){if(!denied(e))throw e} // expired or already joined
    if(!r||!r.m) throw new Error(`No open room called ${c}. Check the code. Codes last a day and work for one friend.`);
    return accept(r.m);
  }
  async function accept(m){
    await connect();
    let r;
    try{r=(await db.ref('matches/'+m).get()).val()}catch(e){if(denied(e))throw new Error('Someone else already joined this match.');throw e}
    if(!r) throw new Error('This match has ended or does not exist.');
    if(r.host===uid){seq=0;fresh=true;return enter(m,0)}
    const res=await db.ref('matches/'+m+'/guest').transaction(g=>(g===null||g===uid)?uid:undefined);
    if(!res.committed) throw new Error('Someone else already joined this match.');
    seq=0;fresh=true;return enter(m,1);
  }
  function enter(m,seat){
    id=m;st.me=seat;st.on=true;ref=db.ref('matches/'+m);
    const me=ref.child('online/'+PC[seat]);
    db.ref('.info/connected').on('value',s=>{if(s.val()===true){me.onDisconnect().set(false);me.set(true)}});
    if(S.me){S.names[seat]=S.me;S.names[1-seat]='';ref.child('names/'+PC[seat]).set(S.me)}
    ref.on('value',s=>receive(s.val()));
    setURL(m);document.body.classList.add('online');
    names();bar();if(!S.busy) renderPlay();
    if(typeof Rating!=='undefined') Rating.publish(); // a signed-in player's ratings, for a rated game
  }
  /* the host ending a match frees its room code; the match itself is kept (games are saved for a bot to learn from) */
  function end(){
    const code=st.on&&st.me===0&&match&&match.code;
    if(code) db.ref('codes/'+code).remove().catch(()=>{});
    leave();
  }
  function leave(msg){
    if(!st.on) return;
    try{ref.child('online/'+PC[st.me]).set(false);ref.off();db.ref('.info/connected').off()}catch(e){}
    clearTimeout(replayT);clearTimeout(nameT);
    st.on=false;ref=null;id=null;match=null;seq=0;lastTok=null;
    setURL(null);document.body.classList.remove('online');lock(false);
    S.names=[S.me,S.opp];
    names();bar();renderPlay();
    if(msg) note(msg);
  }
  function setURL(m){
    try{const u=new URL(location.href);if(m)u.searchParams.set('vs',m);else u.searchParams.delete('vs');history.replaceState(null,'',u)}catch(e){}
  }

  /* ---------- sending ---------- */
  /* op, when given, re-applies this move on top of a newer state, so two moves made at the same
     moment (rapid fire) are merged instead of one being lost */
  function push(kind,op){
    if(!st.on||applying||!ref) return;
    const m=id,base=seq,data=snap(),tok=uid+':'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);lastTok=tok;lastData=data;
    ref.transaction(r=>{
      if(!r) return;
      if((r.seq||0)===base){r.seq=base+1;r.kind=kind;r.by=st.me;r.tok=tok;r.snap=data;return r}
      if(!op) return;
      let d;try{d=JSON.parse(r.snap)}catch(e){return}
      const n=op(d.state);if(!n) return;
      d.state=n;r.seq=(r.seq||0)+1;r.kind=kind;r.by=st.me;r.tok=tok;r.snap=JSON.stringify(d);return r;
    }).then(res=>{if(res.committed)record(m,res.snapshot.val())}).catch(e=>note('Could not send that: '+e.message));
  }
  /* every change is also written once to logs/<match>/<seq>, which nobody listens to, so whole games
     are kept for training a bot (the match itself only holds the last 60 positions) */
  function record(m,r){
    if(!r||!r.seq) return;
    let d;try{d=JSON.parse(r.snap)}catch(e){return}
    db.ref('logs/'+m+'/'+r.seq).set({k:r.kind,b:r.by,g:d.gid,s:JSON.stringify(d.state),t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
  }
  function setName(p){
    if(!st.on||p!==st.me) return;
    clearTimeout(nameT);nameT=setTimeout(()=>ref&&ref.child('names/'+PC[p]).set(S.names[p]||''),400);
  }

  /* ---------- receiving ---------- */
  function receive(r){
    if(!st.on) return;
    if(!r){leave('The challenge was closed.');return}
    const arrived=st.me===0&&!!r.guest&&!(match&&match.guest);
    match=r;
    const nm=(r.names||{})[PC[other()]]||'',mine=(r.names||{})[PC[st.me]]||'';
    let renamed=false;
    if(nm!==S.names[other()]){S.names[other()]=nm;renamed=true}
    if(!S.names[st.me]&&mine){S.names[st.me]=mine;renamed=true}
    if((r.seq||0)>seq){
      seq=r.seq;
      if(r.tok!==lastTok||r.snap!==lastData||fresh) apply(r); // our own write echoing back unchanged needs no replay
    }else if(renamed){renderInfo();if(!S.busy)renderPlay()}
    names();bar();
    /* your friend just joined: put the link away and go to the board, where the game is set up */
    if(arrived){close();const box=$('intro');if(document.body.dataset.view==='play'&&!box.hidden&&!box.classList.contains('out'))enterGame()}
  }
  function apply(r){
    let d;try{d=JSON.parse(r.snap)}catch(e){return}
    if(d.b>BUILD&&!newer){newer=true;bar()} // the friend's PlayTheory is newer than this page
    const g=GAMES.find(x=>x.id===d.gid);if(!g||!playable(g.id)) return;
    applying=true;
    try{
      clearTimeout(replayT);
      const prev=S.state,same=!fresh&&r.kind!=='game'&&d.gid===S.gid,free=same&&g.anyTurn&&g.anyTurn(d.state),joined=fresh;
      fresh=false;
      S.state=d.state;S.hist=d.hist||[];S.who=d.who||[];S.starter=d.starter||0;
      if(!free) S.ui={};
      if(!same){
        S.gid=d.gid;S.game=g;closeSheet();S.sawHow=false;lock(false);
        renderInfo();renderPlay();Demo.start(g,$('demoBox'),$('demoCap'));showIntro();
        if(joined) enterGame(); // just joined by code or link: straight to the board, no intro to tap through
      }else if(free){renderPlay();if(S.over)celebrate()} // everyone plays at once: no replay, keep your selection
      else if(r.kind==='move'&&prev){renderInfo();replay(prev,d.state,r.by)}
      else{lock(false);renderInfo();S.entering=r.kind==='new';renderPlay(true);Sound.fx(r.kind==='undo'?'undo':'pick')}
    }finally{applying=false}
  }
  /* show the friend's move: what changed fades out, then the new pieces pop in */
  function replay(prev,next,mover){
    const dead={live:false,ui:{},play(){},redraw(){},say(){},busy(){}};
    let a,b;
    try{a=S.game.render(prev,dead);b=S.game.render(next,dead)}catch(e){lock(false);renderPlay(true);return}
    Demo.mark(a,b);
    const board=$('board'),show=n=>{board.replaceChildren(n);Skins.decorate(S.gid,board);fitBox(board)};
    lock(true);show(a);Sound.fx(S.game.sfx,{p:mover});
    replayT=setTimeout(()=>{
      show(b);b.querySelectorAll('[data-din]').forEach(e=>e.classList.add('d-in'));
      replayT=setTimeout(()=>{lock(false);renderPlay(true);if(S.over)celebrate()},650);
    },450);
  }

  /* ---------- what the rest of the app asks ---------- */
  const mayMove=()=>!st.on||!!(S.state&&(S.state.turn===st.me||(S.game&&S.game.anyTurn&&S.game.anyTurn(S.state))));
  const mayUndo=()=>!st.on||(S.who.length>0&&S.who[S.who.length-1]===st.me);
  const friendHere=()=>!!(match&&match.guest&&match.online&&match.online[PC[other()]]);
  const friendJoined=()=>!!(match&&match.guest);
  const liveCode=()=>match&&match.code&&!(match.created&&Date.now()+offset-match.created>CODE_TTL)?match.code:null;

  /* ---------- interface ---------- */
  function names(){
    [['nameL',0],['nameR',1]].forEach(([i,p])=>{
      const inp=$(i),theirs=st.on&&p!==st.me;
      inp.disabled=theirs;
      if(theirs){inp.value=S.names[p];inp.placeholder=friendJoined()?'Friend':'Waiting…'}
      else{inp.placeholder=p===0?'Your name':'Their name';if(st.on)inp.placeholder='Your name';if(inp.value!==S.names[p])inp.value=S.names[p]}
    });
  }
  function bar(){
    const nb=$('netBar');
    $('onlineBtn').setAttribute('aria-pressed',String(st.on));
    if(!st.on){nb.hidden=true;if($('onlineDlg').open)panel();return}
    nb.hidden=false;
    const them=name(other()),code=liveCode();
    const status=!friendJoined()?(code?`Waiting for your friend · Room ${code}`:'Waiting for your friend to open the link'):friendHere()?`${them} is here`:`${them} is away`;
    const inv=el('button',{class:'btn small',type:'button'},friendJoined()?'Match':'Invite');inv.addEventListener('click',open);
    nb.className='netbar'+(friendHere()?' here':'');
    /* refreshing keeps the match: the link (?vs=) is in the address bar, so the page joins it again */
    const up=newer?el('button',{class:'btn small primary',type:'button',title:'Your friend has a newer PlayTheory. Refresh to get it; the match carries on.'},'Update'):null;
    if(up) up.addEventListener('click',()=>location.reload());
    nb.replaceChildren(el('span',{class:'live-dot','aria-hidden':'true'}),
      el('span',{class:'nb-text'},el('b',{},`You play ${CNAME[PC[st.me]]}`),el('span',{},newer?'PlayTheory was updated. Refresh to match your friend.':status)),...(up?[up]:[]),inv);
    if($('onlineDlg').open) panel();
  }
  function note(m){err=m;if(!$('onlineDlg').open) open();else panel()}

  async function shareLink(btn){
    const url=link(),text=`${name(st.me)!==SIDE[st.me]?name(st.me)+' challenges':'I challenge'} you to ${S.game?S.game.name:'a game'} on PlayTheory`;
    try{
      if(navigator.share&&touchUI()){await navigator.share({title:'PlayTheory challenge',text,url});return}
      await navigator.clipboard.writeText(url);btn.textContent='Link copied ✓';setTimeout(()=>{btn.textContent='Copy link'},1800);
    }catch(e){if(e&&e.name!=='AbortError'){$('vsLink').select();btn.textContent='Select and copy the link above'}}
  }
  function panel(){
    const box=$('onlineBody'),kids=[];
    if(!configured()){
      kids.push(el('h2',{},'Play on two devices'),
        el('p',{},'Online challenges are not switched on for this copy of PlayTheory yet. The site owner needs to add a Firebase project (see ONLINE.md in the code).'));
    }else if(busyMsg){
      kids.push(el('h2',{},'Play on two devices'),el('p',{class:'net-wait'},el('span',{class:'spin','aria-hidden':'true'}),busyMsg));
    }else if(!st.on){
      const inGame=S.game&&!$('table').hidden;
      kids.push(el('h2',{},'Play on two devices'));
      if(inGame){
        const go=el('button',{class:'btn primary big',type:'button',autofocus:''},'Challenge a friend');
        go.addEventListener('click',()=>run('Creating your challenge…',()=>challenge(false)));
        const room=el('button',{class:'btn big',type:'button'},'Make a room');
        room.addEventListener('click',()=>run('Making your room…',()=>challenge(true)));
        kids.push(el('p',{},`Play ${S.game.name} with a friend: you on blue on this device, them on black on theirs.`),
          el('div',{class:'net-opts'},
            el('div',{class:'net-opt'},go,el('p',{class:'fine'},'Get a link to send them.')),
            el('div',{class:'net-opt'},room,el('p',{class:'fine'},'Get a short code to tell them.'))));
      }else kids.push(el('p',{},'To start a match, open a game and choose Play a friend online.'));
      const inp=el('input',{class:'code-in',maxlength:'5',placeholder:'K7Q2M',autocomplete:'off',autocapitalize:'characters',spellcheck:'false','aria-label':'Room code',value:codeDraft});
      inp.addEventListener('input',()=>{codeDraft=inp.value});
      const join=el('button',{class:'btn'+(inGame?'':' primary'),type:'button'},'Join');
      const go2=()=>run('Joining the room…',()=>joinCode(inp.value).then(()=>{codeDraft='';close()}));
      join.addEventListener('click',go2);inp.addEventListener('keydown',e=>{if(e.key==='Enter')go2()});
      kids.push(el('div',{class:'net-join'},el('h3',{},'Join a room'),el('p',{class:'fine'},'Got a code from a friend? Type it here.'),el('div',{class:'row'},inp,join)));
    }else{
      const inp=el('input',{id:'vsLink',class:'vs-link',readonly:'',value:link(),'aria-label':'Challenge link'});
      inp.addEventListener('focus',()=>inp.select());
      const share=el('button',{class:'btn primary big',type:'button',autofocus:''},navigator.share&&touchUI()?'Share link':'Copy link');
      share.addEventListener('click',()=>shareLink(share));
      const quit=el('button',{class:'btn',type:'button'},'End online match');
      quit.addEventListener('click',()=>{end();close()});
      const back=el('button',{class:'btn',type:'button'},'Back to the board');back.addEventListener('click',close);
      const code=liveCode(),codeBox=code?el('div',{class:'room-code','aria-label':'Room code '+code.split('').join(' ')},...code.split('').map(ch=>el('span',{},ch))):null;
      const room=mode==='room'&&code&&!friendJoined();
      kids.push(el('h2',{},friendJoined()?`Playing ${name(other())}`:room?'Your room':'Your challenge link'),
        friendJoined()?el('p',{},`You play ${CNAME[PC[st.me]]} on this device. ${friendHere()?name(other())+' is connected.':name(other())+' is away right now; moves will show up when they are back.'}`)
          :room?el('p',{},'Tell your friend this code. They open DuSoKu on PlayTheory, tap Join a room, and type it in.')
          :el('p',{},'Send this link to your friend. The game starts as soon as they open it.'),
        ...(room?[codeBox,el('p',{class:'fine'},'Or send them the link instead:'),inp,el('div',{class:'row'},share,back)]
          :[inp,el('div',{class:'row'},share,back),code&&!friendJoined()?el('p',{class:'fine'},'Or tell them the room code: ',el('b',{class:'mono'},code)):null]),
        el('p',{class:'fine'},'Either of you can deal a new game or start a new position; it changes on both screens.'+(S.game&&S.game.noUndo?'':' You can undo your own last move.')),quit);
    }
    if(err) kids.push(el('p',{class:'net-err',role:'alert'},err));
    const x=el('button',{class:'dlg-x',type:'button','aria-label':'Close'},'×');x.addEventListener('click',close);
    box.replaceChildren(x,...kids.filter(Boolean));
  }
  async function run(msg,fn){
    err='';busyMsg=msg;panel();
    try{await fn()}catch(e){err=e.message||String(e)}
    busyMsg='';panel();
  }
  function open(){
    panel();const d=$('onlineDlg');
    if(!d.open){try{d.showModal()}catch(e){d.setAttribute('open','')}}
  }
  function close(){err='';const d=$('onlineDlg');if(d.open){try{d.close()}catch(e){d.removeAttribute('open')}}}

  function init(){
    $('onlineBtn').addEventListener('click',open);
    $('onlineDlg').addEventListener('click',e=>{if(e.target===$('onlineDlg'))close()});
    $('onlineDlg').addEventListener('close',()=>{err=''});
    let m=null;try{m=new URL(location.href).searchParams.get('vs')}catch(e){}
    if(m&&/^[a-z0-9]{12}$/.test(m)){
      if(!configured()){open();return}
      open();run('Joining the challenge…',()=>accept(m).then(close));
    }
  }
  return {init,open,connect,push,setName,mayMove,mayUndo,leave,end,st,get on(){return st.on},get friend(){return friendJoined()},get me(){return st.me},get offset(){return offset},get id(){return id},get match(){return match}};
})();
