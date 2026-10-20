# PlayTheory

Two players, one screen. Challenge a friend, unwind, or keep your brain sharp.

PlayTheory deals you a random game, shows its rules and a short demo, and lets two people play on the same computer. There are 34 games, including Nim, Domineering, Hackenbush, Amazons, Hex, Dots & Boxes, Toppling Dominoes and Clobber. Every game has its own music, sounds and animations, and a themed board (trains, frogs, bowling pins, chocolate, marble queens and more). Use the **Themed** button to switch to a plain look.

**Play it:** open `index.html` in a browser, or visit the GitHub Pages site.

## How it is built

Plain HTML, CSS and JavaScript. No build step and no dependencies.

| File | What it does |
|---|---|
| `index.html` | The page |
| `css/style.css` | Styles. Brand colours are at the top (`--brand-blue`, `--charcoal`) |
| `js/util.js` | Shared helpers and app state |
| `js/views.js` | Board views shared by several games (heaps, strips, grids) |
| `js/games.js` | The 34 games: rules, legal moves, board and move animations |
| `js/fx.js` | Particle effects (the Amazons flaming arrow, captures, confetti) |
| `js/audio.js` | Generated music themes for every game, and sound effects |
| `js/skins.js` | Themed boards: the drawn pieces and per-game table styles. Classic mode turns it off |
| `js/demo.js` | The "Watch a round" demo that plays real games on a loop |
| `js/app.js` | The game table: dealing, turns, intro screens, sound controls |

### Adding a game

Add a `def({...})` block to `js/games.js` with `create`, `moves`, `hasMove` and `render`, then add a music theme for its `id` in `THEMES` in `js/audio.js`.
