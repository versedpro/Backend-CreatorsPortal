import { Attribute } from './nft';

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
