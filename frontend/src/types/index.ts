export interface UserProfile {
  name: string;
  bio: string;
  imageUrl: string;
  skills?: string[];
}

export interface User {
  id: number;
  email: string;
  role: 'mentor' | 'mentee';
  profile: UserProfile;
}

export interface Mentor extends User {
  role: 'mentor';
  profile: UserProfile & { skills: string[] };
}

export interface Mentee extends User {
  role: 'mentee';
}

export interface MatchingRequest {
  id: number;
  mentee_id: number;
  mentor_id: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at?: string;
  mentee_name?: string;
  mentor_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: 'mentor' | 'mentee';
}

export interface ProfileUpdateRequest {
  name?: string;
  introduction?: string;
  tech_stack?: string[];
}

export interface MatchingRequestCreate {
  mentorId: number;
  menteeId: number;
  message: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'mentor' | 'mentee';
}

export interface ProfileForm {
  name: string;
  bio: string;
  skills: string;
  experience?: string;
  rate?: number;
}

export interface MatchingRequestForm {
  mentorId: number;
  message: string;
}
