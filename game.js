(function () {
  'use strict';
  var hud = document.getElementById('hud'), msg = document.getElementById('msg');
  if (typeof THREE === 'undefined') {
    msg.innerHTML = '<h1>Could not load three.js</h1><p>Check your internet connection and reload.</p>';
    return;
  }
  var R = Math.random, tmp = new THREE.Color();

  // ================= renderer / scene =================
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.appendChild(renderer.domElement);

  var SKY_D = new THREE.Color(0x8fc9f0), SKY_N = new THREE.Color(0x0e1530);
  var scene = new THREE.Scene();
  scene.background = SKY_D.clone();
  scene.fog = new THREE.Fog(SKY_D.clone(), 40, 150);

  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400), camBase = new THREE.Vector3(-8, 5.5, 13);
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 78 : 55;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3f5a22, 0.9);
  var sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
  sun.position.set(-12, 30, 18); sun.target.position.set(15, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = sc.bottom = -55; sc.right = sc.top = 55; sc.near = 1; sc.far = 110;
  scene.add(hemi, sun, sun.target);

  var sunMesh = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false }));
  sunMesh.position.set(50, 40, -110); scene.add(sunMesh);

  // ================= helpers =================
  function std(c, flat) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: !!flat }); }
  var sphG = new THREE.SphereGeometry(1, 16, 12), cylG = new THREE.CylinderGeometry(1, 1, 1, 10),
      coneG = new THREE.ConeGeometry(1, 1, 6), boxG = new THREE.BoxGeometry(1, 1, 1), dodG = new THREE.DodecahedronGeometry(1, 0),
      leafG = new THREE.IcosahedronGeometry(1, 1);
  function part(g, m, sx, sy, sz, x, y, z, p) {
    var o = new THREE.Mesh(g, m);
    o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true;
    if (p) p.add(o);
    return o;
  }
  var ac;
  function beep(f, d, type, v) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square'; o.frequency.value = f; g.gain.value = v || 0.04;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
    } catch (e) {}
  }
  function noiseTex(hue, sat, light, spread, rx, ry) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + light + '%)'; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 4000; i++) {
      g.fillStyle = 'hsla(' + (hue + (R() - .5) * 18) + ',' + sat + '%,' + (light + (R() - .5) * spread * 2) + '%,.55)';
      g.fillRect(R() * 256, R() * 256, 1 + R() * 3, 1 + R() * 5);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return t;
  }

  // ================= ground: grass + dirt path =================
  var grassTex = noiseTex(100, 48, 30, 9, 50, 7.5), dirtTex = noiseTex(30, 38, 36, 8, 50, 0.8);
  var grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(60, 0, -15); grass.receiveShadow = true; scene.add(grass);
  var path = new THREE.Mesh(new THREE.PlaneGeometry(400, 6.5), new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1 }));
  path.rotation.x = -Math.PI / 2; path.position.set(60, 0.03, 0); path.receiveShadow = true; scene.add(path);

  // ================= scenery (parallax, recycled) =================
  var scen = [];
  function addS(m, mul, min, span) { m.userData = { mul: mul, min: min, span: span }; scene.add(m); scen.push(m); }

  var trunkM = std(0x5b3a21), leafMs = [std(0x2f7a32, 1), std(0x3a8f3a, 1), std(0x25682c, 1)];
  function makeTree() {
    var g = new THREE.Group(), h = 3 + R() * 4, lm = leafMs[Math.floor(R() * 3)];
    part(cylG, trunkM, 0.4, h, 0.4, 0, h / 2, 0, g);
    for (var i = 0; i < 3; i++) {
      var s = (2.3 - i * 0.55) * (0.8 + R() * 0.5);
      part(leafG, lm, s, s * 0.9, s, (R() - .5) * 0.8, h + i * 1.1, (R() - .5) * 0.8, g);
    }
    return g;
  }
  for (var i = 0; i < 34; i++) { var t = makeTree(); t.position.set(-20 + i * 4.4 + R() * 3, 0, -8 - R() * 26); addS(t, 1, -25, 150); }

  var bushMs = [std(0x3c8a3a, 1), std(0x2e7a34, 1)];
  for (i = 0; i < 46; i++) {
    var b = new THREE.Mesh(leafG, bushMs[i % 2]), bs = 0.5 + R() * 0.9, front = i % 2;
    b.scale.set(bs * 1.3, bs * 0.8, bs); b.castShadow = true;
    b.position.set(-20 + R() * 150, bs * 0.4, front ? 4.6 + R() * 2.5 : -4.5 - R() * 4);
    addS(b, 1, -25, 150);
  }
  var tuftMs = [std(0x4fa03f), std(0x6bb04a)], flowerMs = [std(0xffe14d), std(0xffffff), std(0xff7aa8)];
  for (i = 0; i < 130; i++) {
    var side = R() < .5 ? 1 : -1, z = side * (3.7 + R() * 5), f = R() < .2;
    var m = new THREE.Mesh(f ? sphG : coneG, f ? flowerMs[i % 3] : tuftMs[i % 2]);
    if (f) { m.scale.set(.13, .13, .13); m.position.set(-20 + R() * 150, .3, z); }
    else { m.scale.set(.14, .5 + R() * .5, .14); m.position.set(-20 + R() * 150, m.scale.y / 2, z); }
    addS(m, 1, -25, 150);
  }
  var hillMs = [std(0x4a7a46, 1), std(0x3f6a3d, 1)];
  for (i = 0; i < 8; i++) {
    var hl = new THREE.Mesh(sphG, hillMs[i % 2]);
    hl.scale.set(22 + R() * 22, 8 + R() * 10, 16); hl.position.set(i * 28 - 10, -2, -75);
    addS(hl, 0.1, -60, 230);
  }
  var mtnM = std(0x6f8aa8, 1);
  for (i = 0; i < 5; i++) {
    var mt = new THREE.Mesh(coneG, mtnM);
    mt.scale.set(30 + R() * 20, 30 + R() * 20, 30); mt.position.set(i * 50, 12, -115);
    addS(mt, 0.04, -80, 250);
  }
  var cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x404050, roughness: 1 });
  for (i = 0; i < 9; i++) {
    var cg = new THREE.Group();
    [[0, 0, 3.2], [2.4, .5, 2.4], [-2.4, -.2, 2.2], [.8, 1.2, 2]].forEach(function (c) {
      var s = new THREE.Mesh(sphG, cloudM); s.scale.set(c[2], c[2] * .55, c[2] * .8); s.position.set(c[0], c[1], 0); cg.add(s);
    });
    cg.position.set(-20 + i * 17, 14 + R() * 9, -25 - R() * 25);
    addS(cg, 0.12, -40, 155);
  }

  // ================= dino =================
  var skin = std(0x7b9a3b), spikeM = std(0x4e6b25), white = std(0xffffff), black = std(0x111111);
  var dino = new THREE.Group(), upper = new THREE.Group(), tail = new THREE.Group(), legs = [];
  upper.position.y = 1.3; dino.add(upper);
  part(sphG, skin, 1.0, 0.8, 0.65, 0, 0.75, 0, upper);
  part(cylG, skin, 0.35, 1.0, 0.35, 0.55, 1.5, 0, upper).rotation.z = -0.35;
  part(sphG, skin, 0.85, 0.55, 0.5, 1.0, 2.15, 0, upper);
  part(sphG, skin, 0.7, 0.35, 0.4, 1.6, 2.05, 0, upper);
  for (i = 0; i < 5; i++) part(coneG, spikeM, 0.18, 0.5, 0.18, 0.6 - i * 0.42, 1.45, 0, upper);
  [-1, 1].forEach(function (s) {
    part(sphG, white, 0.15, 0.15, 0.15, 1.15, 2.3, s * 0.38, upper);
    part(sphG, black, 0.08, 0.08, 0.08, 1.25, 2.3, s * 0.46, upper);
    part(cylG, skin, 0.08, 0.45, 0.08, 0.9, 0.7, s * 0.5, upper).rotation.z = -0.8;
    var lg = new THREE.Group(); lg.position.set(0, 1.3, s * 0.4);
    part(sphG, skin, 0.45, 0.6, 0.4, 0, -0.3, 0, lg);
    part(cylG, skin, 0.2, 0.9, 0.2, 0, -0.85, 0, lg);
    part(boxG, skin, 0.85, 0.2, 0.4, 0.2, -1.25, 0, lg);
    dino.add(lg); legs.push(lg);
  });
  tail.position.set(-0.7, 0.8, 0); upper.add(tail);
  part(sphG, skin, 0.8, 0.45, 0.4, -0.6, 0.05, 0, tail);
  part(sphG, skin, 0.6, 0.3, 0.3, -1.4, 0.35, 0, tail);
  part(sphG, skin, 0.45, 0.2, 0.2, -2.0, 0.6, 0, tail);
  scene.add(dino);

  // ================= obstacles =================
  var cactM = std(0x2f7d3b), rockM = std(0x80807a, 1), logM = std(0x5a3d26), pteroM = std(0x8b4f3a), obstacles = [];
  function makeCactus(L) {
    var g = new THREE.Group(), n = 1 + Math.floor(R() * Math.min(3, 1 + L / 2)), maxH = 0;
    for (var i = 0; i < n; i++) {
      var h = 1.8 + R() * Math.min(2.2, 1 + 0.15 * L), cg = new THREE.Group();
      cg.position.x = i * 1.3 - (n - 1) * 0.65;
      part(cylG, cactM, 0.38, h, 0.38, 0, h / 2, 0, cg); part(sphG, cactM, 0.38, 0.38, 0.38, 0, h, 0, cg);
      if (h > 2.3) [-1, 1].forEach(function (s) {
        part(cylG, cactM, 0.18, 0.7, 0.18, s * 0.5, h * 0.5, 0, cg).rotation.z = Math.PI / 2;
        part(cylG, cactM, 0.18, 0.8, 0.18, s * 0.85, h * 0.5 + 0.4, 0, cg);
      });
      g.add(cg); maxH = Math.max(maxH, h);
    }
    return { mesh: g, w: (n - 1) * 1.3 + 1.0, y0: 0, y1: maxH * 0.9 };
  }
  function makeRock() {
    var g = new THREE.Group(), sx = 1.1 + R() * 0.5, sy = 0.9 + R() * 0.5;
    part(dodG, rockM, sx, sy, 1.0, 0, sy * 0.5, 0, g).rotation.y = R() * 3;
    return { mesh: g, w: sx * 1.7, y0: 0, y1: sy * 1.5 * 0.9 };
  }
  function makeLog() {
    var g = new THREE.Group(), L = 2.2 + R() * 1.4;
    part(cylG, logM, 0.55, L, 0.55, 0, 0.55, 0, g).rotation.z = Math.PI / 2;
    return { mesh: g, w: L * 0.9, y0: 0, y1: 1.0 };
  }
  function makePtero(cy) {
    var g = new THREE.Group(), wings = [];
    part(sphG, pteroM, 0.9, 0.35, 0.35, 0, 0, 0, g);
    part(coneG, pteroM, 0.15, 0.9, 0.15, -1.2, 0, 0, g).rotation.z = Math.PI / 2;
    part(coneG, pteroM, 0.2, 0.7, 0.2, 0.9, 0.4, 0, g).rotation.z = -Math.PI / 2;
    [-1, 1].forEach(function (s) {
      var w = new THREE.Group(); w.position.set(0.1, 0.2, s * 0.25);
      part(boxG, pteroM, 0.9, 0.08, 1.6, 0, 0, s * 0.8, w); g.add(w); wings.push({ w: w, s: s });
    });
    g.position.y = cy;
    return { mesh: g, w: 1.8, y0: cy - 0.45, y1: cy + 0.45, wings: wings };
  }

  // ---- Temple-Run style hazards ----
  var stoneM = std(0x8a8a82, 1), metalM = std(0x9aa3ad), bladeM = std(0xc9d1d9),
      lavaM = new THREE.MeshStandardMaterial({ color: 0x1a0500, emissive: 0xff3a00, emissiveIntensity: 0.6, roughness: 1 }),
      flameM = new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff3300, emissiveIntensity: 1.2 }),
      flameM2 = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb300, emissiveIntensity: 1.2 });
  // Lava pit: JUMP over it
  function makePit() {
    var g = new THREE.Group(), w = 4.5 + R() * 2 + (speed - 14) * 0.06;
    var p = part(boxG, lavaM, w, 0.05, 6.4, 0, 0.06, 0, g); p.castShadow = false;
    [-1, 1].forEach(function (s) { part(boxG, stoneM, 0.5, 0.2, 6.4, s * (w / 2 + 0.25), 0.1, 0, g); });
    return { mesh: g, w: w, y0: 0, y1: 0, anim: function () { lavaM.emissiveIntensity = 0.55 + 0.25 * Math.sin(runT * 3); },
      hit: function (o) { return Math.abs(o.mesh.position.x - 0.2) < w / 2 - 0.4 && y < 0.5; } };
  }
  // Fire trap: JUMP over it
  function makeFire() {
    var g = new THREE.Group(), fl = [];
    part(boxG, stoneM, 1.8, 0.4, 1.8, 0, 0.2, 0, g);
    [[0, 1.5, 0.5, flameM], [-0.45, 1.1, 0.35, flameM], [0.45, 1.2, 0.35, flameM], [0, 0.9, 0.28, flameM2]].forEach(function (f) {
      var c = part(coneG, f[3], f[2], f[1], f[2], f[0], 0.4 + f[1] / 2, 0, g); c.castShadow = false; fl.push({ m: c, h: f[1], x: f[0] });
    });
    return { mesh: g, w: 1.8, y0: 0, y1: 1.5, anim: function () {
      fl.forEach(function (f, i) { f.m.scale.y = f.h * (0.8 + 0.35 * Math.sin(runT * 7 + i * 2)); f.m.position.y = 0.4 + f.m.scale.y / 2; });
    } };
  }
  // Stone arch: DUCK under the lintel (jumping hits it)
  function makeArch() {
    var g = new THREE.Group();
    [-1, 1].forEach(function (s) { part(boxG, stoneM, 0.9, 3.45, 0.9, 0, 1.725, s * 3.0, g); });
    part(boxG, stoneM, 1.0, 0.7, 7.0, 0, 3.1, 0, g);
    [-1.2, 0, 1.3].forEach(function (z) { part(sphG, cactM, 0.35, 0.8, 0.35, 0.5, 2.7, z, g); });
    return { mesh: g, w: 1.2, y0: 2.75, y1: 20 };
  }
  // Rolling boulder: JUMP, it comes at you fast
  function makeBoulder(L) {
    var g = new THREE.Group(), ball = part(leafG, rockM, 1.4, 1.4, 1.4, 0, 1.4, 0, g);
    return { mesh: g, w: 2.2, y0: 0, y1: 2.4, vx: 8 + L * 1.5, anim: function (o, dt) { ball.rotation.z += (speed + o.vx) * dt / 1.4; } };
  }
  // Swinging axe: TIME your run, pass under when the blade swings high
  function makeAxe() {
    var g = new THREE.Group(), p = new THREE.Group(), AL = 6.4, ph = R() * 6;
    p.position.y = 8.4; g.add(p);
    [-1, 1].forEach(function (s) { part(cylG, stoneM, 0.35, 8.4, 0.35, 0, 4.2, s * 3.2, g); });
    part(boxG, stoneM, 0.6, 0.6, 7, 0, 8.4, 0, g);
    part(cylG, metalM, 0.1, AL, 0.1, 0, -AL / 2, 0, p);
    part(boxG, bladeM, 0.3, 1.5, 1.6, 0, -AL, 0, p);
    return { mesh: g, w: 2, y0: 0, y1: 0, t: 0, anim: function (o, dt) { o.t += dt; p.rotation.z = 1.05 * Math.sin(o.t * 2.4 + ph); },
      hit: function (o, yy, hh) {
        var th = p.rotation.z, bx = o.mesh.position.x + AL * Math.sin(th), by = 8.4 - AL * Math.cos(th);
        return Math.abs(bx - 0.2) < 1.4 && by - 0.75 < yy + hh && by + 0.75 > yy;
      } };
  }

  // ================= game state =================
  var GRAV = 60, JUMP = 24;
  var state = 'ready', speed = 14, score = 0, hi = 0, y = 0, vy = 0, onGround = true, duck = false;
  var sinceSpawn = 0, gap = 30, runT = 0, nightT = 0, shake = 0, deadAt = 0, lastMile = 0, lastL = 1;
  try { hi = parseInt(localStorage.getItem('dino3dHi'), 10) || 0; } catch (e) {}
  function pad(n) { return ('00000' + Math.floor(n)).slice(-5); }
  function level() { return 1 + Math.floor(score / 250); }
  function drawHud() { hud.innerHTML = '<span class="lv">LV ' + level() + '</span>HI ' + pad(hi) + ' &nbsp; ' + pad(score); }
  drawHud();

  function jump() { if (onGround) { vy = JUMP; onGround = false; beep(620, 0.1); } }
  function reset() {
    obstacles.forEach(function (o) { scene.remove(o.mesh); }); obstacles.length = 0;
    speed = 14; score = 0; y = 0; vy = 0; onGround = true; sinceSpawn = 0; gap = 30; lastMile = 0; lastL = 1; shake = 0;
    upper.rotation.z = 0; dino.position.y = 0;
  }
  function start() { reset(); state = 'run'; msg.style.display = 'none'; }
  function die() {
    state = 'dead'; deadAt = performance.now(); shake = 0.35; beep(140, 0.45, 'sawtooth', 0.06);
    if (score > hi) { hi = Math.floor(score); try { localStorage.setItem('dino3dHi', hi); } catch (e) {} }
    drawHud();
    msg.innerHTML = '<h1>GAME OVER</h1><p>Score ' + pad(score) + ' &nbsp;&middot;&nbsp; Level ' + level() + '</p><p>Press jump to play again</p>';
    msg.style.display = 'flex';
  }
  function press() {
    if (state === 'ready') { start(); jump(); }
    else if (state === 'dead') { if (performance.now() - deadAt > 400) start(); }
    else jump();
  }
  addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); if (!e.repeat) press(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); duck = true; }
  });
  addEventListener('keyup', function (e) { if (e.code === 'ArrowDown' || e.code === 'KeyS') duck = false; });
  renderer.domElement.addEventListener('pointerdown', function (e) {
    if (e.clientY > innerHeight * 0.72 && state === 'run') duck = true; else press();
  });
  addEventListener('pointerup', function () { duck = false; });

  // Difficulty scales with level (1 level per 250 points)
  function spawn() {
    var L = level(), o, r = R(), k = R();
    if (L >= 3 && r < Math.min(0.4, 0.12 + 0.04 * L)) {
      var hs = [1.3, 3.2]; if (L >= 5) hs.push(2.2);          // mid-height ptero: jump only
      o = makePtero(hs[Math.floor(R() * hs.length)]); o.vx = 3 + L * 1.2; // faster than the ground
    } else {
      var pool = ['cactus', 'cactus', 'rock'];
      if (L >= 2) pool.push('log');
      if (L >= 3) pool.push('fire', 'pit');
      if (L >= 4) pool.push('arch');
      if (L >= 5) pool.push('boulder');
      if (L >= 6) pool.push('axe');
      var kind = pool[Math.floor(R() * pool.length)];
      o = kind === 'cactus' ? makeCactus(L) : kind === 'rock' ? makeRock() : kind === 'log' ? makeLog() : kind === 'fire' ? makeFire() :
          kind === 'pit' ? makePit() : kind === 'arch' ? makeArch() : kind === 'boulder' ? makeBoulder(L) : makeAxe();
      o.vx = o.vx || 0;
    }
    o.mesh.position.x = 75; scene.add(o.mesh); obstacles.push(o);
    gap = speed * (Math.max(0.9, 1.6 - 0.1 * L) + R() * Math.max(0.3, 1 - 0.06 * L));
    if (L >= 4 && R() < Math.min(0.35, 0.05 * L)) gap = speed * 0.95; // tight back-to-back combo
  }

  function update(dt) {
    speed = Math.min(40, 14 + score * 0.02);
    score += speed * dt * 0.7;
    var L = level(), mile = Math.floor(score / 100);
    if (L > lastL) { lastL = L; beep(500, 0.1); setTimeout(function () { beep(800, 0.15); }, 120); }
    else if (mile > lastMile) { lastMile = mile; beep(900, 0.08); }

    if (!onGround) {
      vy -= GRAV * dt * (duck ? 2.2 : 1); y += vy * dt;
      if (y <= 0) { y = 0; vy = 0; onGround = true; }
    }
    sinceSpawn += speed * dt;
    if (sinceSpawn > gap) { spawn(); sinceSpawn = 0; }

    var h = duck && onGround ? 2.3 : 3.3;
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.mesh.position.x -= (speed + o.vx) * dt;
      if (o.wings) o.wings.forEach(function (w) { w.w.rotation.x = -w.s * Math.sin(runT * 2.2) * 0.7; });
      if (o.mesh.position.x < -15) { scene.remove(o.mesh); obstacles.splice(i, 1); continue; }
      if (o.anim) o.anim(o, dt);
      var hit = o.hit ? o.hit(o, y, h) : (Math.abs(o.mesh.position.x - 0.2) < o.w / 2 + 0.9 && y + 0.15 < o.y1 && y + h > o.y0);
      if (hit) die();
    }
    grassTex.offset.x += speed * dt / 8; dirtTex.offset.x += speed * dt / 8;
    scenery(speed * dt);
    drawHud();
  }
  function scenery(d) {
    scen.forEach(function (m) {
      var u = m.userData; m.position.x -= d * u.mul;
      if (m.position.x < u.min) m.position.x += u.span;
    });
  }

  function theme(dt) {
    var tg = Math.floor(score / 700) % 2 === 1 ? 1 : 0;
    nightT += (tg - nightT) * Math.min(1, dt * 2);
    scene.background.copy(SKY_D).lerp(SKY_N, nightT);
    scene.fog.color.copy(scene.background);
    scene.fog.far = Math.max(90, 150 - level() * 6);
    hemi.intensity = 0.9 - 0.55 * nightT; sun.intensity = 1.1 - 0.85 * nightT;
    sunMesh.material.color.set(0xfff2b0).lerp(tmp.set(0xdfe6ff), nightT);
    document.body.style.background = '#' + scene.background.getHexString();
    hud.style.color = nightT > 0.5 ? '#e8ecff' : '#1f2f1f';
  }

  function animateDino(dt) {
    var ducking = duck && onGround && state === 'run';
    upper.rotation.z += ((ducking ? -0.9 : state === 'dead' ? 0.15 : 0) - upper.rotation.z) * Math.min(1, dt * 18);
    dino.position.y = y;
    if (state === 'run') {
      runT += dt * speed * 0.55;
      if (onGround) {
        legs[0].rotation.z = Math.sin(runT) * 0.9; legs[1].rotation.z = Math.sin(runT + Math.PI) * 0.9;
        upper.position.y = 1.3 + Math.abs(Math.sin(runT)) * 0.08;
      } else { legs[0].rotation.z = 0.5; legs[1].rotation.z = -0.4; upper.position.y = 1.3; }
      tail.rotation.y = Math.sin(runT * 0.5) * 0.3;
    } else if (state === 'ready') {
      runT += dt * 2; legs[0].rotation.z = legs[1].rotation.z = 0;
      upper.position.y = 1.3 + Math.sin(runT) * 0.03; tail.rotation.y = Math.sin(runT) * 0.15;
    }
  }

  var clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    var dt = Math.min(clock.getDelta(), 0.05);
    if (state === 'run') update(dt); else if (state === 'ready') scenery(dt * 2);
    animateDino(dt); theme(dt);
    if (shake > 0) shake = Math.max(0, shake - dt);
    var s = shake * 1.2;
    camera.position.set(camBase.x + (R() - 0.5) * s, camBase.y + y * 0.12 + (R() - 0.5) * s, camBase.z);
    camera.lookAt(7, 2, 0);
    renderer.render(scene, camera);
  }
  tick();
})();
