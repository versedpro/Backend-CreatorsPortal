import { v4 as uuidv4 } from 'uuid';
import {
  AddCollectionAssetRequest,
  AnswerRequest,
  AssetUploadResponseData,
  CollectionInfo,
  CreateCollectionRequest,
  CreateCollectionResponse,
  CreatorType,
  DbUpdateCollectionData,
  FirstPartyQuestionAnswer,
  FirstPartyQuestionAnswerInsertData,
  GetCollectionAssetsRequest,
  GetCollectionAssetsResponse,
  GetCollectionRequest,
  GetCollectionsResponse,
  GetDeployRequestBodyResponse,
  GetOrganizationCollectionsRequest,
  NftCollectionStatus,
  PaymentOption,
  RemoveCollectionAssetRequest,
  UpdateCollectionAssetRequest,
  UpdateCollectionRequest,
  UploadImagesResult
} from '../interfaces/collection';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { deleteMultipleFromS3, s3UploadSingle, s3UploadSingleAllResolutions } from '../helpers/aws/image.uploader';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { NftItem } from '../interfaces/nft';
import { LogEvent } from '../interfaces/contract';
import { OrganizationInfo, UploadFilesData } from '../interfaces/organization';
import { ContractServiceRegistry } from '../helpers/contract.service.registry';
import * as CacheHelper from '../helpers/cache.helper';
import axios from 'axios';
import { PaymentPurpose } from '../interfaces/stripe.card';
import { DbInsertPaymentRequest, PaymentActive, PaymentMethod, PaymentStatus } from '../interfaces/PaymentRequest';
import { GetMintsResponse, GetMintTransactionsRequest } from '../interfaces/mint.transaction';
import { BigNumber, ethers } from 'ethers';

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
  throw new CustomError(StatusCodes.NOT_FOUND, 'Creator not found');
}

export async function addCollection(request: CreateCollectionRequest): Promise<CollectionInfo | CreateCollectionResponse | undefined> {
  const { data, files } = request;
  const collectionId = data.collection_id || uuidv4();
  let currentCollectionStatus: NftCollectionStatus | undefined;
  // Do some collection validation
  try {
    if (data.collection_id) {
      const collection = await KnexHelper.getNftCollectionByID(collectionId);
      if (collection) {
        if (collection.status === NftCollectionStatus.DEPLOYED) {
          throw new CustomError(StatusCodes.BAD_REQUEST, 'Validation errors: Collection already deployed');
        }
        // LOCKED state
        if (collection.status === NftCollectionStatus.DEPLOYMENT_IN_PROGRESS) {
          throw new CustomError(StatusCodes.BAD_REQUEST, 'Validation errors: Collection deployment in progress');
        }
        if (collection.organization_id!.toLowerCase() !== request.creatorId.toLowerCase()) {
          throw new CustomError(StatusCodes.BAD_REQUEST, 'Validation errors: creator mismatch');
        }
        // LOCK the process to avoid concurrent deployments
        // The Lock is released after process runs cos status is updated.
        currentCollectionStatus = collection.status;
        await KnexHelper.updateNftCollectionPayment(collectionId, {
          status: NftCollectionStatus.DEPLOYMENT_IN_PROGRESS,
        });
      }
    }

    // find if organization or user exists
    const creatorId = await getCreatorId(request.creatorId);

    const folder = `${creatorId}/${collectionId}`;

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
      organization_id: creatorId,
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
      is_multiple_nft: data.is_multiple_nft,
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
    if (!data.is_multiple_nft) {
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
        max_supply: data.quantity?.toString(),
        price: data.price,
        royalties: data.royalties.toString(),
      };
      if (itemsImages.length > 0) {
        nftMetadata.image = itemsImages[0];
      }

      await KnexHelper.upsertMetadata(nftMetadata);
    }

    const collection = await KnexHelper.getNftCollectionByID(collectionId);
    if ((request.creatorType === CreatorType.ADMIN) && data.create_contract) {
      await callContract(collection!, currentCollectionStatus);
      return await KnexHelper.getNftCollectionByID(collectionId);
    } else if ((request.creatorType === CreatorType.USER) && data.create_contract) {
      // Estimate gas
      const gasResp = await getGasPrice(collection!, request.data.payment_option);
      // if payment method is credit_card: convert Estimate to USD
      // return estimate with response.
      const updatedCollection = await KnexHelper.getNftCollectionByID(collectionId);
      return {
        ...updatedCollection,
        payment_option: request.data.payment_option || PaymentOption.CRYPTO,
        fees_estimate_crypto: gasResp.estimate_crypto,
        fees_estimate_fiat: gasResp.estimate_fiat,
        currency: gasResp.currency,
      } as CreateCollectionResponse;

    }
    if (currentCollectionStatus) {
      await KnexHelper.updateNftCollectionPayment(data.collection_id, {
        status: currentCollectionStatus,
      });
    }
    return await KnexHelper.getNftCollectionByID(collectionId);
  } catch (err: any) {
    // If error occurs Release LOCK
    if (currentCollectionStatus) {
      await KnexHelper.updateNftCollectionPayment(data.collection_id, {
        status: currentCollectionStatus,
      });
    }
    throw err;
  }
}


