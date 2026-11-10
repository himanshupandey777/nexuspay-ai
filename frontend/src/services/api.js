
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const processMilestone = async (data) => {
  const response = await api.post('/milestones/process', data);
  return response.data;
};

export const getAllMilestones = async () => {
  const response = await api.get('/milestones');
  return response.data;
};

export default api;
