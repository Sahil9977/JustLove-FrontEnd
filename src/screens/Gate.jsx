import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { verifyCode, forgot, verifyOtp } from '../api.js';
import Heart from './Heart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Gate({ onUnlock }) {
  const [step, setStep] = useState('code'); // code | email | otp
  const [val, setVal] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const { login, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const go = (s) => {
    setStep(s);
    setErr('');
    setVal('');
  };

  const run = (fn) => async (e) => {
    e.preventDefault();
    if (loading) return; // blocks double submit
    setErr('');
    setLoading(true);

    try {
      await fn();
    } catch (x) {
      setErr(
        x?.response?.data?.error ||
        x?.response?.data?.message ||
        x?.message ||
        'Something went wrong.'
      );

      setVal('');
      setShake(true);

      setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false); // always stop the loader
    }
  };

  const handleCode = async () => {
    if (!val.trim()) {
      throw new Error('Please enter the love code.');
    }

    await login(val);
    onUnlock();
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      throw new Error('Please enter your email.');
    }

    const res = await forgot(email);
    // works whether api.js returns the axios response or just the data
    setServerMsg(res?.data?.message || res?.message || '');
    go('otp');
  };

  const handleOtp = async () => {
    if (!val.trim()) {
      throw new Error('Please enter the one-time code.');
    }

    const res = await verifyOTP(email, val);

    // Backend has now created/updated the HttpOnly auth cookie.
    if (res.authenticated && res.user.id === 'guest') navigate('/documentation');
  };

  const btnContent = (text) =>
    loading ? <Loader2 className="gate-spin" size={22} /> : text;

  return (
    <section key={step} className={'card' + (shake ? ' shake' : '')}>
      <style>{`
        @keyframes gate-spin { to { transform: rotate(360deg); } }
        .gate-spin { animation: gate-spin 0.8s linear infinite !important; }
        .main { display: inline-flex; align-items: center; justify-content: center; }
        .main:disabled { opacity: .85; cursor: not-allowed; }
      `}</style>

      <Heart />

      {step === 'code' && (
        <>
          <div className="step">FOR ONE HEART ONLY</div>
          <h1>Our Love Code</h1>
          <p>Enter the code to step into our world.</p>

          <form onSubmit={run(handleCode)}>
            <label htmlFor="v">LOVE CODE</label>

            <input
              id="v"
              autoFocus
              placeholder="• • • • • •"
              className={'code' + (err ? ' bad' : '')}
              type="password"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />

            <p className="err" role="alert">
              {err}
            </p>

            <button className="main" type="submit" disabled={loading}>
              {btnContent('Unlock Our World')}
            </button>
          </form>

          <button
            className="link"
            type="button"
            onClick={() => go('email')}
          >
            Forgot the love code?
          </button>
        </>
      )}

      {step === 'email' && (
        <>
          <div className="step">STEP 1</div>
          <h1>Forgot the code?</h1>
          <p>
            Enter your email and we will send a one-time code to your inbox.
          </p>

          <form onSubmit={run(handleForgot)}>
            <label htmlFor="e">YOUR EMAIL</label>

            <input
              id="e"
              autoFocus
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <p className="err" role="alert">
              {err}
            </p>

            <button className="main" type="submit" disabled={loading}>
              {btnContent('Send Me the Code')}
            </button>
          </form>

          <button
            className="link"
            type="button"
            onClick={() => go('code')}
          >
            Back to login
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <div className="step">STEP 2</div>
          <h1>Check your inbox</h1>
          <p>
            OTP is sent to your email ID: <strong>{email}</strong>
          </p>

          <form onSubmit={run(handleOtp)}>
            <label htmlFor="o">ONE-TIME CODE</label>

            <input
              id="o"
              autoFocus
              className="code"
              inputMode="numeric"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />

            <p className="err" role="alert">
              {err}
            </p>

            <button className="main" type="submit" disabled={loading}>
              {btnContent('Unlock Our World')}
            </button>
          </form>

          <button
            className="link"
            type="button"
            onClick={() => go('code')}
          >
            Back to Love Code
          </button>
        </>
      )}
    </section>
  );
}