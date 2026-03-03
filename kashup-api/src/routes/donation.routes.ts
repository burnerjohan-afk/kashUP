import { Router } from 'express';
import {
  getAssociation,
  getAssociations,
  getDonationCategories,
  getDonationCategoriesWithAssociations,
  createAssociationHandler,
  updateAssociationHandler,
  deleteAssociationHandler,
} from '../controllers/donation.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { uploadSingle } from '../config/upload';

const router = Router();

router.get('/categories', getDonationCategories);
router.get('/categories-with-associations', getDonationCategoriesWithAssociations);
router.get('/associations', getAssociations);
router.get('/associations/:id', getAssociation);

router.post(
  '/associations',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  createAssociationHandler
);
router.patch(
  '/associations/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  updateAssociationHandler
);
router.delete('/associations/:id', authMiddleware, requireRoles(USER_ROLE.admin), deleteAssociationHandler);

export default router;

