import { Attribute } from './nft';
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
  attributes?: Attribute[];
  collection_id: string;
  collection_name: string;
  collection_description: string;
  collection_about: string;
  agree_to_terms: boolean;
  understand_irreversible_action: boolean;
  track_ip_addresses?: boolean;
  first_party_data?: FirstPartyDatum[];
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
  first_party_data?: FirstPartyDatum[];
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
