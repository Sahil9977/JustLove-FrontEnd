import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import "./SkyAnimation.css";

// ============================================================
// EDIT THESE SETTINGS
// ============================================================
export const SHOW_SEC = 14;       // Total show duration in seconds.
export const NEXT_PAGE_URL = "";  // Empty = call onComplete(). Example: "/next" or "/next.html".
export const ROCKET_H = 320;      // Height of the final rocket blast (the last rocket climbs this high).
export const ROCKET_Z = -90;      // Distance of the final blast. More negative = farther.
export const BLAST_SIZE = 1.1;    // Size of the final blast (1 = normal firework, bigger = wider).
export const CAM_FOLLOW = 0.9;    // 0 = camera stays low, 1 = follows rocket all the way up.
export const BIRTHDAY_DELAY = 4; // Show-timeline units after the blast before the Birthday animation starts.
export const BLAST_HOLD_SEC = 0; // Seconds the final rocket HOVERS at its top before it blasts. 0 = blast the instant it arrives.
                                   // This is ADDED to SHOW_SEC (the rest of the show keeps its normal speed).
export const IDLE_GLOW = 0;    // Brightness of the waiting sky behind WELCOME (blue halo + horizon glow). 1 = old look, 0.4 = darker, 0 = no glow.

// ---- SOUND FILES: paste your 4 Cloudinary links here -------------------------------------------
// SMALL rockets = the 8 little rockets at the start.   BIG rocket = the last rocket that flies up into the Birthday page.
// While a link is "" the old built-in synthesized sound is used for that slot, so nothing breaks.
export const SMALL_WHOOSH_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791452449/small_climb_asw1pl.wav";  // small rocket CLIMBS
export const SMALL_BLAST_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791452447/small_blast_kejmg9.wav";   // small rocket BLASTS
export const BIG_WHOOSH_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791452451/big_rocket_continuous_climb_o0luf4.wav";    // last BIG rocket CLIMBS
export const BIG_BLAST_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791452450/big_rocket_blast_o1pcs8.wav";     // last BIG rocket BLASTS
export const SMALL_WHOOSH_VOL = 0.45; // loudness of each slot (0 = silent, 1 = full)
export const SMALL_BLAST_VOL = 0.6;
export const BIG_WHOOSH_VOL = 0.8;
export const BIG_BLAST_VOL = 1;
export const BIG_WHOOSH_CUT_SEC = 0.12; // the big whoosh fades to silence this many seconds BEFORE the final blast, so it never runs into the blast sound
// ============================================================

/**
 * Props
 *  start        false = scene is loaded and shows a calm night sky (stars, town, couple) but the show,
 *               fireworks and audio are all PAUSED. Flip to true to begin the show from 0
 *               without remounting. Default true (old behaviour).
 *  onComplete   called when the show ends
 *  onRise       called when the last rocket starts climbing into the birthday page
 *  onBlastDone  called after the final blast
 */
