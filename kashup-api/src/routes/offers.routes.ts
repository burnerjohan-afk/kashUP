import { Router } from 'express';
import { createOfferHandler, getCurrentOffers, getOffers, updateOfferHandler } from '../controllers/offer.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { uploadSingle } from '../config/upload';

const router = Router();

// Endpoint de debug pour tester sans Multer
router.post('/debug', (req, res) => {
  console.log('=== DEBUG OFFERS ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Files:', req.files);
  console.log('File:', req.file);
  
  res.json({
    success: true,
    message: 'Endpoint de debug fonctionne',
    body: req.body,
    files: req.files ? Object.keys(req.files) : 'no files',
    bodyKeys: Object.keys(req.body || {}),
    contentType: req.headers['content-type']
  });
});

/** Offres actuellement en cours (app / public). */
router.get('/current', getCurrentOffers);

/** Toutes les offres pour le back office (?status=all|active|scheduled|expired). */
router.get('/', authMiddleware, requireRoles(USER_ROLE.admin), getOffers);

// Routes admin
router.post(
  '/',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  // Note: La validation est faite dans le handler après conversion des types
  createOfferHandler
);
router.patch(
  '/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  // Note: La validation est faite dans le handler après conversion des types
  updateOfferHandler
);

export default router;

