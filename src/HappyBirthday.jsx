import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import "./HappyBirthday.css";
import { useAuth } from "./context/AuthContext";

// ============================================================
// EDIT THESE IF YOU WANT TO CUSTOMIZE THE ORIGINAL HTML
// ============================================================
export const DECORATION_AUDIO_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791710013/birthday-intro_tjbqcz.mp3"; // FIRST audio: starts when the decoration starts (lights, bunting, balloons), loops, and is muted when the cake is cut. Empty = no music here.
export const DECORATION_AUDIO_VOL = 0.7; // loudness of the first audio (0 = silent, 1 = full)
export const DECORATION_AUDIO_PLAYS = 2; // how many times the FIRST audio plays. 0 = repeat until the cake is cut. 1 = once, 2 = twice ...
export const AUDIO_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791708910/birthday_t9l13n.mp3"; // SECOND audio: starts when the cake is cut. Empty = built-in music-box melody
export const MUSIC_FADE_OUT_SEC = 1.2; // when the gift box is opened, the music fades out over this many seconds
export const AUDIO_PLAYS = 1;  // how many times the SECOND audio plays (1 = once, 2 = twice ... 0 = repeat forever)
export const LIGHT = 0.7;     // Lower = dimmer lights, higher = brighter
export const NAME = "";       // Example: "SARAH". Empty = "TO YOU"
export const RISE_SPEED = 16; // How fast the golden particles stream down while the sky rocket climbs (0 = off, bigger = faster "going up" feeling)
// ============================================================

