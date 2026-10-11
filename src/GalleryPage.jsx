/**
 * Our Memories – React version  (PERFORMANCE-OPTIMISED)
 * ------------------------------------------------------------------
 *  Page order (top -> bottom)            photo numbers
 *    1. 3D heart intro + rotating ring     1 - 16
 *    2. "Our Memories" scatter -> grid    17 - 27   (mobile shows 17 - 25)
 *    3. "Wander through us" cursor trail  28 - 47   (20 photos)
 *    4. "Moments" wheel                   48 - 63
 *    5. "Little things, big love" panels  64 - 67
 *    6. "The whole story" long scroll     68 - 98
 *
 *  Paste your image links in  src/photos.js  (slot 1 = first entry ... slot 98 = last).
 *  An empty slot shows a pink placeholder with its number on it.
 *
 *  Setup:   npm i three@0.128.0      (keep this exact version – it keeps the look identical)
 *
 *  PERF changes (search for "PERF"):
 *   1. Cloudinary links are auto-resized per section (f_auto,q_auto,w_xxx) -> 5-20x smaller downloads
 *      and far less decoded memory. Original link is used automatically if the resized one fails.
 *   2. All sections are pre-loaded in the background after the page loads (while the cover is shown),
 *      in the order they are needed, a few at a time, so scrolling never waits on the network.
 *   3. Scroll animations only touch the DOM when a value really changed (no wasted style writes),
 *      blur is only computed for visible cards, and cards are promoted to GPU layers.
 *   4. Star-field limited to ~30fps, 3D ring uses direct render when bloom is off.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import './GalleryPage.css';
import { PHOTOS, DUMMY } from './photos.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

/* ================================================================== */
/*  shared helpers + the 98 photo slots                                */
/* ================================================================== */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------ */
/*  THREE SONGS (paste links between the quotes, mp3 / ogg / wav):       */
/*   1st = WAITING song: plays as soon as this page appears, while the   */
/*         "Tap to open" cover is showing. Fades out when you tap.       */
/*   2nd = MUSIC_URL: starts when the cover is tapped, restarts on Replay.*/
/*   3rd = THIRD_MUSIC_URL: starts automatically when the 2nd is over.   */
/*  Leave a link empty ('') and that slot is silent.                     */
/* ------------------------------------------------------------------ */
const WAITING_MUSIC_URL = 'https://res.cloudinary.com/u3u7poti/video/upload/v1791711848/heartbeat_nj7qme.mp3';         // 1st song (plays on the "Tap to open" cover)
const WAITING_MUSIC_PLAYS = 0;        // how many times it plays: 0 = loop until the cover is tapped, 1 = once, 2 = twice ...
const WAITING_MUSIC_VOLUME = 1;     // 0 (silent) … 1 (full)
const WAITING_FADE_OUT_SEC = 1;       // it fades out over this many seconds when the cover is tapped
const MUSIC_PLAYS = 1;                // 2nd song (MUSIC_URL): 1 = once, 2 = twice ... 0 = loop forever (then the 3rd song never starts)
const MUSIC_URL = 'https://res.cloudinary.com/u3u7poti/video/upload/v1791711127/Bairan_Animated_Love_Story_Banjaare_Official_Video_izby6m.mp4';
const MUSIC_VOLUME = 0.5;   // 0 (silent) … 1 (full)
const MESSAGE_FADE_OUT_SEC = 0.8;     // when "View message" is clicked: the music AND the screen fade out over this many seconds, then the message page opens
const THIRD_MUSIC_URL = '';           // 3rd song: starts when the 2nd song is over ('' = nothing plays after the 2nd)
const THIRD_MUSIC_PLAYS = 0;          // how many times it plays: 0 = loop forever, 1 = once, 2 = twice ...
const THIRD_MUSIC_VOLUME = 0.5;       // 0 (silent) … 1 (full)

const TOTAL = 98;
// which slots (0-based, end exclusive) each section shows
const SLOT = { ring: [0, 16], scatter: [16, 27], trail: [27, 47], wheel: [47, 63], panels: [63, 67], story: [67, 98] };

// PERF: width (px) each section really needs. Cloudinary serves exactly this size instead of the full original.
const W = { ring: 768, scatter: 800, trail: 500, wheel: 540, panels: 900, story: 800, lb: 1600 };

const ARS = [.75, 1, .67, .8, .75, .9, .7, .85, .78, 1, .67, .8];
const CAPS = ['A misty morning', 'Harvest', 'Waiting', 'Time for everything', 'Cross over', 'In the city', 'A boat trip', 'Stories to tell', 'A perfect day', 'Riding the curve', 'Raindrops', 'Gone sailing', 'The watch tower', 'Leaving', 'Above the clouds', 'Contemplation'];

// PERF: turn a Cloudinary link into a resized + auto-format + auto-quality link. Other links are returned untouched.
const CLD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
function opt(url, w) {
  if (!url) return url;
  const m = CLD.exec(url);
  if (!m) return url;
  const first = m[2].split('/')[0];
  if (/(^|,)w_\d+/.test(first)) return url;             // you already set a width yourself -> respect it
  return m[1] + 'f_auto,q_auto,c_limit,w_' + w + '/' + m[2];
}
// PERF: shared <img>/Image error handler: resized link -> original link -> numbered placeholder
function imgFail(t, p) {
  const step = t.dataset.step || '0';
  if (step === '0') {
    t.dataset.step = '1';
    if (!p.ph && t.src !== p.src) { t.src = p.src; return }
  }
  if (step !== '2') { t.dataset.step = '2'; t.src = p.fb }
}

// cheap pink gradient placeholder (SVG, no canvas work)
function phSrc(i) {
  const ar = ARS[i % ARS.length], h = Math.round(600 / ar);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${h}" viewBox="0 0 600 ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${(335 + i * 14) % 360},72%,46%)"/><stop offset="1" stop-color="hsl(${(265 + i * 10) % 360},62%,22%)"/></linearGradient><radialGradient id="r" cx=".7" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="600" height="${h}" fill="url(#g)"/><rect width="600" height="${h}" fill="url(#r)"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function initPhotos() {
  const { user } = useAuth()
  return Array.from({ length: TOTAL }, (_, i) => {
    const url = user.id === 'owner' ? ((PHOTOS[i] && PHOTOS[i].url) || '').trim() : ((DUMMY[i] && DUMMY[i].url) || '').trim();
    // const url = ((PHOTOS[i] && PHOTOS[i].url) || '').trim();
    const fb = phSrc(i);
    return { n: i + 1, src: url || fb, fb, ph: !url, ar: ARS[i % ARS.length] };
  });
}

// resize an uploaded file, return an object-URL
function shrink(file) {
  return new Promise(res => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const m = 1800, s = Math.min(1, m / Math.max(im.width, im.height)), w = Math.round(im.width * s), h = Math.round(im.height * s), c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(im, 0, 0, w, h);
      c.toBlob(b => { URL.revokeObjectURL(url); res({ src: URL.createObjectURL(b), ar: w / h }) }, 'image/jpeg', .9);
    };
    im.onerror = () => { URL.revokeObjectURL(url); res(null) };
    im.src = url;
  });
}

// <img> that falls back (resized -> original -> numbered placeholder) if a link is broken
// PERF: `w` = the width this spot needs; decoding="async" keeps image decoding off the main thread
function Img({ w = 800, ...props }) { return <ImgInner key={props.p.src} w={w} {...props} /> }
function ImgInner({ p, w, ...rest }) {
  return (
    <img
      src={opt(p.src, w)}
      alt=""
      draggable={false}
      decoding="async"
      onError={e => imgFail(e.currentTarget, p)}
      {...rest}
    />
  );
}
const Note = ({ p }) => (p.ph ? <div className="note"><b>♥</b><em>photo {p.n}</em></div> : null);

// PERF: write a style only when the value changed (avoids pointless style recalculation every frame)
const sset = (el, k, v) => { const c = el._c || (el._c = {}); if (c[k] === v) return; c[k] = v; el.style[k] = v };

