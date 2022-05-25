import express from 'express';

import { routeError } from '../handlers';

import adminRoutes from './admin';
import authRoutes from './auth';
import apiDocsRoutes from './api.docs';
import organizationRoutes from './organization';
import { JwtHelper } from '../helpers/jwt.helper';
import { JWT_PUBLIC_KEY } from '../constants';
import { RoleType } from '../interfaces/jwt.config';

const router: express.Router = express.Router();
const jwtHelper = new JwtHelper({ publicKey: JWT_PUBLIC_KEY });

router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/api-docs', apiDocsRoutes);
router.use('/organizations', jwtHelper.requirePermission(RoleType.ADMIN), organizationRoutes);

router.use('/health', (req, res) => {
  res.send({ status: 'OK' });
});

router.use(routeError);

export default router;
