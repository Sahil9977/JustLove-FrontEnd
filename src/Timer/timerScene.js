import * as THREE from 'three';

// TIMER-ONLY 3D BACKGROUND (own canvas + own renderer: it does not touch the shared scene.js).
//
//   CHOOSE THE LOOK by changing STYLE:
//     'lanterns' = glowing sky lanterns floating up under a big moon, with fireflies   (romantic)
//     'tunnel'   = flying forward through a spinning tunnel of light rings             (time travel)
//
//   const s = createTimerScene(canvasElement);
//   s.setSecondsLeft(n)  -> everything gets a little livelier as the time gets close
//   s.burst()            -> a celebration surge (called when the countdown reaches zero)
//   s.dispose()          -> call when the page closes
const STYLE = 'lanterns';

export function createTimerScene(canvas, style = STYLE, opts = {}) {
  // opts.transparent = true -> no sky/clear colour, so a photo/video behind the canvas shows through
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const px = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !!opts.transparent });
  if (opts.transparent) renderer.setClearColor(0x000000, 0); else renderer.setClearColor(0x0b0720);
  renderer.setPixelRatio(px);
  const scene = new THREE.Scene();
  const FOV = 55, cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  const disposables = [];
  const ADD = THREE.AdditiveBlending;
  const PINK = new THREE.Color(0xff7fd6), VIOLET = new THREE.Color(0xa77bff), BLUE = new THREE.Color(0x6f9bff), GOLD = new THREE.Color(0xffd08a), WHITE = new THREE.Color(0xffffff);

  // ---- tiny shader for every dot layer: round glowing dots, twinkle, optional rising / flying, distance fade ----
  const shared = { uTime: { value: 0 }, uScale: { value: 800 }, uPx: { value: px } };
  const VERT = `
    uniform float uTime, uScale, uPx, uBurst, uRise, uFly, uFade;
    attribute float aSize, aPhase, aRand;
    attribute vec3 aColor;
    varying vec3 vColor; varying float vTw, vFog;
    void main() {
      vec3 p = position + normalize(position + vec3(0.0001)) * uBurst * (2.0 + aRand * 6.0);
      if (uRise > 0.0) p.y = mod(p.y + uTime * uRise * (0.35 + aRand) + 14.0, 28.0) - 14.0;
      if (uFly > 0.0) p.z = mod(position.z + 146.0 + uFly, 150.0) - 146.0;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float dist = max(-mv.z, 0.5);
      vTw = 0.7 + 0.3 * sin(uTime * (1.2 + aRand * 2.2) + aPhase);
      vFog = (uFade > 0.0 ? smoothstep(uFade, uFade * 0.4, dist) : 1.0) * smoothstep(1.0, 9.0, dist);
      gl_PointSize = min(aSize * vTw * uPx * uScale / dist, 48.0 * uPx);
      gl_Position = projectionMatrix * mv;
      vColor = aColor;
    }`;
  const FRAG = `
    varying vec3 vColor; varying float vTw, vFog;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d); a *= a;
      gl_FragColor = vec4(vColor * (0.65 + a * 1.1), a * vTw * vFog);
    }`;
  const layer = (n, fill, o = {}) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n), rnd = new Float32Array(n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const q = fill(i, c);
      pos.set(q.p, i * 3); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      size[i] = q.size; ph[i] = Math.random() * 6.283; rnd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1)); g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: ADD,
      uniforms: { ...shared, uBurst: { value: 0 }, uRise: { value: o.rise || 0 }, uFly: { value: o.fly || 0 }, uFade: { value: o.fade || 0 } },
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; disposables.push(g, m);
    return pts;
  };
  const glowTex = (stops, w = 128, h = 128) => { // soft radial sprite texture
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g; x.fillRect(0, 0, w, h); const t = new THREE.CanvasTexture(c); disposables.push(t); return t;
  };
  const sprite = (tex, color, opacity) => {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, blending: ADD, depthWrite: false });
    disposables.push(m); return new THREE.Sprite(m);
  };
  const rand = (a, b) => a + Math.random() * (b - a);

  let boost = 0, urgency = 0, mx = 0, my = 0, sx = 0, sy = 0, time = 0, raf = 0;
  let update = () => {}, onSize = () => {};

  /* =====================================================================================
     LANTERNS: moon, stars, ~90 floating lanterns (parallax depth), fireflies
     ===================================================================================== */
  function lanterns() {
    const skyGeo = new THREE.PlaneGeometry(700, 360, 1, 12), sc = new THREE.Color(), top = new THREE.Color(0x07041a), mid = new THREE.Color(0x170b42), low = new THREE.Color(0x4a2378);
    const sp = skyGeo.attributes.position, scol = new Float32Array(sp.count * 3);
    for (let v = 0; v < sp.count; v++) { const t = (sp.getY(v) + 180) / 360; (t > 0.45 ? sc.copy(mid).lerp(top, (t - 0.45) / 0.55) : sc.copy(low).lerp(mid, t / 0.45)).toArray(scol, v * 3); }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(scol, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, depthWrite: false }); disposables.push(skyGeo, skyMat);
    const sky = new THREE.Mesh(skyGeo, skyMat); sky.position.set(0, 20, -150); sky.renderOrder = -1; if (!opts.transparent) scene.add(sky);

    scene.add(layer(1500, (i, c) => { // stars
      c.copy([WHITE, VIOLET, BLUE, PINK][i % 4]).lerp(WHITE, 0.55).multiplyScalar(0.3 + Math.random() * 0.7);
      return { p: [rand(-130, 130), rand(-25, 80), rand(-135, -105)], size: rand(0.25, 0.8) };
    }));

    // moon: bright disc + wide soft halo
    const halo = sprite(glowTex([[0, 'rgba(255,190,225,.40)'], [0.3, 'rgba(190,140,255,.16)'], [1, 'rgba(120,80,220,0)']], 256, 256), 0xffffff, 0.8); halo.scale.set(90, 90, 1); scene.add(halo);
    const disc = sprite(glowTex([[0, 'rgba(255,226,200,.78)'], [0.6, 'rgba(255,205,185,.72)'], [0.7, 'rgba(255,185,185,.35)'], [1, 'rgba(255,170,200,0)']], 256, 256), 0xffffff, 0.9); disc.scale.set(24, 24, 1); scene.add(disc);

    // lantern picture (drawn in white so each lantern can be tinted gold / pink / violet)
    const lc = document.createElement('canvas'); lc.width = 128; lc.height = 160; const x = lc.getContext('2d');
    let g = x.createRadialGradient(64, 88, 2, 64, 88, 62); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.45, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 160);
    x.beginPath(); x.moveTo(43, 52); x.quadraticCurveTo(64, 44, 85, 52); x.lineTo(95, 112); x.quadraticCurveTo(64, 124, 33, 112); x.closePath();
    g = x.createRadialGradient(64, 106, 2, 64, 100, 52); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,.55)'); x.fillStyle = g; x.fill();
    x.globalCompositeOperation = 'destination-out'; x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 1.6; // paper ribs
    for (const dx of [-16, 0, 16]) { x.beginPath(); x.moveTo(64 + dx * 0.55, 49); x.quadraticCurveTo(64 + dx * 1.1, 84, 64 + dx * 1.4, 118); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(46, 48, 36, 5); x.fillRect(40, 114, 48, 5); x.globalCompositeOperation = 'source-over';
    g = x.createRadialGradient(64, 108, 0, 64, 108, 20); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(30, 70, 68, 80);
    const lTex = new THREE.CanvasTexture(lc); disposables.push(lTex);

    const tints = [0xffb35c, 0xffb35c, 0xffc477, 0xff8fb8, 0xff7fd6, 0xb593ff, 0x8fb0ff];
    const L = [];
    for (let i = 0; i < 90; i++) {
      const s = sprite(lTex, tints[i % tints.length], 0.95), z = rand(-70, -3), sc = rand(2.6, 4.2);
      s.scale.set(sc * 0.8, sc, 1);
      s.userData = { x: rand(-1, 1) * (22 + -z * 0.55), y: rand(-22, 26), z, v: rand(0.35, 0.95), ph: rand(0, 6.28), sw: rand(0.2, 0.7), base: s.material.color.clone() };
      s.position.set(s.userData.x, s.userData.y, z); scene.add(s); L.push(s);
    }
    const flies = layer(520, (i, c) => { c.copy(i % 3 ? GOLD : PINK).multiplyScalar(0.7 + Math.random() * 0.3); return { p: [rand(-34, 34), rand(-14, 14), rand(-14, 16)], size: rand(0.05, 0.14) }; }, { rise: 0.55 });
    scene.add(flies);

    cam.position.set(0, 0, 20);
    onSize = (w, h, aspect) => { // keep the moon on screen, on narrow phones too
      const half = Math.tan((FOV * Math.PI) / 360) * 90 * aspect;
      halo.position.set(Math.min(20, half * 0.52), 20, -70); disc.position.copy(halo.position);
    };
    update = (dt) => {
      const rise = (1 + urgency * 0.9 + boost * 6) * dt;
      L.forEach((s) => {
        const d = s.userData;
        d.y += d.v * rise; d.x += Math.sin(time * d.sw + d.ph) * 0.35 * dt;
        if (d.y > 28) { d.y = -24; d.x = rand(-1, 1) * (22 + -d.z * 0.55); }
        s.position.set(d.x, d.y, d.z);
        const fade = Math.min(1, Math.max(0, (27 - d.y) / 7)) * Math.min(1, Math.max(0, (d.y + 24) / 6));
        s.material.opacity = (0.85 + 0.15 * Math.sin(time * 3.1 + d.ph * 3)) * fade * Math.min(1, 1.35 - -d.z / 110);
        s.material.rotation = Math.sin(time * 0.7 + d.ph) * 0.09;
      });
      flies.material.uniforms.uBurst.value = boost * 0.9;
      flies.position.x = -sx * 3; cam.position.x = sx * 4; cam.position.y = -sy * 2.5; cam.lookAt(0, 0, 0);
    };
  }

  /* =====================================================================================
     TUNNEL: ~40 twisting rings of light + speed streaks, flying forward toward a glowing end
     ===================================================================================== */
  function tunnel() {
    const rings = layer(12000, (i, c) => {
      const k = Math.floor(i / 300), j = i % 300, a = (j / 300) * 6.283 + k * 0.16, r = 8.5 + Math.sin(k * 0.55) * 1.6 + rand(-0.35, 0.35);
      c.copy([PINK, VIOLET, BLUE][k % 3]).lerp(GOLD, Math.random() * 0.25).multiplyScalar(0.95 + Math.random() * 0.45);
      return { p: [Math.cos(a) * r, Math.sin(a) * r, -146 + k * 3.75 + rand(-0.5, 0.5)], size: rand(0.28, 0.6) };
    }, { fly: 0, fade: 190 });
    const streaks = layer(1600, (i, c) => {
      const a = rand(0, 6.283), r = rand(3.5, 19);
      c.copy([WHITE, PINK, BLUE, GOLD][i % 4]).lerp(WHITE, 0.3).multiplyScalar(0.8 + Math.random() * 0.6);
      return { p: [Math.cos(a) * r, Math.sin(a) * r, rand(-146, 4)], size: rand(0.12, 0.34) };
    }, { fly: 0, fade: 190 });
    const world = new THREE.Group(); world.add(rings, streaks); scene.add(world);
    const end = sprite(glowTex([[0, 'rgba(255,240,210,1)'], [0.25, 'rgba(255,150,220,.55)'], [0.6, 'rgba(150,110,255,.2)'], [1, 'rgba(100,80,220,0)']], 256, 256), 0xffffff, 0.9); end.scale.set(80, 80, 1); end.position.z = -145; scene.add(end);
    cam.position.set(0, 0, 8); cam.lookAt(0, 0, -50);
    let dist = 0, speed = 14, target = 14;
    update = (dt) => {
      target = (urgency > 1 ? 52 : urgency > 0.5 ? 34 : urgency > 0 ? 24 : 15) + boost * 60;
      speed += (target - speed) * Math.min(1, dt * 2);
      dist += speed * dt;
      rings.material.uniforms.uFly.value = dist; streaks.material.uniforms.uFly.value = dist * 1.7 + 1;
      world.rotation.z += dt * (0.08 + speed * 0.004);
      cam.position.x += (sx * 3 - cam.position.x) * Math.min(1, dt * 3); cam.position.y += (-sy * 2 - cam.position.y) * Math.min(1, dt * 3);
      cam.lookAt(sx * 1.5, -sy, -50);
      end.material.opacity = 0.75 + 0.2 * Math.sin(time * 1.6) + boost * 0.25;
    };
  }

  (style === 'tunnel' ? tunnel : lanterns)();

  const size = () => {
    const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
    renderer.setSize(w, h, false); cam.aspect = aspect; cam.updateProjectionMatrix();
    cam.setViewOffset(w, h, 0, h * 0.09, w, h); // push the scene up a little: the text lives in the lower half
    shared.uScale.value = h / (2 * Math.tan((FOV * Math.PI) / 360));
    onSize(w, h, aspect);
  };
  window.addEventListener('resize', size); size();
  const move = (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
  window.addEventListener('pointermove', move);

  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.1) * (calm ? 0.35 : 1);
    time += dt; shared.uTime.value = time;
    boost = Math.max(0, boost - dt * 0.28);
    sx += (mx - sx) * Math.min(1, dt * 2.5); sy += (my - sy) * Math.min(1, dt * 2.5);
    update(dt);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(tick);
  }
  tick();

  return {
    setSecondsLeft(s) { urgency = s <= 0 ? 2 : s <= 10 ? 1.5 : s <= 60 ? 1 : s <= 3600 ? 0.5 : 0; },
    burst() { boost = 1; },
    dispose() {
      cancelAnimationFrame(raf); window.removeEventListener('resize', size); window.removeEventListener('pointermove', move);
      disposables.forEach((d) => d.dispose()); renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}