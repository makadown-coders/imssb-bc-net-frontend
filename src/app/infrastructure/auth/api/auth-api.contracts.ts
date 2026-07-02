export interface AuthSessionResponseDto {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresUtc: string;
  refreshTokenExpiresUtc: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface LogoutRequestDto {
  refreshToken: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  createdAt: string;
}

export interface PingResponseDto {
  message: string;
  timestamp: string;
}
