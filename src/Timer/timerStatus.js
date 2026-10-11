// ONE place that understands the /api/timer reply, used by App.jsx (TimerGuard) AND the Timer page.
// Works whether getTimer() returns the body ({ unlockAt, now, unlocked }) or an axios-style { data: body }.
export function parseTimer(res) {
  const b = res && typeof res.data === 'object' && res.data !== null ? res.data : res || {};
  const at = Date.parse(b.unlockAt), now = Date.parse(b.now);
  return {
    unlocked: b.unlocked === true,
    at,                                                    // unlock moment (ms) - NaN if the server sent nothing
    offset: Number.isFinite(now) ? now - Date.now() : 0,   // server clock minus device clock
  };
}