# Maze Dive: Templo (v2 plan)

A randomly generated 3D temple maze built with Three.js. Each level opens with a bird's-eye view of the whole maze, then the camera swoops into first person at the start cell. Aztec theme: carved stone, obsidian floors, jade light, torch glow.

File: `maze-dive-templo.html` (single file, Three.js r128 from cdnjs, no other assets).

## Game modes

| Mode | Blessings | Eagle Sight | Handprints | Guardian |
|---|---|---|---|---|
| **Classic** (default) | Random pickups, one-time use | Pickup | 6 to start, +3 per pickup, plus Glyph Trail | Toggle |
| **Purist** | None | 3 uses per level (~5s) | Unlimited, manual or auto | Toggle |

## Setup screen

| Option | Choices |
|---|---|
| Mode | Classic, Purist |
| Size | Small 10x10, Medium 15x15, Large 20x20, Custom |
| Custom | Width and height set independently, 5 to 40 cells (30 on touch devices) |
| Progression | Fixed size, or grow by 1 cell per level (capped) |
| Seed | Optional text. Empty gives a random seed |
| Auto handprints | Purist only |
| Guardian | On by default |

Rectangles are plain rectangles only. L-shapes and other footprints are out of scope for now.

**URL parameters** (for sharing and quick tests): `?seed=abc&size=12x8&mode=purist&guard=0&grow=1`

## Maze generation

- Recursive backtracker on a `cw x ch` cell grid, stored as a `(2ch+1) x (2cw+1)` tile grid (`1` wall, `0` floor).
- About 8% of cells' worth of walls are knocked out to make loops.
- Seed string is `seed:level:WxH`, so the same seed and size always give the same maze. Best times are stored under `mode:seed:level:WxH`.
- Exit at the BFS-farthest cell from the start.
- Scaling by area: blessing count is `cells / 9`, guardian creep speed rises with area (about 1.1 to 2.1 units/s).

## Camera and rendering

- Walls are one `InstancedMesh`; breaking a wall scales that instance to zero.
- Bird's-eye height is computed from both the vertical and horizontal field of view, so long mazes fit on any screen shape.
- Intro swoop and Eagle Sight share one blend (position, pitch, yaw). Any key or tap skips the intro.
- Procedural textures only (canvas): carved sandstone with a stepped-fret band and gold glyph, obsidian floor tiles with a jade diamond, ochre handprint mark.
- Warm torch light follows the player and flickers. Pixel ratio capped at 2, no shadows.

## Controls

| Action | Keyboard / mouse | Touch | PS4 |
|---|---|---|---|
| Move | WASD / arrows | Left joystick | Left stick |
| Look | Mouse (pointer lock) | Drag right half | Right stick |
| Use blessing | E | Use | Circle |
| Cycle | Q or 1-5 | Tap slot | L1 / R1 |
| Eagle Sight | B | Eagle | Triangle |
| Handprint | F | Mark | Square |
| Leap | Space | Leap | Cross |
| Pause | P / Esc | n/a | Options |
| Mute | M | Speaker button | n/a |

The game also pauses when the tab loses focus.

## Blessings (Classic, one-time use)

| Blessing | Was | Effect |
|---|---|---|
| Spirit Walk | Ghost | Walk through walls for 6s |
| Obsidian Hammer | Wall Breaker | Shatters the wall in front of you |
| Eagle Sight | Bird's Eye | Top-down view for 5s |
| Jaguar Leap | High Jump | One big jump to peek over walls |
| Quetzal Feather Trail | Path Hint | Feather markers to the exit for 6s |
| **Glyph Trail** (new) | n/a | Auto-paints handprints behind you for 30s, free |
| Ochre handprints | Chalk | +3 marks |

## Guardian

An obsidian jaguar warrior with a jade mask and feather crest. It stands still while you look at it and creeps toward you when you look away. If it reaches you: +5s, a gold burst and a deep drum, and it reappears elsewhere. It is hidden in Eagle Sight. A heartbeat drum quickens while it watches you. This is the base for a later chasing or lethal version.

## Sound and effects

- **Sound** (WebAudio, all procedural): low temple drone, torch crackle, pickup chime, stone shatter, leap, use, eagle whoosh, guardian drum and hit, conch on exit. Audio starts on the first Enter click, voices are capped at 8, and M or the speaker button mutes. Important sounds also show a text toast.
- **Effects:** one pooled particle system (160 particles, no per-frame allocation) for stone dust, pickup sparks and guardian hits. Reduced-motion setting halves bursts and turns off screen shake and light flicker.

## Skills used

| Skill | Applied as |
|---|---|
| `build-hybrid-game-assets` | All assets are procedural (textures, guardian, exit). Nothing imported. |
| `build-game-audio-feedback` | Cue per event, voice cap, unlock on gesture, mute, text equivalents |
| `create-game-vfx` | Pooled, capped particles with a reduced-motion path |
| `build-mobile-threejs-games` | Safe areas, size cap on phones, pause on background |
| `build-game-inventory` | Blessings defined once in `BUFFS`; use removes an item only if it worked |
| `optimize-threejs-games` | Shared geometry and materials, instanced walls, capped marks (700) |
| `test-playable-web-games` | URL parameters for repeatable setups |

## Roadmap

1. Seeded generator, rectangles, size setup. **Done**
2. Aztec reskin, renamed blessings, Glyph Trail. **Done**
3. Sound and particles (first pass). **Done**
4. Camera and mobile polish. *Partly done: pause on background, viewport fit. Head bob and a reset-look button still to do*
5. Optimization pass with measured draw calls and frame time. *Next, on a real device*
6. Playtest pass over the matrix below. *Next*
7. Chasing or lethal guardian (`build-threejs-enemy-systems`, `tune-enemy-ai`). *Later*
8. More blessings: Speed, Teleport, Reveal Exit, Lantern. *Later*
9. Hand-built set-piece chambers (`author-game-levels`). *Later*

## Test matrix

| Case | URL |
|---|---|
| Rectangle fit | `?size=30x8&seed=t1` |
| Tall rectangle on phone portrait | `?size=8x30&seed=t2` |
| Purist rules | `?mode=purist&seed=t3` |
| No guardian | `?guard=0&seed=t4` |
| Growth | `?grow=1&size=6x6` then clear two levels |

Check each on desktop, touch portrait and touch landscape: intro framing, movement, each blessing, mute, pause and resume, console errors.

## Open questions

- Should Jaguar Leap let you land on walls? (Currently peek only.)
- Auto handprints on by default for mobile?
- Difficulty curve beyond 40x40, and whether larger mazes need a minimap.