export default function SkyAnimation({ start = true, onComplete, onRise, onBlastDone }) {
  const mountRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const onRiseRef = useRef(onRise);
  const onBlastDoneRef = useRef(onBlastDone);
  const startRef = useRef(start);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onRiseRef.current = onRise;
    onBlastDoneRef.current = onBlastDone;
    startRef.current = start;
  }, [onComplete, onRise, onBlastDone, start]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const cap = document.createElement("div");
    cap.id = "cap";
    const wo = document.createElement("div");
    wo.id = "wo";

    mount.appendChild(cap);
    mount.appendChild(wo);

    const onCompleteCallback = () => onCompleteRef.current?.();


    const BS = BLAST_SIZE; // blast size no longer grows with rocket height
    // internal show timeline (do not edit). RISE_END = moment the last rocket reaches its top.
    // BLAST = RISE_END + hold, so the rocket hovers at the top for BLAST_HOLD_SEC real seconds, then blasts.
    const RISE_END = 12.0, RATE = (RISE_END + 3.8) / SHOW_SEC, KS = 1 / RATE;
    const HOLD = Math.max(0, BLAST_HOLD_SEC) * RATE, BLAST = RISE_END + HOLD, END = BLAST + 3.8;
    const R = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); R.setSize(innerWidth, innerHeight); mount.appendChild(R.domElement);
    const S = new THREE.Scene(); S.background = new THREE.Color(0x02040a);
    const BG_SKY = new THREE.Color(0x02040a), BG_BLACK = new THREE.Color(0x000000); // sky turns pure black so the real Birthday page shows through (screen blend)
    const C = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 700);
    let comp = null, bloom = null;
    try { comp = new EffectComposer(R); comp.addPass(new RenderPass(S, C)); bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .9, .7, .28); comp.addPass(bloom) } catch (e) { comp = null }
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = x => x * x * (3 - 2 * x), ec = x => 1 - Math.pow(1 - x, 3), lerp = (a, b, t) => a + (b - a) * t;
    function tex(d) { const c = document.createElement('canvas'); c.width = c.height = 128; d(c.getContext('2d')); return new THREE.CanvasTexture(c) }
    const dot = tex(g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, '#fff'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128) });
    const spr = (col) => new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    // ---------- world: water, hills, town, stars, shore, couple
    const wc = document.createElement('canvas'); wc.width = 2; wc.height = 256; { const g = wc.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0a1735'); gr.addColorStop(.35, '#050b1c'); gr.addColorStop(1, '#02040a'); g.fillStyle = gr; g.fillRect(0, 0, 2, 256) }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 200), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(wc), depthWrite: false, fog: false })); water.rotation.x = -Math.PI / 2; water.position.set(0, 0, -50); water.renderOrder = -1; S.add(water);
    const hs = new THREE.Shape(); hs.moveTo(-200, -6); for (let x = -200; x <= 200; x += 3) { hs.lineTo(x, 7 + Math.sin(x * .045) * 5 + Math.sin(x * .13 + 1) * 3 + Math.sin(x * .31) * 1.1 + Math.max(0, Math.sin(x * .02 + 2)) * 7) } hs.lineTo(200, -6);
    const hills = new THREE.Mesh(new THREE.ShapeGeometry(hs), new THREE.MeshBasicMaterial({ color: 0x010308, fog: false })); hills.position.z = -95; S.add(hills);
    const horizon = spr(0x3a6bff); horizon.position.set(0, 8, -99); horizon.scale.set(300, 70, 1); S.add(horizon);
    const TN = 170, tp = new Float32Array(TN * 3), tc = new Float32Array(TN * 3); for (let i = 0; i < TN; i++) { const x = (Math.random() - .5) * 190; tp.set([x, .5 + Math.random() * 5, -93], i * 3); const w = .5 + Math.random() * .5; tc.set([1 * w, .78 * w, .45 * w], i * 3) }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    const tm = new THREE.PointsMaterial({ size: .9, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }); const tm2 = tm.clone(); tm2.opacity = .3;
    const town = new THREE.Points(tg, tm), town2 = new THREE.Points(tg, tm2); town2.scale.y = -1; S.add(town, town2);
    const SGp = new Float32Array(1600 * 3); for (let i = 0; i < 1600; i++) { const r = 180, th = Math.random() * 6.283, ph = Math.random() * 1.35 + .05; SGp.set([r * Math.cos(th) * Math.cos(ph), r * Math.sin(ph), r * Math.sin(th) * Math.cos(ph) - 30], i * 3) }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(SGp, 3)); const sf = new THREE.PointsMaterial({ size: 1.1, map: dot, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcfdcff, fog: false }); const starsPts = new THREE.Points(sg, sf); starsPts.frustumCulled = false; S.add(starsPts);

    const blk = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const shore = new THREE.Mesh(new THREE.BoxGeometry(40, .5, 8), blk); shore.position.set(0, -.25, 4.2); S.add(shore);
    function person(x, h, s) {
      const g = new THREE.Group(), cy = (a, b, hh, y, xx = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(a, b, hh, 10), blk); m.position.set(xx, y, 0); g.add(m) };
      cy(.1 * s, .12 * s, h * .5, h * .25, -.07 * s); cy(.1 * s, .12 * s, h * .5, h * .25, .07 * s); cy(.2 * s, .17 * s, h * .34, h * .5 + h * .17);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(.115 * s, 12, 10), blk); hd.position.y = h - .11 * s; g.add(hd); const nk = new THREE.Mesh(new THREE.CylinderGeometry(.05 * s, .06 * s, .1 * s, 8), blk); nk.position.y = h - .2 * s; g.add(nk); g.position.set(x, 0, 3.2); S.add(g); return g
    }
    person(-.28, 1.75, 1); person(.3, 1.62, .95);
    const hold = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .32, 6), blk); hold.rotation.z = Math.PI / 2; hold.position.set(0, .9, 3.2); S.add(hold);
    // ---------- fireworks
    const TR = 7, P = [], V = [], K = [], I = [], FL = [], sc = innerWidth < 900 ? .6 : 1, gz = () => Math.random() + Math.random() + Math.random() - 1.5;
    function burst(t0, c, col1, kind, n, Sp, col2, tilt) {
      n = Math.round(n * sc); FL.push({ t: t0, c, col: col1, i: Math.min(1.6, n / (700 * sc)) });
      for (let i = 0; i < n; i++) {
        const d = new THREE.Vector3(); let sp, k = 1.7, cc = col1;
        if (kind == 'ring') { const a = Math.random() * 6.283; d.set(Math.cos(a), Math.sin(a), (Math.random() - .5) * .14).applyEuler(new THREE.Euler(tilt || .6, .3, 0)); sp = Sp * (.92 + .08 * Math.random()) }
        else { d.set(gz(), gz(), gz()).normalize(); sp = Sp * (kind == 'willow' ? .45 + .55 * Math.random() : .8 + .2 * Math.random()); if (kind == 'willow') k = .85 }
        if (col2 && Math.random() < .35) { cc = col2; sp *= .62 } const seed = Math.random();
        for (let j = 0; j < TR; j++) { P.push(...c); V.push(d.x * sp, d.y * sp, d.z * sp); K.push(...cc); I.push(t0, seed, j, k) }
      }
    }
    const BL = [.35, .62, 1], WH = [.9, .95, 1], GO = [1, .72, .32], RO = [1, .38, .62];
    burst(2.5, [-2, 23, -46], BL, 'peony', 720, 22, WH);
    burst(4.0, [-15, 21, -44], GO, 'willow', 620, 13);
    burst(4.3, [14, 25, -48], BL, 'ring', 560, 22, null, .5);
    burst(5.1, [8, 17, -42], WH, 'peony', 520, 18, GO);
    burst(5.5, [-10, 27, -48], BL, 'peony', 600, 22, WH);
    burst(5.9, [6, 31, -50], RO, 'peony', 600, 23, WH);
    burst(6.3, [-17, 20, -44], GO, 'willow', 600, 13);
    burst(6.6, [17, 23, -46], BL, 'ring', 520, 22, null, -.5);
    burst(BLAST, [0, ROCKET_H, ROCKET_Z], WH, 'peony', 2200, 78 * BS, BL);
    burst(BLAST, [0, ROCKET_H, ROCKET_Z], GO, 'willow', 900, 40 * BS);
    burst(BLAST, [0, ROCKET_H, ROCKET_Z], WH, 'ring', 900, 62 * BS, null, .4);
    const fgm = new THREE.BufferGeometry(); fgm.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); fgm.setAttribute('aV', new THREE.Float32BufferAttribute(V, 3)); fgm.setAttribute('aCol', new THREE.Float32BufferAttribute(K, 3)); fgm.setAttribute('aI', new THREE.Float32BufferAttribute(I, 4));
    const U1 = { uT: { value: 0 }, uPix: { value: 1 }, uA: { value: 1 } }, U2 = { uT: U1.uT, uPix: U1.uPix, uA: { value: .28 } };
    const shaderDef = {
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uT,uPix,uA;attribute vec3 aV,aCol;attribute vec4 aI;varying vec3 vC;varying float vA;
void main(){float k=aI.w;float life=3.0+aI.y*1.2+step(aI.w,1.)*1.6;float tau=uT-aI.x-aI.z*.032;
if(tau<0.||tau>life){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;vA=0.;vC=vec3(0.);return;}
float e=1.-exp(-k*tau);vec3 p=position+aV*(e/k);p.y-=3.2*(tau/k-e/(k*k));
float fade=1.-smoothstep(life*.5,life,tau);float hot=exp(-tau*2.6);
vec3 c=mix(aCol,vec3(1.),hot*.85);c=mix(c,vec3(1.,.6,.25),smoothstep(life*.45,life,tau)*.55);
float tr=pow(1.-aI.z/7.,1.6);float gl=step(.72,aI.y);float fl=mix(1.,step(.5,fract(tau*16.+aI.y*37.))*1.4,gl*smoothstep(life*.3,life*.55,tau));
vA=fade*tr*fl*uA*(.55+hot*1.5);vC=c;
vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.,(1.5*tr+.6)*uA*0.+(1.5*tr+.6)*(95./-mv.z)*uPix*(1.+hot));}`,
      fragmentShader: `varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,exp(-d*d*4.)*vA);}`
    };
    const fw = new THREE.Points(fgm, new THREE.ShaderMaterial(Object.assign({ uniforms: U1 }, shaderDef))), fw2 = new THREE.Points(fgm, new THREE.ShaderMaterial(Object.assign({ uniforms: U2 }, shaderDef)));
    fw.frustumCulled = fw2.frustumCulled = false; fw2.scale.y = -1; S.add(fw, fw2);
    // rockets (CPU). The last rocket eases in and out so it keeps climbing, then settles gently at its blast point.
    const rkEase = (q, s) => q === 8 ? .5 * sm(s) + .5 * (1 - Math.pow(1 - s, 2)) : 1 - Math.pow(1 - s, 1.9);
    const RK = [[1, 2.5, -1, -2, 23, -46], [2.9, 4, -6, -15, 21, -44], [3.1, 4.3, 6, 14, 25, -48], [4.2, 5.1, 2, 8, 17, -42], [4.5, 5.5, -4, -10, 27, -48], [4.9, 5.9, 3, 6, 31, -50], [5.3, 6.3, -8, -17, 20, -44], [5.6, 6.6, 8, 17, 23, -46], [6.8, RISE_END, 0, 0, ROCKET_H, ROCKET_Z]], NT = 26;
    const rp = new Float32Array(RK.length * NT * 3), rc = new Float32Array(RK.length * NT * 3), rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('color', new THREE.BufferAttribute(rc, 3));
    const rm = new THREE.PointsMaterial({ size: .55, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const rk1 = new THREE.Points(rg, rm), rk2 = new THREE.Points(rg, rm.clone()); rk2.material.opacity = .3; rk1.frustumCulled = rk2.frustumCulled = false; rk2.scale.y = -1; S.add(rk1, rk2);
    const flashes = FL.map(f => { const s = spr(new THREE.Color(f.col[0], f.col[1], f.col[2])); S.add(s); return s }), skyG = spr(0x5a8bff); skyG.position.set(0, 24, -70); skyG.scale.set(160, 90, 1); S.add(skyG); const beacon = spr(0xffd9a0); S.add(beacon);
    // ---------- audio (synthesized)
    let AC = null, mg = null, nb = null, muted = false;
    // Sound files are fetched + decoded once, right when the page mounts (long before the show starts),
    // using a throw-away context. AudioBuffers can be played from any context.
    let smallWhoosh = null, smallBlast = null, bigWhoosh = null, bigBlast = null;
    const loadSample = (url, set) => {
      if (!url) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext, dc = new Ctx();
        fetch(url).then(r => r.arrayBuffer()).then(ab => new Promise((ok, no) => dc.decodeAudioData(ab, ok, no)))
          .then(b => { set(b); dc.close() }).catch(() => { try { dc.close() } catch (e) { } });
      } catch (e) { }
    };
    loadSample(SMALL_WHOOSH_URL, b => { smallWhoosh = b });
    loadSample(SMALL_BLAST_URL, b => { smallBlast = b });
    loadSample(BIG_WHOOSH_URL, b => { bigWhoosh = b });
    loadSample(BIG_BLAST_URL, b => { bigBlast = b });
    // audio(offset): schedules the whole show's sound. `offset` = real seconds already played (0 at the start).
    // A non-zero offset is used only when the browser blocked sound at first and it gets unlocked later,
    // so the sound joins in at the right moment of the show instead of restarting it.
    function audio(offset = 0) {
      try {
        if (AC) AC.close(); AC = new (window.AudioContext || window.webkitAudioContext)(); mg = AC.createGain(); mg.gain.value = .9; mg.connect(AC.destination); const n = AC.currentTime - offset;
        // play a decoded sample at show-time `t` (seconds from start), volume `v`, speed `rate`
        const play = (buf, t, v, rate = 1) => {
          const skip = Math.max(0, offset - t); if (skip * rate >= buf.duration) return null; // already finished -> don't play
          const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.value = v;
          s.connect(g); g.connect(mg); s.start(n + t + skip, skip * rate); return { s, g };
        };
        nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++)d[i] = Math.random() * 2 - 1;
        const ns = (t, dur, f0, f1, type, q, v) => { if (t < offset) return; const s = AC.createBufferSource(); s.buffer = nb; const f = AC.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, n + t); f.frequency.exponentialRampToValueAtTime(f1, n + t + dur); const g = AC.createGain(); g.gain.setValueAtTime(0, n + t); g.gain.linearRampToValueAtTime(v, n + t + dur * .7); g.gain.linearRampToValueAtTime(0, n + t + dur); s.connect(f); f.connect(g); g.connect(mg); s.start(n + t); s.stop(n + t + dur + .1) };
        const boom = (t, v) => { if (t < offset) return; const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(95, n + t); o.frequency.exponentialRampToValueAtTime(34, n + t + 1.1); g.gain.setValueAtTime(v, n + t); g.gain.exponentialRampToValueAtTime(.001, n + t + 1.4); o.connect(g); g.connect(mg); o.start(n + t); o.stop(n + t + 1.5); ns(t, 1.0, 900, 120, 'lowpass', .5, v * .9) };
        const crackle = (t, cnt, v) => { for (let i = 0; i < cnt; i++)ns(t + .15 + Math.random() * 1.8, .05, 4000, 3000, 'highpass', .7, v * Math.random()) };
        RK.forEach((r, q) => { if (q === RK.length - 1) return; if (smallWhoosh) play(smallWhoosh, r[0] * KS, SMALL_WHOOSH_VOL); else ns(r[0] * KS, (r[1] - r[0]) * KS, 600, 2600, 'bandpass', 9, .05) });
        {
          const lr = RK[RK.length - 1], t0 = lr[0] * KS, d = (lr[1] - lr[0]) * KS;
          if (bigWhoosh) { // last BIG rocket climb: plays at normal speed and is muted just before the final blast
            const cut = BLAST * KS, c0 = Math.max(t0, cut - BIG_WHOOSH_CUT_SEC), w = offset < cut ? play(bigWhoosh, t0, BIG_WHOOSH_VOL) : null;
            if (w) { w.g.gain.setValueAtTime(BIG_WHOOSH_VOL, n + c0); w.g.gain.linearRampToValueAtTime(0, n + cut); w.s.stop(n + cut + .05); }
          }
          else {
            const o = AC.createOscillator(), g = AC.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(450, n + t0); o.frequency.exponentialRampToValueAtTime(3400, n + t0 + d);
            g.gain.setValueAtTime(0, n + t0); g.gain.linearRampToValueAtTime(.07, n + t0 + d * .6); g.gain.linearRampToValueAtTime(0, n + t0 + d);
            o.connect(g); g.connect(mg); o.start(n + t0); o.stop(n + t0 + d + .1); ns(t0, d, 300, 3500, 'bandpass', 6, .14);
          }
          if (!bigBlast) ns(BLAST * KS + .45, 2.6, 1500, 60, 'lowpass', .7, 1)
        }
        const seen = new Set(); FL.forEach(f => { if (seen.has(f.t)) return; seen.add(f.t); const big = f.i > 1.2; const bb = f.t >= BLAST ? bigBlast : smallBlast; if (bb) play(bb, f.t * KS + .05, f.t >= BLAST ? BIG_BLAST_VOL : SMALL_BLAST_VOL); else { boom(f.t * KS + (f.t >= BLAST ? .45 : .12), big ? 1 : .55); crackle(f.t * KS, big ? 36 : 18, .12) } });
        if (muted) AC.suspend()
      } catch (e) { }
    }
    let riseCalled = false, blastCalled = false;
    // Sky drives two CSS variables on the Birthday layer so the hand-over FEELS like flying upward into it:
    //   --reveal (0 -> 1): Birthday background wipes in from the TOP of the screen downward (the rocket "crosses into" it)
    //   --rise   (0 -> 1 -> 0): speed of the golden particles streaming DOWN past the camera while the rocket climbs
    let bRoot = null;
    const birthdayRoot = () => (bRoot && bRoot.isConnected ? bRoot : (bRoot = document.querySelector('.birthday-root')));
    // `started` = the show is actually running. It stays false until the parent flips the `start` prop to true.
    // Until then the scene is a calm, paused night sky: no timeline, no audio, no skip.
    let T = 0, started = false, done = false, lastC = null, slow = 0, Q = (innerWidth < 900 || matchMedia('(pointer:coarse)').matches) ? 1 : 0;
    function applyQ() { const pr = [Math.min(devicePixelRatio, 1.5), 1, 1][Q]; R.setPixelRatio(pr); U1.uPix.value = pr; if (comp) { comp.setPixelRatio(pr); comp.setSize(innerWidth, innerHeight) } else R.setSize(innerWidth, innerHeight); if (Q == 2 && bloom) bloom.enabled = false }
    // called ONCE, the moment the parent says start (screen is full of sky)
    function begin() {
      started = true; T = 0; last = performance.now();
      audio();
    }
    // ---------- open the new page
    function finish() {
      if (done) return;
      done = true;
      wo.style.opacity = 1;
      { const br = birthdayRoot(); if (br) { br.style.setProperty('--reveal', '1'); br.style.setProperty('--rise', '0'); } } // never leave Birthday masked if the user skips
      try { if (AC) AC.close(); } catch (e) { }
      if (NEXT_PAGE_URL) {
        window.location.href = NEXT_PAGE_URL;
      } else {
        window.setTimeout(() => {
          onCompleteCallback();
        }, 220);
      }
    }
    // Sound starts by itself. Browsers only block it when the visitor has not touched the site at all yet.
    // In that case the very first touch / click / key silently turns the sound on and it joins the show at the
    // right moment (the show is NOT restarted, and nothing is shown on screen).
    const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];
    function unlock() {
      if (!started || done) return;
      if (AC && AC.state === 'running' && AC.currentTime > .05) { UNLOCK_EVENTS.forEach(e => window.removeEventListener(e, unlock)); return } // sound is already working
      audio(T * KS); // (re)start the sound from the current moment of the show
    }
    UNLOCK_EVENTS.forEach(e => window.addEventListener(e, unlock));
    const caps = [[.6, 2.9, 'for the one who lights up my sky…'], [4.4, 7.4, 'every moment with you feels like this…']], capEl = document.getElementById('cap'), LA = new THREE.Vector3();
    function frame(dt) {
      if (started) T += dt * RATE; const t = T, on = 1; U1.uT.value = t;
      // last rocket progress + how far the sky has turned into the birthday background (0 -> 1)
      const lk = RK[RK.length - 1], ls = clamp((t - lk[0]) / (lk[1] - lk[0])), bgk = sm(clamp((t - lk[0] - .4) / (lk[1] - lk[0] - 1.9)));
      S.background.copy(BG_SKY).lerp(BG_BLACK, bgk);
      // 1) rocket is climbing: ask the page to load the real Birthday page underneath (Sky blends over it)
      if (!riseCalled && bgk > .12) { riseCalled = true; onRiseRef.current?.(); }
      { const br = birthdayRoot(); if (br) {
        const reveal = clamp((bgk - .12) / .88);                                                        // wipe progress, 0 at mount -> 1 when sky is fully black
        const rise = sm(clamp((t - lk[0] - .2) / 1.2)) * (1 - sm(clamp((t - (RISE_END - 1.5)) / 1.5))); // speed ramps up after launch, eases to 0 on arrival
        br.style.setProperty('--reveal', reveal.toFixed(3)); br.style.setProperty('--rise', rise.toFixed(3));
      } }
      // 2) blast has happened: now let the Birthday animation start (Sky sparks keep fading over it)
      if (!blastCalled && t > BLAST + BIRTHDAY_DELAY) { blastCalled = true; onBlastDoneRef.current?.(); }
      // 3) sky layer fades away at the very end
      mount.style.opacity = 1 - sm(clamp((t - (END - 1.4)) / 1.2));
      // rockets
      let sky = 0; RK.forEach((r, q) => {
        const s = clamp((t - r[0]) / (r[1] - r[0])), act = t > r[0] && t < (q === RK.length - 1 ? BLAST : r[1]); for (let j = 0; j < NT; j++) { // last rocket stays visible (parked at its top) until the blast
          const sj = s - j * .011, o = (q * NT + j) * 3;
          if (!act || sj < 0) { rp[o] = rp[o + 1] = rp[o + 2] = 0; rc[o] = rc[o + 1] = rc[o + 2] = 0; continue }
          const ey = rkEase(q, sj), jt = (Math.sin(j * 12.9 + q) * .5) * (j / NT); rp[o] = r[2] + (r[3] - r[2]) * sj + Math.sin(sj * 22 + q) * .12 + jt; rp[o + 1] = .4 + (r[4] - .4) * ey - j * .02; rp[o + 2] = r[5] + jt * .3;
          const br = (1 - j / NT) * (j == 0 ? 2.2 : .7) * (1 - .0 * s); rc[o] = 1 * br; rc[o + 1] = .72 * br; rc[o + 2] = .4 * br
        }
      });
      rg.attributes.position.needsUpdate = true; rg.attributes.color.needsUpdate = true;
      FL.forEach((f, i) => { const tau = t - f.t, s = flashes[i], v = tau > 0 ? Math.exp(-tau * 3.2) * f.i : 0; s.position.set(f.c[0], f.c[1], f.c[2] + 2); s.material.opacity = Math.min(1, v * .8); s.scale.setScalar((26 + (tau > 0 ? tau * 16 : 0)) * (f.t >= BLAST ? 2 : 1)); s.visible = v > .01; sky += (tau > 0 ? Math.exp(-tau * 2) * f.i : 0) });
      // idle glow: while the sky waits behind the WELCOME letters it shows a bright blue horizon glow, so the
      // letters look like a window to a real night sky. It fades out ~1.5s after the show starts.
      const idle = 1 - clamp(T / 1.6);
      skyG.material.opacity = on * (1 - bgk) * (Math.min(.45, sky * .1) + .4 * idle * IDLE_GLOW); horizon.material.opacity = on * (1 - bgk) * (.05 + Math.min(.5, sky * .14) + .5 * idle * IDLE_GLOW);
      // stars + town lights are fully visible from the first frame, so the paused sky already looks alive behind the WELCOME letters
      sf.opacity = on * .85 * (1 - bgk); tm.opacity = on * .8; tm2.opacity = on * .3;
      let c = null; caps.forEach(x => { if (t > x[0] && t < x[1]) c = x[2] }); if (c !== lastC) { lastC = c; capEl.style.opacity = c ? 1 : 0; if (c) capEl.textContent = c }

      if (started && t >= END) finish();
      // camera: locks onto the last rocket (suspense), zooms in, trembles, then widens at the blast
      const hx = lk[2] + (lk[3] - lk[2]) * ls, hy = .4 + (lk[4] - .4) * rkEase(RK.length - 1, ls), hz = lk[5], tw = sm(clamp((t - lk[0] + .3) / 1.2));
      beacon.position.set(hx, hy, hz); beacon.material.opacity = (t > lk[0] && t < BLAST) ? .9 : 0; beacon.scale.setScalar(4 + ls * 7 + Math.sin(t * 30) * .4);
      const sh = (Math.exp(-Math.max(0, t - BLAST) * 3.5) * (t > BLAST ? .12 : 0) + FL.reduce((a, f) => a + (t > f.t ? Math.exp(-(t - f.t) * 5) * .03 * f.i : 0), 0) + (t > lk[0] && t < BLAST ? .025 * ls * ls : 0));
      const z0 = lerp(9.5, 7.6, clamp(t / 8)), px = Math.sin(t * .3) * .25, py = 2 + Math.sin(t * .45) * .05;
      const fol = CAM_FOLLOW * sm(clamp((t - lk[0]) / 1.4)); // camera starts rising with the rocket, then follows it
      C.position.set(px, py + fol * (hy - .4), z0 + (Math.random() - .5) * sh * .3); C.position.x += (Math.random() - .5) * sh; C.position.y += (Math.random() - .5) * sh;
      LA.set(lerp(px * .4, hx, tw), lerp(15.5, hy + 10 * (1 - ls), tw), lerp(-48, hz, tw)); C.lookAt(LA);
      // stars and golden particles travel with the camera; they drift past it so the climb feels endless
      starsPts.position.set(C.position.x, C.position.y * .85, C.position.z);

      const fv = t < BLAST ? lerp(55, 38, sm(clamp((t - lk[0]) / (BLAST - lk[0])))) : lerp(38, 58, sm(clamp((t - BLAST) / .9))); if (Math.abs(fv - C.fov) > .01) { C.fov = fv; C.updateProjectionMatrix() }
      if (bloom) bloom.strength = .95 - .45 * idle * (1 - IDLE_GLOW) + (t > BLAST ? 1.4 * Math.exp(-(t - BLAST) * 1.1) : 0); // softer bloom while waiting
    }
    applyQ(); let last = performance.now();
    let rafId = 0; (function loop(n) {
      if (done) return; rafId = requestAnimationFrame(loop);
      if (!started && startRef.current) begin(); // parent flipped `start` -> the show begins from 0, nothing is remounted
      const raw = n - last, dt = Math.min(.05, raw / 1000); last = n; if (started && raw > 26) slow += raw / 1000; else slow = Math.max(0, slow - .01); if (slow > 1.2 && Q < 2) { Q++; slow = 0; applyQ() } frame(dt); comp ? comp.render() : R.render(S, C)
    })(last);
    const onResize = () => { R.setSize(innerWidth, innerHeight); if (comp) comp.setSize(innerWidth, innerHeight); C.aspect = innerWidth / innerHeight; C.updateProjectionMatrix() }; window.addEventListener('resize', onResize);

    return () => {
      done = true;
      try { cancelAnimationFrame(rafId); } catch (e) { }
      try { if (AC) AC.close(); } catch (e) { }
      UNLOCK_EVENTS.forEach(e => window.removeEventListener(e, unlock));
      window.removeEventListener("resize", onResize);
      try {
        S.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
          }
        });
      } catch (e) { }
      try { dot.dispose(); } catch (e) { }
      try { R.dispose(); } catch (e) { }
      try { comp?.dispose?.(); } catch (e) { }
      if (mount.contains(R.domElement)) mount.removeChild(R.domElement);
      if (mount.contains(cap)) mount.removeChild(cap);
      if (mount.contains(wo)) mount.removeChild(wo);
    };
  }, []);

  // Portaled to <body> so it sits in the SAME stacking context as the Birthday layer (also portaled to body).
  // Sky is z-index 0 (opaque), Birthday is z-index 1 with a transparent background, so the Birthday
  // background (golden particles, vignette) is drawn over the sky and the blast shows behind it.
  return createPortal(<div ref={mountRef} className="skyfall-fireworks" />, document.body);
}