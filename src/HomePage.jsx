import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import SkyToBirthday from './SkytoBirthday.jsx'; // 👈 Sky -> Birthday chain (mounted ONCE, paused, then started)
import './HomePage.css';

const TEXT_START_DELAY_MS = 1000;
const DEFAULT_FADE_SPEED_MS = 1600;
const DEFAULT_HOLD_TIME_MS = 1600;
const DEFAULT_TYPE_MS = 30; // typing speed of the home page text: milliseconds per letter (smaller = faster)

// ---- BACKGROUND VOICE (plays behind the home page and the whole show) -------------------------
export const BG_VOICE_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791660750/welcome_note_anka6s.mp3";        // paste your Cloudinary link for the voice here. Empty = no voice.
export const BG_VOICE_DELAY_SEC = 1;   // seconds AFTER the page loads before the voice starts (0 = immediately).
export const BG_VOICE_VOLUME = 0.8;    // 0 = silent, 1 = full volume.
export const BG_VOICE_LOOP = false;    // true = voice repeats until the page is left. false = plays once.

// ---- START SCREEN: the ONE tap that lets the browser play sound -------------------------------
// Browsers block all sound until the visitor taps once. With the start screen ON, the visitor taps once at the
// very beginning, then the voice, the poetry and ALL the rocket sounds play fully by themselves (no more taps).
export const REQUIRE_START_TAP = false;         // false = NO start screen (default). true = show a one-tap start screen first.
export const START_SCREEN_CAPTION = "tap to open"; // small text under the heart on the start screen ("" = no text)

/* Finds the thickest point inside a glyph (centre of its widest stroke), as an offset from the
   glyph's draw origin (x = start of letter, y = baseline). Zooming INTO this point means the
   screen fills with the letter itself, not with the empty gap between letters. */
function solidPointOf(ch, font, size) {
  const w = Math.ceil(size * 1.6), h = w, ox = size * 0.3, oy = h * 0.75;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = font;
  g.fillStyle = '#000';
  g.fillText(ch, ox, oy);
  const d = g.getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 200;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let best = { dx: 0, dy: -size * 0.36 }, bestScore = -1;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (!solid(x, y)) continue;
      let score = Infinity;
      for (const [vx, vy] of dirs) {
        let r = 0;
        while (r < size * 0.3 && solid(x + vx * r, y + vy * r)) r += 2;
        if (r < score) score = r;
        if (score <= bestScore) break;
      }
      if (score > bestScore) { bestScore = score; best = { dx: x - ox, dy: y - oy }; }
    }
  }
  return best;
}

/* Splits every letter of an element (including letters inside nested <span>s) into its own span,
   hidden (visibility) at first, so the text can be revealed one letter at a time like typing. The hidden letters
   still take up space, so the line breaks never jump while typing. */
function splitIntoLetters(el) {
  if (el._letters) return el._letters; // already split (React StrictMode runs effects twice)
  const letters = [];
  const walk = (node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        Array.from(n.textContent).forEach((ch) => {
          const sp = document.createElement('span');
          sp.textContent = ch;
          sp.style.visibility = 'hidden'; // NOT opacity: opacity makes its own layer and breaks the gold gradient (background-clip:text)
          frag.appendChild(sp);
          letters.push(sp);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        walk(n);
      }
    });
  };
  walk(el);
  el._letters = letters;
  return letters;
}

