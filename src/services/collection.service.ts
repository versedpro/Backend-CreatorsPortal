import { v4 as uuidv4 } from 'uuid';
import {
  AnswerRequest,
  CollectionInfo,
  CreateCollectionRequest,
  CreatorType,
  DbUpdateCollectionData,
  FirstPartyQuestionAnswer,
  FirstPartyQuestionAnswerInsertData,
  GetCollectionRequest,
  GetCollectionsResponse,
  GetOrganizationCollectionsRequest,
  NftCollectionStatus,
  UpdateCollectionRequest,
  UploadImagesResult
} from '../interfaces/collection';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { s3UploadSingle } from '../helpers/aws/image.uploader';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { NftItem } from '../interfaces/nft';
import { LogEvent } from '../interfaces/contract';
import { OrganizationInfo, UploadFilesData } from '../interfaces/organization';
import { ContractServiceRegistry } from '../helpers/contract.service.registry';
import * as CacheHelper from '../helpers/cache.helper';

export async function uploadImages(folder: string, files: UploadFilesData, onlyNftImage = true): Promise<UploadImagesResult> {
  const imageLocations: string[] = [];
  let collectionImage: string | undefined;
  let collectionBgHeader: string | undefined;

  try {
    let itemIndex = 1;
    if (!onlyNftImage) {
      if (files['collection_image']) {
        const file = files['collection_image'][0];
        collectionImage = await s3UploadSingle(file, folder, file.fieldname);
      }
      if (files['collection_background_header']) {
        const file = files['collection_background_header'][0];
        collectionBgHeader = await s3UploadSingle(file, folder, file.fieldname);
      }
    }

    if (files['image']) {
      const file = files['image'][0];
      const loc = await s3UploadSingle(file, folder, itemIndex.toString());
      imageLocations.push(loc);
      itemIndex++;
    }
  } catch (err: any) {
    Logger.Error(err.message || err);
  }

  return {
    collectionImage,
    collectionBgHeader,
    itemsImages: imageLocations,
  };
}

export async function getCreatorId(id: string): Promise<string> {
  Logger.Info('Getting Creator...', id);
  const result = await KnexHelper.getOrganizationInfo({ id });
  if (result.length > 0) {
    return (result[0] as OrganizationInfo).id;
  }
  // const user = await KnexHelper.getUserById(id);
  // if (user) {
  //   return user.id;
  // }
  throw new CustomError(StatusCodes.NOT_FOUND, 'Creator not found');
}

function composeIdParam(creatorId: string, creatorType: CreatorType) {
  if (creatorType === CreatorType.ORGANIZATION) {
    return { organization_id: creatorId };
  } else {
    return { user_id: creatorId };

  }
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
      if ((collection.organization_id || collection.user_id)!.toLowerCase() !== request.creatorId.toLowerCase()) {
        throw new CustomError(StatusCodes.BAD_REQUEST, 'Validation errors: creator mismatch');
      }
    }
  }
  // find if organization or user exists
  const creatorId = await getCreatorId(request.creatorId);

  const folder = `${request.creatorType.toLowerCase()}/${creatorId}/${collectionId}`;

  // upload images
  Logger.Info('Number of files to be uploaded for collection', collectionId, files ? Object.keys(files).length : 0);
  if (data.create_contract && !data.collection_id) {
    if (!files || (Object.keys(files).length != 1)) {
      throw new CustomError(StatusCodes.BAD_REQUEST, 'Please upload the file');
    }
  }
  const { collectionImage, collectionBgHeader, itemsImages } = await uploadImages(folder, files);

  // Create and save collection:
  const collectionInfo = {
    id: collectionId,
    chain: data.chain,
    ...composeIdParam(creatorId, request.creatorType),
    name: data.collection_name,
    description: data.collection_description,
    about: data.collection_about,
    image: collectionImage || itemsImages[0],
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
    royalties: data.royalties.toString(),
  };
  if (itemsImages.length > 0) {
    nftMetadata.image = itemsImages[0];
  }

  await KnexHelper.upsertMetadata(nftMetadata);

  const collections = await KnexHelper.getNftCollection(collectionId);
  if ((request.creatorType === CreatorType.ORGANIZATION) && data.create_contract) {
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
  const contractService = ContractServiceRegistry.getService(collection.chain);
  if (!collection.contract_address) {
    const txReceipt = await contractService.deployNftCollection({
      collectionName: collection.name,
      collectionSymbol: collection.name.substring(0, 3).toUpperCase(),
      metadataUriPrefix: `${process.env.API_BASE_URL}/nft/${collection.id}/metadata/`,
      royaltyAddress: collection.royalty_address!,
      payoutAddress: collection.payout_address!,
      tokenId: 1,
      quantity: nftItem.max_supply,
      price: nftItem!.price!.toString(),
      royalty: parseInt(nftItem.royalties || '0'),
    });

    if (txReceipt && txReceipt.transactionHash) {
      const createdLog = (txReceipt.logs as LogEvent[]).find(x => x.data?.name === 'ERC1155Created');
      if (createdLog) {
        const contractParam = createdLog.data?.params?.find(x => x.name === 'tokenContract');
        if (contractParam && contractParam.value) {
          const contractAddress = JSON.parse(contractParam.value);
          await KnexHelper.updateNftCollectionAddress(collection.id, contractAddress);
          // await KnexHelper.updateNftCollectionToDeployed(collection.id);
          // No need to await these calls, causing response to be slow
          // updateCollectionContract(contractAddress, collection, nftItem);
        }
      }
    }
  }
}

