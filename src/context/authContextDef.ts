import { createContext } from 'react';
import type { AuthUser, LoginCredentials } from '../types/auth';

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  permissions: string[];
  hasRole: (role: string) => boolean;
  can: (permission: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

