import { Router } from 'express';
import {
  getHomeBanners,
  getHomeBannersAdmin,
  getHomeBanner,
  createHomeBannerHandler,
  updateHomeBannerHandler,
  deleteHomeBannerHandler,
} from '../controllers/homeBanner.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { uploadHomeBannerFields } from '../config/upload';

const router = Router();

// Public: pour l'app mobile
router.get('/', getHomeBanners);

// Admin
router.get('/admin', authMiddleware, requireRoles(USER_ROLE.admin), getHomeBannersAdmin);
router.get('/:id', authMiddleware, requireRoles(USER_ROLE.admin), getHomeBanner);
router.post(
  '/',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadHomeBannerFields(),
  createHomeBannerHandler
);
router.patch(
  '/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadHomeBannerFields(),
  updateHomeBannerHandler
);
router.delete('/:id', authMiddleware, requireRoles(USER_ROLE.admin), deleteHomeBannerHandler);

export default router;
