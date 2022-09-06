import { UploadFilesData } from './organization';

export interface SaveAdminRequest {
  public_address: string;
}

export interface GetAdminRequest {
  public_address?: string;
}

export interface UpdateAdminRequest {
  public_address: string;
  username: string;
  files: UploadFilesData;
}

export interface UpdateDbAdminRequest {
  username?: string;
  nonce?: number;
  image?: string;
}

export interface Admin {
  id: string;
  public_address: string;
  username: string;
  nonce: number;
  image?: string;
}
