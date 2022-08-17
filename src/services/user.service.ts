import { Logger } from '../helpers/Logger';
import { KnexHelper } from '../helpers/knex.helper';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { s3DeleteSingle, s3UploadSingle } from '../helpers/aws/image.uploader';
import { v4 as uuidv4 } from 'uuid';
import { GetUserRequest, SaveUserRequest, UpdateUserDbRequest, UpdateUserRequest, UserInfo } from '../interfaces/user';
import { db as knex } from '../../data/db';
import { dbTables } from '../constants';

export async function addUser(request: SaveUserRequest): Promise<UserInfo> {
  const user = await KnexHelper.getUser(request.public_address);
  if (user) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'User already exists');
  }
  await knex(dbTables.users).insert(request);
  return await getUser({ public_address: request.public_address });
}

export async function getUser(request: GetUserRequest): Promise<UserInfo> {
  Logger.Info('Getting User...', request);
  const user = await KnexHelper.getUser(request.public_address);
  if (!user) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'No user found');
  }
  return user;
}

export async function updateUser(request: UpdateUserRequest): Promise<UserInfo> {
  const { public_address, body, files } = request;
  const toUpdate: UpdateUserDbRequest = {
    username: body.username,
    name: body.name,
    website: body.website,
    twitter: body.twitter,
    discord: body.discord,
    facebook: body.facebook,
    instagram: body.instagram,
  };
  Logger.Info('Running user update process', public_address, files);
  const user = (await getUser({ public_address }));
  // upload new image and delete old one
  if (files && files['image'] && files['image'].length > 0) {
    toUpdate.image = await s3UploadSingle(files['image'][0], 'user_profile_pics', `${public_address}_${uuidv4()}`);
  }
  await KnexHelper.updateUser(public_address, toUpdate);
  if (user.image) {
    try {
      await s3DeleteSingle(user.image);
    } catch (e) {
      Logger.Error('Could not delete user image', user.image);
    }
  }
  return await getUser({ public_address: request.public_address });
}
