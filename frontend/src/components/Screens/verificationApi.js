import LocalIP from '../LocalIP';
export const verificationAPI = `${LocalIP}:4000`;
export const demoActor = () => Number(localStorage.getItem('id'));
export const requestUUID = () => {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
export const colomboTime = value => value ? new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value)) : '—';
export const apiError = (error, fallback) => error.response?.data?.error || fallback;
export const simulationMode = mode => mode === 'historical_replay' ? 'Historical Replay' : 'Future Simulation';
