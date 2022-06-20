export interface OrganizationKey {
  id?: string;
  organization_id: string;
  api_key: string;
  secret_key?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InsertOrganizationKeyData {
  organization_id: string;
  api_key: string;
  secret_key: string;
  status: string;
}

export interface GetOrganizationKeyData {
  organization_id: string;
  status: string;
}

export interface UpdateOrganizationKeyStatusData {
  organizationId: string;
  status: string;
}

export enum OrgKeyStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
}
