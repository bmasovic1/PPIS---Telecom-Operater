const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'telecom_itsm_token';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, options = {}) {
  const token = authStorage.getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      authStorage.clearToken();
    }
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload;
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  getUsers: () => request('/shared/users'),
  getServices: () => request('/shared/services'),
  getIncidents: (limit = 100) => request(`/shared/incidents?limit=${limit}`),
  getReleasePipeline: () => request('/release/pipeline'),
  getRfcs: () => request('/release/rfc'),
  createRfc: (body) => request('/release/rfc', { method: 'POST', body: JSON.stringify(body) }),
  updateCabDecision: (id, body) => request(`/release/rfc/${id}/cab`, { method: 'PUT', body: JSON.stringify(body) }),
  updateGoNoGo: (id, body) => request(`/release/${id}/go-no-go`, { method: 'PUT', body: JSON.stringify(body) }),
  updateDeploy: (id, body) => request(`/release/${id}/deploy`, { method: 'PUT', body: JSON.stringify(body) }),
  updatePir: (id, body) => request(`/release/${id}/pir`, { method: 'PUT', body: JSON.stringify(body) }),
  updateRollback: (id, body) => request(`/release/${id}/rollback`, { method: 'PUT', body: JSON.stringify(body) }),
  getProblems: () => request('/problem'),
  getActiveProblems: () => request('/problem/active'),
  getTrend: () => request('/problem/trend'),
  getProblemMetrics: () => request('/problem/metrics'),
  createProblem: (body) => request('/problem', { method: 'POST', body: JSON.stringify(body) }),
  updateProblemRca: (id, body) => request(`/problem/${id}/rca`, { method: 'PUT', body: JSON.stringify(body) }),
  updateProblemStatus: (id, body) => request(`/problem/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  updateProblemIncidents: (id, body) => request(`/problem/${id}/incidents`, { method: 'PUT', body: JSON.stringify(body) }),
  getKedb: () => request('/problem/kedb'),
  createKedb: (body) => request('/problem/kedb', { method: 'POST', body: JSON.stringify(body) }),
  updateKedb: (id, body) => request(`/problem/kedb/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};
