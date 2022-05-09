import { Admin } from './admin';

export interface JwtConfig {
  publicKey: string;
  handleJsonResponse?: ( code: number, message: string) => void;
}

export enum RoleType {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface JwtData {
  publicAddress: string,
  roleType?: RoleType,
}

export interface GenerateAuthRequest {
  signature: string;
  publicAddress: string;
  roleType?: RoleType,
}

export interface AuthResponse {
  token: string;
  user: Admin;
  roleType?: RoleType,
}
