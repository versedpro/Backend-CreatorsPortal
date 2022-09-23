import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as authService from '../services/auth.service';
import { StatusCodes } from 'http-status-codes';
import { RoleType } from '../interfaces/jwt.config';
import { InvalidSignatureError } from '../interfaces';

export async function handleAdminWalletAuth(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { public_address: publicAddress, signature } = req.body;
    const response = await authService.generateAuthToken({
      publicAddress,
      signature,
      roleType: RoleType.ADMIN,
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    if (err instanceof InvalidSignatureError) {
      return Response.failure(res, {
        message: 'Invalid signature',
      }, StatusCodes.FORBIDDEN);
    }
    return Response.handleError(res, err);
  }
}
