"use strict";
/* DuSoKu bots: rule-based players meant to feel like a person across the table, not to win every game.
   A bot rates every empty square by a few human habits (easy squares first, boosts, big numbers, staying near
   its last move, sticking with the same number), picks one at random weighted by those ratings, sometimes gets
   the number wrong, and waits a human-looking time. With `adapt` it steers towards a narrow result: P.goal 'win'
   or 'lose' (from goal()), or just a close game without one. Needs SDK, sdkWorth and sdkPlace from games.js. */
const SdkBot=(()=>{
  const U=[];for(let k=0;k<9;k++){const b=(k/3|0)*27+(k%3)*3;
    U.push([...Array(9)].map((_,j)=>k*9+j),[...Array(9)].map((_,j)=>j*9+k),[...Array(9)].map((_,j)=>b+(j/3|0)*9+j%3))}
  const DIG=[1,2,3,4,5,6,7,8,9];
  /* what a player can see on each empty square: candidates, whether it's a single, boost, worth (0..1) */
  function look(s){
    const g=s.grid,c=g.map((v,i)=>v?null:DIG.filter(d=>SDK.ok(g,i,d))),hid=Array(81).fill(0);
    for(const u of U)for(const d of DIG){if(u.some(i=>g[i]===d))continue;const at=u.filter(i=>c[i]&&c[i].includes(d));if(at.length===1)hid[at[0]]=1}
    const w=s.scoring==='diff'?sdkWorth(g):[0,...DIG],top=Math.max(...w)||1;
    return g.flatMap((v,i)=>v?[]:[{i,c:c[i],nc:c[i].length,easy:c[i].length===1||hid[i]?1:0,b:s.boost[i],v:w[s.sol[i]]/top}]);
  }
  const near=(i,j)=>j==null?0:Math.max(0,1-Math.max(Math.abs((i/9|0)-(j/9|0)),Math.abs(i%9-j%9))/4);
  const same=(s,f,me)=>me&&me.d&&s.sol[f.i]===me.d?1:0;
  /* how far ahead this player is, −1..1 */
  const lead=(s,p)=>{const a=s.score[p],b=s.score[1-p];return Math.max(-1,Math.min(1,(a-b)/(8+.15*(Math.abs(a)+Math.abs(b)))))};
  /* how this game should end for the bot: the player's first game is theirs, then the bot wins about 68%.
     n = games already played against the bot, won = how many of those after the first the bot won;
     it aims to win more often while it's below the target, so each player ends up near 68% */
  const goal=(n,won=0,target=.68)=>{if(!n)return 'lose';const rate=n>1?won/(n-1):target;
    return Math.random()<Math.max(.3,Math.min(.98,target+.04+2.5*(target-rate)))?'win':'lose'};
  /* how much of the board has been filled since the start, 0..1 */
  /* how far through the game we are, 0..1: board filled, or in rapid fire the game clock if that's further (now = sdkNow()) */
  const prog=(s,now)=>Math.max(1-s.grid.filter(x=>!x).length/(s.given.filter(x=>!x).length||1),
    s.mode==='rapid'&&s.deadline&&now!=null?1-(s.deadline-now)/s.limit:0);
  /* ease off (>0) or push (<0) against the lead the bot is aiming for; stronger as the board fills */
  const mood=(s,p,P,now)=>{if(!P.adapt)return 0;const aim=P.goal==='win'?.3:P.goal==='lose'?-.2:0;
    if(P.goal==='win'&&s.score[p]<=s.score[1-p]&&prog(s,now)>.6)return -2; // behind late on with a win to get: all out
    return Math.max(-1.5,Math.min(1.5,1.5*P.adapt*(lead(s,p)-aim)*(1+2*prog(s,now))))};
  /* a bot that must lose stalls and slips when it's close to the player's score late on, or well ahead */
  const yield_=(s,p,P,now)=>P.goal==='lose'&&(s.score[p]>=s.score[1-p]-2&&prog(s,now)>.5||lead(s,p)>.25);
  /* chance of picking each square: softmax of the weighted habits */
  function odds(s,p,me,P,fs=look(s),now){
    // pushing sharpens the choice and goes after points; easing off only slows and slips, so squares still look human
    const w=P.w,m=mood(s,p,P,now),g=m<0?-m:0,k=1+.45*g;
    const u=fs.map(f=>k*(w.easy*f.easy-w.hard*(f.nc-1)+w.boost*(f.b-1)+w.worth*f.v+w.near*near(f.i,me&&me.i)+w.digit*same(s,f,me))+g*(.6*(f.b-1)+f.v));
    const top=Math.max(...u),e=u.map(x=>Math.exp(x-top)),t=sum(e);
    return{fs,pr:e.map(x=>x/t)};
  }
  /* chance the number is right: singles almost always, harder squares part deduction, part guess */
  const pOk=(f,P,m=0)=>{const sk=m<0?P.skill+(1-P.skill)*Math.min(1,-m/2):P.skill,base=f.easy?1-P.slip:sk+(1-sk)/f.nc;return Math.max(.05,Math.min(1,1-(1-base)*(1+m)))};
  /* thinking time: lognormal around the persona's pace, slower on hard squares and in take turns */
  const wait=(f,P,s,m=0)=>P.pace*(f.easy?1:P.hardx)*(s.mode==='rapid'?1:P.turnx)*Math.exp(.8*m);
  const gauss=()=>{let u=0;while(!u)u=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*Math.random())};
  /* the bot's next move for seat p: {i,d,ms}; {skip,ms} to pass the turn; {wait,ms} to play nothing and ask again after ms.
     now = sdkNow() in rapid fire */
  function play(s,p,me,P,now){
    const {fs,pr}=odds(s,p,me,P,look(s),now);if(!fs.length)return null;
    let r=Math.random(),k=0;while(k<pr.length-1&&(r-=pr[k])>0)k++;
    const f=fs[k],m=mood(s,p,P,now),y=yield_(s,p,P,now),ok=!(y&&Math.random()<.3)&&Math.random()<pOk(f,P,m),bad=f.c.filter(d=>d!==s.sol[f.i]);
    const d=ok?s.sol[f.i]:pick(bad.length?bad:DIG.filter(d=>d!==s.sol[f.i]));
    const ms=Math.round(wait(f,P,s,m)*(y?3:1)*Math.exp(P.jit*(m<0?1+.25*m:1)*gauss())); // focused players pause less
    /* a wrong number in rapid fire means no points for a while (sdkCold): a bot that wants points waits it out, as people would */
    const cold=typeof sdkCold==='function'?sdkCold(s,p):0;
    if(cold>0&&ok&&P.goal!=='lose')return{wait:1,ms:cold+R(200,1500)};
    /* must lose: never play a right number that would draw level or go ahead (in the opening, more than 3 ahead, so it doesn't sit idle);
       keep thinking ({wait}), or now and then fumble one */
    if(P.goal==='lose'&&d===s.sol[f.i]&&!cold&&s.score[p]+sdkValue(s,d)*s.boost[f.i]>=s.score[1-p]+(prog(s,now)<.2?4:0)){
      if(Math.random()<.25)return{i:f.i,d:pick(bad.length?bad:DIG.filter(d=>d!==s.sol[f.i])),ms};
      return s.mode==='rapid'?{wait:1,ms}:{skip:1,ms:Math.min(ms,s.turnLimit||ms)};
    }
    return s.mode!=='rapid'&&s.turnLimit&&ms>s.turnLimit?{skip:1,ms:s.turnLimit}:{i:f.i,d,ms};
  }
  const P=(name,blurb,w,o)=>({name,blurb,w,skill:.6,slip:.02,pace:6000,hardx:2,turnx:1.3,jit:.5,adapt:0,...o});
  const PERSONAS=[
    P('steady','Careful solver: easy squares first, rarely wrong, ignores points.',{easy:3,hard:.6,boost:.3,worth:.2,near:.5,digit:.5},{skill:.7}),
    P('hunter','Point chaser: goes for boosts and big numbers, guesses more.',{easy:1.2,hard:.2,boost:1.6,worth:1.5,near:.2,digit:.2},{skill:.5,slip:.03,pace:5000,hardx:1.8,jit:.6}),
    P('scanner','Works one number at a time across the board.',{easy:2.5,hard:.4,boost:.3,worth:.3,near:.2,digit:2.2},{skill:.65,pace:4500,hardx:2.5}),
    P('casual','Relaxed player: stays in one area, slower, more slips.',{easy:1.5,hard:.3,boost:.6,worth:.3,near:1.2,digit:.3},{skill:.4,slip:.05,pace:9000,hardx:1.8,jit:.7}),
    P('buddy','Keeps it close and steers towards its goal: eases off when ahead of it, sharpens up when behind.',{easy:2.2,hard:.4,boost:.9,worth:.8,near:.5,digit:.6},{skill:.6,slip:.03,adapt:1}),
    /* fitted to 973 logged moves from 2–6 Nov 2026 (.claude/tools/bots), with steadier timing (jit 1.22 in the logs) so it can steer */
    P('mate','Plays like the logged players and steers towards its goal. The one to use.',{easy:3.4,hard:.15,boost:.35,worth:-.2,near:2.4,digit:1.5},{skill:.3,slip:.05,pace:6761,hardx:1.72,jit:.6,adapt:1})];
  return{PERSONAS,look,odds,pOk,wait,play,near,same,lead,goal,mood};
})();

