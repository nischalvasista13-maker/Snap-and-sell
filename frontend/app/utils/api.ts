import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: BACKEND_URL,
});

// Add auth header to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear session
      await AsyncStorage.multiRemove([
        'authToken',
        'userId',
        'businessId',
        'username',
        'lastActiveTime',
        'setupCompleted',
        'cart'
      ]);
      // The app will redirect to signin on next navigation
    }
    return Promise.reject(error);
  }
);

export default api;
export { BACKEND_URL };
