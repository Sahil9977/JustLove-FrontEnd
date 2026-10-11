import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { createScene } from './scene.js';
import { useAuth } from './context/AuthContext.jsx';

/* ---- BACKGROUND MUSIC for every page inside this Layout ----
   Paste your link (mp3 / ogg / wav) in `url`. Leave '' = no music, and nothing else changes.
   volume  : 0 (silent) ... 1 (full)
   fadeIn  : seconds of fade-in when it starts
   fadeOut : seconds of fade-out when it stops / is muted
   It starts when the page opens. If the browser blocks sound (fresh load / reload, no tap yet),
   it starts at the visitor's first tap / key press. It keeps playing while the visitor moves between pages. */
const MUSIC = { url: '', volume: 0.4, fadeIn: 3, fadeOut: 1.5, loop: true };
/* pages that have their OWN music (e.g. the Message page): this music fades out there and comes back after */
const QUIET_ON = ['/home/gallery/message'];
const SHOW_MUTE_BUTTON = true; /* small round sound on/off button, bottom-left. Only shown when `url` is set */

// Keeps ONE 3D world (canvas + background + sparkles + JustLove header) alive across every route.
export default function Layout() {
  const canvas = useRef(null), photos = useRef([]), handlers = useRef({});
  const [world, setWorld] = useState(null);
  const { pathname } = useLocation();
  // The Sky -> Birthday page has its own background, so hide the shared intro world there.
  const hideWorld = pathname === '/sky' || pathname === '/home';
  const { isAuthenticated, logout } = useAuth();

  /* ---------- music ---------- */
  const audio = useRef(null), fadeId = useRef(0);
  const [muted, setMuted] = useState(false);
  const want = !!MUSIC.url && !muted && !QUIET_ON.includes(pathname); // should the music be playing right now?

  const fade = useCallback((to, sec, done) => {
    const a = audio.current; if (!a) return;
    clearInterval(fadeId.current);
    const v0 = a.volume, t0 = performance.now(), ms = Math.max(1, sec * 1000);
    fadeId.current = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.min(1, Math.max(0, v0 + (to - v0) * k));
      if (k === 1) { clearInterval(fadeId.current); done?.(); }
    }, 50);
  }, []);

  const startMusic = useCallback(() => {
    const a = audio.current; if (!a) return;
    if (a.paused) {
      a.volume = 0;
      const p = a.play();
      if (p && p.then) p.then(() => fade(MUSIC.volume, MUSIC.fadeIn)).catch(() => { /* blocked: retried on the first tap / key press */ });
      else fade(MUSIC.volume, MUSIC.fadeIn);
    } else fade(MUSIC.volume, MUSIC.fadeIn);
  }, [fade]);

  useEffect(() => { // create the audio element once
    if (!MUSIC.url) return undefined;
    const a = new Audio(MUSIC.url);
    a.loop = MUSIC.loop; a.preload = 'auto'; a.volume = 0;
    audio.current = a;
    return () => { clearInterval(fadeId.current); a.pause(); a.src = ''; audio.current = null; };
  }, []);

  useEffect(() => { // play / fade out whenever `want` changes (page change, mute button)
    const a = audio.current; if (!a) return;
    if (want) startMusic();
    else fade(0, MUSIC.fadeOut, () => a.pause());
  }, [want, startMusic, fade]);

  useEffect(() => { // browser blocked sound: first tap / key press anywhere starts it
    if (!want) return undefined;
    const kick = () => { if (audio.current?.paused) startMusic(); };
    const evs = ['pointerdown', 'keydown', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, kick, { passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, kick));
  }, [want, startMusic]);

  useEffect(() => {
    const w = createScene(canvas.current, {
      onCaption: (i) => handlers.current.onCaption?.(i),
      onIntroDone: () => handlers.current.onIntroDone?.(),
    });
    setWorld(w);
    return () => w.dispose();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = 0;
    const move = (e) => {
      const now = Date.now(); if (now - last < 45) return; last = now;
      const d = document.createElement('span'); d.className = 'sp';
      d.style.left = e.clientX - 5 + 'px'; d.style.top = e.clientY - 5 + 'px';
      document.body.appendChild(d); setTimeout(() => d.remove(), 900);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      logout();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [logout]);

  const showMute = SHOW_MUTE_BUTTON && !!MUSIC.url && !QUIET_ON.includes(pathname);

  return (
    <>
      <canvas id="bg" ref={canvas} style={{ visibility: hideWorld ? 'hidden' : 'visible' }} />
      <header className="brand">JustLove</header>
      {pathname !== '/' && isAuthenticated && (
        <button className="kill" onClick={() => logout()} title="Lock now (Esc)" aria-label="Lock now. Shortcut: Escape key">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          LOCK
        </button>
      )}
      {showMute && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          title={muted ? 'Turn music on' : 'Turn music off'}
          aria-label={muted ? 'Turn music on' : 'Turn music off'}
          style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 60, width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(10,6,28,.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: 0.75, backdropFilter: 'blur(6px)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            {muted ? <><path d="m22 9-6 6" /><path d="m16 9 6 6" /></> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
          </svg>
        </button>
      )}
      <main>{world && <Outlet context={{ world, photos, handlers }} />}</main>
    </>
  );
}