export default function HomePage() {
  const [entered, setEntered] = useState(!REQUIRE_START_TAP); // false = start screen is showing, nothing has begun yet
  const voiceRef = useRef(null);
  const [showSky, setShowSky] = useState(false);   // SkyToBirthday is mounted (paused) behind the WELCOME letters
  const [skyPlay, setSkyPlay] = useState(false);   // flips to true when the screen is FULL -> fireworks start
  const threeMountRef = useRef(null);
  const heartsCanvasRef = useRef(null);
  const textStageRef = useRef(null);
  const arrivalFlashRef = useRef(null);
  const welcomeCanvasRef = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    if (!entered) return; // everything (text, stardust, sky) waits for the start tap
    let disposed = false;
    let threeRafId = 0;
    let heartsRafId = 0;
    let textTimer = 0;
    let appShell = null; // top-level element of the app (child of <body>) that we hide so the sky shows
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));

    // Unbounded is used on the canvas. (An @import placed after other rules in a CSS file is ignored,
    // so make sure the font is really loaded from here.)
    if (!document.getElementById('unbounded-font-link')) {
      const l = document.createElement('link');
      l.id = 'unbounded-font-link';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@800&display=swap';
      document.head.appendChild(l);
    }

    /* 1. INITIAL ARRIVAL FLASH DISSOLVE */
    const flashEl = arrivalFlashRef.current;
    if (flashEl) {
      setTimeout(() => {
        if (!disposed && flashEl) flashEl.classList.add('dissolve');
      }, 150);
    }

    /* 2. THREE.JS 3D GOLDEN STARDUST (HOME PAGE) */
    const container = threeMountRef.current;
    if (!container) return;

    const homeScene = new THREE.Scene();
    const homeCamera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 1000);
    homeCamera.position.z = 28;

    // preserveDrawingBuffer: the WELCOME canvas copies this frame so the home page stays visible around the letters
    const homeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    homeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    homeRenderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(homeRenderer.domElement);

    const COUNT = 1200;
    const posArray = new Float32Array(COUNT * 3);
    const metaArray = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      posArray[i * 3 + 0] = (Math.random() - 0.5) * 65;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 55;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 50;
      metaArray[i * 3 + 0] = 0.5 + Math.random() * 1.0;
      metaArray[i * 3 + 1] = Math.random() * Math.PI * 2;
      metaArray[i * 3 + 2] = 1.8 + Math.random() * 3.5;
    }

    const homeGeometry = new THREE.BufferGeometry();
    homeGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    homeGeometry.setAttribute('aMeta', new THREE.BufferAttribute(metaArray, 3));

    const homeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#ff8c42') },
        uColor2: { value: new THREE.Color('#ffd180') }
      },
      vertexShader: `
        attribute vec3 aMeta;
        uniform float uTime;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec3 p = position;
          float speed = aMeta.x;
          float phase = aMeta.y;
          float sz = aMeta.z;
          p.y += mod(uTime * speed * 2.0, 60.0) - 30.0;
          p.x += sin(uTime * 0.6 + phase) * 2.0;
          p.z += cos(uTime * 0.45 + phase) * 1.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (46.0 / -mv.z) * sz * 0.45;
          vAlpha = smoothstep(0.4, 3.5, -mv.z) * 0.85;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float intensity = pow(1.0 - d * 2.0, 2.0);
          vec3 col = mix(uColor1, uColor2, d * 1.6);
          gl_FragColor = vec4(col * 1.5, intensity * vAlpha);
        }
      `
    });

    const homePointsMesh = new THREE.Points(homeGeometry, homeMaterial);
    homeScene.add(homePointsMesh);

    function onResize() {
      homeCamera.aspect = window.innerWidth / window.innerHeight;
      homeCamera.updateProjectionMatrix();
      homeRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    homeRenderer.render(homeScene, homeCamera);

    function animateHome(timestamp) {
      if (disposed) return;
      threeRafId = requestAnimationFrame(animateHome);
      const time = timestamp * 0.001;
      homeMaterial.uniforms.uTime.value = time;
      homePointsMesh.rotation.y = time * 0.035;
      homeRenderer.render(homeScene, homeCamera);
    }
    threeRafId = requestAnimationFrame(animateHome);

    /* 3. FLOATING GLOWING HEARTS */
    const hCanvas = heartsCanvasRef.current;
    if (hCanvas) {
      const hCtx = hCanvas.getContext('2d');
      let W = 0, H = 0, dpr = 1, hLast = 0, ht = 0;
      const rnd = (a, b) => a + Math.random() * (b - a);

      const glowHeart = document.createElement('canvas');
      glowHeart.width = glowHeart.height = 48;
      {
        const g = glowHeart.getContext('2d');
        const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
        gr.addColorStop(0, 'rgba(255, 110, 150, 0.85)');
        gr.addColorStop(0.45, 'rgba(255, 90, 130, 0.3)');
        gr.addColorStop(1, 'rgba(255, 70, 110, 0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 48, 48);
      }

      const makeHeart = (anywhere) => ({
        x: rnd(0, W),
        y: anywhere ? rnd(0, H) : H + 40,
        s: rnd(10, 22),
        sp: rnd(12, 24),
        ph: rnd(0, Math.PI * 2),
        amp: rnd(16, 36)
      });

      function resizeHearts() {
        W = window.innerWidth;
        H = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        hCanvas.width = W * dpr;
        hCanvas.height = H * dpr;
        hCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function drawHeart(x, y, s, rot, a) {
        hCtx.save();
        hCtx.translate(x, y);
        hCtx.rotate(rot);
        hCtx.globalAlpha = a * 0.55;
        hCtx.drawImage(glowHeart, -s * 1.5, -s * 1.5, s * 3, s * 3);
        hCtx.globalAlpha = a;
        hCtx.fillStyle = 'rgb(255, 120, 160)';
        hCtx.beginPath();
        hCtx.moveTo(0, s * 0.35);
        hCtx.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 0.5, -s * 0.85, 0, -s * 0.4);
        hCtx.bezierCurveTo(s * 0.5, -s * 0.85, s * 0.9, -s * 0.2, 0, s * 0.35);
        hCtx.fill();
        hCtx.restore();
      }

      resizeHearts();
      const hearts = Array.from({ length: 18 }, () => makeHeart(true));
      window.addEventListener('resize', resizeHearts);

      function animateHearts(ts) {
        if (disposed) return;
        heartsRafId = requestAnimationFrame(animateHearts);
        const dt = Math.min(0.05, (ts - hLast) / 1000 || 0.016);
        hLast = ts;
        ht += dt;
        hCtx.clearRect(0, 0, W, H);
        hCtx.globalCompositeOperation = 'lighter';
        for (const h of hearts) {
          h.y -= h.sp * dt;
          if (h.y < -40) Object.assign(h, makeHeart(false));
          const x = h.x + Math.sin(ht * 0.45 + h.ph) * h.amp;
          const rot = Math.sin(ht * 0.5 + h.ph) * 0.26;
          const a = 0.42 * (0.6 + 0.4 * Math.sin(ht * 1.2 + h.ph));
          drawHeart(x, h.y, h.s, rot, a);
        }
        hCtx.globalAlpha = 1;
      }
      heartsRafId = requestAnimationFrame(animateHearts);
    }

    /* ============================================================== */
    /* 4. "WELCOME": types over the PAUSED live sky, zooms INTO a      */
    /*    letter, and when the screen is full the show is started.     */
    /* ============================================================== */
    async function runWelcomeLiveSkyPortal() {
      // The home page is NOT faded out any more: the WELCOME canvas keeps drawing it (stardust, hearts,
      // vignette) around the letters, so it stays visible. Only the letters are windows to the sky.
      const FONT = '"Unbounded", "Arial Black", sans-serif';
      try {
        await Promise.race([document.fonts.load('800 100px "Unbounded"'), wait(100)]);
      } catch (e) { /* ignore */ }
      if (disposed) return;

      // Hide ONLY the home page itself (the WELCOME canvas already redraws it: stardust, hearts, vignette),
      // so the sky behind the letters is not covered by it. The rest of the app (navbar etc.) stays visible.
      if (pageRef.current) {
        appShell = pageRef.current;
        appShell.style.visibility = 'hidden';
      }

      // Mount SkyToBirthday ONCE, paused. It stays mounted from now until the whole show is over.
      console.log('[HomePage] mounting sky (paused)');
      setShowSky(true);

      const canvas = welcomeCanvasRef.current;
      if (!canvas) return;
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      const W = window.innerWidth;
      const H = window.innerHeight;
      const DPR = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const WORD = 'ENJOY MAM';
      const chars = Array.from(WORD);

      ctx.font = `800 100px ${FONT}`;
      const widths = chars.map((ch) => ctx.measureText(ch).width);
      const track = 0.055;
      const sum100 = widths.reduce((a, b) => a + b, 0) + track * 100 * (chars.length - 1);
      const fontSize = Math.min((W * 0.84 * 100) / sum100, H * 0.28);
      const k = fontSize / 100;
      const gap = track * fontSize;
      const adv = widths.map((w) => w * k);
      const totalWidth = adv.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);

      const x0 = (W - totalWidth) / 2;
      const pos = [];
      let curX = x0;
      for (let i = 0; i < chars.length; i++) {
        pos.push(curX);
        curX += adv[i] + gap;
      }

      const capH = fontSize * 0.72;
      const baseY = H / 2 + capH / 2;

      // 🎯 Zoom target = the thickest point of the stroke of 'C' (index 3), NOT the hollow of the C
      // and NOT the gap between letters. The screen fills with the letter -> the live sky.
      const cIdx = 3;
      const sp = solidPointOf(chars[cIdx], `800 ${fontSize}px ${FONT}`, fontSize);
      const cCenterX = pos[cIdx] + sp.dx;
      const cCenterY = baseY + sp.dy;

      const startTime = performance.now() + 700; // small head start so the sky can finish loading before letters appear
      const typeSpeed = 30;
      const typeEnd = chars.length * typeSpeed;
      const holdDuration = 500; // time to admire the live sky inside the letters
      const zoomStart = typeEnd + holdDuration;
      const zoomDuration = 2600;
      const maxScale = 90;

      function renderFrame(now) {
        if (disposed) return;
        const elapsed = now - startTime;

        ctx.clearRect(0, 0, W, H);

        const typedN = Math.max(0, Math.min(chars.length, Math.floor(elapsed / typeSpeed)));

        let u = 0;
        let scale = 1.0;
        if (elapsed >= zoomStart) {
          u = Math.min(1.0, (elapsed - zoomStart) / zoomDuration);
          scale = 1.0 + Math.pow(u, 2.7) * (maxScale - 1);
        }

        const focusX = (W / 2) * (1 - u) + cCenterX * u;
        const focusY = (H / 2) * (1 - u) + cCenterY * u;

        // dark overlay over everything; it dissolves while we fly into the letter
        const overlayAlpha = Math.max(0, 1.0 - Math.pow(u, 1.8));

        // the overlay IS the home page: background colour + golden stardust + hearts + vignette
        ctx.save();
        ctx.globalAlpha = overlayAlpha;
        ctx.fillStyle = '#030107';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(homeRenderer.domElement, 0, 0, W, H);
        if (hCanvas) ctx.drawImage(hCanvas, 0, 0, W, H);
        const vr = Math.hypot(W, H) / 2;
        const vg = ctx.createRadialGradient(W / 2, H / 2, vr * 0.45, W / 2, H / 2, vr);
        vg.addColorStop(0, 'rgba(2,0,5,0)');
        vg.addColorStop(1, 'rgba(2,0,5,0.85)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // cut the letters out of the overlay -> the live sky shows through
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.scale(scale, scale);
        ctx.translate(-focusX, -focusY);

        ctx.font = `800 ${fontSize}px ${FONT}`;

        // 1) warm golden rim + glow, drawn FIRST. The font has hidden overlapping contours, so their lines
        //    would show inside the letters; step 2 erases the inside, which removes those glitches.
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = `rgba(255, 209, 128, ${Math.min(1.0, overlayAlpha * 1.2)})`;
        ctx.lineWidth = Math.max(2, 7 / scale);
        ctx.shadowColor = 'rgba(255, 209, 128, 0.8)';
        ctx.shadowBlur = 18;
        for (let j = 0; j < typedN; j++) {
          ctx.strokeText(chars[j], pos[j], baseY);
        }

        // 2) cut the letters out -> the live sky shows through (shadow off so the cut is clean)
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000000';
        for (let j = 0; j < typedN; j++) {
          ctx.fillText(chars[j], pos[j], baseY);
        }

        ctx.restore();

        // blinking cursor while typing
        if (elapsed < zoomStart) {
          const cursorBlink = Math.floor(elapsed / 320) % 2 === 0;
          if (cursorBlink) {
            const lastIdx = Math.max(0, typedN - 1);
            const cursorX = typedN > 0 ? pos[lastIdx] + adv[lastIdx] + 8 : x0;
            ctx.fillStyle = '#ffd180';
            ctx.fillRect(cursorX, H / 2 - fontSize * 0.4, 4, fontSize * 0.8);
          }
        }

        // 🎯 SCREEN IS FULL (zoom finished). The sky behind is the SAME instance that was already
        // mounted, so nothing remounts. Tell it to start -> fireworks begin NOW.
        if (elapsed >= zoomStart + zoomDuration) {
          canvas.style.display = 'none';
          console.log('[HomePage] screen full -> starting fireworks');
          setSkyPlay(true);
          return;
        }

        requestAnimationFrame(renderFrame);
      }

      requestAnimationFrame(renderFrame);
    }

    /* ============================================================== */
    /* 5. POETRY CONTROLLER                                           */
    /* ============================================================== */
    const stage = textStageRef.current;
    if (stage) {
      const poetryActs = Array.from(stage.querySelectorAll('p'));
      poetryActs.forEach((el) => { el.classList.add('cinema-act', 'act-poetry'); splitIntoLetters(el); });

      textTimer = setTimeout(async () => {
        for (const act of poetryActs) {
          if (disposed) return;

          const speedAttr = act.dataset.speed;
          let fadeMs = DEFAULT_FADE_SPEED_MS;
          if (speedAttr) {
            fadeMs = speedAttr.endsWith('s') && !speedAttr.endsWith('ms')
              ? parseFloat(speedAttr) * 1000
              : parseInt(speedAttr, 10);
          }
          act.style.setProperty('--fade-speed', `${fadeMs}ms`);

          const holdAttr = act.dataset.hold || act.dataset.duration;
          let holdMs = DEFAULT_HOLD_TIME_MS;
          if (holdAttr) {
            holdMs = holdAttr.endsWith('s') && !holdAttr.endsWith('ms')
              ? parseFloat(holdAttr) * 1000
              : parseInt(holdAttr, 10);
          }

          act.classList.remove('fade-away');
          void act.offsetWidth;
          act.classList.add('active');

          // ⌨️ TYPING: letters appear one by one. Change speed per line with data-type="40" (ms per letter).
          const typeMs = act.dataset.type ? parseInt(act.dataset.type, 10) : DEFAULT_TYPE_MS;
          const letters = splitIntoLetters(act);
          for (const sp of letters) {
            if (disposed) return;
            sp.style.visibility = 'visible';
            const ch = sp.textContent;
            await wait(typeMs + (ch === ',' ? 260 : /[.!?…]/.test(ch) ? 420 : 0)); // short pause on punctuation
          }

          await wait(holdMs); // read time after the line is fully typed
          if (disposed) return;

          act.classList.add('fade-away');
          act.classList.remove('active');

          await wait(fadeMs + 350);
          if (disposed) return;
        }

        // 🚀 WHEN POETRY IS FINISHED -> WELCOME types, then zooms into a letter
        if (!disposed) {
          runWelcomeLiveSkyPortal();
        }
      }, TEXT_START_DELAY_MS);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(threeRafId);
      cancelAnimationFrame(heartsRafId);
      clearTimeout(textTimer);
      if (appShell) appShell.style.visibility = '';
      window.removeEventListener('resize', onResize);
      homeGeometry.dispose();
      homeMaterial.dispose();
      homeRenderer.dispose();
      if (container.contains(homeRenderer.domElement)) {
        container.removeChild(homeRenderer.domElement);
      }
    };
  }, [entered]);

  // Background voice: starts BG_VOICE_DELAY_SEC seconds after the page loads and stops when the page is left.
  // If the browser blocks sound (no tap on the site yet), it starts at the very first tap / key press instead.
  useEffect(() => {
    if (!BG_VOICE_URL || !entered) return;
    const audio = voiceRef.current || new Audio(BG_VOICE_URL);
    audio.preload = 'auto';
    audio.volume = BG_VOICE_VOLUME;
    audio.loop = BG_VOICE_LOOP;
    let due = false, started = false, gone = false;
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const stopListening = () => events.forEach((e) => window.removeEventListener(e, tryPlay));
    function tryPlay() {
      if (gone || !due || started) return;
      audio.play().then(() => { started = true; stopListening(); }).catch(() => { /* blocked: wait for the next tap */ });
    }
    events.forEach((e) => window.addEventListener(e, tryPlay));
    const timer = setTimeout(() => { due = true; tryPlay(); }, BG_VOICE_DELAY_SEC * 1000);
    return () => {
      gone = true;
      clearTimeout(timer);
      stopListening();
      audio.pause();
      voiceRef.current = null;
    };
  }, [entered]);

  // The start tap: this is the moment the browser allows sound, so we unlock everything here.
  function startExperience() {
    try { // 1) the voice element is "primed" inside the tap (needed on iPhone/Safari), then plays later after its delay
      if (BG_VOICE_URL) {
        const v = new Audio(BG_VOICE_URL); voiceRef.current = v; v.muted = true;
        v.play().then(() => { v.pause(); v.currentTime = 0; v.muted = false; }).catch(() => { v.muted = false; });
      }
    } catch (e) { /* ignore */ }
    try { // 2) one unlocked audio context is handed to the sky (SkyAnimation picks it up), so rocket sounds are never blocked
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) { const ac = new Ctx(); ac.resume(); window.__sharedAudioCtx = ac; }
    } catch (e) { /* ignore */ }
    setEntered(true);
  }

  return (
    <div ref={pageRef} className="story-page-container">
      {!entered && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#030107', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <style>{`@keyframes startPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 14px rgba(255,110,150,.55))}50%{transform:scale(1.12);filter:drop-shadow(0 0 30px rgba(255,110,150,.95))}}
.start-heart-btn{background:none;border:0;padding:18px;cursor:pointer;animation:startPulse 2.4s ease-in-out infinite}
.start-heart-btn:focus-visible{outline:2px solid #ffd180;outline-offset:6px;border-radius:50%}`}</style>
          <button type="button" className="start-heart-btn" onClick={startExperience} aria-label={START_SCREEN_CAPTION || 'open'}>
            <svg width="84" height="76" viewBox="0 0 84 76" aria-hidden="true"><path d="M42 72C14 52 4 36 4 22 4 11 12 4 22 4c8 0 15 5 20 13C47 9 54 4 62 4c10 0 18 7 18 18 0 14-10 30-38 50z" fill="rgb(255,120,160)" /></svg>
          </button>
          {START_SCREEN_CAPTION && <div style={{ color: '#ffd180', fontFamily: '"Unbounded", "Arial Black", sans-serif', fontSize: 13, letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.85 }}>{START_SCREEN_CAPTION}</div>}
        </div>
      )}
      {/* 1. Sky -> Birthday chain. Mounted once (paused) when WELCOME starts; `play` flips when the screen is full.
             SkyAnimation / HappyBirthday portal themselves to <body>. */}
      {/* Black backdrop UNDER the sky and the Birthday page (portaled to <body> BEFORE them, so it is below both).
             Without it, when the sky fades out and the Birthday layer is see-through, you see your app's own
             background colour (the blue shade). #04010a is the colour the Birthday scene starts on. */}
      {showSky && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#04010a', pointerEvents: 'none' }} />,
        document.body
      )}
      {showSky && <SkyToBirthday play={skyPlay} />}

      {/* 2. Handshake Flash Overlay */}
      <div ref={arrivalFlashRef} className="home-arrival-flash"></div>

      {/* 3. 3D WebGL Golden Stardust (Home page) */}
      <div ref={threeMountRef} className="webgl-canvas-holder"></div>

      {/* 4. Floating Glowing Hearts */}
      <canvas ref={heartsCanvasRef} id="hearts-bg-canvas"></canvas>

      <div className="cinematic-vignette"></div>

      {/* 5. WELCOME cutout canvas. Portaled to <body> so it sits ABOVE the sky (also on body, z-index 0).
             Inside .story-page-container it would be painted underneath the sky. */}
      {createPortal(<canvas ref={welcomeCanvasRef} id="welcome-portal-canvas"></canvas>, document.body)}

      {/* 6. Poetry sentences */}
      <div ref={textStageRef} className="cinema-text-stage">
        <p data-speed="1" data-hold="300">
          Hiii Mam👋
        </p>
        <p data-speed="1" data-hold="300">
          <span className="act-highlight">Kaisi hai aap ?</span>
        </p>

        <p data-speed="1" data-hold="1200">
          umeed karti hoon , <span className="act-highlight">aap achi hi hogi</span> 😁
        </p>
        <p data-speed="1" data-hold="300">
          waise
        </p>
        <p data-speed="1" data-hold="300">
          aapko mein  , <span className="act-highlight">apne baare</span> mein me bata deti hu ☺️
        </p>
        <p data-speed="1" data-hold="200">
          mein  , <span className="act-highlight">aapke sir  </span>😅 ki assistant hu. </p>
        <p data-speed="1" data-hold="200">
          Unhone  , <span className="act-highlight">aapke liye khaas   </span>💖 <span className="act-highlight">ye present</span>  taiyar kiya hai. </p>
  
        <p data-speed="1" data-hold="50">
          Toh aaiye  <span className="act-highlight">dekhte hai phir</span>😅 </p>
      </div>
    </div>
  );
}