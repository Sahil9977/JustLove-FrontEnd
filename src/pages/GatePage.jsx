import { useNavigate, useOutletContext } from 'react-router-dom';
import Gate from '../screens/Gate.jsx';
import { getPhotos } from '../api.js';

export default function GatePage() {
  const { world, photos } = useOutletContext();
  const nav = useNavigate();
  const unlocked = async () => {
    world.burst();                                         // sparkle burst
    photos.current = await getPhotos().catch(() => []);
    setTimeout(() => nav('/intro'), 100);
  };
  return <Gate onUnlock={unlocked} />;
}
