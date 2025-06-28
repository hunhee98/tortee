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
  menteeId: number;
  mentorId: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  mentee_name?: string;
  mentor_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
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
  id: number;
  name: string;
  role: 'mentor' | 'mentee';
  bio: string;
  image?: string;
  skills?: string[];
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