async function getDeployRequestBody(collection: CollectionInfo): Promise<GetDeployRequestBodyResponse | undefined> {
  // 1. Get Collection and NFT info
  // 2. verify all data is present
  if (!collection.id) {
    return;
  }
  // let nftItem: NftItem | undefined;
  const resNfts = await KnexHelper.getNftsByCollection(collection.id);
  if (resNfts.length <= 0) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'NFT Item not found for collection');
  }
  const collectionErrors = verifyCollectionReady(collection);
  resNfts.forEach(nftItem => {
    const itemErrors = verifyNftReady(nftItem);
    if ((collectionErrors !== '') || (itemErrors !== '')) {
      throw new CustomError(StatusCodes.BAD_REQUEST, `Validation errors: ${collectionErrors},${itemErrors}`);
    }
  });

  if (!collection.contract_address) {
    return {
      collectionName: collection.name,
      collectionSymbol: collection.name.substring(0, 3).toUpperCase(),
      metadataUriPrefix: `${process.env.API_BASE_URL}/nft/${collection.id}/metadata/`,
      royaltyAddress: collection.royalty_address!,
      tokenCount: resNfts.length,
      mintPrices: resNfts.map(nftItem => ethers.utils.parseEther(nftItem.price?.toString() || '0')),
      maxSupplies: resNfts.map(nftItem => nftItem.max_supply ? BigNumber.from(nftItem.max_supply) : ethers.constants.MaxInt256),
      royalty: parseInt(collection.royalties?.toString() || '0'),
    };
  }
}

