import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as service from '../services/onboarding.service';
import { StatusCodes } from 'http-status-codes';
import { LoginRequest, SignUpRequest } from '../interfaces/onboarding';
import { IExpressRequest } from '../interfaces/i.express.request';
import { InvalidSignatureError, InviteExistsError } from '../interfaces';
import { Logger } from '../helpers/Logger';
import { CreateInviteRequest } from '../interfaces/organization';


export async function handleInviteOrganization(req: Request, res: ExpressResponse): Promise<void> {
  Logger.Info('Request Organization self-invite request', req.body);

  try {
    const invite = await service.addUserInvite(req.body as CreateInviteRequest);
    return Response.success(res, {
      message: 'Successful',
      response: invite,
    }, StatusCodes.OK);
  }
  catch (err: any) {
    if (err instanceof InviteExistsError) {
      return Response.failure(res, {
        message: err.message,
      }, StatusCodes.BAD_REQUEST);
    }
    return Response.handleError(res, err);
  }
}

export async function handleSignUp(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const clientId = req.headers['x-client-id'];
    const response = await service.signUpUser(<SignUpRequest>{ ...req.body, client_id: clientId });
    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleLogin(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const clientId = req.headers['x-client-id'];
    const response = await service.loginUser(<LoginRequest>{ ...req.body, client_id: clientId });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleForgotPassword(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { email } = req.body;
    await service.forgotPassword(email);
    return Response.success(res, {
      message: 'Successful',
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleChangePassword(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { email, password, otp } = req.body;
    await service.changePassword({ email, password, otp });
    return Response.success(res, {
      message: 'Successful',
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleConnectWallet(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const client_id = req.headers['x-client-id'];
    const user_id = req.userId;
    const { public_address, signature } = req.body;
    const response = await service.connectWallet({
      user_id: user_id!,
      client_id: client_id!.toString(),
      public_address,
      signature,
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

export async function handleWalletAuth(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const client_id = req.headers['x-client-id'];
    const { public_address, signature } = req.body;
    const response = await service.signInWithWallet({
      client_id: client_id!.toString(),
      public_address,
      signature,
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
