import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Heart from './Heart.jsx';

const MSG = '[YOUR LOVE MESSAGE HERE] Write the words only your heart can say.';

export default function Home({ onOpen }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => { setTxt(MSG.slice(0, ++i)); if (i >= MSG.length) clearInterval(id); }, 45);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="card">
      <Heart />
      <div className="step">WELCOME</div>
      <h1 className="big">For You</h1>
      <p style={{ minHeight: '3.4em' }}>{txt}</p>
      <button className="main" onClick={onOpen}>Open Our Gallery</button>
      <div className="links"><Link to="/story">Our Story</Link><Link to="/surprise">Surprise</Link></div>
    </section>
  );
}