/* playing the computer on one screen: seat 1 is the bot when state.bot is set. It thinks in the background and moves
   through ctx.play like a player would. Finished games are counted on this device, so the player's first game is theirs
   and later ones follow SdkBot.goal(). */
const SdkBotPlay=(()=>{
  const KEY='playtheory.bot',NAME='Knight',P=SdkBot.PERSONAS.find(p=>p.name==='mate');
  const rec=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{n:0,won:0}}catch(e){return{n:0,won:0}}};
  const save=r=>{try{localStorage.setItem(KEY,JSON.stringify(r))}catch(e){}};
  const idOf=s=>s.sol.join('')+s.boost.join('');
  let game='',goal=null,me=null,plan=null,done='';
  const think=(s,key,part=1)=>{const mv=SdkBot.play(s,1,me,{...P,goal},sdkNow());plan=mv&&{...mv,key,at:mv.skip?Infinity:Date.now()+mv.ms*part}};
  function tick(){
    if(typeof S==='undefined'||S.gid!=='duosudoku'||!S.state||!S.state.bot||S.state.mode==='daily'||sdkOnline()){plan=null;return}
    const s=S.state,id=idOf(s);
    if(S.over){if(done!==id){done=id;const r=rec();if(r.n&&S.over.winner===1)r.won++;r.n++;save(r)}plan=null;return}
    if(!s.set&&!s.n){plan=null;return} // still on the set-up screen
    if(id!==game){game=id;goal=SdkBot.goal(rec().n,rec().won);me=null;plan=null}
    if(S.busy) return;
    const turns=s.mode==='turns',key=turns?sdkCount(s)+':'+s.turn:'r';
    if(turns&&(s.turn!==1||s.out[1])){plan=null;return}
    if(plan&&plan.key!==key) plan=null;
    if(!plan){think(s,key);return}
    if(Date.now()<plan.at) return;
    const mv=plan;plan=null;
    if(mv.wait) return; // holding back: think again on the next tick (a skip is left to the turn clock)
    if(s.grid[mv.i]){think(s,key,.5);return} // the square went while it was thinking: half the time is already spent
    me={i:mv.i,d:mv.d};
    ctx.play(sdkPlace(s,mv.i,mv.d,sdkSpent(s),1),null,{silent:true,op:st=>st.grid[mv.i]||st.ended?null:sdkPlace(st,mv.i,mv.d,0,1)});
  }
  if(typeof document!=='undefined') setInterval(tick,200);
  return{NAME,rec};
})();
