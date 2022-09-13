import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as service from '../services/onboarding.service';
import { StatusCodes } from 'http-status-codes';
import { LoginRequest, SignUpRequest } from '../interfaces/onboarding';

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
