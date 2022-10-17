import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as orgService from '../services/organization.service';
import { StatusCodes } from 'http-status-codes';
import {
  CreateInviteRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  UploadFilesData
} from '../interfaces/organization';
import { Logger } from '../helpers/Logger';
import { cleanupFiles } from '../handlers/file.cleanup.handler';
import { InviteExistsError } from '../interfaces';
import { failure } from '../helpers/response.manager';

export async function handleAddOrganization(req: Request, res: ExpressResponse): Promise<void> {
  Logger.Info('Create Organization request', req.body);
  try {
    const organization = await orgService.addOrganization(
      req.body as CreateOrganizationRequest,
      req.files as UploadFilesData,
    );

    return Response.success(res, {
      message: 'Successful',
      response: organization,
    }, StatusCodes.OK);
  } catch (err: any) {
    await cleanupFiles(req);
    return Response.handleError(res, err);
  }
}

export async function handleGetOrganization(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { organization_id } = req.params;
    const response = await orgService.getOrganization({ id: organization_id?.toString() });

    return Response.success(res, {
      message: 'Successful',
      response
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleGetOrganizations(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { name, type, email, page, size } = req.query;
    const response = await orgService.getOrganizations({
      name: <string>name,
      type: <string>type,
      email: <string>email,
      page: parseInt(<string>page || '1'),
      size: parseInt(<string>size || '30'),
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleUpdateOrganization(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { organization_id } = req.params;
    const organization = await orgService.updateOrganization(
      organization_id,
      req.body as UpdateOrganizationRequest,
      req.files as UploadFilesData,
    );

    return Response.success(res, {
      message: 'Successful',
      response: organization,
    }, StatusCodes.OK);
  } catch (err: any) {
    await cleanupFiles(req);
    return Response.handleError(res, err);
  }
}

export async function handleInviteOrganization(req: Request, res: ExpressResponse): Promise<void> {
  Logger.Info('Invite Organization request', req.body);
  try {
    const invite = await orgService.addInvite(
      req.body as CreateInviteRequest,
    );

    return Response.success(res, {
      message: 'Successful',
      response: invite,
    }, StatusCodes.OK);

  } catch (err: any) {
    if (err instanceof InviteExistsError) {
      return failure(res, {
        message: err.message,
      }, StatusCodes.BAD_REQUEST);
    }
    return Response.handleError(res, err);
  }
}

export async function handleGetInvites(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { keyword, status, date_sort, page, size } = req.query;
    const response = await orgService.getInvites({
      keyword: <string>keyword,
      status: <string>status,
      date_sort: <string>date_sort,
      page: parseInt(<string>page || '1'),
      size: parseInt(<string>size || '30'),
    });

    return Response.success(res, {
      message: 'Successful',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleDeleteInvite(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { inviteId } = req.params;
    const response = await orgService.deleteInviteById(inviteId);
    if (response) {
      return Response.success(res, {
        message: 'Successful',
      }, StatusCodes.OK);
    } else {
      return Response.success(res, {
        message: 'No deletion',
      }, StatusCodes.NOT_MODIFIED);
    }
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleResendInvite(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { inviteId } = req.params;
    const invite = await orgService.resendInvite(inviteId);
    return Response.success(res, {
      message: 'Successful',
      response: invite,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleVerifyInvite(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { invite_code } = req.query;
    const invite = await orgService.getInvite({ invite_code: <string>invite_code });
    return Response.success(res, {
      message: 'Successful',
      response: invite,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
