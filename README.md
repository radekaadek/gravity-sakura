# Gravity Sakura (ぐらびてぃ さくら)
Japanese pixel-art anime platformer with reversible gravity. Open `index.html` in a browser (single file, no dependencies).

Controls: A/D or arrows = move · Space/Z/W/S/Up/Down = flip gravity (from the ground) · X = sakura shot · P/Esc = pause · M = mute · V = CRT scanlines · R = restart
Gamepad and touch buttons supported. 5 stages, boss fight, saved progress.

Dev: edit `src/*.js`, run `./build.sh` to bundle; `node tools/validate.js` proves every stage is beatable by BFS over the real physics.
