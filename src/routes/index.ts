import express from 'express';

import { routeError } from '../handlers';

import adminRoutes from './admin';
import authRoutes from './auth';
import apiDocsRoutes from './api.docs';

const router: express.Router = express.Router();

router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/api-docs', apiDocsRoutes);

router.use('/health', (req, res) => {
  res.send({ status: 'OK' });
});

router.use(routeError);

export default router;
