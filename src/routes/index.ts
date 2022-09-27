import express from 'express';

import { routeError } from '../handlers';

import adminRoutes from './admin';
import authRoutes from './auth';
import organizationRoutes from './organization';
import collectionRoutes from './collection';
import nftRoutes from './nft';
import mintRoutes from './mint';
import userRoutes from './user';
import * as controller from '../controllers/organization.controller';

import { JwtHelper } from '../helpers/jwt.helper';
import { JWT_PUBLIC_KEY } from '../constants';
import { RoleType } from '../interfaces/jwt.config';
import morgan from 'morgan';
import bodyParser from 'body-parser';

const router: express.Router = express.Router();
router.use(bodyParser.json());

const jwtHelper = new JwtHelper({ publicKey: JWT_PUBLIC_KEY });
router.use(morgan('combined'));

router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.get('/invites/verify', controller.handleVerifyInvite);

router.use('/organizations/:organization_id/collections', jwtHelper.requirePermission(RoleType.ADMIN), collectionRoutes);
router.use('/organizations', jwtHelper.requirePermission(RoleType.ADMIN), organizationRoutes);
router.use('/nft', nftRoutes);
router.use('/mint', mintRoutes);
router.use('/users', userRoutes);

router.use(routeError);

export default router;
