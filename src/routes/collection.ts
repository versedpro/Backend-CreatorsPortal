import express from 'express';
import * as controller from '../controllers/collection.controller';

const router = express.Router({ mergeParams: true });

// router.use(multerUpload.any());

// Update username for an admin
router.post('/', controller.handleAddCollection);


export default router;
