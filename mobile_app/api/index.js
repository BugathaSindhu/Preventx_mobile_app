import axios from 'axios';
import { Platform } from 'react-native';

// Using public locatunnel to bypass strict local Wi-Fi firewalls
const BASE_URL = 'https://polite-towns-mix.loca.lt/api/mobile';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true' // Skip localtunnel warning page
  },
});

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  signup: async (userData) => {
    try {
      const response = await api.post('/signup', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export const predictionService = {
  predictCurrentLocation: async (latitude, longitude, userContext = {}) => {
    try {
      const response = await api.post('/predict', {
        latitude,
        longitude,
        ...userContext,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  predictPlace: async (place, userContext = {}) => {
    try {
      const response = await api.post('/predict-place', {
        place,
        ...userContext,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getHotspots: async () => {
    try {
      const response = await api.get('/hotspots');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  triggerN8nAlert: async (latitude, longitude, userContext = {}) => {
    try {
      const response = await api.post('/n8n-alert', {
        latitude,
        longitude,
        ...userContext,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export const adminService = {
  addAccident: async (data) => {
    try {
      const response = await api.post('/admin/add-accident', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  recomputeHotspots: async () => {
    try {
      const response = await api.post('/admin/recompute-hotspots');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAnalytics: async () => {
    try {
      const response = await api.get('/admin/analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default api;
