export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface AuthState {
  isLoading: boolean;
  error: string | null;
  user: null | {
    id: string;
    email: string;
    name: string;
  };
}