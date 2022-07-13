import { Logger } from '../helpers/Logger';
import { KnexHelper } from '../helpers/knex.helper';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import {
  Admin,
  GetAdminRequest,
  SaveAdminRequest,
  UpdateAdminRequest,
  UpdateDbAdminRequest
} from '../interfaces/admin';
import { s3DeleteSingle, s3UploadSingle } from '../helpers/aws/image.uploader';
import { v4 as uuidv4 } from 'uuid';

export async function addAdmin(request: SaveAdminRequest): Promise<Admin> {
  const result = await KnexHelper.getAdmins({ public_address: request.public_address.toLowerCase() });
  if (result.length !== 0) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Admin already exists');
  }
  await KnexHelper.insertAdmin(request);
  return (await getAdmins({ public_address: request.public_address }))[0];
}

export async function getAdmins(request: GetAdminRequest): Promise<Admin[]> {
  if (request.public_address) {
    request.public_address = request.public_address.toLowerCase();
  }
  Logger.Info('Getting Admin...', request);
  const result = await KnexHelper.getAdmins(request);
  if (result.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'No admin found');
  }
  return result;
}

export async function updateAdmin(request: UpdateAdminRequest): Promise<Admin> {
  const { public_address, username, files } = request;
  const toUpdate: UpdateDbAdminRequest = {};
  if (username) {
    toUpdate.username = username;
  }
  Logger.Info('Running admin update process', public_address, files);
  const admin = (await getAdmins({ public_address }))[0];
  // upload new image and delete old one
  if (files && files['image'] && files['image'].length > 0) {
    toUpdate.image = await s3UploadSingle(files['image'][0], 'admin_profile_pics', `${public_address}_${uuidv4()}`);
  }
  const response = await KnexHelper.updateAdmin(public_address, toUpdate);
  Logger.Info(response);
  if (admin.image) {
    try {
      await s3DeleteSingle(admin.image);
    } catch (e) {
      Logger.Error('Could not delete admin image', admin.image);
    }
  }
  return (await getAdmins({ public_address: request.public_address }))[0];
}
