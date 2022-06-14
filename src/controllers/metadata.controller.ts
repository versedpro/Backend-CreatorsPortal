import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import { Logger } from '../helpers/Logger';
import * as metadataService from '../services/metadata.service';

export async function handleGetMetadata(req: Request, res: ExpressResponse): Promise<void> {
  Logger.Info(req.params);
  try {
    const { collection_id: collectionId, token_id: tokenId } = req.params;
    const response = await metadataService.getSingleItem({ collectionId, tokenId });

    res.status(200).json(response);
    return;
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
