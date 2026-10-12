import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three'; // install exact version for identical look:  npm i three@0.128.0
import './Message.css';
import { useAuth } from './context/AuthContext';

/* ===== YOUR MESSAGE: edit the text below =====
   Leave an empty line between paragraphs (use \n\n inside the quotes). */
const TITLE = ''; /* optional small heading, e.g. "For you" - leave empty for none */
const myMESSAGE = [
  "Haan ji, toh finally aa gye yaha tak ☺️",

  "Sabse phele, So Sorry yaar kal raat ko ye deploy hone me error de ra tha bahut jada 🥺",

   "and Happy Birthday meri Pratibha ji ko 🥳✨",

  "Bhagwan se mein pray karta hu ki tmhe har cheez de jo tum chahte ho... and tmhare har kam me success mile... jisse hme koi bhi kabhi dikkat na ho 😂😂",

  "Toh batao madam ji, kaisa laga ye gift? 👀",

  "Umeed karte hai purse se toh behtar hi hoga 😂😅",

  "waise shayad ye dekh kar ab tum shayad dukhi ho gyi hogi 🥺, kyunki ab tm saare cheeze or yaad karoge ki har saal hm log tmhare birthday par kahi na kahi jate the, kuch na kuch karte the... khair ho sakta tum ro bhi 🥲... but meri mano toh rona fizul hai yaar 😏",

  "Tum un palo ki khushiyon ko feel karo ki kitta maja aaya tha jab ham log park gye the noida m, kitta maja kiya tha yaar... bowling, table tennis or na jane kya kuch or. Toh tm toh table tennis ko bat ball samaj ke khel re the 😂😂... khair jo bhi tha worth it tha 🥳",

  "So kulmilake saari baat or ye case batane ka matlb ye hai ki ye yaad hi hai jo hme dukhi time me bhi khush kar sakti hai, ki yaar mene ye bhi kiya hai 🙌",

  "Lekin tm rone me vishwash rakhti hmm, pagli ni toh 🙃... socho agar ye yaad hi na hoti, kya tm khush hoti jo kaam kar ri ho wo karti? Obvious hai nhi, kyunki in yaad ke wajah se hi hm apne kaam kar re ki dobara isse bhi acha kuch karenge saath, chinese khayenge saath 🫠",

  "Toh meri maniye madam ji, or sochiye ki hmara saath hmari yaade ye khushi hai, dukh nhi 🤗😊",

  "Shayad mene jada hi gyan de diya,",

  "waise mujhe uper ye sab likhte wakt mujhe khushi nhi hui. Kyunki mujhe lagta hai shayd tm royi ya emotional ho gyi hogi 🥲 or me bikul bhi nhi chahta tha ki aisa ho, khaas taur aaj ke din... but mujhe batana tha ki",

  "\"A GOOD LIFE IS A COLLECTION OF HAPPY MEMORIES ❤️\"",

  "Waise tumko pata hai mene ye kyu banaya? Kaha se ye idea aaya?",

  "Chahta toh sach mein koi purse de sakta tha ya or kuch jo or acha ho, bhut si cheez hai internet par. U know why this? 👀",

  "toh aisa tha mere dimag m kuch nhi tha aaj se 1.5-2 week phele, but suddenly yaad aaya ki biwi ji ka bday bhi toh aa ra hai, toh kiya jaye 🙃",

  "Waise mein chahta toh apne aap ko dena tha, or mast kahi ghumna, or aaram se kisi mast view ke samne sax sux karna... haye mere ye khayal ufff 🥵😁🤭",

  "khair ye ho nhi sakta tha , so leave it 👀...Haa toh phir mene socha ki mene toh kuch bhi bhut acha gift nhi diya, toh me chahta tha ki tumko kuch aisa du jo aaj tak na diya ho jo tum apne pass rakh sako ✨... toh sabse phele mene materialistic cheeze hata di, ewww 😂... toh phir pata nhi kaha se ye idea aaya, jane kya hua...",

  "So i keep thinking that what is going on? Because for that present I sacrificed my sleep, work even my trading as well and after few time I realised the only reason that pushed me to do such things is .....",
].join('\n\n');

const MESSAGE =
  'Some things are hard to say out loud, so I am writing them here, slowly, one letter at a time.\n\n' +
  'Meeting you was the quiet kind of luck that rearranges everything without making a sound. Since then, ordinary days have turned into small celebrations, and even the silences feel full. You make me braver than I knew I could be, and gentler too.\n\n' +
  'I want you to know that I notice everything: the way you laugh before the joke ends, the way you hum when you think no one is listening, the way you care for people without ever asking for credit. You are not just part of my life. You are the light I keep walking toward, even on the darkest nights.\n\n' +
  'So this is my promise: I will stay, I will listen, and I will love you in all the small ways that last.\n\n' +
  'Thank you for being you.\nAlways yours.';

const TYPE_SPEED = 2.5; /* TYPING SPEED of the main message: 1 = normal, 0.6 = faster, 1.4 = slower */
const START_DELAY = 1.6; /* seconds before typing begins */

/* ---- 1. TODAY'S DATE, typed as the first line of the message box ---- */
const SHOW_DATE = true; /* false = no date line */
const DATE_LOCALE = 'en-GB'; /* 'en-GB' -> Sunday 11 October 2026 | 'en-US' -> Sunday, October 11, 2026 | 'en-IN' */
const DATE_OPTIONS = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }; /* remove weekday for a shorter date */
const DATE_PREFIX = ''; /* optional text before the date, e.g. 'Dated: ' */

/* ---- 2. MUSIC: two slots. Paste a link (mp3 / ogg / wav) in `url`, leave '' to skip a slot.
   volume : 0 (silent) … 1 (full)
   repeat : 'loop'  = plays again and again until the shutters close
            1, 2, 3 = plays exactly that many times, then stops
   start  : 'open'  = AS SOON AS THE PAGE OPENS (if the browser blocks sound, at the visitor's first tap/key press)
            'tap'   = when the message icon is tapped
            'logo'  = when the logo word (SPECIAL_WORDS) starts being written
            'note'  = when the closing note appears
   fadeIn : seconds of fade-in
   Everything fades out by itself when the shutters close (MUSIC_FADE_OUT). */
