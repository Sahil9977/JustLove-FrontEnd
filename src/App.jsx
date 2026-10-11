import { useEffect, useState } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

import { getTimer } from './api.js';
import { parseTimer } from './Timer/timerStatus.js';
import Layout from './Layout.jsx';
import Protected from './pages/ProtectedRoute.jsx';
import { ProtectedG } from './pages/ProtectedRoute.jsx';
import ClickSparkles from './pages/ClickSparkles.jsx';

import TimerPage from './Timer/TimerPage.jsx';
import GatePage from './pages/GatePage.jsx';
import HomePage from './HomePage.jsx';
import GalleryPage from './GalleryPage.jsx';
import Message from './Message.jsx';
import IntroAnimation from './IntroAnimation.jsx';
import SkyToBirthday from './SkyToBirthday.jsx';
import HappyBirthday from './HappyBirthday.jsx';
import DocsPage from './pages/DocsPage.jsx';
import NotFound from './pages/NotFound.jsx';

// TIMER GUARD: until the timer has finished, NO page except /timer can be opened.
// The answer comes from the SERVER's clock (GET /api/timer).
// FIX: it now reads the reply with parseTimer() - the SAME function the Timer page uses. Before, the guard read
// `t.unlocked` while the Timer page read `d.data.unlocked`; one of them was always undefined, so
// Timer said "open -> go to /" and the guard said "locked -> go to /timer" forever (the endless /api/timer logs).
let opened = false;
function TimerGuard() {
  const [state, setState] = useState(opened ? 'open' : 'checking'); // checking | open | locked | error
  const check = () => {
    setState('checking');
    getTimer()
      .then((res) => { const t = parseTimer(res); opened = t.unlocked; setState(t.unlocked ? 'open' : 'locked'); })
      .catch(() => setState('error'));
  };
  useEffect(() => { if (!opened) check(); }, []);

  if (state === 'open') return <Outlet />;
  if (state === 'locked') return <Navigate to="/timer" replace />;
  if (state === 'error') return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#0b0720', color: '#f3edff', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <div>
        <p>Cannot reach the server.</p>
        <button onClick={check} style={{ minHeight: 44, padding: '0 28px', borderRadius: 999, border: 0, cursor: 'pointer' }}>Try again</button>
      </div>
    </div>
  );
  return <div style={{ position: 'fixed', inset: 0, background: '#0b0720' }} />; // dark instead of white while checking
}

export default function App() {
  return (
    <>
      <ClickSparkles />
      <Routes>
        {/* 1) The Timer: its own page, outside Layout and outside the guard */}
        <Route path="/timer" element={<TimerPage />} />

        {/* 2) Everything else is behind the guard */}
        <Route element={<TimerGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<GatePage />} />

            <Route element={<ProtectedG />}>
              <Route path="/documentation" element={<DocsPage />} />
            </Route>

            {/* Protected: needs the love code */}
            <Route element={<Protected />}>
              <Route path="/intro" element={<IntroAnimation />} />
              <Route path="/sky" element={<SkyToBirthday />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/home/gallery" element={<GalleryPage />} />
              <Route path="/home/gallery/message" element={<Message />} />

              {/* test routes */}
              <Route path="/hy" element={<HappyBirthday />} />
              <Route path="/g" element={<GalleryPage />} />
              <Route path="/m" element={<Message />} />
            </Route>

            {/* Unknown route (the old file had TWO path="*" routes; the second one could never run) */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}