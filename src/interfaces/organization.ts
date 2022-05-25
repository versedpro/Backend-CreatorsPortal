import { Pagination } from './pagination';

export interface UpdateOrganizationRequest {
  name?: string;
  type?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  admin_email?: string;
  admin_name?: string;
  admin_wallet_address?: string;
}

export interface OrganizationInfo {
  id: string;
  name?: string;
  type?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  admin_email?: string;
  admin_name?: string;
  admin_wallet_address?: string;
}

export interface GetOrganizationInfoRequest {
  id?: string;
}

export interface GetOrganizationsRequest {
  name?: string;
  admin_email?: string;
  type?: string;
  page: number;
  size: number;
}

export interface GetOrganizationsResponse {
  pagination?: Pagination;
  items: OrganizationInfo[];
}
