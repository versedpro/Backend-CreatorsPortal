import * as jwt from 'jsonwebtoken';
import { NextFunction, Response } from 'express';

import { JwtConfig, JwtData, RoleType } from '../interfaces/jwt.config';
import { IExpressRequest } from '../interfaces/i.express.request';
import * as CacheHelper from '../helpers/cache.helper';
import { db as knex } from '../../data/db';
import { dbTables } from '../constants';

// Example token
// const tokenObject = {
//   publicAddress: '',
//   roleType: '',
// };

// Example config options
// const configOption = {
//   publicKey: '',
//   handleJsonResponse: (code, message) => {}
// };
export const USER_TOKEN_EXPIRY_IN_SECONDS = 1814400; // 21 days


export class JwtHelper {
  private configOption: JwtConfig;
  handleJsonResponse?: (code: number, message: string) => void;

  constructor(configOption: JwtConfig) {
    this.configOption = configOption;
    this.handleJsonResponse = configOption.handleJsonResponse;
  }

  respondError(res: Response, code: number, message: string) {
    if (this.handleJsonResponse) {
      return this.handleJsonResponse(code, message);
    }
    res.status(403).json({ error: true, message });
  }

  async generateToken(params: JwtData, expiryInSeconds = USER_TOKEN_EXPIRY_IN_SECONDS) {
    const encryptionKey = Buffer.from(this.configOption.publicKey, 'base64').toString();
    const options: jwt.SignOptions = {};
    if (expiryInSeconds) {
      options.expiresIn = expiryInSeconds;
    }
    try {
      return jwt.sign(
        params,
        encryptionKey, options
      );
    } catch (error) {
      throw {
        code: 500,
        data: error,
      };
    }
  }

  async verifyToken(token: string): Promise<JwtData> {
    try {
      const result = await jwt.verify(token, Buffer.from(this.configOption.publicKey, 'base64').toString());
      const decoded = result as JwtData;
      if (decoded.roleType !== RoleType.USER) {
        return decoded;
      }
      let valid = await CacheHelper.get(`jwt_${token}`);
      if (valid === undefined) {
        const existingValidTokenRes = await knex(dbTables.userTokens).select()
          .where({
            organization_id: decoded.userId,
            token,
            valid: true,
          })
          .whereRaw('expires_at > now ()')
          .limit(1);
        valid = existingValidTokenRes.length > 0;
        await CacheHelper.set(`jwt_${token}`, valid);
      }
      if (valid) {
        return decoded;
      }
      // noinspection ExceptionCaughtLocallyJS
      throw new Error('Invalid token');
    } catch (error) {
      throw {
        code: 403,
        data: error,
      };
    }
  }

  /**
   *
   * @param roleType - role that is authorized to call the endpoint.
   * We can later extend this for Admin permissions
   */
  requirePermission(roleType: RoleType) {
    return async (req: IExpressRequest, res: Response, next: NextFunction) => {
      const token = req.headers['x-auth-token'];
      if (!token) {
        return this.respondError(res, 403, 'No API token');
      }
      try {
        if (typeof token !== 'string') {
          return this.respondError(res, 403, 'Invalid token');
        }

        const decoded = await this.verifyToken(token);
        if (roleType !== decoded.roleType!) {
          return this.respondError(res, 403, 'Invalid token');
        }

        req.token = token;
        req.roleType = decoded.roleType;
        req.userId = decoded.userId;
        return next();
      } catch (error: any) {
        return this.respondError(res, 403, error);
      }
    };
  }
}
