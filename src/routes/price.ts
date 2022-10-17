import express from 'express';
import * as controller from '../controllers/payment.controller';
import { JwtHelper } from '../helpers/jwt.helper';
import { JWT_PUBLIC_KEY } from '../constants';
import { RoleType } from '../interfaces/jwt.config';

const router = express.Router({ mergeParams: true });
const jwtHelper = new JwtHelper({ publicKey: JWT_PUBLIC_KEY });

router.get('/',
  jwtHelper.requireAnyOfPermission([RoleType.USER, RoleType.ADMIN]),
  controller.handleGetPrice,
);

export default router;
