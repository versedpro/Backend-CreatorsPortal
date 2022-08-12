import express from 'express';
import * as controller from '../controllers/metadata.controller';

const router = express.Router();

const ENDPOINT = '/:collection_id/metadata';

// Get metadata for a collection item
router.get([`${ENDPOINT}/:token_id.json`, `${ENDPOINT}/:token_id`], controller.handleGetMetadata);

export default router;
