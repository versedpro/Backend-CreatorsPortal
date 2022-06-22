import express from 'express';
import * as controller from '../controllers/mint.controller';
import { requirePluginAuth } from '../helpers/plugin.auth.helper';

const router = express.Router({ mergeParams: true });

router.get('/:collection_id/info', requirePluginAuth, controller.handleGetMintInfo);

export default router;
