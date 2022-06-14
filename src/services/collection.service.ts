import { v4 as uuidv4 } from 'uuid';
import * as OrgService from './organization.service';
import {
  CollectionInfo,
  CreateCollectionRequest,
  NftCollectionStatus,
  UploadImagesResult
} from '../interfaces/collection';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { s3UploadSingle } from '../helpers/aws/image.uploader';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { NftItem } from '../interfaces/nft';
import * as ContractService from './contract.service';
import { LogEvent } from '../interfaces/contract';

export async function uploadImages(folder: string, files: Express.Multer.File[]): Promise<UploadImagesResult> {
  const imageLocations: string[] = [];
  let collectionImage: string | undefined;
  let collectionBgHeader: string | undefined;

  let itemIndex = 1;
  for (const file of files) {
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

  // Do some collection validation
  if (data.collection_id) {
    const collections = await KnexHelper.getNftCollection(collectionId);
    if (collections.length > 0) {
      const collection = collections[0];
      if (collection.status === NftCollectionStatus.DEPLOYED) {
        throw new CustomError(StatusCodes.BAD_REQUEST, 'Validation errors: Collection already deployed');
      }
      if (collection.organization_id.toLowerCase() !== request.organizationId.toLowerCase()) {
        throw new CustomError(StatusCodes.BAD_REQUEST, 'Validation errors: organization mismatch');
      }
    }
  }
  // find if organization exists
  const organization = await OrgService.getOrganization({ id: request.organizationId });

  const folder = `${organization.id}/${collectionId}`;

  // upload images
  Logger.Info('Number of files to be uploaded for collection', collectionId, files?.length);
  // if (data.create_contract) {
  //   if (!files || (files.length != 3)) {
  //     throw new CustomError(StatusCodes.BAD_REQUEST, 'Please upload the 3 files');
  //   }
  // }
  const { collectionImage, collectionBgHeader, itemsImages } = await uploadImages(folder, files);

  // Create and save collection:
  const collectionInfo = {
    id: collectionId,
    organization_id: request.organizationId,
    chain: data.chain,
    name: data.collection_name,
    description: data.collection_description,
    about: data.collection_about,
    image: collectionImage,
    background_header: collectionBgHeader,
    agree_to_terms: data.agree_to_terms,
    understand_irreversible_action: data.understand_irreversible_action,
    track_ip_addresses: data.track_ip_addresses || false,
    first_party_data: data.first_party_data,
    royalties: data.royalties,
    royalty_address: data.royalty_address,
    payout_address: data.payout_address,
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
    token_id: '1', // assumed since we are using one item for now.
    token_format: 'ERC1155',
    chain: data.chain,
    description: data.collection_description,
    name: data.name,
    attributes: data.attributes,
    max_supply: data.quantity,
    price: data.price,
    royalties: data.royalties,
  };
  if (itemsImages.length > 0) {
    nftMetadata.image = itemsImages[0];
  }

  await KnexHelper.upsertMetadata(nftMetadata);

  const collections = await KnexHelper.getNftCollection(collectionId);
  if (data.create_contract) {
    await callContract(collections[0]);
    return await KnexHelper.getNftCollection(collectionId);
  }
  return collections;
}

async function callContract(collection: CollectionInfo) {
  // 1. Get Collection and NFT info
  // 2. verify all data is present
  // 3. Call NFT Contract
  if (!collection.id) {
    return;
  }
  let nftItem: NftItem | undefined;
  const resNfts = await KnexHelper.getNftsByCollection(collection.id);
  if (resNfts.length > 0) {
    nftItem = resNfts[0] as NftItem;
  } else {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'NFT Item not found for collection');
  }
  const collectionErrors = verifyCollectionReady(collection);
  const itemErrors = verifyNftReady(nftItem);
  if ((collectionErrors !== '') || (itemErrors !== '')) {
    throw new CustomError(StatusCodes.BAD_REQUEST, `Validation errors: ${collectionErrors},${itemErrors}`);
  }
  const txReceipt = await ContractService.deployNftCollection({
    tokenName: nftItem.name,
    tokenSymbol: nftItem.name.substring(0, 3).toUpperCase(),
    metadataUriPrefix: `${process.env.API_BASE_URL}/nft/${collection.id}/metadata/`,
    royaltyAddress: collection.royalty_address!,
    payoutAddress: collection.payout_address!,
  });

  if (txReceipt && txReceipt.transactionHash) {
    const createdLog = (txReceipt.logs as LogEvent[]).find(x => x.data?.name === 'ERC1155Created');
    if (createdLog) {
      const contractParam = createdLog.data?.params?.find(x => x.name === 'tokenContract');
      if (contractParam && contractParam.value) {
        await KnexHelper.updateNftCollectionToDeployed(collection.id, JSON.parse(contractParam.value));
      }
    }
  }
}

function verifyCollectionReady(col: CollectionInfo): string {
  const errors: string[] = [];
  const {
    chain, name, description, about, image, background_header, agree_to_terms,
    understand_irreversible_action, royalty_address, payout_address,
  } = col;
  if (!chain) {
    errors.push('chain is required');
  }
  if (!name) {
    errors.push('collection_name is required');
  }
  if (!description) {
    errors.push('collection_description is required');
  }
  if (!royalty_address) {
    errors.push('royalty_address is required');
  }
  if (!payout_address) {
    errors.push('payout_address is required');
  }
  if (!about) {
    errors.push('collection_about is required');
  }
  if (!image) {
    errors.push('collection_image is required');
  }
  if (!background_header) {
    errors.push('collection_background_header is required');
  }
  if (!agree_to_terms) {
    errors.push('agree_to_terms is required');
  }
  if (!understand_irreversible_action) {
    errors.push('understand_irreversible_action is required');
  }
  return errors.join(', ');
}

function verifyNftReady(item: NftItem): string {
  const errors: string[] = [];
  const {
    chain, name, description, token_format, image, price,
  } = item;
  if (!chain) {
    errors.push('chain is required');
  }
  if (!name) {
    errors.push('name is required');
  }
  if (!description) {
    errors.push('description is required');
  }
  if (!token_format) {
    errors.push('token_format is required');
  }
  if (!image) {
    errors.push('image is required');
  }
  if (!price) {
    errors.push('price is required');
  }
  return errors.join(', ');
}
