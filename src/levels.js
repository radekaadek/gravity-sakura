// levels.js — five hand-built stages. Rows 0 and 11 are ceiling/floor, interior rows 1..10.
// Legend: # solid  b crumble  i ice  ^ floor spike  v ceiling spike  O gravity orb
//         S start  E exit gate  C checkpoint  o coin  * sakura petal  h heart  ? hint sign
//         e oni walker  g ghost  s fox statue (shoots left)  z fox statue (shoots right)  B boss
(function (root) {
  const Grid = root.Core.Grid;

  function level1() {
    const g = new Grid(122);
    g.put(3, 10, 'S');
    g.put(6, 10, '?');                     // hint 0: flip
    g.coins(9, 10, 4);
    g.put(13, 10, '?');                    // hint 1: wall
    g.pillarF(16, 5, 2);
    g.put(16, 5, '*');                     // petal on top of the pillar
    g.coins(14, 1, 3); g.coins(19, 1, 6);
    g.put(26, 1, '?');                     // hint 2: ceiling spikes
    g.spikesC(31, 4);
    g.coins(31, 10, 4);
    g.put(39, 10, 'C');
    g.put(42, 10, '?');                    // hint 3: floor spikes
    g.spikesF(46, 4);
    g.coins(46, 1, 4);
    g.block(60, 6, 5); g.put(62, 5, '*');  // island with petal
    g.coins(58, 1, 2);
    g.put(68, 10, '?');                    // hint 4: shoot
    g.put(74, 10, 'e');
    g.coins(72, 10, 2);
    g.pillarF(82, 5, 2);
    g.put(88, 1, 'e');
    g.coins(84, 1, 3);
    g.pillarC(96, 5, 2);
    g.put(94, 10, 'C');
    g.coins(98, 10, 3);
    g.spikesF(104, 4);
    g.coins(104, 1, 4);
    g.block(111, 4, 3); g.put(112, 6, '*'); // petal underneath a floating block
    g.put(114, 1, 'h');
    g.coins(116, 10, 2);
    g.put(119, 10, 'E');
    return {
      name: 'SAKURA VILLAGE', kana: 'さくらのさと', sub: 'STAGE 1', theme: 0, rows: g.rows(),
      hints: ['SPACE FLIPS GRAVITY!', 'WALL AHEAD - FLIP OVER IT!', 'SPIKES! FLIP DOWN BEFORE THEM', 'SPIKES BELOW! GO UP', 'X SHOOTS SAKURA'],
    };
  }

  function level2() {
    const g = new Grid(140);
    g.put(3, 10, 'S');
    g.put(6, 10, '?');
    g.coins(8, 10, 3);
    // bamboo zigzag
    g.pillarF(14, 7, 1); g.pillarC(21, 7, 1); g.pillarF(28, 7, 1); g.pillarC(35, 7, 1); g.pillarF(42, 7, 1);
    g.put(28, 3, '*');
    g.coins(15, 1, 5); g.coins(22, 10, 5); g.coins(29, 1, 5); g.coins(36, 10, 5);
    g.put(46, 10, 'C');
    g.put(48, 10, '?');
    // orb gauntlet (floor spikes only, orbs 3 tiles apart, roomy landing ledges)
    g.block(50, 7, 4);
    g.rect(54, 10, 10, 1, '^');
    g.put(55, 6, 'O'); g.put(58, 5, 'O'); g.put(61, 6, 'O');
    g.put(58, 3, '*'); g.coins(56, 5, 1);
    g.block(64, 7, 5);
    g.put(65, 6, 'C');
    g.put(67, 5, 'h');
    // crumbling bridge over spikes
    g.rect(69, 10, 11, 1, '^');
    g.block(69, 8, 4, 'b'); g.block(73, 8, 2); g.block(75, 8, 5, 'b');
    g.coins(70, 7, 9);
    // fox statues
    g.put(100, 10, 's');
    g.coins(103, 10, 3);
    g.put(106, 10, 'C');
    // spike weave (2-wide spikes, wide gaps, no ghost)
    g.spikesF(113, 2); g.spikesC(121, 2); g.spikesF(129, 2);
    g.coins(113, 1, 2); g.coins(121, 10, 2); g.coins(129, 1, 2);
    g.block(120, 4, 2); g.put(120, 3, '*');
    g.put(135, 10, 'E');
    return {
      name: 'BAMBOO GROVE', kana: 'たけやぶ', sub: 'STAGE 2', theme: 1, rows: g.rows(),
      hints: ['GRAVITY ORBS FLIP YOU IN MID-AIR'],
    };
  }

  function level3() {
    const g = new Grid(150);
    g.put(3, 10, 'S');
    g.put(7, 10, '?');
    g.coins(9, 10, 4);
    // lantern sawtooth: 2-wide spikes, long safe runs between them
    for (let i = 0; i < 4; i++) {
      g.spikesF(20 + i * 14, 2); g.spikesC(27 + i * 14, 2);
      g.coins(20 + i * 14, 1, 2); g.coins(27 + i * 14, 10, 2);
    }
    g.put(14, 10, 'e');
    g.put(40, 1, 'g');
    g.put(52, 10, 'C');
    g.block(36, 6, 3); g.put(37, 5, '*');
    // ghost gallery (one ghost, wide gaps)
    g.pillarF(80, 5, 2); g.pillarC(86, 5, 2); g.pillarF(92, 5, 2);
    g.put(83, 5, 'g');
    g.put(86, 7, '*');
    g.put(96, 10, 'C');
    // orb ladder: floor spikes only, 3 orbs 3 tiles apart, wide ledges
    g.rect(101, 10, 10, 1, '^');
    g.block(98, 7, 3);
    g.put(102, 6, 'O'); g.put(105, 5, 'O'); g.put(108, 6, 'O');
    g.put(105, 3, '*');
    g.block(111, 7, 5);
    g.put(113, 6, 'h');
    // finale: two statues' worth of nothing, just a few wide spikes
    g.put(122, 10, 's');
    g.spikesF(127, 2); g.spikesC(133, 2); g.spikesF(139, 2);
    g.coins(127, 1, 2); g.coins(133, 10, 2); g.coins(139, 1, 2);
    g.put(130, 1, '*');
    g.put(146, 10, 'E');
    return {
      name: 'NIGHT FESTIVAL', kana: 'よまつり', sub: 'STAGE 3', theme: 2, rows: g.rows(),
      hints: ['GHOSTS DRIFT THROUGH WALLS - SHOOT THEM'],
    };
  }

  function level4() {
    const g = new Grid(150);
    g.rect(0, 11, 150, 1, 'i');
    g.put(3, 10, 'S');
    g.put(7, 10, '?');
    g.coins(10, 10, 4);
    g.spikesF(24, 3); g.spikesC(34, 3); g.spikesF(44, 3);
    g.coins(24, 1, 3); g.coins(34, 10, 3); g.coins(44, 1, 3);
    g.block(28, 6, 4, 'i'); g.put(29, 5, '*');
    g.put(52, 10, 'C');
    // ice shelves
    g.block(56, 7, 6, 'i'); g.block(66, 4, 6, 'i'); g.block(76, 7, 6, 'i');
    g.put(68, 3, 'e'); g.put(58, 6, 'e');
    g.coins(60, 8, 1); g.coins(70, 5, 1);
    g.put(70, 3, '*');
    g.rect(86, 10, 12, 1, '^');
    g.block(86, 8, 12, 'b');
    g.put(98, 10, 'C');
    g.pillarF(102, 5, 2); g.pillarC(108, 5, 2); g.pillarF(114, 5, 2);
    g.put(103, 4, '*');
    g.put(111, 10, 's');
    g.put(121, 10, 'g'); g.put(125, 1, 'g');
    g.spikesF(124, 2); g.spikesC(132, 2);
    g.put(136, 5, 'h');
    g.put(146, 10, 'E');
    return {
      name: 'SNOW SHRINE', kana: 'ゆきのじんじゃ', sub: 'STAGE 4', theme: 3, rows: g.rows(),
      hints: ['ICE IS SLIPPERY - BRAKE EARLY'],
    };
  }

  function level5() {
    const g = new Grid(138);
    g.put(3, 10, 'S');
    g.put(7, 10, '?');
    g.holeF(14, 4); g.holeF(26, 4); g.holeC(20, 4); g.holeC(32, 4);
    g.coins(14, 10, 4);
    g.put(46, 10, 'C');
    g.block(38, 6, 3); g.put(39, 5, '*');
    g.pillarF(50, 6, 1); g.pillarC(54, 6, 1); g.pillarF(58, 6, 1); g.pillarC(62, 6, 1);
    g.spikesF(66, 4);
    g.put(70, 10, 'e'); g.put(72, 1, 'e');
    g.block(76, 5, 4); g.put(77, 4, '*');
    g.block(80, 7, 3);
    g.rect(83, 10, 7, 1, '^'); g.rect(83, 1, 7, 1, 'v');
    g.put(83, 8, 'O'); g.put(85, 4, 'O'); g.put(87, 8, 'O'); g.put(89, 4, 'O');
    g.put(86, 6, '*');
    g.block(90, 7, 4);
    g.put(91, 6, 'C');
    g.put(100, 10, 's'); g.put(104, 1, 'z');
    g.put(108, 10, 'h');
    // boss arena: columns 117..137
    g.rect(116, 1, 1, 10, '#');
    g.rect(116, 5, 1, 3, '.');   // doorway
    g.block(121, 7, 4); g.block(130, 7, 4);
    g.block(125, 4, 5);
    g.put(127, 6, 'B');
    g.put(119, 6, 'C');
    return {
      name: 'SKY CASTLE', kana: 'そらのしろ', sub: 'STAGE 5', theme: 4, rows: g.rows(),
      hints: ['THE SKY HAS NO FLOOR - DO NOT FALL'],
      arena: { x0: 117, x1: 137 },
    };
  }

  root.LEVELS = [level1(), level2(), level3(), level4(), level5()];
})(typeof window !== 'undefined' ? window : globalThis);
