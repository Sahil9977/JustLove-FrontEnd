
import { useState } from 'react';
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
  const { login, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const go = (s) => {
    setStep(s);
    setErr('');
    setVal('');
  };

  const run = (fn) => async (e) => {
    e.preventDefault();
    setErr('');

    try {
      await fn();
    } catch (x) {
      console.log(x?.response?.data?.error,
        x?.response?.data?.message,
        x?.message)
      setErr(
        x?.response?.data?.error ||
        x?.response?.data?.message ||
        x?.message ||
        'Something went wrong.'
      );

      setVal('');
      setShake(true);

      setTimeout(() => setShake(false), 450);
    }
  };

  const handleCode = async () => {
    if (!val.trim()) {
      throw new Error('Please enter the love code.');
    }

    const res = await login(val);
    console.log(res)

    // if(res.authenticated) navigate('/intro')

    onUnlock();
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      throw new Error('Please enter your email.');
    }

    await forgot(email);
    go('otp');
  };

  const handleOtp = async () => {
    if (!val.trim()) {
      throw new Error('Please enter the one-time code.');


    }

    console.log(email, val)
    const res = await verifyOTP(email, val);

    // const res = await verifyOtp(email, val);

    // Backend has now created/updated the HttpOnly auth cookie.
    console.log(res, res.authenticated && res.user.id === 'guest', res.authenticated, res.user.id === 'guest')
    if (res.authenticated && res.user.id === 'guest') navigate('/documentation')

  };

  return (
    <section key={step} className={'card' + (shake ? ' shake' : '')}>
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

            <button className="main" type="submit">
              Unlock Our World
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

            <button className="main" type="submit">
              Send Me the Code
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
            If this email is registered, a code is on its way. Enter it below.
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

            <button className="main" type="submit">
              Unlock Our World
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
