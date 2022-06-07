import { v4 as uuidv4 } from 'uuid';
import * as OrgService from './organization.service';
import { CollectionInfo, CreateCollectionRequest, UploadImagesResult } from '../interfaces/collection';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { s3UploadSingle } from '../helpers/aws/image.uploader';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { NftItem } from '../interfaces/nft';

export async function uploadImages(folder: string, files: Express.Multer.File[]): Promise<UploadImagesResult> {
  const imageLocations: string[] = [];
  let collectionImage: string | undefined;
  let collectionBgHeader: string | undefined;

  let itemIndex = 1;
  for (const file of files) {
    // console.log(file); // TODO: remove log
    if (file.fieldname === 'collection_image') {
      collectionImage = await s3UploadSingle(file, folder, file.fieldname);
    } else if (file.fieldname === 'collection_background_header') {
      collectionBgHeader = await s3UploadSingle(file, folder, file.fieldname);
    } else {
      const loc = await s3UploadSingle(file, folder, itemIndex.toString());
      imageLocations.push(loc);
      itemIndex++;
    }
  }
  return {
    collectionImage,
    collectionBgHeader,
    itemsImages: imageLocations,
  };
}

export async function addCollection(request: CreateCollectionRequest): Promise<CollectionInfo[]> {
  const { data, files } = request;
  const collectionId = data.collection_id || uuidv4();
  // find if organization exists
  const organization = await OrgService.getOrganization({ id: request.organizationId });

  const folder = `${organization.id}/${collectionId}`;

  // upload images
  Logger.Info('Number of files to be uploaded for collection', collectionId, files?.length);
  if (data.create_contract) {
    if (!files || (files.length != 3)) {
      throw new CustomError(StatusCodes.BAD_REQUEST, 'Please upload the 3 files');
    }
  }
  const { collectionImage, collectionBgHeader, itemsImages } = await uploadImages(folder, files);

  // Create and save collection:
  const collectionInfo = {
    id: collectionId,
    organization_id: request.organizationId,
    chain: data.chain,
    name: data.name,
    description: data.collection_description,
    about: data.collection_about,
    image: collectionImage,
    background_header: collectionBgHeader,
    agree_to_terms: data.agree_to_terms,
    understand_irreversible_action: data.understand_irreversible_action,
    track_ip_addresses: data.track_ip_addresses || false,
    first_party_data: data.first_party_data,
    royalties: data.royalties,
  };

  if (data.collection_id) {
    // Update collection
    await KnexHelper.updateNftCollection(collectionInfo);
  } else {
    // save
    const createdCollection = await KnexHelper.insertNftCollection(collectionInfo);
    Logger.Info('Created collection is', createdCollection);
  }

  let nftItem: NftItem | undefined;
  if (data.collection_id) {
    const resNfts = await KnexHelper.getNftsByCollection(collectionId);
    if (resNfts.length > 0) {
      nftItem = resNfts[0] as NftItem;
    }
  }
  const nftUUid = nftItem?.id || uuidv4();
  // Compose NFT json file
  const nftMetadata: NftItem = {
    id: nftUUid,
    collection_id: collectionId,
    token_id: '0', // assumed since we are using one item for now.
    token_format: 'ERC1155',
    chain: data.chain,
    image: itemsImages.length > 0 ? itemsImages[0] : undefined,
    description: data.collection_description,
    name: data.name,
    attributes: data.attributes,
    max_supply: data.quantity,
    price: data.price,
    royalties: data.royalties,
  };
  await KnexHelper.upsertMetadata(nftMetadata);

  // 1. Get Collection and NFT info
  // 2. verify all data is present
  // 3. Call NFT Contract
  return KnexHelper.getNftCollection(collectionId);
}
