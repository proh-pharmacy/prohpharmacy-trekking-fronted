export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  roles: string[];
  branchId?: string;
  branchName?: string;
  staffId?: string;
  isActive?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordPayload {
  userId: string;
  temporaryPassword?: string;
}
