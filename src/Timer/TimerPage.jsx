import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTimer } from '../api.js';
import { parseTimer } from './timerStatus.js';
import { createTimerScene } from './timerScene.js';
import './Timer.css';

// ---- BACKGROUNDS: add your urls here later. Leave url '' to skip a slot. ----
// They play in a loop: 1 -> 2 -> 1 -> 2 ... (add a 3rd, 4th... slot any time)
// type: 'image' or 'video'
const BACKGROUNDS = [
  { type: 'image', url: '' },   // background 1
  { type: 'image', url: '' },   // background 2
];
const BG_LOOP_SECONDS = 8;      // how long each background stays before switching

const WAITING = { step: 'COUNTING DOWN', title: 'Our moment is coming', text: 'Every heartbeat brings us a little closer. Come back when the clock reaches zero.' };
const READY = { step: 'THE WAIT IS OVER', title: 'It is time', text: 'Opening our little world…' };

const R = 46, C = 2 * Math.PI * R;
const pad = (n) => String(n).padStart(2, '0');

function Unit({ value, label, frac, wide }) {
  const prev = useRef(frac), jump = frac > prev.current + 0.01;
  useEffect(() => { prev.current = frac; });
  return (
    <div className="tm-unit">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="tm-ring-bg" cx="50" cy="50" r={R} />
        <circle className="tm-ring" cx="50" cy="50" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(Math.max(frac, 0), 1))} style={jump ? { transition: 'none' } : undefined} />
      </svg>
      <div className="tm-unit-in">
        <span className="tm-num">{wide ? value : pad(value)}</span>
        <span className="tm-lbl">{label}</span>
      </div>
    </div>
  );
}

// Looping background slots (1 -> 2 -> 1 ...), cross-fading
function Backgrounds() {
  const list = BACKGROUNDS.filter((b) => b.url);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % list.length), BG_LOOP_SECONDS * 1000);
    return () => clearInterval(id);
  }, [list.length]);
  if (!list.length) return null;
  return (
    <div className="tm-bg" aria-hidden="true">
      {list.map((b, k) => b.type === 'video'
        ? <video key={k} className={'tm-bg-item' + (k === i ? ' on' : '')} src={b.url} autoPlay muted loop playsInline />
        : <img key={k} className={'tm-bg-item' + (k === i ? ' on' : '')} src={b.url} alt="" />)}
    </div>
  );
}

// ---- MUSIC for the timer page: paste your link later in `url` ('' = no music, nothing else changes) ----
// volume 0..1 | fadeIn / fadeOut in seconds | loop true = repeats until the page closes
// It starts when the page opens (if the browser blocks sound, at the first tap / key press) and fades out when the
// page redirects to '/'. The little round button (bottom-left) turns it on / off.
const MUSIC = { url: 'https://res.cloudinary.com/u3u7poti/video/upload/v1791734938/timer_r3hao8.mp3', volume: 0.5, fadeIn: 3, fadeOut: 1.5, loop: true };
const SHOW_MUTE_BUTTON = true;

function useMusic() {
  const [muted, setMuted] = useState(false);
  const audio = useRef(null), fadeId = useRef(0);
  const want = !!MUSIC.url && !muted;

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

  const start = useCallback(() => {
    const a = audio.current; if (!a) return;
    if (a.paused) {
      a.volume = 0;
      const p = a.play();
      if (p && p.then) p.then(() => fade(MUSIC.volume, MUSIC.fadeIn)).catch(() => { /* blocked: retried on first tap / key */ });
      else fade(MUSIC.volume, MUSIC.fadeIn);
    } else fade(MUSIC.volume, MUSIC.fadeIn);
  }, [fade]);

  useEffect(() => { // create once; when the page closes, fade out and stop
    if (!MUSIC.url) return undefined;
    const el = new Audio(MUSIC.url);
    el.loop = MUSIC.loop; el.preload = 'auto'; el.volume = 0;
    audio.current = el;
    return () => {
      clearInterval(fadeId.current); audio.current = null;
      const v0 = el.volume, t0 = performance.now(), ms = Math.max(1, MUSIC.fadeOut * 1000);
      const id = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        el.volume = Math.max(0, v0 * (1 - k));
        if (k === 1) { clearInterval(id); el.pause(); el.src = ''; }
      }, 50);
    };
  }, []);

  useEffect(() => { // on / off (mute button)
    const a = audio.current; if (!a) return;
    if (want) start(); else fade(0, MUSIC.fadeOut, () => a.pause());
  }, [want, start, fade]);

  useEffect(() => { // browser blocked sound: first tap / key press anywhere starts it
    if (!want) return undefined;
    const kick = () => { if (audio.current?.paused) start(); };
    const evs = ['pointerdown', 'keydown', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, kick, { passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, kick));
  }, [want, start]);

  return { enabled: SHOW_MUTE_BUTTON && !!MUSIC.url, muted, toggle: () => setMuted((m) => !m) };
}

