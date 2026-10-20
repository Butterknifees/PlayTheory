"use strict";
/* Sound: everything is synthesised with Web Audio, so there are no audio files to host.
   Sound.fx(name) plays an effect. Music.play(gameId) starts that game's theme. */

const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],mixolydian:[0,2,4,5,7,9,10],
  lydian:[0,2,4,6,7,9,11],phrygian:[0,1,3,5,7,8,10],harmonic:[0,2,3,5,7,8,11],penta:[0,2,4,7,9],mpenta:[0,3,5,7,10],
  blues:[0,3,5,6,7,10],whole:[0,2,4,6,8,10]};
const K4='x...x...x...x...',K2='x.......x.......',S2='....x.......x...',H8='x.x.x.x.x.x.x.x.',H16='xxxxxxxxxxxxxxxx',OFF='..x...x...x...x.';

/* One theme per game. lead/pad/bass/arp name instruments below; dr holds 16-step drum patterns. */
const THEMES={
  nim:        {m:'Counting Stones',bpm:84,root:72,sc:'penta',prog:[0,3,4,0],lead:'musicbox',dens:.45,pad:'glass',bass:'soft',bp:'x.......x.......'},
  greedy:     {m:'Big Heap Swagger',bpm:96,root:57,sc:'blues',prog:[0,0,3,4],lead:'brass',dens:.35,bass:'pluck',bp:'x..x..x.x..x..x.',dr:{k:'x.....x...x.....',s:S2,h:H8},swing:.18},
  subtraction:{m:'Clockwork Arithmetic',bpm:112,root:69,sc:'dorian',prog:[0,3,0,4],lead:'marimba',dens:.55,bass:'soft',bp:K4,dr:{w:H8,c:OFF}},
  psub:       {m:'Two Ledgers',bpm:92,root:62,sc:'minor',prog:[0,5,3,4],lead:'pluck',dens:.4,pad:'warm',bass:'sub',bp:'x.......x...x...',dr:{k:K2,h:OFF}},
  grundy:     {m:'Splitting Hairs',bpm:76,root:67,sc:'whole',prog:[0,1,2,1],lead:'glass',dens:.3,pad:'choir'},
  kayles:     {m:'Lanes & Pins',bpm:126,root:60,sc:'major',prog:[0,3,4,4],lead:'organ',dens:.45,bass:'soft',bp:'x.x.o.x.x.x.o.x.',dr:{k:K4,s:S2,h:H8},swing:.25},
  endnim:     {m:'Warehouse Ends',bpm:104,root:57,sc:'mpenta',prog:[0,0,3,2],lead:'saw',dens:.3,arp:'saw',bass:'saw',bp:'x..x..x.x..x..x.',dr:{k:K4,h:OFF}},
  pendnim:    {m:'Two Forklifts',bpm:100,root:55,sc:'mixolydian',prog:[0,6,3,0],lead:'brass',dens:.35,bass:'pluck',bp:'x...x.x.x...x.x.',dr:{k:'x.....x.x.......',s:S2,c:H8}},
  forklift:   {m:'Heavy Lifting',bpm:88,root:50,sc:'minor',prog:[0,3,4,0],lead:'horn',dens:.3,pad:'warm',bass:'sub',bp:'x.......x.x.....',dr:{t:'x.......x...x...',h:OFF}},
  erosion:    {m:'Tides',bpm:68,root:64,sc:'lydian',prog:[0,1,0,4],lead:'harp',dens:.35,pad:'glass',bass:'soft',bp:'x...............'},
  chomp:      {m:'Poisoned Chocolate',bpm:92,root:69,sc:'harmonic',prog:[0,3,4,0],lead:'musicbox',dens:.5,bass:'soft',bp:'x.....x.....x...',dr:{c:'x..x..x..x..x...'}},
  cherries:   {m:'Orchard',bpm:104,root:72,sc:'penta',prog:[0,3,0,4],lead:'flute',dens:.45,pad:'warm',bass:'soft',bp:K4,dr:{c:H8}},
  toppling:   {m:'Domino Run',bpm:132,root:64,sc:'major',prog:[0,4,5,3],lead:'marimba',dens:.6,bass:'pluck',bp:'x.x...x.x.x...x.',dr:{w:'x..x..x.x..x..x.',k:K4}},
  hackenbush: {m:'Garden Shears',bpm:90,root:62,sc:'lydian',prog:[0,4,1,4],lead:'harp',dens:.45,pad:'choir',bass:'soft',bp:K2,dr:{c:OFF}},
  domineering:{m:'Tiles on the Table',bpm:100,root:60,sc:'dorian',prog:[0,3,6,4],lead:'epiano',dens:.4,pad:'warm',bass:'sub',bp:'x..x....x..x....',dr:{k:K2,s:S2,h:H8},swing:.15},
  cram:       {m:'Packed Board',bpm:140,root:72,sc:'major',prog:[0,5,3,4],lead:'chip',dens:.55,arp:'chip',bass:'pluck',bp:H8,dr:{k:K4,s:S2,h:H16}},
  clobber:    {m:'Stone Crash',bpm:96,root:52,sc:'phrygian',prog:[0,1,0,6],lead:'horn',dens:.3,pad:'warm',bass:'sub',bp:'x..x..x.........',dr:{t:'x..x..x...x.x...',s:'............x...'}},
  konane:     {m:'Island Jumps',bpm:112,root:67,sc:'penta',prog:[0,3,4,0],lead:'uke',dens:.55,bass:'soft',bp:'x..x..x.x..x..x.',dr:{c:'x.xxx.xxx.xxx.x.',w:'....x.......x...'}},
  amazons:    {m:'Queens at War',bpm:92,root:50,sc:'harmonic',prog:[0,5,3,4],lead:'horn',dens:.35,pad:'warm',bass:'sub',bp:'x.......x.x.....',dr:{t:'x..x..x.x.......',s:'....x.......x..x',h:OFF}},
  snort:      {m:'Barnyard',bpm:120,root:65,sc:'major',prog:[0,3,4,0],lead:'uke',dens:.5,bass:'soft',bp:'x...o...x...o...',dr:{w:OFF,k:K4}},
  col:        {m:'Colour Theory',bpm:80,root:67,sc:'lydian',prog:[0,1,4,0],lead:'glass',dens:.35,pad:'choir',bass:'soft',bp:'x...............'},
  hex:        {m:'Hex Lattice',bpm:116,root:57,sc:'minor',prog:[0,5,2,6],lead:'saw',dens:.25,arp:'saw',pad:'warm',bass:'saw',bp:K4,dr:{k:K4,h:OFF}},
  dots:       {m:'School Desk',bpm:108,root:64,sc:'major',prog:[0,5,3,4],lead:'pluck',dens:.5,bass:'soft',bp:'x...o...x...o...',dr:{c:H8,w:'....x.......x...'}},
  push:       {m:'Rush Hour',bpm:124,root:57,sc:'minor',prog:[0,0,5,4],lead:'saw',dens:.35,bass:'pluck',bp:'xx.xx.x.xx.xx.x.',dr:{k:K4,s:S2,h:H16}},
  shove:      {m:'Elbow Room',bpm:104,root:55,sc:'blues',prog:[0,3,0,4],lead:'brass',dens:.4,bass:'pluck',bp:'x..x..x.x..x..x.',dr:{k:'x.....x.x.......',s:S2,h:H8},swing:.2},
  runover:    {m:'Stampede',bpm:144,root:52,sc:'mpenta',prog:[0,0,3,4],lead:'horn',dens:.3,bass:'saw',bp:H8,dr:{t:H8,k:K4,s:'....x..x....x...'}},
  dragover:   {m:'Tow Rope',bpm:84,root:62,sc:'dorian',prog:[0,3,0,4],lead:'harp',dens:.35,pad:'warm',bass:'sub',bp:'x.......x...x...',dr:{k:K2,c:OFF},swing:.2},
  clearpond:  {m:'Lily Pads',bpm:100,root:69,sc:'penta',prog:[0,4,3,0],lead:'marimba',dens:.45,pad:'glass',bass:'soft',bp:'x.....x.........',dr:{w:'x.....x...x.....'}},
  clobberpond:{m:'Splash',bpm:104,root:62,sc:'minor',prog:[0,5,3,4],lead:'bell',dens:.35,pad:'glass',bass:'sub',bp:K2,dr:{c:'x..x..x..x..x..x'}},
  elephants:  {m:'Savanna March',bpm:90,root:53,sc:'mixolydian',prog:[0,6,3,0],lead:'kalimba',dens:.5,pad:'warm',bass:'sub',bp:K4,dr:{t:'x...x...x...x..x',c:H8}},
  boxcars:    {m:'Freight Line',bpm:116,root:55,sc:'blues',prog:[0,0,3,4],lead:'organ',dens:.35,bass:'soft',bp:H8,dr:{k:K4,s:S2,c:H16},swing:.2},
  sliding:    {m:'Coin Slide',bpm:120,root:72,sc:'major',prog:[0,3,4,0],lead:'chip',dens:.5,arp:'chip',bass:'soft',bp:K4,dr:{k:K4,h:H8}},
  cutthroat:  {m:'Constellations',bpm:72,root:64,sc:'lydian',prog:[0,4,5,1],lead:'glass',dens:.3,pad:'choir'},
  to15:       {m:'Magic Square',bpm:96,root:69,sc:'harmonic',prog:[0,5,3,4],lead:'musicbox',dens:.45,pad:'glass',bass:'soft',bp:K4,dr:{c:OFF}}
};

