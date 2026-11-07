"use strict";
/* The loading screen (#loader in index.html): a sudoku fact every few seconds while the site gets ready.
   Loaded straight after the loader's markup, before everything else. boot() in app.js calls Loader.done(). */
const Loader=(()=>{
  const FACTS=[
    'Modern sudoku was invented in 1979 by Howard Garns, a retired architect from Indiana. It was first printed as “Number Place”.',
    'The name comes from the Japanese “sūji wa dokushin ni kagiru”: the digits must stay single. The puzzle company Nikoli named it in 1984, and the name was soon shortened to sudoku.',
    'There are 6,670,903,752,021,072,936,960 ways to fill a sudoku grid. That’s about 6.7 sextillion.',
    'Count grids that are only rotations, reflections or relabellings of each other as the same, and there are still 5,472,730,538 different sudokus.',
    'A sudoku needs at least 17 clues to have just one answer. Mathematicians proved it in 2012 with a computer search that took about 7 million hours of processor time.',
    'Sudoku went worldwide after The Times in London started printing it in November 2004, thanks to Wayne Gould, a retired judge from New Zealand.',
    'The first World Sudoku Championship was held in Lucca, Italy, in 2006.',
    'A finished sudoku is a special kind of Latin square, a pattern the mathematician Leonhard Euler studied in the 1700s.',
    'French newspapers printed puzzles very like sudoku in the 1890s, almost a century before the modern version.',
    'Sudoku has nothing to do with sums. Letters, colours or shapes would work just as well as the digits 1 to 9.',
    'In Japan, Nikoli owns the name Sudoku, so other Japanese puzzle books call it Nanpure, short for “number place”.'
  ];
  const MIN=1200,MAX=10000; // long enough to read a fact; never stuck if something fails to load
  const box=document.getElementById('loader'),txt=document.getElementById('ldFact');
  let k=Math.floor(Math.random()*FACTS.length),tick=0,gone=null;
  const wait=ms=>new Promise(ok=>setTimeout(ok,ms));
  const next=()=>{txt.classList.add('swap');setTimeout(()=>{k=(k+1)%FACTS.length;txt.textContent=FACTS[k];txt.classList.remove('swap')},300)};
  if(box&&txt){txt.textContent=FACTS[k];tick=setInterval(next,5000)}
  const loaded=new Promise(ok=>{if(document.readyState==='complete')ok();else addEventListener('load',ok,{once:true})});
  function hide(){
    if(gone) return gone;
    clearInterval(tick);
    if(!box) return gone=Promise.resolve();
    box.classList.add('out');setTimeout(()=>box.remove(),450);
    return gone=Promise.resolve();
  }
  /* waits for the page, its fonts and a short minimum, then fades out */
  function done(){
    if(gone) return gone;
    const ready=Promise.all([loaded,document.fonts?document.fonts.ready:null,wait(Math.max(0,MIN-performance.now()))]);
    return Promise.race([ready,wait(MAX)]).then(hide);
  }
  setTimeout(hide,MAX+2000);
  return {done};
})();
