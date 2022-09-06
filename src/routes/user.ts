import express from 'express';
import * as controller from '../controllers/user.controller';
import { RoleType } from '../interfaces/jwt.config';
import { JwtHelper } from '../helpers/jwt.helper';
import { JWT_PUBLIC_KEY } from '../constants';
import { multerUpload } from '../helpers/aws/image.uploader';
import { cleanUpMulterFiles } from '../handlers/file.cleanup.handler';
import { updateUserValidator } from '../middlewares/user.validator';
import collectionRoutes from './user.collection';

const router = express.Router();
const jwtHelper = new JwtHelper({ publicKey: JWT_PUBLIC_KEY });

// Add user
router.post('/:public_address', controller.handleAddUser);

// Get user
router.get(
  '/:public_address/signing-info',
  controller.handleGetUser,
);

// Get user
router.get(
  '/:public_address',
  jwtHelper.requirePermission(RoleType.USER),
  controller.handleGetUser,
);

// Update image and username for user
router.put(
  '/:public_address',
  jwtHelper.requirePermission(RoleType.USER),
  multerUpload.fields([
    { name: 'image', maxCount: 1 },
  ]),
  cleanUpMulterFiles,
  updateUserValidator(),
  controller.handleUpdateUser);

router.use('/me/collections', jwtHelper.requirePermission(RoleType.USER), collectionRoutes);


export default router;