const Sound=(()=>{
  let ac=null,master,musicBus,sfxBus,noise;
  const pref={music:true,sfx:true};
  try{const p=JSON.parse(localStorage.getItem('playtheory.sound')||'null');if(p)Object.assign(pref,p)}catch(e){}
  const save=()=>{try{localStorage.setItem('playtheory.sound',JSON.stringify(pref))}catch(e){}};
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const MUSIC_LEVEL=.3,SFX_LEVEL=.75;

  function init(){
    if(ac) return ac;
    const C=window.AudioContext||window.webkitAudioContext;if(!C) return null;
    ac=new C();
    master=ac.createGain();master.gain.value=.9;
    const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;
    master.connect(comp);comp.connect(ac.destination);
    musicBus=ac.createGain();musicBus.gain.value=pref.music?MUSIC_LEVEL:0;
    sfxBus=ac.createGain();sfxBus.gain.value=pref.sfx?SFX_LEVEL:0;
    const verb=ac.createConvolver(),vg=ac.createGain();vg.gain.value=.22;
    const len=ac.sampleRate*2.2,ir=ac.createBuffer(2,len,ac.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
    verb.buffer=ir;verb.connect(vg);vg.connect(master);
    musicBus.connect(master);musicBus.connect(verb);sfxBus.connect(master);sfxBus.connect(verb);
    noise=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);
    const nd=noise.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    return ac;
  }
  function unlock(){init();return ac&&ac.state==='suspended'?ac.resume().catch(()=>{}):Promise.resolve()}
  const ready=()=>!!ac&&ac.state==='running';

  /* a voice: oscillators (with partials) -> optional lowpass -> envelope -> bus */
  function voice(bus,t,f,o){
    const {wave='sine',a=.005,d=.4,g=.2,lp=null,lpEnd=null,q=.7,vib=0,detune=0,partials=null,hold=0,glide=null}=o;
    const out=ac.createGain(),end=t+a+hold+d;
    out.gain.setValueAtTime(.0001,t);out.gain.exponentialRampToValueAtTime(Math.max(.0002,g),t+a);
    if(hold) out.gain.setValueAtTime(Math.max(.0002,g),t+a+hold);
    out.gain.exponentialRampToValueAtTime(.0001,end);
    let node=out;
    if(lp){const fl=ac.createBiquadFilter();fl.type='lowpass';fl.Q.value=q;fl.frequency.setValueAtTime(lp,t);if(lpEnd)fl.frequency.exponentialRampToValueAtTime(lpEnd,end);fl.connect(out);node=fl}
    (partials||[[1,1]]).forEach(([mul,amp])=>{
      const os=ac.createOscillator();os.type=wave;os.frequency.setValueAtTime(f*mul,t);
      if(glide) os.frequency.exponentialRampToValueAtTime(glide*mul,end);
      if(detune) os.detune.value=detune;
      let src=os;if(amp!==1){const ga=ac.createGain();ga.gain.value=amp;os.connect(ga);src=ga}
      if(vib){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=5.2;lg.gain.value=f*mul*vib;l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(end+.05)}
      src.connect(node);os.start(t);os.stop(end+.05);
    });
    out.connect(bus);
  }
  function hiss(bus,t,o){
    const {d=.1,g=.3,type='bandpass',f=2000,q=1,fEnd=null,a=.002}=o;
    const s=ac.createBufferSource();s.buffer=noise;
    const fl=ac.createBiquadFilter();fl.type=type;fl.Q.value=q;fl.frequency.setValueAtTime(f,t);if(fEnd)fl.frequency.exponentialRampToValueAtTime(fEnd,t+a+d);
    const ga=ac.createGain();ga.gain.setValueAtTime(.0001,t);ga.gain.exponentialRampToValueAtTime(g,t+a);ga.gain.exponentialRampToValueAtTime(.0001,t+a+d);
    s.connect(fl);fl.connect(ga);ga.connect(bus);s.start(t,Math.random()*1.5);s.stop(t+a+d+.05);
  }

  /* instruments: (bus, time, midi, duration in seconds, velocity) */
  const INST={
    musicbox:(b,t,m,d,v)=>voice(b,t,mtof(m),{partials:[[1,1],[2,.22],[4.01,.1]],a:.003,d:1.4,g:.15*v}),
    bell:(b,t,m,d,v)=>voice(b,t,mtof(m),{partials:[[1,1],[2.76,.32],[5.4,.1]],a:.003,d:2,g:.11*v}),
    glass:(b,t,m,d,v)=>voice(b,t,mtof(m),{partials:[[1,1],[3,.18],[5,.08]],a:.02,d:2.4,g:.1*v}),
    marimba:(b,t,m,d,v)=>voice(b,t,mtof(m),{partials:[[1,1],[4,.16]],a:.002,d:.45,g:.22*v}),
    kalimba:(b,t,m,d,v)=>voice(b,t,mtof(m),{partials:[[1,1],[5.4,.14]],a:.002,d:.65,g:.2*v}),
    pluck:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'sawtooth',lp:2800,lpEnd:300,a:.003,d:.45,g:.1*v}),
    uke:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'sawtooth',lp:3600,lpEnd:500,a:.002,d:.35,g:.09*v,detune:4}),
    harp:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'triangle',lp:3200,a:.003,d:1.2,g:.17*v}),
    flute:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'triangle',a:.06,hold:d*.55,d:.25,g:.13*v,vib:.01}),
    brass:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'sawtooth',lp:1700,lpEnd:700,a:.04,hold:d*.45,d:.2,g:.08*v}),
    horn:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'sawtooth',lp:950,a:.08,hold:d*.55,d:.3,g:.09*v,vib:.004}),
    chip:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'square',a:.002,d:Math.min(.22,d),g:.05*v}),
    epiano:(b,t,m,d,v)=>voice(b,t,mtof(m),{partials:[[1,1],[2,.28],[3,.06]],a:.004,d:1.1,g:.14*v}),
    organ:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'square',lp:1900,partials:[[1,1],[2,.45]],a:.01,hold:d*.7,d:.08,g:.035*v}),
    saw:(b,t,m,d,v)=>voice(b,t,mtof(m),{wave:'sawtooth',lp:2400,lpEnd:600,a:.003,d:.3,g:.06*v})
  };
  const PADS={
    warm:(b,t,m,d)=>[-8,8].forEach(dt=>voice(b,t,mtof(m),{wave:'sawtooth',lp:850,detune:dt,a:.45,hold:Math.max(0,d-.9),d:.6,g:.028})),
    glass:(b,t,m,d)=>voice(b,t,mtof(m),{partials:[[1,1],[2,.25]],a:.6,hold:Math.max(0,d-1),d:.7,g:.045}),
    choir:(b,t,m,d)=>[-6,6].forEach(dt=>voice(b,t,mtof(m),{wave:'triangle',detune:dt,vib:.004,a:.7,hold:Math.max(0,d-1.1),d:.7,g:.045}))
  };
  const BASS={
    soft:(b,t,m,d)=>voice(b,t,mtof(m),{wave:'triangle',a:.005,d:Math.min(.6,d+.1),g:.2}),
    sub:(b,t,m,d)=>voice(b,t,mtof(m),{a:.01,d:Math.min(.7,d+.2),g:.28}),
    saw:(b,t,m,d)=>voice(b,t,mtof(m),{wave:'sawtooth',lp:420,a:.005,d:Math.min(.3,d),g:.12}),
    pluck:(b,t,m,d)=>voice(b,t,mtof(m),{wave:'sawtooth',lp:900,lpEnd:200,a:.003,d:.25,g:.14})
  };
  const DRUM={
    k:(b,t)=>voice(b,t,150,{glide:45,a:.002,d:.3,g:.5}),
    s:(b,t)=>{hiss(b,t,{f:1800,q:.8,d:.14,g:.22});voice(b,t,190,{a:.001,d:.08,g:.12})},
    h:(b,t)=>hiss(b,t,{type:'highpass',f:7000,d:.035,g:.07}),
    w:(b,t)=>{hiss(b,t,{f:1500,q:8,d:.05,g:.3});voice(b,t,880,{a:.001,d:.05,g:.08})},
    t:(b,t)=>{voice(b,t,95,{glide:48,a:.003,d:.5,g:.55});hiss(b,t,{type:'lowpass',f:320,d:.2,g:.25})},
    c:(b,t)=>hiss(b,t,{type:'highpass',f:5200,d:.06,g:.045})
  };

  /* sound effects; p is the moving player (Left sounds a little higher than Right) */
  function fx(nm,o={}){
    if(!ac||!pref.sfx||ac.state!=='running') return;
    const t=ac.currentTime+.005,b=sfxBus,sh=o.p===0?2:o.p===1?-3:0,f=m=>mtof(m+sh);
    switch(nm){
      case 'pick': voice(b,t,f(96),{a:.001,d:.05,g:.06});break;
      case 'pluck': voice(b,t,f(84+R(0,4)),{partials:[[1,1],[4,.2]],a:.002,d:.25,g:.18});voice(b,t+.05,f(91),{a:.002,d:.2,g:.06});break;
      case 'wood': hiss(b,t,{f:1200,q:6,d:.06,g:.35});voice(b,t,f(77),{a:.001,d:.06,g:.15});break;
      case 'stone': hiss(b,t,{f:3000,q:3,d:.05,g:.35});voice(b,t,f(81),{glide:f(72),a:.001,d:.08,g:.12});break;
      case 'stamp': voice(b,t,180,{glide:80,a:.002,d:.15,g:.35});hiss(b,t,{type:'lowpass',f:800,d:.08,g:.2});break;
      case 'chip': voice(b,t,f(76),{wave:'square',a:.001,d:.07,g:.06});voice(b,t+.06,f(83),{wave:'square',a:.001,d:.09,g:.06});break;
      case 'paper': hiss(b,t,{f:3200,fEnd:1100,q:2,d:.14,g:.2});break;
      case 'snip': hiss(b,t,{type:'highpass',f:5000,d:.03,g:.3});hiss(b,t+.07,{type:'highpass',f:6000,d:.03,g:.3});break;
      case 'crunch': for(let i=0;i<5;i++) hiss(b,t+i*.03+Math.random()*.02,{type:'lowpass',f:1400+Math.random()*900,d:.04,g:.3});break;
      case 'pop': voice(b,t,f(74),{glide:f(86),a:.001,d:.09,g:.2});break;
      case 'card': hiss(b,t,{f:2500,fEnd:5000,q:1.5,d:.1,g:.2});voice(b,t+.08,f(88),{a:.001,d:.05,g:.05});break;
      case 'coin': hiss(b,t,{f:900,fEnd:400,d:.18,g:.12});voice(b,t+.18,f(98),{partials:[[1,1],[1.5,.6]],a:.001,d:.4,g:.06});break;
      case 'slide': hiss(b,t,{f:900,fEnd:400,q:1,d:.18,g:.12});break;
      case 'capture': hiss(b,t,{f:1800,q:2,d:.07,g:.45});voice(b,t,220,{glide:90,a:.002,d:.18,g:.3});break;
      case 'moo': voice(b,t,f(50),{wave:'sawtooth',lp:700,glide:f(44),a:.03,d:.35,g:.12});break;
      case 'bell': INST.bell(b,t,79+sh,1,1);break;
      case 'step': hiss(b,t,{type:'lowpass',f:600,d:.06,g:.3});voice(b,t,120,{a:.002,d:.08,g:.2});break;
      case 'bowdraw': voice(b,t,90,{wave:'sawtooth',lp:520,glide:150,a:.05,d:.5,g:.05});hiss(b,t,{f:420,q:6,d:.5,g:.07,a:.05});break;
      case 'twang': voice(b,t,112,{wave:'triangle',partials:[[1,1],[2,.45],[3,.2]],glide:82,a:.001,d:.4,g:.3});hiss(b,t,{type:'highpass',f:3000,d:.04,g:.2});break;
      case 'whoosh': hiss(b,t,{f:500,fEnd:2600,q:1.2,a:.12,d:.4,g:.22});break;
      case 'impact': voice(b,t,120,{glide:40,a:.002,d:.3,g:.55});hiss(b,t,{type:'lowpass',f:1300,d:.25,g:.4});break;
      case 'fire': hiss(b,t,{type:'lowpass',f:520,a:.12,d:1.1,g:.14});for(let i=0;i<16;i++) hiss(b,t+Math.random()*1.2,{f:1500+Math.random()*2800,q:4,d:.02,g:.14});break;
      case 'knock': hiss(b,t,{f:900,q:2,d:.2,g:.35});for(let i=0;i<3;i++) hiss(b,t+.04+i*.05,{f:1300+i*200,q:7,d:.05,g:.25});break;
      case 'topple': hiss(b,t,{f:1300+R(0,600),q:7,d:.05,g:.32});voice(b,t,f(72+R(0,7)),{a:.001,d:.05,g:.08});break;
      case 'claim': [0,4,7].forEach((x,i)=>INST.bell(b,t+i*.06,84+x+sh,1,.8));break;
      case 'split': hiss(b,t,{f:2000,fEnd:600,d:.15,g:.2});voice(b,t,f(72),{glide:f(84),a:.002,d:.12,g:.08});break;
      case 'undo': voice(b,t,900,{glide:500,a:.002,d:.12,g:.07});break;
      case 'enter':{
        hiss(b,t,{f:300,fEnd:3000,q:1,a:.25,d:.5,g:.2});
        const th=THEMES[o.id]||THEMES.nim,sc=SCALES[th.sc];
        [0,2,4,7].forEach((dg,i)=>INST.bell(b,t+.25+i*.09,th.root+12*Math.floor(dg/sc.length)+sc[dg%sc.length],1,.9));break;
      }
      case 'win':{
        const th=THEMES[o.id]||THEMES.nim,sc=SCALES[th.sc];
        [0,2,4,7,9,11,14].forEach((dg,i)=>INST.musicbox(b,t+i*.08,th.root+12*Math.floor(dg/sc.length)+sc[dg%sc.length],1,1));
        hiss(b,t+.5,{type:'highpass',f:6000,a:.3,d:1,g:.05});break;
      }
      case 'draw': INST.bell(b,t,67,1,1);INST.bell(b,t+.2,62,1,1);break;
    }
  }
  function setPref(k,v){
    pref[k]=v;save();
    if(!ac) return;
    const bus=k==='music'?musicBus:sfxBus,lvl=k==='music'?MUSIC_LEVEL:SFX_LEVEL;
    bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setTargetAtTime(v?lvl:0,ac.currentTime,.15);
  }
  return {init,unlock,ready,fx,pref,setPref,get ac(){return ac},get musicBus(){return musicBus},INST,PADS,BASS,DRUM};
})();

