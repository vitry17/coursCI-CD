// Petit client HTTP pour l'API. Même origine (/api) : marche en local (proxy
// Vite) comme en déploiement (Vercel). `credentials: include` envoie le cookie.
const BASE = '/api';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = new Error(data?.error?.message || 'Une erreur est survenue.');
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateMe: (body) => request('/users/me', { method: 'PATCH', body }),
  deleteMe: () => request('/users/me', { method: 'DELETE' }),
  slots: () => request('/slots'),
  book: (body) => request('/appointments', { method: 'POST', body }),
  myAppointments: (scope = 'upcoming') =>
    request(`/appointments/me?scope=${scope}`),
  cancelAppointment: (id) =>
    request(`/appointments/${id}/cancel`, { method: 'PATCH' }),
};
