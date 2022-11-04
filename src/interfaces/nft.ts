export interface Attribute {
  display_type?: DisplayType;
  trait_type?: string;
  value: string | number | boolean;
}

export enum DisplayType {
  DATE = 'date',
  NUMBER = 'number',
  BOOST_PERCENTAGE = 'boost_percentage',
  BOOST_NUMBER = 'boost_number',
}

export interface UpdateMetadataRequest {
  collection_id: string;
  metadata: NftItem;
}

export interface NftItem {
  id: string;
  collection_id: string;
  token_format: string;
  chain: string;
  token_id?: string;
  image?: string;
  image_256?: string;
  image_512?: string;
  image_64?: string;
  image_data?: string;
  external_url?: string;
  description?: string;
  name: string;
  attributes?: Attribute[] | string;
  background_color?: string;
  animation_url?: string;
  youtube_url?: string;
  amount?: number;
  max_supply?: string;
  price?: number;
  royalties?: string;
}

export interface DeletedNftItemData {
  id: string,
  image?: string;
  image_256?: string;
  image_512?: string;
  image_64?: string;
}
