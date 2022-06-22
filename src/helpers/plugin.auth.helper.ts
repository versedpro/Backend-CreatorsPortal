import { IExpressRequest } from '../interfaces/i.express.request';
import { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as ResponseManager from '../helpers/response.manager';
import { dbTables } from '../constants';
import { db as knex } from '../../data/db';
import * as StringUtils from '../helpers/string.utils';
import * as CollectionService from '../services/collection.service';
import { Logger } from './Logger';

export async function requirePluginAuth(req: IExpressRequest, res: Response, next: NextFunction) {
  const { authorized, reason } = await checkAuthorization(req);
  if (authorized) {
    return next();
  }
  // Access denied...
  res.set('WWW-Authenticate', 'Basic realm="401"');
  return ResponseManager.failure(res, {
    message: reason || 'Authentication required.',
  }, StatusCodes.UNAUTHORIZED);
}


async function checkAuthorization(req: IExpressRequest): Promise<{ authorized: boolean, reason?: string }> {
// parse login and password from headers
  const { collection_id } = req.params;
  // find auth details via
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  // Verify login and password are set and correct
  if (login && password) {
    // Get collection
    const collection = await CollectionService.getCollectionById(collection_id);

    // Check if request origin is allowed
    if (collection.whitelist_host_addresses && collection.whitelist_host_addresses.length > 0) {
      const originUrl = req.get('origin') || req.get('host');
      Logger.Info('originUrl', originUrl);
      if (!(originUrl && collection.whitelist_host_addresses.includes(originUrl))) {
        return { authorized: false, reason: 'Host not whitelisted' };
      }
    }
    // Validate keys
    const queryString = `SELECT * FROM ${dbTables.apiSecretKeys} WHERE organization_id = ? AND status='ACTIVE' LIMIT 1`;
    const keysResult = await knex.raw(queryString, [collection.organization_id]);
    if (keysResult.rowCount === 1) {
      const { api_key, secret_key, organization_id } = keysResult.rows[0];
      if (StringUtils.decrypt(api_key) === login && StringUtils.compareKeys({
        storedKey: secret_key,
        suppliedKey: password
      })) {
        // Access granted...
        req.query.organization_id = organization_id;
        return { authorized: true };
      }
    }
  }
  return { authorized: false };
}

