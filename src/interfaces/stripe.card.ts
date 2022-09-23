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
