"use strict";
/* Play a friend on another device. "Challenge a friend" makes a private match in a Firebase Realtime
   Database and a link to send; "Make a room" makes the same kind of match with a short code to type in
   instead. Whoever joins first (link or code) plays black on their own device.
   Every change (a move, undo, new position, another game, who starts) is written as a snapshot with a
   sequence number, and the other device replays it. Each device only lets its own player move.
   Without FIREBASE_CONFIG (js/firebase-config.js) this stays off and the game is one screen only. */
const Online=(()=>{
  const SDK='https://cdn.jsdelivr.net/npm/firebase@10.12.2/';
  const ID_CHARS='abcdefghijkmnpqrstuvwxyz23456789',CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const st={on:false,me:0};
  let db=null,uid=null,ref=null,id=null,seq=0,lastTok=null,lastData=null,offset=0,applying=false,fresh=false,match=null,sdkP=null,nameT=null,replayT=null,err='',busyMsg='',mode='link',codeDraft='';
  const configured=()=>typeof FIREBASE_CONFIG!=='undefined'&&!!FIREBASE_CONFIG&&!!FIREBASE_CONFIG.apiKey;
  const other=()=>1-st.me;
  const link=()=>location.origin+location.pathname+'?vs='+id;

  /* ---------- connection ---------- */
  function script(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('Could not load the online service. Check your connection.'));document.head.append(s)})}
  function connect(){
    if(sdkP) return sdkP;
    sdkP=(async()=>{
      if(!window.firebase){await script(SDK+'firebase-app-compat.js');await Promise.all([script(SDK+'firebase-auth-compat.js'),script(SDK+'firebase-database-compat.js')])}
      if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      const cred=await firebase.auth().signInAnonymously();
      uid=cred.user.uid;db=firebase.database();
      db.ref('.info/serverTimeOffset').on('value',s=>{offset=s.val()||0});
    })();
    sdkP.catch(()=>{sdkP=null});
    return sdkP;
  }
  const snap=()=>JSON.stringify({gid:S.gid,state:S.state,hist:S.hist.slice(-60),who:S.who.slice(-60),starter:S.starter});

  /* ---------- making and accepting a challenge ---------- */
  const rand=(chars,n)=>Array.from({length:n},()=>chars[R(0,chars.length-1)]).join('');
  async function challenge(asRoom){
    await connect();
    mode=asRoom?'room':'link';
    for(let i=0;i<5;i++){
      const m=rand(ID_CHARS,12),data=snap();
      const res=await db.ref('matches/'+m).transaction(r=>r===null?{v:1,host:uid,created:Date.now(),seq:1,kind:'game',by:0,snap:data,names:{L:S.me||S.names[0]||''}}:undefined);
      if(res.committed){seq=1;lastTok=null;fresh=false;await roomCode(m);return enter(m,0)}
    }
    throw new Error('Could not start a match. Try again.');
  }
  /* every match also gets a 5-letter room code that points at it, for friends who would rather type */
  async function roomCode(m){
    try{
      for(let i=0;i<6;i++){
        const c=rand(CODE_CHARS,5);
        const res=await db.ref('codes/'+c).transaction(r=>r===null?{m,host:uid,at:Date.now()}:undefined);
        if(res.committed){await db.ref('matches/'+m+'/code').set(c);return c}
      }
    }catch(e){console.warn('Room codes are not enabled in the database rules yet.',e)}
    return null;
  }
  async function joinCode(raw){
    const c=String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(c.length!==5) throw new Error('Room codes have 5 letters and numbers.');
    await connect();
    const r=(await db.ref('codes/'+c).get()).val();
    if(!r||!r.m) throw new Error(`No room called ${c}. Check the code and try again.`);
    return accept(r.m);
  }
  async function accept(m){
    await connect();
    const r=(await db.ref('matches/'+m).get()).val();
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
    const base=seq,data=snap(),tok=uid+':'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);lastTok=tok;lastData=data;
    ref.transaction(r=>{
      if(!r) return;
      if((r.seq||0)===base){r.seq=base+1;r.kind=kind;r.by=st.me;r.tok=tok;r.snap=data;return r}
      if(!op) return;
      let d;try{d=JSON.parse(r.snap)}catch(e){return}
      const n=op(d.state);if(!n) return;
      d.state=n;r.seq=(r.seq||0)+1;r.kind=kind;r.by=st.me;r.tok=tok;r.snap=JSON.stringify(d);return r;
    }).catch(e=>note('Could not send that: '+e.message));
  }
  function setName(p){
    if(!st.on||p!==st.me) return;
    clearTimeout(nameT);nameT=setTimeout(()=>ref&&ref.child('names/'+PC[p]).set(S.names[p]||''),400);
  }

  /* ---------- receiving ---------- */
  function receive(r){
    if(!st.on) return;
    if(!r){leave('The challenge was closed.');return}
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
  }
  function apply(r){
    let d;try{d=JSON.parse(r.snap)}catch(e){return}
    const g=GAMES.find(x=>x.id===d.gid);if(!g||!playable(g.id)) return;
    applying=true;
    try{
      clearTimeout(replayT);
      const prev=S.state,same=!fresh&&r.kind!=='game'&&d.gid===S.gid,free=same&&g.anyTurn&&g.anyTurn(d.state);
      fresh=false;
      S.state=d.state;S.hist=d.hist||[];S.who=d.who||[];S.starter=d.starter||0;
      if(!free) S.ui={};
      if(!same){
        S.gid=d.gid;S.game=g;closeSheet();S.sawHow=false;lock(false);
        renderInfo();renderPlay();Demo.start(g,$('demoBox'),$('demoCap'));showIntro();
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
    const them=name(other()),code=match&&match.code;
    const status=!friendJoined()?(code?`Waiting for your friend · Room ${code}`:'Waiting for your friend to open the link'):friendHere()?`${them} is here`:`${them} is away`;
    const inv=el('button',{class:'btn small',type:'button'},friendJoined()?'Match':'Invite');inv.addEventListener('click',open);
    nb.className='netbar'+(friendHere()?' here':'');
    nb.replaceChildren(el('span',{class:'live-dot','aria-hidden':'true'}),
      el('span',{class:'nb-text'},el('b',{},`You play ${CNAME[PC[st.me]]}`),el('span',{},status)),inv);
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
      }else kids.push(el('p',{},'To start a match, pick a game first, then tap Play online.'));
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
      quit.addEventListener('click',()=>{leave();close()});
      const back=el('button',{class:'btn',type:'button'},'Back to the board');back.addEventListener('click',close);
      const code=match&&match.code,codeBox=code?el('div',{class:'room-code','aria-label':'Room code '+code.split('').join(' ')},...code.split('').map(ch=>el('span',{},ch))):null;
      const room=mode==='room'&&code&&!friendJoined();
      kids.push(el('h2',{},friendJoined()?`Playing ${name(other())}`:room?'Your room':'Your challenge link'),
        friendJoined()?el('p',{},`You play ${CNAME[PC[st.me]]} on this device. ${friendHere()?name(other())+' is connected.':name(other())+' is away right now; moves will show up when they are back.'}`)
          :room?el('p',{},'Tell your friend this code. They open PlayTheory, tap Play online, and type it under Join a room.')
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
  return {init,open,push,setName,mayMove,mayUndo,leave,st,get on(){return st.on},get friend(){return friendJoined()},get me(){return st.me},get offset(){return offset}};
})();
