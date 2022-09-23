import { Admin } from './admin';
import { UserInfo } from './user';

export interface JwtConfig {
  publicKey: string;
  handleJsonResponse?: ( code: number, message: string) => void;
}

export enum RoleType {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface JwtData {
  publicAddress?: string,
  userId: string,
  roleType?: RoleType,
}

export interface GenerateAuthRequest {
  signature: string;
  publicAddress: string;
  roleType?: RoleType,
}

export interface AuthResponse {
  token: string;
  user: Admin | UserInfo;
  roleType?: RoleType,
}
