import { OrganizationInfo } from './organization';
import { CollectionInfo } from './collection';

export interface StripeCard {
  id: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  last4: string;
}

export interface PreBillingResponse {
  stripeCustomerId: string,
  organization: OrganizationInfo,
  collection: CollectionInfo,
}
export enum StripePaymentFor {
  CONTRACT_DEPLOYMENT = 'CONTRACT_DEPLOYMENT',
  PAYOUT_ORG = 'PAYOUT_ORG',
  ADD_CONTRACT_TOKENS = 'ADD_CONTRACT_TOKENS',
}
