import { Stripe } from 'stripe';

export interface DbInsertStripeAccount {
  account_id: string;
  organization_id: string;
}

export interface GetStripeAccount {
  account_id?: string;
  organization_id?: string;
}

export interface StripeAccount {
  account_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  account_holder_name: string | null;
  account_holder_type: string | null;
  account_type: string | null;
  bank_name?: string | null;
  country: string;
  currency: string;
  fingerprint: string | null;
  last4: string;
  metadata: Stripe.Metadata | null;
  routing_number: string | null;
  status: string;
}

export interface AccountLink {
  created_at: number;
  expires_at: number;
  url: string;
}
