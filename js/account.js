"use strict";
/* Sign in with Google to keep a player profile: the name you play under and your wins, losses and draws
   for each game, saved at users/<uid> in the same Firebase database as online play (database.rules.json).
   Signing in is optional. The Firebase SDK loads only when someone opens the account panel, or on arrival
   when this browser was signed in last time, so it costs nothing for everyone else.
   If this device already played online anonymously, signing in links Google to that same account. */
const Account=(()=>{
  const KEY='pt-account'; // {n: name}: lets the name prompt greet a signed-in player before Firebase has loaded
  let user=null,profile=null,ready=false,err='',busyMsg='',then=null,rec=null,watching=false,loadP=null;
  const saved=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  const remember=v=>{try{if(v)localStorage.setItem(KEY,JSON.stringify(v));else localStorage.removeItem(KEY)}catch(e){}};
  const signedIn=()=>!!(user&&!user.isAnonymous);
  const uref=p=>firebase.database().ref('users/'+user.uid+(p?'/'+p:''));
  const T=()=>firebase.database.ServerValue.TIMESTAMP,inc=n=>firebase.database.ServerValue.increment(n);
  const first=n=>String(n||'').trim().split(/\s+/)[0]||'';
  const savedName=()=>(saved()||{}).n||'';

  /* ---------- connection ---------- */
  function start(){
    return Online.connect().then(()=>{
      if(!watching){watching=true;firebase.auth().onAuthStateChanged(u=>{if(!u||!user||u.uid!==user.uid)profile=null;user=u;ready=true;if(signedIn())load();else{loadP=null;remember(null);draw()}})}
    });
  }
  /* once per account: the sign-in itself and the auth listener may both ask */
  function load(){
    const u=user;
    if(loadP&&loadP.uid===u.uid) return loadP;
    loadP=(async()=>{
      try{
        const p=(await uref().get()).val();
        if(!user||u.uid!==user.uid) return;
        if(!p){profile={name:S.me||first(u.displayName)};await uref().set({name:profile.name,since:T(),seen:T()})}
        else{profile=p;uref('seen').set(T()).catch(()=>{})}
        remember({n:profile.name||first(u.displayName)});
      }catch(e){console.warn('Could not load the profile.',e);profile=profile||{name:first(u.displayName)}}
      draw();
    })();
    loadP.uid=u.uid;return loadP;
  }

  /* ---------- signing in and out ---------- */
  const WHY={'auth/popup-blocked':'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
    'auth/operation-not-allowed':'Google sign-in isn’t switched on for PlayTheory yet.',
    'auth/unauthorized-domain':'Google sign-in doesn’t work on this web address yet.',
    'auth/network-request-failed':'Could not reach Google. Check your connection and try again.'};
  async function signIn(){
    if(Online.on){err='Finish your online match first, then sign in.';panel();return}
    const auth=firebase.auth(),gp=new firebase.auth.GoogleAuthProvider();
    err='';busyMsg='Waiting for Google…';panel();
    try{
      const cur=auth.currentUser;
      /* keep this device's anonymous id (and its matches) when the Google account is new here */
      if(cur&&cur.isAnonymous){
        try{await cur.linkWithPopup(gp)}
        catch(e){if(e.code==='auth/credential-already-in-use'&&e.credential)await auth.signInWithCredential(e.credential);else throw e}
      }else await auth.signInWithPopup(gp);
      busyMsg='';const f=then;then=null;
      const u=auth.currentUser;if(u){user=u;await load()}
      close();if(f)f(profile&&profile.name||first(u&&u.displayName));
    }catch(e){
      busyMsg='';
      if(e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request') err=WHY[e.code]||'Could not sign in: '+(e.message||e.code);
    }
    panel();
  }
  async function signOut(){
    if(Online.on){err='Finish your online match first, then sign out.';panel();return}
    busyMsg='Signing out…';panel();
    try{remember(null);await firebase.auth().signOut();await firebase.auth().signInAnonymously()}catch(e){err='Could not sign out: '+e.message}
    busyMsg='';panel();
  }

  /* ---------- what the rest of the app tells it ---------- */
  /* a finished game counts once for whoever is signed in on this device: blue on one screen, your seat online */
  function result(over){
    if(!signedIn()||!over||rec===S.state) return;
    rec=S.state;
    const me=Online.on?Online.me:0,r=over.winner==='draw'?'draws':over.winner===me?'wins':'losses';
    const st=((profile||(profile={})).stats||(profile.stats={}))[S.gid]||(profile.stats[S.gid]={});
    st.played=(st.played||0)+1;st[r]=(st[r]||0)+1;draw();
    uref('stats/'+S.gid).update({played:inc(1),[r]:inc(1),last:T()}).catch(e=>console.warn('Could not save the result.',e));
  }
  function setName(n){
    n=String(n||'').trim().slice(0,40);
    if(!signedIn()||!n||(profile&&profile.name===n)) return;
    (profile||(profile={})).name=n;remember({n});
    uref('name').set(n).catch(()=>{});
  }

  /* ---------- interface ---------- */
  function draw(){
    const b=$('accountBtn');if(!b) return;
    const on=signedIn(),n=on?(profile&&profile.name)||first(user.displayName)||'You':'Sign in';
    b.classList.toggle('in',on);b.setAttribute('aria-label',on?`Signed in as ${n}. Your account`:'Sign in to save your games');
    const pic=on&&user.photoURL?el('img',{class:'acct-pic',src:user.photoURL,alt:'',referrerpolicy:'no-referrer'}):
      sv('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'},sv('circle',{cx:'12',cy:'8',r:'4'}),sv('path',{d:'M4 21a8 8 0 0 1 16 0'}));
    b.replaceChildren(pic,el('span',{class:'tlabel'},n));
    if($('accountDlg').open) panel();
  }
  const gLogo=()=>sv('svg',{viewBox:'0 0 48 48','aria-hidden':'true',class:'g-logo'},
    sv('path',{fill:'#EA4335',d:'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'}),
    sv('path',{fill:'#4285F4',d:'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'}),
    sv('path',{fill:'#FBBC05',d:'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'}),
    sv('path',{fill:'#34A853',d:'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'}));
  function panel(){
    const box=$('accountBody'),kids=[];
    if(busyMsg||!ready){
      kids.push(el('h2',{},'Your PlayTheory account'),err&&!busyMsg?null:el('p',{class:'net-wait'},el('span',{class:'spin','aria-hidden':'true'}),busyMsg||'Loading…'));
    }else if(!signedIn()){
      const go=el('button',{class:'btn big g-btn',type:'button',autofocus:''},gLogo(),'Sign in with Google');
      go.addEventListener('click',signIn);
      kids.push(el('h2',{},'Save your games'),
        el('p',{},'Sign in to keep your player name and your wins, losses and draws, on any device.'),go,
        el('p',{class:'fine'},'We save the name you play under and your game results. Your Google password never reaches PlayTheory. Signing in is optional: you can always play without it.'));
    }else{
      const p=profile||{},stats=Object.entries(p.stats||{}).filter(([g])=>GAMES.some(x=>x.id===g));
      const out=el('button',{class:'btn',type:'button'},'Sign out');out.addEventListener('click',signOut);
      kids.push(el('h2',{},`Hi, ${p.name||first(user.displayName)||'there'}`),
        el('p',{class:'fine'},`Signed in with Google${user.email?' as '+user.email:''}.`),
        stats.length?el('ul',{class:'acct-stats'},...stats.map(([g,s])=>el('li',{},el('b',{},GAMES.find(x=>x.id===g).name),
          el('span',{},`${s.played||0} played · ${s.wins||0} won · ${s.losses||0} lost · ${s.draws||0} drawn`))))
          :el('p',{},'No games saved yet. Finish a game and your result shows up here.'),
        el('div',{class:'row'},out));
    }
    if(err) kids.push(el('p',{class:'net-err',role:'alert'},err));
    const x=el('button',{class:'dlg-x',type:'button','aria-label':'Close'},'×');x.addEventListener('click',close);
    box.replaceChildren(x,...kids.filter(Boolean));
  }
  /* f(name) runs after a successful sign-in from this opening (the name prompt uses it to fill the name) */
  function open(f){
    then=typeof f==='function'?f:null;err='';
    if(!ready) start().then(panel).catch(e=>{err=e.message||String(e);panel()});
    panel();const d=$('accountDlg');
    if(!d.open){try{d.showModal()}catch(e){d.setAttribute('open','')}}
  }
  function close(){const d=$('accountDlg');if(d.open){try{d.close()}catch(e){d.removeAttribute('open')}}}

  function init(){
    $('accountBtn').addEventListener('click',()=>open());
    $('accountDlg').addEventListener('click',e=>{if(e.target===$('accountDlg'))close()});
    $('accountDlg').addEventListener('close',()=>{err='';then=null});
    draw();
    if(saved()) start().catch(()=>{}); // signed in last time: restore it in the background
  }
  return {init,open,result,setName,savedName,get signedIn(){return signedIn()}};
})();
