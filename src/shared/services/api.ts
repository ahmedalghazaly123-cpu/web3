const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('lp-auth-token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'request-failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; name: string; role: string }) =>
      request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
  },
  users: {
    me: () => request('/users/me'),
    get: (id: string) => request(`/users/${id}`),
  },
  learning: {
    recordEvent: (event: any) => request('/learning/events', { method: 'POST', body: JSON.stringify(event) }),
    getEvents: (limit?: number) => request(`/learning/events?limit=${limit || 100}`),
    upsertMastery: (record: any) => request('/learning/mastery', { method: 'POST', body: JSON.stringify(record) }),
    getMastery: () => request('/learning/mastery'),
    getProgress: () => request('/learning/progress'),
  },
};
