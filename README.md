# Dino Run 3D

A 3D, Chrome-dino-inspired endless runner built with [three.js](https://threejs.org/). Run through a green forest, jump over cacti, rocks and logs, and duck under pterodactyls.

## Run it

Open `index.html` in a browser. three.js loads from a CDN, so you need an internet connection.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Jump / start / restart | `Space`, `Up`, `W` | Tap |
| Duck (and fast-fall in the air) | `Down`, `S` | Hold the bottom of the screen |

## Difficulty

Each 250 points is one level (shown as `LV` in the top-right).

| Level | What changes |
| --- | --- |
| Always | Speed ramps up with score (14 up to 40) |
| 2+ | Fallen logs appear, cactus clusters grow |
| 3+ | Pterodactyls (faster than the ground), fire traps and lava pits (jump over them) |
| 4+ | Stone arches (duck under, jumping hits them), taller cacti, tighter gaps, back-to-back combos |
| 5+ | Fast rolling boulders and mid-height pterodactyls that can only be jumped over |
| 6+ | Swinging axes (time your run, pass under when the blade swings high), shrinking gaps and thicker fog |

A day/night cycle switches every 700 points.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | HUD and message styling |
| `game.js` | Scene, scenery, game logic and difficulty |
| `README.md` | This file |

## Tweaking

All in `game.js`:

- `GRAV` and `JUMP` control jump feel.
- `spawn()` controls obstacle types and spacing per level.
- `update()` sets the speed curve (`14 + score * 0.02`, capped at 40).
- The scenery loops (trees, bushes, flowers, hills) control how much greenery there is.

The high score is stored in your browser's local storage.
