import express from 'express';
import * as controller from '../controllers/collection.controller';

const router = express.Router({ mergeParams: true });

// Update username for an admin
router.post('/', controller.handleAddCollection);

router.get('/', controller.handleGetCollections);

router.get('/:collection_id', controller.handleGetCollectionById);

// NOT needed ATM
// router.get('/:collection_id/items', controller.handleGetCollectionItems);


export default router;
