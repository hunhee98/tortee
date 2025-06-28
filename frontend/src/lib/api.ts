import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  ApiResponse, 
  LoginRequest, 
  SignupRequest, 
  ProfileUpdateRequest,
  MatchingRequest,
  MatchingRequestCreate 
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: async (data: SignupRequest): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ token: string; user: User }>> = await api.post('/signup', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ token: string; user: User }>> = await api.post('/login', data);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get('/me');
    return response.data;
  },
};

export const profileApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get('/profile');
    return response.data;
  },

  updateProfile: async (data: ProfileUpdateRequest): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.put('/profile', data);
    return response.data;
  },

  uploadProfileImage: async (file: File): Promise<ApiResponse<{ profile_image: string }>> => {
    const formData = new FormData();
    formData.append('profile_image', file);
    const response: AxiosResponse<ApiResponse<{ profile_image: string }>> = await api.post('/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const mentorApi = {
  getMentors: async (params?: { 
    skill?: string; 
    search?: string; 
    sortBy?: 'name' | 'skill' | 'created_at'; 
    order?: 'asc' | 'desc' 
  }): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get('/mentors', { params });
    return response.data;
  },
};

export const matchingApi = {
  sendRequest: async (data: MatchingRequestCreate): Promise<ApiResponse<MatchingRequest>> => {
    const response: AxiosResponse<ApiResponse<MatchingRequest>> = await api.post('/match-requests', data);
    return response.data;
  },

  getMyRequests: async (): Promise<ApiResponse<MatchingRequest[]>> => {
    const response: AxiosResponse<ApiResponse<MatchingRequest[]>> = await api.get('/match-requests/outgoing');
    return response.data;
  },

  getReceivedRequests: async (): Promise<ApiResponse<MatchingRequest[]>> => {
    const response: AxiosResponse<ApiResponse<MatchingRequest[]>> = await api.get('/match-requests/incoming');
    return response.data;
  },

  acceptRequest: async (requestId: number): Promise<ApiResponse<MatchingRequest>> => {
    const response: AxiosResponse<ApiResponse<MatchingRequest>> = await api.put(`/match-requests/${requestId}/accept`);
    return response.data;
  },

  rejectRequest: async (requestId: number): Promise<ApiResponse<MatchingRequest>> => {
    const response: AxiosResponse<ApiResponse<MatchingRequest>> = await api.put(`/match-requests/${requestId}/reject`);
    return response.data;
  },

  cancelRequest: async (requestId: number): Promise<ApiResponse<void>> => {
    const response: AxiosResponse<ApiResponse<void>> = await api.delete(`/match-requests/${requestId}`);
    return response.data;
  },
};

export default api;
