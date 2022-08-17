import { IExpressRequest } from '../interfaces/i.express.request';
import { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as ResponseManager from '../helpers/response.manager';
import * as CollectionService from '../services/collection.service';
import { Logger } from './Logger';

export async function requirePluginAuth(req: IExpressRequest, res: Response, next: NextFunction) {
  try {
    const { authorized, reason } = await checkAuthorization(req);
    if (authorized) {
      return next();
    }
    // Access denied...
    res.set('WWW-Authenticate', 'Basic realm="401"');
    return ResponseManager.failure(res, {
      message: reason || 'Authentication required.',
    }, StatusCodes.UNAUTHORIZED);
  } catch (err: any) {
    return ResponseManager.handleError(res, err);
  }
}


async function checkAuthorization(req: IExpressRequest): Promise<{ authorized: boolean, reason?: string }> {
  const { collection_id } = req.params;
  // Get collection
  const collection = await CollectionService.getCollectionById(collection_id);

  // Check if request origin is allowed
  if (collection.whitelist_host_addresses && collection.whitelist_host_addresses.length > 0) {
    const originUrl = req.get('origin') || req.get('host');
    Logger.Info('originUrl', originUrl);
    if (!originUrl) {
      return { authorized: false, reason: 'No host' };
    }
    for (const host of collection.whitelist_host_addresses) {
      if (host.includes(originUrl)) {
        return { authorized: true };
      }
    }
    return { authorized: false, reason: 'Host not whitelisted' };
  }
  return { authorized: true };
}

