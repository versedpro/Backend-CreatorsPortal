import { Pagination } from './pagination';

export interface MintTransaction {
  id: string;
  collection_id: string;
  token_id: string;
  contract_address: string;
  to_address: string;
  quantity: string;
  price: string;
  minted_at: string;
  chain: string;
  tx_hash: string;
  method: PayoutMethod;
}

export enum PayoutMethod {
  CRYPTO = 'CRYPTO',
  FIAT = 'FIAT',
}

export interface GetMintTransactionsRequest {
  collection_id: string;
  token_id?: string;
  page: number;
  size: number;
  date_sort?: string;
}

export interface GetMintsResponse {
  pagination?: Pagination;
  items: MintTransaction[];
}
