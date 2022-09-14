import express from 'express';
import * as controller from '../controllers/collection.controller';
import { createCollectionValidator } from '../middlewares/create.collection.validator';
import { updateCollectionValidator } from '../middlewares/update.collection.validator';
import { multerUpload } from '../helpers/aws/image.uploader';
import {
  createCollectionExpValidator,
  getCollectionExpValidator
} from '../middlewares/create.collection.exp.validator';
import { cleanUpMulterFiles } from '../handlers/file.cleanup.handler';
import { updateCollectionExpValidator } from '../middlewares/update.collection.exp.validator';

const router = express.Router({ mergeParams: true });

// Update username for an admin
router.post('/',
  multerUpload.fields([
      { name: 'image', maxCount: 1 },
    ]
  ),
  cleanUpMulterFiles,
  createCollectionExpValidator(),
  createCollectionValidator, controller.handleAddCollection);

router.get('/', getCollectionExpValidator(), controller.handleGetCollections);

router.get('/:collection_id', controller.handleGetCollectionById);

router.put('/:collection_id',
  multerUpload.fields([
    { name: 'collection_image', maxCount: 1 },
  ]),
  cleanUpMulterFiles,
  updateCollectionExpValidator(),
  updateCollectionValidator,
  controller.handleUpdateCollection
);

export default router;