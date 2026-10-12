
// const keep = (d) => { token = d.token; sessionStorage.setItem('jl_token', token); return d; };
// export const hasToken = () => !!token;
// export const clearToken = () => { token = ''; sessionStorage.removeItem('jl_token'); };
// export const verifyCode = (code) => post('/auth/verify', { code }).then(keep);
// export const forgot = (email) => post('/auth/forgot', { email });
// export const verifyOtp = (email, otp) => post('/auth/forgot/verify', { email, otp }).then(keep);
// export async function getPhotos() {
//   const r = await fetch('/api/photos', { headers: { Authorization: 'Bearer ' + token } });
//   if (!r.ok) throw new Error('Locked');
//   return r.json();
// }

import axios from 'axios';

const api = axios.create({
  baseURL:'https://justlove-backend.onrender.com/api',
  // baseURL:'http://localhost:5000',.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// const api = axios.create({
//   baseURL: '/api',
//   withCredentials: true,
//   headers: { 'Content-Type': 'application/json' },
// });

// These endpoints can legitimately return 401 without meaning
// that an existing session has expired.
const QUIET_401 = [
  '/auth/verify',
  '/auth/forgot',
  '/auth/forgot/verify',
  '/auth/me',
  '/auth/logout',
];

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const path = error.config?.url || '';

    if (
      status === 401 &&
      !QUIET_401.some((route) => path.startsWith(route))
    ) {
      window.dispatchEvent(new Event('auth:expired'));
    }

    const serverMessage =
      error.response?.data?.error ||
      error.response?.data?.message;

    if (serverMessage) {
      error.message = serverMessage;
    }

    return Promise.reject(error);
  }
);

export const verifyCode = (code) =>
  api.post('/auth/verify', { code });

export const forgot = (email) =>
  api.post('/auth/forgot', { email });

export const verifyOtp = (email, otp) =>
  api.post('/auth/forgot/verify', { email, otp });

export const getTimer = () => api.get('/timer');

export const me = () =>
  api.get('/auth/me');

export const logout = () =>
  api.post('/auth/logout');

export const getPhotos = () =>
  api.get('/photos');

export default api;