/* ================================================================== */
/*  ROOT                                                               */
/* ================================================================== */
export default function GalleryPage() {
  const [photos, setPhotos] = useState(initPhotos);

  // while the gallery is mounted: black page background, login canvas hidden (see .gallery-on in the CSS)
  useEffect(() => {
    document.documentElement.classList.add('gallery-on');
    return () => document.documentElement.classList.remove('gallery-on');
  }, []);

  // uploaded files fill the empty slots in order; when all 98 are filled they replace from #1
  const addFiles = useCallback(async (fs, jump) => {
    fs = fs.filter(f => f.type.startsWith('image/'));
    if (!fs.length) return;
    const got = (await Promise.all(fs.map(shrink))).filter(Boolean);
    if (!got.length) return;
    setPhotos(prev => {
      const next = [...prev];
      const empty = next.map((p, i) => (p.ph ? i : -1)).filter(i => i >= 0);
      const targets = empty.length ? empty : next.map((_, i) => i);
      got.slice(0, targets.length).forEach((g, k) => { next[targets[k]] = { ...next[targets[k]], src: g.src, ph: false, ar: g.ar } });
      return next;
    });
    if (jump) { const a = document.getElementById('A'); if (a) scrollTo({ top: a.getBoundingClientRect().top + scrollY }) }
  }, []);

  // Rendered through a portal into <body> so it escapes the app's <main>
  // (which is a centred grid with pointer-events:none and would shrink the gallery and block every click).
  return createPortal(
    <div className="gallery-root">
      <Primary photos={photos} />
      <ScrollGallery photos={photos} onAddFiles={fs => addFiles(fs, true)} />
    </div>,
    document.body
  );
}

