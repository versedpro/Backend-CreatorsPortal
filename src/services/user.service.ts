import { Logger } from '../helpers/Logger';
import { KnexHelper } from '../helpers/knex.helper';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { s3DeleteSingle } from '../helpers/aws/image.uploader';
import { GetUserRequest, UpdateUserDbRequest, UpdateUserRequest } from '../interfaces/user';
import { getOrganization, uploadOrgImages } from './organization.service';
import { OrganizationInfo } from '../interfaces/organization';

// export async function addUser(request: SaveUserRequest): Promise<UserInfo> {
//   const user = await KnexHelper.getUser(request.public_address);
//   if (user) {
//     throw new CustomError(StatusCodes.BAD_REQUEST, 'User already exists');
//   }
//   await knex(dbTables.users).insert(request);
//   return await getUser({ public_address: request.public_address });
// }

export async function getUser(request: GetUserRequest): Promise<OrganizationInfo> {
  Logger.Info('Getting Organization...', request);
  const result = await KnexHelper.getOrganizationInfo(request);
  if (result.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Organization not found');
  }
  return result[0] as OrganizationInfo;
}

export async function updateUser(request: UpdateUserRequest): Promise<OrganizationInfo> {
  const { organizationId, body, files } = request;
  const toUpdate: UpdateUserDbRequest = {
    name: body.name,
    website: body.website,
    twitter: body.twitter,
    discord: body.discord,
    facebook: body.facebook,
    instagram: body.instagram,
  };
  if(files) {
    const { image } = await uploadOrgImages(organizationId, files);
    toUpdate.image = image;
  }
  const existingOrg = await getOrganization({ id: organizationId });

  Logger.Info('Running user update process', organizationId);

  await KnexHelper.updateOrganization(organizationId, toUpdate);

  if (existingOrg.image) {
    try {
      await s3DeleteSingle(existingOrg.image);
    } catch (e) {
      Logger.Error('Could not delete user image', existingOrg.image);
    }
  }
  return await getOrganization({ id: organizationId });
}
