import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import GalleryUI from '../screens/GalleryUI.jsx';
import { getPhotos } from '../api.js';

export default function GalleryPage() {
  const { world, photos, handlers } = useOutletContext();
  const nav = useNavigate();
  const [caption, setCaption] = useState('');
  const [ready, setReady] = useState(false);

  const play = () => { setReady(false); world.playIntro(photos.current); };

  useEffect(() => {
    handlers.current.onCaption = (i) => setCaption(photos.current[i]?.caption || '');
    handlers.current.onIntroDone = () => setReady(true);
    let alive = true;
    (async () => {
      if (!photos.current.length) photos.current = await getPhotos().catch(() => []); // e.g. page refresh
      if (alive) play();                                                              // intro, then gallery
    })();
    return () => { alive = false; handlers.current = {}; world.reset(); };
  }, []);

  return <GalleryUI ready={ready} caption={caption} onBack={() => nav('/home')} onReplay={play} />;
}
