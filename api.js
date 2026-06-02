const API_BASE = 'http://localhost:5500/api';

const API = {
  getToken() {
    return localStorage.getItem('pg_token');
  },
  
  setToken(token) {
    if (token) localStorage.setItem('pg_token', token);
    else localStorage.removeItem('pg_token');
  },

  async request(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
      const res = await fetch(API_BASE + endpoint, config);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка сервера');
      return data;
    } catch (err) {
      toast(err.message, true);
      throw err;
    }
  }
};
