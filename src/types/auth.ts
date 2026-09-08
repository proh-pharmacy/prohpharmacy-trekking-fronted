export interface AuthUser {
  id: string;
  userId?: string;
  staffMemberId?: string;
  employeeNumber?: string;
  email: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  role?: string;
  roles: string[];
  systemRoles?: string[];
  permissions?: string[];
  branchId?: string;
  branchName?: string;
  staffId?: string;
  employmentStatus?: string;
  joinedOn?: string;
  hasAppAccess?: boolean;
  isActive?: boolean;
  profilePhotoUrl?: string;
  currentDeviceId?: string;
  currentDeviceName?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface LoginUserSummary {
  userId: string;
  staffMemberId?: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  expiresIn?: number;
  user?: LoginUserSummary;
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
