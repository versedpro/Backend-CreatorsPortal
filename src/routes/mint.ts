import express from 'express';
import * as controller from '../controllers/mint.controller';
import { requirePluginAuth } from '../helpers/plugin.auth.helper';

const router = express.Router({ mergeParams: true });

router.get('/:collection_id/info', requirePluginAuth, controller.handleGetMintInfo);

router.post('/:collection_id/answers', requirePluginAuth, controller.handlePostAnswers);

export default router;