const MUSIC = [
  { url: 'https://res.cloudinary.com/u3u7poti/video/upload/v1791728339/message-mussic-R_qan9sy.mp3', volume: 0.5, repeat: 'loop', start: 'open', fadeIn: 3 }, /* track 1 */
  { url: '', volume: 0.6, repeat: 1, start: 'logo', fadeIn: 2 }, /* track 2 */
];
const MUSIC_FADE_OUT = 1.6; /* seconds the music takes to fade away once the shutters start closing */

/* ---- 3. THE LOGO WORD ("JustLove"): comes after the message ends, stays, then scatters into dust ---- */
const SPECIAL_WORDS = 'JustLove'; /* the logo word, written in the centre after the message ends. "" for none */
const HERO_DELAY = 2; /* seconds to wait after the message ends, before the logo starts being written */
const LOGO_DRAW_TIME = 3; /* seconds the logo takes to be written (2 = quick, 4 = slow) */
const LOGO_HOLD = 1; /* seconds the finished logo stays on screen before it scatters */
const LOGO_SCATTER = true; /* true = dissolves into dust that blows away, false = simply fades out */

/* ---- 4. CLOSING NOTE ---- */
const NOTE_TOP_GAP = 8; /* how far from the top the note card sits, in % of screen height (bigger = lower; it was 3) */
const NOTE_TEXT =
  "I hope this made you smile, even for a moment. Every single word was written thinking of you. \n\n You mean the world to me, and sharing these little memories always brightens my day. I wanted to create something special just to remind you how much you matter. So tell me, how was it? 💛";
  /* closing note. Blank line (\n\n) = new paragraph. Emoji work. "" for none */
const SIGN_OFF = 'Signing off,'; /* small line above the signature */
const SIGN = 'Sahil'; /* your name: signed with a pen, then a dot */
const NOTE_SPEED = 1; /* TYPING SPEED of the closing note: 1 = normal, 0.7 = faster, 1.5 = slower */
const REDIRECT_TO = '/'; /* where to go when the shutters have closed (your login page) */
/* ================================================ */

