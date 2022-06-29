// noinspection ExceptionCaughtLocallyJS

import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as collectionService from '../services/collection.service';
import { StatusCodes } from 'http-status-codes';
import { NftCollectionStatus } from '../interfaces/collection';

export async function handleGetMintInfo(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { collection_id: collectionId } = req.params;
    const { organization_id: organizationId, } = req.query;

    const collection = await collectionService.getCollectionByIdAndOrganization({
      organizationId: <string>organizationId,
      collectionId
    });
    if (collection.status !== NftCollectionStatus.DEPLOYED) {
      return Response.failure(res, {
        message: 'Collection is yet to be deployed.',
      }, StatusCodes.BAD_REQUEST);
    }
    const response = {
      chain: collection.chain,
      name: collection.name,
      description: collection.description,
      about: collection.about,
      contract_address: collection.contract_address,
      image: collection.image,
      background_header: collection.background_header,
      first_party_data: collection.first_party_data
    };

    res.status(200).json(response);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}