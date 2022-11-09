import express from 'express';
import * as controller from '../controllers/collection.controller';
import { createCollectionValidator } from '../middlewares/create.collection.validator';
import { updateCollectionValidator } from '../middlewares/update.collection.validator';
import { collectionAssetMulterUpload, multerUpload } from '../helpers/aws/image.uploader';
import {
  createCollectionExpValidator,
  getCollectionExpValidator
} from '../middlewares/create.collection.exp.validator';
import { cleanUpMulterFiles } from '../handlers/file.cleanup.handler';
import { updateCollectionExpValidator } from '../middlewares/update.collection.exp.validator';
import { payoutValidator } from '../middlewares/payout.validator';
import { deleteCollectionAssetsValidator } from '../middlewares/add.collection.asset.validator';
import {
  updateCollectionAssetsExpValidator,
  updateCollectionAssetsValidator
} from '../middlewares/update.collection.asset.validator';

const router = express.Router({ mergeParams: true });

// Update username for an admin
router.post('/',
  multerUpload.fields([
      { name: 'image', maxCount: 1 },
    ]
  ),
  cleanUpMulterFiles,
  createCollectionExpValidator(),
  createCollectionValidator,
  controller.handleAddAdminCollection
);

router.get('/', getCollectionExpValidator(), controller.handleGetCollections);

router.get('/:collection_id', controller.handleGetCollectionById);

router.post('/:collection_id/payouts', payoutValidator(), controller.handleCreatePayout);
router.get('/:collection_id/payouts', controller.handleGetPayouts);

router.put('/:collection_id',
  multerUpload.fields([
    { name: 'collection_image', maxCount: 1 },
  ]),
  cleanUpMulterFiles,
  updateCollectionExpValidator(),
  updateCollectionValidator,
  controller.handleUpdateCollection
);

router.get('/:collection_id/mints', controller.handleGetMintTransactions);

router.post('/:collection_id/assets',
  collectionAssetMulterUpload.array('assets', 20),
  cleanUpMulterFiles,
  controller.handleAddCollectionAssets,
);

router.get('/:collection_id/assets', controller.handleGetCollectionAssets);
router.put('/:collection_id/assets', updateCollectionAssetsExpValidator(), updateCollectionAssetsValidator, controller.handleUpdateCollectionAssets);
router.delete('/:collection_id/assets', deleteCollectionAssetsValidator(), controller.handleDeleteCollectionAssets);


export default router;
