import express from 'express';
import * as controller from '../controllers/admin.controller';
import { signupAdminValidator, updateAdminValidator } from '../middlewares/admin.validator';
import { RoleType } from '../interfaces/jwt.config';
import { JwtHelper } from '../helpers/jwt.helper';
import { JWT_PUBLIC_KEY } from '../constants';
import { multerUpload } from '../helpers/aws/image.uploader';
import { cleanUpMulterFiles } from '../handlers/file.cleanup.handler';

const router = express.Router();
const jwtHelper = new JwtHelper({ publicKey: JWT_PUBLIC_KEY });

// Add an admin
router.post('/', signupAdminValidator(), controller.handleAddAdmin);

// Get admins
router.get('/', controller.handleGetAdmins);

// Update image and username for an admin
router.put(
  '/:public_address',
  jwtHelper.requirePermission(RoleType.ADMIN),
  multerUpload.fields([
    { name: 'image', maxCount: 1 },
  ]),
  cleanUpMulterFiles,
  updateAdminValidator(),
  controller.handleUpdateAdmin);


export default router;
