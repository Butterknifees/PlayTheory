# PlayTheory

Two players, one screen. Challenge a friend, unwind, or keep your brain sharp.

PlayTheory opens on a page of game cards: pick one (or tap **Random mode** for a run of games picked at random, with a running score), read its rules, watch a short demo, and play. The featured game, **DuSoKu**, gets a big card at the top: a shared sudoku with ×2/×3 bonus squares, at Medium or Hard. By default a number scores by difficulty, a value ranked by how many copies of it are still to place; number value scoring, where it scores its own value, is an option. By default both players race in rapid fire against a 10-minute game clock (3 and 5 minutes are options too); they can also take turns with a 30-second turn limit. There are 35 games in all, including Nim, Domineering, Hackenbush, Amazons, Hex, Dots & Boxes, Toppling Dominoes and Clobber. Every game has its own music, sounds and animations, and a themed board (trains, frogs, bowling pins, chocolate, marble queens and more). Use the **Themed** button to switch to a plain look.

**Right now DuSoKu, Amazons, Exed-Out, Hollow and Candy Words are open.** Candy Words is the one game for a single player: a daily word puzzle played like a match-three game. Swap two letter tiles side by side to spell a word of 4 letters or more across or down; the word clears and scores its letter points (times 2 for 5 letters, 3 for 6, and so on), new letters fall in, and words that form as they land score double, then triple. Everyone gets the same board each day (new at midnight IST) and has 7 minutes 30 seconds. Random mode deals only the two-player games. Exed-Out is tic-tac-toe on 3 to 5 boards where both players draw X: three in a row closes a board, and whoever closes the last one loses (1 minute per board each). Hollow is a triangle of 21 hexagons where each player places 1 to 10 in turn; the lower total around the one empty hexagon wins (4 minutes each). Amazons is played on a small board with a chess clock: 4 minutes each, at most 20 seconds a move (the turn passes if you take longer), and running out of your 4 minutes loses. Every other card says *Coming soon* and can't be started. To open another game, add its `id` to `PLAYABLE` in `js/app.js`.

**Play it:** open `index.html` in a browser, or visit the GitHub Pages site. It works on phones too: boards shrink to fit, the rules and demo open from **How to play**, and moves that show a preview take two taps (look, then play).

**Play on two devices:** open DuSoKu, choose **Play a friend online → Challenge a friend** and send the link. Your friend opens it and plays black on their own phone or computer. This needs a free Firebase project; see [ONLINE.md](ONLINE.md).

## How it is built

Plain HTML, CSS and JavaScript. No build step and no dependencies.

| File | What it does |
|---|---|
| `index.html` | The page |
| `css/style.css` | Styles. Brand colours are at the top (`--brand-blue`, `--charcoal`) |
| `js/util.js` | Shared helpers and app state |
| `js/views.js` | Board views shared by several games (heaps, strips, grids) |
| `js/games.js` | The 34 games: rules, legal moves, board and move animations |
| `js/candywords.js` | Candy Words, the daily word puzzle for one player |
| `data/words.txt` | Candy Words' word list: the public-domain ENABLE list, 4 to 8 letters, offensive words removed |
| `js/fx.js` | Particle effects (the Amazons flaming arrow, captures, confetti) |
| `js/audio.js` | Generated music themes for every game, and sound effects |
| `js/skins.js` | Themed boards: the drawn pieces and per-game table styles. Classic mode turns it off |
| `js/online.js` | Challenge links: syncs a match between two devices through Firebase |
| `js/firebase-config.js` | Your Firebase project config (empty until online play is set up) |
| `database.rules.json` | Security rules to paste into the Firebase console |
| `js/demo.js` | The "Watch a round" demo that plays real games on a loop |
| `js/app.js` | The game table: dealing, turns, intro screens, sound controls |

### Search pages

`duo-sudoku/` and `games-like-chess/` are plain landing pages for search engines (styles in `css/page.css`). `robots.txt`, `sitemap.xml`, `og-image.png` (the link preview) and the icons sit at the top level. When you add a page, add it to `sitemap.xml` too.

### Adding a game

Add a `def({...})` block to `js/games.js` with `create`, `moves`, `hasMove` and `render`, then add a music theme for its `id` in `THEMES` in `js/audio.js`.
