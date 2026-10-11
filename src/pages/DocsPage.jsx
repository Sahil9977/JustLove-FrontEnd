import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three'; // npm i three@0.128.0
import { DOC } from './docsContent';
import './DocsPage.css';

const reduceMotion = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/* card that tilts in 3D under the pointer */
function TiltCard({ title, children }) {
  const ref = useRef(null);
  const onMove = (e) => {
    if (reduceMotion()) return;
    const el = ref.current,
      r = el.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${-y * 10}deg) rotateY(${x * 12}deg) translateZ(8px)`;
  };
  const onLeave = () => {
    ref.current.style.transform = '';
  };
  return (
    <div className="dp-card" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
      <span className="dp-card-title">{title}</span>
      <div className="dp-card-text">{children}</div>
    </div>
  );
}

/* tiny inline markup: **bold** and *italic* (rendered with classed spans, not tags) */
function rich(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('**')) return <span key={i} className="dp-b">{part.slice(2, -2)}</span>;
    if (part.startsWith('*')) return <span key={i} className="dp-i">{part.slice(1, -1)}</span>;
    return part;
  });
}

function Block({ block }) {
  if (block.p) return <div className="dp-p">{rich(block.p)}</div>;
  if (block.note) return <div className="dp-note">{rich(block.note)}</div>;
  if (block.quote) return <div className="dp-quote">{rich(block.quote)}</div>;
  if (block.terms)
    return (
      <div className="dp-grid">
        {block.terms.map(([label, text]) => (
          <TiltCard key={label} title={label}>
            {rich(text)}
          </TiltCard>
        ))}
      </div>
    );
  return null;
}

export default function DocsPage({
  footerText = 'Love is larger than marriage, and marriage is only one expression of love.',
  brand = 'JustLove', // text logo; pass `logo` to use your own element/component instead
  logo, // optional React node, e.g. <MyLogo />
  action, // optional React node replacing the Lock button; pass false to hide it
  lockText = 'Lock',
  onLock = () => {}, // called when the built-in Lock button is clicked
  showHeader = false, // your app already has a header with logo + Lock, so this is off
  topGap = 96, // px kept free at the top for your app's header (logo + Lock button)
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const [active, setActive] = useState('dp-' + DOC.sections[0].id);

  /* ---------- 3D background ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const reduce = reduceMotion();
    const R = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    R.setClearColor(0x000000, 1);
    const S = new THREE.Scene();
    const C = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    C.position.z = 14;

    const disposables = [];
    const wire = (geo, opacity, x) => {
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity });
      const edges = new THREE.EdgesGeometry(geo);
      const m = new THREE.LineSegments(edges, mat);
      m.position.x = x;
      S.add(m);
      disposables.push(geo, edges, mat);
      return m;
    };
    const a = wire(new THREE.IcosahedronGeometry(4, 1), 0.28, 6),
      b = wire(new THREE.OctahedronGeometry(7, 0), 0.1, 6),
      c = wire(new THREE.TorusGeometry(2, 0.5, 10, 40), 0.14, -9);
    c.position.y = -5;

    const N = 1400,
      p = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) p[i] = (Math.random() - 0.5) * 70;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pm = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const pts = new THREE.Points(g, pm);
    S.add(pts);
    disposables.push(g, pm);

    const resize = () => {
      const r = canvasRef.current.getBoundingClientRect();
      const w = Math.max(1, r.width),
        h = Math.max(1, r.height);
      R.setSize(w, h, false);
      C.aspect = w / h;
      C.updateProjectionMatrix();
      a.position.x = b.position.x = innerWidth < 860 ? -3 : 6;
    };
    addEventListener('resize', resize);
    resize();

    let mx = 0,
      my = 0,
      cx = 0,
      cy = 0,
      raf = 0;
    const onMove = (e) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
    };
    addEventListener('pointermove', onMove);

    const frame = () => {
      const t = reduce ? 0 : performance.now() / 1000,
        sc = root.scrollTop / 1000;
      cx += (mx - cx) * 0.05;
      cy += (my - cy) * 0.05;
      a.rotation.set(t * 0.15 + sc + cy, t * 0.2 + cx * 2, 0);
      b.rotation.set(-t * 0.1, t * 0.12 - sc, 0);
      c.rotation.set(t * 0.3, t * 0.2 + sc * 2, 0);
      pts.rotation.y = t * 0.01 + sc * 0.2;
      C.position.x = cx * 3;
      C.position.y = -cy * 2 - sc * 1.2;
      C.lookAt(0, -sc * 1.2, 0);
      R.render(S, C);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', onMove);
      disposables.forEach((d) => d.dispose());
      R.dispose();
    };
  }, []);

  /* ---------- keep scrolling alive inside this page ----------
     Host apps sometimes run smooth-scroll libraries or global wheel/touch
     handlers that call preventDefault() or swallow the event. We (1) keep those
     handlers from seeing events that start inside this page, and (2) if the
     browser still did not scroll, scroll the page ourselves. */
  useEffect(() => {
    const root = rootRef.current;
    const px = (e) =>
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * root.clientHeight : e.deltaY;
    const atEdge = (d) =>
      (d < 0 && root.scrollTop <= 0) ||
      (d > 0 && root.scrollTop + root.clientHeight >= root.scrollHeight - 1);
    const by = (d) => root.scrollBy({ top: d, left: 0, behavior: 'auto' });

    const onWheel = (e) => {
      e.stopPropagation();
      if (e.ctrlKey) return; // pinch-zoom
      const d = px(e);
      if (!d) return;
      if (e.defaultPrevented) {
        by(d); // something earlier cancelled the native scroll
        return;
      }
      const before = root.scrollTop;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (root.scrollTop === before && !atEdge(d)) by(d); // native scroll did not move
        })
      );
    };

    let lastY = null;
    const onTouchStart = (e) => {
      lastY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      e.stopPropagation();
      const y = e.touches[0].clientY;
      if (e.defaultPrevented && lastY !== null) by(lastY - y);
      lastY = y;
    };

    root.addEventListener('wheel', onWheel, { passive: true });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  /* ---------- scroll reveal + active nav ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const secs = root.querySelectorAll('.dp-section');
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        }),
      { rootMargin: '-30% 0px -55% 0px' }
    );
    const io2 = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('dp-in');
        }),
      { threshold: 0.1 }
    );
    secs.forEach((s) => {
      io.observe(s);
      io2.observe(s);
    });
    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, []);

  const go = (id) => (e) => {
    e.preventDefault();
    const el = rootRef.current.querySelector('#dp-' + id);
    if (el) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    setActive('dp-' + id);
  };

  return (
    <div
      className="dp-root"
      ref={rootRef}
      style={{ '--dp-gap': topGap + 'px' }}
      data-lenis-prevent
    >
      <canvas className="dp-bg" ref={canvasRef} aria-hidden="true" />
      <div className="dp-vig" aria-hidden="true" />

      {!showHeader && <div className="dp-topbar" aria-hidden="true" />}

      {showHeader && (
        <div className="dp-header" role="banner">
          <div className="dp-logo">{logo ?? brand}</div>
          {action === undefined ? (
            <button type="button" className="dp-lock" onClick={onLock}>
              <svg
                className="dp-lock-ico"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <span>{lockText}</span>
            </button>
          ) : (
            action || null
          )}
        </div>
      )}

      <div className="dp-shell">
        <div className="dp-nav" role="navigation" aria-label="On this page">
          <div className="dp-nav-title">On this page</div>
          {DOC.sections.map((s) => (
            <a
              key={s.id}
              href={'#dp-' + s.id}
              onClick={go(s.id)}
              className={'dp-nav-link' + (active === 'dp-' + s.id ? ' dp-active' : '')}
            >
              {s.nav}
            </a>
          ))}
        </div>

        <div className="dp-main" role="main">
          <div className="dp-hero">
            <span className="dp-eyebrow">{DOC.eyebrow}</span>
            <div className="dp-h1" role="heading" aria-level={1}>
              {DOC.title}
            </div>
            <div className="dp-lead">{DOC.lead}</div>
          </div>

          {DOC.sections.map((s, i) => (
            <div
              key={s.id}
              id={'dp-' + s.id}
              className="dp-section dp-reveal"
              role="region"
              aria-labelledby={'dp-h-' + s.id}
            >
              <div className="dp-h2" id={'dp-h-' + s.id} role="heading" aria-level={2}>
                <span className="dp-num">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </div>
              {s.blocks.map((b, k) => (
                <Block key={k} block={b} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="dp-footer" role="contentinfo">
        {footerText}
      </div>
    </div>
  );
}