/* ================================================================== */
/*  PRIMARY PAGE – 3D heart intro + rotating photo ring (photos 1-16)  */
/* ================================================================== */
function Primary({ photos }) {
  const rootRef = useRef(null), hostRef = useRef(null), engine = useRef(null), photosRef = useRef(photos), timer = useRef(0);
  photosRef.current = photos;
  const [cover, setCover] = useState('show');
  const hearts = useMemo(() => Array.from({ length: 22 }, () => ({
    left: Math.random() * 100 + '%', fontSize: (10 + Math.random() * 22) + 'px',
    animationDuration: (7 + Math.random() * 9) + 's', animationDelay: (-Math.random() * 14) + 's'
  })), []);

  useEffect(() => {
    const primary = rootRef.current, $ = s => primary.querySelector(s);
    const elTitle = $('#p-title'), elMore = $('#p-more'), elGui = $('#p-gui');
    const PW = () => primary.clientWidth || innerWidth, PH = () => primary.clientHeight || innerHeight;
    const off = []; const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); off.push(() => t.removeEventListener(ev, fn, o)) };
    let alive = true, raf = 0, locked = true;

    try { history.scrollRestoration = 'manual' } catch (e) { /* ignore */ }
    scrollTo(0, 0);
    document.documentElement.classList.add('p-locked');

    const N3 = SLOT.ring[1] - SLOT.ring[0], GR = Math.max(6, N3 * .68);
    // PERF: phones render the heart at max 1.5x (was 2x) -> ~45% fewer pixels for the bloom pass
    const PRATIO = Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2);
    const R = new THREE.WebGLRenderer({ antialias: true }); R.setPixelRatio(PRATIO); R.setSize(PW(), PH());
    hostRef.current.appendChild(R.domElement);
    const sm = x => x * x * (3 - 2 * x), ec = x => 1 - Math.pow(1 - x, 3);
    const PR = PRATIO;
    const S = new THREE.Scene(); S.background = new THREE.Color(0x04020a);
    const C = new THREE.PerspectiveCamera(50, PW() / PH(), .1, 100);
    let comp = null, bloom = null;
    try { comp = new EffectComposer(R); comp.addPass(new RenderPass(S, C)); bloom = new UnrealBloomPass(new THREE.Vector2(PW(), PH()), 1.1, .9, .55); comp.addPass(bloom) } catch (e) { comp = null }
    function tex(draw) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); draw(g); return new THREE.CanvasTexture(c) }
    const dot = tex(g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, '#fff'); r.addColorStop(.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128) });
    const ringT = tex(g => { g.strokeStyle = 'rgba(255,200,225,.95)'; g.lineWidth = 3; g.shadowColor = '#ff4d88'; g.shadowBlur = 14; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke() });
    const camZ = () => GR + 6.9 + Math.max(0, 1 - PW() / PH()) * 9;
    // heart of particles
    const N = innerWidth < 700 ? 26000 : 44000, tgt = new Float32Array(N * 3), st = new Float32Array(N * 3), cl = new Float32Array(N * 3), rd = new Float32Array(N * 4);
    for (let i = 0, n = 0; n < N;) {
      const x = (Math.random() - .5) * 3, y = (Math.random() - .5) * 2, z = (Math.random() - .5) * 3, a = x * x + 2.25 * y * y + z * z - 1, f = a * a * a - x * x * z * z * z - .1125 * y * y * z * z * z;
      if (f < 0 && (f > -.2 || Math.random() < .16)) { const k = 1.25; tgt.set([x * k, (z - .1) * k, y * k * .9], n * 3); n++ }
    }
    for (let i = 0; i < N; i++) {
      const r = 3 + Math.pow(Math.random(), .7) * 15, th = Math.random() * 6.283; st[i * 3] = r * Math.cos(th); st[i * 3 + 1] = (Math.random() - .5) * 7 * Math.exp(-r / 9); st[i * 3 + 2] = r * Math.sin(th);
      const q = Math.random(), c = q < .08 ? [1, .78, .45] : q < .13 ? [1, .92, .95] : [1, .12 + .45 * Math.random(), .35 + .35 * Math.random()]; cl.set(c, i * 3);
      rd[i * 4] = Math.random() * 1.6; rd[i * 4 + 1] = Math.random(); rd[i * 4 + 2] = Math.random(); rd[i * 4 + 3] = Math.random()
    }
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(tgt, 3)); hg.setAttribute('aStart', new THREE.BufferAttribute(st, 3)); hg.setAttribute('aCol', new THREE.BufferAttribute(cl, 3)); hg.setAttribute('aRand', new THREE.BufferAttribute(rd, 4));
    const U = { uT: { value: 0 }, uPix: { value: PR }, uBeat: { value: 0 } };
    const hm = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uT,uPix,uBeat;attribute vec3 aStart,aCol;attribute vec4 aRand;varying vec3 vC;varying float vA;
    vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
    void main(){float tm=clamp((uT-aRand.x)/3.0,0.,1.);float e=tm*tm*tm*(tm*(tm*6.-15.)+10.);
    vec3 s=aStart;s.xz=rot(s.xz,(1.-e)*(5.+aRand.y*4.));vec3 p=mix(s,position,e);
    float form=smoothstep(4.0,4.7,uT);p*=1.+uBeat*.08*(.5+aRand.z*.5);
    float b=smoothstep(6.0,8.4,uT);vec3 dir=normalize(position+vec3(aRand.z-.5,aRand.w-.5,aRand.y-.5)*1.5+vec3(0.,.001,0.));
    vec3 q=p+dir*b*(3.+aRand.z*9.);q.xz=rot(q.xz,b*1.8*(.5+aRand.y));
    vA=smoothstep(0.,1.2,uT-aRand.x*.6)*(1.-smoothstep(7.0,8.8,uT+aRand.w));
    float tw=.75+.25*sin(uT*3.+aRand.w*40.);vC=aCol*(.8+.7*form*tw);
    vec4 mv=modelViewMatrix*vec4(q,1.);gl_Position=projectionMatrix*mv;
    gl_PointSize=max(1.4*uPix,(1.3+aRand.z*1.6)*(1.+form*.5)*tw*uPix*(14./-mv.z));}`,
      fragmentShader: `varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,exp(-d*d*3.5)*vA);}`
    });
    const heart = new THREE.Points(hg, hm); heart.frustumCulled = false; S.add(heart);
    const sp = (col) => new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    const glow = sp(0xff2d6f), flash = sp(0xffd6e6), wave = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    glow.position.z = -.8; S.add(glow, flash, wave);
    // bokeh
    const BN = 70, bp = new Float32Array(BN * 3); for (let i = 0; i < BN * 3; i++)bp[i] = (Math.random() - .5) * (i % 3 == 2 ? 24 : 30);
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    const bm = new THREE.PointsMaterial({ size: 1.5, map: dot, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff9a70 }); const bok = new THREE.Points(bg, bm); S.add(bok);
    // falling petals
    S.add(new THREE.AmbientLight(0x8a4060, 1.1)); const kl = new THREE.PointLight(0xffc0d4, 2, 40); kl.position.set(3, 5, 6); S.add(kl);
    const pg = new THREE.PlaneGeometry(1, 1, 6, 8), pp = pg.attributes.position, pc = [];
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), v = pp.getY(i) + .5, w = .45 + Math.sin(Math.PI * clamp(v * .92 + .06)); pp.setXYZ(i, x * w, v, -x * x * w * w * 1.5); pc.push(lerp(.35, .95, sm(v)), lerp(0, .15, v), lerp(.06, .3, v)) }
    pg.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3)); pg.computeVertexNormals();
    const fm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, side: THREE.DoubleSide, emissive: 0x40000f, transparent: true, opacity: 0 });
    const fall = []; for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(pg, fm); m.scale.setScalar(.15 + Math.random() * .15); S.add(m); fall.push({ m, x: (Math.random() - .5) * 26, y: Math.random() * 18 - 9, z: Math.random() * 18 - 10, v: .25 + Math.random() * .4, ph: Math.random() * 6.28, r: [Math.random() * 2, Math.random() * 2, Math.random() * 2] }) }
    // ---- rotating photo ring ----
    const gal = new THREE.Group(); gal.visible = false; S.add(gal);
    const planes = [], shownSrc = new Array(N3).fill(null);
    function placeholder(n) {
      const c = document.createElement('canvas'); c.width = 600; c.height = 800; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 600, 800); gr.addColorStop(0, `hsl(${335 + (n - 1) * 12},70%,42%)`); gr.addColorStop(1, `hsl(${260 + (n - 1) * 12},60%,20%)`); g.fillStyle = gr; g.fillRect(0, 0, 600, 800);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'center'; g.font = '200px serif'; g.fillText('♥', 300, 430); g.font = '36px Georgia'; g.fillText('Photo ' + n, 300, 520);
      return new THREE.CanvasTexture(c);
    }
    function imgTex(img) {
      const TW = 768, TH = 1024;                       // 3:4 like the frame (was 600 x 800) - sharper photos on the ring
      const c = document.createElement('canvas'); c.width = TW; c.height = TH; const g = c.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const s = Math.max(TW / img.width, TH / img.height), w = img.width * s, h = img.height * s; g.drawImage(img, (TW - w) / 2, (TH - h) / 2, w, h);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
    }
    const frameGeo = new THREE.PlaneGeometry(3.25, 4.25), photoGeo = new THREE.PlaneGeometry(3, 4);
    for (let i = 0; i < N3; i++) {
      const a = i / N3 * 6.283, grp = new THREE.Group();
      grp.position.set(Math.sin(a) * GR, 0, Math.cos(a) * GR); grp.rotation.y = a;
      const fr = new THREE.Mesh(frameGeo, new THREE.MeshBasicMaterial({ color: 0xff6f9f, transparent: true, opacity: 0, toneMapped: false })); fr.position.z = -.03;
      const im = new THREE.Mesh(photoGeo, new THREE.MeshBasicMaterial({ map: placeholder(i + 1), transparent: true, opacity: 0, toneMapped: false }));
      grp.add(fr, im); grp.userData = { i, fr, im }; gal.add(grp); planes.push(grp);
    }
    // swap textures only for the slots whose photo changed
    function setPhotos(list) {
      list.slice(SLOT.ring[0], SLOT.ring[1]).forEach((p, i) => {
        if (shownSrc[i] === p.src) return; shownSrc[i] = p.src;
        const mat = planes[i].userData.im.material;
        const setTex = t => { if (mat.map) mat.map.dispose(); mat.map = t; mat.needsUpdate = true };
        if (p.ph) { setTex(placeholder(p.n)); return }
        // PERF: ask Cloudinary for a 768px version (the texture is 768 wide anyway); retry with the original link if that fails
        const small = opt(p.src, W.ring); let retried = false;
        const im = new Image(); im.crossOrigin = 'anonymous';           // the image host must allow CORS for the 3D ring
        im.onload = () => { if (alive && shownSrc[i] === p.src) setTex(imgTex(im)) };
        im.onerror = () => {
          if (!retried && small !== p.src) { retried = true; im.src = p.src; return }
          if (alive && shownSrc[i] === p.src) setTex(placeholder(p.n));
        };
        im.src = small;
      });
    }

    // ---- music (MUSIC_URL at the top of this file) ----
    let music = null, fadeTimer = 0, played = 0, phase = 2, leaving = false; // phase 2 = 2nd song, 3 = 3rd song (same audio element, so it stays unlocked on phones)
    function fadeTo(v, ms) {
      clearInterval(fadeTimer);
      const v0 = music.volume, t0 = performance.now();
      fadeTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        music.volume = v0 + (v - v0) * k;
        if (k === 1) clearInterval(fadeTimer);
      }, 50);
    }
    function audio() {
      if (!MUSIC_URL) return;
      try {
        if (!music) {
          music = new Audio(MUSIC_URL); music.loop = MUSIC_PLAYS === 0; music.preload = 'auto';
          music.onended = () => {
            played++;
            const total = phase === 2 ? MUSIC_PLAYS : THIRD_MUSIC_PLAYS;
            if (total > 0 && played < total) { music.currentTime = 0; music.play().catch(() => { }); return }
            if (leaving) return; // fading out because of "View message": do not start the next song
            if (phase === 2 && THIRD_MUSIC_URL) { // 2nd song is over -> the 3rd song starts
              phase = 3; played = 0; music.src = THIRD_MUSIC_URL; music.loop = THIRD_MUSIC_PLAYS === 0; music.volume = 0;
              const q = music.play(); if (q && q.catch) q.catch(err => console.warn('[GalleryPage] 3rd song could not play:', THIRD_MUSIC_URL, err));
              fadeTo(clamp(THIRD_MUSIC_VOLUME), 1500);
            }
          };
        }
        if (phase !== 2) { phase = 2; music.src = MUSIC_URL; music.loop = MUSIC_PLAYS === 0 } // Replay: back to the 2nd song
        played = 0; music.currentTime = 0; music.volume = 0;
        const p = music.play(); if (p && p.catch) p.catch(() => { });
        fadeTo(clamp(MUSIC_VOLUME), 4000);
      } catch (e) { /* ignore */ }
    }

    // ---- WAITING song (1st): plays while the "Tap to open" cover is showing, fades out on the tap ----
    let wCtx = null, wGain = null, wSrc = null, wStopped = false;
    const wEv = ['pointerdown', 'touchend', 'keydown'];
    const wUnlock = () => { try { if (wCtx && wCtx.state === 'suspended') wCtx.resume() } catch (e) { /* ignore */ } wEv.forEach(e => window.removeEventListener(e, wUnlock)) };
    function startWaiting() {
      if (!WAITING_MUSIC_URL) return;
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      try {
        wCtx = new Ctx(); try { wCtx.resume() } catch (e) { /* ignore */ }
        wEv.forEach(e => window.addEventListener(e, wUnlock)); // if the browser blocks sound, the first tap / key press turns it on
        fetch(WAITING_MUSIC_URL).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer() })
          .then(ab => new Promise((ok, no) => wCtx.decodeAudioData(ab, ok, no)))
          .then(buf => {
            if (!alive || wStopped) return;
            wGain = wCtx.createGain(); wGain.gain.value = clamp(WAITING_MUSIC_VOLUME); wGain.connect(wCtx.destination);
            let left = Math.max(0, Math.floor(WAITING_MUSIC_PLAYS) || 0);
            const next = () => {
              const s = wCtx.createBufferSource(); s.buffer = buf; s.connect(wGain); wSrc = s;
              if (left === 0) s.loop = true; // 0 = loop
              s.onended = () => { if (wStopped) return; left--; if (left > 0) next() };
              s.start();
            };
            next();
          })
          .catch(err => console.warn('[GalleryPage] waiting song could not be loaded:', WAITING_MUSIC_URL, err));
      } catch (e) { /* ignore */ }
    }
    function stopWaiting(sec) { // smooth fade-out, then release the audio
      wStopped = true; wEv.forEach(e => window.removeEventListener(e, wUnlock));
      const c = wCtx; if (!c) return; wCtx = null;
      try {
        if (wGain) { const n = c.currentTime; wGain.gain.cancelScheduledValues(n); wGain.gain.setValueAtTime(wGain.gain.value, n); wGain.gain.linearRampToValueAtTime(0, n + sec) }
        if (wSrc) wSrc.stop(c.currentTime + sec + .1);
      } catch (e) { /* ignore */ }
      setTimeout(() => { try { c.close() } catch (e) { /* ignore */ } }, (sec + .4) * 1000);
    }

    // ---- "View message" clicked: fade whatever is playing down to silence (event sent by the footer button) ----
    on(window, 'gallery-fade-music', e => {
      const sec = (e.detail && e.detail.sec) || MESSAGE_FADE_OUT_SEC;
      leaving = true; stopWaiting(sec);
      if (music) { try { fadeTo(0, sec * 1000) } catch (err) { /* ignore */ } }
    });

    // ---- interaction ----
    let T = 0, started = false; const END = 9.6; let rot = 0, vr = .004, drag = false, lx = 0;
    const start = () => { started = true; T = 0; stopWaiting(WAITING_FADE_OUT_SEC); audio() };
    on(window, 'pointerdown', e => {
      if (!started || e.target.closest('.ui') || !primary.contains(e.target)) return;
      drag = true; lx = e.clientX;
    });
    on(window, 'pointerup', () => { drag = false });
    on(window, 'pointercancel', () => { drag = false });
    on(window, 'pointermove', e => { if (drag) { vr = (e.clientX - lx) * .004; rot += vr; lx = e.clientX } });
    on(window, 'wheel', e => { if (!locked && primary.contains(e.target)) vr += e.deltaY * .00008 }, { passive: true });
    on($('#p-replay'), 'click', () => {
      T = 0; gal.visible = false; audio();
      elGui.style.display = 'none'; elMore.style.display = 'none'; elTitle.style.opacity = 0;
      locked = true; document.documentElement.classList.add('p-locked'); scrollTo(0, 0);
    });

    const g1 = (t, c) => Math.exp(-Math.pow((t - c) * 6, 2));
    function frame(dt) {
      if (started) T += dt; const t = T; U.uT.value = t;
      U.uBeat.value = Math.max(g1(t, 4.9), g1(t, 5.4), g1(t, 6.0));
      const form = sm(clamp((t - 3.6) / 1.2)), fade = 1 - sm(clamp((t - 7) / 1.6));
      glow.material.opacity = (.06 + .4 * form + .15 * U.uBeat.value) * fade; glow.scale.setScalar(6 + form * 3 + U.uBeat.value * .8);
      const fl = t > 4.6 ? Math.exp(-(t - 4.6) * 3.2) : 0; flash.material.opacity = fl; flash.scale.setScalar(2 + (t - 4.6 > 0 ? (t - 4.6) * 14 : 0));
      const wt = clamp((t - 4.6) / 1.8); wave.material.opacity = t > 4.6 ? (1 - wt) * .85 : 0; wave.scale.setScalar(.5 + ec(wt) * 30);
      bm.opacity = sm(clamp((t - .3) / 2.5)) * .18; bok.rotation.y += dt * .02; bok.position.y = Math.sin(t * .3) * .5;
      fm.opacity = sm(clamp((t - 6.8) / 2)) * .95;
      fall.forEach(f => { f.y -= f.v * dt; if (f.y < -9) f.y = 9; f.m.position.set(f.x + Math.sin(t * .7 + f.ph) * 1.2, f.y, f.z); f.m.rotation.set(f.r[0] * t, f.r[1] * t, f.r[2] * t) });
      elTitle.style.opacity = t > 6.4 && t < 9 ? 1 : 0;
      if (t > END) { elGui.style.display = 'block'; elMore.style.display = 'block'; if (locked) { locked = false; document.documentElement.classList.remove('p-locked') } }
      const gf = sm(clamp((t - 7.4) / 1.8)); gal.visible = gf > 0;
      if (gf > 0) { gal.scale.setScalar(.55 + .45 * ec(gf)); planes.forEach(p => { p.userData.im.material.opacity = gf; p.userData.fr.material.opacity = .4 * gf; p.position.y = Math.sin(t * .8 + p.userData.i) * .18 }) }
      if (!drag) { rot += vr; vr += (.0035 - vr) * .02 } gal.rotation.y = rot + (1 - ec(gf)) * 2.2;
      const pf = 1 + Math.max(0, 1 - PW() / PH()) * .9, u = sm(clamp((t - 6.2) / 3)), rad = lerp(lerp(10, 6.6, sm(clamp(t / 4.8))) * pf, camZ(), u), ang = lerp(-.6, .15, clamp(t / 6)) * (1 - u);
      C.position.set(Math.sin(ang) * rad, .4 + .1 * u, Math.cos(ang) * rad); C.lookAt(0, 0, 0);
      if (bloom) { bloom.strength = lerp(1.15, 0, gf); bloom.enabled = bloom.strength > .01 }   // glow only for the heart intro; photos stay original
    }

    // ---- loop (paused while the ring is off screen) ----
    let last = performance.now(), vis = true;
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting });
    io.observe(primary);
    const loop = n => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(.05, (n - last) / 1000); last = n;
      if (!vis || document.hidden) return;
      frame(dt);
      // PERF: once the bloom glow is off, render straight to screen (skips the extra full-screen composer passes)
      if (comp && bloom && bloom.enabled) comp.render(); else R.render(S, C);
    };
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { const w = PW(), h = PH(); R.setSize(w, h); if (comp) comp.setSize(w, h); C.aspect = w / h; C.updateProjectionMatrix() });
    ro.observe(primary);

    engine.current = { start, setPhotos };
    setPhotos(photosRef.current);
    startWaiting(); // 1st song starts as soon as the page appears

    return () => {
      stopWaiting(0); alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); off.forEach(f => f());
      clearInterval(fadeTimer); if (music) { music.pause(); music.src = ''; music = null }
      R.dispose(); if (R.domElement.parentNode) R.domElement.parentNode.removeChild(R.domElement);
      document.documentElement.classList.remove('p-locked');
      engine.current = null;
    };
  }, []);

  // photos changed (links edited / files uploaded) -> refresh the ring textures
  useEffect(() => { if (engine.current) engine.current.setPhotos(photos) }, [photos]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const openCover = () => {
    if (cover !== 'show' || !engine.current) return;
    engine.current.start(); setCover('fade');
    timer.current = setTimeout(() => setCover('gone'), 1000);
  };

  return (
    <div id="primary" ref={rootRef}>
      <div className="p-canvas" ref={hostRef} />
      {cover !== 'gone' && (
        <div id="start" style={{ opacity: cover === 'fade' ? 0 : 1 }} onClick={openCover}>
          <div className="floaters">{hearts.map((h, i) => <span key={i} style={h}>♥</span>)}</div>
          <div className="orb"><div className="glow" /><div className="h">♥</div></div>
          <p className="name">For You</p>
          <p className="tap">Tap to open</p>
          <p className="snd">best with sound on</p>
        </div>
      )}
      <div id="p-title">FOR YOU</div>
      <div className="ui" id="p-more">scroll down<i /></div>
      <div className="ui" id="p-gui">
        <button id="p-replay">Replay</button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  BLACK STAR-FIELD BACKGROUND                                        */
/* ================================================================== */
function StarField() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, g = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, mx = .5, my = .5, lx = .5, ly = .5, shoot = null, nextShoot = 3000, raf = 0, lastT = 0;
    const tint = ['255,255,255', '255,255,255', '255,214,228', '210,220,255'];
    const stars = Array.from({ length: 190 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), p: Math.random() * 6.28, s: .5 + Math.random() * 1.5, c: tint[(Math.random() * tint.length) | 0] }));
    const onMove = e => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight };
    function size() { const d = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); if (reduce) draw(0) }
    function draw(t) {
      lx += (mx - lx) * .03; ly += (my - ly) * .03;
      g.clearRect(0, 0, W, H);
      const sc = scrollY;
      stars.forEach(d => {
        const y = (((d.y - sc * .00005 * (.2 + d.z) - (ly - .5) * .01 * d.z) % 1) + 1) % 1, x = d.x + (lx - .5) * .015 * d.z,
          tw = .55 + .45 * Math.sin(t * .0009 * d.s + d.p), a = (.15 + .6 * d.z) * tw, r = .4 + d.z * 1.1;
        g.fillStyle = `rgba(${d.c},${a})`; g.beginPath(); g.arc(x * W, y * H, r, 0, 6.283); g.fill();
        if (d.z > .93) { g.fillStyle = `rgba(${d.c},${a * .12})`; g.beginPath(); g.arc(x * W, y * H, r * 4, 0, 6.283); g.fill() }
      });
      if (!reduce) {
        if (!shoot && t > nextShoot) { const ang = .4 + Math.random() * .3; shoot = { x: Math.random() * W * .8, y: Math.random() * H * .4, vx: Math.cos(ang), vy: Math.sin(ang), t0: t, life: 900 + Math.random() * 400 }; nextShoot = t + 6000 + Math.random() * 7000 }
        if (shoot) {
          const k = (t - shoot.t0) / shoot.life;
          if (k >= 1) shoot = null; else {
            const hx = shoot.x + shoot.vx * k * W * .35, hy = shoot.y + shoot.vy * k * W * .35, L = 140, a = Math.sin(k * Math.PI);
            const gr = g.createLinearGradient(hx, hy, hx - shoot.vx * L, hy - shoot.vy * L);
            gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.strokeStyle = gr; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - shoot.vx * L, hy - shoot.vy * L); g.stroke();
          }
        }
      }
    }
    addEventListener('pointermove', onMove, { passive: true }); addEventListener('resize', size); size();
    // PERF: the background only needs ~30fps; this frees the main thread for the scroll animations
    if (!reduce) { const loop = t => { raf = requestAnimationFrame(loop); if (document.hidden || t - lastT < 32) return; lastT = t; draw(t) }; raf = requestAnimationFrame(loop) }
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('resize', size) };
  }, []);
  return <canvas id="d3" ref={ref} aria-hidden="true" />;
}

/* ================================================================== */
/*  Smooth (eased) mouse-wheel scrolling – frame-rate independent       */
/* ================================================================== */
function useSmoothWheel() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;
    let target = scrollY, cur = scrollY, busy = false, last = 0, raf = 0;
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    function tick(now) {
      const dt = Math.min(48, last ? now - last : 16.7); last = now;
      cur += (target - cur) * (1 - Math.exp(-dt / 120));
      if (Math.abs(target - cur) < .3) { cur = target; busy = false; last = 0 } else raf = requestAnimationFrame(tick);
      scrollTo(0, cur);
    }
    const onScroll = () => { if (!busy) { target = cur = scrollY } };
    const onWheel = e => {
      if (e.ctrlKey || e.target.closest('.mc, #lb') || document.body.style.overflow === 'hidden' || document.documentElement.classList.contains('p-locked')) return;
      e.preventDefault();
      let d = e.deltaY; if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= innerHeight;
      d = clamp(d, -260, 260);
      target = clamp(target + d, 0, maxY());
      if (!busy) { busy = true; cur = scrollY; last = 0; raf = requestAnimationFrame(tick) }
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('wheel', onWheel, { passive: false });
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', onScroll); removeEventListener('wheel', onWheel) };
  }, []);
}

/* ================================================================== */
/*  one tilt-on-hover photo tile (section 2)                           */
/* ================================================================== */
function Tile({ p, cap, onOpen }) {
  const ref = useRef(null);
  const grp = () => ref.current.closest('[data-group]') || ref.current.closest('#cols');
  const enter = () => { ref.current.classList.add('hov'); const g = grp(); if (g) g.classList.add('dim') };
  const move = e => {
    const t = ref.current, r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    t.style.setProperty('--rx', ((.5 - py) * 16) + 'deg'); t.style.setProperty('--ry', ((px - .5) * 16) + 'deg');
    t.style.setProperty('--gx', px * 100 + '%'); t.style.setProperty('--gy', py * 100 + '%');
  };
  const out = () => {
    const t = ref.current; t.classList.remove('hov'); t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg');
    const g = grp(); if (g) g.classList.remove('dim');
  };
  return (
    <div className="tilt" ref={ref} data-i={p.n - 1} onPointerEnter={enter} onPointerMove={move} onPointerLeave={out} onPointerCancel={out} onClick={() => onOpen(p.n - 1)}>
      <Img p={p} w={W.scatter} />
      <div className="glare" />
      <span className="cap">{cap}</span>
      <Note p={p} />
    </div>
  );
}

/* ================================================================== */
/*  SCROLL GALLERY (photos 17-98)                                      */
/* ================================================================== */
const MSG = {
  to: 'My dearest,',
  lines: [
    'Every photo here is a little piece of us — the laughs, the quiet days, the places we never want to forget.',
    'Thank you for being my favourite part of every story, and for turning ordinary moments into memories.',
    'Whatever comes next, I want to keep making more of them with you.'
  ],
  sign: 'Forever yours ♥'
};

function ScrollGallery({ photos, onAddFiles }) {
  const rootRef = useRef(null);
  const navigate = useNavigate();
  // smooth hand-off to the message page: fade the gallery to black first, then change route
  const [leaving, setLeaving] = useState(false), leaveTimer = useRef(0);
  const goMessage = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.dispatchEvent(new CustomEvent('gallery-fade-music', { detail: { sec: MESSAGE_FADE_OUT_SEC } })); // music fades out together with the screen
    leaveTimer.current = setTimeout(() => navigate('/home/gallery/message'), (MESSAGE_FADE_OUT_SEC + 0.05) * 1000);
  }, [leaving, navigate]);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  const [desk] = useState(() => typeof window !== 'undefined' && window.innerWidth > 900);
  const N = photos.length;
  useSmoothWheel();

  // ---------- PERF: background pre-loader ----------
  // After the page has loaded (the "Tap to open" cover is still showing), quietly download every section's
  // images - in the order they are needed - a few at a time. They land in the browser cache using the SAME
  // resized URLs the page uses, so later scrolling never waits for the network.
  const keep = useRef([]);
  useEffect(() => {
    const jobs = [], seen = new Set();
    const add = (range, w, decode) => photos.slice(range[0], range[1]).forEach(p => {
      if (p.ph) return;
      const u = opt(p.src, w);
      if (/^(blob|data):/.test(u) || seen.has(u)) return;
      seen.add(u); jobs.push({ u, decode });
    });
    add(SLOT.scatter, W.scatter, true);   // first thing you scroll into
    add(SLOT.wheel, W.wheel, false);
    add(SLOT.trail, W.trail, false);
    add(SLOT.panels, W.panels, false);
    add(SLOT.story, W.story, false);
    let idx = 0, active = 0, dead = false, started = false;
    const MAX = 3;                         // 3 at a time = never fights with the 3D intro for bandwidth
    const pump = () => {
      while (!dead && active < MAX && idx < jobs.length) {
        const job = jobs[idx++]; active++;
        const im = new Image(); im.decoding = 'async';
        const done = () => { active--; if (!dead) pump() };
        im.onload = () => { if (job.decode && im.decode) im.decode().catch(() => { }).then(done); else done() };
        im.onerror = done;
        im.src = job.u; keep.current.push(im);   // keep a reference so the browser does not cancel it
      }
    };
    const go = () => { if (started || dead) return; started = true; (window.requestIdleCallback || (f => setTimeout(f, 300)))(pump) };
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
    return () => { dead = true; removeEventListener('load', go) };
  }, [photos]);

  // ---------- lightbox (all 98 photos, 1 -> 98) ----------
  const [lbOpen, setLbOpen] = useState(false), [lbVis, setLbVis] = useState(false), [shown, setShown] = useState(0), [sw, setSw] = useState(false);
  const curRef = useRef(0), swTimer = useRef(0), closeTimer = useRef(0), touchX = useRef(0);
  const showLb = useCallback((i, first) => {
    const idx = (i + N) % N; curRef.current = idx; clearTimeout(swTimer.current);
    if (first) { setShown(idx); setSw(false) } else { setSw(true); swTimer.current = setTimeout(() => { setShown(idx); setSw(false) }, 200) }
  }, [N]);
  const openLb = useCallback(i => { clearTimeout(closeTimer.current); setLbOpen(true); requestAnimationFrame(() => setLbVis(true)); showLb(i, true) }, [showLb]);
  const closeLb = useCallback(() => { setLbVis(false); closeTimer.current = setTimeout(() => setLbOpen(false), 350) }, []);
  useEffect(() => {
    if (!lbOpen) return;
    const f = e => { if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowRight') showLb(curRef.current + 1); if (e.key === 'ArrowLeft') showLb(curRef.current - 1) };
    addEventListener('keydown', f); return () => removeEventListener('keydown', f);
  }, [lbOpen, closeLb, showLb]);
  // PERF: while the lightbox is open, pre-load the previous / next photo so arrows feel instant
  useEffect(() => {
    if (!lbOpen) return;
    [shown + 1, shown - 1].forEach(k => { const p = photos[(k + N) % N]; if (p && !p.ph) { const im = new Image(); im.src = opt(p.src, W.lb) } });
  }, [lbOpen, shown, photos, N]);
  useEffect(() => () => { clearTimeout(swTimer.current); clearTimeout(closeTimer.current) }, []);
  const openRef = useRef(openLb); openRef.current = openLb;

  // ---------- message dialog ----------
  const [msgOpen, setMsgOpen] = useState(false), vmRef = useRef(null), mxRef = useRef(null);
  const closeMsg = useCallback(() => { setMsgOpen(false); if (vmRef.current) vmRef.current.focus() }, []);
  useEffect(() => {
    document.body.style.overflow = msgOpen ? 'hidden' : '';
    if (!msgOpen) return;
    const t = setTimeout(() => mxRef.current && mxRef.current.focus(), 50);
    const k = e => { if (e.key === 'Escape') closeMsg() };
    addEventListener('keydown', k); return () => { clearTimeout(t); removeEventListener('keydown', k) };
  }, [msgOpen, closeMsg]);

  // the app's LOCK button sits over the lightbox close button, so hide it while a dialog is open
  useEffect(() => {
    document.documentElement.classList.toggle('gallery-modal', lbOpen || msgOpen);
    return () => document.documentElement.classList.remove('gallery-modal');
  }, [lbOpen, msgOpen]);

  // hide the progress bar while the primary page is on screen
  useEffect(() => {
    const f = () => document.body.classList.toggle('on-primary', scrollY < innerHeight * .6);
    addEventListener('scroll', f, { passive: true }); f();
    return () => { removeEventListener('scroll', f); document.body.classList.remove('on-primary') };
  }, []);

  // ---------- the scroll-driven engine (everything animated per frame lives here, outside React state) ----------
  useEffect(() => {
    const root = rootRef.current, q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
    const off = []; const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); off.push(() => t.removeEventListener(ev, fn, o)) };
    let alive = true, raf = 0;
    const rnd = (s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 })(11);
    const absTop = el => el.getBoundingClientRect().top + scrollY;
    // PERF: blur() re-paints the whole photo every frame – very heavy on phones, so touch devices skip it
    const noBlur = matchMedia('(pointer: coarse)').matches;

    const secA = q('#A'), secB = q('#B'), secC = q('#C'), trail = q('#D'), cardsA = q('#cardsA'), colsEl = q('#cols');
    const hero = q('#hero'), fcap = q('#fcap'), shint = q('#shint'), bigtxt = q('#bigtxt'), mouse = q('#mouse'), bar = q('#bar');

    // Bento templates: [col,row,colSpan,rowSpan]
    const TD = { cols: 6, rows: 4, t: [[0, 0, 2, 2], [2, 0, 2, 1], [4, 0, 1, 2], [5, 0, 1, 1], [2, 1, 1, 1], [3, 1, 1, 1], [5, 1, 1, 1], [0, 2, 3, 2], [3, 2, 2, 1], [3, 3, 2, 1], [5, 2, 1, 2]] };
    const TM = { cols: 4, rows: 5, t: [[0, 0, 2, 2], [2, 0, 2, 1], [2, 1, 1, 1], [3, 1, 1, 2], [0, 2, 1, 2], [1, 2, 2, 1], [1, 3, 2, 2], [3, 3, 1, 2], [0, 4, 1, 1]] };
    const V = { w: 0, h: 0 }, A = { cards: [], last: -1 }, B = { items: [], rot: 0, lastRot: NaN, lastPb: -1 };

    // A – scatter cards
    [...cardsA.children].forEach(el => A.cards.push({ el, sx: (rnd() - .5) * 2.4, sy: (rnd() - .5) * 2.4, rot: (rnd() - .5) * 160, sc: .45 + rnd() * 1.1, fr: (rnd() - .5) * 5, tx: 0, ty: 0 }));
    // B – wheel
    qa('#track > .wc').forEach((el, i) => B.items.push({ el, i }));

    // C – stepped panel collage
    const G3 = [];
    const ro = new ResizeObserver(es => es.forEach(e => { if (e.target._o) e.target._o.dirty = true }));
    function grpHover(o, k) { o.hov = k; o.moving = true; o.grp.classList.toggle('hv', k >= 0); o.panels.forEach((p, i) => p.classList.toggle('act', i === k)) }
    qa('.grp').forEach(grp => {
      const box = grp.querySelector('.gbox'), panels = [...box.children];
      const o = { grp, box, n: panels.length, hov: -1, dirty: true, W: 0, H: 0, xt: [], xb: [], y: [], panels }; box._o = o;
      panels.forEach((p, k) => {
        on(p, 'pointerenter', e => { if (e.pointerType === 'mouse') grpHover(o, k) });
        on(p, 'focus', () => grpHover(o, k));
        on(p, 'click', () => { if (o.hov === k) openRef.current(+p.dataset.i); else grpHover(o, k) });
        on(p, 'keydown', e => { if (e.key === 'Enter') openRef.current(+p.dataset.i) });
      });
      on(grp, 'pointerleave', e => { if (e.pointerType === 'mouse') grpHover(o, -1) });
      G3.push(o); ro.observe(box);
    });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: .12 });
    qa('.grp').forEach(t => io.observe(t));
    function grpTarget(o) {
      const { n, W, hov } = o, xt = [], xb = [], y = [];
      if (hov < 0) { for (let k = 0; k < n - 1; k++) { const t = (k + 1) / (n + .5) * W; xt.push(t); xb.push(Math.min(W * .97, t + .1 * W)); y.push(.5) } }
      else {
        const h = .5, r = (1 - h) / (n - 1); let acc = 0;
        for (let k = 0; k < n - 1; k++) { acc += (k === hov ? h : r) * W; const next = k === hov - 1 || k === hov; xt.push(acc); xb.push(next ? acc : Math.min(W * .97, acc + .07 * W)); y.push(.49) }
      }
      return { xt, xb, y };
    }
    function grpTick(o) {
      const first = !o.xt.length;
      if (o.dirty) { o.W = o.box.clientWidth; o.H = o.box.clientHeight; if (!o.W) return }
      const t = grpTarget(o); let move = first || o.dirty;
      if (first) { o.xt = t.xt; o.xb = t.xb; o.y = t.y }
      else if (o.moving || o.dirty) {
        let big = 0;
        ['xt', 'xb', 'y'].forEach(key => o[key] = o[key].map((v, i) => { const d = t[key][i] - v; big = Math.max(big, Math.abs(d) * (key === 'y' ? o.H : 1)); return Math.abs(d) < .05 ? t[key][i] : v + d * .14 }));
        move = true; if (big < .3) o.moving = false;
      }
      if (!move) return; o.dirty = false;
      const { n, W, H, xt, xb, y } = o, g = 6;
      for (let i = 0; i < n; i++) {
        const tL = i ? xt[i - 1] + g / 2 : 0, tR = i < n - 1 ? xt[i] - g / 2 : W, bL = i ? xb[i - 1] + g / 2 : 0, bR = i < n - 1 ? xb[i] - g / 2 : W,
          yL = i ? y[i - 1] * H - g / 2 : H, yR = i < n - 1 ? y[i] * H + g / 2 : H, L = Math.min(tL, bL), Rr = Math.max(tR, bR), p = o.panels[i];
        p.style.left = L + 'px'; p.style.width = (Rr - L) + 'px';
        p.style.clipPath = 'polygon(' + [[tL, 0], [tR, 0], [tR, yR], [bR, yR], [bR, H], [bL, H], [bL, yL], [tL, yL]].map(([a, b]) => (a - L).toFixed(1) + 'px ' + b.toFixed(1) + 'px').join(',') + ')';
        p.lastChild.style.left = (tL - L + 22) + 'px';
      }
    }

    // D – cursor trail
    const TR = { gi: 0, last: { x: -999, y: -999 }, t: 0 };
    function trailMove(cx, cy) {
      const r = trail.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
      if (Math.hypot(x - TR.last.x, y - TR.last.y) <= Math.max(60, r.width / 16)) return;
      const imgs = trail.getElementsByClassName('ti'); if (!imgs.length) return;
      const lead = imgs[TR.gi % imgs.length], old = TR.gi - 5 >= 0 ? imgs[(TR.gi - 5) % imgs.length] : null;
      lead.style.left = x + 'px'; lead.style.top = y + 'px'; lead.style.zIndex = TR.gi + 1; lead.dataset.status = 'active';
      if (old) old.dataset.status = 'inactive';
      TR.last = { x, y }; TR.gi++; trail.classList.add('go'); clearTimeout(TR.t); TR.t = setTimeout(trailClear, 1400);
    }
    function trailClear() { trail.querySelectorAll('.ti').forEach(e => e.dataset.status = 'inactive'); trail.classList.remove('go'); TR.last = { x: -999, y: -999 } }
    on(trail, 'pointerleave', trailClear);
    on(trail, 'touchend', () => { clearTimeout(TR.t); TR.t = setTimeout(trailClear, 600) });
    on(trail, 'pointermove', e => { if (e.pointerType === 'mouse') trailMove(e.clientX, e.clientY) });
    on(trail, 'touchmove', e => trailMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

    // W – "the whole story": a photo wakes up when fully in view
    const wio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('inbound', e.intersectionRatio >= .95)), { threshold: [0, .95] });
    qa('#wf > .item').forEach(d => wio.observe(d));

    // ---------- layout ----------
    const T = { a: 0, b: 0, c: 0, hA: 0, hB: 0 };
    function layout() {
      const pr = document.getElementById('primary'); if (pr) pr.style.height = innerHeight + 'px';
      V.w = innerWidth; V.h = innerHeight; const vw = V.w, vh = V.h, isDesk = vw > 900;
      qa('.sticky').forEach(s => s.style.height = vh + 'px');
      const G = isDesk ? TD : TM, cols = G.cols, rows = G.rows, gap = isDesk ? 14 : 8, maxH = vh * (isDesk ? .6 : .64), maxW = vw * (isDesk ? .9 : .94);
      let ux = (maxW - gap * (cols - 1)) / cols, uy = (maxH - gap * (rows - 1)) / rows;
      if (ux > uy * 1.4) ux = uy * 1.4; if (uy > ux * 1.4) uy = ux * 1.4;
      const gw = cols * ux + (cols - 1) * gap, gh = rows * uy + (rows - 1) * gap;
      A.cards.forEach((c, i) => {
        if (!G.t[i]) { c.el.style.display = 'none'; return } c.el.style.display = '';
        const [gc, gr, sw2, sh] = G.t[i], cw = sw2 * ux + (sw2 - 1) * gap, ch = sh * uy + (sh - 1) * gap;
        c.el.style.width = cw + 'px'; c.el.style.height = ch + 'px'; c.el.style.marginLeft = -cw / 2 + 'px'; c.el.style.marginTop = -ch / 2 + 'px';
        c.el.style.willChange = 'transform, opacity';          // PERF: own GPU layer -> scatter/grid animation is composited, not repainted
        c.tx = gc * (ux + gap) + cw / 2 - gw / 2; c.ty = gr * (uy + gap) + ch / 2 - gh / 2 + (isDesk ? 46 : 44); c.d = i / A.cards.length * .35;
      });
      T.hA = vh * 3.4; secA.style.height = T.hA + 'px';
      B.cw = Math.min(Math.max(150, vw * (isDesk ? .2 : .42)), 270); B.ch = B.cw * 1.5;
      const M = Math.max(B.items.length, 20); B.step = Math.PI * 2 / M; B.R = B.cw * 1.3 / B.step; B.cy = vh * .55;
      B.items.forEach(b => { b.el.style.width = B.cw + 'px'; b.el.style.height = B.ch + 'px'; b.el.style.willChange = 'transform, opacity' });
      T.hB = vh + (B.items.length - 1) * vh * .5; secB.style.height = T.hB + 'px';
      T.a = absTop(secA); T.b = absTop(secB); T.c = absTop(secC);
      A.last = -1; B.lastPb = -1;                              // force one redraw after a re-layout
    }
    on(window, 'resize', () => { if (innerWidth !== V.w || Math.abs(innerHeight - V.h) > 150) layout() });
    on(window, 'load', layout);
    layout();
    if (document.fonts) document.fonts.ready.then(() => { if (alive) layout() });

    // ---------- frame loop ----------
    let sy = scrollY, lastF = 0, lastBar = -1;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(48, lastF ? now - lastF : 16.7); lastF = now;
      sy += (scrollY - sy) * (1 - Math.exp(-dt / 55)); if (Math.abs(scrollY - sy) < .1) sy = scrollY;
      const vw = V.w, vh = V.h;
      const bv = clamp(sy / Math.max(1, document.documentElement.scrollHeight - vh));
      if (bv !== lastBar) { lastBar = bv; bar.style.transform = `scaleX(${bv})` }
      // A
      if (sy < T.a + T.hA + vh) {
        const pa = clamp((sy - T.a) / (T.hA - vh)), a = clamp(pa / .58);
        if (a !== A.last) {                                    // PERF: nothing changed -> no DOM work at all
          A.last = a;
          sset(hero, 'opacity', 1 - clamp(a * 2.4)); sset(hero, 'transform', `scale(${1 + a * .2})`); sset(shint, 'opacity', .7 * (1 - clamp(a * 6)));
          sset(fcap, 'opacity', clamp((a - .85) / .15));
          A.cards.forEach(c => {
            const l = clamp((a - c.d) / (1 - .35)), e = ease(l), x = lerp(c.sx * vw, c.tx, e), y = lerp(c.sy * vh, c.ty, e), r = lerp(c.rot, c.fr, e), s = lerp(c.sc, 1, e);
            const bl = noBlur ? 0 : Math.round((1 - e) * (c.sc > 1.1 ? 7 : 2.5) * 2) / 2;   // PERF: stepped blur = far fewer repaints
            sset(c.el, 'transform', `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`);
            sset(c.el, 'opacity', clamp(l * 3.5));
            sset(c.el, 'filter', bl > .3 ? `blur(${bl}px)` : 'none');
            sset(c.el, 'pointerEvents', e > .96 ? 'auto' : 'none'); sset(c.el, 'zIndex', e > .96 ? 1 : 0);
          });
        }
      }
      // B
      if (sy > T.b - vh && sy < T.b + T.hB) {
        const pb = clamp((sy - T.b) / (T.hB - vh)), n = B.items.length, tg = Math.round(pb * (n - 1));
        B.rot += (tg - B.rot) * (1 - Math.exp(-dt / 100)); if (Math.abs(tg - B.rot) < .002) B.rot = tg;
        if (pb !== B.lastPb || B.rot !== B.lastRot) {          // PERF: skip when neither scroll nor wheel rotation moved
          B.lastPb = pb; B.lastRot = B.rot;
          sset(bigtxt, 'transform', `translate3d(${-pb * vw * .45}px,-52%,0)`); sset(mouse, 'opacity', 1 - clamp((pb - .75) / .25));
          B.items.forEach(b => {
            const d = b.i - B.rot, ad = Math.abs(d), th = d * B.step, op = clamp(1 - ad / 3.4);
            if (op < .01) { sset(b.el, 'visibility', 'hidden'); sset(b.el, 'opacity', 0); return }   // PERF: invisible cards cost nothing
            sset(b.el, 'transform', `translate3d(${(vw / 2 + B.R * Math.sin(th) - B.cw / 2).toFixed(2)}px,${(B.cy + B.R - B.R * Math.cos(th) - B.ch / 2).toFixed(2)}px,0) rotate(${th.toFixed(4)}rad)`);
            sset(b.el, 'opacity', op); sset(b.el, 'visibility', 'visible');
            sset(b.el, 'filter', ad < .02 ? 'none' : noBlur ? `grayscale(${clamp(ad).toFixed(2)})` : `blur(${(Math.round(clamp(ad / 1.3) * 7 * 2) / 2)}px) grayscale(${clamp(ad).toFixed(2)})`);
            sset(b.el, 'zIndex', Math.round(100 - ad * 10)); b.el.classList.toggle('on', ad < .08);
          });
        }
      }
      G3.forEach(grpTick);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false; cancelAnimationFrame(raf); clearTimeout(TR.t); off.forEach(f => f());
      ro.disconnect(); io.disconnect(); wio.disconnect();
    };
  }, []);

  // slices of the 98 slots for each section
  const sc = photos.slice(SLOT.scatter[0], SLOT.scatter[0] + (desk ? 11 : 9));
  const tr = photos.slice(...SLOT.trail), wh = photos.slice(...SLOT.wheel), pn = photos.slice(...SLOT.panels), st = photos.slice(...SLOT.story);

  return (
    <div ref={rootRef}>
      <StarField />
      <div id="bar" />

      {/* fade-to-black curtain used when leaving for the message page */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'radial-gradient(circle at 50% 70%, #2a0716 0%, #000 65%)', opacity: leaving ? 1 : 0, pointerEvents: leaving ? 'auto' : 'none', transition: 'opacity ' + MESSAGE_FADE_OUT_SEC + 's ease' }} />

      {/* 2 · scatter -> grid */}
      <section id="A">
        <div className="sticky">
          <div className="hero" id="hero"><span className="eyebrow">a story in pictures</span>
            <h1>Our Memories</h1>
            <p>scroll slowly and watch them come together</p>
          </div>
          <div id="cardsA" data-group="">
            {sc.map((p, i) => <div className="gcard" key={p.n}><Tile p={p} cap={'No. ' + (i + 1)} onOpen={openLb} /></div>)}
          </div>
          <div className="finalcap" id="fcap">every moment, right here ♥</div>
          <div className="scroll" id="shint">scroll<i /></div>
        </div>
      </section>

      {/* 3 · cursor trail */}
      <section id="D">
        <div className="tH"><span className="eyebrow">a little play</span>
          <h2 className="chapH" style={{ margin: '6px 0 0', fontFamily: 'var(--script)', fontWeight: 400, fontSize: 'clamp(36px,7vw,70px)', lineHeight: 1.1, textShadow: '0 0 22px rgba(255,45,111,.7)' }}>Wander through us</h2>
          <p>move your mouse here</p>
        </div>
        {tr.map(p => (
          <img key={p.src} className="ti" data-status="inactive" src={opt(p.src, W.trail)} alt="" draggable={false} decoding="async"
            style={{ aspectRatio: String(clamp(p.ar, .7, 1.4)) }}
            onLoad={e => { const t = e.currentTarget; if (t.naturalWidth && t.naturalHeight) t.style.aspectRatio = String(clamp(t.naturalWidth / t.naturalHeight, .7, 1.4)) }}
            onError={e => imgFail(e.currentTarget, p)} />
        ))}
      </section>

      {/* 4 · wheel */}
      <section id="B">
        <div className="sticky">
          <div className="gbig" id="bigtxt">Moments</div>
          <div className="chap"><span className="eyebrow">chapter two</span>
            <h2>Keep going…</h2>
          </div>
          <div id="track">
            {wh.map((p, i) => (
              <div className="wc" key={p.n} data-i={p.n - 1} onClick={e => { if (e.currentTarget.classList.contains('on')) openLb(p.n - 1) }}>
                <Img p={p} w={W.wheel} />
                <Note p={p} />
                <span className="wcap">{CAPS[i % CAPS.length]}</span>
              </div>
            ))}
          </div>
          <svg className="mouse" id="mouse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3m0 4a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4z" />
            <path d="M12 7l0 4" />
            <path d="M8 26l4 4l4 -4"><animateTransform attributeName="transform" type="translate" values="0 0; 0 4; 0 0" dur="1s" repeatCount="indefinite" /></path>
          </svg>
        </div>
      </section>

      {/* 5 · stepped panels */}
      <section id="C">
        <div className="cH"><span className="eyebrow">chapter three</span>
          <h2>Little things, big love</h2>
          <p>hover a photo to open it</p>
        </div>
        <div id="cols">
          <div className="grp">
            <div className="gbox">
              {pn.map((p, k) => (
                <div className="pn" key={p.n} style={{ '--k': k }} data-i={p.n - 1} tabIndex={0}>
                  <Img p={p} w={W.panels} />
                  <span className="pc">{k + 1}.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6 · the whole story */}
      <section id="W">
        <div className="cH"><span className="eyebrow">chapter five</span>
          <h2>The whole story</h2>
          <p>scroll slowly — every photo wakes up when it comes fully into view</p>
        </div>
        <div className="waterfall" id="wf">
          {st.map(p => (
            <div className="item" key={p.n} data-i={p.n - 1} onClick={e => { if (e.currentTarget.classList.contains('inbound')) openLb(p.n - 1) }}>
              <Img p={p} w={W.story} loading="lazy" />
              <Note p={p} />
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div className="h">♥</div>
        <p>And the best is yet to come</p>
        <div className="vmwrap">
          <i className="vmstar s1" /><i className="vmstar s2" /><i className="vmstar s3" /><i className="vmstar s4" />
          <button className="vm" id="vm" ref={vmRef} aria-haspopup="dialog" onClick={goMessage}
            onPointerMove={e => {
              if (e.pointerType !== 'mouse') return;
              const t = e.currentTarget, r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
              t.style.setProperty('--rx', ((.5 - py) * 24) + 'deg'); t.style.setProperty('--ry', ((px - .5) * 30) + 'deg');
              t.style.setProperty('--gx', px * 100 + '%'); t.style.setProperty('--gy', py * 100 + '%');
            }}
            onPointerLeave={e => { const t = e.currentTarget; t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); t.style.setProperty('--gx', '50%'); t.style.setProperty('--gy', '0%') }}>
            <span className="vh">♥</span>View message
          </button>
        </div>
        <button id="top" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}>Back to top</button>
        <div style={{ marginTop: 18 }}>
          <label className="add">
            <svg className="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></svg>
            Add photos
            <input id="file" type="file" accept="image/*" multiple hidden onChange={e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) onAddFiles(fs) }} />
          </label>
        </div>
      </footer>

      <div id="msg" className={msgOpen ? 'open' : ''} role="dialog" aria-modal="true" aria-label="A message for you" onClick={e => { if (e.target === e.currentTarget) closeMsg() }}>
        <div className="mc">
          <button className="mx" id="mx" ref={mxRef} aria-label="Close" onClick={closeMsg}><svg className="i" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" /></svg></button>
          <div className="mh">♥</div>
          <h3 id="mto">{MSG.to}</h3>
          <div id="mb">{MSG.lines.map((l, i) => <p key={i} style={{ '--d': i }}>{l}</p>)}</div>
          <div className="sg" id="msign">{MSG.sign}</div>
        </div>
      </div>

      <div id="lb" className={(lbOpen ? 'open ' : '') + (lbVis ? 'vis' : '')}
        onClick={e => { if (e.target === e.currentTarget) closeLb() }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => { const d = e.changedTouches[0].clientX - touchX.current; if (Math.abs(d) > 50) showLb(curRef.current + (d < 0 ? 1 : -1)) }}>
        <img id="lbi" className={sw ? 'sw' : ''} alt="" decoding="async" src={photos[shown] ? opt(photos[shown].src, W.lb) : ''}
          onError={e => { const p = photos[shown]; if (p) imgFail(e.currentTarget, p) }} />
        <button className="x" id="lbx" onClick={closeLb}><svg className="i" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" /></svg></button>
        <button className="p" id="lbp" onClick={() => showLb(curRef.current - 1)}><svg className="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button className="n" id="lbn" onClick={() => showLb(curRef.current + 1)}><svg className="i" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
        <div className="c" id="lbc">{shown + 1} / {N}</div>
      </div>
    </div>
  );
}