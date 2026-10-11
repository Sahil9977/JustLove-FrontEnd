import { useEffect } from "react";

export default function ClickSparkles() {
  useEffect(() => {
    // 1. Inject the .floating-ember styling automatically
    const styleId = 'global-floating-ember-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .floating-ember {
          position: fixed;
          pointer-events: none;
          z-index: 999999;
          font-size: 1.3rem;
          line-height: 1;
          user-select: none;
          will-change: transform, opacity;
        }
      `;
      document.head.appendChild(style);
    }

    // 2. Exact same spawnEmberSparks logic from your HomePage.jsx
    const symbols = ['🔥', '✨', '🏮', '💫', '♥', '🌟'];

    const handleGlobalClick = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      for (let i = 0; i < 14; i++) {
        const span = document.createElement('span');
        span.className = 'floating-ember';
        span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        span.style.color = `hsl(${25 + Math.random() * 35}, 100%, ${65 + Math.random() * 25}%)`;
        document.body.appendChild(span);

        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 160;
        const destX = Math.cos(angle) * distance;
        const destY = Math.sin(angle) * distance - 80;

        span.animate([
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
          { transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(1.4) rotate(${destX * 2}deg)`, opacity: 0 }
        ], {
          duration: 1300 + Math.random() * 800,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        }).finished.then(() => span.remove()).catch(() => span.remove());
      }
    };

    // Listen on pointerdown with capture so nothing blocks it
    window.addEventListener('pointerdown', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('pointerdown', handleGlobalClick, { capture: true });
  }, []);

  return null;
}