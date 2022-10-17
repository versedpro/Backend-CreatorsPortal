import { OrganizationInfo } from './organization';

export interface SignUpRequest {
  email: string;
  password: string;
  invite_code: string;
  invite_type?: string;
  public_address?: string;
  signature?: string;
  client_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  client_id: string;
}

export interface GenTokenRequest {
  user_id: string;
  client_id: string;
  public_address?: string;
}

export interface ChangePasswordRequest {
  email: string;
  password: string;
  otp: string;
}

export interface SaveAuthDbRequest {
  organization_id: string;
  email: string;
  password: string;
}

export interface UserAuth {
  id: string;
  organization_id: string;
  email: string;
  password: string;
  created_at: string;
  saved_at: string;
}

export interface SignUpResponse {
  token: string;
  user: OrganizationInfo;
}

export interface PasswordReset {
  id: string;
  email: string;
  otp: string;
  expires_at: string;
}

export interface GetPasswordResetDbRequest {
  email: string;
  otp: string;
  expires_at: string;
}

export interface ConnectWalletRequest {
  user_id: string;
  client_id: string;
  public_address: string;
  signature: string;
}

export interface UserWalletAuthRequest {
  client_id: string;
  public_address: string;
  signature: string;
}
