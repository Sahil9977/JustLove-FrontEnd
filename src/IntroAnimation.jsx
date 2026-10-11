import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useNavigate } from "react-router-dom"; // 👈 Handles the page switch
import "./IntroAnimation.css";

// ------------------------------------------------------------------
//  MUSIC – paste your song link between the quotes (mp3 / ogg / wav).
//  It fades in when the intro starts and fades out into the final flash.
//  Leave it empty ('') and the intro is silent.
// ------------------------------------------------------------------
const MUSIC_URL = "https://res.cloudinary.com/u3u7poti/video/upload/v1791660475/intro_hqxe3q.mp3";
const MUSIC_VOLUME = 0.8; // 0 (silent) … 1 (full)

export default function IntroAnimation({ onComplete }) {
    const mountRef = useRef(null);
    const onCompleteRef = useRef(onComplete);
    const navigate = useNavigate(); // 👈 Router navigation

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const fl = document.createElement("div");
        fl.className = "love-intro-flash";
        const tg = document.createElement("div");
        tg.className = "love-intro-tag";
        tg.textContent = "EVERY PICTURE IS A UNIVERSE";
        const vig = document.createElement("div");
        vig.className = "love-intro-vignette";
        mount.append(fl, vig, tg);

        let rafId = 0;
        let completeTimer = 0;

        // ---- music (MUSIC_URL at the top of this file) ----
        let music = null, fadeTimer = 0, fadingOut = false, unlock = null;
        const fadeTo = (v, ms) => {
            if (!music) return;
            clearInterval(fadeTimer);
            const v0 = music.volume, ts = performance.now();
            fadeTimer = setInterval(() => {
                if (!music) { clearInterval(fadeTimer); return; }
                const k = Math.min(1, (performance.now() - ts) / ms);
                music.volume = Math.min(1, Math.max(0, v0 + (v - v0) * k));
                if (k === 1) clearInterval(fadeTimer);
            }, 40);
        };
        const removeUnlock = () => {
            if (!unlock) return;
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
            unlock = null;
        };
        if (MUSIC_URL) {
            try {
                music = new Audio(MUSIC_URL);
                music.preload = "auto";
                music.volume = 0;
                const begin = () => { if (!fadingOut) fadeTo(Math.min(1, Math.max(0, MUSIC_VOLUME)), 1500); };
                const p = music.play();
                if (p && p.then) {
                    p.then(begin).catch(() => {
                        // browser blocked autoplay -> start on the first tap / key press instead
                        unlock = () => {
                            removeUnlock();
                            if (music) music.play().then(begin).catch(() => { });
                        };
                        window.addEventListener("pointerdown", unlock);
                        window.addEventListener("keydown", unlock);
                    });
                } else begin();
            } catch (e) { /* ignore */ }
        }

        const W = () => innerWidth, H = () => innerHeight, R = (a = 1) => (Math.random() * 2 - 1) * a;
        const ss = x => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x) }, eoc = x => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
        const eob = x => { x = Math.min(Math.max(x, 0), 1); return 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2) };
        const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x03040c, .014);
        const cam = new THREE.PerspectiveCamera(55, W() / H(), .05, 300);
        const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true }); ren.setPixelRatio(Math.min(devicePixelRatio, 2)); ren.setSize(W(), H()); mount.appendChild(ren.domElement);
        const resize = () => { ren.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix() };
        window.addEventListener('resize', resize);
        function tex(draw, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c) }
        const glowT = tex((x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64) }, 64, 64);

        // ---- galaxy ----
        const NG = 11000, gp = new Float32Array((NG + 1) * 3), gc = new Float32Array((NG + 1) * 3), gs = new Float32Array(NG + 1), gr = new Float32Array(NG + 1);
        for (let i = 0; i < NG; i++) {
            const r = Math.pow(Math.random(), 1.5) * 18 + .15, arm = i % 3, a = arm * 2.094 + r * .5 + R(1) * .4 / (.3 + r * .1), t = r / 18;
            gp[i * 3] = r; gp[i * 3 + 1] = a; gp[i * 3 + 2] = R(.4) * Math.exp(-r * .08) * 3;
            const c = Math.random() < .5 ? [.95, .35, .85] : [.35, .55, 1], m = Math.max(0, 1 - t * 3);
            gc[i * 3] = c[0] * (1 - m) + 1 * m; gc[i * 3 + 1] = c[1] * (1 - m) + .8 * m; gc[i * 3 + 2] = c[2] * (1 - m) + .5 * m; gs[i] = .05 + Math.pow(Math.random(), 3) * .3; gr[i] = Math.random()
        }
        gc.set([1, .9, .8], NG * 3); gs[NG] = 6;
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gg.setAttribute('aS', new THREE.BufferAttribute(gs, 1)); gg.setAttribute('aRnd', new THREE.BufferAttribute(gr, 1));
        const U = { uTime: { value: 0 }, uBloom: { value: 0 }, uScale: { value: 500 } };
        const gm = new THREE.ShaderMaterial({
            uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            vertexShader: `uniform float uTime,uBloom,uScale;attribute float aS,aRnd;attribute vec3 color;varying vec3 vC;
void main(){float r=position.x*uBloom;float ang=position.y+uTime*1.6/(.6+position.x*.35);vec3 p=vec3(cos(ang)*r,position.z*uBloom,sin(ang)*r);vec4 m=modelViewMatrix*vec4(p,1.);
gl_PointSize=min(aS*uScale/-m.z,aS>3.?500.:60.);vC=color*(.65+.35*sin(uTime*3.+aRnd*40.));gl_Position=projectionMatrix*m;}`,
            fragmentShader: `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);float k=pow(smoothstep(.5,0.,d),1.8);gl_FragColor=vec4(vC*k,k);}`
        });
        const galaxy = new THREE.Group(), gpts = new THREE.Points(gg, gm); gpts.frustumCulled = false; galaxy.add(gpts); galaxy.rotation.z = .35; scene.add(galaxy);

        // ---- wormhole ----
        const tun = new THREE.Group(); scene.add(tun); const rings = [];
        for (let i = 0; i < 40; i++) {
            const m = new THREE.Mesh(new THREE.TorusGeometry(7, .05, 5, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL((i * .035) % 1, .85, .6), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
            m.position.z = -i * 2.2 - 2; m.rotation.z = i * .14; tun.add(m); rings.push(m)
        }
        const nd = 1800, dp = new Float32Array(nd * 3); for (let i = 0; i < nd; i++) { const a = Math.random() * 6.28, r = 1.5 + Math.random() * 10; dp[i * 3] = Math.cos(a) * r; dp[i * 3 + 1] = Math.sin(a) * r; dp[i * 3 + 2] = -Math.random() * 100 }
        const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
        const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: .22, map: glowT, color: 0xbcd8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); tun.add(dust);
        tun.visible = false;

        // ---- frames ----
        function art(i) {
            return tex((x, w, h) => {
                const hu = i * 37 + 190, g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hu},85%,58%)`); g.addColorStop(1, `hsl(${hu + 80},75%,12%)`); x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.fillStyle = `hsla(${hu + 40},100%,88%,.95)`; x.beginPath(); x.arc(w * (.25 + .5 * ((i * 37) % 10) / 10), h * .3, w * .11, 0, 7); x.fill();
                for (let k = 0; k < 3; k++) { x.fillStyle = `hsla(${hu + k * 25},65%,${28 - k * 8}%,.88)`; x.beginPath(); x.moveTo(0, h); for (let t = 0; t <= 8; t++)x.lineTo(t * w / 8, h * (.5 + k * .13) - Math.abs(Math.sin(t * 1.2 + i * 1.7 + k * 2)) * h * .2); x.lineTo(w, h); x.fill() }
                x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6)
            }, 256, 340)
        }
        function mk(i) {
            const g = new THREE.Group(), glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.5), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(((i * 37 + 190) % 360) / 360, .9, .65), transparent: true, opacity: .4, blending: THREE.AdditiveBlending, side: 2, depthWrite: false })); glow.position.z = -.03;
            g.add(glow, new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshBasicMaterial({ map: art(i), side: 2 }))); scene.add(g); g.visible = false; return { g, glow }
        }
        const helix = [], hall = [], ZE = -84;
        for (let i = 0; i < 9; i++) { const f = mk(i), a = i * 1.25, z = -9 - i * 8; f.p = [Math.cos(a) * 6, Math.sin(a) * 6, z]; f.g.position.set(...f.p); f.g.lookAt(0, 0, z + 9); f.g.visible = true; helix.push(f) }
        for (let i = 0; i < 10; i++) { const f = mk(i + 3), a = i / 10 * 6.283; f.a = a; f.g.position.set(Math.cos(a) * 9, Math.sin(a * 2) * .8, ZE + Math.sin(a) * 9); f.g.lookAt(0, 0, ZE); hall.push(f) }

        // ---- timeline ----
        let t0 = performance.now(), stopped = false;
        function frame(now) {
            if (stopped) return;
            const T = (now - t0) / 1000;

            // music fades out together with the final flash
            if (T >= 6.2 && !fadingOut) { fadingOut = true; fadeTo(0, 700); }

            // Flash takeover and smooth switch to /home
            if (T >= 6.85) {
                fl.style.opacity = 1;
                stopped = true;
                cancelAnimationFrame(rafId);
                completeTimer = setTimeout(() => {
                    if (onCompleteRef.current) {
                        onCompleteRef.current();
                    } else {
                        navigate('/home'); // 👈 Switches directly to /home!
                    }
                }, 400);
                return;
            }

            rafId = requestAnimationFrame(frame);
            let fov = 55;

            if (T < 6.85) {
                const k = T / 6.8, d = 34 * (1 - Math.pow(Math.min(k, 1), 2.3)) + .35, a = .5 + T * .45 + Math.pow(k, 3) * 5, e = .5 * (1 - k) + .03;
                cam.position.set(d * Math.cos(a) * Math.cos(e), d * Math.sin(e), d * Math.sin(a) * Math.cos(e)); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
                U.uBloom.value = eoc(T / 3.6); fov = 55 + 55 * ss((T - 4.6) / 2.2); galaxy.visible = true; tun.visible = false;
                tg.style.opacity = ss((T - .5) / 1) * (1 - ss((T - 3.2) / .9)); tg.style.letterSpacing = (.4 + .35 * ss(T / 3.5)) + 'em'
            }
            else {
                galaxy.visible = false; tun.visible = true; tg.style.opacity = 0;
                const u = (T - 6.8) / 6, z = ZE * eoc(u); cam.position.set(0, 0, z); cam.rotation.set(0, 0, Math.sin(T * .7) * .12 * (1 - ss(u)));
                if (T > 12.8) { cam.rotation.set(0, -(T - 12.8) * .16, 0) }
                fov = 110 - 50 * ss((T - 6.8) / 3.2);
                rings.forEach((r, i) => { r.material.opacity = .9 * (1 - ss((cam.position.z - r.position.z > 0 ? 1 : 0) * 0 + (-r.position.z - 70) / 16)); r.rotation.z += .004; r.scale.setScalar(1 + .06 * Math.sin(T * 3 + i)) });
                tun.visible = true; dust.material.opacity = 1 - ss((T - 11) / 2)
            }

            cam.fov = fov; cam.updateProjectionMatrix(); U.uScale.value = H() * ren.getPixelRatio() / (2 * Math.tan(fov * Math.PI / 360)); U.uTime.value = T;
            fl.style.opacity = T < 6.85 ? ss((T - 6.2) / .65) : 1 - ss((T - 6.85) / 1.1);
            helix.forEach((f, i) => { f.g.visible = T > 6.85; f.g.rotateZ(.002); f.glow.material.opacity = .3 + .15 * Math.sin(T * 2 + i) });
            hall.forEach((f, i) => {
                const p = eob((T - 10.2 - i * .15) / 1.2); f.g.visible = p > 0; f.g.scale.setScalar(Math.max(p, .001)); const a = f.a + Math.max(T - 12, 0) * .1;
                f.g.position.set(Math.cos(a) * 9, Math.sin(a * 2 + T * .6) * .8, ZE + Math.sin(a) * 9); f.g.lookAt(0, 0, ZE); f.glow.material.opacity = .3 + .15 * Math.sin(T * 2 + i)
            });
            ren.render(scene, cam);
        }
        rafId = requestAnimationFrame(frame);

        return () => {
            stopped = true;
            cancelAnimationFrame(rafId);
            clearTimeout(completeTimer);
            clearInterval(fadeTimer);
            removeUnlock();
            if (music) { music.pause(); music.src = ""; music = null; }
            window.removeEventListener("resize", resize);
            if (ren.domElement.parentNode === mount) mount.removeChild(ren.domElement);
            [fl, vig, tg].forEach((el) => {
                if (el.parentNode === mount) mount.removeChild(el);
            });
            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach((mat) => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                }
            });
            glowT.dispose();
            ren.dispose();
        };
    }, [navigate]);

    return <div ref={mountRef} className="love-intro" aria-hidden="true" />;
}