import { NextFunction, Request, Response } from 'express';
import { UpdateCollectionAssetData } from '../interfaces/collection';
import { StatusCodes } from 'http-status-codes';
import * as ResponseManager from '../helpers/response.manager';
import { Attribute } from '../interfaces/nft';
import { Validator } from './validator';
import { body } from 'express-validator';

export async function updateCollectionAssetsValidator(req: Request, res: Response, next: NextFunction) {
  const error = findUpdateError(req);
  if (error) {
    return ResponseManager.failure(res, {
      message: error,
    }, StatusCodes.BAD_REQUEST);
  }
  return next();
}

function findUpdateError(req: Request): string | undefined {
  const assetsData = req.body.assets_data;
  if (!assetsData) {
    return 'assetsData field is required';
  }
  try {
    const parsedData = assetsData as unknown as UpdateCollectionAssetData[];
    if (typeof parsedData !== 'object') {
      return 'Valid assets_data field is required';
    }
    for (const item of parsedData) {
      if (!item.id) {
        return 'assets_data.*.id is required';
      }
      if (item.quantity) {
        try {
          parseInt(item.quantity.toString());
        } catch (e) {
          return 'Valid assets_data.*.quantity is required';
        }
      }
      if (item.price) {
        try {
          parseFloat(item.price.toString());
        } catch (e) {
          return 'Valid assets_data.*.price is required';
        }
      }
      if (item.attributes) {
        try {
          const parsedAttr = item.attributes as unknown as Attribute[];
          if (typeof parsedAttr !== 'object') {
            return 'Valid assets_data.*.attributes field is required';
          }
          for (const item of parsedAttr) {
            if (!item.trait_type) {
              return 'Valid assets_data.*.attributes.*.trait_type is required';
            }
          }
        } catch (e) {
          return 'Valid assets_data.*.attributes field is required';
        }
      }
    }
    req.body.assets_data = parsedData;
  } catch (e) {
    return 'Valid assets_data field is required';
  }
}

export const updateCollectionAssetsExpValidator = () => {
  return Validator.validate([
    body('assets_data.*.id')
      .exists()
      .trim()
      .isUUID()
      .bail(),
    body('assets_data.*.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .bail(),
    body('assets_data.*.quantity')
      .optional()
      .trim()
      .custom((value) => {
        if (isNaN(value)) {
          return false;
        }
        const num = Number(value);
        return Number.isInteger(num);
      })
      .bail(),
    body('assets_data.*.price')
      .optional()
      .trim()
      .bail(),
  ]);
};