const Music=(()=>{
  let song=null,timer=null;
  function rng(seed){let a=0;for(const ch of seed)a=(a*31+ch.charCodeAt(0))|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function compose(id,th){
    const rnd=rng(id+'-tune'),sc=SCALES[th.sc],n=sc.length,ev=[];
    const bar=(b,chord,prev)=>{
      for(let s=0;s<16;s++){
        const w=s%4===0?1.4:s%2===0?.9:.45;
        if(rnd()>th.dens*w) continue;
        let dg;
        if(s%4===0||prev==null) dg=chord+[0,2,4][Math.floor(rnd()*3)]+(rnd()<.25?n:0);
        else dg=prev+[-2,-1,-1,1,1,2][Math.floor(rnd()*6)];
        dg=Math.max(-2,Math.min(n+4,dg));prev=dg;ev.push({st:b*16+s,dg});
      }
      return prev;
    };
    let prev=null;
    for(let b=0;b<4;b++) prev=bar(b,th.prog[b],prev);
    const first=ev.filter(e=>e.st<48).map(e=>({st:e.st+64,dg:e.dg}));ev.push(...first);
    prev=null;bar(7,th.prog[3],prev);
    ev.sort((a,b)=>a.st-b.st);
    ev.forEach((e,i)=>{const nxt=ev[i+1]?ev[i+1].st:128;e.len=Math.max(1,Math.min(4,nxt-e.st))});
    return ev;
  }
  function play(id){
    const ac=Sound.ac;if(!ac||!Sound.pref.music) return;
    if(song&&song.id===id&&timer) return;
    stop();
    const th=THEMES[id]||THEMES.nim,sc=SCALES[th.sc],n=sc.length;
    const out=ac.createGain();out.gain.setValueAtTime(.0001,ac.currentTime);out.gain.exponentialRampToValueAtTime(1,ac.currentTime+1.2);out.connect(Sound.musicBus);
    const notes=compose(id,th),six=60/th.bpm/4;
    const mid=dg=>th.root+12*Math.floor(dg/n)+sc[((dg%n)+n)%n];
    let step=0,nextT=ac.currentTime+.15;
    song={id,th,out};
    const tick=()=>{
      while(nextT<ac.currentTime+.15){
        const s=step%16,bar=Math.floor(step/16)%8,chord=th.prog[bar%4];
        const t=nextT+(s%2?six*(th.swing||0):0);
        if(th.pad&&s===0) [0,2,4].forEach(x=>Sound.PADS[th.pad](out,t,mid(chord+x)-12,six*16));
        if(th.bass&&th.bp){const ch=th.bp[s];if(ch!=='.')Sound.BASS[th.bass](out,t,mid(chord+(ch==='o'?4:ch==='u'?n:0))-24,six*2)}
        if(th.dr) for(const k in th.dr) if(th.dr[k][s]==='x') Sound.DRUM[k](out,t);
        if(th.arp&&s%2===0) Sound.INST[th.arp](out,t,mid(chord+[0,2,4,n][(s/2)%4])+12,six*2,.45);
        notes.forEach(e=>{if(e.st===step%128)Sound.INST[th.lead](out,t,mid(e.dg),e.len*six,1)});
        nextT+=six;step++;
      }
    };
    tick();timer=setInterval(tick,30);
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null}
    if(song&&song.out){const ac=Sound.ac,o=song.out;o.gain.cancelScheduledValues(ac.currentTime);o.gain.setTargetAtTime(.0001,ac.currentTime,.25);setTimeout(()=>o.disconnect(),1500)}
    song=null;
  }
  return {play,stop,get current(){return song&&song.id},mood:id=>(THEMES[id]||THEMES.nim).m};
})();
