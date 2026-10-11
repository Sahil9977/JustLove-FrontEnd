import * as THREE from 'three';

// Shared 3D world: animated love background + love intro animation + 3D photo gallery.
// api: burst() on unlock, playIntro(photos) -> intro -> gallery, reset(), dispose()
export function createScene(canvas, opts = {}) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true });
  r.setClearColor(0x0b0720);
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
  cam.position.set(0, 0, 8);
  sc.add(new THREE.AmbientLight(0x9a88ff, 0.6));
  const l1 = new THREE.PointLight(0x6f9bff, 1.4, 40); l1.position.set(-5, 3, 4); sc.add(l1);
  const l2 = new THREE.PointLight(0xff7fd6, 1.2, 40); l2.position.set(5, -2, 4); sc.add(l2);
  const ADD = THREE.AdditiveBlending;
  const c01 = (k) => Math.min(Math.max(k, 0), 1);
  const out = (k) => 1 - Math.pow(1 - c01(k), 3);
  const smooth = (k) => { k = c01(k); return k * k * (3 - 2 * k); };
  const pts = (arr, size, color, opacity = 1) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity, blending: ADD, depthWrite: false }));
    p.frustumCulled = false; return p;
  };
  let gg = null, cards = [], mode = 'idle', T = 0, G = 0, mx = 0, my = 0, rot = 0, vel = 0, drag = false, lastX = 0, front = -1, bt = -1, raf = 0;

  // ---- background: stars, moving grid floor, rings, floating hearts ----
  const sp = new Float32Array(5400);
  for (let i = 0; i < 5400; i += 3) { sp[i] = (Math.random() - .5) * 50; sp[i + 1] = (Math.random() - .5) * 34; sp[i + 2] = (Math.random() - .5) * 50; }
  const stars = pts(sp, 0.07, 0xe4d9ff, 0.85); sc.add(stars);
  const grid = new THREE.GridHelper(70, 70, 0x4a2d8f, 0x2a1566); grid.position.y = -5;
  grid.material.transparent = true; grid.material.opacity = 0.55; sc.add(grid);
  const mkRing = (c, x, y, z, s) => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.4 * s, 0.035, 16, 140), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); sc.add(m); return m; };
  const ring1 = mkRing(0x6f9bff, -3.4, 0.6, -2, 1), ring2 = mkRing(0xff7fd6, 3.4, -0.4, -3, 0.85);
  const hs = new THREE.Shape();
  hs.moveTo(0, 0.35); hs.bezierCurveTo(0, 0.6, -0.5, 0.7, -0.5, 0.3); hs.bezierCurveTo(-0.5, -0.05, -0.1, -0.25, 0, -0.5);
  hs.bezierCurveTo(0.1, -0.25, 0.5, -0.05, 0.5, 0.3); hs.bezierCurveTo(0.5, 0.7, 0, 0.6, 0, 0.35);
  const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 });
  const hearts = [];
  for (let k = 0; k < 16; k++) {
    const col = [0xff7fd6, 0x6f9bff, 0xa77bff][k % 3];
    const h = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.4 }));
    const z = 0.5 + Math.random() * 0.9; h.scale.set(z, z, z);
    h.position.set((Math.random() - .5) * 20, (Math.random() - .5) * 12, -8 + Math.random() * 10);
    h.userData = { v: 0.15 + Math.random() * 0.35, rot: 0.2 + Math.random() * 0.6, ph: Math.random() * 6 };
    sc.add(h); hearts.push(h);
  }
  // shooting stars
  const shooters = [];
  for (let q = 0; q < 3; q++) {
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1.8, 0.8, 0]), 3));
    const ln = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: ADD }));
    ln.userData = { wait: 1 + Math.random() * 5, life: 0 }; sc.add(ln); shooters.push(ln);
  }
  // unlock burst
  const BN = 160, bp = new Float32Array(BN * 3), bv = [];
  for (let b = 0; b < BN; b++) { const a = Math.random() * 6.283, z = Math.random() * 2 - 1, rr = Math.sqrt(1 - z * z), s = 2 + Math.random() * 3; bv.push(rr * Math.cos(a) * s, rr * Math.sin(a) * s, z * s); }
  const bpts = pts(bp, 0.16, 0xff7fd6, 0); bpts.visible = false; sc.add(bpts);

  // ---- intro: two light streams spiral up a pillar, merge, bloom, sparks fall ----
  const ig = new THREE.Group(); ig.visible = false; sc.add(ig);
  const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: ADD, depthWrite: false });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 14, 16), glowMat(0xcdb8ff)); pillar.position.y = 2; ig.add(pillar);
  const N = 110, st1 = pts(new Float32Array(N * 3), 0.13, 0x6f9bff), st2 = pts(new Float32Array(N * 3), 0.13, 0xff7fd6); ig.add(st1, st2);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 24), glowMat(0xffe9bf)); flash.position.y = 4.6; ig.add(flash);
  const shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 12, 120), glowMat(0xffe3a8)); shock.rotation.x = Math.PI / 2; shock.position.y = 4.6; ig.add(shock);
  const SN = 240, spv = [];
  for (let i = 0; i < SN; i++) spv.push((Math.random() - .5) * 6, 1 + Math.random() * 4, (Math.random() - .5) * 6);
  const sparks = pts(new Float32Array(SN * 3), 0.09, 0xfff1cf, 0); ig.add(sparks);
  const stream = (p, phase, pr) => {
    const a = p.geometry.attributes.position;
    for (let i = 0; i < N; i++) {
      const s = pr - i * 0.011;
      if (s < 0 || pr >= 1) { a.setXYZ(i, 0, -100, 0); continue; }
      const ang = s * 18.85 + phase, rad = 1.3 * (1 - s * 0.92);
      a.setXYZ(i, Math.cos(ang) * rad, -4 + s * 8.6, Math.sin(ang) * rad);
    }
    a.needsUpdate = true;
  };
  function runIntro(t) {
    const pr = smooth((t - 0.5) / 4), f = t - 4.5, ff = Math.max(f, 0);
    pillar.material.opacity = 0.5 * c01(t / 0.8) * (1 - c01((t - 4.6) / 1.6));
    stream(st1, 0, pr); stream(st2, Math.PI, pr);
    flash.material.opacity = f > 0 ? Math.max(0, 1 - f / 1.6) : 0; flash.scale.setScalar(0.3 + ff * 3.2);
    shock.material.opacity = f > 0 ? Math.max(0, 1 - f / 2) : 0; shock.scale.setScalar(1 + ff * 7);
    const a = sparks.geometry.attributes.position;
    for (let i = 0; i < SN; i++) a.setXYZ(i, spv[i * 3] * ff, 4.6 + spv[i * 3 + 1] * ff - 2.5 * ff * ff, spv[i * 3 + 2] * ff);
    a.needsUpdate = true; sparks.material.opacity = f > 0 ? c01(1 - f / 2.6) : 0;
    cam.position.set(mx * 0.6, -1 + pr * 4.5, 10 - pr * 1.5); cam.lookAt(0, 1 + pr * 3.2, 0);
    if (t > 6.4) startGallery();
  }

  // ---- gallery: photo cards on a 3D carousel that flies in, spins and settles ----
  const placeholder = (i) => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 400; const x = c.getContext('2d');
    x.fillStyle = i % 2 ? '#1d0f4d' : '#2a1666'; x.fillRect(0, 0, 300, 400);
    x.strokeStyle = '#a77bff'; x.lineWidth = 4; x.strokeRect(14, 14, 272, 372);
    x.fillStyle = '#cdbfee'; x.font = '28px sans-serif'; x.textAlign = 'center'; x.fillText('[PHOTO ' + (i + 1) + ']', 150, 208);
    return new THREE.CanvasTexture(c);
  };
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  function buildGallery(list) {
    if (gg) sc.remove(gg);
    gg = new THREE.Group(); cards = [];
    const m = list.length, R = Math.max(5, m * 0.65);
    for (let i = 0; i < m; i++) {
      const a = i * 2 * Math.PI / m, g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: placeholder(i), transparent: true, opacity: 0 });
      if (list[i].url) loader.load(list[i].url, (t) => { mat.map = t; mat.needsUpdate = true; });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.5), glowMat(i % 2 ? 0xff7fd6 : 0x6f9bff));
      glow.position.z = -0.02; g.add(glow, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), mat));
      g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); g.rotation.y = a; g.userData = { i, mat, glow };
      gg.add(g); cards.push(g);
    }
    gg.visible = false; sc.add(gg);
  }
  function startGallery() {
    mode = 'gallery'; G = 0; front = -1; ig.visible = false; gg.visible = true;
    if (calm) G = 99;
    if (opts.onIntroDone) opts.onIntroDone();
  }
  function runGallery(raw, t) {
    G += raw; const gi = out(G / 3.5);
    cards.forEach((c) => {
      const d = c.userData, k = out((G - d.i * 0.18) / 1.2);
      c.scale.setScalar(Math.max(k, 0.001)); c.position.y = (1 - k) * 6 + Math.sin(t + d.i) * 0.12 * k;
      d.mat.opacity = k; d.glow.material.opacity = 0.45 * k;
    });
    if (!drag) { vel += ((calm ? 0.04 : 0.12) - vel) * Math.min(1, raw * 1.5); rot += vel * raw; }
    gg.rotation.y = rot + (1 - gi) * Math.PI * 2;
    cam.position.set(0, 0.8 + (1 - gi) * 1.5, 12 + (1 - gi) * 7); cam.lookAt(0, 0, 0);
    const m = cards.length; let idx = Math.round(-rot / (2 * Math.PI / m)); idx = ((idx % m) + m) % m;
    if (idx !== front) { front = idx; if (opts.onCaption) opts.onCaption(idx); }
  }

  // ---- input, resize, loop ----
  const down = (e) => { if (mode === 'gallery') { drag = true; lastX = e.clientX; } };
  const move = (e) => {
    mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5;
    if (drag) { const d = (e.clientX - lastX) * 0.006; rot += d; vel = Math.max(-3, Math.min(3, d * 60)); lastX = e.clientX; }
  };
  const up = () => { drag = false; };
  canvas.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  const size = () => { const w = window.innerWidth, h = window.innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  window.addEventListener('resize', size); size();
  const clock = new THREE.Clock(), spd = calm ? 0.15 : 1;
  function tick() {
    const raw = Math.min(clock.getDelta(), 0.1), dt = raw * spd, t = clock.elapsedTime * spd;
    stars.rotation.y += dt * 0.02; grid.position.z = (t * 1.3) % 1;
    ring1.rotation.x += dt * 0.5; ring1.rotation.y += dt * 0.3; ring2.rotation.x -= dt * 0.4; ring2.rotation.y += dt * 0.45;
    hearts.forEach((h) => { const d = h.userData; h.position.y += d.v * dt; h.position.x += Math.sin(t + d.ph) * dt * 0.3; h.rotation.y += d.rot * dt; if (h.position.y > 7) h.position.y = -7; });
    shooters.forEach((l) => {
      const d = l.userData;
      if (d.life <= 0) { d.wait -= dt; if (d.wait <= 0 && !calm) { d.life = 1.1; l.position.set(6 + Math.random() * 8, 2 + Math.random() * 5, -6); l.material.opacity = 1; } }
      else { d.life -= dt; l.position.x -= dt * 14; l.position.y -= dt * 6; l.material.opacity = Math.max(0, d.life / 1.1); if (d.life <= 0) { d.wait = 2 + Math.random() * 5; l.material.opacity = 0; } }
    });
    if (bt >= 0) {
      bt += dt; for (let j = 0; j < BN * 3; j++) bp[j] += bv[j] * dt;
      bpts.geometry.attributes.position.needsUpdate = true; bpts.material.opacity = Math.max(0, 1 - bt / 2.2);
      if (bt > 2.2) { bt = -1; bpts.visible = false; }
    }
    if (mode === 'intro') { T += raw; runIntro(T); }
    else if (mode === 'gallery') runGallery(raw, t);
    else {
      cam.position.x += (mx * 2 - cam.position.x) * 0.04; cam.position.y += (-my * 1.2 - cam.position.y) * 0.04;
      cam.position.z += ((bt >= 0 ? 6.2 : 8) - cam.position.z) * 0.05; cam.lookAt(0, 0, 0);
    }
    r.render(sc, cam); raf = requestAnimationFrame(tick);
  }
  tick();

  return {
    burst() { bp.fill(0); bpts.geometry.attributes.position.needsUpdate = true; bpts.material.opacity = 1; bpts.visible = true; bt = 0; },
    playIntro(list) {
      buildGallery(list && list.length ? list : Array.from({ length: 10 }, () => ({})));
      T = 0; if (calm) startGallery(); else { mode = 'intro'; ig.visible = true; }
    },
    reset() { mode = 'idle'; ig.visible = false; if (gg) gg.visible = false; },
    dispose() {
      cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('resize', size); r.dispose();
    },
  };
}
