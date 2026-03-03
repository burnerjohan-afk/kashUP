import { Router } from 'express';
import {
  getGiftCardBoxDetail,
  getGiftCardBoxes,
  getGiftCardCatalog,
  getGiftCardOffers,
  getGiftCardsForUser,
  purchaseGiftCardHandler,
  getGiftCardOrders,
  getGiftCardConfigHandler,
  updateGiftCardConfigHandler,
  getBoxUpConfigHandler,
  createOrUpdateBoxUpConfigHandler,
  exportGiftCardOrdersHandler,
  getBoxUpsHandler,
  getBoxUpByIdHandler,
  createBoxUpHandler,
  updateBoxUpHandler,
  deleteBoxUpHandler,
  getGiftCardAmountsHandler,
  createGiftCardAmountHandler,
  deleteGiftCardAmountHandler,
  getCartesUpLibresHandler,
  getCartesUpLibresForAppHandler,
  getCarteUpLibreByIdHandler,
  createCarteUpLibreHandler,
  updateCarteUpLibreHandler,
  deleteCarteUpLibreHandler,
  getCartesUpPredefiniesHandler,
  getCarteUpPredefinieByIdHandler,
  createCarteUpPredefinieHandler,
  updateCarteUpPredefinieHandler,
  deleteCarteUpPredefinieHandler,
} from '../controllers/giftcard.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { validateBody } from '../middlewares/validator';
import { purchaseGiftCardSchema, giftCardConfigSchema, boxUpConfigSchema, giftCardAmountSchema } from '../schemas/giftCard.schema';
import { USER_ROLE } from '../types/domain';
import { uploadFields, uploadSingle } from '../config/upload';

const router = Router();

// Routes publiques
router.get('/', getGiftCardCatalog);
router.get('/catalog', getGiftCardCatalog);
router.get('/offers', getGiftCardOffers);
router.get('/boxes', getGiftCardBoxes);
router.get('/boxes/:id', getGiftCardBoxDetail);
router.get('/cartes-up-libres/for-app', getCartesUpLibresForAppHandler);

// Routes authentifiées (utilisateurs)
router.get('/user', authMiddleware, getGiftCardsForUser);
router.post('/purchase', authMiddleware, validateBody(purchaseGiftCardSchema), purchaseGiftCardHandler);

// Routes admin
router.get('/amounts', authMiddleware, requireRoles(USER_ROLE.admin), getGiftCardAmountsHandler);
router.post(
  '/amounts',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  validateBody(giftCardAmountSchema),
  createGiftCardAmountHandler
);
router.delete('/amounts/:id', authMiddleware, requireRoles(USER_ROLE.admin), deleteGiftCardAmountHandler);

router.get('/orders', authMiddleware, requireRoles(USER_ROLE.admin), getGiftCardOrders);
router.get('/config', authMiddleware, requireRoles(USER_ROLE.admin), getGiftCardConfigHandler);
router.patch(
  '/config',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadFields([
    { name: 'giftCardImage', maxCount: 1 },
    { name: 'giftCardVirtualCardImage', maxCount: 1 }
  ]),
  validateBody(giftCardConfigSchema.partial()),
  updateGiftCardConfigHandler
);
router.get('/export', authMiddleware, requireRoles(USER_ROLE.admin), exportGiftCardOrdersHandler);
router.get('/box-up/config', authMiddleware, requireRoles(USER_ROLE.admin), getBoxUpConfigHandler);
router.post(
  '/box-up/config',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('boxUpImage'),
  validateBody(boxUpConfigSchema),
  createOrUpdateBoxUpConfigHandler
);

// Box-ups CRUD admin (format back office: nom, partenaires, commentCaMarche, status)
router.get('/box-ups', authMiddleware, requireRoles(USER_ROLE.admin), getBoxUpsHandler);
router.get('/box-ups/:id', authMiddleware, requireRoles(USER_ROLE.admin), getBoxUpByIdHandler);
router.post(
  '/box-ups',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  createBoxUpHandler
);
router.patch(
  '/box-ups/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  updateBoxUpHandler
);
router.delete('/box-ups/:id', authMiddleware, requireRoles(USER_ROLE.admin), deleteBoxUpHandler);

// Cartes Sélection UP (config) – admin
router.get('/cartes-up-libres', authMiddleware, requireRoles(USER_ROLE.admin), getCartesUpLibresHandler);
router.get('/cartes-up-libres/:id', authMiddleware, requireRoles(USER_ROLE.admin), getCarteUpLibreByIdHandler);
router.post(
  '/cartes-up-libres',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  createCarteUpLibreHandler
);
router.patch(
  '/cartes-up-libres/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  updateCarteUpLibreHandler
);
router.delete('/cartes-up-libres/:id', authMiddleware, requireRoles(USER_ROLE.admin), deleteCarteUpLibreHandler);

// Cartes UP (pré-définies) – admin
router.get('/cartes-up-predefinies', authMiddleware, requireRoles(USER_ROLE.admin), getCartesUpPredefiniesHandler);
router.get('/cartes-up-predefinies/:id', authMiddleware, requireRoles(USER_ROLE.admin), getCarteUpPredefinieByIdHandler);
router.post(
  '/cartes-up-predefinies',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  createCarteUpPredefinieHandler
);
router.patch(
  '/cartes-up-predefinies/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  updateCarteUpPredefinieHandler
);
router.delete('/cartes-up-predefinies/:id', authMiddleware, requireRoles(USER_ROLE.admin), deleteCarteUpPredefinieHandler);

export default router;


