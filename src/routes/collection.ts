import express from 'express';
import * as controller from '../controllers/collection.controller';
import { createCollectionValidator } from '../middlewares/create.collection.validator';
import { updateCollectionValidator } from '../middlewares/update.collection.validator';

const router = express.Router({ mergeParams: true });

// Update username for an admin
router.post('/', createCollectionValidator, controller.handleAddCollection);

router.get('/', controller.handleGetCollections);

router.get('/:collection_id', controller.handleGetCollectionById);

router.put('/:collection_id', updateCollectionValidator, controller.handleUpdateCollection);

export default router;
