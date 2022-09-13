import { UploadFilesData } from './organization';

export interface UpdateUserRequest {
  organizationId: string;
  body: {
    username?: string;
    name?: string;
    website?: string;
    twitter?: string;
    discord?: string;
    facebook?: string;
    instagram?: string;
  }
  files?: UploadFilesData;
}

export interface SaveUserRequest {
  public_address: string;
}

export interface GetUserRequest {
  id?: string;
  public_address?: string;
}

export interface UpdateUserDbRequest {
  username?: string;
  name?: string;
  nonce?: number;
  website?: string;
  twitter?: string;
  discord?: string;
  facebook?: string;
  instagram?: string;
  image?: string;
}

export interface UserInfo {
  id: string;
  public_address: string;
  nonce: number;
  name?: string;
  image?: string;
  username?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  facebook?: string;
  instagram?: string;
}
