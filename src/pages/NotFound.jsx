import { useEffect, useRef } from 'react';
import * as THREE from 'three'; // npm i three@0.128.0
import { Link, useNavigate } from 'react-router-dom';
import './NotFound.css';

const LAYERS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function NotFound({
  title = 'Lost in the void',
  message = "The page you are looking for drifted out of orbit, or never existed. Let's get you back.",
  homeText = 'Go home',
  backText = 'Go back',
}) {
  const canvasRef = useRef(null);
  const n3dRef = useRef(null);
  const navigate = useNavigate();

  // Go back one page. If the user landed here directly (no earlier page
  // inside this app), there is nothing to go back to, so send them home.
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  useEffect(() => {
    const reduce =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = n3dRef.current;

    const R = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    R.setClearColor(0x000000, 1);
    const S = new THREE.Scene();
    S.fog = new THREE.FogExp2(0x000000, 0.035);
    const C = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    C.position.z = 12;

    const disposables = [];
    const geos = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.TetrahedronGeometry(1.2, 0),
    ];
    disposables.push(...geos);

    const shapes = [];
    for (let k = 0; k < 26; k++) {
      const edges = new THREE.EdgesGeometry(geos[k % 4]);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.3,
      });
      const m = new THREE.LineSegments(edges, mat);
      const ang = Math.random() * 6.28,
        rad = 7 + Math.random() * 12;
      m.position.set(Math.cos(ang) * rad, (Math.random() - 0.5) * 16, Math.sin(ang) * rad - 6);
      m.scale.setScalar(0.6 + Math.random() * 1.6);
      m.userData = {
        r: new THREE.Vector3(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.3),
        y: m.position.y,
        ph: Math.random() * 6.28,
      };
      S.add(m);
      shapes.push(m);
      disposables.push(edges, mat);
    }

    const ringGeo = new THREE.TorusGeometry(6, 0.015, 8, 120);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.z = -4;
    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.position.z = -4;
    ring2.scale.setScalar(1.35);
    S.add(ring, ring2);
    disposables.push(ringGeo, ringMat, ringMat2);

    const N = 1600,
      p = new Float32Array(N * 3);
    for (let j = 0; j < N * 3; j++) p[j] = (Math.random() - 0.5) * 80;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const dm = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const dust = new THREE.Points(g, dm);
    S.add(dust);
    disposables.push(g, dm);

    const resize = () => {
      R.setSize(innerWidth, innerHeight, false);
      C.aspect = innerWidth / innerHeight;
      C.updateProjectionMatrix();
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
    const onTilt = (e) => {
      if (e.gamma != null) {
        mx = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
        my = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 90));
      }
    };
    addEventListener('pointermove', onMove);
    addEventListener('deviceorientation', onTilt);

    const frame = () => {
      const t = reduce ? 0 : performance.now() / 1000;
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      n.style.setProperty('--rx', -cy * 34 + Math.sin(t * 0.8) * 4 + 'deg');
      n.style.setProperty('--ry', cx * 48 + Math.sin(t * 0.6) * 6 + 'deg');
      shapes.forEach((s) => {
        const d = s.userData;
        s.rotation.x = t * d.r.x;
        s.rotation.y = t * d.r.y;
        s.rotation.z = t * d.r.z;
        s.position.y = d.y + Math.sin(t * 0.5 + d.ph) * 0.8;
      });
      ring.rotation.set(1.2 + cy, t * 0.15 + cx * 2, t * 0.1);
      ring2.rotation.set(1.0 - cy, -t * 0.1 + cx, t * 0.2);
      dust.rotation.y = t * 0.015;
      C.position.x = cx * 4;
      C.position.y = -cy * 3;
      C.lookAt(0, 0, 0);
      R.render(S, C);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', onMove);
      removeEventListener('deviceorientation', onTilt);
      disposables.forEach((d) => d.dispose());
      R.dispose();
    };
  }, []);

  return (
    <div className="nf-root">
      <canvas className="nf-bg" ref={canvasRef} aria-hidden="true" />
      <div className="nf-vig" aria-hidden="true" />
      <main className="nf-main">
        <div className="nf-scene">
          <div className="nf-n3d" ref={n3dRef}>
            <span className="nf-front">404</span>
            {LAYERS.map((i) => (
              <span key={i} className="nf-layer" style={{ '--i': i }} aria-hidden="true">
                404
              </span>
            ))}
          </div>
        </div>
        <h1 className="nf-title nf-rise" style={{ animationDelay: '.3s' }}>
          {title}
        </h1>
        <p className="nf-text nf-rise" style={{ animationDelay: '.5s' }}>
          {message}
        </p>
        <div className="nf-row nf-rise" style={{ animationDelay: '.7s' }}>
          <Link className="nf-btn" to="/">
            {homeText}
          </Link>
          <button className="nf-btn" type="button" onClick={goBack}>
            {backText}
          </button>
        </div>
      </main>
    </div>
  );
}