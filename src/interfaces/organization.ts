import { Pagination } from './pagination';
import { InviteStatus } from 'aws-sdk/clients/chime';

export enum OnboardingType {
  INVITED = 'INVITED',
  ADMIN_CREATED = 'ADMIN_CREATED',
}

export interface CreateOrganizationRequest {
  name: string;
  email: string;
  password: string;
  image?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  type?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  facebook?: string;
  instagram?: string;
  email?: string;
  admin_name?: string;
  public_address?: string;
  image?: string;
  banner?: string;
  onboarding_type?: OnboardingType;
}

export interface OrganizationInfo {
  id: string;
  name?: string;
  type?: string;
  website?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  discord?: string;
  email?: string;
  admin_name?: string;
  public_address?: string;
  image?: string;
  banner?: string;
  onboarding_type?: OnboardingType;
  nonce?: string;
}

export interface GetOrganizationInfoRequest {
  id?: string;
  email?: string;
  public_address?: string;
}

export interface GetOrganizationAuthRequest {
  id?: string;
  email?: string;
}

export interface GetOrganizationsRequest {
  name?: string;
  email?: string;
  type?: string;
  page: number;
  size: number;
}

export interface GetOrganizationsResponse {
  pagination?: Pagination;
  items: OrganizationInfo[];
}

export interface UploadFilesData {
  [fieldname: string]:Express.Multer.File[];
}


export interface CreateInviteRequest {
  name: string;
  contact_name: string;
  email: string;
}

export interface InsertInviteDbRequest {
  name: string;
  contact_name: string;
  email: string;
  email_sent: boolean;
  invite_code: string;
  expires_at: Date;
}
export interface UpdateInviteDbRequest {
  id: string;
  invite_code: string;
  expires_at: Date;
}

export interface GetInviteRequest {
  id?: string;
  email?: string;
  invite_code?: string;
}

export interface GetInvitesRequest {
  keyword?: string;
  status?: InviteStatus;
  date_sort?: string;
  page: number;
  size: number;
}
