// ChitChat API Client
const API_BASE = window.location.origin;

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('chitchat_token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('chitchat_user') || 'null');
  }

  setSession(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('chitchat_token', token);
    localStorage.setItem('chitchat_user', JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('chitchat_token');
    localStorage.removeItem('chitchat_user');
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const res = await fetch(url, config);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'API request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async login(login, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
    this.setSession(res.token, res.user);
    return res;
  }

  async register(username, email, password, statusMessage, role = 'Member') {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, statusMessage, role })
    });
    this.setSession(res.token, res.user);
    return res;
  }

  async getMe() {
    return await this.request('/api/auth/me');
  }

  async getAllUsers() {
    return await this.request('/api/auth/users');
  }

  // --- Rooms Endpoints ---
  async getRooms() {
    return await this.request('/api/rooms');
  }

  async createRoom(name, description, avatar) {
    return await this.request('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, description, avatar })
    });
  }

  async getOrCreateDirectRoom(recipientId) {
    return await this.request('/api/rooms/direct', {
      method: 'POST',
      body: JSON.stringify({ recipientId })
    });
  }

  // --- Messages Endpoints ---
  async getMessages(roomId, limit = 100) {
    return await this.request(`/api/messages/${roomId}?limit=${limit}`);
  }

  async sendMessage(roomId, text, messageType = 'text', attachment = null) {
    return await this.request(`/api/messages/${roomId}`, {
      method: 'POST',
      body: JSON.stringify({ text, messageType, attachment })
    });
  }

  async markAsRead(roomId) {
    return await this.request(`/api/messages/${roomId}/read`, {
      method: 'PUT'
    });
  }

  // --- System Status ---
  async getStatus() {
    return await this.request('/api/status');
  }
}

window.api = new ApiClient();
