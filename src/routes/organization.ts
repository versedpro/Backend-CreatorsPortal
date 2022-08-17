import express from 'express';
import * as controller from '../controllers/organization.controller';
import { multerUpload } from '../helpers/aws/image.uploader';
import { createOrganizationValidator, getOrganizationValidator } from '../middlewares/create.organization.validator';
import { cleanUpMulterFiles } from '../handlers/file.cleanup.handler';

const router = express.Router();

// Add an organization
router.post('/',
  multerUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  cleanUpMulterFiles,
  createOrganizationValidator(),
  controller.handleAddOrganization,
);

// Get organizations
router.get('/', getOrganizationValidator(), controller.handleGetOrganizations);

// Update username for an organization
router.get('/:organization_id', controller.handleGetOrganization);

router.put(
  '/:organization_id',
  multerUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  cleanUpMulterFiles,
  controller.handleUpdateOrganization,
);

export default router;
