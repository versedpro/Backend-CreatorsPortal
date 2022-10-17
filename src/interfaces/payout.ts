import { Pagination } from './pagination';

export interface Payout {
  id: string;
  collection_id: string;
  tx_hash?: string;
  chain: string;
  method: PayoutMethod;
  recipient: string;
  amount: string;
  currency: string;
  amount_in_fiat?: string;
  amount_in_crypto: string;
  bank_name?: string;
  initiated_by: PayoutInitiator;
  initiator_id: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
}

export enum PayoutMethod {
  CRYPTO = 'CRYPTO',
  FIAT = 'FIAT',
}

export enum PayoutInitiator {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface GetCollectionPayoutsRequest {
  collection_id: string;
  recipient_address?: string;
  recipient_account_id?: string;
  page: number;
  size: number;
  date_sort?: string;
}

export interface GetPayoutsResponse {
  pagination?: Pagination;
  items: Payout[];
}

export interface DbGetPayoutsRequest {
  rawQuery: string;
  values: string[];
  page: number;
  size: number;
  date_sort?: string;
}

export interface CreatePayoutsRequest {
  initiated_by: PayoutInitiator;
  initiator_id: string;
  recipient_address?: string;
  recipient_account_id?: string;
  method: PayoutMethod;
  password?: string;
  organization_id: string;
  collection_id: string;
}

export interface DbInsertPayout {
  collection_id: string;
  tx_hash?: string;
  chain: string;
  method: PayoutMethod;
  recipient: string;
  amount: string;
  currency: string;
  amount_in_fiat?: string;
  amount_in_crypto: string;
  bank_name?: string;
  initiated_by: PayoutInitiator;
  initiator_id: string;
  paid_at: Date;
}
