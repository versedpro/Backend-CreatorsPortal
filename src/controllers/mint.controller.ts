import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as collectionService from '../services/collection.service';
import { StatusCodes } from 'http-status-codes';
import { AnswerRequest, NftCollectionStatus } from '../interfaces/collection';
import { IExpressRequest } from '../interfaces/i.express.request';
import * as CacheHelper from '../helpers/cache.helper';

export async function handleGetMintInfo(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { collection_id: collectionId } = req.params;

    const cacheKey = `mint_info_${collectionId}`;
    // Check if cached, the goal is to reduce DB queries to get faster responses.
    const cachedResponse = await CacheHelper.get(cacheKey);
    if (cachedResponse) {
      res.status(200).json(cachedResponse);
      return;
    }
    const collection = await collectionService.getCollectionById(collectionId);
    if (collection.status !== NftCollectionStatus.DEPLOYED) {
      return Response.failure(res, {
        message: 'Collection is yet to be deployed.',
      }, StatusCodes.BAD_REQUEST);
    }
    const response = {
      chain: collection.chain,
      name: collection.name,
      description: collection.description,
      about: collection.about,
      contract_address: collection.contract_address,
      image: collection.image,
      background_header: collection.background_header,
      first_party_data: collection.first_party_data,
      social_links: collection.social_links,
      checkout_background_color: collection.checkout_background_color,
      checkout_font: collection.checkout_font,
      checkout_font_size: collection.checkout_font_size,
      checkout_font_color: collection.checkout_font_color,
      terms_and_condition_enabled: collection.terms_and_condition_enabled,
      terms_and_condition_link: collection.terms_and_condition_link,
    };
    // cache response for 10 minutes
    await CacheHelper.set(cacheKey, response, 600);
    res.status(200).json(response);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handlePostAnswers(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { collection_id: collectionId } = req.params;

    const { wallet_address, answers } = req.body;
    const body: AnswerRequest = {
      collectionId,
      walletAddress: wallet_address,
      answers,
    };

    const result = await collectionService.saveAnsweredQuestions(body);
    res.status(200).json({
      answers: result,
    });
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
