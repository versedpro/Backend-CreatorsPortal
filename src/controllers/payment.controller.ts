import { Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as paymentService from '../services/payment.service';
import { StatusCodes } from 'http-status-codes';
import { IExpressRequest } from '../interfaces/i.express.request';
import { CustomError } from '../helpers';


export async function handleGetCards(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { userId } = req;
    if (!userId) {
      throw new CustomError(StatusCodes.UNAUTHORIZED, '');
    }
    const cards = await paymentService.getUserCards(userId);

    return Response.success(res, {
      message: 'Successful',
      response: { items: cards },
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleGetClientSecret(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { collection_id } = req.params;
    const { save_card } = req.query;
    const { userId } = req;
    if (!userId) {
      throw new CustomError(StatusCodes.UNAUTHORIZED, '');
    }

    const client_secret = await paymentService.getClientSecret({
      userId: userId,
      collectionId: collection_id,
    }, (save_card === 'true'));

    return Response.success(res, {
      message: 'Successful',
      response: {
        client_secret,
        user_id: userId,
      },
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleChargeCard(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { collection_id } = req.params;
    const { card_id } = req.body;
    const { userId } = req;
    if (!userId) {
      throw new CustomError(StatusCodes.UNAUTHORIZED, '');
    }

    const response = await paymentService.chargeCard({
      userId,
      collectionId: collection_id,
      cardId: card_id,
    });

    return Response.success(res, {
      message: response.requires_auth ? 'Authentication is required' : 'Card charged successfully',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleStripeWebhook(req: any, res: ExpressResponse): Promise<void> {
  try {

    await paymentService.processStripeWebhookEvent(req);
    return Response.success(res, {
      message: 'Success',
      response: {},
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
