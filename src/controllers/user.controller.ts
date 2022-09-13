import { Response as ExpressResponse } from 'express';
import * as Response from '../helpers/response.manager';
import * as userService from '../services/user.service';
import { StatusCodes } from 'http-status-codes';
import { UploadFilesData } from '../interfaces/organization';
import { IExpressRequest } from '../interfaces/i.express.request';
//
// export async function handleAddUser(req: Request, res: ExpressResponse): Promise<void> {
//   try {
//     const { public_address: publicAddress } = req.params;
//     const user = await userService.addUser({ public_address: publicAddress.toLowerCase() });
//
//     return Response.success(res, {
//       message: 'Successful',
//       response: user,
//     }, StatusCodes.OK);
//   } catch (err: any) {
//     return Response.handleError(res, err);
//   }
// }

export async function handleGetUser(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { public_address: publicAddress } = req.params;
    const user = await userService.getUser({ public_address: publicAddress!.toString() });

    return Response.success(res, {
      message: 'Successful',
      response: (req.path.includes('signing-info')) ? { public_address: user.public_address, nonce: user.nonce } : user,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}

export async function handleUpdateUser(req: IExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const user = await userService.updateUser({
      organizationId: req.userId!,
      body: req.body,
      files: req.files as UploadFilesData,
    });

    return Response.success(res, {
      message: 'Successful',
      response: user,
    }, StatusCodes.OK);
  } catch (err: any) {
    return Response.handleError(res, err);
  }
}
