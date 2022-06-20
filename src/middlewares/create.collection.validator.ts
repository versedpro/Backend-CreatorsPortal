import { NextFunction, Request, Response } from 'express';
import { Attribute } from '../interfaces/nft';
import { FirstPartyDatum } from '../interfaces/collection';
import { StatusCodes } from 'http-status-codes';
import * as ResponseManager from '../helpers/response.manager';

export async function createCollectionValidator(req: Request, res: Response, next: NextFunction) {
  const error = findError(req);
  if (error) {
    return ResponseManager.failure(res, {
      message: error,
    }, StatusCodes.BAD_REQUEST);
  }
  return next();
}

function findError(req: Request): string | undefined {
  const { attributes, first_party_data } = req.body;
  if (attributes) {
    try {
      const parsedAttr = JSON.parse(attributes) as unknown as Attribute[];
      if (typeof parsedAttr !== 'object') {
        return 'Valid attributes field is required';
      }
      for (const item of parsedAttr) {
        if (!item.trait_type) {
          return 'attributes.*.trait_type is required';
        }
      }
      req.body.attributes = parsedAttr;
    } catch (e) {
      return 'Valid attributes field is required';
    }
  }

  if (first_party_data) {
    try {
      const parsedData = JSON.parse(first_party_data) as unknown as FirstPartyDatum[];
      if (typeof parsedData !== 'object') {
        return 'Valid first_party_data field is required';
      }
      for (const item of parsedData) {
        if (!item.type) {
          return 'first_party_data.*.type is required';
        }
      }
      req.body.first_party_data = parsedData;
    } catch (e) {
      return 'Valid first_party_data field is required';
    }
  }
}
