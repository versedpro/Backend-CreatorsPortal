import { Pagination } from './pagination';

export enum FirstPartyDatumType {
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  EMAIL = 'EMAIL',
}

export interface FirstPartyDatum {
  type: FirstPartyDatumType;
  question?: string;
  required?: boolean;
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
}

export interface CollectionInfo {
  id?: string;
  organization_id: string;
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
  created_at?: string;
  updated_at?: string;
}

export interface CreateCollectionRequest {
  organizationId: string,
  data: CreateCollectionData,
  files: Express.Multer.File[];
}

export interface UploadImagesResult {
  collectionImage?: string;
  collectionBgHeader?: string;
  itemsImages: string[];
}

export enum NftCollectionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  DEPLOYED = 'DEPLOYED',
}

export interface GetCollectionRequest {
  organizationId: string;
  collectionId: string;
}

export interface GetOrganizationCollectionsRequest {
  organization_id: string;
  name?: string;
  status?: NftCollectionStatus;
  oldest_date?: number;
  page: number;
  size: number;
}

export interface DbGetOrganizationCollectionsRequest {
  rawQuery: string;
  values: string[];
  page: number;
  size: number;
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
  whitelist_host_addresses?: string[];
}

export interface DbUpdateCollectionData {
  id: string;
  name?: string;
  description?: string;
  about?: string;
  first_party_data?: string;
  main_link?: string;
  track_ip_addresses?: boolean;
  social_links?: string;
  whitelist_host_addresses?: string[];
  image?: string;
  background_header?: string;
}

export interface UpdateCollectionRequest {
  organizationId: string,
  collectionId: string,
  data: UpdateCollectionData,
  files: Express.Multer.File[];
}
