import { Pagination } from './pagination';
import { UploadFilesData } from './organization';

export enum FirstPartyDatumType {
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  EMAIL = 'EMAIL',
}

export interface FirstPartyDatum {
  type: FirstPartyDatumType;
  question?: string;
  is_required?: boolean;
}

export interface CreateCollectionData {
  chain: string;
  name: string;
  price: number;
  quantity: number;
  royalties: number;
  royalty_address?: string;
  payout_address?: string;
  attributes?: string;
  collection_id: string;
  collection_name: string;
  collection_description: string;
  collection_about: string;
  agree_to_terms: boolean;
  understand_irreversible_action: boolean;
  track_ip_addresses?: boolean;
  first_party_data?: string;
  create_contract: boolean;
  payment_option: PaymentOption;
}

export interface CollectionInfo {
  id?: string;
  organization_id?: string;
  user_id?: string;
  chain: string;
  name: string;
  description?: string;
  royalties?: number;
  about: string;
  status?: string;
  royalty_address?: string;
  payout_address?: string;
  contract_address?: string;
  image?: string;
  background_header?: string;
  agree_to_terms: boolean;
  understand_irreversible_action: boolean;
  track_ip_addresses: boolean;
  first_party_data?: FirstPartyDatum[] | string;
  main_link?: string;
  social_links?: CollectionSocialLink[] | string;
  whitelist_host_addresses?: string[];
  checkout_background_color?: string;
  checkout_font?: string;
  checkout_font_size?: string;
  checkout_font_color?: string;
  terms_and_condition_enabled?: string;
  terms_and_condition_link?: string;
  contract_balance?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCollectionRequest {
  creatorId: string;
  creatorType: CreatorType;
  data: CreateCollectionData;
  files: UploadFilesData;
}

export interface UploadImagesResult {
  collectionImage?: string;
  collectionBgHeader?: string;
  itemsImages: string[];
}

export enum NftCollectionStatus {
  // IN_PROGRESS = 'IN_PROGRESS',
  DEPLOYED = 'DEPLOYED',
  DRAFT = 'DRAFT',
  PROCESSING_PAYMENT = 'PROCESSING_PAYMENT',
  DEPLOYMENT_IN_PROGRESS = 'DEPLOYMENT_IN_PROGRESS',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
}

export interface GetCollectionRequest {
  organizationId: string;
  collectionId: string;
}

export interface GetOrganizationCollectionsRequest {
  creatorId: string;
  creatorType: CreatorType;
  name?: string;
  status?: NftCollectionStatus;
  oldest_date?: number;
  page: number;
  size: number;
  date_sort?: string;
}

export interface DbGetOrganizationCollectionsRequest {
  rawQuery: string;
  values: string[];
  page: number;
  size: number;
  date_sort?: string;
}

export interface GetCollectionsResponse {
  pagination?: Pagination;
  items: CollectionInfo[];
}

export interface CollectionSocialLink {
  name: string;
  url: string;
  enabled: boolean;
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  about?: string;
  first_party_data?: string;
  main_link?: string;
  track_ip_addresses?: string;
  social_links?: string;
  checkout_background_color?: string;
  whitelist_host_addresses?: string[];
  checkout_font?: string;
  checkout_font_size?: string;
  checkout_font_color?: string;
  terms_and_condition_enabled?: string;
  terms_and_condition_link?: string;
}

export interface DbUpdateCollectionData {
  id: string;
  description?: string;
  about?: string;
  first_party_data?: string;
  main_link?: string;
  track_ip_addresses?: boolean;
  social_links?: string;
  whitelist_host_addresses?: string[];
  image?: string;
  background_header?: string;
  checkout_background_color?: string;
  checkout_font?: string;
  checkout_font_size?: string;
  checkout_font_color?: string;
  terms_and_condition_enabled?: string;
  terms_and_condition_link?: string;
}

export interface UpdateCollectionRequest {
  organizationId: string,
  collectionId: string,
  data: UpdateCollectionData,
  files: UploadFilesData;
}

export interface FirstPartyQuestionAnswer extends FirstPartyQuestionAnswerInsertData {
  id: string;
}

export interface FirstPartyQuestionAnswerInsertData extends FirstPartyQuestionAnswerDatum {
  collection_id: string;
  wallet_address: string;
}

export interface FirstPartyQuestionAnswerDatum {
  question_type: FirstPartyDatumType;
  question?: string;
  answer: string;
}

export interface AnswerRequest {
  collectionId: string;
  walletAddress: string;
  answers: FirstPartyQuestionAnswerInsertData[];
}

export enum CreatorType {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum PaymentOption {
  CRYPTO = 'CRYPTO',
  CREDIT_CARD = 'CREDIT_CARD',
}

export interface DbUpdateCollectionPayment {
  status?: string;
}

export interface CreateCollectionResponse extends CollectionInfo {
  payment_option: PaymentOption;
  fees_estimate_crypto: string;
  fees_estimate_fiat?: string;
  currency: string;
}