function verifyCollectionReady(col: CollectionInfo): string {
  const errors: string[] = [];
  const {
    chain, name, description, about, agree_to_terms,
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
  // if (!image) {
  //   errors.push('collection_image is required');
  // }
  // if (!background_header) {
  //   errors.push('collection_background_header is required');
  // }
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

export async function getCollectionByIdAndCreator(body: GetCollectionRequest): Promise<CollectionInfo> {
  const results = await KnexHelper.getNftCollectionByParams({
    id: body.collectionId,
    ...composeIdParam(body.creatorId, body.creatorType),
  });
  if (results.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Collection does not exist');
  }
  return results[0];
}

export async function getCollectionById(id: string): Promise<CollectionInfo> {
  const cacheKey = `Collection_Data_${id}`;
  let collection = await CacheHelper.get(cacheKey);
  if (collection) {
    return collection;
  }
  const results = await KnexHelper.getNftCollectionByParams({ id });
  if (results.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Collection does not exist');
  }
  collection = results[0];
  // Cache for 30 minutes
  await CacheHelper.set(cacheKey, collection, 1800);
  return collection;
}

export function generateCollectionWhereClause(request: GetOrganizationCollectionsRequest): { rawQuery: string, values: any[] } {
  const { creatorId, name, status, oldest_date } = request;

  let rawQuery = '';
  const clauses: string[] = [];
  const values: any[] = [];
  // Search params
  clauses.push(request.creatorType === CreatorType.ORGANIZATION ? 'organization_id = ?' : 'user_id = ?');
  values.push(creatorId);

  if (name) {
    clauses.push('name ILIKE ?');
    values.push(`%${name}%`);
  }
  if (status) {
    clauses.push('status = ?');
    values.push(status);
  }

  if (oldest_date) {
    clauses.push('updated_at >= ?');
    values.push(new Date(oldest_date));
  }

  rawQuery += ' WHERE ' + clauses.join(' AND ');

  return { rawQuery, values };
}

export async function getOrganizationCollections(body: GetOrganizationCollectionsRequest): Promise<GetCollectionsResponse> {
  const { rawQuery, values } = generateCollectionWhereClause(body);
  return await KnexHelper.getCollections({
    rawQuery,
    values,
    page: body.page,
    size: body.size,
  });
}

export async function updateCollection(request: UpdateCollectionRequest): Promise<CollectionInfo[]> {
  const { creatorId, collectionId, data, files } = request;

  Logger.Info('files', files);
  await getCollectionByIdAndCreator({ creatorId: creatorId, creatorType: request.creatorType, collectionId });

  // // find if organization or user exists
  // const creatorId = await getCreatorId(request.creatorId);

  const folder = `${request.creatorType.toLowerCase()}/${creatorId}/${collectionId}`;

  // upload images
  Logger.Info('Number of files to be uploaded for collection', collectionId, files?.length);
  if (files && (Object.keys(files).length > 2)) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Please upload max of 2 files');
  }

  const { collectionImage, collectionBgHeader } = await uploadImages(folder, files, false);

  // Create and save collection:
  const collectionInfo: DbUpdateCollectionData = {
    id: collectionId,
    description: data.description,
    about: data.about,
    first_party_data: data.first_party_data,
    track_ip_addresses: data.track_ip_addresses === 'true',
    // new ones
    main_link: data.main_link,
    social_links: data.social_links,
    whitelist_host_addresses: data.whitelist_host_addresses,
    // end of new ones
    image: collectionImage,
    background_header: collectionBgHeader,
    checkout_background_color: data.checkout_background_color,

    // plugin UI updates
    checkout_font: data.checkout_font,
    checkout_font_size: data.checkout_font_size,
    checkout_font_color: data.checkout_font_color,
    terms_and_condition_enabled: data.terms_and_condition_enabled,
    terms_and_condition_link: data.terms_and_condition_link,
  };
  // Update collection
  await KnexHelper.updateNftCollection(collectionInfo);
  const cacheKey = `mint_info_${collectionId}`;
  await CacheHelper.del(cacheKey);
  await CacheHelper.del(`Collection_Data_${collectionId}`);
  return await KnexHelper.getNftCollection(collectionId);
}

export async function saveAnsweredQuestions(body: AnswerRequest): Promise<FirstPartyQuestionAnswer[]> {
  const { collectionId, walletAddress, answers } = body;
  const toBeSavedArr = answers.map(ans => {
    const insertAns: FirstPartyQuestionAnswerInsertData = {
      collection_id: collectionId,
      wallet_address: walletAddress,
      question_type: ans.question_type,
      question: ans.question,
      answer: ans.answer,
    };
    return insertAns;
  });
  const result = await KnexHelper.insertMintAnswers(toBeSavedArr);
  return result as FirstPartyQuestionAnswer[];
}
