import {
  CreateInviteRequest,
  GetInviteRequest,
  GetInvitesRequest,
  GetOrganizationInfoRequest,
  GetOrganizationsRequest,
  GetOrganizationsResponse,
  OrganizationInfo,
  UpdateOrganizationRequest,
  UploadFilesData
} from '../interfaces/organization';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { s3UploadSingle } from '../helpers/aws/image.uploader';
import { v4 as uuidv4 } from 'uuid';
import { OrgInvite, OrgInviteStatus } from '../interfaces/OrgInvite';
import randomstring from 'randomstring';
import { inviteExistsError } from '../interfaces';
import { Pagination } from '../interfaces/pagination';
import { sendgridMail } from '../helpers/sendgrid.helper';
import { FRONTEND_URL, sendgrid } from '../constants';

export async function uploadOrgImages(organizationId: string, files: UploadFilesData): Promise<{ image?: string, banner?: string }> {
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
    throw new CustomError(StatusCodes.NOT_FOUND, 'Organization not found');
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

export async function addInvite(request: CreateInviteRequest): Promise<OrgInvite> {
  request.name = request.name.trim();
  request.email = request.email.trim();
  // expires in 30 days
  const existingRes = await KnexHelper.getOrganizationInvite({ email: request.email });
  if (existingRes.length > 0) {
    throw new inviteExistsError();
  }
  const expiresAt = Date.now() + 2592000000;
  const inviteCode = randomstring.generate({
    length: 40,
    charset: 'alphanumeric',
  });

  // Send email invite to organization using Sendgrid
  await sendgridMail.send({
    from: sendgrid.senderEmail,
    to: request.email,
    templateId: sendgrid.templates.orgInvite,
    dynamicTemplateData: {
      name: request.name,
      link: `${FRONTEND_URL}/signup?invite_code=${inviteCode}&email=${request.email}`
    }
  });

  const result = await KnexHelper.insertOrganizationInvite({
    name: request.name,
    email: request.email,
    expires_at: new Date(expiresAt),
    invite_code: inviteCode,
    email_sent: true,
  });
  return await getInvite({ id: result[0].id });
}

export async function getInvite(request: GetInviteRequest): Promise<OrgInvite> {
  const result = await KnexHelper.getOrganizationInvite(request);
  if (result.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Invite not found');
  }
  return result[0] as OrgInvite;
}

export async function getInvites(request: GetInvitesRequest): Promise<{ items: OrgInvite[], pagination: Pagination }> {
  Logger.Info('Getting Organization Invites...', request);
  return KnexHelper.getInvites(request);
}

export async function deleteInviteById(id: string): Promise<boolean> {
  const invite = await getInvite({ id });
  if (invite.status === OrgInviteStatus.SIGNED_UP) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Organization already signed up');
  }
  return (await KnexHelper.deleteInvite(id)) === 1;
}

export async function resendInvite(id: string): Promise<OrgInvite> {
  const invite = await getInvite({ id });
  if (invite.status === OrgInviteStatus.SIGNED_UP) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Organization already signed up');
  }
  // expires in 30 days
  const expiresAt = Date.now() + 2592000000;
  const inviteCode = randomstring.generate({
    length: 40,
    charset: 'alphanumeric',
  });

  // Send email invite to organization using Sendgrid
  await sendgridMail.send({
    from: sendgrid.senderEmail,
    to: invite.email,
    templateId: sendgrid.templates.orgInvite,
    dynamicTemplateData: {
      name: invite.name,
      link: `${FRONTEND_URL}/signup?invite_code=${inviteCode}&email=${invite.email}`
    }
  });

  await KnexHelper.updateOrganizationInvite({
    id,
    expires_at: new Date(expiresAt),
    invite_code: inviteCode,
  });
  return await getInvite({ id });
}
