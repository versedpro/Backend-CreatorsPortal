type errorData = string | object;

export interface ErrorObject extends Error {
  code?: string;
  data?: errorData;
}

export class TokenExistsError extends Error {
  constructor() {
    super('Cannot delete collection from db, still has tokens in the db');
  }
}

export class InvalidSignatureError extends Error {
  constructor() {
    super('Invalid signature');
  }
}

export class inviteExistsError extends Error {
  constructor() {
    super('Invite has already been sent to this email');
  }
}
