import {
  GetOrganizationInfoRequest,
  GetOrganizationsRequest,
  GetOrganizationsResponse,
  OrganizationInfo,
  UpdateOrganizationRequest
} from '../interfaces/organization';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';

export async function addOrganization(request: UpdateOrganizationRequest): Promise<OrganizationInfo> {
  const result = await KnexHelper.insertOrganization(request);
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

export async function updateOrganization(organization_id: string, request: UpdateOrganizationRequest): Promise<OrganizationInfo> {
  await KnexHelper.updateOrganization(organization_id, request);
  return await getOrganization({ id: organization_id });
}
