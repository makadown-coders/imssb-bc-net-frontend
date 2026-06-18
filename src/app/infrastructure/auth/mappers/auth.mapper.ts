import { AuthSession } from '../../../domain/auth/models/auth-session.model';
import { PingResponse } from '../../../domain/auth/models/ping.model';
import { User } from '../../../domain/auth/models/user.model';
import { AuthSessionResponseDto, PingResponseDto, UserResponseDto } from '../api/auth-api.contracts';

export function mapAuthSession(dto: AuthSessionResponseDto): AuthSession {
  return {
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    accessTokenExpiresUtc: dto.accessTokenExpiresUtc,
    refreshTokenExpiresUtc: dto.refreshTokenExpiresUtc,
  };
}

export function mapUser(dto: UserResponseDto): User {
  return {
    id: dto.id,
    email: dto.email,
    createdAt: dto.createdAt,
  };
}

export function mapPingResponse(dto: PingResponseDto): PingResponse {
  return {
    message: dto.message,
    timestamp: dto.timestamp,
  };
}
