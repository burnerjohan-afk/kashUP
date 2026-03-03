import { Router } from 'express';
import { getBoxUpContent, getPredefinedGifts, getSpotlightAssociations } from '../controllers/content.controller';

const router = Router();

router.get('/predefined-gifts', getPredefinedGifts);
router.get('/box-up', getBoxUpContent);
router.get('/spotlight-associations', getSpotlightAssociations);

export default router;

