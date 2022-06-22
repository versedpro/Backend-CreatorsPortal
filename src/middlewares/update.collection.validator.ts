import { NextFunction, Request, Response } from 'express';
import { CollectionSocialLink } from '../interfaces/collection';
import { StatusCodes } from 'http-status-codes';
import * as ResponseManager from '../helpers/response.manager';
import { validateFirstPartyData } from './create.collection.validator';

export async function updateCollectionValidator(req: Request, res: Response, next: NextFunction) {
  const error = findError(req);
  if (error) {
    return ResponseManager.failure(res, {
      message: error,
    }, StatusCodes.BAD_REQUEST);
  }
  return next();
}

function findError(req: Request): string | undefined {
  const { first_party_data, social_links, whitelist_host_addresses } = req.body;
  if (social_links) {
    try {
      const parsedLinks = JSON.parse(social_links) as unknown as CollectionSocialLink[];
      if (typeof parsedLinks !== 'object') {
        return 'Valid social_links field is required';
      }
      for (const item of parsedLinks) {
        const errors: string[] = [];
        if (!item.name) {
          errors.push('social_links.*.name is required');
        }
        if (!item.url) {
          errors.push('social_links.*.url is required');
        }
        if (item.enabled === undefined) {
          errors.push('social_links.*.enabled is required');
        }
        if (errors.length > 0) {
          return errors.join(', ');
        }
      }
    } catch (e) {
      return 'Valid attributes field is required';
    }
  }

  const firstPartyDataValidation = validateFirstPartyData(first_party_data);
  if (firstPartyDataValidation) {
    return firstPartyDataValidation;
  }

  if (whitelist_host_addresses) {
    const err = 'Valid whitelist_host_addresses array field is required';
    const parsedAddresses = JSON.parse(whitelist_host_addresses) as unknown as string[];
    if (typeof parsedAddresses !== 'object') {
      return err;
    }
    try {
      for (let i = 0; i < parsedAddresses.length; i++) {
        if (typeof parsedAddresses[i] !== 'string') {
          return err;
        }
      }
    } catch (e) {
      return err;
    }
    req.body.whitelist_host_addresses = parsedAddresses;
  }
}
