import express from 'express';
import * as controller from '../controllers/mint.controller';
import { requirePluginAuth } from '../helpers/plugin.auth.helper';
import { mintAnswersValidator } from '../middlewares/mint.validator';

const router = express.Router({ mergeParams: true });

router.get('/:collection_id/info', requirePluginAuth, controller.handleGetMintInfo);

router.post('/:collection_id/answers', requirePluginAuth, mintAnswersValidator(), controller.handlePostAnswers);

export default router;
