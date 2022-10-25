// noinspection ExceptionCaughtLocallyJS

import { Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as collectionService from '../services/collection.service';
import * as payoutService from '../services/payout.service';
import { StatusCodes } from 'http-status-codes';
import { IExpressRequest } from '../interfaces/i.express.request';
import {
  CreateCollectionData,
  CreatorType,
  NftCollectionStatus,
  PaymentOption,
  UpdateCollectionData
} from '../interfaces/collection';
import { CustomError } from '../helpers';
import { Logger } from '../helpers/Logger';
import { UploadFilesData } from '../interfaces/organization';
import { cleanupFiles } from '../handlers/file.cleanup.handler';
import { PayoutInitiator, PayoutMethod } from '../interfaces/payout';

export async function handleAddUserCollection(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  return handleAddCollection(req, res, CreatorType.USER);
}

export async function handleAddAdminCollection(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  return handleAddCollection(req, res, CreatorType.ADMIN);
}

export async function handleAddCollection(req: IExpressRequest, res: ExpressResponse, creatorType: CreatorType): Promise<void> {
  Logger.Info('Create Collection request', req.body);
  try {
    const creatorId = req.params.organization_id || req.userId;

    const data = req.body as CreateCollectionData;

    // Sanitize data types due to multipart form-data format
    if (req.body.quantity) {
      data.quantity = parseInt(req.body.quantity);
    }

    if (req.body.price) {
      data.price = parseFloat(req.body.price);
    }

    if (req.body.royalties) {
      data.royalties = parseFloat(req.body.royalties);
    }

    data.agree_to_terms = true;
    data.understand_irreversible_action = JSON.parse(req.body.understand_irreversible_action || false);
    data.track_ip_addresses = JSON.parse(req.body.track_ip_addresses || false);
    data.create_contract = JSON.parse(req.body.create_contract || false);
    data.payment_option = req.body.payment_option || PaymentOption.CRYPTO;
    const {
      chain,
      name,
      price,
      royalty_address,
      royalties,
      collection_name,
      collection_description,
      collection_about,
      agree_to_terms,
      understand_irreversible_action,
      track_ip_addresses,
    } = data;

    const errors: string[] = [];

    if (!name) {
      errors.push('name is required');
    }
    if (!collection_name) {
      errors.push('collection_name is required');
    }

    if (data.create_contract) {
      // Validate all params
      if (!['ethereum', 'polygon'].includes(chain)) {
        errors.push('Supported chain is required');
      }
      if (price === undefined) {
        errors.push('price is required');
      }

      if (!royalty_address) {
        errors.push('royalty_address is required');
      }
      if (!royalties) {
        errors.push('royalties is required');
      }
      if (!collection_description) {
        errors.push('collection_description is required');
      }
      if (!collection_about) {
        errors.push('collection_about is required');
      }
      if (!agree_to_terms) {
        errors.push('agree_to_terms is required');
      }
      if (!understand_irreversible_action) {
        errors.push('understand_irreversible_action is required');
      }
      if (track_ip_addresses === undefined) {
        errors.push('track_ip_addresses is required');
      }
    }

    if (errors.length > 0) {
      throw new CustomError(StatusCodes.BAD_REQUEST, `Validation errors: ${errors.join(', ')}`);
    }

    const collection = await collectionService.addCollection({
      creatorId: creatorId!,
      creatorType,
      data,
      files: req.files as UploadFilesData,
    });

    if (!collection) {
      return Response.failure(res, {
        message: 'An error occurred, Collection could not be created'
      });
    }

    return Response.success(res, {
      message: 'Successful',
      response: collection,
    }, StatusCodes.OK);
  } catch (err: any) {
    await cleanupFiles(req);
    return Response.handleError(res, err);
  }
}

export async function handleGetCollections(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const creatorId = req.params.organization_id || req.userId;

    const { name, status, oldest_date, page, size, date_sort } = req.query;

    const response = await collectionService.getOrganizationCollections({
      creatorId: <string>creatorId,
      creatorType: CreatorType.ADMIN,
      name: <string>name,
      status: status ? <string>status as NftCollectionStatus : undefined,
      oldest_date: oldest_date ? parseInt(<string>oldest_date) : undefined,
      page: parseInt(<string>page || '1'),
      size: parseInt(<string>size || '30'),
      date_sort: <string>date_sort,
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleGetCollectionById(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { collection_id: collectionId } = req.params;
    const organizationId = req.params.organization_id || req.userId;

    const response = await collectionService.getCollectionByIdAndCreator({
      organizationId: organizationId!,
      collectionId
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleUpdateCollection(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  Logger.Info('Update Collection request', req.body);
  try {
    const { collection_id: collectionId } = req.params;
    const organizationId = req.params.organization_id || req.userId;

    const data = req.body as UpdateCollectionData;

    const collection = await collectionService.updateCollection({
      organizationId: organizationId!,
      collectionId,
      data,
      files: req.files as UploadFilesData,
    });

    if (!collection) {
      return Response.failure(res, {
        message: 'An error occurred, Collection could not be updated'
      });
    }

    return Response.success(res, {
      message: 'Successful',
      response: collection,
    }, StatusCodes.OK);
  } catch (err: any) {
    await cleanupFiles(req);
    return Response.handleError(res, err);
  }
}


export async function handleGetPayouts(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const collection_id = req.params.collection_id;

    const { recipient_address, recipient_account_id, page, size, date_sort } = req.query;

    const response = await payoutService.getCollectionPayouts({
      collection_id: <string>collection_id,
      recipient_address: <string>recipient_address,
      recipient_account_id: <string>recipient_account_id,
      page: parseInt(<string>page || '1'),
      size: parseInt(<string>size || '30'),
      date_sort: <string>date_sort,
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}


export async function handleCreatePayout(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const organization_id = req.params.organization_id || req.userId;
    console.log('req.userId', req.userId);
    let initiated_by = PayoutInitiator.USER;
    if (req.params.organization_id) {
      initiated_by = PayoutInitiator.ADMIN;
    }
    const initiator_id = req.userId!;
    const collection_id = req.params.collection_id;

    if (initiated_by === PayoutInitiator.USER && !req.body.password) {
      throw new CustomError(StatusCodes.BAD_REQUEST, 'Password is required');
    }
    const { recipient_address, recipient_account_id, password } = req.body;
    const method = req.body.method as PayoutMethod;

    const response = await payoutService.processPayout({
      recipient_address: <string>recipient_address,
      recipient_account_id: <string>recipient_account_id,
      initiated_by,
      initiator_id,
      method,
      password,
      organization_id: organization_id!,
      collection_id,
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);

  } catch (err: any) {
    Logger.Info(err);
    return Response.handleError(res, err);
  }
}


export async function handleGetMintTransactions(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const collectionId = req.params.collection_id;
    const { page, size, date_sort, token_id } = req.query;

    const response = await collectionService.getMints({
      collection_id: collectionId,
      token_id: <string>token_id,
      page: parseInt(<string>page || '1'),
      size: parseInt(<string>size || '30'),
      date_sort: <string>date_sort,
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
