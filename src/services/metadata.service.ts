import { GetItemRequest } from '../interfaces/get.item.request';
import { NftItem } from '../interfaces/nft';
import { KnexHelper } from '../helpers/knex.helper';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';


export async function getSingleItem(request: GetItemRequest): Promise<NftItem> {
  const result = await KnexHelper.getSingleMetadata(request);
  if (result.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Token metadata was not found');
  }
  return result[0];
}
