import express from 'express';
import * as controller from '../controllers/organization.controller';

const router = express.Router();

// Add an organization
router.post('/', controller.handleAddOrganization);

// Get organizations
router.get('/', controller.handleGetOrganizations);

// Update username for an organization
router.get('/:organization_id', controller.handleGetOrganization);

router.put('/:organization_id', controller.handleUpdateOrganization);

export default router;
