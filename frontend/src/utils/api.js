import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dental_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dental_admin_token');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Chat API ──────────────────────────────────────────────────────────────────
export const chatAPI = {
  start: (sessionId, language) => api.post('/chat/start', { sessionId, language }),
  message: (sessionId, message, language) => api.post('/chat/message', { sessionId, message, language }),
};

// ── Leads API ─────────────────────────────────────────────────────────────────
export const leadsAPI = {
  create: (data) => api.post('/leads', data),
  list: (params) => api.get('/leads', { params }),
  get: (id) => api.get(`/leads/${id}`),
  update: (id, data) => api.patch(`/leads/${id}`, data),
  reengage: (id) => api.post(`/leads/${id}/reengage`),
};

// ── Bookings API ──────────────────────────────────────────────────────────────
export const bookingsAPI = {
  getSlots: (date) => api.get('/bookings/slots', { params: { date } }),
  create: (data) => api.post('/bookings', data),
  list: (params) => api.get('/bookings', { params }),
  update: (id, data) => api.patch(`/bookings/${id}`, data),
};

// ── Analytics API ─────────────────────────────────────────────────────────────
export const analyticsAPI = {
  overview: (period) => api.get('/analytics/overview', { params: { period } }),
  timeseries: (days) => api.get('/analytics/timeseries', { params: { days } }),
  sources: () => api.get('/analytics/sources'),
  insights: () => api.get('/analytics/ai-insights'),
};

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};
