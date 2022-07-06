import { Request, Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as orgService from '../services/organization.service';
import { StatusCodes } from 'http-status-codes';
import { UpdateOrganizationRequest, UploadFilesData } from '../interfaces/organization';
import { Logger } from '../helpers/Logger';
import { cleanupFiles } from '../handlers/file.cleanup.handler';

export async function handleAddOrganization(req: Request, res: ExpressResponse): Promise<void> {
  Logger.Info('Create Organization request', req.body);
  try {
    const organization = await orgService.addOrganization(
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
    const { name, type, admin_email, page, size } = req.query;
    const response = await orgService.getOrganizations({
      name: <string>name,
      type: <string>type,
      admin_email: <string>admin_email,
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

export async function handleGenerateOrganizationKeys(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { organization_id } = req.params;

    const response = await orgService.generateOrganizationKeys(organization_id);

    return Response.success(res, {
      message: 'Successfully generated new keys',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleGetOrganizationKeys(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const { organization_id } = req.params;

    const response = await orgService.getActiveOrganizationKeys(organization_id);

    return Response.success(res, {
      message: 'Successfully returned keys',
      response,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
