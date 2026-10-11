import { useNavigate } from 'react-router-dom';
import Home from '../screens/Home.jsx';

export default function HomePage() {
  const nav = useNavigate();
  return <Home onOpen={() => nav('/gallery')} />;
}
