import { PaymentPurpose } from './stripe.card';

export interface FeePayment {
  id: string;
  organization_id: string;
  collection_id: string;
  estimate_crypto: string;
  estimate_fiat?: string;
  amount_paid?: string;
  amount_expected: string;
  currency: string;
  network: string;
  status: string;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  expires_at: Date;
  tx_hash?: string;
  sender?: string;
  provider?: string;
  provider_tx_id?: string;
  active: PaymentActive | null;
}

export interface DbInsertPaymentRequest {
  organization_id: string;
  collection_id: string;
  estimate_crypto?: string;
  estimate_fiat?: string;
  amount_paid?: string;
  amount_expected?: string;
  currency: string;
  network: string;
  status: string;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  expires_at: Date;
  tx_hash?: string;
  sender?: string;
  provider?: string;
  provider_tx_id?: string;
  active?: PaymentActive | null;
}

export interface DbUpdatePaymentRequest {
  amount_paid?: string;
  status?: string;
  tx_hash?: string;
  sender?: string;
  provider?: string;
  provider_tx_id?: string;
  active?: PaymentActive | null;
}

export enum PaymentMethod {
  CRYPTO = 'CRYPTO',
  FIAT = 'FIAT',
}

export enum PaymentActive {
  ACTIVE = 'ACTIVE',
}

export enum PaymentStatus {
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
}


export interface DbGetPaymentParam {
  organization_id?: string;
  collection_id?: string;
  network?: string;
  status?: string;
  method?: PaymentMethod;
  purpose?: PaymentPurpose;
  provider?: string;
  provider_tx_id?: string;
  active?: PaymentActive | null;
}
