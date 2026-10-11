import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Heart from '../screens/Heart.jsx';

const MSG = '[YOUR FINAL SURPRISE MESSAGE] Say the one thing you want them to remember forever.';

export default function SurprisePage() {
  const { world } = useOutletContext();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');

  useEffect(() => {
    if (!open) return;
    world.burst();
    let i = 0;
    const id = setInterval(() => { setTxt(MSG.slice(0, ++i)); if (i >= MSG.length) clearInterval(id); }, 45);
    return () => clearInterval(id);
  }, [open]);

  if (open) return (
    <section key="open" className="card">
      <Heart />
      <div className="step">FOR YOU</div>
      <h1 className="big">I Love You</h1>
      <p style={{ minHeight: '5em' }}>{txt}</p>
      <button className="ghost" onClick={() => nav('/home')}>Back</button>
    </section>
  );
  return (
    <section key="closed" className="card">
      <svg className="beat" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ff7fd6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
      <div className="step">A LAST SURPRISE</div>
      <h1>Something for you</h1>
      <p>Tap to open your surprise.</p>
      <button className="main" onClick={() => setOpen(true)}>Open the Surprise</button>
      <button className="link" onClick={() => nav('/home')}>Back</button>
    </section>
  );
}
