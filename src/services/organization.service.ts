import {
  GetOrganizationInfoRequest,
  GetOrganizationsRequest,
  GetOrganizationsResponse,
  OrganizationInfo,
  UpdateOrganizationRequest, UploadFilesData
} from '../interfaces/organization';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import * as StringUtils from '../helpers/string.utils';
import { InsertOrganizationKeyData, OrganizationKey, OrgKeyStatus } from '../interfaces/OrganizationKey';
import { s3UploadSingle } from '../helpers/aws/image.uploader';
import { v4 as uuidv4 } from 'uuid';

async function uploadOrgImages(organizationId: string, files: UploadFilesData): Promise<{ image?: string, banner?: string }> {
  let imageUrl;
  let bannerUrl;

  const folderName = `${organizationId}/profile_images`;
  if (files['image']) {
    const file = files['image'][0];
    imageUrl = await s3UploadSingle(file, folderName, `${file.fieldname}_${uuidv4()}`);
  }
  if (files['banner']) {
    const file = files['banner'][0];
    bannerUrl = await s3UploadSingle(file, folderName, `${file.fieldname}_${uuidv4()}`);
  }
  return { image: imageUrl, banner: bannerUrl };
}

export async function addOrganization(request: UpdateOrganizationRequest, files?: UploadFilesData): Promise<OrganizationInfo> {
  delete request.image;
  delete request.banner;
  const result = await KnexHelper.insertOrganization(request);
  if (files) {
    const organizationId = result[0].id;
    const { image, banner } = await uploadOrgImages(organizationId, files);
    const toSave = {};
    if (image) {
      // @ts-ignore
      toSave.image = image;
    }
    if (banner) {
      // @ts-ignore
      toSave.banner = banner;
    }
    if (image || banner) {
      await KnexHelper.updateOrganization(organizationId, toSave);
    }
  }
  return await getOrganization({ id: result[0].id });
}

export async function getOrganization(request: GetOrganizationInfoRequest): Promise<OrganizationInfo> {
  Logger.Info('Getting Organization...', request);
  const result = await KnexHelper.getOrganizationInfo(request);
  if (result.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'No organization found');
  }
  return result[0] as OrganizationInfo;
}

export async function getOrganizations(request: GetOrganizationsRequest): Promise<GetOrganizationsResponse> {
  Logger.Info('Getting Organizations...', request);
  return KnexHelper.getOrganizations(request);
}

export async function updateOrganization(organization_id: string, request: UpdateOrganizationRequest, files?: UploadFilesData): Promise<OrganizationInfo> {
  delete request.image;
  delete request.banner;
  if (files) {
    const { image, banner } = await uploadOrgImages(organization_id, files);
    if (image) {
      request.image = image;
    }
    if (banner) {
      request.banner = banner;
    }
  }
  await KnexHelper.updateOrganization(organization_id, request);
  return await getOrganization({ id: organization_id });
}

export async function generateOrganizationKeys(organizationId: string): Promise<OrganizationKey> {
  const organization = await getOrganization({ id: organizationId });
  // Generate, encrypt and hash keys
  const apiKey = StringUtils.generateKey(21);
  const secretKey = StringUtils.generateKey(32);

  const encryptedApiKey = StringUtils.encrypt(apiKey);
  const hashedSecretKey = StringUtils.generateSecretHash(secretKey);

  const dataToSave: InsertOrganizationKeyData = {
    organization_id: organization.id,
    api_key: encryptedApiKey,
    secret_key: hashedSecretKey,
    status: OrgKeyStatus.ACTIVE
  };

  const activeKey = await KnexHelper.getActiveOrganizationKey(organizationId);
  if (activeKey) {
    await KnexHelper.updateOrganizationKeyStatus({
      organizationId,
      status: OrgKeyStatus.DEACTIVATED
    });
  }
  await KnexHelper.insertOrganizationKey(dataToSave);
  const newSaved = await KnexHelper.getActiveOrganizationKey(organizationId);
  if (!newSaved) {
    throw new CustomError(500, 'API keys could not be generated');
  }
  newSaved.api_key = apiKey;
  newSaved.secret_key = secretKey;
  delete newSaved.id;
  return newSaved;
}

export async function getActiveOrganizationKeys(organizationId: string): Promise<OrganizationKey> {
  const activeKey = await KnexHelper.getActiveOrganizationKey(organizationId);
  if (!activeKey) {
    throw new CustomError(404, 'API keys could not be found');
  }
  activeKey.api_key = StringUtils.decrypt(activeKey.api_key);
  delete activeKey.secret_key;
  delete activeKey.id;
  return activeKey;
}
