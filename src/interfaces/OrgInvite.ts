export enum OrgInviteStatus {
  NOT_SIGNED_UP = 'NOT_SIGNED_UP',
  SIGNED_UP = 'SIGNED_UP',
  EXPIRED = 'EXPIRED',
}

export interface OrgInvite {
  id: string;
  name: string;
  email: string;
  email_sent: boolean;
  invite_code: string;
  status: OrgInviteStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
