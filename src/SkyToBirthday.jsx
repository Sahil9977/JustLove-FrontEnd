


import { useEffect, useState } from "react";
import SkyAnimation from "./SkyAnimation.jsx";
import HappyBirthday from "./HappyBirthday.jsx";

// Sky -> (last rocket climbs INTO the real Birthday page) -> blast -> Birthday animation starts.
//
// play = false : SkyAnimation is mounted but PAUSED (night sky waits behind the WELCOME letters).
// play = true  : HomePage says the screen is FULL -> the fireworks start from 0.
export default function SkyToBirthday({ play = false }) {
  const [birthdayLoaded, setBirthdayLoaded] = useState(false);
  const [birthdayPlay, setBirthdayPlay] = useState(false);
  const [skyDone, setSkyDone] = useState(false);

  // DEBUG: open the browser console (F12). If you do NOT see these lines, an OLD copy of this file is running.
  useEffect(() => { console.log("[SkyToBirthday v2] mounted"); }, []);
  useEffect(() => { console.log("[SkyToBirthday v2] play =", play); }, [play]);

  return (
    <>
      {/* HappyBirthday does not exist until the sky show has really started */}
      {play && birthdayLoaded && <HappyBirthday start={birthdayPlay} />}

      {!skyDone && (
        <SkyAnimation
          start={play}
          onRise={() => { console.log("[SkyToBirthday v2] last rocket rising"); setBirthdayLoaded(true); }}
          onBlastDone={() => { console.log("[SkyToBirthday v2] blast done"); setBirthdayPlay(true); }}
          onComplete={() => {
            setBirthdayLoaded(true);
            setBirthdayPlay(true);
            setSkyDone(true);
          }}
        />
      )}
    </>
  );
}