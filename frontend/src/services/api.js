import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatAPI = {
  sendMessage: (data) => api.post('/chat/message', data),
  getHistory: (sessionId) => api.get(`/chat/history/${sessionId}`),
  getChat: (chatId) => api.get(`/chat/${chatId}`),
  deleteChat: (chatId) => api.delete(`/chat/${chatId}`),
  getHealth: () => api.get('/chat/health'),
};

export const userAPI = {
  createSession: (data) => api.post('/user/session', data),
  getSession: (sessionId) => api.get(`/user/session/${sessionId}`),
};

export const searchAPI = {
  getRecent: (sessionId) => api.get(`/search/recent/${sessionId}`),
};

export default api;
