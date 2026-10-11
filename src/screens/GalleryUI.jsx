export default function GalleryUI({ ready, caption, onBack, onReplay }) {
  return (
    <div className="gal">
      {ready && (<>
        <p className="cap">{caption}</p>
        <p className="hint">Drag to turn the gallery</p>
        <div className="bar">
          <button className="ghost" onClick={onBack}>Back</button>
          <button className="ghost" onClick={onReplay}>Replay intro</button>
        </div>
      </>)}
    </div>
  );
}
