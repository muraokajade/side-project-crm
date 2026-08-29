import { apiFetch } from './projects';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export function fetchMe(): Promise<Response> {
  return apiFetch('/api/auth/me');
}

export function login(email: string, password: string): Promise<Response> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(payload: RegisterPayload): Promise<Response> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<Response> {
  return apiFetch('/api/auth/logout', { method: 'POST' });
}