export default function TimerPage() {
  const nav = useNavigate();
  const music = useMusic();
  const canvas = useRef(null), scene = useRef(null);
  const [clock, setClock] = useState(null);
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(null);
  const total = useRef(0);
  const leaving = useRef(false);

  useEffect(() => {
    try { scene.current = createTimerScene(canvas.current, undefined, { transparent: BACKGROUNDS.some((b) => b.url) }); } catch { /* no WebGL */ }
    return () => { scene.current?.dispose(); scene.current = null; };
  }, []);

  const go = () => { if (leaving.current) return; leaving.current = true; nav('/', { replace: true }); };

  const load = () => {
    setErr('');
    getTimer()
      .then((res) => {
        const t = parseTimer(res);
        if (t.unlocked) return go();                       // already open (also on reload)
        if (!Number.isFinite(t.at)) throw new Error('Timer data is missing.');
        setClock({ at: t.at, offset: t.offset });
      })
      .catch((e) => setErr(e.message || 'Cannot reach the server.'));
  };
  useEffect(load, []);

  useEffect(() => {
    if (!clock) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((clock.at - (Date.now() + clock.offset)) / 1000));
      if (!total.current && s > 0) total.current = s;
      setLeft(s);
      scene.current?.setSecondsLeft(s);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [clock]);

  const done = left === 0;
  // Countdown over -> burst, ask the SERVER, then redirect to '/' automatically (retries until it agrees)
  useEffect(() => {
    if (!done) return;
    scene.current?.burst();
    let stop = false;
    (async () => {
      while (!stop && !leaving.current) {
        try { if (parseTimer(await getTimer()).unlocked) { await new Promise((r) => setTimeout(r, 1200)); if (!stop) go(); return; } } catch { /* retry */ }
        await new Promise((r) => setTimeout(r, 1000));
      }
    })();
    return () => { stop = true; };
  }, [done]);

  let body;
  if (err) body = (<>
    <h1 className="tm-title">Hold on…</h1>
    <p className="tm-text tm-err" role="alert">{err}</p>
    <button className="tm-btn" onClick={load}>Try again</button>
  </>);
  else if (left === null) body = <p className="tm-text">Getting the clock ready…</p>;
  else {
    const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
    const copy = done ? READY : WAITING;
    let when = '';
    try { when = new Date(clock.at).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { /* ignore */ }
    const dayMax = Math.max(Math.ceil(total.current / 86400), 1);
    body = (<>
      <div className="tm-step">{copy.step}</div>
      <h1 className="tm-title">{copy.title}</h1>
      <p className="tm-text">{copy.text}</p>
      <div className="tm-count" role="timer" aria-label={done ? 'The wait is over' : `${d} days ${h} hours ${m} minutes ${s} seconds remaining`}>
        <Unit value={d} label="DAYS" frac={d / dayMax} wide={d > 99} />
        <Unit value={h} label="HOURS" frac={h / 24} />
        <Unit value={m} label="MINUTES" frac={m / 60} />
        <Unit value={s} label="SECONDS" frac={s / 60} />
      </div>
      {done ? <button className="tm-btn" onClick={go}>Enter Our World</button> : <div className="tm-when">{when}</div>}
    </>);
  }

  return (
    <div className="tm-page">
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="tm-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff7fd6" /><stop offset=".55" stopColor="#a77bff" /><stop offset="1" stopColor="#6f9bff" />
          </linearGradient>
        </defs>
      </svg>
      <Backgrounds />
      <canvas ref={canvas} className="tm-canvas" aria-hidden="true" />
      <header className="tm-brand">JustLove</header>
      <section className="tm-content">{body}</section>
      {music.enabled && (
        <button
          type="button"
          onClick={music.toggle}
          title={music.muted ? 'Turn music on' : 'Turn music off'}
          aria-label={music.muted ? 'Turn music on' : 'Turn music off'}
          style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 5, width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(10,6,28,.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: 0.75 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            {music.muted ? <><path d="m22 9-6 6" /><path d="m16 9 6 6" /></> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
          </svg>
        </button>
      )}
    </div>
  );
}