export default function Message({ navHeight = 80 }) {
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;
  const {user} = useAuth();
  // console.log(user)
  /* weekday + date shown in the title bar, right side, on the same line as the 3 dots */
  const dateLine = SHOW_DATE
    ? DATE_PREFIX + new Date().toLocaleDateString(DATE_LOCALE, DATE_OPTIONS)
    : '';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const $ = (id) => root.querySelector('#mp-' + id);
    const NS = 'http://www.w3.org/2000/svg';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = () => root.clientWidth;
    const H = () => root.clientHeight;
    let disposed = false;
    let raf = 0;
    const timers = [];
    const listeners = [];
    const on = (target, ev, fn, opt) => {
      target.addEventListener(ev, fn, opt);
      listeners.push(() => target.removeEventListener(ev, fn, opt));
    };
    const later = (f, sec) => {
      timers.push(setTimeout(() => { if (!disposed) f(); }, sec * 1000));
    };
    const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    const gr = (x) => (seg ? Array.from(seg.segment(x), (o) => o.segment) : Array.from(x));
    const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

    /* ======================================================
       0. MUSIC (two slots, see MUSIC at the top)
       ====================================================== */
    const tracks = [];
    const vol01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
    const fadeTrack = (tr, to, sec, done) => {
      clearInterval(tr.fade);
      const v0 = tr.a.volume, t0 = performance.now(), ms = Math.max(1, sec * 1000);
      tr.fade = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        tr.a.volume = vol01(v0 + (to - v0) * k);
        if (k === 1) { clearInterval(tr.fade); if (done) done(); }
      }, 50);
    };
    const silentUnlock = (tr) => { /* plays at volume 0 once, so a later start (logo / note / tap) is allowed by the browser */
      if (tr.unlocked || tr.started || tr.stopped) return;
      tr.a.volume = 0;
      const p = tr.a.play();
      if (p && p.then) p.then(() => { tr.unlocked = true; if (!tr.started) { tr.a.pause(); tr.a.currentTime = 0; } }).catch(() => { });
    };
    let musicReady = false;
    const musicInit = () => {
      if (musicReady) return;
      musicReady = true;
      MUSIC.forEach((cfg) => {
        if (!cfg || !cfg.url) return;
        try {
          const a = new Audio(cfg.url);
          a.preload = 'auto';
          const loop = cfg.repeat === 'loop' || cfg.repeat === Infinity;
          const total = loop ? Infinity : Math.max(1, Math.floor(Number(cfg.repeat)) || 1);
          a.loop = loop;
          const tr = { a, cfg, total, played: 0, started: false, stopped: false, fade: 0 };
          if (!loop) {
            a.addEventListener('ended', () => {
              tr.played++;
              if (tr.played < total && !disposed && !tr.stopped) { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => { }); }
            });
          }
          tracks.push(tr);
          if ((cfg.start || 'open') !== 'open') silentUnlock(tr); /* unlock now, so it can start later without a new tap */
        } catch (e) { /* ignore */ }
      });
    };
    const startTracks = (when) => {
      tracks.forEach((tr) => {
        if (tr.started || tr.stopped || (tr.cfg.start || 'open') !== when) return;
        tr.started = true;
        try {
          tr.a.currentTime = 0; tr.a.volume = 0;
          const p = tr.a.play();
          /* the browser blocked sound (no tap yet): forget the start, it is retried on the first tap / key press */
          if (p && p.catch) p.catch(() => { clearInterval(tr.fade); tr.started = false; });
          fadeTrack(tr, vol01(tr.cfg.volume), tr.cfg.fadeIn == null ? 2 : tr.cfg.fadeIn);
        } catch (e) { tr.started = false; }
      });
    };
    const stopMusic = (sec) => { /* fade everything away */
      tracks.forEach((tr) => {
        tr.stopped = true;
        if (!tr.started) { tr.a.pause(); return; }
        fadeTrack(tr, 0, sec, () => { tr.a.pause(); });
      });
    };

    /* ======================================================
       1. TYPED MESSAGE (emoji-safe)
       ====================================================== */
    const msg = $('msg');
    const cur = $('cur');
    const scrollEl = $('scroll');
    let chars = [];
    let cum = [];
    let idx = 0;
    let tStart = performance.now();
    let done = false;
    let started = false;
    const msgBegin = () => { started = true; tStart = performance.now(); };

    let emo;
    try { emo = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { emo = null; }

    /* the date now lives in the title bar (top right, next to the 3 dots), so it is not typed here */
    const FULL_MESSAGE = user?.id==='owner'?myMESSAGE:MESSAGE;

    msg.querySelectorAll('.mp-para').forEach((p) => p.remove());
    {
      let t = 0;
      FULL_MESSAGE.split('\n').forEach((line) => {
        if (!line.trim()) return;
        const p = document.createElement('p');
        p.className = 'mp-para';
        const words = line.split(' ');
        words.forEach((wd, wi) => {
          const w = document.createElement('span');
          w.className = 'mp-w';
          const gs = gr(wd);
          for (let k = 0; k < gs.length; k++) {
            const ch = gs[k];
            const c = document.createElement('span');
            c.className = 'mp-c';
            c.textContent = ch;
            w.appendChild(c);
            let d = (34 + ((chars.length * 7919) % 23)) * TYPE_SPEED;
            if (ch.length === 1) {
              if (',;:'.indexOf(ch) > -1) d += 170 * TYPE_SPEED;
              if ('.!?'.indexOf(ch) > -1) d += 430 * TYPE_SPEED;
            }
            if (emo && emo.test(ch)) d += 160 * TYPE_SPEED;
            if (k === gs.length - 1) d += 22 * TYPE_SPEED;
            if (wi === words.length - 1 && k === gs.length - 1) d += 700 * TYPE_SPEED;
            t += d;
            chars.push(c);
            cum.push(t);
          }
          p.appendChild(w);
          if (wi < words.length - 1) p.appendChild(document.createTextNode(' '));
        });
        msg.insertBefore(p, cur);
      });
    }
    const count = (ms) => {
      let lo = 0, hi = cum.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] <= ms) lo = m + 1; else hi = m; }
      return lo;
    };
    const place = () => {
      if (!chars.length) return;
      const mr = msg.getBoundingClientRect();
      const el = idx > 0 ? chars[idx - 1] : chars[0];
      const r = el.getBoundingClientRect();
      const x = (idx > 0 ? r.right : r.left) - mr.left;
      const y = r.top - mr.top + (r.height - cur.offsetHeight) / 2;
      cur.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      const sr = scrollEl.getBoundingClientRect();
      if (idx > 0 && !done && (r.bottom > sr.bottom - 50 || r.top < sr.top)) {
        scrollEl.scrollTo({ top: scrollEl.scrollTop + (r.bottom - (sr.top + sr.height * 0.6)), behavior: 'smooth' });
      }
    };
    const finishTyping = () => { done = true; heroStart(); };
    const typeTick = () => {
      if (started && reduce && !done) {
        while (idx < chars.length) { chars[idx].classList.add('mp-on'); idx++; }
        finishTyping();
      }
      const el = started ? performance.now() - tStart - START_DELAY * 1000 : -1e9;
      if (!done && el >= 0) {
        const n = count(el);
        while (idx < n && idx < chars.length) { chars[idx].classList.add('mp-on'); idx++; }
        if (idx >= chars.length) finishTyping();
      }
      cur.classList.toggle('mp-show', el >= -400);
      place();
    };

    /* ======================================================
       2. THE STORY: words -> scatter -> note -> shutter -> navigate
       ====================================================== */
    const wrap = $('wrap'), hero = $('hero'), hsvg = $('hsvg'), hfill = $('hfill'), hline = $('hline'),
      hmask = $('hmask'), noteEl = $('note'), nsvg = $('nsvg'), nt2 = $('nt2'), smask = $('smask'),
      sdot = $('sdot'), nmsg = $('nmsg'), signoff = $('signoff'), letter = $('letter'), spark = $('spark');

    /* the note card sits a little lower (NOTE_TOP_GAP) - inline !important beats the stylesheet's !important */
    noteEl.style.setProperty('padding-top', 'calc(' + navHeight + 'px + ' + NOTE_TOP_GAP + 'vh)', 'important');
    letter.style.setProperty('max-height', 'calc(100vh - ' + navHeight + 'px - ' + (NOTE_TOP_GAP + 4) + 'vh)', 'important');

    function build(el, str, cls) {
      el.textContent = '';
      const out = [];
      let i = 0;
      gr((str || '').trim()).forEach((g) => {
        const ts = document.createElementNS(NS, 'tspan');
        if (g === ' ') {
          ts.textContent = '\u00A0';
        } else {
          ts.textContent = g;
          if (cls) ts.setAttribute('class', cls);
          out.push({ el: ts, i });
        }
        el.appendChild(ts);
        i += g.length;
      });
      return out;
    }
    function inkRight(str, size) { /* where the ink of the name really ends along the baseline */
      const pad = 60, Wd = Math.ceil(size * str.length * 1.4 + pad * 2), Hd = Math.ceil(size * 1.8);
      const c = document.createElement('canvas');
      c.width = Wd; c.height = Hd;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.font = size + 'px "Herr Von Muellerhoff","Mrs Saint Delafield","Brush Script MT",cursive';
      x.textBaseline = 'alphabetic';
      x.fillStyle = '#000';
      const by = Math.round(size * 1.2);
      x.fillText(str, pad, by);
      const d = x.getImageData(0, 0, Wd, Hd).data;
      let best = 0;
      const y0 = Math.max(0, Math.round(by - size * 0.2)), y1 = Math.min(Hd - 1, Math.round(by + size * 0.03));
      for (let y = y0; y <= y1; y++) {
        for (let xx = Wd - 1; xx > best + pad; xx--) {
          if (d[(y * Wd + xx) * 4 + 3] > 40) { if (xx - pad > best) best = xx - pad; break; }
        }
      }
      return best;
    }
    function fitTo(el, start, maxW) {
      el.setAttribute('font-size', start);
      const L = el.getComputedTextLength();
      let s = start;
      if (L > maxW) { s = Math.max(30, Math.floor((start * maxW) / L)); el.setAttribute('font-size', s); }
      return s;
    }

    const HERO_START = 0.1, HOLD = LOGO_HOLD; /* HOLD = seconds the finished words stay before they scatter */
    let STAG = 0.13, DUR = 0.95;
    let ready = false, hn = 0, heroL = [], heroSize = 190, drawEnd = 0, n2L = [], sigTotal = 0;
    let nchars = [], ncum = [], nDur = 0, nIdx = 0, nRev = false, nStart = 0;

    function buildNote() {
      nmsg.textContent = '';
      nchars = []; ncum = [];
      let t = 0;
      (NOTE_TEXT || '').split('\n').forEach((line) => {
        if (!line.trim()) return;
        const p = document.createElement('p');
        p.className = 'mp-npara';
        const words = line.split(' ');
        words.forEach((wd, wi) => {
          const w = document.createElement('span');
          w.className = 'mp-w';
          const gs = gr(wd);
          for (let k = 0; k < gs.length; k++) {
            const ch = gs[k];
            const c = document.createElement('span');
            c.className = 'mp-nc';
            c.textContent = ch;
            w.appendChild(c);
            let d = (24 + ((nchars.length * 7919) % 13)) * NOTE_SPEED;
            if (ch.length === 1) {
              if (',;:'.indexOf(ch) > -1) d += 130 * NOTE_SPEED;
              if ('.!?'.indexOf(ch) > -1) d += 320 * NOTE_SPEED;
            }
            if (k === gs.length - 1) d += 16 * NOTE_SPEED;
            if (wi === words.length - 1 && k === gs.length - 1) d += 380 * NOTE_SPEED;
            t += d;
            nchars.push(c); ncum.push(t);
          }
          p.appendChild(w);
          if (wi < words.length - 1) p.appendChild(document.createTextNode(' '));
        });
        nmsg.appendChild(p);
      });
      nDur = t / 1000;
    }
    function setup() {
      heroL = build(hfill, SPECIAL_WORDS, null);
      const hm = build(hmask, SPECIAL_WORDS, 'mp-ml');
      const hl = build(hline, SPECIAL_WORDS, 'mp-hl');
      hn = hm.length;
      if (hn) {
        DUR = LOGO_DRAW_TIME * 0.5;
        STAG = Math.max(0.02, (LOGO_DRAW_TIME - HERO_START - DUR) / Math.max(1, hn - 1));
      }
      if (hn) {
        heroSize = fitTo(hfill, 190, 900);
        const y = Math.round(150 + heroSize * 0.28);
        [hfill, hline, hmask].forEach((e) => { e.setAttribute('font-size', heroSize); e.setAttribute('y', y); });
        hsvg.style.setProperty('--mp-d', Math.round(heroSize * 7));
        hsvg.style.setProperty('--mp-sw', Math.max(9, Math.round(heroSize * 0.085)));
        hm.forEach((e, k) => {
          const d = (HERO_START + k * STAG).toFixed(2) + 's';
          e.el.style.setProperty('--mp-dl', d); e.el.style.setProperty('--mp-dur', DUR + 's');
          hl[k].el.style.setProperty('--mp-dl', d); hl[k].el.style.setProperty('--mp-dur', DUR + 's');
        });
        drawEnd = HERO_START + (hn - 1) * STAG + DUR;
        try {
          const bb = hfill.getBBox(), j1 = $('jd1'), j2 = $('jd2');
          j1.setAttribute('cx', (bb.x + bb.width * 0.2).toFixed(1)); j1.setAttribute('cy', (y - heroSize * 0.08).toFixed(1));
          j2.setAttribute('cx', (bb.x + bb.width * 0.85).toFixed(1)); j2.setAttribute('cy', (y + heroSize * 0.12).toFixed(1));
          j1.style.setProperty('--mp-dd', (drawEnd - 0.1).toFixed(2) + 's'); j2.style.setProperty('--mp-dd', (drawEnd + 0.15).toFixed(2) + 's');
        } catch (e) { /* ignore */ }
      }
      /* closing note: pen font, "Signing off,", then the name written with a pen and a dot */
      buildNote();
      signoff.textContent = SIGN_OFF || '';
      n2L = build(smask, SIGN, 'mp-ml2');
      build(nt2, SIGN, null);
      if (n2L.length) {
        const sz = fitTo(nt2, 190, 640);
        smask.setAttribute('font-size', sz);
        const yy = Math.round(205 + (190 - sz) * 0.1);
        nt2.setAttribute('y', yy); smask.setAttribute('y', yy);
        nsvg.style.setProperty('--mp-d', Math.round(sz * 7));
        nsvg.style.setProperty('--mp-sw', Math.max(10, Math.round(sz * 0.075)));
        const rr = Math.max(4, Math.round(sz * 0.03));
        try {
          const ink = inkRight(SIGN.trim(), sz);
          sdot.setAttribute('cx', (30 + ink + sz * 0.045 + rr).toFixed(1));
          const vbw = Math.ceil(30 + ink + sz * 0.045 + rr * 2 + 24);
          nsvg.setAttribute('viewBox', '0 0 ' + vbw + ' 300');
          nsvg.style.aspectRatio = vbw + ' / 300';
          nsvg.style.width = 'calc(min(460px,80%) * ' + (vbw / 1000).toFixed(3) + ')';
          sdot.setAttribute('cy', (yy - rr * 1.1).toFixed(1)); sdot.setAttribute('r', rr);
        } catch (e) {
          try {
            const en = nt2.getEndPositionOfChar(SIGN.trim().length - 1);
            sdot.setAttribute('cx', (en.x - sz * 0.1).toFixed(1));
            sdot.setAttribute('cy', (yy - rr * 1.1).toFixed(1)); sdot.setAttribute('r', rr);
          } catch (e2) { sdot.style.display = 'none'; }
        }
      }
      const D2 = 1.4, ST2 = 0.34;
      let at = 0.2;
      n2L.forEach((l, k) => {
        l.el.style.setProperty('--mp-dl', (at + k * ST2).toFixed(2) + 's');
        l.el.style.setProperty('--mp-dur', D2 + 's');
      });
      if (n2L.length) at += (n2L.length - 1) * ST2 + D2 + 0.25;
      nsvg.style.setProperty('--mp-dd', at.toFixed(2) + 's');
      sdot.style.display = n2L.length ? '' : 'none';
      sigTotal = at + 1.2;
      ready = true;
    }

    function fitNote() {
      let sz = Math.round(Math.min(34, Math.max(22, W() * 0.03)));
      const min = 18;
      const room = () => H() - navHeight - (H() * (NOTE_TOP_GAP + 4)) / 100; /* space left under the lowered card */
      nmsg.style.fontSize = sz + 'px';
      while (sz > min && letter.offsetHeight > room()) { sz--; nmsg.style.fontSize = sz + 'px'; }
    }
    function noteTick(now) {
      if (!nRev) return;
      const el = now - nStart;
      if (el < 0) return;
      let lo = 0, hi = ncum.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (ncum[m] <= el) lo = m + 1; else hi = m; }
      while (nIdx < lo && nIdx < nchars.length) { nchars[nIdx].classList.add('mp-on'); nIdx++; }
      if (nIdx >= nchars.length) nRev = false;
    }

    /* ---- the words dissolve into dust that blows across the screen ---- */
    const sc = spark.getContext('2d');
    let P = [], dpr = 1, sT0 = 0, lastP = 0;
    const COLS_ = ['255,255,255', '255,215,130', '255,190,80', '255,236,190'];
    const sizeSpark = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      spark.width = W() * dpr;
      spark.height = H() * dpr;
    };
    sizeSpark();
    on(window, 'resize', sizeSpark);

    function sample() {
      P = [];
      if (reduce || !hn) return;
      const rr = root.getBoundingClientRect();
      const r = hsvg.getBoundingClientRect();
      const Wd = Math.ceil(r.width), Hd = Math.ceil(r.height), f = r.width / 1000;
      const ox = r.left - rr.left, oy = r.top - rr.top; /* position inside the root panel (below navbar) */
      const cv = document.createElement('canvas');
      cv.width = Wd; cv.height = Hd;
      const x = cv.getContext('2d', { willReadFrequently: true });
      x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      x.font = heroSize * f + 'px "Great Vibes"';
      x.lineJoin = 'round'; x.lineWidth = 3.4 * f; x.strokeStyle = '#fff'; x.fillStyle = '#fff';
      heroL.forEach((l) => {
        try {
          const p = hfill.getStartPositionOfChar(l.i);
          x.strokeText(l.el.textContent, p.x * f, p.y * f);
          x.fillText(l.el.textContent, p.x * f, p.y * f);
        } catch (e) { /* ignore */ }
      });
      const d = x.getImageData(0, 0, Wd, Hd).data;
      let c = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 128) c++;
      const st = Math.max(1, Math.round(Math.sqrt(c / 6000)));
      const cx = ox + Wd / 2, cy = oy + Hd / 2;
      for (let yy = 0; yy < Hd; yy += st) {
        for (let xx = 0; xx < Wd; xx += st) {
          if (d[(yy * Wd + xx) * 4 + 3] > 128) {
            const px = ox + xx + Math.random() * st, py = oy + yy + Math.random() * st;
            const ang = Math.atan2(py - cy, px - cx) + (Math.random() - 0.5);
            const spd = 40 + Math.pow(Math.random(), 2) * 380;
            P.push({
              x: px, y: py,
              vx: Math.cos(ang) * spd + 60 + Math.random() * 110,
              vy: Math.sin(ang) * spd - Math.random() * 60,
              d: (xx / Wd) * 0.8 + Math.random() * 0.2,
              life: 2.8 + Math.random() * 2.6,
              s: 0.9 + Math.random() * 1.8,
              g: Math.floor(Math.random() * 4),
              t: 0,
            });
          }
        }
      }
    }
    function drawP(now) {
      const dt = Math.min(0.05, (now - lastP) / 1000);
      lastP = now;
      sc.setTransform(dpr, 0, 0, dpr, 0, 0);
      sc.clearRect(0, 0, W(), H());
      if (!P.length) return;
      const age = (now - sT0) / 1000;
      let a;
      sc.globalCompositeOperation = 'lighter';
      for (let g = 0; g < 4; g++) {
        sc.fillStyle = 'rgb(' + COLS_[g] + ')';
        for (let i = 0; i < P.length; i++) {
          const p = P[i];
          if (p.g !== g) continue;
          if (age < p.d) {
            a = 0.95;
          } else {
            p.t += dt;
            p.vx += Math.sin(p.y * 0.012 + p.t * 1.4) * 40 * dt;
            p.vy += Math.cos(p.x * 0.01 + p.t * 1.2) * 28 * dt - 10 * dt;
            const dr = 1 - dt * 0.6;
            p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt;
            a = (1 - sm((p.t / p.life - 0.5) / 0.5)) * (0.72 + 0.28 * Math.sin(p.t * 8 + p.d * 30));
          }
          if (a > 0.01) { sc.globalAlpha = a; sc.fillRect(p.x, p.y, p.s, p.s); }
        }
      }
      sc.globalAlpha = 1;
      for (let i = P.length - 1; i >= 0; i--) {
        if (age >= P[i].d && P[i].t > P[i].life) { P[i] = P[P.length - 1]; P.pop(); }
      }
    }

    /* ---- the story, one step after another ---- */
    function run() { /* 1. light blur, the words are drawn */
      startTracks('logo');
      root.classList.add('mp-focus', 'mp-told');
      hsvg.classList.remove('mp-go');
      hero.classList.remove('mp-out');
      void hsvg.getBoundingClientRect();
      hsvg.classList.add('mp-go');
      later(scatter, drawEnd + 0.9 + HOLD);
    }
    function scatter() { /* 2. wait a few seconds, then they scatter (or just fade, see LOGO_SCATTER) */
      if (LOGO_SCATTER) sample(); else P = [];
      sT0 = performance.now();
      hero.classList.add('mp-out');
      root.classList.remove('mp-focus');
      wrap.classList.add('mp-gone');
      waitDust();
    }
    function waitDust() { /* the note only fades in once every particle has faded out */
      const t0 = performance.now();
      (function chk() {
        if (disposed) return;
        if (!P.length || performance.now() - t0 > 14000) later(startNote, reduce ? 0.1 : 0.6);
        else timers.push(setTimeout(chk, 150));
      })();
    }
    function startNote() { /* 3. closing note, "Signing off,", name signed with a pen, then a dot */
      startTracks('logo'); /* in case there was no logo word, a 'logo' track still starts here */
      startTracks('note');
      if (!nchars.length && !n2L.length) { shutter(); return; }
      fitNote();
      noteEl.classList.add('mp-show');
      nIdx = 0;
      const lead = 0.9, m = nchars.length ? nDur : 0;
      nStart = performance.now() + lead * 1000;
      nRev = nchars.length > 0;
      later(() => signoff.classList.add('mp-on'), lead + m + 0.5);
      later(() => { nsvg.classList.remove('mp-go'); void nsvg.getBoundingClientRect(); nsvg.classList.add('mp-go'); }, lead + m + 1.5);
      later(shutter, lead + m + 1.5 + sigTotal + 2.8);
    }
    function shutter() { /* 4. shutters close from top and bottom, the music fades out, then we go to the login page */
      root.classList.add('mp-close');
      stopMusic(MUSIC_FADE_OUT);
      later(() => navRef.current(REDIRECT_TO), reduce ? 0.1 : Math.max(1.7, MUSIC_FADE_OUT + 0.1));
    }
    function heroStart() {
      if (!ready) { later(heroStart, 0.5); return; }
      if (hn) later(run, reduce ? 0.4 : HERO_DELAY);
      else later(startNote, 0.8);
    }

    let booted = false;
    const boot = () => { if (booted || disposed) return; booted = true; setup(); };
    later(boot, 2.5);
    (document.fonts && document.fonts.load
      ? Promise.all([
          document.fonts.load('190px "Great Vibes"'),
          document.fonts.load('190px "Herr Von Muellerhoff"'),
          document.fonts.load('26px "Caveat"'),
        ])
      : Promise.resolve()
    ).then(boot, boot);

    /* ======================================================
       3. FLOATING MESSAGE ICON: tap it, it slides to the bottom right, then the message is written
       ====================================================== */
    const mi = $('mi'), lab = $('milab');
    let opened = false;
    function layout() {
      const S = mi.offsetWidth;
      const s = Math.min(2.2, Math.max(1.5, Math.min(W(), H()) / 340));
      const cx = mi.offsetLeft + S / 2, cy = mi.offsetTop + S / 2, ty = H() * 0.46;
      mi.style.setProperty('--mp-tx', W() / 2 - cx + 'px');
      mi.style.setProperty('--mp-ty', ty - cy + 'px');
      mi.style.setProperty('--mp-s', s);
      lab.style.setProperty('--mp-ly', ty + (S * s) / 2 + 36 + 'px');
    }
    function openIcon() {
      if (opened) return;
      opened = true;
      musicInit();
      startTracks('open'); /* normally already playing; this only matters if the browser had blocked it */
      startTracks('tap');
      mi.classList.remove('mp-center');
      mi.classList.add('mp-opened');
      lab.classList.remove('mp-on');
      later(() => wrap.classList.remove('mp-pre'), 0.65);
      later(() => mi.classList.add('mp-read'), 1);
      msgBegin();
    }
    on(mi, 'click', openIcon);
    /* safety net: if any other layer of your app sits on top and eats the click,
       still open when the tap lands on the icon's area */
    on(window, 'click', (e) => {
      if (opened) return;
      const r = mi.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) openIcon();
    }, true);
    on(window, 'resize', layout);
    layout();
    void mi.offsetWidth;
    mi.classList.remove('mp-snap');
    mi.classList.add('mp-ready');
    lab.classList.add('mp-on');

    /* MUSIC STARTS WHEN THE PAGE OPENS. Coming from another page of the site works straight away (the visitor already tapped there).
       On a fresh load / reload the browser may refuse sound until a tap, so the first tap / key press anywhere starts it. */
    const kick = () => { musicInit(); startTracks('open'); tracks.forEach(silentUnlock); };
    kick();
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => on(window, ev, kick, { passive: true }));

    /* ======================================================
       4. 3D SCENE: black space with a faint silver wave field + drifting hearts
       ====================================================== */
    const cvs = $('c');
    const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 1);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.02);
    const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    const tex = (st) => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      st.forEach((s) => g.addColorStop(s[0], s[1]));
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    };
    const tBok = tex([[0, 'rgba(255,255,255,.3)'], [0.78, 'rgba(255,255,255,.45)'], [0.9, 'rgba(255,255,255,.15)'], [1, 'rgba(255,255,255,0)']]);

    const GCOLS = 170, GROWS = 110, NP = GCOLS * GROWS;
    const gx = new Float32Array(NP), gz = new Float32Array(NP), gp = new Float32Array(NP * 3), gc = new Float32Array(NP * 3);
    for (let j = 0; j < GROWS; j++) {
      for (let i = 0; i < GCOLS; i++) {
        const k = j * GCOLS + i;
        gx[k] = (i / (GCOLS - 1) - 0.5) * 100;
        gz[k] = 8 - (j / (GROWS - 1)) * 80;
        gp[k * 3] = gx[k]; gp[k * 3 + 2] = gz[k];
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
    const field = new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    field.frustumCulled = false;
    scene.add(field);
    const wave = (t) => {
      for (let k = 0; k < NP; k++) {
        const x = gx[k], z = gz[k];
        const y = Math.sin(x * 0.22 + t * 0.7) * 0.9 + Math.cos(z * 0.28 + t * 0.5) * 0.9 + Math.sin((x + z) * 0.11 + t * 0.35) * 0.8;
        const h = Math.min(1, Math.max(0, (y + 2.6) / 5.2)), k3 = k * 3, b = 0.1 + 0.5 * h * h;
        gp[k3 + 1] = -7 + y;
        gc[k3] = b * 0.9; gc[k3 + 1] = b * 0.95; gc[k3 + 2] = b;
      }
      gg.attributes.position.needsUpdate = true;
      gg.attributes.color.needsUpdate = true;
    };

    const SN = 1500, sp = new Float32Array(SN * 3);
    for (let s = 0; s < SN; s++) {
      sp[s * 3] = (Math.random() - 0.5) * 160;
      sp[s * 3 + 1] = Math.random() * 60 - 6;
      sp[s * 3 + 2] = -30 - Math.random() * 90;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
    scene.add(stars);

    const orbs = [];
    for (let o = 0; o < 14; o++) {
      const os = new THREE.Sprite(new THREE.SpriteMaterial({ map: tBok, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
      os.userData = { x: (Math.random() - 0.5) * 46, y: Math.random() * 36, z: -2 - Math.random() * 26, sz: 1.2 + Math.random() * 3.2, sp: 0.2 + Math.random() * 0.3 };
      os.material.opacity = 0.03 + Math.random() * 0.04;
      os.scale.setScalar(os.userData.sz);
      scene.add(os);
      orbs.push(os);
    }

    /* light-coloured hearts drifting from bottom to top, forever */
    const hcv = document.createElement('canvas');
    hcv.width = hcv.height = 128;
    const hx = hcv.getContext('2d');
    hx.beginPath();
    for (let a = 0; a <= 6.2832; a += 0.05) {
      const X = 16 * Math.pow(Math.sin(a), 3);
      const Y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      const px = 64 + X * 2.6, py = 64 - (Y + 2.5) * 2.6;
      if (a === 0) hx.moveTo(px, py); else hx.lineTo(px, py);
    }
    hx.closePath();
    hx.shadowColor = '#fff'; hx.shadowBlur = 14;
    const hg2 = hx.createRadialGradient(54, 50, 4, 64, 64, 56);
    hg2.addColorStop(0, 'rgba(255,255,255,1)'); hg2.addColorStop(1, 'rgba(255,255,255,.8)');
    hx.fillStyle = hg2; hx.fill();
    const heartTex = new THREE.CanvasTexture(hcv);
    const HCOL = [0xffe2a0, 0xffd27a, 0xfff0c8, 0xffc65c, 0xffe9b8];
    const hearts = [];
    for (let hh = 0; hh < 34; hh++) {
      const hmat = new THREE.SpriteMaterial({ map: heartTex, color: HCOL[hh % 5], blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 });
      const hs2 = new THREE.Sprite(hmat);
      hs2.userData = { fx: Math.random() * 2 - 1, z: -3 - Math.random() * 20, p: Math.random(), sp: 0.04 + Math.random() * 0.04, sz: 0.7 + Math.random() * 1.5, pk: 0.25 + Math.random() * 0.35, ph: Math.random() * 6.28 };
      scene.add(hs2);
      hearts.push(hs2);
    }

    const resize = () => {
      const w = W(), h = H();
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    on(window, 'resize', resize);
    resize();

    const card = $('card');
    let nx = 0, ny = 0, scx = 0, scy = 0;
    on(window, 'pointermove', (e) => {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    on(window, 'pointerleave', () => { nx = 0; ny = 0; });
    wave(0);
    const sceneFrame = () => {
      const t = reduce ? 0 : performance.now() / 1000;
      if (!reduce) wave(t);
      scx += (nx - scx) * 0.06;
      scy += (ny - scy) * 0.06;
      cam.position.set(scx * 2.6 + Math.sin(t * 0.12) * 1.2, 1.8 - scy * 1.2 + Math.cos(t * 0.1) * 0.4, 16);
      cam.lookAt(0, -2.5, -8);
      stars.rotation.y = t * 0.004;
      hearts.forEach((s) => {
        const d = s.userData, dist = 16 - d.z, half = dist * 0.52, yy = (d.p + t * d.sp) % 1, Hc = 2 * half + 4;
        s.position.set(d.fx * half * cam.aspect * 0.95 + Math.sin(t * 0.5 + d.ph) * 0.6, (yy - 0.5) * Hc + 1, d.z);
        s.scale.setScalar(d.sz);
        s.material.rotation = Math.sin(t * 0.6 + d.ph) * 0.3;
        s.material.opacity = d.pk * Math.pow(Math.sin(Math.PI * yy), 0.7);
      });
      orbs.forEach((s) => {
        const d = s.userData;
        s.position.set(d.x + Math.sin(t * 0.2 + d.z) * 1.5, ((d.y + t * d.sp) % 36) - 12, d.z);
      });
      if (!reduce) {
        card.style.transform = 'rotateX(' + -scy * 3.5 + 'deg) rotateY(' + scx * 5 + 'deg) translateY(' + Math.sin(t * 0.8) * 4 + 'px)';
        card.style.setProperty('--mp-lx', 50 + scx * 35 + '%');
        card.style.setProperty('--mp-ly', 30 + scy * 30 + '%');
      }
      renderer.render(scene, cam);
    };

    /* ======================================================
       MASTER LOOP
       ====================================================== */
    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      typeTick();
      drawP(now);
      noteTick(now);
      sceneFrame();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    /* ======================================================
       CLEANUP (also makes React StrictMode safe)
       ====================================================== */
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      listeners.forEach((off) => off());
      tracks.forEach((tr) => { clearInterval(tr.fade); tr.a.pause(); tr.a.src = ''; });
      msg.querySelectorAll('.mp-para').forEach((p) => p.remove());
      nmsg.textContent = '';
      root.className = 'mp-root';
      wrap.className = 'mp-pre';
      mi.className = 'mp-center mp-snap';
      lab.className = '';
      hero.className = '';
      noteEl.className = '';
      nsvg.removeAttribute('class');
      hsvg.removeAttribute('class');
      signoff.className = '';
      card.style.transform = '';
      gg.dispose(); sg.dispose(); heartTex.dispose(); tBok.dispose();
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    };
  }, []);

  return (
    <div className="mp-root" ref={rootRef} style={{ '--mp-nav-h': navHeight + 'px' }}>
      <canvas id="mp-c" aria-hidden="true" />
      <div id="mp-vig" aria-hidden="true" />

      <button id="mp-mi" className="mp-center mp-snap" type="button" aria-label="1 new message. Open it">
        <span className="mp-mi-in">
          <span className="mp-mi-halo" />
          <span className="mp-mi-halo mp-b" />
          <span className="mp-mi-face">
            <svg className="mp-mi-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5.2 4h13.6A2.2 2.2 0 0 1 21 6.2v8.6a2.2 2.2 0 0 1-2.2 2.2H11l-4.3 3.6c-.5.4-1.2.1-1.2-.6V17h-.3A2.2 2.2 0 0 1 3 14.8V6.2A2.2 2.2 0 0 1 5.2 4z" fill="#f1efec" />
              <circle cx="8.4" cy="10.5" r="1.25" fill="#0b0b0e" />
              <circle cx="12" cy="10.5" r="1.25" fill="#0b0b0e" />
              <circle cx="15.6" cy="10.5" r="1.25" fill="#0b0b0e" />
            </svg>
          </span>
          <span className="mp-mi-badge" aria-hidden="true">1</span>
        </span>
      </button>
      <div id="mp-milab" aria-hidden="true"><b className="mp-milab-title">1 new message</b>Tap to open</div>

      <div id="mp-wrap" className="mp-pre">
        <div id="mp-stage">
          <div id="mp-card">
            <div id="mp-bar" aria-hidden="true"><i className="mp-dot" /><i className="mp-dot" /><i className="mp-dot" />
              {dateLine ? (
                <span
                  id="mp-date"
                  style={{
                    marginLeft: 'auto',
                    alignSelf: 'center',
                    fontFamily: "'Courier Prime','Courier New',Courier,monospace",
                    fontSize: '.8rem',
                    lineHeight: 1,
                    letterSpacing: '.06em',
                    color: '#8d8d95',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dateLine}
                </span>
              ) : null}
            </div>
            <div id="mp-scroll">
              {TITLE ? <h1 id="mp-title">{TITLE}</h1> : null}
              <div id="mp-msg" aria-hidden="true"><span id="mp-cur" /></div>
            </div>
          </div>
        </div>
      </div>

      <div id="mp-blur" aria-hidden="true" />
      <div id="mp-focus" aria-hidden="true">
        <div id="mp-hero">
          <svg id="mp-hsvg" viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="mp-hg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0" spreadMethod="reflect">
                <stop offset="0" stopColor="#fdf0d2" />
                <stop offset=".3" stopColor="#f6dca4" />
                <stop offset=".65" stopColor="#fff1d4" />
                <stop offset="1" stopColor="#fbe7c0" />
              </linearGradient>
              <linearGradient id="mp-og" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0" spreadMethod="reflect">
                <stop offset="0" stopColor="#ffeec8" />
                <stop offset=".35" stopColor="#f7d28a" />
                <stop offset=".7" stopColor="#ffe7b0" />
                <stop offset="1" stopColor="#e8b866" />
                <animateTransform attributeName="gradientTransform" type="translate" values="-300 0;300 0;-300 0" dur="8s" repeatCount="indefinite" />
              </linearGradient>
              <mask id="mp-hm" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="700">
                <text id="mp-hmask" x="500" y="205" textAnchor="middle" fontSize="190" fill="#fff" />
              </mask>
              <radialGradient id="mp-jg">
                <stop offset="0" stopColor="#fffbe9" />
                <stop offset=".3" stopColor="#ffe0a0" />
                <stop offset="1" stopColor="#ffc766" stopOpacity="0" />
              </radialGradient>
            </defs>
            <text id="mp-hfill" x="500" y="205" textAnchor="middle" fontSize="190" fill="url(#mp-hg)" mask="url(#mp-hm)" />
            <text id="mp-hline" x="500" y="205" textAnchor="middle" fontSize="190" />
            <circle className="mp-jdot" id="mp-jd1" r="17" fill="url(#mp-jg)" />
            <circle className="mp-jdot" id="mp-jd2" r="15" fill="url(#mp-jg)" />
          </svg>
        </div>
      </div>

      <div id="mp-note" aria-hidden="true">
        <div className="mp-letter" id="mp-letter">
          <i className="mp-tape" />
          <div id="mp-nmsg" />
          <p id="mp-signoff" />
          <svg id="mp-nsvg" viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="mp-sm" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="700">
                <text id="mp-smask" x="30" y="205" fontSize="190" fill="#fff" />
              </mask>
            </defs>
            <g transform="rotate(-4 300 205)">
              <text id="mp-nt2" x="30" y="205" fontSize="190" fill="#1d2438" mask="url(#mp-sm)" />
              <circle id="mp-sdot" r="7" fill="#1d2438" />
            </g>
          </svg>
        </div>
      </div>

      <canvas id="mp-spark" aria-hidden="true" />

      <div className="mp-shut mp-top" aria-hidden="true" />
      <div className="mp-shut mp-bot" aria-hidden="true" />
      <div id="mp-seam" aria-hidden="true" />

      <p id="mp-sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {(TITLE ? TITLE + '. ' : '') + MESSAGE}
      </p>
    </div>
  );
}