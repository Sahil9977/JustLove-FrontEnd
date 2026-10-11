import { useNavigate } from 'react-router-dom';
import Heart from '../screens/Heart.jsx';

// Replace these placeholders with your real moments (later this can come from MongoDB).
const MOMENTS = [
  { date: '[DATE]', title: '[THE DAY WE MET]', text: '[Write what happened and how it felt.]' },
  { date: '[DATE]', title: '[OUR FIRST DATE]', text: '[Write what you remember most.]' },
  { date: '[DATE]', title: '[A MOMENT I WILL NEVER FORGET]', text: '[Write the moment in your own words.]' },
  { date: '[DATE]', title: '[TODAY]', text: '[Write what you feel right now.]' },
];

export default function StoryPage() {
  const nav = useNavigate();
  return (
    <section className="card panel">
      <Heart />
      <div className="step">OUR STORY</div>
      <h1>Our Story</h1>
      <ol className="tl">
        {MOMENTS.map((m, i) => (
          <li key={i} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
            <span className="dot" />
            <div className="when">{m.date}</div>
            <h2>{m.title}</h2>
            <p>{m.text}</p>
          </li>
        ))}
      </ol>
      <button className="ghost" onClick={() => nav('/home')}>Back</button>
    </section>
  );
}