export default function HappyBirthday({ start = true }) {
  const {user} = useAuth();
  const rootRef = useRef(null);
  // start=false  -> page is loaded and its background is visible (bars, vignette, golden particles),
  //                 but the birthday animation is held at 0.
  // start=true   -> the birthday animation runs (lights, bunting, cake ...).
  const startRef = useRef(start);
  startRef.current = start;

  // After the gift box is opened we go to the gallery.
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const AUDIO_URL_CONFIG = AUDIO_URL;
    const DECO_URL_CONFIG = DECORATION_AUDIO_URL;
    const DECO_VOL_CONFIG = DECORATION_AUDIO_VOL;
    const DECO_PLAYS_CONFIG = DECORATION_AUDIO_PLAYS;
    const AUDIO_PLAYS_CONFIG = AUDIO_PLAYS;
    const FADE_CONFIG = MUSIC_FADE_OUT_SEC;
    const LIGHT_CONFIG = LIGHT;
    const NAME_CONFIG = NAME;

    const script = () => {
      (function () {
        // Put the URL of your own audio file here (example: '/music/cut.mp3'). Empty = built-in music-box melody.
        var AUDIO_URL = AUDIO_URL_CONFIG;
        var DECORATION_AUDIO_URL = DECO_URL_CONFIG, DECORATION_AUDIO_VOL = DECO_VOL_CONFIG, DECORATION_AUDIO_PLAYS = DECO_PLAYS_CONFIG, AUDIO_PLAYS = AUDIO_PLAYS_CONFIG, MUSIC_FADE_OUT_SEC = FADE_CONFIG;
        var LIGHT = LIGHT_CONFIG; // lower = dimmer lights, higher = brighter
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, TS = reduce ? 2.5 : 1;
        var $ = function (id) { return document.getElementById(id); };
        var canvas = $('c'), knife = $('knife'), pin = $('pin'), hint = $('hint'), titleEl = $('title');
        var ADD = THREE.AdditiveBlending, destroyed = false;
        var c01 = function (k) { return Math.min(Math.max(k, 0), 1); };
        var out = function (k) { return 1 - Math.pow(1 - c01(k), 3); };
        var smooth = function (k) { k = c01(k); return k * k * (3 - 2 * k); };
        var back = function (k) { k = c01(k); return 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2); };

        var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        r.setClearColor(0x0a1128, 0); r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        var sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.1, 150);
        var amb = new THREE.AmbientLight(0x8899ff, 0.12); sc.add(amb);
        var keyL = new THREE.PointLight(0xffe2ec, 0, 30); keyL.position.set(0, 6, 7); sc.add(keyL);
        var blueL = new THREE.PointLight(0x4f8cff, 0, 30); blueL.position.set(-7, 3, 5); sc.add(blueL);
        var roseL = new THREE.PointLight(0xf4b6c2, 0, 30); roseL.position.set(7, 2, 5); sc.add(roseL);
        var candleL = new THREE.PointLight(0xffc977, 0, 9); candleL.position.set(0, 2.8, 0.8); sc.add(candleL);

        function glowTex() { var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'); var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.38)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
        var gTex = glowTex();
        function pts(arr, size, color, opacity, vc) { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); var m = { size: size, transparent: true, opacity: opacity, depthWrite: false }; if (vc) { m.vertexColors = true; g.setAttribute('color', new THREE.BufferAttribute(vc, 3)); } else { m.color = color; m.blending = ADD; } var p = new THREE.Points(g, new THREE.PointsMaterial(m)); p.frustumCulled = false; return p; }

        // background: stars + moving grid floor
        var sp = new Float32Array(4800); for (var i = 0; i < 4800; i += 3) { sp[i] = (Math.random() - .5) * 60; sp[i + 1] = Math.random() * 30 - 2; sp[i + 2] = -8 - Math.random() * 40; }
        var stars = pts(sp, 0.08, 0xaecbff, 0.85); stars.visible = false; sc.add(stars);
        var grid = new THREE.GridHelper(80, 80, 0x2a4390, 0x1a2a66); grid.position.y = -0.27; grid.material.transparent = true; grid.visible = false; sc.add(grid);

        // electric string lights: bulbs switch on one by one
        function curve(x, y, s, z, u) { return new THREE.Vector3((u * 2 - 1) * x, y - s * 4 * u * (1 - u), z); }
        var wires = [], stageLive = null; // stage pieces stay hidden until the birthday animation starts
        function wire(S) { var p = []; for (var i = 0; i <= 40; i++)p.push(curve(S.x, S.y, S.s, S.z, i / 40)); var ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0x24356e })); ln.visible = false; wires.push(ln); sc.add(ln); }
        var strings = [{ z: -3, x: 10, y: 7.6, s: 1.2, n: 16, dir: 1 }, { z: -6, x: 13, y: 8.4, s: 1.6, n: 14, dir: -1 }, { z: -9, x: 16, y: 9.4, s: 1.4, n: 14, dir: 1 }];
        var bcols = [0x4f8cff, 0xf4b6c2, 0xfff1c9], bulbs = [];
        strings.forEach(function (S) {
          wire(S); for (var q = 0; q < S.n; q++) {
            var i = S.dir > 0 ? q : S.n - 1 - q, col = bcols[bulbs.length % 3];
            var mat = new THREE.MeshStandardMaterial({ color: 0x222a44, emissive: col, emissiveIntensity: 0 });
            var m = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), mat); m.position.copy(curve(S.x, S.y, S.s, S.z, (i + 0.5) / S.n)); m.position.y -= 0.12; sc.add(m);
            var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color: col, transparent: true, opacity: 0, blending: ADD, depthWrite: false })); spr.position.copy(m.position); spr.scale.setScalar(2.0); sc.add(spr);
            bulbs.push({ m: m, mat: mat, spr: spr, ord: bulbs.length });
          }
        });

        // decoration 1: bunting flags
        var DF = { z: -4.5, x: 11, y: 6.6, s: 1.1, n: 20 }; wire(DF);
        var fsh = new THREE.Shape(); fsh.moveTo(-0.34, 0); fsh.lineTo(0.34, 0); fsh.lineTo(0, -0.9); fsh.lineTo(-0.34, 0);
        var fg = new THREE.ShapeGeometry(fsh), flags = [];
        for (var i = 0; i < DF.n; i++) { var fc = i % 2 ? 0xf4b6c2 : 0x4f8cff; var f = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: fc, emissive: fc, emissiveIntensity: 0.25, roughness: 0.6, side: THREE.DoubleSide })); f.position.copy(curve(DF.x, DF.y, DF.s, DF.z, (i + 0.5) / DF.n)); f.scale.y = 0.001; sc.add(f); flags.push(f); }

        // decoration 2: balloons rise from below
        var bx = [], by = [3.6, 4.6, 3.4, 3.5, 4.8, 3.8, 3.3, 3.4, 5.6, 5.8], bl = [0x4f8cff, 0xf4b6c2, 0x9bbcff, 0xffffff, 0xc9b8ff], balloons = [];
        bx.forEach(function (x, i) {
          var g = new THREE.Group(), c = bl[i % 5];
          var b = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 24), new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.1, emissive: c, emissiveIntensity: 0.12 })); b.scale.y = 1.2; g.add(b);
          var kn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 10), b.material); kn.position.y = -0.78; kn.rotation.x = Math.PI; g.add(kn);
          g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.86, 0), new THREE.Vector3(0, -3.2, 0)]), new THREE.LineBasicMaterial({ color: 0x8fa2d9 })));
          g.userData = { y: by[i], ph: i * 0.9 }; g.position.set(x, -12, -1.2 - (i % 3) * 0.8); sc.add(g); balloons.push(g);
        });

        // decoration 3: falling confetti
        var CN = 220, cp = new Float32Array(CN * 3), cc = new Float32Array(CN * 3), cs = [], pal = [0x4f8cff, 0xf4b6c2, 0xffffff, 0xffe7a8, 0x9bbcff], tmp = new THREE.Color();
        for (var i = 0; i < CN; i++) { cp[i * 3] = (Math.random() - .5) * 20; cp[i * 3 + 1] = Math.random() * 9; cp[i * 3 + 2] = -8 + Math.random() * 12; cs.push(0.6 + Math.random() * 0.8); tmp.setHex(pal[i % 5]); cc[i * 3] = tmp.r; cc[i * 3 + 1] = tmp.g; cc[i * 3 + 2] = tmp.b; }
        var confetti = pts(cp, 0.12, 0, 0, cc); sc.add(confetti);

        // burst particles (cake pop, cut, vanish)
        var BN = 240, bp = new Float32Array(BN * 3), bc = new Float32Array(BN * 3), bv = [], blife = 0;
        var bursts = pts(bp, 0.14, 0, 0, bc); bursts.visible = false; sc.add(bursts);
        function burstAt(x, y, z, p) {
          for (var i = 0; i < BN; i++) { bp[i * 3] = x; bp[i * 3 + 1] = y; bp[i * 3 + 2] = z; var a = Math.random() * 6.283, u = Math.random() * 2 - 1, rr = Math.sqrt(1 - u * u), s = p * (1 + Math.random() * 2); bv[i * 3] = rr * Math.cos(a) * s; bv[i * 3 + 1] = Math.abs(u) * s + 1; bv[i * 3 + 2] = rr * Math.sin(a) * s; tmp.setHex(pal[i % 5]); bc[i * 3] = tmp.r; bc[i * 3 + 1] = tmp.g; bc[i * 3 + 2] = tmp.b; }
          bursts.geometry.attributes.color.needsUpdate = true; blife = 1.8; bursts.visible = true;
        }

        // dais
        var dais = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.5, 0.25, 64), new THREE.MeshStandardMaterial({ color: 0x15276a, metalness: 0.4, roughness: 0.35 })); dais.position.y = -0.125; sc.add(dais);
        var rim = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.04, 12, 100), new THREE.MeshBasicMaterial({ color: 0x4f8cff })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.01; sc.add(rim);
        var plate = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.1, 64), new THREE.MeshStandardMaterial({ color: 0xeaf0ff, roughness: 0.3 })); plate.position.y = 0.05; sc.add(plate);
        var ringM = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 12, 120), new THREE.MeshBasicMaterial({ color: 0xf4b6c2, transparent: true, opacity: 0, blending: ADD, depthWrite: false })); ringM.rotation.x = Math.PI / 2; ringM.position.y = 0.25; sc.add(ringM);

        // the cake: every tier is built from two solid pie pieces so one slice can be cut out
        function pie(rad, a0, a1, h) { var s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, rad, a0, a1, false); s.lineTo(0, 0); var g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 48 }); g.rotateX(-Math.PI / 2); return g; }
        function ad(p) { var d = ((p - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; }
        var cake = new THREE.Group(); cake.position.y = 0.18; cake.visible = false; sc.add(cake);
        var bodyG = new THREE.Group(), sliceG = new THREE.Group(); cake.add(bodyG, sliceG);
        var AL = 0.72, S0 = 1.5 * Math.PI - AL / 2, S1 = 1.5 * Math.PI + AL / 2;
        var tiers = [{ r: 2.5, h: 1.25, c: 0xf4b6c2 }];
        var cream = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }), pearl = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.12 });
        function part(g, geo, mat, y) { var m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); }
        var cy = 0;
        tiers.forEach(function (t) {
          var mat = new THREE.MeshStandardMaterial({ color: t.c, roughness: 0.5 });
          part(bodyG, pie(t.r, S1, S0 + 2 * Math.PI, t.h), mat, cy); part(sliceG, pie(t.r, S0, S1, t.h), mat, cy);
          part(bodyG, pie(t.r + 0.06, S1, S0 + 2 * Math.PI, 0.13), cream, cy + t.h); part(sliceG, pie(t.r + 0.06, S0, S1, 0.13), cream, cy + t.h);
          for (var k = 0; k < 26; k++) { var a = k / 26 * 2 * Math.PI; if (ad(a) < AL / 2 + 0.06) continue; var pm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), pearl); pm.position.set(Math.cos(a) * (t.r + 0.05), cy + 0.1, Math.sin(a) * (t.r + 0.05)); bodyG.add(pm); }
          cy += t.h + 0.13;
        });
        var topY = cy;
        var berryM = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.3, emissive: 0xff4d6d, emissiveIntensity: 0.2 });
        [0.2, 0.9, 2.3, 3.0, 3.8, 4.7].forEach(function (a) { var b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), berryM); b.position.set(Math.cos(a) * 0.9, topY + 0.1, Math.sin(a) * 0.9); bodyG.add(b); });
        var flames = [];
        [0, 0.8, 2.3, 3.1, 4.4].forEach(function (a, i) {
          var x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55;
          var c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 12), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf4b6c2 : 0x9bbcff, roughness: 0.4 })); c.position.set(x, topY + 0.275, z); bodyG.add(c);
          var fl = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 10), new THREE.MeshBasicMaterial({ color: 0xffd27a })); fl.position.set(x, topY + 0.67, z); bodyG.add(fl);
          var gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color: 0xffb347, transparent: true, opacity: 0.8, blending: ADD, depthWrite: false })); gs.scale.setScalar(0.7); gs.position.set(x, topY + 0.7, z); bodyG.add(gs);
          flames.push({ fl: fl, gs: gs, ph: i * 1.3 });
        });
        var hs = new THREE.Shape(); hs.moveTo(0, 0.35); hs.bezierCurveTo(0, 0.6, -0.5, 0.7, -0.5, 0.3); hs.bezierCurveTo(-0.5, -0.05, -0.1, -0.25, 0, -0.5); hs.bezierCurveTo(0.1, -0.25, 0.5, -0.05, 0.5, 0.3); hs.bezierCurveTo(0.5, 0.7, 0, 0.6, 0, 0.35);
        var topHeart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }), new THREE.MeshStandardMaterial({ color: 0xf4b6c2, emissive: 0xf4b6c2, emissiveIntensity: 0.45, metalness: 0.3, roughness: 0.4 }));
        topHeart.scale.setScalar(0.5); bodyG.add(topHeart);

        // the gift box: appears after the last balloon pops; tap it to open, then go to the gallery
        var giftStage = 'idle', G = 0, O = 0, giftNavTimer = 0;
        var giftG = new THREE.Group(); giftG.visible = false; giftG.scale.setScalar(0.001); sc.add(giftG);
        var GW = 2.4, GH = 1.8, LH = 0.5;
        var boxMat = new THREE.MeshStandardMaterial({ color: 0xf4b6c2, roughness: 0.35, metalness: 0.15, emissive: 0xf4b6c2, emissiveIntensity: 0.12 });
        var lidMat = new THREE.MeshStandardMaterial({ color: 0x4f8cff, roughness: 0.3, metalness: 0.2, emissive: 0x4f8cff, emissiveIntensity: 0.18, transparent: true });
        var ribMat = new THREE.MeshStandardMaterial({ color: 0xffe7a8, roughness: 0.25, metalness: 0.6, emissive: 0xffd36b, emissiveIntensity: 0.35 });
        var lidRibMat = ribMat.clone(); lidRibMat.transparent = true; // lid + bow fade out while flying away
        var fadeEl = $('fade'); // full-screen overlay used for the smooth hand-off to the gallery
        var gBody = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, GW), boxMat); gBody.position.y = GH / 2; giftG.add(gBody);
        var rb1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, GH + 0.01, GW + 0.02), ribMat); rb1.position.y = GH / 2; giftG.add(rb1);
        var rb2 = new THREE.Mesh(new THREE.BoxGeometry(GW + 0.02, GH + 0.01, 0.46), ribMat); rb2.position.y = GH / 2; giftG.add(rb2);
        // glowing inside, revealed when the lid lifts
        var gInner = new THREE.Mesh(new THREE.PlaneGeometry(GW - 0.1, GW - 0.1), new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0, blending: ADD, depthWrite: false })); gInner.rotation.x = -Math.PI / 2; gInner.position.y = GH + 0.015; giftG.add(gInner);
        var gGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color: 0xffe7a8, transparent: true, opacity: 0, blending: ADD, depthWrite: false })); gGlow.position.y = GH + 0.3; gGlow.scale.setScalar(2); gGlow.raycast = function () { }; giftG.add(gGlow);
        var gLight = new THREE.PointLight(0xffe2a0, 0, 14); gLight.position.set(0, GH + 1, 0.5); giftG.add(gLight);
        // lid (with ribbons and a bow) is its own group so it can fly off
        var lidG = new THREE.Group(); lidG.position.y = GH; giftG.add(lidG);
        var lid = new THREE.Mesh(new THREE.BoxGeometry(GW + 0.3, LH, GW + 0.3), lidMat); lid.position.y = LH / 2; lidG.add(lid);
        var lr1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, LH + 0.01, GW + 0.32), lidRibMat); lr1.position.y = LH / 2; lidG.add(lr1);
        var lr2 = new THREE.Mesh(new THREE.BoxGeometry(GW + 0.32, LH + 0.01, 0.46), lidRibMat); lr2.position.y = LH / 2; lidG.add(lr2);
        var bow = new THREE.Group(); bow.position.y = LH + 0.05; lidG.add(bow);
        [-1, 1].forEach(function (sd) {
          var lp = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 14, 40), lidRibMat); lp.scale.set(1, 1.25, 0.55); lp.position.set(sd * 0.42, 0.28, 0); lp.rotation.z = sd * -0.55; bow.add(lp);
          var tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.07), lidRibMat); tl.position.set(sd * 0.3, -0.02, 0.1); tl.rotation.z = sd * 0.5; bow.add(tl);
        });
        var knot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 18), lidRibMat); knot.position.y = 0.16; bow.add(knot);
        function openGift() {
          if (giftStage !== 'ready') return; giftStage = 'opening'; O = 0; hint.classList.add('hidden'); canvas.style.cursor = ''; songFaded = true; fadeAudio(MUSIC_FADE_OUT_SEC); // music fades out as the gift opens
          burstAt(0, GH + 0.8, 0.6, 2.6); bgOn = true;
          try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.resume) ac.resume(); var o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(500, ac.currentTime); o.frequency.exponentialRampToValueAtTime(1500, ac.currentTime + 0.5); g.gain.setValueAtTime(0.18, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.85); } catch (e) { }
        }
        function giftReset() { giftStage = 'idle'; G = 0; O = 0; giftG.visible = false; giftG.scale.setScalar(0.001); lidG.position.set(0, GH, 0); lidG.rotation.set(0, 0, 0); lidG.visible = true; lidMat.opacity = 1; lidRibMat.opacity = 1; fadeEl.style.opacity = 0; gInner.material.opacity = 0; gGlow.material.opacity = 0; gLight.intensity = 0; }
        function giftTick(raw, t) {
          if (giftStage === 'idle') return;
          G += raw; giftG.visible = true;
          var gk = out(G / 1.2), ready = giftStage === 'ready';
          giftG.scale.setScalar(Math.max(back(G / 1.2), 0.001) * 1.15);
          giftG.position.y = 0.02 + (1 - gk) * 4 + (ready ? Math.abs(Math.sin(t * 2.4)) * 0.14 : 0);
          giftG.rotation.y = Math.sin(t * 0.7) * 0.28 + (1 - gk) * 3;
          giftG.rotation.z = ready ? Math.sin(t * 7) * 0.025 * (Math.sin(t * 1.3) > 0.5 ? 1 : 0.2) : 0;
          bow.rotation.y = Math.sin(t * 1.5) * 0.15; bow.scale.setScalar(1 + (ready ? 0.04 * Math.sin(t * 4) : 0));
          gGlow.material.opacity = ready ? 0.18 + 0.1 * Math.sin(t * 3) : gGlow.material.opacity;
          gGlow.scale.setScalar(ready ? 3.6 : gGlow.scale.x);
          if (giftStage === 'ready' && G > 1.2) { /* waiting for tap */ }
          if (giftStage === 'opening') {
            O += raw; var k = out(O / 0.8), lf = 1 - c01((O - 0.25) / 0.5);
            // lid spins up and away to the side, fading out (never hangs among the lights)
            lidG.position.y = GH + k * 2.2; lidG.position.x = k * 1.8; lidG.rotation.z = -k * 1.3; lidG.rotation.x = k * 0.4;
            lidMat.opacity = lf; lidRibMat.opacity = lf; lidG.visible = lf > 0.01;
            // clean light burst: peaks fast, then dissolves
            var bp2 = c01(O / 0.25) * (1 - 0.35 * smooth((O - 0.7) / 0.6));
            gInner.material.opacity = bp2; gGlow.material.opacity = bp2 * 0.9; gGlow.scale.setScalar(3.6 + out(O / 1.2) * 9);
            gLight.intensity = bp2 * 6;
            // soft gold-white flash that settles into the gallery's dark plum, then navigate
            var fo = smooth((O - 0.35) / 0.6), cm = smooth((O - 0.95) / 0.6);
            fadeEl.style.opacity = fo;
            fadeEl.style.background = 'rgb(' + Math.round(255 + (28 - 255) * cm) + ',' + Math.round(243 + (7 - 243) * cm) + ',' + Math.round(214 + (32 - 214) * cm) + ')';
            if (O > 1.7) { giftStage = 'opened'; try { navRef.current('/home/gallery'); } catch (e) { window.location.assign('/home/gallery'); } }
          } else { lidG.position.y = GH + (ready ? Math.abs(Math.sin(t * 2.4 + 0.6)) * 0.05 : 0); }
        }


        // background from your file: slowly turning field of golden particles
        var BG = new THREE.Group(); BG.position.set(0, 4, -8); sc.add(BG);
        var BGN = 1800, bgp = new Float32Array(BGN * 3); for (var i = 0; i < BGN; i++) { bgp[i * 3] = (Math.random() - 0.5) * 60; bgp[i * 3 + 1] = (Math.random() - 0.5) * 50; bgp[i * 3 + 2] = (Math.random() - 0.5) * 45; }
        var bgG = new THREE.BufferGeometry(); bgG.setAttribute('position', new THREE.BufferAttribute(bgp, 3));
        var bgM = new THREE.PointsMaterial({ color: 0xffd180, size: 0.15, transparent: true, opacity: 0.9 }), bgPts = new THREE.Points(bgG, bgM); bgPts.frustumCulled = false; BG.add(bgPts);
        var bgOn = false; // sparkles stay off until the cake is cut
        function bgTick(raw, t) {
          var sp = stage === 'cut' ? 3 : 1;
          // while the sky rocket climbs, the golden particles stream DOWN past the camera (feels like flying up)
          var rise = parseFloat(root.style.getPropertyValue('--rise')) || 0;
          if (rise > 0.001) {
            var dy = raw * RISE_SPEED * rise;
            for (var i = 0; i < BGN; i++) { var yi = i * 3 + 1; bgp[yi] -= dy; if (bgp[yi] < -25) bgp[yi] += 50; }
            bgG.attributes.position.needsUpdate = true;
          } BG.rotation.y += raw * 0.024 * sp; BG.rotation.x += raw * 0.006 * sp; blowTick(raw, t); }

        // candle blowing: button -> gust of air -> flames bend and go out -> smoke -> cutting starts
        var blowBtn = $('blowBtn'), bt = 0, WN = 110, wp = new Float32Array(WN * 3), wo = [], wind = pts(wp, 0.14, 0xdfeaff, 0, null), SM = [], wv = new THREE.Vector3();
        sc.add(wind); for (var i = 0; i < WN; i++)wo.push({ x: (Math.random() - 0.5) * 3.2, y: (Math.random() - 0.5) * 1.4, z: -6 + Math.random() * 13, v: 8 + Math.random() * 5, ph: Math.random() * 6.28 });
        flames.forEach(function (f) { f.out = 0; f.acc = 0; f.smokeT = 0; f.sm = false; });
        flames.map(function (f, i) { return i; }).sort(function (a, b) { return flames[b].fl.position.z - flames[a].fl.position.z; }).forEach(function (i, r) { flames[i].rank = r; });
        for (var i = 0; i < 90; i++) { var sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color: 0xb8bfd0, transparent: true, opacity: 0, depthWrite: false })); sm.visible = false; sm.userData = { alive: false }; sc.add(sm); SM.push(sm); }
        function puff(f, n) { for (var k = 0; k < n; k++) { var q = null; for (var i = 0; i < SM.length; i++)if (!SM[i].userData.alive) { q = SM[i]; break; } if (!q) return; f.fl.getWorldPosition(wv); q.position.set(wv.x + (Math.random() - 0.5) * 0.05, wv.y + 0.05, wv.z + (Math.random() - 0.5) * 0.05); q.userData = { alive: true, age: 0, life: 2.4 + Math.random() * 1.2, vx: 0.3 + Math.random() * 0.3, vy: 0.7 + Math.random() * 0.5, ph: Math.random() * 6.28 }; q.visible = true; } }
        function whoosh() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.resume) ac.resume(); var n = ac.sampleRate * 1.6 | 0, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++)d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * i / n), 1.5) * 0.6; var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.8; g.gain.value = 0.5; s.buffer = b; s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); } catch (e) { } }
        blowBtn.onclick = function () { if (stage !== 'blow') return; stage = 'blowing'; bt = 0; blowBtn.classList.add('hidden'); whoosh(); };
        function blowReset() { bt = 0; blowBtn.classList.add('hidden'); flames.forEach(function (f) { f.out = 0; f.acc = 0; f.smokeT = 0; f.sm = false; f.fl.visible = true; f.gs.visible = true; f.fl.rotation.x = 0; }); SM.forEach(function (q) { q.userData.alive = false; q.visible = false; }); wind.material.opacity = 0; }
        function blowTick(raw, t) {
          if (stage === 'blowing') { bt += raw; if (bt > 3.4) { stage = 'ready'; knifeOn = true; knife.classList.remove('hidden'); hint.textContent = 'TAP THE CAKE TO CUT IT'; hint.classList.remove('hidden'); canvas.style.cursor = 'none'; } }
          var blowing = stage === 'blowing' && bt < 2.4, wk = blowing && bt > 0.3 ? c01((bt - 0.3) / 0.3) : 0, lit = 0;
          flames.forEach(function (f) {
            if (stage === 'blowing') f.out = Math.max(f.out, c01((bt - (0.9 + f.rank * 0.2)) / 0.2)); lit += 1 - f.out;
            f.fl.rotation.x = -0.9 * wk * (1 - f.out) * (0.85 + 0.15 * Math.sin(t * 30 + f.ph)); f.fl.scale.x = Math.max(1 - f.out, 0.001); f.fl.scale.y *= Math.max(1 - f.out, 0.001) * (1 - 0.3 * wk);
            f.fl.visible = f.out < 0.99; f.gs.visible = f.out < 0.99; f.gs.material.opacity *= (1 - f.out);
            if (f.out >= 0.5 && !f.sm) { f.sm = true; f.smokeT = 3.4; puff(f, 7); }
            if (f.smokeT > 0) { f.smokeT -= raw; f.acc += raw * 16; while (f.acc >= 1) { puff(f, 1); f.acc--; } }
          });
          candleL.intensity *= lit / flames.length;
          SM.forEach(function (q) {
            var d = q.userData; if (!d.alive) return; d.age += raw; if (d.age > d.life) { d.alive = false; q.visible = false; return; } var u = d.age / d.life;
            q.position.x += Math.sin(d.age * 2.5 + d.ph) * 0.3 * raw; q.position.y += d.vy * raw * (1 - 0.4 * u); q.position.z += (-d.vx + Math.cos(d.age * 2 + d.ph) * 0.15) * raw;
            q.scale.setScalar(0.18 + 0.8 * u); q.material.opacity = 0.4 * (1 - u) * Math.min(1, d.age / 0.2);
          });
          var cyw = cake.position.y + topY + 0.7; wind.material.opacity += ((blowing ? 0.5 : 0) - wind.material.opacity) * Math.min(1, raw * 6);
          for (var i = 0; i < WN; i++) { var o = wo[i]; o.z -= o.v * raw; if (o.z < -6) { o.z = 7 + Math.random() * 2; } wp[i * 3] = o.x + Math.sin(t * 7 + o.ph) * 0.12; wp[i * 3 + 1] = cyw + o.y + Math.sin(t * 9 + o.ph) * 0.12; wp[i * 3 + 2] = o.z; }
          wind.geometry.attributes.position.needsUpdate = true;
        }

        // pop-the-balloons game: one bouquet arrives when the cake is cut; each pop scatters little hearts and sparkles
        var pops = [], pm = [], fxs = [], bouq = null, pt = 0, popMode = false, pinOn = false, pinT = -1, popLeft = 0, hg = new THREE.ShapeGeometry(hs);
        function setHint() { hint.textContent = popLeft > 0 ? 'NOW POP THE BALLOONS WITH THE PIN \u00b7 ' + popLeft + ' LEFT' : 'WELL DONE!'; }
        function killFx(f) { sc.remove(f.p); f.p.geometry.dispose(); f.p.material.dispose(); f.h.forEach(function (o) { sc.remove(o.m); o.m.material.dispose(); }); }
        function clearBalloons() { pops.forEach(function (g) { sc.remove(g); }); pops = []; pm = []; fxs.forEach(killFx); fxs = []; }
        function spawnBalloons() {
          clearBalloons(); pt = 0; cam.updateMatrixWorld();
          var cols = [0xff4d6d, 0xffc93c, 0x4fd18b, 0x4f8cff, 0xb06bff, 0xff8a3d, 0xff9ec7, 0x3cd7e8, 0xa8e65a, 0xff5fd2, 0x5fa8ff, 0xffd36b], v = new THREE.Vector3(), dir = new THREE.Vector3(), placed = [];
          // screen area covered by the cake (balloons must stay out of it; on wide screens also out of the column above it)
          var bx0 = 9, bx1 = -9, by0 = 9, by1 = -9;[-2.7, 2.7].forEach(function (x) { [0, 3].forEach(function (y) { [-2.7, 2.7].forEach(function (z) { v.set(x, y, z).project(cam); bx0 = Math.min(bx0, v.x); bx1 = Math.max(bx1, v.x); by0 = Math.min(by0, v.y); by1 = Math.max(by1, v.y); }); }); });
          if (cam.aspect >= 1) by1 = 1.2; bx0 -= 0.06; bx1 += 0.06; by0 -= 0.06;
          cols.forEach(function (c, i) {
            for (var tr = 0; tr < 80; tr++) {
              var z = 1 + Math.random() * 2.2, hh = (cam.position.z - z) * 0.52, k = hh * Math.min(0.18, 0.3 * cam.aspect), rw = 0.62 * k / (hh * cam.aspect), rh = 0.75 * k / hh,
                nx = -0.85 + 1.7 * Math.random(), ny = -0.45 + 1.17 * Math.random();
              if (nx + rw > bx0 && nx - rw < bx1 && ny + rh > by0 && ny - rh < by1) continue;
              var bad = placed.some(function (o) { var dx = (nx - o.x) / (rw + o.w), dy = (ny - o.y) / (rh + o.h); return dx * dx + dy * dy < 0.8; }); if (bad) continue;
              placed.push({ x: nx, y: ny, w: rw, h: rh });
              v.set(nx, ny, 0.5).unproject(cam); dir.copy(v).sub(cam.position).normalize(); var tt = (z - cam.position.z) / dir.z, px = cam.position.x + dir.x * tt, py = cam.position.y + dir.y * tt;
              var g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.1, emissive: c, emissiveIntensity: 0.2 });
              var b = new THREE.Mesh(new THREE.SphereGeometry(0.62 * k, 24, 24), mat); b.scale.y = 1.2; b.userData.g = g; g.add(b);
              var kn = new THREE.Mesh(new THREE.ConeGeometry(0.1 * k, 0.18 * k, 10), mat); kn.position.y = -0.78 * k; kn.rotation.x = Math.PI; g.add(kn);
              g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.86 * k, 0), new THREE.Vector3(0, -3.2 * k, 0)]), new THREE.LineBasicMaterial({ color: 0xb8c6f0 })));
              g.userData = { x: px, ty: py, sy: py - 14, z: z, d: i * 0.16 + Math.random() * 0.3, dur: 2.2 + Math.random() * 1.2, ph: i * 1.1, c: c, alive: true }; g.position.set(px, py - 14, z); sc.add(g); pops.push(g); pm.push(b); break;
            }
          });
          popLeft = pops.length;
        }
        function popSnd() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.resume) ac.resume(); var n = ac.sampleRate * 0.12 | 0, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++)d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); var s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = 0.5; s.buffer = b; s.connect(g); g.connect(ac.destination); s.start(); } catch (e) { } }
        function popB(g) {
          if (!g.userData.alive) return; g.userData.alive = false; var w = new THREE.Vector3(); g.getWorldPosition(w); sc.remove(g); pm = pm.filter(function (m) { return m.userData.g !== g; });
          var c = g.userData.c, n = 34, a = new Float32Array(n * 3), v = new Float32Array(n * 3);
          for (var i = 0; i < n; i++) { a[i * 3] = w.x; a[i * 3 + 1] = w.y; a[i * 3 + 2] = w.z; var an = Math.random() * 6.283, u = Math.random() * 2 - 1, rr = Math.sqrt(1 - u * u), sp = 1.5 + Math.random() * 3.5; v[i * 3] = rr * Math.cos(an) * sp; v[i * 3 + 1] = u * sp; v[i * 3 + 2] = rr * Math.sin(an) * sp; }
          var sk = [0xff4d6d, 0xffc93c, 0x4fd18b, 0x4f8cff, 0xb06bff, 0xff8a3d, 0x3cd7e8, 0xff5fd2], vc = new Float32Array(n * 3); for (var q2 = 0; q2 < n; q2++) { tmp.setHex(sk[q2 % 8]); vc[q2 * 3] = tmp.r; vc[q2 * 3 + 1] = tmp.g; vc[q2 * 3 + 2] = tmp.b; } var p = pts(a, 0.12, 0, 1, vc); sc.add(p);
          var hh = []; for (var j = 0; j < 8; j++) { var m = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false })), s2 = 0.25 + Math.random() * 0.2, an2 = Math.random() * 6.283, sp2 = 1.6 + Math.random() * 2.2; m.scale.setScalar(s2); m.position.copy(w); sc.add(m); hh.push({ m: m, v: new THREE.Vector3(Math.cos(an2) * sp2, Math.random() * 2.5 + 0.8, (Math.random() - 0.3) * sp2), r: (Math.random() - 0.5) * 5 }); }
          fxs.push({ p: p, a: a, v: v, n: n, h: hh, life: 1.4 }); popSnd();
          popLeft--; setHint(); if (popLeft === 0) setTimeout(function () { if (stage === 'cut') vanish(); }, 900);
        }
        function pinHit(e) { pinT = 0; ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); var h = ray.intersectObjects(pm, false); if (h.length) popB(h[0].object.userData.g); }
        function popTick(raw, t) {
          pt += raw;
          pops.forEach(function (g) { var d = g.userData; if (!d.alive) return; var p = out((pt - d.d) / d.dur); g.position.set(d.x + Math.sin(t * 0.8 + d.ph) * 0.2 * p, d.sy + (d.ty - d.sy) * p + Math.sin(t * 1.1 + d.ph) * 0.12 * p, d.z); g.rotation.z = Math.sin(t * 1.3 + d.ph) * 0.07; });
          for (var q = fxs.length - 1; q >= 0; q--) {
            var f = fxs[q]; f.life -= raw; for (var i = 0; i < f.n; i++) { f.a[i * 3] += f.v[i * 3] * raw; f.a[i * 3 + 1] += f.v[i * 3 + 1] * raw; f.a[i * 3 + 2] += f.v[i * 3 + 2] * raw; f.v[i * 3 + 1] -= 1.5 * raw; }
            f.p.geometry.attributes.position.needsUpdate = true; f.p.material.opacity = Math.max(f.life / 1.4, 0) * (0.65 + 0.35 * Math.abs(Math.sin(t * 30)));
            f.h.forEach(function (o) { o.m.position.addScaledVector(o.v, raw); o.v.y -= 1.8 * raw; o.v.multiplyScalar(1 - 0.8 * raw); o.m.rotation.z += o.r * raw; o.m.material.opacity = Math.max(Math.min(1, f.life / 0.7), 0); });
            if (f.life <= 0) { killFx(f); fxs.splice(q, 1); }
          }
          if (pinOn) { var rot = 20; if (pinT >= 0) { pinT += raw; var z = Math.min(pinT / 0.25, 1); rot = 20 - 28 * Math.sin(z * Math.PI); if (pinT > 0.25) pinT = -1; } pin.style.transform = 'translate(' + (kx - 32) + 'px,' + (ky - 63) + 'px) rotate(' + rot + 'deg)'; }
        }

        // music: your own file if AUDIO_URL is set, otherwise a short music-box melody made in the browser
        var ac = null, stopAudio = function () { };
        // ---- the two songs: SAME method as the sky rockets ----
        // Each file is downloaded + decoded ONCE when the page opens, then played with the Web Audio API.
        //   1st audio (DECORATION_AUDIO_URL): starts with the decoration, loops, is faded out when the cake is cut.
        //   2nd audio (AUDIO_URL): starts when the cake is cut.
        // If a file cannot be loaded the reason is printed in the browser console (F12).
        function makeTrack(url) {
          var t = { url: url, buf: null, state: url ? 'idle' : 'none', pending: null };
          t.settle = function (dc) { try { if (dc) dc.close(); } catch (e) { } if (!destroyed && t.pending) { var p = t.pending; t.pending = null; p(); } };
          t.load = function () {
            if (t.state !== 'idle') return; t.state = 'loading'; var dc = null;
            try {
              dc = new (window.AudioContext || window.webkitAudioContext)();
              fetch(t.url).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.arrayBuffer(); })
                .then(function (ab) { return new Promise(function (ok, no) { dc.decodeAudioData(ab, ok, no); }); })
                .then(function (b) { t.buf = b; t.state = 'ready'; t.settle(dc); })
                .catch(function (err) { t.state = 'failed'; console.warn('[HappyBirthday] could not load or decode audio:', t.url, err); t.settle(dc); });
            } catch (e) { t.state = 'failed'; console.warn('[HappyBirthday] audio not supported', e); }
          };
          return t;
        }
        var songT = makeTrack(AUDIO_URL), decoT = makeTrack(DECORATION_AUDIO_URL);
        songT.load(); decoT.load();
        // plays a track as soon as it is ready. plays = how many times (0 = repeat forever).
        // onStart gets a handle { gain, stop(when) }; onEnd runs after the LAST play has finished.
        function playTrack(t, vol, plays, onStart, onEnd, onFail) {
          var go = function () {
            if (destroyed) return;
            if (t.state !== 'ready') { onFail(); return; }
            try {
              ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.resume) ac.resume();
              var g = ac.createGain(); g.gain.value = vol; g.connect(ac.destination);
              var left = Math.max(0, Math.floor(plays) || 0), h = { gain: g, src: null, stopped: false };
              h.stop = function (when) { h.stopped = true; try { if (h.src) h.src.stop(when || 0); } catch (e) { } };
              var next = function () {
                var src = ac.createBufferSource(); src.buffer = t.buf; src.connect(g); h.src = src;
                if (left === 0) src.loop = true; // 0 = repeat forever (seamless loop)
                src.onended = function () { if (h.stopped) return; left--; if (left > 0) next(); else if (onEnd) onEnd(); };
                src.start();
              };
              next(); onStart(h);
            } catch (e) { console.warn('[HappyBirthday] audio could not play', e); onFail(); }
          };
          if (t.state === 'loading') t.pending = go; else go(); // still downloading: starts the moment it is ready
        }
        // 1st audio: decoration music
        var decoH = null, decoStarted = false, decoMuted = false, unlockEv = ['pointerdown', 'touchend', 'keydown'];
        var unlockFn = function () { try { if (ac && ac.resume) ac.resume(); } catch (e) { } unlockEv.forEach(function (e) { window.removeEventListener(e, unlockFn); }); };
        function startDecoration() {
          if (decoStarted || !DECORATION_AUDIO_URL) return; decoStarted = true;
          // if the browser has not allowed sound yet, the first tap / key press turns it on (the song then starts from its beginning)
          unlockEv.forEach(function (e) { window.addEventListener(e, unlockFn); });
          playTrack(decoT, DECORATION_AUDIO_VOL, DECORATION_AUDIO_PLAYS,
            function (h) { if (decoMuted) { h.stop(); return; } decoH = h; },
            null, function () { console.warn('[HappyBirthday] decoration audio not available'); });
        }
        function stopDecoration() { // muted (smooth fade) when the cake is cut
          decoMuted = true; if (!decoH) return;
          var h = decoH; decoH = null;
          try { var now = ac.currentTime; h.gain.gain.cancelScheduledValues(now); h.gain.gain.setValueAtTime(h.gain.gain.value, now); h.gain.gain.linearRampToValueAtTime(0, now + 0.6); h.stop(now + 0.7); } catch (e) { }
        }
        // 2nd audio: cake-cut music (fadeAudio = smooth fade-out, used when the gift box is opened)
        var fadeAudio = function () { }, songFaded = false;
        function playCelebration(done) {
          if (!AUDIO_URL) { playMelody(done); return; }
          playTrack(songT, 1, AUDIO_PLAYS,
            function (h) { if (songFaded) { h.stop(); return; } stopAudio = function () { h.stop(); }; fadeAudio = function (sec) { try { var n = ac.currentTime; h.gain.gain.cancelScheduledValues(n); h.gain.gain.setValueAtTime(h.gain.gain.value, n); h.gain.gain.linearRampToValueAtTime(0, n + sec); h.stop(n + sec + 0.1); } catch (e) { } }; },
            done, function () { console.warn('[HappyBirthday] song not available -> using the built-in melody'); playMelody(done); });
        }
        function playMelody(done) {
          try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.resume) ac.resume(); } catch (e) { setTimeout(done, 8000); return; }
          var beat = 0.36, now = ac.currentTime + 0.05, when = 0, master = ac.createGain(); master.gain.value = 0.22; master.connect(ac.destination);
          var notes = [[72, 1], [76, 1], [79, 1], [81, 2], [79, 1], [77, 1], [76, 1], [74, 1], [72, 3], [74, 1], [77, 1], [81, 1], [83, 2], [81, 1], [79, 1], [77, 1], [76, 1], [79, 3], [84, 1.5], [83, 0.5], [81, 1], [79, 1], [77, 1], [76, 1], [74, 1], [76, 1], [77, 1], [72, 4]];
          notes.forEach(function (n) {
            var f = 440 * Math.pow(2, (n[0] - 69) / 12), d = n[1] * beat;
            [['triangle', 1, 0.9], ['sine', 2, 0.25]].forEach(function (o) {
              var osc = ac.createOscillator(), g = ac.createGain(); osc.type = o[0]; osc.frequency.value = f * o[1];
              g.gain.setValueAtTime(0.0001, now + when); g.gain.linearRampToValueAtTime(o[2], now + when + 0.015); g.gain.exponentialRampToValueAtTime(0.001, now + when + d * 1.6);
              osc.connect(g); g.connect(master); osc.start(now + when); osc.stop(now + when + d * 1.7 + 0.1);
            });
            when += d;
          });
          var id = setTimeout(done, (when + 0.6) * 1000); stopAudio = function () { clearTimeout(id); master.disconnect(); }; fadeAudio = function (sec) { try { var n = ac.currentTime; master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n); master.gain.linearRampToValueAtTime(0, n + sec); } catch (e) { } };
        }

        // story: intro (lights, decorations, cake pops) -> ready -> cut (audio plays) -> vanish -> done
        var T = 0, C = 0, V = 0, stage = 'intro', popped = false, ringT = -1, chopT = -1, knifeOn = false, mx = 0, my = 0, kx = window.innerWidth / 2, ky = window.innerHeight * 0.6;
        var tCake = 5.0, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
        function cut() { if (stage !== 'ready') return; stage = 'cut'; C = 0; chopT = 0; hint.classList.add('hidden'); burstAt(0, 1.4, 1.6, 1.4); bgOn = true; spawnBalloons(); stopDecoration(); playCelebration(function () { }); }
        function vanish() { stage = 'vanish'; V = 0; knifeOn = false; popMode = false; pinOn = false; pin.classList.add('hidden'); hint.classList.add('hidden'); knife.classList.add('hidden'); canvas.style.cursor = ''; burstAt(0, 2.2, 0, 2.2); }
        function reset() { stopAudio(); clearBalloons(); blowReset(); bgOn = false; popMode = false; pinOn = false; pin.classList.add('hidden'); T = 0; C = 0; V = 0; stage = 'intro'; popped = false; knifeOn = false; chopT = -1; knife.classList.add('hidden'); hint.classList.add('hidden'); giftReset(); titleEl.classList.remove('hidden'); canvas.style.cursor = ''; cake.visible = false; cake.scale.setScalar(0.001); sliceG.position.set(0, 0, 0); sliceG.rotation.set(0, 0, 0); }
        var onCanvasPointerDown = function (e) {
          kx = e.clientX; ky = e.clientY; if (popMode) { pinHit(e); return; }
          if (giftStage === 'ready') {
            ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
            if (ray.intersectObject(giftG, true).length) openGift(); return;
          }
          if (stage !== 'ready') return;
          ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
          if (ray.intersectObjects([bodyG, sliceG], true).length) cut();
        };
        var onWindowPointerMove = function (e) { kx = e.clientX; ky = e.clientY; mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; };
        canvas.addEventListener('pointerdown', onCanvasPointerDown);
        window.addEventListener('pointermove', onWindowPointerMove);
        // Hardcode the birthday name here (example: 'SARAH'). Empty = 'TO YOU'.
        var NAME = NAME_CONFIG;
        if (NAME) { $('who').textContent = 'FOR ' + NAME.toUpperCase(); }
        // cinematic bars are added when the birthday animation starts (see tick), not on mount
        function size() { var w = window.innerWidth, h = window.innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
        window.addEventListener('resize', size); size();

        var clock = new THREE.Clock();
        var rafId = 0;
        function tick() {
          if (destroyed) return;
          var raw = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, party = stage === 'cut'; if (startRef.current) T += raw * TS;
          // Nothing of the birthday stage is visible until the animation actually starts (T > 0)
          var live = T > 0;
          if (live !== stageLive) {
            stageLive = live;
            dais.visible = rim.visible = plate.visible = live;
            wires.forEach(function (w) { w.visible = live; });
            flags.forEach(function (f) { f.visible = live; });
            bulbs.forEach(function (b) { b.m.visible = live; });
            if (live) { document.body.classList.add('cine'); startDecoration(); }
          }
          var dk = Math.max(out(T / 1.4), 0.001); 
          // the white plate AND the blue stage (dais + rim) go away together with the cake
          var pk = stage === 'vanish' ? 1 - smooth(V / 1.4) : (stage === 'done' ? 0 : 1), sk2 = Math.max(dk * pk, 0.001);
          dais.scale.setScalar(sk2); rim.scale.setScalar(sk2); plate.scale.setScalar(sk2);
          stars.rotation.y += raw * 0.01; grid.position.z = (t * 1.3) % 1;
          cam.position.set(mx * 1.2, 1.5 - my * 0.5, Math.max(8.6, 3.0 / (0.52 * cam.aspect)) + 2.2 * (1 - smooth(T / 8))); cam.lookAt(0, 2.4, 0);
          var onN = 0;
          bulbs.forEach(function (b) {
            var k = c01((T - (0.5 + b.ord * 0.055)) / 0.25); if (k > 0) onN++; var tw = party ? Math.sin(t * 8 + b.ord) : 0;
            b.mat.emissiveIntensity = k * (2.1 + 0.6 * tw) * LIGHT; b.m.scale.setScalar(1 + 0.7 * Math.sin(k * Math.PI)); b.spr.material.opacity = k * (0.85 + 0.15 * tw) * LIGHT;
          });
          var lit = onN / bulbs.length; amb.intensity = 0.12 + 0.3 * lit; keyL.intensity = 1.2 * lit * LIGHT; blueL.intensity = 1.3 * lit * LIGHT; roseL.intensity = 1.1 * lit * LIGHT;
          flags.forEach(function (f, i) { f.scale.y = Math.max(back((T - (2.6 + i * 0.07)) / 0.5), 0.001); f.rotation.z = Math.sin(t * 2 + i) * (party ? 0.14 : 0.07); });
          balloons.forEach(function (g, i) { var p = out((T - (3.2 + i * 0.14)) / 2.4); g.position.y = -12 + (g.userData.y + 12) * p + Math.sin(t * 0.9 + g.userData.ph) * 0.12 * p; g.rotation.z = Math.sin(t * 1.2 + g.userData.ph) * (party ? 0.12 : 0.05); });
          confetti.material.opacity += ((bgOn ? 0.9 : 0) - confetti.material.opacity) * Math.min(1, raw * 1.5);
          for (var i = 0; i < CN; i++) { cp[i * 3 + 1] -= cs[i] * raw * (party ? 2.2 : 1); cp[i * 3] += Math.sin(t + i) * raw * 0.2; if (cp[i * 3 + 1] < -0.3) cp[i * 3 + 1] = 9; }
          confetti.geometry.attributes.position.needsUpdate = true;
          if (!popped && T >= tCake) { popped = true; }
          if (stage !== 'vanish' && stage !== 'done') { var ck = c01((T - tCake) / 1.3); cake.visible = T > tCake; cake.scale.setScalar(Math.max(back(ck), 0.001)); cake.rotation.y = (1 - ck) * Math.PI + Math.sin(t * 0.5) * 0.18 * ck; cake.position.y = 0.18 + (1 - out(ck)) * 1.2; }
          if (stage === 'intro' && T > tCake + 1.5) { stage = 'blow'; blowBtn.classList.remove('hidden'); }
          if (stage === 'cut') { C += raw; var sk = out(C / 0.9); sliceG.position.z = sk * 1.2; sliceG.rotation.x = sk * 0.16; if (!popMode && C > 1.2) { popMode = true; knifeOn = false; knife.classList.add('hidden'); pinOn = true; pin.classList.remove('hidden'); canvas.style.cursor = 'none'; hint.classList.remove('hidden'); setHint(); } }
          if (stage === 'vanish') { V += raw; var vk = smooth(V / 1.4); cake.scale.setScalar(Math.max(1 - vk, 0.001)); cake.rotation.y += raw * 8 * vk; cake.position.y = 0.18 + vk * 1.6; if (V > 1.4) { cake.visible = false; stage = 'done'; giftStage = 'ready'; G = 0; O = 0; burstAt(0, 1.6, 0.6, 1.8); hint.textContent = 'TAP THE GIFT TO OPEN IT'; hint.classList.remove('hidden'); canvas.style.cursor = 'pointer'; } }
          flames.forEach(function (f) { var s = 1 + 0.18 * Math.sin(t * 14 + f.ph) + 0.1 * Math.sin(t * 23 + f.ph * 2); f.fl.scale.set(1, s, 1); f.gs.material.opacity = 0.7 + 0.2 * Math.sin(t * 11 + f.ph); });
          candleL.intensity = cake.visible && stage !== 'vanish' ? 0.8 * (0.85 + 0.15 * Math.sin(t * 13)) : 0;
          topHeart.position.y = topY + 0.95 + Math.sin(t * 2) * 0.06; topHeart.rotation.y = t * 1.2;
          if (ringT >= 0) { ringT += raw; ringM.scale.setScalar(1 + ringT * 5); ringM.material.opacity = Math.max(0, 0.9 - ringT * 0.8); if (ringT > 1.2) ringT = -1; }
          if (blife > 0) {
            blife -= raw; for (var j = 0; j < BN; j++) { bp[j * 3] += bv[j * 3] * raw; bp[j * 3 + 1] += bv[j * 3 + 1] * raw; bp[j * 3 + 2] += bv[j * 3 + 2] * raw; bv[j * 3 + 1] -= 3 * raw; }
            bursts.geometry.attributes.position.needsUpdate = true; bursts.material.opacity = c01(blife / 1.2); if (blife <= 0) bursts.visible = false;
          }
          if (knifeOn) {
            var rot = 24; if (chopT >= 0) { chopT += raw; var q = Math.min(chopT / 0.45, 1); rot = 24 - 70 * Math.sin(q * Math.PI); if (chopT > 0.45) chopT = -1; }
            knife.style.transform = 'translate(' + (kx - 32) + 'px,' + (ky - 63) + 'px) rotate(' + rot + 'deg)';
          }
          popTick(raw, t); giftTick(raw, t); bgTick(raw, t);
          r.render(sc, cam); rafId = requestAnimationFrame(tick);
        }
        window.__happyBirthdayCleanup = function () {
          destroyed = true;
          cancelAnimationFrame(rafId);
          try { stopAudio(); if (ac) ac.close(); } catch (e) { }
          songT.pending = null; decoT.pending = null; unlockEv.forEach(function (e) { window.removeEventListener(e, unlockFn); });
          canvas.removeEventListener('pointerdown', onCanvasPointerDown);
          window.removeEventListener('pointermove', onWindowPointerMove);
          window.removeEventListener('resize', size);
          document.body.classList.remove('cine');
          try { r.dispose(); } catch (e) { }
        };
        tick();
      })();

    };

    script();

    return () => {
      if (window.__happyBirthdayCleanup) {
        window.__happyBirthdayCleanup();
        delete window.__happyBirthdayCleanup;
      }
    };
  }, []);

  return createPortal(
    <div ref={rootRef} className={"birthday-root" + (start ? " solid" : "")}>
      <canvas id="c"></canvas>
      <div id="vig"></div>
      <div className="bar t"></div>
      <div className="bar b"></div>

      <div id="title" className={start ? "" : "hidden"}>
        <div className="row">
          <h2 className="wl">Happy</h2>
          <h2 className="wr">Birthday<span id="who">{user.id==='preview'?'To you':'Sweetheart'}</span></h2>
        </div>
      </div>

      <div id="hint" className="hidden">TAP THE CAKE · MAKE A WISH · CUT IT</div>

      <div id="knife" className="hidden">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="27" y="2" width="10" height="22" rx="3" fill="#f4b6c2" />
          <rect x="22" y="23" width="20" height="4" rx="2" fill="#4f8cff" />
          <path d="M24 27H40V52L32 63L24 58Z" fill="#e8eeff" stroke="#4f8cff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>

      <button id="blowBtn" className="hidden">
        <svg className="fl" viewBox="0 0 24 32" aria-hidden="true">
          <defs>
            <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd36b" />
              <stop offset="1" stopColor="#ff5e62" />
            </linearGradient>
          </defs>
          <path d="M12 1C13 8 21 12 21 21a9 9 0 0 1-18 0c0-5 3-7 5-10 .5 2 1.5 3 3 3C11 9 10 5 12 1z" fill="url(#fg)" />
          <ellipse cx="12" cy="22" rx="4" ry="6" fill="#fff3c4" />
        </svg>
        <span className="tx">Blow the candles</span>
        <i className="sp s1">✦</i>
        <i className="sp s2">✦</i>
        <i className="sp s3">✦</i>
      </button>

      <div id="pin" className="hidden">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 62L30 20H34Z" fill="#dfe8ff" stroke="#9fb4e8" strokeWidth="1" />
          <circle cx="32" cy="12" r="10" fill="#ff4d6d" stroke="#fff" strokeWidth="2" />
          <circle cx="29" cy="9" r="3" fill="#fff" opacity=".6" />
        </svg>
      </div>

      {/* full-screen overlay: gold-white flash that settles into the gallery's plum, hiding the page change */}
      <div id="fade" style={{ position: "fixed", inset: 0, zIndex: 7, pointerEvents: "none", opacity: 0, background: "#fff3d6" }}></div>
    </div>,
    document.body
  );
}