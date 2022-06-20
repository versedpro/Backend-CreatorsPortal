// noinspection ExceptionCaughtLocallyJS

import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as collectionService from '../services/collection.service';
import { StatusCodes } from 'http-status-codes';
import { IExpressRequest } from '../interfaces/i.express.request';
import { CreateCollectionData, NftCollectionStatus } from '../interfaces/collection';
import { CustomError } from '../helpers';
import { Logger } from '../helpers/Logger';

export async function handleAddCollection(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  Logger.Info('Create Collection request', req.body);
  try {
    const organizationId = req.params.organization_id;

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

    data.agree_to_terms = JSON.parse(req.body.agree_to_terms || false);
    data.understand_irreversible_action = JSON.parse(req.body.understand_irreversible_action || false);
    data.track_ip_addresses = JSON.parse(req.body.track_ip_addresses || false);
    data.create_contract = JSON.parse(req.body.create_contract || false);

    const {
      chain,
      name,
      price,
      royalty_address,
      payout_address,
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
      if (!['ethereum'].includes(chain)) {
        errors.push('Supported chain is required');
      }
      if (!price) {
        errors.push('price is required');
      }

      if (!royalty_address) {
        errors.push('royalty_address is required');
      }
      if (!payout_address) {
        errors.push('payout_address is required');
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

    const collectionArr = await collectionService.addCollection({
      organizationId,
      data,
      files: req.files as Express.Multer.File[],
    });

    if (collectionArr.length < 1) {
      return Response.failure(res, {
        message: 'An error occurred, Collection could no tbe created'
      });
    }

    return Response.success(res, {
      message: 'Successful',
      response: collectionArr[0],
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleGetCollections(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { organization_id } = req.params;

    const { name, status, oldest_date, page, size } = req.query;

    const response = await collectionService.getOrganizationCollections({
      organization_id: <string>organization_id,
      name: <string>name,
      status: status ? <string>status as NftCollectionStatus : undefined,
      oldest_date: oldest_date ? parseInt(<string>oldest_date) : undefined,
      page: parseInt(<string>page || '1'),
      size: parseInt(<string>size || '30'),
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleGetCollectionById(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { organization_id: organizationId, collection_id: collectionId } = req.params;

    const response = await collectionService.getCollectionByIdAndOrganization({ organizationId, collectionId });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