async function getGasPrice(collection: CollectionInfo, paymentOption: PaymentOption): Promise<{ currency: string, estimate_crypto: string, estimate_fiat?: string }> {
  const contractService = ContractServiceRegistry.getService(collection.chain);
  const requestBody = await getDeployRequestBody(collection);
  if (requestBody && collection.id) {
    try {
      let gasEstimateUSD: string | undefined;
      const gasPrice = await contractService.estimateDeploymentGas(requestBody);
      Logger.Info(`Gas Price to pay is ${gasPrice}`);
      if (!gasPrice) {
        throw new CustomError(StatusCodes.INTERNAL_SERVER_ERROR, 'Could not estimate gas fees');
      }
      const paymentData: DbInsertPaymentRequest = {
        organization_id: collection.organization_id!,
        collection_id: collection.id,
        estimate_crypto: gasPrice!.toString(),
        amount_expected: gasPrice!.toString(),
        currency: collection.chain === 'ethereum' ? 'ETH' : 'MATIC',
        network: collection.chain,
        method: PaymentMethod.CRYPTO,
        purpose: PaymentPurpose.CONTRACT_DEPLOYMENT,
        expires_at: new Date(Date.now() + 600000),
        active: PaymentActive.ACTIVE,
        status: PaymentStatus.PENDING,
      };

      if (paymentOption === PaymentOption.CREDIT_CARD) {
        Logger.Info('Paying with credit card');
        // Get estimate in USD.
        const ethToUSD: number = (await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${paymentData.currency}&tsyms=USD`)).data.USD;
        let gasEstimateUSDFloat = (parseFloat(gasPrice!) * ethToUSD);
        if (gasEstimateUSDFloat < 0.50) {
          gasEstimateUSDFloat = 0.50;
        }
        gasEstimateUSD = gasEstimateUSDFloat.toFixed(2);
        paymentData.amount_expected = gasEstimateUSD;
        paymentData.estimate_fiat = gasEstimateUSD;
        paymentData.currency = 'USD';
        paymentData.method = PaymentMethod.FIAT;
        paymentData.provider = 'stripe';
      }
      // find and update collection_id, purpose and (status = PENDING), active = ACTIVE:
      await KnexHelper.insertFeePayment(paymentData);
      await KnexHelper.updateNftCollectionPayment(collection.id, {
        status: NftCollectionStatus.DRAFT,
      });
      return {
        currency: paymentData.currency,
        estimate_crypto: gasPrice!.toString(),
        estimate_fiat: gasEstimateUSD,
      };
    } catch (err: any) {
      Logger.Error(err);
    }
  }
  throw new CustomError(StatusCodes.INTERNAL_SERVER_ERROR, 'Could not estimate gas fees');
}

export async function callContract(collection: CollectionInfo, currentCollectionStatus?: NftCollectionStatus) {
  // 3. Call NFT Contract
  const contractService = ContractServiceRegistry.getService(collection.chain);
  const requestBody = await getDeployRequestBody(collection);
  if (requestBody) {
    const txReceipt = await contractService.deployNftCollection(requestBody);
    if (txReceipt && txReceipt.transactionHash) {
      // add token_id to all items
      KnexHelper.attachMetadataTokenId(collection.id!);
      const createdLog = (txReceipt.logs as LogEvent[]).find(x => x.data?.name === 'ERC1155Created');
      if (createdLog) {
        const contractParam = createdLog.data?.params?.find(x => x.name === 'tokenContract');
        if (contractParam && contractParam.value) {
          const contractAddress = JSON.parse(contractParam.value);
          await KnexHelper.updateNftCollectionAddress(collection.id!, contractAddress);
        }
      }
    } else {
      // If error occurs Release LOCK
      if (currentCollectionStatus) {
        await KnexHelper.updateNftCollectionPayment(collection.id!, {
          status: currentCollectionStatus,
        });
      }
    }
  }
}

function verifyCollectionReady(col: CollectionInfo): string {
  const errors: string[] = [];
  const {
    chain, name, description, about, agree_to_terms,
    understand_irreversible_action, royalty_address,
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
  if (price === undefined) {
    errors.push('price is required');
  }
  return errors.join(', ');
}

export async function getCollectionByIdAndCreator(body: GetCollectionRequest): Promise<CollectionInfo> {
  const results = await KnexHelper.getNftCollectionByParams({
    id: body.collectionId,
    organization_id: body.organizationId,
  });
  if (results.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Collection does not exist');
  }
  const collection = results[0];
  if (collection.contract_address) {
    // get balance

    const contractService = ContractServiceRegistry.getService(collection.chain);
    const balanceInWei = await contractService.getAddressBalance(collection.contract_address);
    collection.contract_balance = balanceInWei.toString();
  }
  return collection;
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
  clauses.push('organization_id = ?');
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
    date_sort: body.date_sort,
  });
}

export async function updateCollection(request: UpdateCollectionRequest): Promise<CollectionInfo | undefined> {
  const { organizationId, collectionId, data, files } = request;

  Logger.Info('files', files);
  await getCollectionByIdAndCreator({ organizationId: organizationId, collectionId });

  // // find if organization or user exists
  // const creatorId = await getCreatorId(request.creatorId);

  const folder = `${organizationId}/${collectionId}`;

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
    // get new ones
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
  return await KnexHelper.getNftCollectionByID(collectionId);
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

export async function getMints(body: GetMintTransactionsRequest): Promise<GetMintsResponse> {
  return await KnexHelper.getMints(body);
}

export async function addCollectionAssets(request: AddCollectionAssetRequest): Promise<AssetUploadResponseData> {
  const { organizationId, collectionId, files } = request;
  if (!files) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Please upload assets data for all files uploaded');
  }
  const collection = await getCollectionByIdAndCreator({ organizationId, collectionId });
  if (collection.status !== NftCollectionStatus.DRAFT) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Collection needs to be in status DRAFT');
  }
  if (!collection.is_multiple_nft) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Collection is not multiple NFTs');
  }

  const folder = `${organizationId}/${collectionId}`;

  // upload images
  Logger.Info('Number of files to be uploaded for collection', collectionId, files?.length);
  if (files && (Object.keys(files).length > 20)) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Please upload max of 20 files');
  }
  // This Map maps the fileId sent from the frontend to the assetId
  const assetIdMap: AssetUploadResponseData = {};
  const bulkMetadata: NftItem[] = [];

  if (!files) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Please upload files');
  }
  for (let i = 0; i < files.length; i++) {
    try {
      const file = files[i];
      // const assetDatum = assets_data[i];

      const assetId = uuidv4();
      // upload and create db record
      // const loc = await s3UploadSingle(file, folder, assetId);
      const uploadResponse = await s3UploadSingleAllResolutions(file, folder, assetId);

      // assetIdMap[`${assetDatum.file_id}`] = assetId;

      const nftMetadata: NftItem = {
        id: assetId,
        collection_id: collectionId,
        token_format: 'ERC1155',
        chain: collection.chain,
        description: collection.description,
        name: '',
        // name: assetDatum.name,
        // attributes: assetDatum.attributes,
        // max_supply: assetDatum.quantity?.toString(),
        // price: assetDatum.price,
        royalties: collection.royalties?.toString(),
        image: uploadResponse.original,
        image_256: uploadResponse.image256,
        image_512: uploadResponse.image512,
        image_64: uploadResponse.image64,
      };
      bulkMetadata.push(nftMetadata);
    } catch (err: any) {
      Logger.Error(err);
    }
  }
  await KnexHelper.bulkUpsertMetadata(bulkMetadata);
  return assetIdMap;
}

export async function getCollectionAssets(body: GetCollectionAssetsRequest): Promise<GetCollectionAssetsResponse> {
  return await KnexHelper.getCollectionAssets(body);
}

export async function removeCollectionAssets(request: RemoveCollectionAssetRequest): Promise<string[]> {
  const { organizationId, collectionId, assets_ids } = request;
  if (assets_ids.length < 1) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'assetIds array cannot be empty');
  }
  const collection = await getCollectionByIdAndCreator({ organizationId, collectionId });
  if (collection.status !== NftCollectionStatus.DRAFT) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Collection needs to be in status DRAFT');
  }

  const nftItems = await KnexHelper.deleteNftsByIds(assets_ids);
  const imageLocations: string[] = [];
  nftItems.forEach(nft => {
    if (nft.image) {
      imageLocations.push(nft.image);
    }
  });
  await deleteMultipleFromS3(imageLocations);
  return nftItems.map(x => x.id);
}

export async function updateCollectionAssets(request: UpdateCollectionAssetRequest): Promise<void> {
  const { organizationId, collectionId, assets_data } = request;

  const collection = await getCollectionByIdAndCreator({ organizationId, collectionId });
  if (collection.status !== NftCollectionStatus.DRAFT) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Collection needs to be in status DRAFT');
  }
  if (assets_data[0].id === '00000000-0000-0000-0000-000000000000') {
    const data = assets_data[0];
    if (data.id) {
      // @ts-ignore
      delete data.id;
    }
    await KnexHelper.updateCollectionAllNftItems(collectionId, data);
  } else {
    for (const assetDatum of assets_data) {
      await KnexHelper.updateNftItem(assetDatum.id, assetDatum);
    }
  }
}

