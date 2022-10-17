export enum OrgInviteStatus {
  NOT_SIGNED_UP = 'NOT_SIGNED_UP',
  SIGNED_UP = 'SIGNED_UP',
  EXPIRED = 'EXPIRED',
}

export enum OrgInviteType {
  ADMIN_INVITED = 'ADMIN_INVITED',
  SELF_INVITE = 'SELF_INVITE',
}

export interface OrgInvite {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  email_sent: boolean;
  invite_code: string;
  invite_type: OrgInviteType;
  status: OrgInviteStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
